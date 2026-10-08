import { METRIC_INFO } from "../core/catalog-info";
import type { IQueryEngine, QueryResult } from "../core/interfaces";
import type { QuerySpec } from "../core/query-spec";
import type { Entity, FiscalMetric, Provenance } from "../core/types";
import { aggregatePoints, breakdown, totalOf, type BreakdownItem } from "./views";

export interface Indicator {
  key: "revenue" | "expense" | "result" | "debt";
  label: string;
  metric: FiscalMetric | null;
  /** concept explicitly shown to the user, so different accounting concepts are never silently mixed */
  concept: string;
  glossary: string;
  value: number | null;
  year: number | null;
  freshness: QueryResult["freshness"] | "unavailable";
  notice: string | null;
  provenance: Provenance[];
}

export interface Overview { entity: { type: string; code: string; name: string; uf: string | null }; year: number; indicators: Indicator[]; generatedAt: string }

type Probe = { result: QueryResult; value: number | null; year: number | null };

/** Tenta o ano pedido e, se a fonte ainda não publicou, o anterior (informando o ano realmente usado). */
async function probe(engine: IQueryEngine, base: Omit<QuerySpec, "year_from" | "year_to">, year: number, pick: (r: QueryResult, y: number) => number | null, tries = 2): Promise<Probe> {
  let last: Probe | null = null;
  for (let i = 0; i < tries; i++) {
    const y = year - i;
    const spec = { ...base, year_from: y, year_to: y } as QuerySpec;
    const result = await engine.execute(spec).catch(() => null);
    if (!result) continue;
    const value = pick(result, y);
    last = { result, value, year: y };
    if (value !== null) return last;
  }
  return last ?? { result: emptyResult(base, year), value: null, year: null };
}

const emptyResult = (base: Omit<QuerySpec, "year_from" | "year_to">, year: number): QueryResult => ({
  spec: { ...base, year_from: year, year_to: year } as QuerySpec, facts: [], provenance: [], freshness: "unavailable",
  notice: "Os dados oficiais não estão disponíveis no momento.", diagnostics: [], generatedAt: new Date().toISOString(),
});

export async function buildOverview(engine: IQueryEngine, entity: Pick<Entity, "type" | "code" | "name" | "uf">, year: number): Promise<Overview> {
  const common = { kind: "breakdown" as const, entity_type: entity.type as QuerySpec["entity_type"], entity_code: entity.code };
  const totalPick = (r: QueryResult, y: number) => totalOf(aggregatePoints(r.facts), y);

  const isUnion = entity.type === "COUNTRY";
  // Para a União, se o SICONFI não tiver o dado, tentamos as fontes federais (Receita por tributo; Transparência por órgão).
  const withFallback = async (first: Probe, base: Omit<QuerySpec, "year_from" | "year_to">) =>
    first.value !== null || !isUnion ? first : await probe(engine, base, year, totalPick).then((p) => (p.value !== null ? p : first));
  const [rev, exp, debt] = await Promise.all([
    probe(engine, { ...common, metric: "REVENUE_REALIZED", category_type: "REVENUE_SOURCE" }, year, totalPick)
      .then((p) => withFallback(p, { ...common, metric: "REVENUE_REALIZED", category_type: "TAX" })),
    probe(engine, { ...common, metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION" }, year, totalPick)
      .then((p) => withFallback(p, { ...common, metric: "EXPENSE_LIQUIDATED", category_type: "AGENCY" })),
    probe(engine, { ...common, kind: "series", metric: "DEBT", category_type: entity.type === "COUNTRY" ? "DEBT_FEDERAL" : "DEBT_CONSOLIDATED" }, year, (r, y) => aggregatePoints(r.facts).find((p) => p.year === y)?.value ?? null),
  ]);

  const sameYear = rev.year !== null && rev.year === exp.year;
  const result = rev.value !== null && exp.value !== null && sameYear ? Math.round((rev.value - exp.value) * 100) / 100 : null;
  const prov = (...ps: Probe[]) => ps.flatMap((p) => p.result.provenance);
  const mk = (i: Omit<Indicator, "freshness" | "notice" | "provenance" | "year" | "value">, p: Probe[], value: number | null, y: number | null): Indicator => ({
    ...i, value, year: y,
    freshness: value === null ? "unavailable" : p.some((x) => x.result.freshness === "stale") ? "stale" : p[0]!.result.freshness,
    notice: p.map((x) => x.result.notice).find(Boolean) ?? (value === null ? "Dado oficial ainda não disponível para este período." : null),
    provenance: prov(...p),
  });
  return {
    entity: { type: entity.type, code: entity.code, name: entity.name, uf: entity.uf },
    year,
    generatedAt: new Date().toISOString(),
    indicators: [
      mk({ key: "revenue", label: "Arrecadação", metric: "REVENUE_REALIZED", concept: "Receita orçamentária arrecadada (correntes + capital, exceto intraorçamentárias)", glossary: METRIC_INFO.REVENUE_REALIZED.glossary }, [rev], rev.value, rev.year),
      mk({ key: "expense", label: "Despesas", metric: "EXPENSE_LIQUIDATED", concept: "Despesa liquidada (serviço/produto entregue)", glossary: METRIC_INFO.EXPENSE_LIQUIDATED.glossary }, [exp], exp.value, exp.year),
      mk({ key: "result", label: "Resultado", metric: null, concept: "Receita arrecadada menos despesa liquidada, no mesmo ano", glossary: "resultado-primario" }, [rev, exp], result, sameYear ? rev.year : null),
      mk({ key: "debt", label: "Dívida", metric: "DEBT", concept: entity.type === "COUNTRY" ? "Dívida Pública Federal" : "Dívida consolidada (último período do ano)", glossary: METRIC_INFO.DEBT.glossary }, [debt], debt.value, debt.year),
    ],
  };
}

export interface Per100 {
  entity: { type: string; code: string; name: string };
  side: "expense" | "revenue";
  lens: string;
  metric: FiscalMetric;
  year: number;
  total: number | null;
  items: BreakdownItem[];
  freshness: QueryResult["freshness"];
  notice: string | null;
  provenance: Provenance[];
}

export async function buildPer100(
  engine: IQueryEngine, entity: Pick<Entity, "type" | "code" | "name">, o: { side: "expense" | "revenue"; lens: "function" | "nature" | "origin" | "tax"; year: number; metric?: FiscalMetric },
): Promise<Per100> {
  const metric: FiscalMetric = o.metric ?? (o.side === "expense" ? "EXPENSE_LIQUIDATED" : "REVENUE_REALIZED");
  const categoryType = { function: "FUNCTION", nature: "EXPENSE_GROUP", origin: "REVENUE_SOURCE", tax: "TAX" }[o.lens];
  let usedYear = o.year;
  let res: QueryResult | null = null;
  let b: ReturnType<typeof breakdown> = { items: [], total: 0 };
  for (let i = 0; i < 2 && b.items.length === 0; i++) {
    usedYear = o.year - i;
    res = await engine.execute({ kind: "breakdown", entity_type: entity.type as QuerySpec["entity_type"], entity_code: entity.code, metric, category_type: categoryType, year_from: usedYear, year_to: usedYear });
    b = breakdown(aggregatePoints(res.facts), usedYear, { lens: o.lens });
  }
  return {
    entity: { type: entity.type, code: entity.code, name: entity.name }, side: o.side, lens: o.lens, metric, year: usedYear,
    total: b.items.length ? b.total : null, items: b.items, freshness: res!.freshness, notice: res!.notice, provenance: res!.provenance,
  };
}
