import type { IDataRepository, ISourceRegistry } from "../core/interfaces";
import { AppError } from "../core/errors";
import type { SourceRuntime } from "./runtime";

/** Carrega o cadastro de entes (União, 27 UFs, 5.570 municípios) uma única vez, com fallback entre fontes. */
export class CatalogService {
  private inflight: Promise<void> | null = null;
  constructor(private data: IDataRepository, private registry: ISourceRegistry, private runtime: SourceRuntime) {}

  async ensure(): Promise<void> {
    if (await this.isLoaded()) return;
    this.inflight ??= this.load().finally(() => { this.inflight = null; });
    return this.inflight;
  }

  /** Cadastro de órgãos do SIAFI (Portal da Transparência): carregado sob demanda, uma vez. */
  async ensureAgencies(): Promise<void> {
    if ((await this.data.countEntities("AGENCY")) >= 100) return;
    this.agenciesInflight ??= this.loadAgencies().finally(() => { this.agenciesInflight = null; });
    return this.agenciesInflight;
  }
  private agenciesInflight: Promise<void> | null = null;

  private async loadAgencies() {
    for (const source of (await this.registry.list()).filter((s) => s.enabled).sort((a, b) => a.priority - b.priority)) {
      const adapter = this.runtime.adapterFor(source);
      if (!adapter?.listAgencies) continue;
      try {
        const ctx = await this.runtime.context(source);
        if (source.requiresAuth && !ctx.credential) continue;
        const list = await adapter.listAgencies(ctx);
        if (list.length) await this.data.upsertGenericEntities(list.map((a) => ({ type: "AGENCY" as const, code: a.code, name: a.name })), source.id);
        return;
      } catch { /* sem catálogo de órgãos agora: a busca por código continua funcionando */ }
    }
  }

  private async isLoaded() {
    return (await this.data.countEntities("MUNICIPALITY")) >= 5000 && (await this.data.countEntities("STATE")) >= 27;
  }

  private async load() {
    const sources = (await this.registry.list()).filter((s) => s.enabled).sort((a, b) => a.priority - b.priority);
    const errors: string[] = [];
    for (const source of sources) {
      const adapter = this.runtime.adapterFor(source);
      if (!adapter?.listEntities) continue;
      try {
        const ctx = await this.runtime.context(source);
        const entities = await adapter.listEntities(ctx);
        if (entities.filter((e) => e.type === "MUNICIPALITY").length < 5000) throw new AppError("BAD_RESPONSE", `${source.slug}: catálogo incompleto (${entities.length} entes)`);
        const n = await this.data.upsertEntities(entities, source.id);
        await this.registry.recordHealth(source.id, { status: "ONLINE", lastSuccessAt: new Date(), lastSyncAt: new Date(), lastError: null });
        await this.registry.audit({ actorId: null, actorEmail: "system", action: "catalog.loaded", targetType: "data_source", targetId: source.slug, details: { entities: n } });
        return;
      } catch (e) {
        errors.push(`${source.slug}: ${e instanceof Error ? e.message : String(e)}`);
        await this.registry.recordHealth(source.id, { lastFailureAt: new Date(), lastError: errors.at(-1) ?? null });
      }
    }
    throw new AppError("SOURCE_UNAVAILABLE", `Cadastro de entes indisponível. ${errors.join(" | ")}`);
  }
}
