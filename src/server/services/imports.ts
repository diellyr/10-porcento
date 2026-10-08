import { AppError } from "../core/errors";
import {
  CSV_COVERAGE_YEARS, ChunkSchema, ImportRowSchema, MAX_ROWS_PER_CHUNK, StartSchema, periodRange, rowToFact, templateRow,
  type ImportFieldKey,
} from "../core/csv-import";
import { DATASETS, type DatasetDef } from "../core/datasets";
import type { ICacheRepository, IDataRepository, IImportRepository, ImportRecord, ISourceRegistry } from "../core/interfaces";
import type { FactInput, SourceRecord } from "../core/types";
import type { SourceRuntime } from "../router/runtime";

export interface ImportableDataset {
  id: string; label: string; description: string; metrics: string[]; categoryTypes: string[]; categoryCodes: string[] | null;
  entityTypes: string[]; periodType: string; periodMin: number; periodMax: number; example: Record<ImportFieldKey, string>;
}
export interface Actor { id: string | null; email: string | null }
export interface ChunkResult { saved: number; rejected: number; reasons: string[] }

const toImportable = (d: DatasetDef): ImportableDataset => {
  const pr = periodRange(d.periodType);
  return {
    id: d.id, label: d.label, description: d.description, metrics: d.metrics, categoryTypes: d.categoryTypes, categoryCodes: d.categoryCodes ?? null,
    entityTypes: d.entityTypes, periodType: d.periodType, periodMin: pr.min, periodMax: pr.max, example: templateRow(d),
  };
};

/**
 * Importação de CSV por fonte. Os dados importados entram como fatos da própria fonte e a cobertura das unidades fica válida
 * por muito tempo: o Query Router, que consulta a cobertura ANTES de chamar qualquer API, passa a servir o CSV primeiro.
 */
export class ImportService {
  constructor(private deps: { registry: ISourceRegistry; imports: IImportRepository; data: IDataRepository; cache: ICacheRepository; runtime: SourceRuntime; ensureRegistry?: () => Promise<void> }) {}

  private async source(slug: string): Promise<SourceRecord> {
    await this.deps.ensureRegistry?.();
    const s = await this.deps.registry.getBySlug(slug);
    if (!s) throw new AppError("NOT_FOUND", `fonte ${slug}`);
    return s;
  }

  /** Conjuntos de dados que a fonte atende e que existem no catálogo do sistema. */
  private datasetsOf(s: SourceRecord): DatasetDef[] {
    const adapter = this.deps.runtime.adapterFor(s);
    return (adapter?.datasets ?? []).map((id) => DATASETS[id]).filter((d): d is DatasetDef => !!d);
  }

  private async owned(slug: string, importId: string): Promise<{ s: SourceRecord; imp: ImportRecord; ds: DatasetDef }> {
    const s = await this.source(slug);
    const imp = await this.deps.imports.get(importId);
    if (!imp || imp.sourceId !== s.id) throw new AppError("NOT_FOUND", `importação ${importId}`);
    const ds = DATASETS[imp.dataset];
    if (!ds) throw new AppError("INTERNAL", `dataset desconhecido ${imp.dataset}`);
    return { s, imp, ds };
  }

  async overview(slug: string) {
    const s = await this.source(slug);
    return { datasets: this.datasetsOf(s).map(toImportable), history: await this.deps.imports.list(s.id, 20) };
  }

  async start(slug: string, input: unknown, actor: Actor): Promise<ImportRecord> {
    const p = StartSchema.parse(input);
    const s = await this.source(slug);
    if (!this.datasetsOf(s).some((d) => d.id === p.dataset)) throw new AppError("VALIDATION", `A fonte ${slug} não aceita o conjunto de dados ${p.dataset}`);
    const rec = await this.deps.imports.create({ sourceId: s.id, dataset: p.dataset, filename: p.filename, rowsTotal: p.totalRows, actorId: actor.id, actorEmail: actor.email });
    await this.deps.registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "source.csv_import_started", targetType: "data_source", targetId: slug, details: { dataset: p.dataset, filename: p.filename, rows: p.totalRows, importId: rec.id } });
    return rec;
  }

  /** Recebe um lote de linhas já mapeadas pelo navegador, valida de novo no servidor e grava. */
  async chunk(slug: string, importId: string, input: unknown): Promise<ChunkResult> {
    const { rows } = ChunkSchema.parse(input);
    const { s, imp, ds } = await this.owned(slug, importId);
    if (imp.status !== "RUNNING") throw new AppError("VALIDATION", `A importação está ${imp.status}; inicie outra.`);
    const now = new Date();
    const facts: FactInput[] = [];
    const reasons = new Map<string, number>();
    let rejected = 0;
    rows.forEach((raw, i) => {
      const parsed = ImportRowSchema.safeParse(raw);
      const why = !parsed.success ? `${parsed.error.issues[0]?.path.join(".") || "linha"}: ${parsed.error.issues[0]?.message}` : null;
      const res = parsed.success ? rowToFact(parsed.data, ds, { importId, index: imp.rowsSaved + imp.rowsRejected + i + 1, now }) : null;
      if (res?.ok) { facts.push(res.fact); return; }
      rejected++;
      const r = why ?? (res && !res.ok ? res.reason : "linha inválida");
      reasons.set(r, (reasons.get(r) ?? 0) + 1);
    });
    const reasonList = [...reasons].map(([k, v]) => `${k} (${v}×)`);
    if (rejected === rows.length) {
      await this.deps.imports.addProgress(importId, { saved: 0, rejected, units: 0, reasons: reasonList });
      return { saved: 0, rejected, reasons: reasonList };
    }
    try {
      const expires = new Date(now.getTime() + CSV_COVERAGE_YEARS * 365 * 86_400_000);
      const r = await this.deps.data.importFacts(facts, { sourceId: s.id, importId, dataset: ds, expiresAt: expires });
      const unknown = r.rejected > 0 ? [`${r.rejected} linha(s) com ente não cadastrado`] : [];
      await this.deps.imports.addProgress(importId, { saved: r.saved, rejected: rejected + r.rejected, units: r.units, reasons: [...reasonList, ...unknown] });
      return { saved: r.saved, rejected: rejected + r.rejected, reasons: [...reasonList, ...unknown] };
    } catch (e) {
      await this.deps.imports.finish(importId, "FAILED").catch(() => undefined);
      throw e;
    }
  }

  async finish(slug: string, importId: string, actor: Actor): Promise<ImportRecord> {
    const { s, imp } = await this.owned(slug, importId);
    if (imp.status === "RUNNING") await this.deps.imports.finish(importId, imp.rowsSaved > 0 ? "DONE" : "FAILED");
    // resultados de consulta em cache podem ter sido montados antes do CSV: descarta (a cobertura do CSV é mantida)
    const cleared = await this.deps.cache.clearQueries(s.id);
    const done = (await this.deps.imports.get(importId))!;
    await this.deps.registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "source.csv_import_finished", targetType: "data_source", targetId: slug, details: { importId, status: done.status, saved: done.rowsSaved, rejected: done.rowsRejected, units: done.units, clearedQueries: cleared } });
    return done;
  }

  /** Desfaz: apaga os dados do CSV; as unidades voltam a ser buscadas na API sob demanda. */
  async rollback(slug: string, importId: string, actor: Actor) {
    const { s, imp } = await this.owned(slug, importId);
    if (imp.status === "ROLLED_BACK") throw new AppError("VALIDATION", "Esta importação já foi desfeita.");
    const r = await this.deps.imports.rollback(importId);
    await this.deps.cache.clearQueries(s.id);
    await this.deps.registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "source.csv_import_rolled_back", targetType: "data_source", targetId: slug, details: { importId, ...r } });
    return { ...r, import: (await this.deps.imports.get(importId))! };
  }
}

export { MAX_ROWS_PER_CHUNK };
