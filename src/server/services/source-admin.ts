import { z } from "zod";
import { AppError } from "../core/errors";
import type { ICacheRepository, ISourceRegistry } from "../core/interfaces";
import type { ConnectionTestResult, SourceRecord, SourceStatus } from "../core/types";
import type { QueryRouter } from "../router/query-router";
import type { SourceRuntime } from "../router/runtime";
import { maskSecret } from "../crypto";

export interface Actor { id: string | null; email: string | null }

export interface SourceView {
  slug: string; name: string; description: string | null; provider: string; category: string; sourceType: string;
  baseUrl: string; documentationUrl: string | null; authType: string; requiresAuth: boolean;
  enabled: boolean; status: SourceStatus; priority: number; rateLimitPerMinute: number; cacheTtlMinutes: number; parserVersion: string;
  config: Record<string, unknown>;
  /** criada pelo painel (não é uma das fontes padrão) */
  custom: boolean;
  credential: { configured: boolean; masked: string | null; origin: "database" | "env" | "none" };
  datasetsConfigured: number | null;
  datasets: string[];
  usage: { callsLastMinute: number; limit: number };
  lastSuccessAt: string | null; lastFailureAt: string | null; lastSyncAt: string | null; lastRequestAt: string | null;
  lastLatencyMs: number | null; lastHttpStatus: number | null; lastError: string | null;
  disabledAt: string | null; disabledBy: string | null;
}

const SECRET_KEY = /(secret|token|password|passwd|api[-_]?key|authorization)/i;
function assertNoSecrets(value: unknown, path = "config"): void {
  if (Array.isArray(value)) return value.forEach((v, i) => assertNoSecrets(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEY.test(k)) throw new AppError("VALIDATION", `Não coloque segredos na configuração (${path}.${k}). Use o campo de credencial.`);
      assertNoSecrets(v, `${path}.${k}`);
    }
  }
}

/** Bloqueia SSRF básico: só https, só hosts públicos. */
export function assertSafeBaseUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new AppError("VALIDATION", "URL inválida"); }
  if (u.protocol !== "https:") throw new AppError("VALIDATION", "A URL deve usar https");
  const h = u.hostname.toLowerCase();
  const privateV4 = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || privateV4.test(h) || h.includes(":") || h === "metadata.google.internal")
    throw new AppError("VALIDATION", "Host não permitido");
  if (u.username || u.password) throw new AppError("VALIDATION", "A URL não pode conter credenciais");
  return u;
}

export const SettingsSchema = z.object({
  priority: z.number().int().min(1).max(1000).optional(),
  cacheTtlMinutes: z.number().int().min(0).max(525_600).optional(),
  rateLimitPerMinute: z.number().int().min(1).max(600).optional(),
  baseUrl: z.string().max(300).optional(),
  config: z.record(z.unknown()).optional(),
}).strict();

export const NewSourceSchema = z.object({
  name: z.string().trim().min(3).max(60),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use letras minúsculas, números e hífens").min(3).max(40),
  provider: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional(),
  category: z.string().trim().min(2).max(30).default("personalizada"),
  sourceType: z.enum(["REST_API", "CSV", "JSON", "XML", "DATASET_DOWNLOAD"]),
  baseUrl: z.string().max(300),
  documentationUrl: z.string().max(300).optional(),
  authType: z.enum(["NONE", "API_KEY_HEADER", "API_KEY_QUERY", "BEARER_TOKEN"]).default("NONE"),
  adapterKey: z.string().min(2).max(40),
  priority: z.number().int().min(1).max(1000).default(200),
  rateLimitPerMinute: z.number().int().min(1).max(600).default(30),
  cacheTtlMinutes: z.number().int().min(0).max(525_600).default(1440),
  healthPath: z.string().regex(/^\/[\w\-./?=&%]*$/, "caminho inválido (comece com /)").optional(),
  config: z.record(z.unknown()).optional(),
}).strict();

export function deriveStatus(r: ConnectionTestResult, hasCredential: boolean, requiresAuth: boolean): SourceStatus {
  if (requiresAuth && !hasCredential) return "NOT_CONFIGURED";
  if (r.ok) return r.latencyMs > 4000 ? "DEGRADED" : "ONLINE";
  if (r.httpStatus === 401 || r.httpStatus === 403) return "NOT_CONFIGURED";
  if (r.httpStatus === null || r.httpStatus >= 500) return "OFFLINE";
  return "DEGRADED";
}

export class SourceAdminService {
  constructor(private registry: ISourceRegistry, private runtime: SourceRuntime, private cache: ICacheRepository, private router: QueryRouter) {}

  private async must(slug: string): Promise<SourceRecord> {
    await this.router.ensureRegistry();
    const s = await this.registry.getBySlug(slug);
    if (!s) throw new AppError("NOT_FOUND", `Fonte ${slug} não existe`);
    return s;
  }

  async view(s: SourceRecord): Promise<SourceView> {
    const adapter = this.runtime.adapterFor(s);
    const cred = await this.runtime.credential(s);
    const hint = cred.origin === "database" ? await this.registry.getCredentialHint(s.id) : null;
    const l4 = cred.origin === "database" ? hint?.last4 ?? "" : cred.value?.slice(-4) ?? "";
    const calls = await this.registry.countExternalCalls(s.id, new Date(Date.now() - 60_000)).catch(() => 0);
    const fileDatasets = (s.config as { datasets?: Record<string, { url?: string }> }).datasets;
    const status: SourceStatus = !s.enabled ? "DISABLED" : s.requiresAuth && !cred.value ? "NOT_CONFIGURED" : s.status;
    return {
      slug: s.slug, name: s.name, description: s.description, provider: s.provider, category: s.category, sourceType: s.sourceType,
      baseUrl: s.baseUrl, documentationUrl: s.documentationUrl, authType: s.authType, requiresAuth: s.requiresAuth, enabled: s.enabled, status,
      priority: s.priority, rateLimitPerMinute: s.rateLimitPerMinute, cacheTtlMinutes: s.cacheTtlMinutes, parserVersion: s.parserVersion, config: s.config, custom: s.config.custom === true,
      credential: { configured: !!cred.value, masked: cred.value ? maskSecret(l4) : null, origin: cred.origin },
      datasetsConfigured: s.sourceType === "DATASET_DOWNLOAD" ? Object.values(fileDatasets ?? {}).filter((d) => d?.url).length : null,
      datasets: [...(adapter?.datasets ?? [])],
      usage: { callsLastMinute: calls, limit: s.rateLimitPerMinute },
      lastSuccessAt: s.lastSuccessAt, lastFailureAt: s.lastFailureAt, lastSyncAt: s.lastSyncAt, lastRequestAt: s.lastRequestAt,
      lastLatencyMs: s.lastLatencyMs, lastHttpStatus: s.lastHttpStatus, lastError: s.lastError, disabledAt: s.disabledAt, disabledBy: s.disabledBy,
    };
  }

  /** Adaptadores disponíveis para novas fontes (o "parser" da fonte). */
  adapterOptions() {
    return this.runtime.adapters.map((a) => ({
      key: a.adapterKey, label: a.template ? "Arquivo CSV genérico (configure URL e colunas depois)" : `Mesmo formato do ${a.definition.name}`,
      datasets: [...a.datasets], requiresAuth: a.definition.requiresAuth, template: !!a.template,
    }));
  }

  /**
   * "+ Adicionar fonte": cadastra uma fonte nova ligada a um adaptador existente (um espelho/alternativa com outra URL e prioridade
   * — entra no fallback do Query Router — ou o modelo genérico de CSV). Formatos realmente novos ainda exigem um adaptador em código.
   */
  async addSource(input: unknown, actor: Actor): Promise<SourceView> {
    await this.router.ensureRegistry();
    const p = NewSourceSchema.parse(input);
    const adapter = this.runtime.adapters.find((a) => a.adapterKey === p.adapterKey);
    if (!adapter) throw new AppError("VALIDATION", `Adaptador desconhecido: ${p.adapterKey}`);
    assertSafeBaseUrl(p.baseUrl);
    if (p.documentationUrl) assertSafeBaseUrl(p.documentationUrl);
    if (await this.registry.getBySlug(p.slug)) throw new AppError("VALIDATION", `Já existe uma fonte com o identificador “${p.slug}”.`);
    const extra = p.config ?? {};
    assertNoSecrets(extra);
    if (JSON.stringify(extra).length > 20_000) throw new AppError("VALIDATION", "Configuração grande demais");
    const config: Record<string, unknown> = { ...(adapter.template ? { datasets: {} } : {}), ...extra, custom: true, ...(p.healthPath ? { healthPath: p.healthPath } : {}) };
    const created = await this.registry.create({
      name: p.name, slug: p.slug, description: p.description ?? null, provider: p.provider, category: p.category, sourceType: p.sourceType,
      baseUrl: p.baseUrl.replace(/\/+$/, ""), documentationUrl: p.documentationUrl ?? null, authType: p.authType,
      requiresAuth: adapter.definition.requiresAuth || p.authType !== "NONE", priority: p.priority, rateLimitPerMinute: p.rateLimitPerMinute,
      cacheTtlMinutes: p.cacheTtlMinutes, adapterKey: p.adapterKey, config,
    });
    await this.registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "source.added", targetType: "data_source", targetId: p.slug, details: { adapterKey: p.adapterKey, baseUrl: created.baseUrl, priority: p.priority } });
    return this.view(created);
  }

  async list(): Promise<SourceView[]> {
    await this.router.ensureRegistry();
    return Promise.all((await this.registry.list()).map((s) => this.view(s)));
  }

  async get(slug: string) { return this.view(await this.must(slug)); }

  async testConnection(slug: string, actor: Actor): Promise<ConnectionTestResult & { checkedAt: string; status: SourceStatus }> {
    const s = await this.must(slug);
    const adapter = this.runtime.adapterFor(s);
    if (!adapter) throw new AppError("INTERNAL", `Sem adaptador para ${s.adapterKey}`);
    const ctx = await this.runtime.context(s, { isTest: true });
    let r: ConnectionTestResult;
    try { r = await adapter.testConnection(ctx); }
    catch (e) { r = { ok: false, httpStatus: null, latencyMs: 0, message: "Falha ao testar", technical: e instanceof Error ? e.message : String(e) }; }
    const status = deriveStatus(r, !!ctx.credential, s.requiresAuth);
    const now = new Date();
    await this.registry.recordHealth(s.id, {
      status: s.enabled ? status : "DISABLED", lastRequestAt: now, lastLatencyMs: r.latencyMs || null, lastHttpStatus: r.httpStatus,
      ...(r.ok ? { lastSuccessAt: now, lastError: null } : { lastFailureAt: now, lastError: (r.technical ?? r.message).slice(0, 500) }),
    });
    await this.registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "source.tested", targetType: "data_source", targetId: slug, details: { ok: r.ok, httpStatus: r.httpStatus, latencyMs: r.latencyMs } });
    return { ...r, checkedAt: now.toISOString(), status: s.enabled ? status : "DISABLED" };
  }

  async testAll(actor: Actor) {
    const sources = (await this.list()).filter((s) => s.enabled);
    const out: Record<string, Awaited<ReturnType<SourceAdminService["testConnection"]>>> = {};
    for (let i = 0; i < sources.length; i += 3) {
      await Promise.all(sources.slice(i, i + 3).map(async (s) => { out[s.slug] = await this.testConnection(s.slug, actor); }));
    }
    return out;
  }

  /** Desativar NÃO apaga dados: só impede novas consultas externas. */
  async setEnabled(slug: string, enabled: boolean, actor: Actor) {
    const s = await this.must(slug);
    if (s.enabled === enabled) return this.view(s);
    const hasCred = !!(await this.runtime.credential(s)).value;
    const next = await this.registry.update(s.id, enabled
      ? { enabled: true, disabledAt: null, disabledBy: null, status: s.requiresAuth && !hasCred ? "NOT_CONFIGURED" : "UNKNOWN" }
      : { enabled: false, disabledAt: new Date(), disabledBy: actor.id, status: "DISABLED" });
    await this.registry.audit({ actorId: actor.id, actorEmail: actor.email, action: enabled ? "source.enabled" : "source.disabled", targetType: "data_source", targetId: slug });
    return this.view(next);
  }

  async updateSettings(slug: string, input: unknown, actor: Actor) {
    const s = await this.must(slug);
    const p = SettingsSchema.parse(input);
    if (p.baseUrl !== undefined) assertSafeBaseUrl(p.baseUrl);
    if (p.config !== undefined) {
      assertNoSecrets(p.config);
      if (JSON.stringify(p.config).length > 20_000) throw new AppError("VALIDATION", "Configuração grande demais");
      for (const ds of Object.values((p.config as { datasets?: Record<string, { url?: string }> }).datasets ?? {})) if (ds?.url) assertSafeBaseUrl(ds.url);
    }
    const next = await this.registry.update(s.id, p);
    await this.registry.audit({
      actorId: actor.id, actorEmail: actor.email, action: "source.config_changed", targetType: "data_source", targetId: slug,
      details: { changed: Object.keys(p), before: { priority: s.priority, ttl: s.cacheTtlMinutes, rate: s.rateLimitPerMinute, baseUrl: s.baseUrl } },
    });
    return this.view(next);
  }

  async setCredential(slug: string, value: string, actor: Actor) {
    const s = await this.must(slug);
    if (!s.requiresAuth) throw new AppError("VALIDATION", "Esta fonte não usa credencial");
    await this.registry.setCredential(s.id, value.trim(), actor.id);
    if (s.status === "NOT_CONFIGURED") await this.registry.update(s.id, { status: "UNKNOWN" });
    await this.registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "source.token_changed", targetType: "data_source", targetId: slug }); // nunca registra o valor
    return this.get(slug);
  }

  async clearCredential(slug: string, actor: Actor) {
    const s = await this.must(slug);
    await this.registry.clearCredential(s.id);
    await this.registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "source.token_removed", targetType: "data_source", targetId: slug });
    return this.get(slug);
  }

  async clearCache(slug: string | null, actor: Actor) {
    let res;
    if (slug) res = await this.cache.clearBySource((await this.must(slug)).id);
    else res = await this.cache.clearAll();
    await this.registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "cache.cleared", targetType: "data_source", targetId: slug ?? "ALL", details: res });
    return res;
  }

  /**
   * Forçar atualização: invalida cache/cobertura da fonte e refaz imediatamente as consultas mais usadas
   * (até `limit`), mantendo os dados antigos até que os novos cheguem (e versionando diferenças).
   */
  async forceRefresh(slug: string, actor: Actor, limit = 5) {
    const s = await this.must(slug);
    if (!s.enabled) throw new AppError("SOURCE_DISABLED", `${slug} está desativada`);
    const top = await this.cache.topQueries(s.id, limit);
    const cleared = await this.cache.clearBySource(s.id);
    const refreshed: Array<{ ok: boolean; metric: string; entity: string; freshness?: string; error?: string }> = [];
    for (const spec of top) {
      try {
        const r = await this.router.execute(spec, { forceRefresh: true, sourceSlug: slug });
        refreshed.push({ ok: r.freshness === "fresh", metric: spec.metric, entity: `${spec.entity_type}:${spec.entity_code}`, freshness: r.freshness });
      } catch (e) {
        refreshed.push({ ok: false, metric: spec.metric, entity: `${spec.entity_type}:${spec.entity_code}`, error: e instanceof Error ? e.message : String(e) });
      }
    }
    await this.registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "source.force_refresh", targetType: "data_source", targetId: slug, details: { cleared, refreshed: refreshed.length } });
    return { cleared, refreshed };
  }

  async health() {
    const list = await this.list();
    const count = (st: SourceStatus) => list.filter((s) => s.status === st).length;
    return {
      total: list.length,
      counts: { ONLINE: count("ONLINE"), DEGRADED: count("DEGRADED"), OFFLINE: count("OFFLINE"), DISABLED: count("DISABLED"), NOT_CONFIGURED: count("NOT_CONFIGURED"), UNKNOWN: count("UNKNOWN") },
      sources: list.map((s) => ({ slug: s.slug, name: s.name, provider: s.provider, status: s.status, lastSuccessAt: s.lastSuccessAt, lastFailureAt: s.lastFailureAt, lastLatencyMs: s.lastLatencyMs, lastError: s.lastError })),
    };
  }

  logs(slug: string, o: { limit: number; beforeId?: number; onlyErrors?: boolean }) {
    return this.must(slug).then((s) => this.registry.listLogs(s.id, o));
  }
}
