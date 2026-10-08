import { AppError, publicMessage } from "../core/errors";
import { DATASETS, type DatasetDef } from "../core/datasets";
import type {
  CoverageEntry, FetchUnit, ICacheRepository, IDataRepository, IGovernmentSource, IQueryEngine, ISourceRegistry, QueryResult,
} from "../core/interfaces";
import { normalizeSpec, queryHash, type QuerySpec } from "../core/query-spec";
import type { Entity, Fact, Provenance, SourceRecord } from "../core/types";
import { CatalogService } from "./catalog";
import { SourceRuntime } from "./runtime";
import { applyPersistencePolicy, validateFacts } from "./validate";

export interface RouterOptions {
  /** máximo de unidades buscadas em fontes externas por consulta (o resto fica `partial` e é completado na próxima) */
  maxUnitsPerQuery: number;
  /** orçamento de tempo para buscas externas em uma consulta */
  maxExternalMs: number;
  /** TTL de resultado vazio (cache negativo), em minutos */
  emptyTtlMinutes: number;
  /** anos fechados há mais de 1 ano mudam pouco: TTL multiplicado */
  historicalTtlMultiplier: number;
}

export const DEFAULT_ROUTER_OPTIONS: RouterOptions = { maxUnitsPerQuery: 14, maxExternalMs: 25_000, emptyTtlMinutes: 360, historicalTtlMultiplier: 7 };

interface Plan { unit: FetchUnit; ds: DatasetDef }

export interface RouterDeps {
  data: IDataRepository;
  cache: ICacheRepository;
  registry: ISourceRegistry;
  runtime: SourceRuntime;
  options?: Partial<RouterOptions>;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Datasets capazes de responder à consulta. */
export function datasetsFor(spec: QuerySpec): DatasetDef[] {
  return Object.values(DATASETS).filter(
    (d) => d.metrics.includes(spec.metric) && d.entityTypes.includes(spec.entity_type) && (!spec.category_type || d.categoryTypes.includes(spec.category_type)) &&
      (!spec.category_code || !d.categoryCodes || d.categoryCodes.includes(spec.category_code)),
  );
}

export function planUnits(spec: QuerySpec, entity: Entity, now: Date): Plan[] {
  const plans: Plan[] = [];
  for (const ds of datasetsFor(spec)) {
    for (let year = spec.year_from; year <= spec.year_to; year++) {
      if (!ds.availableForYear(year, now)) continue;
      for (const periodNumber of ds.periods(year, now)) {
        plans.push({ ds, unit: { dataset: ds.id, entity: { type: entity.type, code: entity.code, name: entity.name }, year, periodNumber } });
      }
    }
  }
  return plans;
}

export class QueryRouter implements IQueryEngine {
  private opts: RouterOptions;
  private data: IDataRepository;
  private cache: ICacheRepository;
  private registry: ISourceRegistry;
  private runtime: SourceRuntime;
  readonly catalog: CatalogService;
  private registered = false;

  constructor(deps: RouterDeps) {
    this.opts = { ...DEFAULT_ROUTER_OPTIONS, ...deps.options };
    ({ data: this.data, cache: this.cache, registry: this.registry, runtime: this.runtime } = deps);
    this.catalog = new CatalogService(this.data, this.registry, this.runtime);
  }

  /** Primeira execução: cadastra as fontes no Source Registry (idempotente). */
  async ensureRegistry() {
    if (this.registered) return;
    await this.registry.ensureSources(this.runtime.adapters.filter((a) => !a.template).map((a) => a.definition));
    this.registered = true;
  }

  async execute(input: unknown, o: { forceRefresh?: boolean; sourceSlug?: string } = {}): Promise<QueryResult> {
    const started = Date.now();
    const spec = normalizeSpec(input);
    const hash = queryHash(spec);
    const now = this.runtime.now();
    await this.ensureRegistry();

    let entity = await this.data.findEntity({ type: spec.entity_type, code: spec.entity_code });
    if (!entity) {
      await this.catalog.ensure();
      entity = await this.data.findEntity({ type: spec.entity_type, code: spec.entity_code });
    }
    if (!entity) throw new AppError("NOT_FOUND", `Ente ${spec.entity_type}:${spec.entity_code} não existe no cadastro`);

    // 1) cache de consulta (caminho rápido)
    if (!o.forceRefresh) {
      const cq = await this.cache.getQuery(hash);
      if (cq && new Date(cq.expiresAt) > now) {
        const facts = await this.data.queryFacts(spec);
        await this.cache.touchQuery(hash);
        await this.logRouter(cq.sourceId, spec, true, true, started);
        return this.result(spec, facts, "cached", null, [], now);
      }
    }

    // 2) cobertura por unidade (reuso entre consultas diferentes)
    const sources = await this.registry.list();
    const plans = planUnits(spec, entity, now);
    const coverage = await this.cache.getCoverage(entity.id, plans.map((p) => ({ dataset: p.unit.dataset, year: p.unit.year, periodNumber: p.unit.periodNumber })));
    const valid = (p: Plan) => !o.forceRefresh && coverage.some((c) => this.coversUnit(c, p.unit, now));
    const pending = plans.filter((p) => !valid(p));

    const diagnostics: string[] = [];
    let failed = 0, deferred = 0, fetched = 0, disabledHit = false, notConfiguredHit = false, rateLimitedHit = false;
    let usedSourceId: string | null = null;
    let minTtl = Infinity;
    const deadline = Date.now() + this.opts.maxExternalMs;

    for (const [i, plan] of pending.entries()) {
      if (i >= this.opts.maxUnitsPerQuery || Date.now() > deadline) { deferred++; continue; }
      const r = await this.fetchWithFallback(plan, entity, sources, o.sourceSlug, now, diagnostics);
      if (r.ok && r.incomplete) { deferred++; usedSourceId = r.sourceId; }
      else if (r.ok) { fetched++; usedSourceId = r.sourceId; minTtl = Math.min(minTtl, r.ttlMinutes); }
      else {
        failed++;
        disabledHit ||= r.reason === "SOURCE_DISABLED";
        notConfiguredHit ||= r.reason === "SOURCE_NOT_CONFIGURED";
        rateLimitedHit ||= r.reason === "RATE_LIMITED";
      }
    }

    const facts = await this.data.queryFacts(spec);
    const latest = facts.length ? facts.map((f) => f.fetchedAt).sort().at(-1)! : null;
    let freshness: QueryResult["freshness"] = fetched > 0 ? "fresh" : "cached";
    let notice: string | null = null;

    if (plans.length === 0) {
      freshness = facts.length ? "cached" : "unavailable";
      if (!facts.length) notice = datasetsFor(spec).length === 0
        ? "Ainda não há uma fonte oficial integrada para este indicador."
        : "Os dados oficiais deste período ainda não foram divulgados.";
    } else if (failed > 0) {
      freshness = facts.length ? "stale" : "unavailable";
      const base = disabledHit ? publicMessage(new AppError("SOURCE_DISABLED", "")) : notConfiguredHit ? publicMessage(new AppError("SOURCE_NOT_CONFIGURED", "")) : rateLimitedHit ? publicMessage(new AppError("RATE_LIMITED", "")) : publicMessage(new AppError("SOURCE_UNAVAILABLE", ""));
      notice = latest ? `${base} Estamos utilizando os dados mais recentes disponíveis de ${fmtDate(latest)}.` : `${base} Ainda não temos dados salvos para esta consulta.`;
    } else if (deferred > 0) {
      freshness = "partial";
      notice = "Estamos buscando os dados oficiais deste período. Atualize a página em instantes para ver o restante.";
    }

    // 3) só consolida no cache de consulta se tudo foi resolvido
    if (failed === 0 && deferred === 0 && plans.length > 0) {
      const base = Number.isFinite(minTtl) ? minTtl : Math.min(...sources.filter((s) => s.enabled).map((s) => s.cacheTtlMinutes), 1440);
      const ttl = facts.length === 0 ? Math.min(base, this.opts.emptyTtlMinutes) : base;
      await this.cache.putQuery({
        hash, type: spec.kind, normalized: spec, sourceId: usedSourceId, recordCount: facts.length,
        expiresAt: new Date(now.getTime() + ttl * 60_000), reference: { entity_id: entity.id, metric: spec.metric, years: [spec.year_from, spec.year_to] },
      });
    }
    await this.logRouter(usedSourceId, spec, false, failed === 0, started, failed > 0 ? diagnostics.join(" | ").slice(0, 900) : null);
    return this.result(spec, facts, freshness, notice, diagnostics, now);
  }

  /* ───────────── internos ───────────── */

  private coversUnit(c: CoverageEntry, u: FetchUnit, now: Date) {
    return c.dataset === u.dataset && c.year === u.year && c.periodNumber === u.periodNumber && new Date(c.expiresAt) > now;
  }

  private async fetchWithFallback(
    plan: Plan, entity: Entity, sources: SourceRecord[], only: string | undefined, now: Date, diag: string[],
  ): Promise<{ ok: true; sourceId: string; ttlMinutes: number; incomplete?: boolean } | { ok: false; reason: AppError["kind"] }> {
    const candidates = sources
      .filter((s) => (!only || s.slug === only))
      .map((s) => ({ s, a: this.runtime.adapterFor(s) }))
      .filter((c): c is { s: SourceRecord; a: IGovernmentSource } => !!c.a && c.a.datasets.includes(plan.unit.dataset))
      .sort((x, y) => x.s.priority - y.s.priority);

    let reason: AppError["kind"] = "SOURCE_UNAVAILABLE";
    if (candidates.length === 0) { diag.push(`${plan.unit.dataset}: nenhuma fonte cadastrada atende o dataset`); return { ok: false, reason }; }
    let first = true;
    for (const { s: source, a: adapter } of candidates) {
      if (!source.enabled) { diag.push(`${source.slug}: desativada pelo administrador`); reason = first ? "SOURCE_DISABLED" : reason; first = false; continue; }
      try {
        const ctx = await this.runtime.context(source);
        if (source.requiresAuth && !ctx.credential) throw new AppError("SOURCE_NOT_CONFIGURED", `${source.slug}: credencial não configurada`);
        const recent = await this.registry.countExternalCalls(source.id, new Date(now.getTime() - 60_000));
        if (recent >= source.rateLimitPerMinute) throw new AppError("RATE_LIMITED", `${source.slug}: ${recent}/${source.rateLimitPerMinute} req/min usadas`);

        const res = await adapter.fetchUnit(plan.unit, ctx);
        let report: ReturnType<typeof validateFacts>;
        try { report = validateFacts(res.facts, plan.unit, plan.ds); }
        catch (ve) {
          // o download já deu certo (ex.: HTTP 200); a rejeição guarda o status real para os logs da fonte
          if (ve instanceof AppError && ve.httpStatus === undefined && res.httpStatus !== undefined) ve.httpStatus = res.httpStatus;
          throw ve;
        }
        const { rows, note } = applyPersistencePolicy(report.valid);
        const summary = await this.data.upsertFacts(rows, source.id);
        const ttl = this.ttlFor(source, plan.unit.year, now);
        if (res.incomplete) {
          // parcial: guarda o que veio, mas deixa a unidade pendente (sem cobertura) e sinaliza para o chamador
          diag.push(`${source.slug} [${plan.unit.dataset} ${plan.unit.year}]: parcial — ${res.incomplete.done} de ${res.incomplete.total} (${res.incomplete.reason})`);
          await this.registry.logRequest({
            sourceId: source.id, queryType: null, endpoint: `persist ${plan.unit.dataset} ${plan.unit.year} (parcial ${res.incomplete.done}/${res.incomplete.total})`,
            startedAt: new Date(), durationMs: 0, recordsReceived: res.recordsReceived, recordsSaved: summary.inserted + summary.updated, success: true, errorMessage: res.incomplete.reason,
          });
          return { ok: true, sourceId: source.id, ttlMinutes: ttl, incomplete: true };
        }
        await this.cache.putCoverage({
          entityId: entity.id, sourceId: source.id, dataset: plan.unit.dataset, year: plan.unit.year, periodNumber: plan.unit.periodNumber,
          status: rows.length === 0 ? "EMPTY" : "OK", recordCount: rows.length,
          expiresAt: new Date(now.getTime() + (rows.length === 0 ? Math.min(ttl, this.opts.emptyTtlMinutes) : ttl) * 60_000).toISOString(),
        });
        await this.registry.recordHealth(source.id, { status: "ONLINE", lastSuccessAt: new Date(), lastSyncAt: new Date(), lastRequestAt: new Date(), lastError: null });
        await this.registry.logRequest({
          sourceId: source.id, queryType: null, endpoint: `persist ${plan.unit.dataset} ${plan.unit.year}${plan.unit.periodNumber ? `/${plan.unit.periodNumber}` : ""}`,
          startedAt: new Date(), durationMs: 0, recordsReceived: res.recordsReceived, recordsSaved: summary.inserted + summary.updated, success: true,
          errorMessage: [res.skipped ? `${res.skipped} linhas ignoradas pelo parser` : "", report.dropped ? `${report.dropped} inválidas (${report.reasons.join("; ")})` : "", note ?? ""].filter(Boolean).join("; ") || null,
        });
        return { ok: true, sourceId: source.id, ttlMinutes: ttl };
      } catch (e) {
        const err = e instanceof AppError ? e : new AppError("INTERNAL", e instanceof Error ? e.message : String(e));
        diag.push(`${source.slug} [${plan.unit.dataset} ${plan.unit.year}]: ${err.kind} — ${err.technical}`);
        // HTTP 2xx seguido de falha de leitura/validação: o log do download diz "200 ok", então registramos também a importação rejeitada
        if (err.httpStatus !== undefined && err.httpStatus < 400) {
          await this.registry.logRequest({
            sourceId: source.id, queryType: null, endpoint: `import ${plan.unit.dataset} ${plan.unit.year}${plan.unit.periodNumber ? `/${plan.unit.periodNumber}` : ""} (rejeitada)`,
            startedAt: new Date(), durationMs: 0, httpStatus: err.httpStatus, recordsReceived: 0, recordsSaved: 0, success: false,
            errorType: `IMPORT_${err.kind}`, errorMessage: err.technical.slice(0, 900),
          }).catch(() => undefined);
        }
        reason = first ? err.kind : reason;
        first = false;
        if (err.kind !== "SOURCE_NOT_CONFIGURED" && err.kind !== "RATE_LIMITED") {
          await this.registry.recordHealth(source.id, {
            lastFailureAt: new Date(), lastError: err.technical.slice(0, 500), lastRequestAt: new Date(), lastHttpStatus: err.httpStatus ?? null,
            status: err.kind === "SOURCE_UNAVAILABLE" ? "OFFLINE" : "DEGRADED",
          }).catch(() => undefined);
        } else if (err.kind === "SOURCE_NOT_CONFIGURED") {
          await this.registry.recordHealth(source.id, { status: "NOT_CONFIGURED", lastError: err.technical.slice(0, 500) }).catch(() => undefined);
        }
      }
    }
    return { ok: false, reason };
  }

  private ttlFor(source: SourceRecord, year: number, now: Date) {
    const historical = year < now.getUTCFullYear() - 1;
    return source.cacheTtlMinutes * (historical ? this.opts.historicalTtlMultiplier : 1);
  }

  private async logRouter(sourceId: string | null, spec: QuerySpec, cacheHit: boolean, success: boolean, started: number, error: string | null = null) {
    await this.registry.logRequest({
      sourceId, queryType: "router", endpoint: `query:${spec.kind}:${spec.metric}:${spec.entity_type}`, startedAt: new Date(started),
      durationMs: Date.now() - started, cacheHit, success, errorType: success ? null : "UNIT_FAILED", errorMessage: error,
    }).catch(() => undefined);
  }

  private async result(spec: QuerySpec, facts: Fact[], freshness: QueryResult["freshness"], notice: string | null, diagnostics: string[], now: Date): Promise<QueryResult> {
    return { spec, facts, freshness, notice, diagnostics, provenance: await this.provenance(facts), generatedAt: now.toISOString() };
  }

  async provenance(facts: Fact[]): Promise<Provenance[]> {
    if (!facts.length) return [];
    const sources = new Map((await this.registry.list()).map((s) => [s.slug, s]));
    const groups = new Map<string, Fact[]>();
    for (const f of facts) {
      const k = `${f.sourceSlug}|${f.sourceDataset ?? ""}`;
      groups.set(k, [...(groups.get(k) ?? []), f]);
    }
    return [...groups.values()].map((fs) => {
      const f0 = fs[0]!;
      const src = sources.get(f0.sourceSlug);
      const years = fs.map((f) => f.year);
      const [y0, y1] = [Math.min(...years), Math.max(...years)];
      return {
        sourceSlug: f0.sourceSlug, sourceName: src?.name ?? f0.sourceSlug, provider: src?.provider ?? "", dataset: f0.sourceDataset,
        fetchedAt: fs.map((f) => f.fetchedAt).sort().at(-1)!, sourceUpdatedAt: fs.map((f) => f.sourceUpdatedAt).filter(Boolean).sort().at(-1) ?? null,
        url: fs.find((f) => f.sourceUrl)?.sourceUrl ?? null, documentationUrl: src?.documentationUrl ?? null,
        periodLabel: y0 === y1 ? String(y0) : `${y0}–${y1}`,
      };
    });
  }
}
