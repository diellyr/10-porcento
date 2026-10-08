import { AppError, PUBLIC_MESSAGES } from "../core/errors";
import { ContractQuerySchema, toFetchQuery, type ContractFetchQuery, type ContractQueryInput, type ContractRecord, type StoredContract } from "../core/contracts";
import type { Freshness, ICacheRepository, IDataRepository, IGovernmentSource, ISourceRegistry } from "../core/interfaces";
import { hashOf } from "../core/normalize";
import type { FactInput, Provenance, SourceRecord } from "../core/types";
import type { CatalogService } from "../router/catalog";
import type { SourceRuntime } from "../router/runtime";

export interface ContractSummary {
  count: number;
  totalValue: number;
  byYear: Array<{ year: number; count: number; value: number }>;
  /** por fornecedor: principais órgãos contratantes; por órgão: principais fornecedores */
  top: Array<{ code: string; name: string; count: number; value: number }>;
  topLabel: "agencies" | "suppliers";
  /** o resumo considera no máximo este nº de contratos */
  capped: boolean;
}

export interface ContractsResult {
  query: ContractFetchQuery;
  items: StoredContract[];
  next: number | null;
  summary: ContractSummary | null;
  freshness: Freshness;
  notice: string | null;
  /** a fonte tem mais contratos do que conseguimos buscar (teto de páginas) */
  truncated: boolean;
  provenance: Provenance[];
  generatedAt: string;
}

const SUMMARY_CAP = 2000;
const TOP_N = 5;

export interface ContractServiceDeps {
  data: IDataRepository;
  cache: ICacheRepository;
  registry: ISourceRegistry;
  runtime: SourceRuntime;
  catalog: CatalogService;
  ensureRegistry: () => Promise<void>;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export function summarize(items: StoredContract[], by: "supplier" | "agency"): ContractSummary {
  const years = new Map<number, { count: number; value: number }>();
  const tops = new Map<string, { code: string; name: string; count: number; value: number }>();
  let total = 0;
  for (const c of items) {
    total += c.value;
    const y = years.get(c.year) ?? { count: 0, value: 0 };
    y.count++; y.value += c.value; years.set(c.year, y);
    const [code, name] = by === "supplier" ? [c.agencyCode ?? "NA", c.agencyName ?? "Órgão não informado"] : [c.supplierCnpj, c.supplierName];
    const t = tops.get(code) ?? { code, name, count: 0, value: 0 };
    t.count++; t.value += c.value; tops.set(code, t);
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    count: items.length, totalValue: r2(total), capped: items.length >= SUMMARY_CAP,
    byYear: [...years].map(([year, v]) => ({ year, count: v.count, value: r2(v.value) })).sort((a, b) => a.year - b.year),
    top: [...tops.values()].map((t) => ({ ...t, value: r2(t.value) })).sort((a, b) => b.value - a.value).slice(0, TOP_N),
    topLabel: by === "supplier" ? "agencies" : "suppliers",
  };
}

/**
 * Contratos e fornecedores: mesma filosofia do Query Router — lê do banco quando há dado válido; senão consulta a fonte
 * (respeitando habilitação, credencial e rate limit), normaliza, valida, persiste e responde; fonte fora do ar ⇒ último dado salvo.
 * LGPD: só pessoa jurídica (CNPJ). Registros de pessoa física são descartados já no adaptador.
 */
export class ContractService {
  constructor(private d: ContractServiceDeps) {}

  async search(input: unknown, o: { forceRefresh?: boolean } = {}): Promise<ContractsResult> {
    const started = Date.now();
    const parsed: ContractQueryInput = ContractQuerySchema.parse(input);
    const q = toFetchQuery(parsed);
    await this.d.ensureRegistry();
    const hash = hashOf({ type: "contracts", ...q });
    const now = this.d.runtime.now();

    let freshness: Freshness = "cached";
    let notice: string | null = null;
    let truncated = false;
    let fetched = false;
    let sourceId: string | null = null;
    const diag: string[] = [];

    const cq = await this.d.cache.getQuery(hash);
    const valid = !o.forceRefresh && cq && new Date(cq.expiresAt) > now;
    if (valid) {
      await this.d.cache.touchQuery(hash);
      truncated = cq!.reference?.truncated === true;
      sourceId = cq!.sourceId;
    } else {
      if (q.by === "agency") await this.d.catalog.ensureAgencies();
      const r = await this.refresh(q, hash, now, diag);
      if (r.ok) { fetched = true; freshness = "fresh"; truncated = r.truncated; sourceId = r.sourceId; }
      else {
        freshness = "stale";
        notice = PUBLIC_MESSAGES[r.reason];
      }
    }

    const filters = { supplierCnpj: q.by === "supplier" ? q.cnpj : undefined, agencyCode: q.by === "agency" ? q.agency : undefined, year: q.by === "agency" ? q.year : parsed.year };
    const rows = await this.d.data.queryContracts({ ...filters, limit: parsed.limit + 1, beforeId: parsed.cursor });
    const items = rows.slice(0, parsed.limit);
    const next = rows.length > parsed.limit ? items.at(-1)!.factId : null;
    const summary = parsed.cursor ? null : summarize(await this.d.data.queryContracts({ ...filters, limit: SUMMARY_CAP }), q.by);

    if (freshness === "stale") {
      const latest = items.map((i) => i.fetchedAt).sort().at(-1);
      if (!items.length) freshness = "unavailable";
      notice = latest ? `${notice} Estamos utilizando os dados mais recentes disponíveis de ${fmt(latest)}.` : `${notice} Ainda não temos contratos salvos para esta consulta.`;
    } else if (!items.length) {
      notice = "Não encontramos contratos para esta consulta nas fontes oficiais.";
    }
    if (truncated && !notice) notice = "Mostramos os contratos mais recentes que conseguimos buscar; a fonte pode ter mais registros.";

    await this.d.registry.logRequest({
      sourceId, queryType: "router", endpoint: `query:contracts:${q.by}`, startedAt: new Date(started), durationMs: Date.now() - started,
      cacheHit: !fetched && freshness !== "stale" && freshness !== "unavailable", success: freshness !== "stale" && freshness !== "unavailable",
      errorType: freshness === "stale" || freshness === "unavailable" ? "SOURCE_FAILED" : null, errorMessage: diag.join(" | ").slice(0, 900) || null,
    }).catch(() => undefined);

    return { query: q, items, next, summary, freshness, notice, truncated, provenance: await this.provenance(items, sourceId), generatedAt: now.toISOString() };
  }

  /* ───────── internos ───────── */

  private async refresh(q: ContractFetchQuery, hash: string, now: Date, diag: string[]):
    Promise<{ ok: true; sourceId: string; truncated: boolean } | { ok: false; reason: "SOURCE_UNAVAILABLE" | "SOURCE_DISABLED" | "SOURCE_NOT_CONFIGURED" | "RATE_LIMITED" | "BAD_RESPONSE" }> {
    const sources = (await this.d.registry.list())
      .map((s) => ({ s, a: this.d.runtime.adapterFor(s) }))
      .filter((c): c is { s: SourceRecord; a: IGovernmentSource } => !!c.a?.searchContracts)
      .sort((x, y) => x.s.priority - y.s.priority);
    let reason: "SOURCE_UNAVAILABLE" | "SOURCE_DISABLED" | "SOURCE_NOT_CONFIGURED" | "RATE_LIMITED" | "BAD_RESPONSE" = "SOURCE_UNAVAILABLE";
    let first = true;
    for (const { s: source, a: adapter } of sources) {
      if (!source.enabled) { diag.push(`${source.slug}: desativada pelo administrador`); if (first) reason = "SOURCE_DISABLED"; first = false; continue; }
      try {
        const ctx = await this.d.runtime.context(source);
        if (source.requiresAuth && !ctx.credential) throw new AppError("SOURCE_NOT_CONFIGURED", `${source.slug}: credencial não configurada`);
        const recent = await this.d.registry.countExternalCalls(source.id, new Date(now.getTime() - 60_000));
        if (recent >= source.rateLimitPerMinute) throw new AppError("RATE_LIMITED", `${source.slug}: ${recent}/${source.rateLimitPerMinute} req/min usadas`);

        const res = await adapter.searchContracts!(q, ctx);
        if (res.recordsReceived > 0 && res.records.length === 0 && res.skipped === res.recordsReceived && q.by === "supplier") {
          // só havia registros descartados (ex.: formato inesperado): não registramos como "sem contratos" por engano
          diag.push(`${source.slug}: ${res.recordsReceived} registros recebidos, todos descartados pelo parser`);
        }
        const saved = await this.persist(res.records, source.id);
        await this.d.cache.putQuery({
          hash, type: "contracts", normalized: { metric: "CONTRACT_VALUE", ...q }, sourceId: source.id, recordCount: res.records.length,
          expiresAt: new Date(now.getTime() + source.cacheTtlMinutes * 60_000), reference: { truncated: res.truncated, skipped: res.skipped },
        });
        await this.d.registry.recordHealth(source.id, { status: "ONLINE", lastSuccessAt: new Date(), lastSyncAt: new Date(), lastRequestAt: new Date(), lastError: null });
        await this.d.registry.logRequest({
          sourceId: source.id, queryType: null, endpoint: `persist contratos ${q.by}`, startedAt: new Date(), durationMs: 0, recordsReceived: res.recordsReceived,
          recordsSaved: saved, success: true, errorMessage: res.skipped ? `${res.skipped} registros ignorados (pessoa física, CNPJ inválido ou dados incompletos)` : null,
        });
        return { ok: true, sourceId: source.id, truncated: res.truncated };
      } catch (e) {
        const err = e instanceof AppError ? e : new AppError("INTERNAL", e instanceof Error ? e.message : String(e));
        diag.push(`${source.slug}: ${err.kind} — ${err.technical}`);
        if (first) reason = err.kind === "INTERNAL" ? "SOURCE_UNAVAILABLE" : (err.kind as typeof reason);
        first = false;
        if (err.kind === "SOURCE_NOT_CONFIGURED") await this.d.registry.recordHealth(source.id, { status: "NOT_CONFIGURED", lastError: err.technical.slice(0, 500) }).catch(() => undefined);
        else if (err.kind !== "RATE_LIMITED") await this.d.registry.recordHealth(source.id, { lastFailureAt: new Date(), lastRequestAt: new Date(), lastError: err.technical.slice(0, 500), status: err.kind === "SOURCE_UNAVAILABLE" ? "OFFLINE" : "DEGRADED" }).catch(() => undefined);
      }
    }
    return { ok: false, reason };
  }

  /** Persiste de forma estruturada: órgão, fornecedor, contrato (com atributos) e o valor como fato CONTRACT_VALUE. */
  private async persist(records: ContractRecord[], sourceId: string): Promise<number> {
    if (!records.length) return 0;
    const dedupe = <T extends { code: string }>(xs: T[]) => [...new Map(xs.map((x) => [x.code, x])).values()];
    await this.d.data.upsertGenericEntities(dedupe(records.map((r) => ({ type: "AGENCY" as const, code: r.agencyCode, name: r.agencyName }))).filter((a) => a.code !== "NA").map((a) => ({ ...a, type: "AGENCY" as const })), sourceId);
    await this.d.data.upsertGenericEntities(dedupe(records.map((r) => ({ type: "SUPPLIER" as const, code: r.supplierCnpj, name: r.supplierName }))), sourceId);
    await this.d.data.upsertGenericEntities(records.map((r) => ({
      type: "CONTRACT" as const, code: r.id, name: r.number ?? r.id,
      attributes: { number: r.number, object: r.object, startDate: r.startDate, endDate: r.endDate, initialValue: r.initialValue, finalValue: r.finalValue, modality: r.modality, supplierCnpj: r.supplierCnpj, agencyCode: r.agencyCode },
    })), sourceId);
    const facts: FactInput[] = records.map((r) => ({
      entity_type: "CONTRACT", entity_code: r.id, related_type: "SUPPLIER", related_code: r.supplierCnpj, related_name: r.supplierName,
      metric: "CONTRACT_VALUE", category_type: "AGENCY", category_code: r.agencyCode, category_label: r.agencyName,
      period_type: "YEAR", period_year: r.year, period_number: 0, value: Math.round(r.value * 100) / 100, unit: "BRL",
      source_dataset: "contratos", source_record_id: r.id,
    }));
    const sum = await this.d.data.upsertFacts(facts, sourceId);
    return sum.inserted + sum.updated;
  }

  private async provenance(items: StoredContract[], sourceId: string | null): Promise<Provenance[]> {
    if (!items.length) return [];
    const sources = await this.d.registry.list();
    const slug = items[0]!.sourceSlug;
    const src = sources.find((s) => s.slug === slug) ?? sources.find((s) => s.id === sourceId);
    const years = items.map((i) => i.year);
    const [y0, y1] = [Math.min(...years), Math.max(...years)];
    return [{
      sourceSlug: slug, sourceName: src?.name ?? slug, provider: src?.provider ?? "", dataset: "Contratos",
      fetchedAt: items.map((i) => i.fetchedAt).sort().at(-1)!, sourceUpdatedAt: null, url: null, documentationUrl: src?.documentationUrl ?? null,
      periodLabel: y0 === y1 ? String(y0) : `${y0}–${y1}`,
    }];
  }
}
