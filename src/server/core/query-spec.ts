import { z } from "zod";
import { ENTITY_TYPES, FISCAL_METRICS } from "./types";
import { hashOf } from "./normalize";

export const MAX_YEAR_SPAN = 12;
export const MIN_YEAR = 2000;

const currentYear = () => new Date().getUTCFullYear();

export const QuerySpecSchema = z
  .object({
    kind: z.enum(["series", "breakdown"]),
    entity_type: z.enum(["COUNTRY", "STATE", "MUNICIPALITY"]),
    entity_code: z.string().regex(/^\d{1,7}$/, "código IBGE inválido"),
    metric: z.enum(FISCAL_METRICS),
    category_type: z.string().regex(/^[A-Z_]{2,32}$/).optional(),
    category_code: z.string().regex(/^[\w.\-]{1,40}$/).optional(),
    /** Filtra categorias cujo código começa por este prefixo (ex.: subfunções da função "10"). */
    category_prefix: z.string().regex(/^[\w.\-]{1,40}$/).optional(),
    year_from: z.number().int().min(MIN_YEAR),
    year_to: z.number().int(),
  })
  .superRefine((s, ctx) => {
    if (s.year_to < s.year_from) ctx.addIssue({ code: "custom", message: "year_to < year_from" });
    if (s.year_to > currentYear()) ctx.addIssue({ code: "custom", message: "ano no futuro" });
    if (s.year_to - s.year_from + 1 > MAX_YEAR_SPAN) ctx.addIssue({ code: "custom", message: `no máximo ${MAX_YEAR_SPAN} anos` });
    if (s.kind === "breakdown" && s.year_from !== s.year_to) ctx.addIssue({ code: "custom", message: "breakdown exige um único ano" });
    if (s.kind === "breakdown" && !s.category_type) ctx.addIssue({ code: "custom", message: "breakdown exige category_type" });
  });

export type QuerySpec = z.infer<typeof QuerySpecSchema>;

/** Forma canônica: é dela que nasce a chave de cache. Perguntas equivalentes ⇒ mesma chave. */
export function normalizeSpec(input: unknown): QuerySpec {
  const parsed = QuerySpecSchema.parse(input);
  const entityCode = parsed.entity_code.replace(/^0+(?=\d)/, "");
  return { ...parsed, entity_code: entityCode };
}

export const queryHash = (spec: QuerySpec) => hashOf(spec);

export const ENTITY_TYPE_SET = new Set<string>(ENTITY_TYPES);
