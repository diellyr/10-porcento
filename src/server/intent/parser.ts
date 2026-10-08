import { z } from "zod";
import { EXPENSE_GROUPS, FUNCTIONS, METRIC_INFO } from "../core/catalog-info";
import type { IDataRepository } from "../core/interfaces";
import { normalizeText } from "../core/normalize";
import { normalizeSpec, type QuerySpec } from "../core/query-spec";
import { RankingQuerySchema, type RankingQuery } from "../core/ranking";
import { UF_NAMES } from "../core/geo";
import type { Entity, FiscalMetric } from "../core/types";

/**
 * Pergunta → Intent (JSON estruturado) → Validator → Query Builder → Query Router.
 * Nenhuma etapa gera ou executa SQL: o único "dialeto" aceito é o QuerySpec validado por zod.
 * Este parser é por regras (determinístico). Um LLM pode substituí-lo no futuro, produzindo o MESMO Intent JSON,
 * que passa pelo mesmo validador.
 */
export const IntentSchema = z.object({
  intent: z.enum(["value", "compare", "series"]),
  metric: z.enum(["expense", "revenue", "debt", "benefit_value", "beneficiaries"]),
  expense_concept: z.enum(["committed", "liquidated", "paid"]).default("liquidated"),
  category: z.object({ type: z.enum(["FUNCTION", "EXPENSE_GROUP", "TAX", "BENEFIT"]), code: z.string() }).optional(),
  entity_type: z.enum(["COUNTRY", "STATE", "MUNICIPALITY"]),
  entities: z.array(z.string().min(1).max(80)).min(1).max(3),
  year_from: z.number().int(),
  year_to: z.number().int(),
});
export type Intent = z.infer<typeof IntentSchema>;

export type IntentResult =
  | { status: "ok"; intent: Intent; entities: Entity[]; specs: QuerySpec[] }
  | { status: "ranking"; query: RankingQuery }
  | { status: "needs_clarification" | "unsupported"; message: string };

const FUNCTION_KEYWORDS: Record<string, string> = {
  saude: "10", educacao: "12", seguranca: "06", "seguranca publica": "06", previdencia: "09", assistencia: "08", "assistencia social": "08",
  transporte: "26", cultura: "13", saneamento: "17", habitacao: "16", urbanismo: "15", "meio ambiente": "18", ambiental: "18", esporte: "27", desporto: "27",
  judiciaria: "02", legislativa: "01", administracao: "04", trabalho: "11", agricultura: "20", energia: "25", defesa: "05",
};
const GROUP_KEYWORDS: Record<string, string> = { pessoal: "3.1", "folha de pagamento": "3.1", juros: "3.2", investimento: "4.4", investimentos: "4.4", amortizacao: "4.6" };
const TAX_KEYWORDS: Record<string, { code: string; scope: "STATE" | "MUNICIPALITY" | "COUNTRY" }> = {
  icms: { code: "ICMS", scope: "STATE" }, ipva: { code: "IPVA", scope: "STATE" }, itcmd: { code: "ITCMD", scope: "STATE" },
  iss: { code: "ISS", scope: "MUNICIPALITY" }, iptu: { code: "IPTU", scope: "MUNICIPALITY" }, itbi: { code: "ITBI", scope: "MUNICIPALITY" },
  cofins: { code: "COFINS", scope: "COUNTRY" }, csll: { code: "CSLL", scope: "COUNTRY" }, ipi: { code: "IPI", scope: "COUNTRY" }, iof: { code: "IOF", scope: "COUNTRY" },
  "imposto de renda": { code: "IR", scope: "COUNTRY" },
};
const STOP = new Set(["de", "do", "da", "dos", "das", "em", "o", "a", "os", "as", "e", "com", "no", "na", "nos", "nas", "quanto", "quantos", "qual", "quais", "gastou", "gastaram", "arrecadou", "arrecadaram", "compare", "comparar", "comparacao", "entre", "ano", "estado", "cidade", "municipio", "prefeitura", "pagou", "empenhou", "liquidou", "despesa", "despesas", "receita", "receitas", "divida", "para", "por", "foi", "foram", "que", "um", "uma", "ao", "aos"]);

export interface IntentDeps { data: Pick<IDataRepository, "searchEntities">; now: Date }

const phraseCandidates = (words: string[]): string[] => {
  const out: string[] = [];
  for (let n = 4; n >= 1; n--) for (let i = 0; i + n <= words.length; i++) {
    const w = words.slice(i, i + n);
    if (STOP.has(w[0]!) || STOP.has(w[w.length - 1]!)) continue;
    if (n === 1 && w[0]!.length < 4) continue;
    out.push(w.join(" "));
  }
  return out;
};

export async function parseQuestion(question: string, deps: IntentDeps): Promise<IntentResult> {
  const q = normalizeText(question.slice(0, 300));
  const thisYear = deps.now.getUTCFullYear();
  if (q.length < 8) return { status: "needs_clarification", message: "Pode detalhar a pergunta? Ex.: “Quanto Santos gastou com saúde em 2024?”" };
  if (/\b(quais|maiores|menores|ranking|mais|menos)\b/.test(q) && /\b(municipios|estados|cidades)\b/.test(q)) return parseRanking(q, thisYear);

  // métrica
  let metric: Intent["metric"] | null = null;
  let expenseConcept: Intent["expense_concept"] = "liquidated";
  if (/\bbolsa familia\b/.test(q)) metric = /\b(familias|beneficiari|pessoas)\b/.test(q) ? "beneficiaries" : "benefit_value";
  else if (/\bdivida\b/.test(q)) metric = "debt";
  else if (/\b(arrecad|receita)/.test(q)) metric = "revenue";
  else if (/\b(gast|despes|pagou|empenhou|liquidou|investiu)/.test(q)) metric = "expense";
  const hasFunctionKeyword = Object.keys(FUNCTION_KEYWORDS).some((k) => new RegExp(`\\b${k}\\b`).test(q));
  if (!metric && hasFunctionKeyword) metric = "expense"; // "Compare educação de A e B" ⇒ despesa por função
  if (!metric) return { status: "needs_clarification", message: "Não entendi o que você quer saber. Tente perguntar sobre arrecadação, despesas, dívida ou Bolsa Família." };
  if (/\bempenh/.test(q)) expenseConcept = "committed";
  else if (/\b(pago|pagou|pagos|pagamentos)\b/.test(q)) expenseConcept = "paid";

  // categoria
  let category: Intent["category"];
  let taxScope: "STATE" | "MUNICIPALITY" | "COUNTRY" | null = null;
  for (const [k, v] of Object.entries(TAX_KEYWORDS)) if (new RegExp(`\\b${k}\\b`).test(q)) { category = { type: "TAX", code: v.code }; taxScope = v.scope; break; }
  if (!category && metric === "expense") {
    for (const [k, v] of Object.entries(FUNCTION_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) if (new RegExp(`\\b${k}\\b`).test(q)) { category = { type: "FUNCTION", code: v }; break; }
    if (!category) for (const [k, v] of Object.entries(GROUP_KEYWORDS)) if (new RegExp(`\\b${k}\\b`).test(q)) { category = { type: "EXPENSE_GROUP", code: v }; break; }
  }
  if (metric === "benefit_value" || metric === "beneficiaries") category = { type: "BENEFIT", code: "BOLSA_FAMILIA" };

  // anos
  const years = [...q.matchAll(/\b(20\d{2}|19\d{2})\b/g)].map((m) => Number(m[1]));
  let yFrom = years.length ? Math.min(...years) : thisYear - 1;
  let yTo = years.length ? Math.max(...years) : thisYear - 1;
  if (/\bano passado\b/.test(q)) yFrom = yTo = thisYear - 1;
  else if (/\b(este ano|ano atual)\b/.test(q)) yFrom = yTo = thisYear;
  const asSeries = yFrom !== yTo;

  // entes
  const wantsState = /\bestado\b/.test(q) || taxScope === "STATE";
  const wantsCity = /\b(cidade|municipio|prefeitura)\b/.test(q) || taxScope === "MUNICIPALITY";
  if (/\b(brasil|uniao|governo federal)\b/.test(q) && !wantsState && !wantsCity) {
    return finish({ intent: asSeries ? "series" : "value", metric, expense_concept: expenseConcept, category, entity_type: "COUNTRY", entities: ["Brasil"], year_from: yFrom, year_to: yTo }, [{ type: "COUNTRY", code: "1", name: "Brasil", uf: null, population: null, parentId: null, id: "country" }], deps);
  }
  const words = q.split(" ").filter(Boolean);
  const found: Entity[] = [];
  const seenCodes = new Set<string>();
  const used = new Set<string>();
  for (const phrase of phraseCandidates(words)) {
    if (found.length >= 3) break;
    if (phrase.split(" ").some((w) => used.has(w))) continue;
    const hits = (await deps.data.searchEntities(phrase, ["STATE", "MUNICIPALITY"], 10)).filter((e) => normalizeText(e.name) === phrase);
    if (!hits.length) continue;
    const pick = wantsState ? hits.find((h) => h.type === "STATE") : wantsCity ? hits.find((h) => h.type === "MUNICIPALITY") : (hits.find((h) => h.type === "MUNICIPALITY") ?? hits[0]);
    if (!pick || seenCodes.has(pick.type + pick.code)) continue;
    seenCodes.add(pick.type + pick.code);
    found.push(pick);
    phrase.split(" ").forEach((w) => used.add(w));
  }
  if (!found.length) return { status: "needs_clarification", message: "Não consegui identificar o município ou estado. Escreva o nome como aparece no mapa, por exemplo “Praia Grande” ou “Estado de São Paulo”." };
  const entityType = found[0]!.type;
  if (found.some((e) => e.type !== entityType)) return { status: "unsupported", message: "Por enquanto só comparamos entes do mesmo tipo (dois municípios ou dois estados)." };
  const compare = /\bcompar|\bversus\b|\bvs\b/.test(q) && found.length >= 2;
  if (found.length >= 2 && !compare) found.splice(1);
  return finish({ intent: compare ? "compare" : asSeries ? "series" : "value", metric, expense_concept: expenseConcept, category, entity_type: entityType, entities: found.map((e) => e.name), year_from: yFrom, year_to: yTo }, found, deps);
}

const UF_BY_NAME: Array<[string, string]> = Object.entries(UF_NAMES).map(([uf, name]) => [normalizeText(name), uf] as [string, string]).sort((a, b) => b[0].length - a[0].length);

/** "Quais municípios de São Paulo mais aumentaram despesas?" ⇒ consulta de ranking validada (nunca SQL). */
export function parseRanking(q: string, thisYear: number): IntentResult {
  const entityType = /\bestados\b/.test(q) && !/\bmunicipios|cidades\b/.test(q) ? "STATE" : "MUNICIPALITY";
  let uf: string | undefined;
  if (entityType === "MUNICIPALITY") {
    uf = UF_BY_NAME.find(([n]) => new RegExp(`\\b${n}\\b`).test(q))?.[1];
    if (!uf) { const m = q.match(/\b(?:de|do|da|em|no|na)\s+([a-z]{2})\b/); if (m && UF_NAMES[m[1]!.toUpperCase()]) uf = m[1]!.toUpperCase(); }
  }
  const metric = /\b(arrecad|receita)/.test(q) ? "REVENUE_REALIZED" : /\bempenh/.test(q) ? "EXPENSE_COMMITTED" : /\b(pago|pagou|pagos|pagamentos)\b/.test(q) ? "EXPENSE_PAID" : "EXPENSE_LIQUIDATED";
  const order = /\b(aumentaram|aumento|cresceram|crescimento|subiram|cresc\w*)\b/.test(q) ? "change_desc"
    : /\b(reduziram|diminuiram|cairam|queda|reducao)\b/.test(q) ? "change_asc"
    : /\b(menos|menores|menor)\b/.test(q) ? "value_asc" : "value_desc";
  const years = [...q.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  let year = years.length ? Math.max(...years) : thisYear - 1;
  let compare: number | undefined = years.length > 1 ? Math.min(...years) : undefined;
  if (order.startsWith("change") && compare === undefined) compare = year - 1;
  let category_type: string | undefined, category_code: string | undefined;
  if (metric !== "REVENUE_REALIZED") {
    const fn = Object.entries(FUNCTION_KEYWORDS).sort((a, b) => b[0].length - a[0].length).find(([k]) => new RegExp(`\\b${k}\\b`).test(q));
    if (fn) { category_type = "FUNCTION"; category_code = fn[1]; }
    else { const gr = Object.entries(GROUP_KEYWORDS).find(([k]) => new RegExp(`\\b${k}\\b`).test(q)); if (gr) { category_type = "EXPENSE_GROUP"; category_code = gr[1]; } }
  }
  if (year > thisYear) year = thisYear;
  const parsed = RankingQuerySchema.safeParse({ entity_type: entityType, metric, category_type, category_code, year, compare_year: compare, uf, order, per_capita: /per capita|por habitante/.test(q), limit: 10 });
  if (!parsed.success) return { status: "needs_clarification", message: "Não consegui montar o ranking. Informe o período, por exemplo “entre 2022 e 2024”." };
  return { status: "ranking", query: parsed.data };
}

/** Validator + Query Builder. */
function finish(raw: unknown, entities: Entity[], deps: IntentDeps): IntentResult {
  const parsed = IntentSchema.safeParse(raw);
  if (!parsed.success) return { status: "needs_clarification", message: "Não consegui montar uma consulta válida. Revise a pergunta." };
  const intent = parsed.data;
  const metricMap: Record<Intent["metric"], FiscalMetric> = {
    expense: intent.expense_concept === "committed" ? "EXPENSE_COMMITTED" : intent.expense_concept === "paid" ? "EXPENSE_PAID" : "EXPENSE_LIQUIDATED",
    revenue: "REVENUE_REALIZED", debt: "DEBT", benefit_value: "BENEFIT_VALUE", beneficiaries: "BENEFICIARIES",
  };
  const metric = metricMap[intent.metric];
  const catType = intent.category?.type ?? (intent.metric === "expense" ? "FUNCTION" : intent.metric === "revenue" ? "REVENUE_SOURCE" : intent.metric === "debt" ? (intent.entity_type === "COUNTRY" ? "DEBT_FEDERAL" : "DEBT_CONSOLIDATED") : undefined);
  const catCode = intent.category?.code ?? (intent.metric === "debt" ? (intent.entity_type === "COUNTRY" ? undefined : "DC") : undefined);
  if (intent.category?.type === "TAX" && intent.entity_type !== "COUNTRY")
    return { status: "unsupported", message: `Ainda não temos a arrecadação detalhada de ${intent.category.code} por ${intent.entity_type === "STATE" ? "estado" : "município"}. Hoje o detalhe por tributo vem dos dados da Receita Federal (tributos federais).` };
  if (intent.year_to > deps.now.getUTCFullYear()) return { status: "needs_clarification", message: "Esse período ainda não aconteceu." };
  try {
    const specs = entities.map((e) => normalizeSpec({
      kind: "series", entity_type: e.type, entity_code: e.code, metric, category_type: catType, category_code: catCode,
      year_from: intent.year_from, year_to: intent.year_to,
    }));
    return { status: "ok", intent, entities, specs };
  } catch {
    return { status: "needs_clarification", message: "O período pedido é inválido ou muito longo (máximo de 12 anos)." };
  }
}

export const describeMetric = (m: FiscalMetric) => METRIC_INFO[m].label;
export const functionLabel = (code: string) => FUNCTIONS[code] ?? EXPENSE_GROUPS[code] ?? code;
