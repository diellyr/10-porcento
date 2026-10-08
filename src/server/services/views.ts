import { EXPENSE_GROUPS, FUNCTIONS, METRIC_INFO, REVENUE_ORIGINS } from "../core/catalog-info";
import type { Fact, FiscalMetric } from "../core/types";

/** Ponto agregado: um número por (ano, categoria, relacionado). Fluxos somam; saldos usam o último período. */
export interface Point {
  year: number;
  categoryType: string | null;
  categoryCode: string | null;
  categoryLabel: string | null;
  relatedCode: string | null;
  relatedName: string | null;
  value: number;
  unit: Fact["unit"];
  metric: FiscalMetric;
}

export function aggregatePoints(facts: Fact[]): Point[] {
  const groups = new Map<string, { head: Fact; byPeriod: Map<number, number> }>();
  for (const f of facts) {
    const k = [f.metric, f.year, f.categoryType, f.categoryCode, f.relatedCode].join("|");
    const g = groups.get(k) ?? { head: f, byPeriod: new Map() };
    g.byPeriod.set(f.periodNumber, (g.byPeriod.get(f.periodNumber) ?? 0) + f.value);
    groups.set(k, g);
  }
  const out: Point[] = [];
  for (const { head: f, byPeriod } of groups.values()) {
    const kind = METRIC_INFO[f.metric].kind;
    let value: number;
    if (kind === "flow") value = [...byPeriod.values()].reduce((a, b) => a + b, 0);
    else value = byPeriod.get(Math.max(...byPeriod.keys()))!; // saldo: último período disponível do ano
    out.push({
      year: f.year, categoryType: f.categoryType, categoryCode: f.categoryCode, categoryLabel: f.categoryLabel, relatedCode: f.relatedCode,
      relatedName: f.relatedName, value: Math.round(value * 100) / 100, unit: f.unit, metric: f.metric,
    });
  }
  return out.sort((a, b) => a.year - b.year || String(a.categoryCode).localeCompare(String(b.categoryCode)));
}

const level = (code: string) => {
  let n = 0;
  for (const g of code.split(".")) { if (/^0+$/.test(g)) break; n++; }
  return n;
};

/** Total de despesa = soma das funções (partição exclusiva da despesa). Receita = receitas correntes + de capital (nível 1). */
export function totalOf(points: Point[], year: number): number | null {
  const ps = points.filter((p) => p.year === year);
  const fn = ps.filter((p) => p.categoryType === "FUNCTION");
  if (fn.length) return sum(fn.map((p) => p.value));
  const rev = ps.filter((p) => p.categoryType === "REVENUE_SOURCE" && p.categoryCode && level(p.categoryCode) === 1 && /^[12]\./.test(p.categoryCode));
  if (rev.length) return sum(rev.map((p) => p.value));
  const grp = ps.filter((p) => p.categoryType === "EXPENSE_GROUP");
  if (grp.length) return sum(grp.map((p) => p.value));
  const agency = ps.filter((p) => p.categoryType === "AGENCY");
  if (agency.length) return sum(agency.map((p) => p.value));
  return null;
}
const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

export interface BreakdownItem { code: string; label: string; value: number; share: number; per100: number }

export interface BreakdownOptions { lens: "function" | "nature" | "origin" | "tax" | "agency"; topN?: number }

/**
 * Composição para "R$100": agrupa a lente escolhida, calcula a fatia de cada item e junta o resto em "Outros".
 * Valores negativos nunca entram na base (não faz sentido uma fatia negativa de R$100).
 */
export function breakdown(points: Point[], year: number, o: BreakdownOptions): { items: BreakdownItem[]; total: number } {
  let ps = points.filter((p) => p.year === year && p.value > 0);
  const label = (p: Point) => p.categoryLabel ?? p.categoryCode ?? "—";
  let rows: Array<{ code: string; label: string; value: number }>;
  switch (o.lens) {
    case "function":
      rows = ps.filter((p) => p.categoryType === "FUNCTION").map((p) => ({ code: p.categoryCode!, label: FUNCTIONS[p.categoryCode!] ?? label(p), value: p.value }));
      break;
    case "nature":
      rows = ps.filter((p) => p.categoryType === "EXPENSE_GROUP").map((p) => ({ code: p.categoryCode!, label: EXPENSE_GROUPS[p.categoryCode!] ?? label(p), value: p.value }));
      break;
    case "origin":
      ps = ps.filter((p) => p.categoryType === "REVENUE_SOURCE" && p.categoryCode && level(p.categoryCode) === 2);
      rows = ps.map((p) => ({ code: p.categoryCode!.split(".").slice(0, 2).join("."), label: REVENUE_ORIGINS[p.categoryCode!.split(".").slice(0, 2).join(".")] ?? label(p), value: p.value }));
      break;
    case "tax":
      rows = ps.filter((p) => p.categoryType === "TAX").map((p) => ({ code: p.categoryCode!, label: label(p), value: p.value }));
      break;
    case "agency":
      rows = ps.filter((p) => p.categoryType === "AGENCY").map((p) => ({ code: p.categoryCode!, label: label(p), value: p.value }));
      break;
  }
  const total = sum(rows.map((r) => r.value));
  if (total <= 0) return { items: [], total: 0 };
  rows.sort((a, b) => b.value - a.value);
  const topN = o.topN ?? 8;
  let head = rows.slice(0, topN);
  const rest = rows.slice(topN);
  if (rest.length) head = [...head, { code: "OTHER", label: "Outros", value: sum(rest.map((r) => r.value)) }];
  const items = head.map((r) => ({ ...r, share: r.value / total, per100: Math.round((r.value / total) * 10000) / 100 }));
  return { items, total };
}
