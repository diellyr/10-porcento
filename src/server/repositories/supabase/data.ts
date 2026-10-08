import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredContract } from "../../core/contracts";
import type { RankingData, RankingQuery } from "../../core/ranking";
import type {
  CatalogEntityInput,
  CachedQuery, CoverageEntry, EntityCandidate, IAnalyticsRepository, ICacheRepository, IDataRepository, UpsertSummary,
} from "../../core/interfaces";
import type { QuerySpec } from "../../core/query-spec";
import type { Entity, EntityRef, EntityType, Fact, FactInput } from "../../core/types";
import { must } from "./client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const rowToEntity = (r: any): Entity => ({
  id: r.id, type: r.entity_type, code: r.code, name: r.name, uf: r.uf?.trim() ?? null, population: r.population, parentId: r.parent_id,
});

const chunk = <T>(arr: T[], n: number): T[][] => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const likeEscape = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export class SupabaseDataRepository implements IDataRepository {
  constructor(private db: SupabaseClient) {}

  async findEntity(ref: EntityRef) {
    const r = must(await this.db.from("entities").select("*").eq("entity_type", ref.type).eq("code", ref.code).maybeSingle(), "findEntity");
    return r ? rowToEntity(r) : null;
  }

  async searchEntities(query: string, types?: EntityRef["type"][], limit = 10) {
    const rows = must(await this.db.rpc("search_entities", { p_query: query, p_types: types ?? null, p_limit: limit }), "searchEntities") as any[];
    return rows.map(rowToEntity);
  }

  async countEntities(type: EntityType) {
    const res = await this.db.from("entities").select("id", { count: "exact", head: true }).eq("entity_type", type);
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  }

  async listEntities(type: EntityRef["type"], o: { uf?: string; limit: number; afterCode?: string }) {
    let q = this.db.from("entities").select("*").eq("entity_type", type).order("code").limit(Math.min(o.limit, 500));
    if (o.uf) q = q.eq("uf", o.uf);
    if (o.afterCode) q = q.gt("code", o.afterCode);
    return (must(await q, "listEntities") as any[]).map(rowToEntity);
  }

  async upsertEntities(cands: EntityCandidate[], sourceId: string) {
    const idByKey = new Map<string, string>();
    let total = 0;
    for (const type of ["COUNTRY", "STATE", "MUNICIPALITY"] as const) {
      const batch = cands.filter((c) => c.type === type);
      for (const part of chunk(batch, 1000)) {
        const rows = part.map((c) => ({
          entity_type: c.type, code: c.code, name: c.name, uf: c.uf, population: c.population, cnpj: c.cnpj ?? null, source_id: sourceId,
          esfera: c.type === "COUNTRY" ? "U" : c.type === "STATE" ? (c.code === "53" ? "D" : "E") : "M",
          parent_id: c.parentCode ? (idByKey.get(`${c.type === "MUNICIPALITY" ? "STATE" : "COUNTRY"}:${c.parentCode}`) ?? null) : null,
        }));
        const res = must(await this.db.from("entities").upsert(rows, { onConflict: "entity_type,code" }).select("id,entity_type,code"), "upsertEntities") as any[];
        for (const r of res) idByKey.set(`${r.entity_type}:${r.code}`, r.id);
        total += res.length;
      }
    }
    return total;
  }

  async upsertGenericEntities(items: CatalogEntityInput[], sourceId: string) {
    let total = 0;
    for (const part of chunk(items, 500)) {
      const rows = part.map((i) => ({ entity_type: i.type, code: i.code, name: i.name.slice(0, 300), attributes: i.attributes ?? {}, source_id: sourceId }));
      total += (must(await this.db.from("entities").upsert(rows, { onConflict: "entity_type,code" }).select("id"), "upsertGenericEntities") as unknown[]).length;
    }
    return total;
  }

  async queryContracts(f: { supplierCnpj?: string; agencyCode?: string; year?: number; limit: number; beforeId?: number }): Promise<StoredContract[]> {
    let q = this.db
      .from("fiscal_facts")
      .select("id,value,period_year,category_code,category_label,fetched_at," +
        "entity:entities!fiscal_facts_entity_id_fkey(code,name,attributes),related:entities!fiscal_facts_related_entity_id_fkey(code,name),source:data_sources!fiscal_facts_source_id_fkey(slug)")
      .eq("metric", "CONTRACT_VALUE").order("id", { ascending: false }).limit(Math.min(f.limit, 2000));
    if (f.supplierCnpj) {
      const sup = await this.findEntity({ type: "SUPPLIER", code: f.supplierCnpj });
      if (!sup) return [];
      q = q.eq("related_entity_id", sup.id);
    }
    if (f.agencyCode) q = q.eq("category_type", "AGENCY").eq("category_code", f.agencyCode);
    if (f.year) q = q.eq("period_year", f.year);
    if (f.beforeId) q = q.lt("id", f.beforeId);
    const rows = must(await q, "queryContracts") as any[];
    return rows.map((r) => {
      const a = (r.entity?.attributes ?? {}) as Record<string, any>;
      return {
        factId: r.id, code: r.entity?.code ?? "", number: a.number ?? r.entity?.name ?? null, object: a.object ?? null, supplierCnpj: r.related?.code ?? "",
        supplierName: r.related?.name ?? "", agencyCode: r.category_code, agencyName: r.category_label, year: r.period_year, startDate: a.startDate ?? null,
        endDate: a.endDate ?? null, initialValue: a.initialValue ?? null, finalValue: a.finalValue ?? null, value: Number(r.value), modality: a.modality ?? null,
        fetchedAt: r.fetched_at, sourceSlug: r.source?.slug ?? "?",
      };
    });
  }

  async rankEntities(q: RankingQuery & { category_type: string }): Promise<RankingData> {
    const rows = must(await this.db.rpc("rank_entities", {
      p_entity_type: q.entity_type, p_metric: q.metric, p_category_type: q.category_type, p_category_code: q.category_code ?? null, p_year: q.year,
      p_compare_year: q.compare_year ?? null, p_uf: q.uf ?? null, p_order: q.order, p_per_capita: q.per_capita, p_limit: q.limit,
    }), "rank_entities") as any[];
    return {
      items: rows.map((r) => ({ code: r.code, name: r.name, uf: r.uf?.trim() ?? null, population: r.population, value: Number(r.value), previous: r.previous == null ? null : Number(r.previous), changePct: r.change_pct == null ? null : Number(r.change_pct) })),
      covered: Number(rows[0]?.covered ?? 0),
      total: Number(rows[0]?.total ?? 0),
    };
  }

  async upsertFacts(facts: FactInput[], sourceId: string): Promise<UpsertSummary> {
    const sum: UpsertSummary = { received: 0, inserted: 0, updated: 0, unchanged: 0, rejected: 0 };
    for (const part of chunk(facts, 1000)) {
      const rows = part.map((f) => ({ ...f, source_id: sourceId }));
      const r = must(await this.db.rpc("upsert_fiscal_facts", { p_rows: rows }), "upsert_fiscal_facts") as UpsertSummary;
      for (const k of Object.keys(sum) as Array<keyof UpsertSummary>) sum[k] += Number(r[k] ?? 0);
    }
    return sum;
  }

  async queryFacts(spec: QuerySpec): Promise<Fact[]> {
    const ent = await this.findEntity({ type: spec.entity_type, code: spec.entity_code });
    if (!ent) return [];
    let q = this.db
      .from("fiscal_facts")
      .select("value,unit,metric,category_type,category_code,category_label,period_type,period_year,period_number,source_dataset,source_url,source_updated_at,fetched_at," +
        "related:entities!fiscal_facts_related_entity_id_fkey(code,name),source:data_sources!fiscal_facts_source_id_fkey(slug)")
      .eq("entity_id", ent.id).eq("metric", spec.metric)
      .gte("period_year", spec.year_from).lte("period_year", spec.year_to)
      .order("period_year").order("category_code").limit(5000);
    if (spec.category_type) q = q.eq("category_type", spec.category_type);
    if (spec.category_code) q = q.eq("category_code", spec.category_code);
    if (spec.category_prefix) q = q.like("category_code", `${likeEscape(spec.category_prefix)}%`);
    const rows = must(await q, "queryFacts") as any[];
    return rows.map((r) => ({
      entityCode: ent.code, entityType: ent.type, relatedCode: r.related?.code ?? null, relatedName: r.related?.name ?? null,
      metric: r.metric, categoryType: r.category_type, categoryCode: r.category_code, categoryLabel: r.category_label,
      periodType: r.period_type, year: r.period_year, periodNumber: r.period_number, value: Number(r.value), unit: r.unit,
      sourceSlug: r.source?.slug ?? "?", sourceDataset: r.source_dataset, sourceUrl: r.source_url,
      sourceUpdatedAt: r.source_updated_at, fetchedAt: r.fetched_at,
    }));
  }
}

export class SupabaseCacheRepository implements ICacheRepository {
  constructor(private db: SupabaseClient) {}

  async getQuery(hash: string): Promise<CachedQuery | null> {
    const r = must(await this.db.from("cached_queries").select("query_hash,query_type,expires_at,created_at,source_id,result_reference").eq("query_hash", hash).maybeSingle(), "getQuery") as any;
    return r ? { queryHash: r.query_hash, queryType: r.query_type, expiresAt: r.expires_at, createdAt: r.created_at, sourceId: r.source_id, reference: r.result_reference ?? {} } : null;
  }

  async putQuery(q: Parameters<ICacheRepository["putQuery"]>[0]) {
    must(await this.db.from("cached_queries").upsert({
      query_hash: q.hash, query_type: q.type, normalized_query: q.normalized, result_reference: q.reference, source_id: q.sourceId,
      record_count: q.recordCount, created_at: new Date().toISOString(), expires_at: q.expiresAt.toISOString(),
    }, { onConflict: "query_hash" }), "putQuery");
  }

  async touchQuery(hash: string) {
    must(await this.db.rpc("touch_cached_query", { p_hash: hash }), "touchQuery");
  }

  async getCoverage(entityId: string, keys: Array<{ dataset: string; year: number; periodNumber: number }>): Promise<CoverageEntry[]> {
    if (!keys.length) return [];
    const rows = must(await this.db.from("data_coverage").select("*").eq("entity_id", entityId)
      .in("dataset", [...new Set(keys.map((k) => k.dataset))]).in("period_year", [...new Set(keys.map((k) => k.year))]), "getCoverage") as any[];
    return rows.map((r) => ({
      entityId: r.entity_id, sourceId: r.source_id, dataset: r.dataset, year: r.period_year, periodNumber: r.period_number,
      status: r.status, fetchedAt: r.fetched_at, expiresAt: r.expires_at, recordCount: r.record_count,
    }));
  }

  async putCoverage(e: Omit<CoverageEntry, "fetchedAt">) {
    must(await this.db.from("data_coverage").upsert({
      entity_id: e.entityId, source_id: e.sourceId, dataset: e.dataset, period_year: e.year, period_number: e.periodNumber,
      status: e.status, record_count: e.recordCount, fetched_at: new Date().toISOString(), expires_at: e.expiresAt,
    }, { onConflict: "entity_id,source_id,dataset,period_year,period_number" }), "putCoverage");
  }

  async topQueries(sourceId: string, limit: number) {
    const rows = must(await this.db.from("cached_queries").select("normalized_query").eq("source_id", sourceId).in("query_type", ["series", "breakdown"]).order("hit_count", { ascending: false }).limit(limit), "topQueries") as any[];
    return rows.map((r) => r.normalized_query as QuerySpec);
  }

  async clearBySource(sourceId: string) {
    const q = must(await this.db.from("cached_queries").delete().eq("source_id", sourceId).select("id"), "clear queries") as any[];
    const c = must(await this.db.from("data_coverage").delete().eq("source_id", sourceId).select("id"), "clear coverage") as any[];
    return { queries: q.length, coverage: c.length };
  }

  async clearAll() {
    const q = must(await this.db.from("cached_queries").delete().gt("id", 0).select("id"), "clear queries") as any[];
    const c = must(await this.db.from("data_coverage").delete().gt("id", 0).select("id"), "clear coverage") as any[];
    return { queries: q.length, coverage: c.length };
  }
}

export class SupabaseAnalyticsRepository implements IAnalyticsRepository {
  constructor(private db: SupabaseClient) {}
  async dataOverview() {
    return must(await this.db.rpc("admin_data_overview"), "dataOverview") as Record<string, unknown>;
  }
  async listUsers(limit: number) {
    return (must(await this.db.from("profiles").select("id,email,role,created_at").order("created_at", { ascending: false }).limit(Math.min(limit, 500)), "listUsers") as any[])
      .map((r) => ({ id: r.id, email: r.email, role: r.role, createdAt: r.created_at }));
  }
  async getRole(userId: string) {
    const r = must(await this.db.from("profiles").select("role").eq("id", userId).maybeSingle(), "getRole") as any;
    return r?.role ?? null;
  }
  async setRole(userId: string, role: "user" | "admin") {
    must(await this.db.from("profiles").update({ role }).eq("id", userId), "setRole");
  }
  async purgeOld(days: number) {
    const cutoff = (ms: number) => new Date(Date.now() - ms).toISOString();
    const d = days * 86_400_000;
    const count = async (q: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>, what: string) => (must(await q, what) as unknown[]).length;
    const logs = await count(this.db.from("api_request_logs").delete().lt("started_at", cutoff(d)).select("id"), "purge logs");
    const cachedQueries = await count(this.db.from("cached_queries").delete().lt("expires_at", cutoff(7 * 86_400_000)).select("id"), "purge cached_queries");
    const emptyCoverage = await count(this.db.from("data_coverage").delete().eq("status", "EMPTY").lt("expires_at", cutoff(30 * 86_400_000)).select("id"), "purge coverage");
    return { logs, cachedQueries, emptyCoverage };
  }
  async countAdmins() {
    const r = await this.db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if (r.error) throw new Error(r.error.message);
    return r.count ?? 0;
  }
  async dashboardStats(since: Date) {
    return must(await this.db.rpc("admin_dashboard_stats", { p_since: since.toISOString() }), "dashboardStats") as Record<string, unknown>;
  }
  async dbUsage(limitBytes: number) {
    const r = must(await this.db.rpc("admin_db_usage", { p_limit_bytes: limitBytes }), "dbUsage") as any;
    return { databaseBytes: Number(r.database_bytes), limitBytes: Number(r.limit_bytes), percent: Number(r.percent), facts: Number(r.facts), entities: Number(r.entities), logs: Number(r.logs) };
  }
}
