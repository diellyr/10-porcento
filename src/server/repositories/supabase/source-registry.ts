import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../core/errors";
import type { ISourceRegistry, RequestLog, SourceHealthPatch } from "../../core/interfaces";
import type { SourceDefinition, SourceRecord } from "../../core/types";
import { decryptSecret, encryptSecret, last4 } from "../../crypto";
import { must } from "./client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function rowToSource(r: any): SourceRecord {
  return {
    id: r.id, name: r.name, slug: r.slug, description: r.description, provider: r.provider, category: r.category,
    sourceType: r.source_type, baseUrl: r.base_url, documentationUrl: r.documentation_url, authType: r.auth_type,
    requiresAuth: r.requires_auth, enabled: r.enabled, priority: r.priority, rateLimitPerMinute: r.rate_limit_per_minute,
    cacheTtlMinutes: r.cache_ttl_minutes, status: r.status, parserVersion: r.parser_version, adapterKey: r.adapter_key,
    config: r.config ?? {}, lastSuccessAt: r.last_success_at, lastFailureAt: r.last_failure_at, lastSyncAt: r.last_sync_at,
    lastRequestAt: r.last_request_at, lastLatencyMs: r.last_latency_ms, lastHttpStatus: r.last_http_status,
    lastError: r.last_error, disabledAt: r.disabled_at, disabledBy: r.disabled_by,
  };
}

const iso = (d?: Date | null) => (d ? d.toISOString() : undefined);

export class SupabaseSourceRegistry implements ISourceRegistry {
  constructor(private db: SupabaseClient) {}

  async ensureSources(defs: SourceDefinition[]): Promise<void> {
    const existing = must(await this.db.from("data_sources").select("slug"), "ensureSources.select") as Array<{ slug: string }>;
    const have = new Set(existing.map((e) => e.slug));
    const rows = defs.filter((d) => !have.has(d.slug)).map((d) => ({
      name: d.name, slug: d.slug, description: d.description, provider: d.provider, category: d.category,
      source_type: d.sourceType, base_url: d.baseUrl, documentation_url: d.documentationUrl, auth_type: d.authType,
      requires_auth: d.requiresAuth, priority: d.priority, rate_limit_per_minute: d.rateLimitPerMinute,
      cache_ttl_minutes: d.cacheTtlMinutes, adapter_key: d.slug === "ibge-localidades" ? "ibge" : adapterKeyOf(d.slug),
      config: d.config ?? {}, status: d.requiresAuth ? "NOT_CONFIGURED" : "UNKNOWN",
    }));
    if (rows.length) must(await this.db.from("data_sources").upsert(rows, { onConflict: "slug", ignoreDuplicates: true }), "ensureSources.insert");
  }

  async create(n: Parameters<ISourceRegistry["create"]>[0]) {
    const row = must(await this.db.from("data_sources").insert({
      name: n.name, slug: n.slug, description: n.description, provider: n.provider, category: n.category, source_type: n.sourceType, base_url: n.baseUrl,
      documentation_url: n.documentationUrl, auth_type: n.authType, requires_auth: n.requiresAuth, priority: n.priority, rate_limit_per_minute: n.rateLimitPerMinute,
      cache_ttl_minutes: n.cacheTtlMinutes, adapter_key: n.adapterKey, config: n.config, status: n.requiresAuth ? "NOT_CONFIGURED" : "UNKNOWN",
    }).select("*").single(), "create source");
    return rowToSource(row);
  }

  async list() {
    return (must(await this.db.from("data_sources").select("*").order("priority"), "list sources") as any[]).map(rowToSource);
  }

  async getBySlug(slug: string) {
    const r = must(await this.db.from("data_sources").select("*").eq("slug", slug).maybeSingle(), "get source");
    return r ? rowToSource(r) : null;
  }

  async update(id: string, patch: Parameters<ISourceRegistry["update"]>[1]) {
    const row: Record<string, unknown> = {};
    if (patch.enabled !== undefined) row.enabled = patch.enabled;
    if (patch.priority !== undefined) row.priority = patch.priority;
    if (patch.cacheTtlMinutes !== undefined) row.cache_ttl_minutes = patch.cacheTtlMinutes;
    if (patch.rateLimitPerMinute !== undefined) row.rate_limit_per_minute = patch.rateLimitPerMinute;
    if (patch.baseUrl !== undefined) row.base_url = patch.baseUrl;
    if (patch.config !== undefined) row.config = patch.config;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.disabledBy !== undefined) row.disabled_by = patch.disabledBy;
    if (patch.disabledAt !== undefined) row.disabled_at = iso(patch.disabledAt) ?? null;
    return rowToSource(must(await this.db.from("data_sources").update(row).eq("id", id).select("*").single(), "update source"));
  }

  async recordHealth(id: string, p: SourceHealthPatch) {
    const row: Record<string, unknown> = {};
    if (p.status) row.status = p.status;
    if (p.lastSuccessAt) row.last_success_at = iso(p.lastSuccessAt);
    if (p.lastFailureAt) row.last_failure_at = iso(p.lastFailureAt);
    if (p.lastSyncAt) row.last_sync_at = iso(p.lastSyncAt);
    if (p.lastRequestAt) row.last_request_at = iso(p.lastRequestAt);
    if (p.lastLatencyMs !== undefined) row.last_latency_ms = p.lastLatencyMs;
    if (p.lastHttpStatus !== undefined) row.last_http_status = p.lastHttpStatus;
    if (p.lastError !== undefined) row.last_error = p.lastError;
    if (Object.keys(row).length) must(await this.db.from("data_sources").update(row).eq("id", id), "recordHealth");
  }

  async getCredential(sourceId: string) {
    const r = must(await this.db.from("source_credentials").select("secret_ciphertext,last4").eq("source_id", sourceId).maybeSingle(), "get credential") as any;
    return r ? { plaintext: decryptSecret(r.secret_ciphertext), last4: r.last4 } : null;
  }

  async getCredentialHint(sourceId: string) {
    const r = must(await this.db.from("source_credentials").select("last4,updated_at").eq("source_id", sourceId).maybeSingle(), "get credential hint") as any;
    return r ? { last4: r.last4, updatedAt: r.updated_at } : null;
  }

  async setCredential(sourceId: string, plaintext: string, actorId: string | null) {
    if (plaintext.length < 8 || plaintext.length > 512) throw new AppError("VALIDATION", "credencial com tamanho inválido");
    const l4 = last4(plaintext);
    must(await this.db.from("source_credentials").upsert({
      source_id: sourceId, secret_ciphertext: encryptSecret(plaintext), last4: l4, updated_by: actorId, updated_at: new Date().toISOString(),
    }), "set credential");
    return { last4: l4 };
  }

  async clearCredential(sourceId: string) {
    must(await this.db.from("source_credentials").delete().eq("source_id", sourceId), "clear credential");
  }

  async logRequest(l: RequestLog) {
    must(await this.db.from("api_request_logs").insert({
      source_id: l.sourceId, query_type: l.queryType ?? null, endpoint: l.endpoint, request_method: l.method ?? "GET",
      parameters_hash: l.parametersHash ?? null, started_at: l.startedAt.toISOString(),
      completed_at: l.durationMs != null ? new Date(l.startedAt.getTime() + l.durationMs).toISOString() : null,
      duration_ms: l.durationMs, http_status: l.httpStatus ?? null, records_received: l.recordsReceived ?? 0,
      records_saved: l.recordsSaved ?? 0, cache_hit: l.cacheHit ?? false, success: l.success,
      error_type: l.errorType ?? null, error_message: l.errorMessage?.slice(0, 1000) ?? null, is_test: l.isTest ?? false,
    }), "log request");
  }

  async listLogs(sourceId: string, o: { limit: number; beforeId?: number; onlyErrors?: boolean }) {
    let q = this.db.from("api_request_logs").select("*").eq("source_id", sourceId).order("id", { ascending: false }).limit(Math.min(o.limit, 200));
    if (o.beforeId) q = q.lt("id", o.beforeId);
    if (o.onlyErrors) q = q.eq("success", false);
    return (must(await q, "list logs") as any[]).map((r) => ({
      id: r.id, sourceId: r.source_id, queryType: r.query_type, endpoint: r.endpoint, method: r.request_method,
      parametersHash: r.parameters_hash, startedAt: new Date(r.started_at), durationMs: r.duration_ms, httpStatus: r.http_status,
      recordsReceived: r.records_received, recordsSaved: r.records_saved, cacheHit: r.cache_hit, success: r.success,
      errorType: r.error_type, errorMessage: r.error_message, isTest: r.is_test,
    }));
  }

  async countExternalCalls(sourceId: string, since: Date) {
    const res = await this.db.from("api_request_logs").select("id", { count: "exact", head: true })
      .eq("source_id", sourceId).eq("cache_hit", false).eq("is_test", false).is("query_type", null).gte("started_at", since.toISOString());
    if (res.error) throw new AppError("INTERNAL", `countExternalCalls: ${res.error.message}`);
    return res.count ?? 0;
  }

  async audit(e: Parameters<ISourceRegistry["audit"]>[0]) {
    must(await this.db.from("admin_audit_log").insert({
      actor_id: e.actorId, actor_email: e.actorEmail, action: e.action, target_type: e.targetType ?? null,
      target_id: e.targetId ?? null, details: e.details ?? {},
    }), "audit");
  }

  async listAudit(limit: number) {
    return (must(await this.db.from("admin_audit_log").select("*").order("id", { ascending: false }).limit(Math.min(limit, 200)), "list audit") as any[]).map((r) => ({
      id: r.id, actorEmail: r.actor_email, action: r.action, targetType: r.target_type, targetId: r.target_id, details: r.details ?? {}, createdAt: r.created_at,
    }));
  }
}

function adapterKeyOf(slug: string): string {
  return ({ siconfi: "siconfi", "portal-transparencia": "transparencia", "receita-federal": "receita", "tesouro-nacional": "tesouro", "dados-gov-br": "dadosgov", "ibge-localidades": "ibge" } as Record<string, string>)[slug] ?? slug;
}
