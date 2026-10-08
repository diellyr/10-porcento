import { SupabaseAnalyticsRepository, SupabaseCacheRepository, SupabaseDataRepository } from "./repositories/supabase/data";
import { serviceClient } from "./repositories/supabase/client";
import { SupabaseImportRepository } from "./repositories/supabase/imports";
import { SupabaseSourceRegistry } from "./repositories/supabase/source-registry";
import { QueryRouter } from "./router/query-router";
import { SourceRuntime } from "./router/runtime";
import { ContractService } from "./services/contracts";
import { ImportService } from "./services/imports";
import { RankingService } from "./services/rankings";
import { SourceAdminService } from "./services/source-admin";
import { buildDevContainer, DEV_FIXTURES_ENABLED } from "./dev/fixtures";

/**
 * Composition root. É o ÚNICO lugar que conhece as implementações concretas (Supabase).
 * Para evoluir (Redis na frente do cache, ClickHouse para analytics, worker externo), troca-se a
 * implementação aqui — o contrato HTTP consumido pelo frontend não muda.
 */
export function buildContainer() {
  const db = serviceClient();
  const registry = new SupabaseSourceRegistry(db);
  const data = new SupabaseDataRepository(db);
  const cache = new SupabaseCacheRepository(db);
  const analytics = new SupabaseAnalyticsRepository(db);
  const runtime = new SourceRuntime({ registry });
  const router = new QueryRouter({ data, cache, registry, runtime });
  const admin = new SourceAdminService(registry, runtime, cache, router);
  const contracts = new ContractService({ data, cache, registry, runtime, catalog: router.catalog, ensureRegistry: () => router.ensureRegistry() });
  const rankings = new RankingService(data);
  const imports = new ImportService({ registry, imports: new SupabaseImportRepository(db), data, cache, runtime, ensureRegistry: () => router.ensureRegistry() });
  return { db, registry, data, cache, analytics, runtime, router, admin, contracts, rankings, imports };
}

export type Container = ReturnType<typeof buildContainer>;

/** Fixtures só em desenvolvimento (BRASIL_FISCAL_DEV_FIXTURES=1); jamais em produção. */
const make = (): Container => (DEV_FIXTURES_ENABLED() ? (buildDevContainer() as unknown as Container) : buildContainer());

const g = globalThis as unknown as { __bf?: Container };
export function container(): Container {
  return (g.__bf ??= make());
}
