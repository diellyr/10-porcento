import type {
  ConnectionTestResult, Entity, EntityRef, EntityType, Fact, FactInput, Provenance, SourceDefinition, SourceRecord,
} from "./types";
import type { DatasetDef } from "./datasets";
import type { QuerySpec } from "./query-spec";
import type { RankingData, RankingQuery } from "./ranking";
import type { ContractFetchQuery, ContractRecord, StoredContract } from "./contracts";

/* ───────────── Fontes governamentais (adaptadores) ───────────── */

export interface FetchContext {
  source: SourceRecord;
  /** Segredo já decifrado — existe só no servidor, só durante a chamada. */
  credential: string | null;
  signal?: AbortSignal;
  /** Cada requisição HTTP real deve ser registrada aqui (log + rate limit). */
  http: HttpClient;
  now: Date;
}

export interface FetchUnit {
  dataset: string;
  entity: EntityRef & { name?: string };
  year: number;
  periodNumber: number;
}

export interface FetchResult {
  facts: FactInput[];
  recordsReceived: number;
  /** Linhas recebidas que o parser não soube interpretar (nunca chutamos valores). */
  skipped: number;
  sourceUpdatedAt?: string | null;
  endpoint: string;
  /** Status HTTP real do download que originou os fatos (ex.: 200) — preservado nos logs mesmo se a importação for rejeitada. */
  httpStatus?: number;
  /**
   * A fonte só conseguiu entregar parte da unidade (ex.: limite de requisições antes de consultar todos os órgãos).
   * Os fatos recebidos são salvos, mas a cobertura NÃO é marcada como completa: a unidade continua pendente e o resultado
   * é apresentado como parcial — nunca como total.
   */
  incomplete?: { done: number; total: number; reason: string };
}

export interface HttpRequest {
  url: string;
  headers?: Record<string, string>;
  method?: "GET" | "HEAD";
  /** nome lógico do endpoint para logs (sem segredos) */
  label: string;
  /** codificação do corpo (arquivos CSV legados do governo costumam ser latin1) */
  encoding?: "utf-8" | "latin1";
  /** limite de bytes aceitos (proteção contra arquivos gigantes) */
  maxBytes?: number;
}
export interface HttpResponse {
  status: number;
  text: string;
  latencyMs: number;
}
export interface HttpClient {
  request(req: HttpRequest): Promise<HttpResponse>;
}

export interface IGovernmentSource {
  readonly definition: SourceDefinition;
  readonly adapterKey: string;
  /** modelo reutilizável por fontes criadas no painel: não é cadastrado automaticamente */
  readonly template?: boolean;
  /** datasets que este adaptador sabe buscar */
  readonly datasets: readonly string[];
  testConnection(ctx: FetchContext): Promise<ConnectionTestResult>;
  /** Retorna fatos já normalizados (ainda não validados nem persistidos). */
  fetchUnit(unit: FetchUnit, ctx: FetchContext): Promise<FetchResult>;
  /** Catálogo de entes (estados/municípios) — opcional. */
  listEntities?(ctx: FetchContext): Promise<EntityCandidate[]>;
  /** Contratos públicos (somente pessoa jurídica) — opcional. */
  searchContracts?(q: ContractFetchQuery, ctx: FetchContext): Promise<ContractSearchResult>;
  /** Cadastro de órgãos (código + nome) — opcional. */
  listAgencies?(ctx: FetchContext): Promise<Array<{ code: string; name: string }>>;
  /** Descoberta de datasets (catálogo de dados abertos) — opcional. */
  searchCatalog?(query: string, ctx: FetchContext): Promise<CatalogItem[]>;
}

export interface ContractSearchResult {
  records: ContractRecord[];
  recordsReceived: number;
  /** linhas ignoradas: pessoa física, sem id/valor/data… */
  skipped: number;
  /** atingiu o teto de páginas: pode haver mais contratos na fonte */
  truncated: boolean;
  endpoint: string;
}

export interface CatalogEntityInput {
  type: "AGENCY" | "SUPPLIER" | "CONTRACT";
  code: string;
  name: string;
  attributes?: Record<string, unknown>;
}

export interface CatalogItem {
  id: string; title: string; description: string | null; organization: string | null; url: string; formats: string[];
}

export interface EntityCandidate {
  type: "COUNTRY" | "STATE" | "MUNICIPALITY";
  code: string;
  name: string;
  uf: string | null;
  population: number | null;
  parentCode: string | null;
  cnpj?: string | null;
}

/* ───────────── Repositórios ───────────── */

export interface UpsertSummary {
  received: number; inserted: number; updated: number; unchanged: number; rejected: number;
}

export interface IDataRepository {
  findEntity(ref: EntityRef): Promise<Entity | null>;
  searchEntities(query: string, types?: EntityRef["type"][], limit?: number): Promise<Entity[]>;
  upsertEntities(candidates: EntityCandidate[], sourceId: string): Promise<number>;
  countEntities(type: EntityType): Promise<number>;
  listEntities(type: EntityRef["type"], opts: { uf?: string; limit: number; afterCode?: string }): Promise<Entity[]>;
  /** Entidades genéricas (órgão, fornecedor, contrato) com atributos; idempotente por (tipo, código). */
  upsertGenericEntities(items: CatalogEntityInput[], sourceId: string): Promise<number>;
  queryContracts(f: { supplierCnpj?: string; agencyCode?: string; year?: number; limit: number; beforeId?: number }): Promise<StoredContract[]>;
  /** Ranking sobre dados já salvos, com cobertura (entes com dado × entes no cadastro). */
  rankEntities(q: RankingQuery & { category_type: string }): Promise<RankingData>;
  upsertFacts(facts: FactInput[], sourceId: string): Promise<UpsertSummary>;
  /**
   * Importação de CSV: SUBSTITUI os fatos das unidades (ente × ano × período) presentes no lote — dentro das métricas e
   * categorias do dataset, e só da mesma fonte — e marca a cobertura dessas unidades como OK por longo prazo.
   * As unidades nunca podem ser divididas entre chamadas (a cobertura é gravada por unidade).
   */
  importFacts(facts: FactInput[], o: ImportFactsOptions): Promise<ImportFactsResult>;
  queryFacts(spec: QuerySpec): Promise<Fact[]>;
}

export interface ImportFactsOptions { sourceId: string; importId: string; dataset: DatasetDef; expiresAt: Date }
export interface ImportFactsResult { saved: number; rejected: number; units: number }

export type ImportStatus = "RUNNING" | "DONE" | "FAILED" | "ROLLED_BACK";
export interface ImportRecord {
  id: string; sourceId: string; dataset: string; filename: string; status: ImportStatus;
  rowsTotal: number; rowsSaved: number; rowsRejected: number; units: number; rejectReasons: string[];
  createdByEmail: string | null; createdAt: string; finishedAt: string | null;
}

/** Histórico das importações de CSV por fonte. */
export interface IImportRepository {
  create(i: { sourceId: string; dataset: string; filename: string; rowsTotal: number; actorId: string | null; actorEmail: string | null }): Promise<ImportRecord>;
  get(id: string): Promise<ImportRecord | null>;
  addProgress(id: string, p: { saved: number; rejected: number; units: number; reasons: string[] }): Promise<void>;
  finish(id: string, status: "DONE" | "FAILED"): Promise<void>;
  list(sourceId: string, limit: number): Promise<ImportRecord[]>;
  /** Apaga os fatos e a cobertura criados pela importação (as unidades voltam a ser buscadas na API) e marca ROLLED_BACK. */
  rollback(id: string): Promise<{ facts: number; coverage: number }>;
}

export interface CoverageKey {
  entityId: string; sourceId: string; dataset: string; year: number; periodNumber: number;
}
export interface CoverageEntry extends CoverageKey { status: "OK" | "EMPTY"; fetchedAt: string; expiresAt: string; recordCount: number }

export interface CachedQuery {
  queryHash: string; queryType: string; expiresAt: string; createdAt: string; sourceId: string | null; reference?: Record<string, unknown>;
}

export interface ICacheRepository {
  getQuery(hash: string): Promise<CachedQuery | null>;
  putQuery(q: { hash: string; type: string; normalized: QuerySpec | Record<string, unknown>; sourceId: string | null; recordCount: number; expiresAt: Date; reference: Record<string, unknown> }): Promise<void>;
  touchQuery(hash: string): Promise<void>;
  /** Cobertura (de qualquer fonte) das unidades pedidas de UM ente. */
  getCoverage(entityId: string, keys: Array<{ dataset: string; year: number; periodNumber: number }>): Promise<CoverageEntry[]>;
  putCoverage(entry: Omit<CoverageEntry, "fetchedAt">): Promise<void>;
  topQueries(sourceId: string, limit: number): Promise<QuerySpec[]>;
  clearBySource(sourceId: string): Promise<{ queries: number; coverage: number }>;
  /** Só os resultados de consulta em cache da fonte (e os resolvidos sem fonte), mantendo a cobertura: usado após importar/desfazer CSV. */
  clearQueries(sourceId: string): Promise<number>;
  clearAll(): Promise<{ queries: number; coverage: number }>;
}

export interface RequestLog {
  sourceId: string | null;
  queryType?: string | null;
  endpoint: string;
  method?: string;
  parametersHash?: string | null;
  startedAt: Date;
  durationMs: number | null;
  httpStatus?: number | null;
  recordsReceived?: number;
  recordsSaved?: number;
  cacheHit?: boolean;
  success: boolean;
  errorType?: string | null;
  errorMessage?: string | null;
  isTest?: boolean;
}

export interface SourceHealthPatch {
  status?: SourceRecord["status"];
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  lastSyncAt?: Date;
  lastRequestAt?: Date;
  lastLatencyMs?: number | null;
  lastHttpStatus?: number | null;
  lastError?: string | null;
}

export interface NewSource {
  name: string; slug: string; description: string | null; provider: string; category: string; sourceType: SourceRecord["sourceType"];
  baseUrl: string; documentationUrl: string | null; authType: SourceRecord["authType"]; requiresAuth: boolean; priority: number;
  rateLimitPerMinute: number; cacheTtlMinutes: number; adapterKey: string; config: Record<string, unknown>;
}

export interface ISourceRegistry {
  ensureSources(defs: SourceDefinition[]): Promise<void>;
  create(src: NewSource): Promise<SourceRecord>;
  list(): Promise<SourceRecord[]>;
  getBySlug(slug: string): Promise<SourceRecord | null>;
  update(id: string, patch: Partial<Pick<SourceRecord, "enabled" | "priority" | "cacheTtlMinutes" | "rateLimitPerMinute" | "baseUrl" | "config" | "status">> & { disabledBy?: string | null; disabledAt?: Date | null }): Promise<SourceRecord>;
  recordHealth(id: string, patch: SourceHealthPatch): Promise<void>;
  getCredential(sourceId: string): Promise<{ plaintext: string; last4: string } | null>;
  getCredentialHint(sourceId: string): Promise<{ last4: string; updatedAt: string } | null>;
  setCredential(sourceId: string, plaintext: string, actorId: string | null): Promise<{ last4: string }>;
  clearCredential(sourceId: string): Promise<void>;
  logRequest(log: RequestLog): Promise<void>;
  listLogs(sourceId: string, opts: { limit: number; beforeId?: number; onlyErrors?: boolean }): Promise<Array<RequestLog & { id: number }>>;
  /** requisições externas na última janela (para rate limit global entre instâncias) */
  countExternalCalls(sourceId: string, since: Date): Promise<number>;
  audit(entry: { actorId: string | null; actorEmail: string | null; action: string; targetType?: string; targetId?: string; details?: Record<string, unknown> }): Promise<void>;
  listAudit(limit: number): Promise<Array<{ id: number; actorEmail: string | null; action: string; targetType: string | null; targetId: string | null; details: Record<string, unknown>; createdAt: string }>>;
}

export interface UserProfile { id: string; email: string | null; role: "user" | "admin"; createdAt: string }

export interface IAnalyticsRepository {
  dataOverview(): Promise<Record<string, unknown>>;
  listUsers(limit: number): Promise<UserProfile[]>;
  getRole(userId: string): Promise<"user" | "admin" | null>;
  setRole(userId: string, role: "user" | "admin"): Promise<void>;
  countAdmins(): Promise<number>;
  /** Poda logs antigos, cache de consulta expirado e cobertura vazia expirada (dados fiscais nunca são tocados). */
  purgeOld(days: number): Promise<{ logs: number; cachedQueries: number; emptyCoverage: number }>;
  dashboardStats(since: Date): Promise<Record<string, unknown>>;
  dbUsage(limitBytes: number): Promise<{ databaseBytes: number; limitBytes: number; percent: number; facts: number; entities: number; logs: number }>;
}

/* ───────────── Motor de consultas (contrato consumido pela API/frontend) ───────────── */

export type Freshness = "fresh" | "cached" | "stale" | "partial" | "unavailable";

export interface QueryResult {
  spec: QuerySpec;
  facts: Fact[];
  provenance: Provenance[];
  freshness: Freshness;
  /** Texto seguro para o cidadão (nunca erro técnico cru). */
  notice: string | null;
  /** Detalhes técnicos — a API só os inclui para administradores. */
  diagnostics: string[];
  generatedAt: string;
}

export interface IQueryEngine {
  execute(spec: QuerySpec, opts?: { forceRefresh?: boolean; sourceSlug?: string }): Promise<QueryResult>;
}

export type { DatasetDef, Provenance };
