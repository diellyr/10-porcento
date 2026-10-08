import type { QueryResult } from "../core/interfaces";
import { aggregatePoints, totalOf } from "./views";

/** Visão pública de um QueryResult: sem diagnósticos técnicos, com pontos já agregados. */
export function toPublic(r: QueryResult, entity?: { name: string; uf: string | null }, opts: { includePoints?: boolean } = {}) {
  const points = aggregatePoints(r.facts);
  const years = [...new Set(points.map((p) => p.year))].sort((a, b) => a - b);
  const totals = years.map((year) => ({ year, value: totalOf(points, year) })).filter((t): t is { year: number; value: number } => t.value !== null);
  return {
    spec: r.spec,
    entity: entity ?? null,
    points: opts.includePoints === false ? [] : points,
    /** total por ano quando a categoria consultada é uma partição exclusiva (funções, receitas de nível 1…) */
    totals,
    freshness: r.freshness,
    notice: r.notice,
    provenance: r.provenance,
    generatedAt: r.generatedAt,
  };
}

export const isComplete = (r: QueryResult) => r.freshness === "fresh" || r.freshness === "cached";
