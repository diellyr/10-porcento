import { z } from "zod";

export const RANKING_METRICS = ["REVENUE_REALIZED", "EXPENSE_COMMITTED", "EXPENSE_LIQUIDATED", "EXPENSE_PAID"] as const;
export const RANKING_ORDERS = ["value_desc", "value_asc", "change_desc", "change_asc"] as const;

export const RankingQuerySchema = z
  .object({
    entity_type: z.enum(["STATE", "MUNICIPALITY"]),
    metric: z.enum(RANKING_METRICS),
    category_type: z.string().regex(/^[A-Z_]{2,32}$/).optional(),
    category_code: z.string().regex(/^[\w.\-]{1,40}$/).optional(),
    year: z.coerce.number().int().min(2000).max(new Date().getUTCFullYear()),
    compare_year: z.coerce.number().int().min(2000).optional(),
    uf: z.string().regex(/^[A-Z]{2}$/).optional(),
    order: z.enum(RANKING_ORDERS).default("value_desc"),
    per_capita: z.preprocess((v) => v === true || v === "true" || v === "1", z.boolean()).default(false),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine((q, ctx) => {
    if (q.order.startsWith("change") && q.compare_year === undefined) ctx.addIssue({ code: "custom", path: ["compare_year"], message: "Informe o ano de comparação para ordenar por variação." });
    if (q.compare_year !== undefined && q.compare_year >= q.year) ctx.addIssue({ code: "custom", path: ["compare_year"], message: "O ano de comparação deve ser anterior ao ano analisado." });
    if (q.uf && q.entity_type === "STATE") ctx.addIssue({ code: "custom", path: ["uf"], message: "UF só se aplica a municípios." });
  });

export type RankingQuery = z.infer<typeof RankingQuerySchema>;

/** Categoria padrão: a partição que soma o total (função para despesa; receitas de nível 1 para receita). */
export function withDefaultCategory(q: RankingQuery): RankingQuery & { category_type: string } {
  return { ...q, category_type: q.category_type ?? (q.metric === "REVENUE_REALIZED" ? "REVENUE_SOURCE" : "FUNCTION") };
}

export interface RankingRow { code: string; name: string; uf: string | null; population: number | null; value: number; previous: number | null; changePct: number | null }
export interface RankingData { items: RankingRow[]; covered: number; total: number }
