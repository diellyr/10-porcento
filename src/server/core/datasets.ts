import type { EntityType, FiscalMetric, PeriodType } from "./types";

/**
 * Catálogo de datasets: a menor unidade de busca em fontes externas é
 * (dataset × ente × ano × período). É também a unidade de cobertura (data_coverage),
 * o que permite reaproveitar dados entre consultas diferentes.
 */
export interface DatasetDef {
  id: string;
  label: string;
  description: string;
  metrics: FiscalMetric[];
  categoryTypes: string[];
  /** Quando definido, o dataset só atende consultas cujo category_code esteja na lista (ex.: BPC × Bolsa Família). */
  categoryCodes?: string[];
  entityTypes: EntityType[];
  periodType: PeriodType;
  /** Períodos (1..n) buscados por ano; [0] = ano inteiro. */
  periods: (year: number, now: Date) => number[];
  /** O dado deste ano já pode existir na fonte? Evita consultas inúteis a anos futuros. */
  availableForYear: (year: number, now: Date) => boolean;
}

const whole = () => [0];
const upToLastClosedMonth = (year: number, now: Date) => {
  const last = year < now.getUTCFullYear() ? 12 : now.getUTCMonth(); // mês corrente ainda não fechou
  return Array.from({ length: Math.max(0, last) }, (_, i) => i + 1);
};

export const DATASETS: Record<string, DatasetDef> = {
  "siconfi.dca.receitas": {
    id: "siconfi.dca.receitas",
    label: "Receitas orçamentárias (DCA, Anexo I-C)",
    description: "Receita prevista e realizada por natureza, declarada anualmente por cada ente.",
    metrics: ["REVENUE_FORECAST", "REVENUE_REALIZED"],
    categoryTypes: ["REVENUE_SOURCE"],
    entityTypes: ["COUNTRY", "STATE", "MUNICIPALITY"],
    periodType: "YEAR",
    periods: whole,
    availableForYear: (y, now) => y < now.getUTCFullYear(),
  },
  "siconfi.dca.despesas_funcao": {
    id: "siconfi.dca.despesas_funcao",
    label: "Despesas por função e subfunção (DCA, Anexo I-E)",
    description: "Despesa empenhada, liquidada e paga por função e subfunção de governo.",
    metrics: ["EXPENSE_COMMITTED", "EXPENSE_LIQUIDATED", "EXPENSE_PAID"],
    categoryTypes: ["FUNCTION", "SUBFUNCTION"],
    entityTypes: ["COUNTRY", "STATE", "MUNICIPALITY"],
    periodType: "YEAR",
    periods: whole,
    availableForYear: (y, now) => y < now.getUTCFullYear(),
  },
  "siconfi.dca.despesas_natureza": {
    id: "siconfi.dca.despesas_natureza",
    label: "Despesas por grupo de natureza (DCA, Anexo I-D)",
    description: "Despesa por tipo de gasto: pessoal, juros da dívida, investimentos, amortização e outras.",
    metrics: ["EXPENSE_COMMITTED", "EXPENSE_LIQUIDATED", "EXPENSE_PAID"],
    categoryTypes: ["EXPENSE_GROUP"],
    entityTypes: ["COUNTRY", "STATE", "MUNICIPALITY"],
    periodType: "YEAR",
    periods: whole,
    availableForYear: (y, now) => y < now.getUTCFullYear(),
  },
  "siconfi.rgf.divida": {
    id: "siconfi.rgf.divida",
    label: "Dívida consolidada (RGF, Anexo 02)",
    description: "Dívida consolidada e dívida consolidada líquida ao fim de cada quadrimestre.",
    metrics: ["DEBT"],
    categoryTypes: ["DEBT_CONSOLIDATED", "DEBT_NET_CONSOLIDATED"],
    entityTypes: ["COUNTRY", "STATE", "MUNICIPALITY"],
    periodType: "QUARTER", // quadrimestre armazenado em period_number (1..3)
    periods: () => [1, 2, 3],
    availableForYear: (y, now) => y <= now.getUTCFullYear(),
  },
  "transparencia.despesas_orgao": {
    id: "transparencia.despesas_orgao",
    label: "Despesas da União por órgão",
    description: "Despesa empenhada, liquidada e paga por órgão do governo federal.",
    metrics: ["EXPENSE_COMMITTED", "EXPENSE_LIQUIDATED", "EXPENSE_PAID"],
    categoryTypes: ["AGENCY"],
    entityTypes: ["COUNTRY"],
    periodType: "YEAR",
    periods: whole,
    availableForYear: (y, now) => y <= now.getUTCFullYear(),
  },
  "transparencia.bolsa_familia": {
    id: "transparencia.bolsa_familia",
    label: "Bolsa Família por município",
    description: "Valor repassado e número de beneficiários por mês (dados agregados, sem identificação pessoal).",
    metrics: ["BENEFIT_VALUE", "BENEFICIARIES"],
    categoryTypes: ["BENEFIT"],
    categoryCodes: ["BOLSA_FAMILIA"],
    entityTypes: ["MUNICIPALITY"],
    periodType: "MONTH",
    periods: upToLastClosedMonth,
    availableForYear: (y, now) => y <= now.getUTCFullYear(),
  },
  "transparencia.bpc": {
    id: "transparencia.bpc",
    label: "BPC por município",
    description: "Benefício de Prestação Continuada: valor e número de beneficiários por mês (agregado).",
    metrics: ["BENEFIT_VALUE", "BENEFICIARIES"],
    categoryTypes: ["BENEFIT"],
    categoryCodes: ["BPC"],
    entityTypes: ["MUNICIPALITY"],
    periodType: "MONTH",
    periods: upToLastClosedMonth,
    availableForYear: (y, now) => y <= now.getUTCFullYear(),
  },
  "receita.arrecadacao": {
    id: "receita.arrecadacao",
    label: "Arrecadação federal por tributo",
    description: "Arrecadação das receitas federais por tributo (dataset configurável).",
    metrics: ["REVENUE_REALIZED"],
    categoryTypes: ["TAX"],
    entityTypes: ["COUNTRY", "STATE"],
    periodType: "YEAR",
    periods: whole,
    availableForYear: (y, now) => y <= now.getUTCFullYear(),
  },
  "tesouro.divida_publica": {
    id: "tesouro.divida_publica",
    label: "Dívida Pública Federal",
    description: "Estoque da Dívida Pública Federal (dataset configurável).",
    metrics: ["DEBT"],
    categoryTypes: ["DEBT_FEDERAL"],
    entityTypes: ["COUNTRY"],
    periodType: "YEAR",
    periods: whole,
    availableForYear: (y, now) => y <= now.getUTCFullYear(),
  },
  "tesouro.resultado_fiscal": {
    id: "tesouro.resultado_fiscal",
    label: "Resultado do Tesouro Nacional",
    description: "Resultado primário e demais indicadores fiscais da União (dataset configurável).",
    metrics: ["FISCAL_INDICATOR"],
    categoryTypes: ["FISCAL_RESULT"],
    entityTypes: ["COUNTRY"],
    periodType: "YEAR",
    periods: whole,
    availableForYear: (y, now) => y <= now.getUTCFullYear(),
  },
};

export function datasetById(id: string): DatasetDef {
  const d = DATASETS[id];
  if (!d) throw new Error(`Dataset desconhecido: ${id}`);
  return d;
}
