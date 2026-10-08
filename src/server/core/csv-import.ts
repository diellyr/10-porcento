import { z } from "zod";
import type { DatasetDef } from "./datasets";
import { CODE_BY_UF } from "./geo";
import { normalizeText } from "./text";
import { FISCAL_METRICS, type EntityType, type FactInput, type FiscalMetric, type PeriodType } from "./types";

/**
 * Importação de CSV por fonte. O CSV vira os MESMOS fatos que um adaptador produziria; o que muda é a origem
 * (`source_record_id` = "csv:<importação>:<linha>") e que a cobertura das unidades importadas passa a valer por muito tempo,
 * de modo que o Query Router serve o CSV primeiro e só consulta a API para o que o CSV não cobre.
 */

/** Campos canônicos. O arquivo pode usar outros nomes de coluna: a tela de importação faz o mapeamento. */
export const IMPORT_FIELDS = [
  { key: "ente_tipo", label: "Tipo do ente", aliases: ["ente_tipo", "tipo_ente", "tipo", "esfera"] },
  { key: "ente_codigo", label: "Código do ente (IBGE)", aliases: ["ente_codigo", "cod_ibge", "codigo_ibge", "cod_ente", "id_ente", "ibge", "codigo", "uf", "municipio"] },
  { key: "ano", label: "Ano", aliases: ["ano", "exercicio", "an_exercicio", "ano_exercicio"] },
  { key: "periodo", label: "Período (mês/quadrimestre)", aliases: ["periodo", "mes", "nr_periodo", "quadrimestre"] },
  { key: "metrica", label: "Métrica", aliases: ["metrica", "metric", "coluna", "tipo_valor"] },
  { key: "categoria_tipo", label: "Tipo da categoria", aliases: ["categoria_tipo", "tipo_categoria"] },
  { key: "categoria_codigo", label: "Código da categoria", aliases: ["categoria_codigo", "cod_conta", "codigo_categoria", "cod_categoria", "funcao", "cod_funcao"] },
  { key: "categoria_rotulo", label: "Nome da categoria", aliases: ["categoria_rotulo", "conta", "rotulo", "nome_categoria", "descricao"] },
  { key: "valor", label: "Valor", aliases: ["valor", "value", "vl_valor", "total", "montante"] },
] as const;
export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

export const MAX_ROWS_PER_CHUNK = 4000;
export const MAX_FILE_ROWS = 300_000;
/** Cobertura do que veio de CSV: 10 anos. Para voltar a consultar a API, desfaça a importação. */
export const CSV_COVERAGE_YEARS = 10;

export const ImportRowSchema = z.object({
  ente_tipo: z.string().max(40).optional().nullable(),
  ente_codigo: z.string().min(1).max(40),
  ano: z.number().int().min(1990).max(new Date().getUTCFullYear() + 1),
  periodo: z.number().int().min(0).max(12).optional().nullable(),
  metrica: z.string().max(60).optional().nullable(),
  categoria_tipo: z.string().max(40).optional().nullable(),
  categoria_codigo: z.string().max(80).optional().nullable(),
  categoria_rotulo: z.string().max(300).optional().nullable(),
  valor: z.number().finite(),
});
export type ImportRow = z.infer<typeof ImportRowSchema>;

export const ChunkSchema = z.object({ rows: z.array(z.unknown()).min(1).max(MAX_ROWS_PER_CHUNK) });

export const StartSchema = z.object({
  dataset: z.string().min(1).max(80),
  filename: z.string().min(1).max(200),
  totalRows: z.number().int().min(1).max(MAX_FILE_ROWS),
});

const ENTITY_ALIASES: Record<string, EntityType> = {
  country: "COUNTRY", pais: "COUNTRY", uniao: "COUNTRY", brasil: "COUNTRY", federal: "COUNTRY",
  state: "STATE", estado: "STATE", uf: "STATE", estadual: "STATE", "estado/df": "STATE",
  municipality: "MUNICIPALITY", municipio: "MUNICIPALITY", cidade: "MUNICIPALITY", municipal: "MUNICIPALITY",
  agency: "AGENCY", orgao: "AGENCY",
};
export const normalizeEntityType = (s: string | null | undefined): EntityType | null => ENTITY_ALIASES[normalizeText(s ?? "")] ?? null;

const METRIC_ALIASES: Record<string, FiscalMetric> = {
  "receita prevista": "REVENUE_FORECAST", "receita realizada": "REVENUE_REALIZED", "receita arrecadada": "REVENUE_REALIZED",
  "despesa empenhada": "EXPENSE_COMMITTED", "despesas empenhadas": "EXPENSE_COMMITTED", empenhada: "EXPENSE_COMMITTED",
  "despesa liquidada": "EXPENSE_LIQUIDATED", "despesas liquidadas": "EXPENSE_LIQUIDATED", liquidada: "EXPENSE_LIQUIDATED",
  "despesa paga": "EXPENSE_PAID", "despesas pagas": "EXPENSE_PAID", paga: "EXPENSE_PAID",
  divida: "DEBT", "divida consolidada": "DEBT", beneficiarios: "BENEFICIARIES", "valor do beneficio": "BENEFIT_VALUE",
};
export function normalizeMetric(s: string | null | undefined): FiscalMetric | null {
  const raw = (s ?? "").trim();
  if (!raw) return null;
  const up = raw.toUpperCase().replace(/\s+/g, "_");
  if ((FISCAL_METRICS as readonly string[]).includes(up)) return up as FiscalMetric;
  return METRIC_ALIASES[normalizeText(raw)] ?? null;
}

/** Quantos períodos numerados existem para o tipo (0 = ano inteiro). */
export function periodRange(t: PeriodType): { min: number; max: number } {
  return { YEAR: { min: 0, max: 0 }, SEMESTER: { min: 1, max: 2 }, QUARTER: { min: 1, max: 3 }, BIMESTER: { min: 1, max: 6 }, MONTH: { min: 1, max: 12 } }[t];
}

function entityCode(type: EntityType, raw: string): string | { error: string } {
  const t = raw.trim();
  if (type === "COUNTRY") return "1";
  if (type === "STATE") {
    if (/^\d{2}$/.test(t)) return t;
    const byUf = CODE_BY_UF[t.toUpperCase()];
    return byUf ?? { error: `estado "${t}" inválido (use o código IBGE de 2 dígitos ou a sigla da UF)` };
  }
  if (type === "MUNICIPALITY") {
    const d = t.replace(/\D/g, "");
    if (d.length === 7) return d;
    return { error: d.length === 6 ? `município "${t}" com 6 dígitos: use o código IBGE de 7 dígitos` : `município "${t}" inválido (código IBGE de 7 dígitos)` };
  }
  return t.length > 0 ? t : { error: "código do ente vazio" };
}

export interface RowContext { importId: string; index: number; now: Date; filename?: string }
export type RowResult = { ok: true; fact: FactInput } | { ok: false; reason: string };

/** Converte uma linha do CSV (já mapeada) em fato, respeitando as regras do dataset escolhido. Nunca "adivinha" valores. */
export function rowToFact(row: ImportRow, ds: DatasetDef, ctx: RowContext): RowResult {
  const fail = (reason: string): RowResult => ({ ok: false, reason });

  const given = row.ente_tipo?.trim() ? normalizeEntityType(row.ente_tipo) : null;
  if (row.ente_tipo?.trim() && !given) return fail(`tipo de ente "${row.ente_tipo}" não reconhecido`);
  const type = given ?? (ds.entityTypes.length === 1 ? ds.entityTypes[0]! : null);
  if (!type) return fail(`informe o tipo do ente (${ds.entityTypes.join(", ")})`);
  if (!ds.entityTypes.includes(type)) return fail(`tipo de ente ${type} não é aceito por este conjunto de dados`);
  const code = entityCode(type, row.ente_codigo);
  if (typeof code !== "string") return fail(code.error);

  const metric = row.metrica?.trim() ? normalizeMetric(row.metrica) : ds.metrics.length === 1 ? ds.metrics[0]! : null;
  if (!metric) return fail(row.metrica?.trim() ? `métrica "${row.metrica}" não reconhecida` : `informe a métrica (${ds.metrics.join(", ")})`);
  if (!ds.metrics.includes(metric)) return fail(`métrica ${metric} não é aceita por este conjunto de dados`);

  const catType = row.categoria_tipo?.trim() ? row.categoria_tipo.trim().toUpperCase() : ds.categoryTypes.length === 1 ? ds.categoryTypes[0]! : null;
  if (!catType) return fail(`informe o tipo da categoria (${ds.categoryTypes.join(", ")})`);
  if (!ds.categoryTypes.includes(catType)) return fail(`tipo de categoria ${catType} não é aceito (${ds.categoryTypes.join(", ")})`);
  let catCode = row.categoria_codigo?.trim() || null;
  if (!catCode && ds.categoryCodes?.length === 1) catCode = ds.categoryCodes[0]!;
  if (!catCode) return fail("código da categoria vazio");
  // mesmos códigos dos adaptadores: função "10" (aceita "FU10"), subfunção "10.301" (aceita "SF10.301")
  if (catType === "FUNCTION") {
    const m = catCode.match(/^(?:FU)?\s*(\d{1,2})$/i);
    if (!m) return fail(`função "${catCode}" inválida (use o código de 2 dígitos, ex.: 10)`);
    catCode = m[1]!.padStart(2, "0");
  } else if (catType === "SUBFUNCTION") {
    const m = catCode.match(/^(?:SF)?\s*(\d{2})\.(\d{3})$/i);
    if (!m) return fail(`subfunção "${catCode}" inválida (use o formato 10.301)`);
    catCode = `${m[1]}.${m[2]}`;
  }
  if (ds.categoryCodes && !ds.categoryCodes.includes(catCode)) return fail(`categoria ${catCode} não é aceita (${ds.categoryCodes.join(", ")})`);

  const pr = periodRange(ds.periodType);
  const period = row.periodo ?? (pr.max === 0 ? 0 : null);
  if (period === null) return fail(`informe o período (${pr.min} a ${pr.max})`);
  if (period < pr.min || period > pr.max) return fail(`período ${period} fora do intervalo ${pr.min}–${pr.max}`);
  if (Math.abs(row.valor) >= 1e15) return fail("valor fora do limite");
  if (metric === "BENEFICIARIES" && row.valor < 0) return fail("beneficiários negativos");

  return {
    ok: true,
    fact: {
      entity_type: type, entity_code: code, metric,
      category_type: catType, category_code: catCode, category_label: row.categoria_rotulo?.trim() || catCode,
      period_type: ds.periodType, period_year: row.ano, period_number: period,
      value: Math.round(row.valor * 100) / 100, unit: metric === "BENEFICIARIES" ? "COUNT" : "BRL",
      source_dataset: `${ds.id} (CSV)`, source_record_id: `csv:${ctx.importId}:${ctx.index}`,
      source_url: null, source_updated_at: ctx.now.toISOString(),
    },
  };
}

/** Unidade de cobertura: ente × ano × período (o dataset é fixo por importação). */
export const unitKey = (f: Pick<FactInput, "entity_type" | "entity_code" | "period_year" | "period_number">) =>
  `${f.entity_type}:${f.entity_code}|${f.period_year}|${f.period_number}`;

/** Linha de exemplo (texto) para o modelo de CSV de um dataset. */
export function templateRow(ds: DatasetDef): Record<ImportFieldKey, string> {
  const type = ds.entityTypes[0]!;
  const pr = periodRange(ds.periodType);
  return {
    ente_tipo: type,
    ente_codigo: type === "COUNTRY" ? "1" : type === "STATE" ? "35" : type === "MUNICIPALITY" ? "3541406" : "36000",
    ano: String(new Date().getUTCFullYear() - 1),
    periodo: pr.max === 0 ? "" : String(pr.min),
    metrica: ds.metrics[0]!,
    categoria_tipo: ds.categoryTypes[0]!,
    categoria_codigo: ds.categoryCodes?.[0] ?? (ds.categoryTypes[0] === "FUNCTION" ? "10" : "1.1.0.0.00.0.0"),
    categoria_rotulo: "Exemplo",
    valor: "1234567,89",
  };
}
