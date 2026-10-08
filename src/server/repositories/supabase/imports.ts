import type { SupabaseClient } from "@supabase/supabase-js";
import type { IImportRepository, ImportRecord } from "../../core/interfaces";
import { must } from "./client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const toRecord = (r: any): ImportRecord => ({
  id: r.id, sourceId: r.source_id, dataset: r.dataset, filename: r.filename, status: r.status,
  rowsTotal: r.rows_total, rowsSaved: r.rows_saved, rowsRejected: r.rows_rejected, units: r.units,
  rejectReasons: Array.isArray(r.reject_reasons) ? r.reject_reasons : [], createdByEmail: r.created_by_email ?? null,
  createdAt: r.created_at, finishedAt: r.finished_at ?? null,
});

export class SupabaseImportRepository implements IImportRepository {
  constructor(private db: SupabaseClient) {}

  async create(i: Parameters<IImportRepository["create"]>[0]) {
    return toRecord(must(await this.db.from("data_imports").insert({
      source_id: i.sourceId, dataset: i.dataset, filename: i.filename, rows_total: i.rowsTotal, created_by: i.actorId, created_by_email: i.actorEmail,
    }).select("*").single(), "data_imports.insert"));
  }

  async get(id: string) {
    const r = must(await this.db.from("data_imports").select("*").eq("id", id).maybeSingle(), "data_imports.get");
    return r ? toRecord(r) : null;
  }

  async addProgress(id: string, p: { saved: number; rejected: number; units: number; reasons: string[] }) {
    const cur = must(await this.db.from("data_imports").select("rows_saved,rows_rejected,units,reject_reasons").eq("id", id).single(), "data_imports.progress") as any;
    const reasons = [...new Set([...(cur.reject_reasons ?? []), ...p.reasons])].slice(0, 20);
    must(await this.db.from("data_imports").update({
      rows_saved: cur.rows_saved + p.saved, rows_rejected: cur.rows_rejected + p.rejected, units: cur.units + p.units, reject_reasons: reasons,
    }).eq("id", id), "data_imports.update");
  }

  async finish(id: string, status: "DONE" | "FAILED") {
    must(await this.db.from("data_imports").update({ status, finished_at: new Date().toISOString() }).eq("id", id), "data_imports.finish");
  }

  async list(sourceId: string, limit: number) {
    return (must(await this.db.from("data_imports").select("*").eq("source_id", sourceId).order("created_at", { ascending: false }).limit(limit), "data_imports.list") as any[]).map(toRecord);
  }

  async rollback(id: string) {
    const imp = await this.get(id);
    if (!imp) return { facts: 0, coverage: 0 };
    // anos afetados (uma exclusão por ano mantém cada comando pequeno)
    const years = new Set<number>(((must(await this.db.from("data_coverage").select("period_year").eq("import_id", id).limit(100000), "rollback: anos") as any[]) ?? []).map((r) => Number(r.period_year)));
    let facts = 0;
    for (const y of years) {
      const del = must(await this.db.from("fiscal_facts").delete().like("source_record_id", `csv:${id}:%`).eq("period_year", y).select("id"), "rollback: fatos") as any[];
      facts += del.length;
    }
    const cov = must(await this.db.from("data_coverage").delete().eq("import_id", id).select("id"), "rollback: cobertura") as any[];
    must(await this.db.from("data_imports").update({ status: "ROLLED_BACK", finished_at: new Date().toISOString() }).eq("id", id), "rollback: status");
    return { facts, coverage: cov.length };
  }
}
