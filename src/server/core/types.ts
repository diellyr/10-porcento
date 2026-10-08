/** Contratos de domínio do Brasil Fiscal. Nada aqui conhece Supabase, HTTP ou React. */

export const ENTITY_TYPES = [
  "COUNTRY", "STATE", "MUNICIPALITY", "AGENCY", "PUBLIC_ENTITY", "FUNCTION", "SUBFUNCTION",
  "PROGRAM", "ACTION", "SUPPLIER", "TAX", "BENEFIT", "CONTRACT", "BID", "TRANSFER",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Conceitos contábeis que NÃO podem ser misturados. */
export const FISCAL_METRICS = [
  "REVENUE_FORECAST", "REVENUE_REALIZED", "EXPENSE_BUDGETED", "EXPENSE_COMMITTED", "EXPENSE_LIQUIDATED",
  "EXPENSE_PAID", "TRANSFER", "DEBT", "BENEFIT_VALUE", "BENEFICIARIES", "CONTRACT_VALUE", "FISCAL_INDICATOR",
] as const;
export type FiscalMetric = (typeof FISCAL_METRICS)[number];

export type SourceType = "REST_API" | "CSV" | "JSON" | "XML" | "DATASET_DOWNLOAD";
export type AuthType = "NONE" | "API_KEY_HEADER" | "API_KEY_QUERY" | "BEARER_TOKEN";
export type SourceStatus = "UNKNOWN" | "ONLINE" | "DEGRADED" | "OFFLINE" | "DISABLED" | "NOT_CONFIGURED";
export type PeriodType = "YEAR" | "SEMESTER" | "QUARTER" | "BIMESTER" | "MONTH";

export interface EntityRef {
  type: EntityType;
  /** Código oficial: IBGE (UF 2 dígitos, município 7), CNPJ, código SIAFI... */
  code: string;
}

export interface Entity extends EntityRef {
  id: string;
  name: string;
  uf: string | null;
  population: number | null;
  parentId: string | null;
}

/** Linha normalizada produzida por adaptadores (entra no banco via upsert_fiscal_facts). */
export interface FactInput {
  entity_type: EntityType;
  entity_code: string;
  related_type?: EntityType | null;
  related_code?: string | null;
  related_name?: string | null;
  metric: FiscalMetric;
  category_type?: string | null;
  category_code?: string | null;
  category_label?: string | null;
  period_type: PeriodType;
  period_year: number;
  period_number: number;
  value: number;
  unit: "BRL" | "COUNT" | "PERCENT";
  source_dataset: string;
  source_record_id?: string | null;
  source_url?: string | null;
  source_updated_at?: string | null;
}

/** Fato persistido, como o frontend o recebe. */
export interface Fact {
  entityCode: string;
  entityType: EntityType;
  relatedCode: string | null;
  relatedName: string | null;
  metric: FiscalMetric;
  categoryType: string | null;
  categoryCode: string | null;
  categoryLabel: string | null;
  periodType: PeriodType;
  year: number;
  periodNumber: number;
  value: number;
  unit: "BRL" | "COUNT" | "PERCENT";
  sourceSlug: string;
  sourceDataset: string | null;
  sourceUrl: string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
}

export interface SourceRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  provider: string;
  category: string;
  sourceType: SourceType;
  baseUrl: string;
  documentationUrl: string | null;
  authType: AuthType;
  requiresAuth: boolean;
  enabled: boolean;
  priority: number;
  rateLimitPerMinute: number;
  cacheTtlMinutes: number;
  status: SourceStatus;
  parserVersion: string;
  adapterKey: string;
  config: Record<string, unknown>;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastSyncAt: string | null;
  lastRequestAt: string | null;
  lastLatencyMs: number | null;
  lastHttpStatus: number | null;
  lastError: string | null;
  disabledAt: string | null;
  disabledBy: string | null;
}

/** Metadados estáticos de uma integração, usados para cadastrar a fonte no Source Registry. */
export interface SourceDefinition {
  slug: string;
  name: string;
  description: string;
  provider: string;
  category: string;
  sourceType: SourceType;
  baseUrl: string;
  documentationUrl: string;
  authType: AuthType;
  requiresAuth: boolean;
  priority: number;
  rateLimitPerMinute: number;
  cacheTtlMinutes: number;
  /** Caminho (relativo à base_url) usado em "Testar conexão". */
  healthPath: string;
  config?: Record<string, unknown>;
}

export interface ConnectionTestResult {
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  message: string;
  /** Dado técnico: aparece só no painel administrativo. */
  technical?: string;
}

export interface Provenance {
  sourceSlug: string;
  sourceName: string;
  provider: string;
  dataset: string | null;
  fetchedAt: string;
  sourceUpdatedAt: string | null;
  url: string | null;
  documentationUrl: string | null;
  periodLabel: string;
}
