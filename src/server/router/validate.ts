import { AppError } from "../core/errors";
import type { DatasetDef } from "../core/datasets";
import type { FetchUnit } from "../core/interfaces";
import type { FactInput } from "../core/types";

const MAX_ABS = 1e15;
export const MAX_ROWS_PER_UNIT = 4000;

export interface ValidationReport { valid: FactInput[]; dropped: number; reasons: string[] }

/** Valida a resposta normalizada de um adaptador. Linhas inválidas são descartadas e contadas; lote majoritariamente inválido é rejeitado. */
export function validateFacts(facts: FactInput[], unit: FetchUnit, ds: DatasetDef): ValidationReport {
  const valid: FactInput[] = [];
  const reasons = new Map<string, number>();
  const bad = (r: string) => reasons.set(r, (reasons.get(r) ?? 0) + 1);
  for (const f of facts) {
    if (!Number.isFinite(f.value) || Math.abs(f.value) >= MAX_ABS) { bad("valor inválido"); continue; }
    if (f.period_year !== unit.year) { bad("ano divergente do solicitado"); continue; }
    if (f.entity_type !== unit.entity.type || f.entity_code !== unit.entity.code) { bad("ente divergente do solicitado"); continue; }
    if (!ds.metrics.includes(f.metric)) { bad(`métrica ${f.metric} fora do dataset`); continue; }
    if (f.category_type && !ds.categoryTypes.includes(f.category_type)) { bad(`categoria ${f.category_type} fora do dataset`); continue; }
    if (f.metric === "BENEFICIARIES" && (f.unit !== "COUNT" || f.value < 0)) { bad("beneficiários inválidos"); continue; }
    if (f.metric !== "BENEFICIARIES" && f.unit === "COUNT") { bad("unidade COUNT em métrica monetária"); continue; }
    valid.push({ ...f, value: Math.round(f.value * 100) / 100 });
  }
  if (facts.length > 0 && valid.length / facts.length < 0.5) {
    throw new AppError("BAD_RESPONSE", `validação rejeitou ${facts.length - valid.length}/${facts.length} linhas (${[...reasons].map(([k, v]) => `${k}: ${v}`).join("; ")})`);
  }
  return { valid, dropped: facts.length - valid.length, reasons: [...reasons].map(([k, v]) => `${k}: ${v}`) };
}

/**
 * Política de persistência: dedup no lote, e limite de linhas por unidade.
 * Acima do limite agregamos para o que é útil (níveis superiores) em vez de gravar tudo.
 */
export function applyPersistencePolicy(facts: FactInput[]): { rows: FactInput[]; note: string | null } {
  const seen = new Set<string>();
  let rows = facts.filter((f) => {
    const k = [f.metric, f.category_type, f.category_code, f.related_code, f.period_type, f.period_year, f.period_number, f.source_record_id].join("|");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (rows.length <= MAX_ROWS_PER_UNIT) return { rows, note: null };
  const before = rows.length;
  rows = rows.filter((f) => f.category_type !== "SUBFUNCTION" && !(f.category_type === "REVENUE_SOURCE" && (f.category_code?.split(".").filter((g) => !/^0+$/.test(g)).length ?? 9) > 2));
  if (rows.length > MAX_ROWS_PER_UNIT) rows = [...rows].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, MAX_ROWS_PER_UNIT);
  return { rows, note: `unidade grande (${before} linhas): persistidas apenas ${rows.length} (níveis agregados / maiores valores)` };
}
