/**
 * Implementações EM MEMÓRIA dos repositórios — SOMENTE para testes e para o modo de desenvolvimento com fixtures
 * (BRASIL_FISCAL_DEV_FIXTURES=1, bloqueado em produção). Os dados que passam por aqui são sintéticos e NÃO são oficiais.
 */
import type { StoredContract } from "../core/contracts";
import type { RankingData, RankingQuery } from "../core/ranking";
import type {
  CatalogEntityInput, IAnalyticsRepository, UserProfile,
  CachedQuery, CoverageEntry, EntityCandidate, ICacheRepository, IDataRepository, IImportRepository, ImportFactsOptions, ImportFactsResult, ImportRecord,
  ISourceRegistry, RequestLog, SourceHealthPatch, UpsertSummary,
} from "@/server/core/interfaces";
import { unitKey } from "@/server/core/csv-import";
import { hashOf } from "@/server/core/normalize";
import type { QuerySpec } from "@/server/core/query-spec";
import type { Entity, EntityRef, EntityType, Fact, FactInput, SourceDefinition, SourceRecord } from "@/server/core/types";
import { normalizeText } from "@/server/core/normalize";

let seq = 0;
const uid = () => `id-${++seq}`;

export class MemoryStore {
  entities = new Map<string, Entity & { sourceId?: string; attributes?: Record<string, unknown> }>();
  facts = new Map<string, Fact & { value: number; key: string; sourceId: string; version: number; fid: number; recordId?: string | null }>();
  imports = new Map<string, ImportRecord>();
  importCoverage = new Map<string, CoverageEntry[]>();
  versions: Array<{ key: string; previous: number; next: number }> = [];
  coverage: Array<CoverageEntry> = [];
  queries = new Map<string, CachedQuery & { hits: number; recordCount: number; spec: QuerySpec }>();
  sources = new Map<string, SourceRecord>();
  credentials = new Map<string, string>();
  logs: Array<RequestLog & { id: number }> = [];
  audits: Array<{ action: string; actorEmail: string | null; details?: Record<string, unknown> }> = [];
}

export class MemoryData implements IDataRepository {
  constructor(private s: MemoryStore) {}
  async findEntity(ref: EntityRef) { return [...this.s.entities.values()].find((e) => e.type === ref.type && e.code === ref.code) ?? null; }
  async searchEntities(q: string, types?: EntityRef["type"][], limit = 10) {
    const n = normalizeText(q);
    return [...this.s.entities.values()].filter((e) => (!types || types.includes(e.type)) && normalizeText(e.name).includes(n)).slice(0, limit);
  }
  async listEntities(type: EntityRef["type"], o: { uf?: string; limit: number; afterCode?: string }) {
    return [...this.s.entities.values()].filter((e) => e.type === type && (!o.uf || e.uf === o.uf) && (!o.afterCode || e.code > o.afterCode)).sort((a, b) => (a.code < b.code ? -1 : 1)).slice(0, o.limit);
  }
  async countEntities(type: EntityType) { return [...this.s.entities.values()].filter((e) => e.type === type).length; }
  async upsertEntities(cands: EntityCandidate[], sourceId: string) {
    for (const c of cands) {
      if (!(await this.findEntity(c))) this.s.entities.set(uid(), { id: uid(), type: c.type, code: c.code, name: c.name, uf: c.uf, population: c.population, parentId: null, sourceId });
    }
    return cands.length;
  }
  async upsertGenericEntities(items: CatalogEntityInput[], sourceId: string) {
    for (const i of items) {
      const ex = [...this.s.entities.values()].find((e) => e.type === i.type && e.code === i.code);
      if (ex) { ex.name = i.name; ex.attributes = i.attributes ?? {}; }
      else { const id = uid(); this.s.entities.set(id, { id, type: i.type, code: i.code, name: i.name, uf: null, population: null, parentId: null, sourceId, attributes: i.attributes ?? {} }); }
    }
    return items.length;
  }
  async queryContracts(f: { supplierCnpj?: string; agencyCode?: string; year?: number; limit: number; beforeId?: number }): Promise<StoredContract[]> {
    const out: StoredContract[] = [];
    for (const fact of [...this.s.facts.values()].sort((a, b) => b.fid - a.fid)) {
      if (fact.metric !== "CONTRACT_VALUE") continue;
      if (f.supplierCnpj && fact.relatedCode !== f.supplierCnpj) continue;
      if (f.agencyCode && !(fact.categoryType === "AGENCY" && fact.categoryCode === f.agencyCode)) continue;
      if (f.year && fact.year !== f.year) continue;
      if (f.beforeId && fact.fid >= f.beforeId) continue;
      const ent = [...this.s.entities.values()].find((e) => e.type === "CONTRACT" && e.code === fact.entityCode);
      const a = (ent?.attributes ?? {}) as Record<string, any>;
      out.push({ factId: fact.fid, code: fact.entityCode, number: a.number ?? null, object: a.object ?? null, supplierCnpj: fact.relatedCode ?? "", supplierName: fact.relatedName ?? "",
        agencyCode: fact.categoryCode, agencyName: fact.categoryLabel, year: fact.year, startDate: a.startDate ?? null, endDate: a.endDate ?? null, initialValue: a.initialValue ?? null,
        finalValue: a.finalValue ?? null, value: fact.value, modality: a.modality ?? null, fetchedAt: fact.fetchedAt, sourceSlug: fact.sourceSlug });
      if (out.length >= f.limit) break;
    }
    return out;
  }
  async rankEntities(q: RankingQuery & { category_type: string }): Promise<RankingData> {
    const ents = [...this.s.entities.values()].filter((e) => e.type === q.entity_type && (!q.uf || e.uf === q.uf));
    const rows: RankingData["items"] = [];
    for (const e of ents) {
      const fs = [...this.s.facts.values()].filter((f) => f.entityCode === e.code && f.entityType === e.type && f.metric === q.metric && f.categoryType === q.category_type &&
        (q.category_code ? f.categoryCode === q.category_code : q.category_type !== "REVENUE_SOURCE" || /^[12]\.0\.0\.0/.test(f.categoryCode ?? "")));
      const sum = (y: number) => { const x = fs.filter((f) => f.year === y); return x.length ? x.reduce((a, f) => a + f.value, 0) : null; };
      let v = sum(q.year), pv = q.compare_year ? sum(q.compare_year) : null;
      if (v === null || (q.compare_year && pv === null)) continue;
      if (q.per_capita) { if (!e.population) continue; v /= e.population; if (pv !== null) pv /= e.population; }
      const change = pv ? Math.round(((v - pv) / Math.abs(pv)) * 10000) / 100 : null;
      if (q.order.startsWith("change") && change === null) continue;
      rows.push({ code: e.code, name: e.name, uf: e.uf, population: e.population, value: Math.round(v * 100) / 100, previous: pv === null ? null : Math.round(pv * 100) / 100, changePct: change });
    }
    const key = (r: (typeof rows)[number]) => (q.order.startsWith("change") ? r.changePct! : r.value);
    rows.sort((a, b) => (q.order.endsWith("asc") ? key(a) - key(b) : key(b) - key(a)) || a.name.localeCompare(b.name));
    return { items: rows.slice(0, q.limit), covered: rows.length, total: ents.length };
  }
  async upsertFacts(facts: FactInput[], sourceId: string): Promise<UpsertSummary> {
    const sum = { received: facts.length, inserted: 0, updated: 0, unchanged: 0, rejected: 0 };
    const seen = new Set<string>();
    for (const f of facts) {
      const ent = await this.findEntity({ type: f.entity_type, code: f.entity_code });
      if (!ent) { sum.rejected++; continue; }
      const key = hashOf([ent.id, f.related_code, f.metric, f.category_type, f.category_code, sourceId, f.period_type, f.period_year, f.period_number, f.source_dataset, f.source_record_id]);
      if (seen.has(key)) continue;
      seen.add(key);
      const cur = this.s.facts.get(key);
      const source = this.s.sources.get(sourceId);
      const fact = {
        entityCode: f.entity_code, entityType: f.entity_type, relatedCode: f.related_code ?? null, relatedName: f.related_name ?? null, metric: f.metric,
        categoryType: f.category_type ?? null, categoryCode: f.category_code ?? null, categoryLabel: f.category_label ?? null, periodType: f.period_type,
        year: f.period_year, periodNumber: f.period_number, value: f.value, unit: f.unit, sourceSlug: source?.slug ?? "?", sourceDataset: f.source_dataset,
        sourceUrl: f.source_url ?? null, sourceUpdatedAt: f.source_updated_at ?? null, fetchedAt: new Date().toISOString(), key, sourceId, version: 1, fid: this.s.facts.size + 1, recordId: f.source_record_id ?? null,
      };
      if (!cur) { this.s.facts.set(key, fact); sum.inserted++; }
      else if (cur.value !== f.value) { this.s.versions.push({ key, previous: cur.value, next: f.value }); this.s.facts.set(key, { ...fact, version: cur.version + 1 }); sum.updated++; }
      else sum.unchanged++;
    }
    return sum;
  }
  async importFacts(facts: FactInput[], o: ImportFactsOptions): Promise<ImportFactsResult> {
    const units = new Map<string, FactInput>();
    for (const f of facts) units.set(unitKey(f), f);
    // substitui o que existia nas unidades importadas (mesma fonte, métricas e categorias do dataset)
    for (const [k, f] of [...this.s.facts]) {
      const hit = [...units.values()].some((u) => u.entity_type === f.entityType && u.entity_code === f.entityCode && u.period_year === f.year && u.period_number === f.periodNumber);
      if (hit && !f.recordId?.startsWith(`csv:${o.importId}:`) && f.sourceId === o.sourceId && o.dataset.metrics.includes(f.metric) && f.categoryType && o.dataset.categoryTypes.includes(f.categoryType)) this.s.facts.delete(k);
    }
    const sum = await this.upsertFacts(facts, o.sourceId);
    const cov: CoverageEntry[] = [];
    for (const u of units.values()) {
      const ent = await this.findEntity({ type: u.entity_type, code: u.entity_code });
      if (!ent) continue;
      const entry = { entityId: ent.id, sourceId: o.sourceId, dataset: o.dataset.id, year: u.period_year, periodNumber: u.period_number, status: "OK" as const, recordCount: facts.filter((f) => unitKey(f) === unitKey(u)).length, expiresAt: o.expiresAt.toISOString(), fetchedAt: new Date().toISOString() };
      this.s.coverage = this.s.coverage.filter((c) => !(c.entityId === entry.entityId && c.sourceId === entry.sourceId && c.dataset === entry.dataset && c.year === entry.year && c.periodNumber === entry.periodNumber));
      this.s.coverage.push(entry);
      cov.push(entry);
    }
    this.s.importCoverage.set(o.importId, [...(this.s.importCoverage.get(o.importId) ?? []), ...cov]);
    return { saved: sum.received - sum.rejected, rejected: sum.rejected, units: cov.length };
  }
  async queryFacts(spec: QuerySpec) {
    return [...this.s.facts.values()].filter((f) =>
      f.entityType === spec.entity_type && f.entityCode === spec.entity_code && f.metric === spec.metric &&
      f.year >= spec.year_from && f.year <= spec.year_to && (!spec.category_type || f.categoryType === spec.category_type) &&
      (!spec.category_code || f.categoryCode === spec.category_code) && (!spec.category_prefix || f.categoryCode?.startsWith(spec.category_prefix))) as Fact[];
  }
}

export class MemoryCache implements ICacheRepository {
  constructor(private s: MemoryStore) {}
  async getQuery(hash: string) { return this.s.queries.get(hash) ?? null; }
  async putQuery(q: Parameters<ICacheRepository["putQuery"]>[0]) {
    this.s.queries.set(q.hash, { queryHash: q.hash, queryType: q.type, expiresAt: q.expiresAt.toISOString(), createdAt: new Date().toISOString(), sourceId: q.sourceId, hits: 0, recordCount: q.recordCount, spec: q.normalized as QuerySpec, reference: q.reference });
  }
  async touchQuery(hash: string) { const q = this.s.queries.get(hash); if (q) q.hits++; }
  async getCoverage(entityId: string, keys: Array<{ dataset: string; year: number; periodNumber: number }>) {
    return this.s.coverage.filter((c) => c.entityId === entityId && keys.some((k) => k.dataset === c.dataset && k.year === c.year && k.periodNumber === c.periodNumber));
  }
  async putCoverage(e: Omit<CoverageEntry, "fetchedAt">) {
    this.s.coverage = this.s.coverage.filter((c) => !(c.entityId === e.entityId && c.sourceId === e.sourceId && c.dataset === e.dataset && c.year === e.year && c.periodNumber === e.periodNumber));
    this.s.coverage.push({ ...e, fetchedAt: new Date().toISOString() });
  }
  async topQueries(sourceId: string, limit: number) {
    return [...this.s.queries.values()].filter((q) => q.sourceId === sourceId && (q.queryType === "series" || q.queryType === "breakdown")).sort((a, b) => b.hits - a.hits).slice(0, limit).map((q) => q.spec);
  }
  async clearBySource(sourceId: string) {
    const q = [...this.s.queries].filter(([, v]) => v.sourceId === sourceId);
    q.forEach(([k]) => this.s.queries.delete(k));
    const c = this.s.coverage.filter((x) => x.sourceId === sourceId).length;
    this.s.coverage = this.s.coverage.filter((x) => x.sourceId !== sourceId);
    return { queries: q.length, coverage: c };
  }
  async clearQueries(sourceId: string) {
    const q = [...this.s.queries].filter(([, v]) => v.sourceId === sourceId || v.sourceId === null);
    q.forEach(([k]) => this.s.queries.delete(k));
    return q.length;
  }
  async clearAll() { const r = { queries: this.s.queries.size, coverage: this.s.coverage.length }; this.s.queries.clear(); this.s.coverage = []; return r; }
}

export class MemoryImports implements IImportRepository {
  constructor(private s: MemoryStore) {}
  async create(i: Parameters<IImportRepository["create"]>[0]) {
    const rec: ImportRecord = { id: uid(), sourceId: i.sourceId, dataset: i.dataset, filename: i.filename, status: "RUNNING", rowsTotal: i.rowsTotal, rowsSaved: 0, rowsRejected: 0, units: 0, rejectReasons: [], createdByEmail: i.actorEmail, createdAt: new Date().toISOString(), finishedAt: null };
    this.s.imports.set(rec.id, rec);
    return rec;
  }
  async get(id: string) { return this.s.imports.get(id) ?? null; }
  async addProgress(id: string, p: { saved: number; rejected: number; units: number; reasons: string[] }) {
    const r = this.s.imports.get(id); if (!r) return;
    r.rowsSaved += p.saved; r.rowsRejected += p.rejected; r.units += p.units; r.rejectReasons = [...new Set([...r.rejectReasons, ...p.reasons])].slice(0, 20);
  }
  async finish(id: string, status: "DONE" | "FAILED") { const r = this.s.imports.get(id); if (r) { r.status = status; r.finishedAt = new Date().toISOString(); } }
  async list(sourceId: string, limit: number) { return [...this.s.imports.values()].filter((r) => r.sourceId === sourceId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); }
  async rollback(id: string) {
    const prefix = `csv:${id}:`;
    const doomed = [...this.s.facts].filter(([, f]) => f.recordId?.startsWith(prefix));
    doomed.forEach(([k]) => this.s.facts.delete(k));
    const cov = this.s.importCoverage.get(id) ?? [];
    this.s.coverage = this.s.coverage.filter((c) => !cov.includes(c));
    this.s.importCoverage.delete(id);
    const r = this.s.imports.get(id); if (r) { r.status = "ROLLED_BACK"; r.finishedAt = new Date().toISOString(); }
    return { facts: doomed.length, coverage: cov.length };
  }
}

export class MemoryRegistry implements ISourceRegistry {
  constructor(private s: MemoryStore) {}
  async ensureSources(defs: SourceDefinition[]) {
    for (const d of defs) {
      if ([...this.s.sources.values()].some((x) => x.slug === d.slug)) continue;
      const id = uid();
      this.s.sources.set(id, {
        id, name: d.name, slug: d.slug, description: d.description, provider: d.provider, category: d.category, sourceType: d.sourceType, baseUrl: d.baseUrl,
        documentationUrl: d.documentationUrl, authType: d.authType, requiresAuth: d.requiresAuth, enabled: true, priority: d.priority,
        rateLimitPerMinute: d.rateLimitPerMinute, cacheTtlMinutes: d.cacheTtlMinutes, status: d.requiresAuth ? "NOT_CONFIGURED" : "UNKNOWN", parserVersion: "1",
        adapterKey: ({ siconfi: "siconfi", "portal-transparencia": "transparencia", "receita-federal": "receita", "tesouro-nacional": "tesouro", "dados-gov-br": "dadosgov", "ibge-localidades": "ibge" } as Record<string, string>)[d.slug] ?? d.slug,
        config: d.config ?? {}, lastSuccessAt: null, lastFailureAt: null, lastSyncAt: null, lastRequestAt: null, lastLatencyMs: null, lastHttpStatus: null, lastError: null, disabledAt: null, disabledBy: null,
      });
    }
  }
  async create(n: Parameters<ISourceRegistry["create"]>[0]) {
    if ([...this.s.sources.values()].some((x) => x.slug === n.slug)) throw new Error("duplicate key value violates unique constraint (slug)");
    const id = uid();
    const rec: SourceRecord = { id, ...n, enabled: true, status: n.requiresAuth ? "NOT_CONFIGURED" : "UNKNOWN", parserVersion: "1", lastSuccessAt: null, lastFailureAt: null, lastSyncAt: null, lastRequestAt: null, lastLatencyMs: null, lastHttpStatus: null, lastError: null, disabledAt: null, disabledBy: null };
    this.s.sources.set(id, rec);
    return rec;
  }
  async list() { return [...this.s.sources.values()].sort((a, b) => a.priority - b.priority); }
  async getBySlug(slug: string) { return [...this.s.sources.values()].find((x) => x.slug === slug) ?? null; }
  async update(id: string, patch: Parameters<ISourceRegistry["update"]>[1]) {
    const cur = this.s.sources.get(id)!;
    const next = { ...cur, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) } as SourceRecord;
    if (patch.disabledAt !== undefined) next.disabledAt = patch.disabledAt ? patch.disabledAt.toISOString() : null;
    this.s.sources.set(id, next);
    return next;
  }
  async recordHealth(id: string, p: SourceHealthPatch) {
    const cur = this.s.sources.get(id)!;
    const iso = (d?: Date) => (d ? d.toISOString() : undefined);
    this.s.sources.set(id, { ...cur, ...(p.status ? { status: p.status } : {}), ...(p.lastSuccessAt ? { lastSuccessAt: iso(p.lastSuccessAt)! } : {}),
      ...(p.lastFailureAt ? { lastFailureAt: iso(p.lastFailureAt)! } : {}), ...(p.lastSyncAt ? { lastSyncAt: iso(p.lastSyncAt)! } : {}),
      ...(p.lastLatencyMs !== undefined ? { lastLatencyMs: p.lastLatencyMs } : {}), ...(p.lastHttpStatus !== undefined ? { lastHttpStatus: p.lastHttpStatus } : {}),
      ...(p.lastError !== undefined ? { lastError: p.lastError } : {}) });
  }
  async getCredential(id: string) { const v = this.s.credentials.get(id); return v ? { plaintext: v, last4: v.slice(-4) } : null; }
  async getCredentialHint(id: string) { const v = this.s.credentials.get(id); return v ? { last4: v.slice(-4), updatedAt: new Date().toISOString() } : null; }
  async setCredential(id: string, plaintext: string, _actor?: string | null) { this.s.credentials.set(id, plaintext); return { last4: plaintext.slice(-4) }; }
  async clearCredential(id: string) { this.s.credentials.delete(id); }
  async logRequest(l: RequestLog) { this.s.logs.push({ ...l, id: this.s.logs.length + 1 }); }
  async listLogs(sourceId: string, o: { limit: number; beforeId?: number; onlyErrors?: boolean }) {
    return this.s.logs.filter((l) => l.sourceId === sourceId && (!o.onlyErrors || !l.success) && (!o.beforeId || l.id < o.beforeId)).slice(-o.limit).reverse();
  }
  async countExternalCalls(sourceId: string, since: Date) {
    return this.s.logs.filter((l) => l.sourceId === sourceId && !l.cacheHit && !l.isTest && l.queryType == null && l.startedAt >= since).length;
  }
  async audit(e: { action: string; actorEmail: string | null; details?: Record<string, unknown> }) { this.s.audits.push(e); }
  async listAudit() { return this.s.audits.map((a, i) => ({ id: i, actorEmail: a.actorEmail, action: a.action, targetType: null, targetId: null, details: a.details ?? {}, createdAt: new Date().toISOString() })); }
}

export function memoryStack() {
  const store = new MemoryStore();
  return { store, data: new MemoryData(store), cache: new MemoryCache(store), registry: new MemoryRegistry(store), analytics: new MemoryAnalytics(store) };
}

export class MemoryAnalytics implements IAnalyticsRepository {
  users: UserProfile[] = [{ id: "dev-admin", email: "dev@local", role: "admin", createdAt: new Date().toISOString() }];
  constructor(private s: MemoryStore) {}
  async dataOverview() {
    const by = new Map<string, { source: string; metric: string; facts: number; year_min: number; year_max: number; last_fetched: string }>();
    for (const f of this.s.facts.values()) {
      const k = `${f.sourceSlug}|${f.metric}`;
      const c = by.get(k) ?? { source: f.sourceSlug, metric: f.metric, facts: 0, year_min: f.year, year_max: f.year, last_fetched: f.fetchedAt };
      c.facts++; c.year_min = Math.min(c.year_min, f.year); c.year_max = Math.max(c.year_max, f.year);
      by.set(k, c);
    }
    return { by_source_metric: [...by.values()], entities_by_type: [{ type: "MUNICIPALITY", total: [...this.s.entities.values()].filter((e) => e.type === "MUNICIPALITY").length }], recent_versions: [], coverage_total: this.s.coverage.length, coverage_expired: 0 };
  }
  async dashboardStats() {
    const l = this.s.logs;
    const router = l.filter((x) => x.queryType === "router");
    const ext = l.filter((x) => !x.cacheHit && !x.isTest && x.queryType == null);
    const durs = ext.map((x) => x.durationMs ?? 0).filter(Boolean);
    return {
      queries: router.length, cache_hits: router.filter((x) => x.cacheHit).length, cache_misses: router.filter((x) => !x.cacheHit).length, external_calls: ext.length,
      api_errors: l.filter((x) => !x.success).length, avg_response_ms: durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : null,
      facts_total: this.s.facts.size, entities_total: this.s.entities.size, top_sources: [], top_municipalities: [], top_indicators: [],
    };
  }
  async dbUsage(limitBytes: number) { const b = this.s.facts.size * 300; return { databaseBytes: b, limitBytes, percent: Math.round((100 * b) / limitBytes * 10) / 10, facts: this.s.facts.size, entities: this.s.entities.size, logs: this.s.logs.length }; }
  async listUsers() { return this.users; }
  async getRole(id: string) { return this.users.find((u) => u.id === id)?.role ?? null; }
  async setRole(id: string, role: "user" | "admin") { const u = this.users.find((x) => x.id === id); if (u) u.role = role; }
  async countAdmins() { return this.users.filter((u) => u.role === "admin").length; }
  async purgeOld(days: number) {
    const cut = Date.now() - days * 86_400_000;
    const before = this.s.logs.length;
    this.s.logs = this.s.logs.filter((l) => l.startedAt.getTime() >= cut);
    const qs = [...this.s.queries].filter(([, q]) => new Date(q.expiresAt).getTime() < Date.now() - 7 * 86_400_000);
    qs.forEach(([k]) => this.s.queries.delete(k));
    const cov = this.s.coverage.filter((c) => c.status === "EMPTY" && new Date(c.expiresAt).getTime() < Date.now() - 30 * 86_400_000).length;
    this.s.coverage = this.s.coverage.filter((c) => !(c.status === "EMPTY" && new Date(c.expiresAt).getTime() < Date.now() - 30 * 86_400_000));
    return { logs: before - this.s.logs.length, cachedQueries: qs.length, emptyCoverage: cov };
  }
}
