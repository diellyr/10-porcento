import { EXPENSE_GROUPS, FUNCTIONS, REVENUE_ORIGINS } from "@/server/core/catalog-info";
import type { FiscalMetric } from "@/server/core/types";
import type { PlaceValue } from "@/components/place-picker";

export type Subject = "revenue" | "expense" | "debt" | "benefit";

export interface CategoryOption { id: string; label: string; categoryType?: string; categoryCode?: string; scopes?: PlaceValue["type"][]; metric?: FiscalMetric }

export const SUBJECTS: Array<{ id: Subject; label: string }> = [
  { id: "revenue", label: "Receita (arrecadação)" },
  { id: "expense", label: "Despesa" },
  { id: "debt", label: "Dívida" },
  { id: "benefit", label: "Benefício social" },
];

export const STAGES: Array<{ id: FiscalMetric; label: string }> = [
  { id: "EXPENSE_LIQUIDATED", label: "Liquidada" },
  { id: "EXPENSE_PAID", label: "Paga" },
  { id: "EXPENSE_COMMITTED", label: "Empenhada" },
];

/** Categorias oferecidas para cada assunto. O primeiro item é sempre "Todas/total". */
export function categoriesFor(subject: Subject, scope: PlaceValue["type"]): CategoryOption[] {
  switch (subject) {
    case "revenue":
      return [
        { id: "total", label: "Todas (total arrecadado)", categoryType: "REVENUE_SOURCE" },
        ...Object.entries(REVENUE_ORIGINS).map(([k, label]) => ({ id: `rev:${k}`, label: `Origem: ${label}`, categoryType: "REVENUE_SOURCE", categoryCode: `${k}.0.0.00.0.0` })),
        ...(scope === "COUNTRY" ? [{ id: "tax", label: "Por tributo federal (dados da Receita Federal)", categoryType: "TAX" }] : []),
      ];
    case "expense":
      return [
        { id: "total", label: "Todas (total por função)", categoryType: "FUNCTION" },
        ...Object.entries(FUNCTIONS).map(([k, label]) => ({ id: `fn:${k}`, label: `Função: ${label}`, categoryType: "FUNCTION", categoryCode: k })),
        ...Object.entries(EXPENSE_GROUPS).map(([k, label]) => ({ id: `gr:${k}`, label: `Tipo de gasto: ${label}`, categoryType: "EXPENSE_GROUP", categoryCode: k })),
      ];
    case "debt":
      return scope === "COUNTRY"
        ? [{ id: "fed", label: "Dívida Pública Federal", categoryType: "DEBT_FEDERAL" }]
        : [
            { id: "dc", label: "Dívida consolidada", categoryType: "DEBT_CONSOLIDATED", categoryCode: "DC" },
            { id: "dcl", label: "Dívida consolidada líquida", categoryType: "DEBT_NET_CONSOLIDATED", categoryCode: "DCL" },
          ];
    case "benefit":
      return [
        { id: "bf", label: "Bolsa Família", categoryType: "BENEFIT", categoryCode: "BOLSA_FAMILIA" },
        { id: "bpc", label: "BPC", categoryType: "BENEFIT", categoryCode: "BPC" },
      ];
  }
}

export function metricFor(subject: Subject, stage: FiscalMetric, benefitMeasure: "value" | "people" = "value"): FiscalMetric {
  if (subject === "revenue") return "REVENUE_REALIZED";
  if (subject === "expense") return stage;
  if (subject === "debt") return "DEBT";
  return benefitMeasure === "value" ? "BENEFIT_VALUE" : "BENEFICIARIES";
}

export function buildQuery(o: { subject: Subject; stage: FiscalMetric; benefitMeasure?: "value" | "people"; place: PlaceValue; cat: CategoryOption; from: number; to: number; includePoints?: boolean }): string {
  const q = new URLSearchParams({
    kind: "series", entity_type: o.place.type, entity_code: o.place.code, metric: metricFor(o.subject, o.stage, o.benefitMeasure),
    year_from: String(o.from), year_to: String(o.to),
  });
  if (o.cat.categoryType) q.set("category_type", o.cat.categoryType);
  if (o.cat.categoryCode) q.set("category_code", o.cat.categoryCode);
  if (o.includePoints === false) q.set("include_points", "0");
  return `/api/v1/query?${q}`;
}

/** Escapa um campo CSV (inclui proteção contra injeção de fórmulas em planilhas). */
export function csvCell(v: string | number | null): string {
  let s = v === null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
