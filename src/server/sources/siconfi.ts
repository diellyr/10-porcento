import { AppError } from "../core/errors";
import type {
  EntityCandidate, FetchContext, FetchResult, FetchUnit, IGovernmentSource,
} from "../core/interfaces";
import { normalizeText, parseNumber } from "../core/normalize";
import type { FactInput, SourceDefinition } from "../core/types";
import { getJson, healthUrl, pingSource } from "./http";

export const SICONFI_DEFINITION: SourceDefinition = {
  slug: "siconfi",
  name: "SICONFI",
  description: "Sistema de Informações Contábeis e Fiscais do Setor Público Brasileiro — dados fiscais e contábeis de União, estados, DF e municípios (DCA, RREO, RGF, MSC).",
  provider: "Tesouro Nacional",
  category: "fiscal",
  sourceType: "REST_API",
  baseUrl: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt",
  documentationUrl: "https://apidatalake.tesouro.gov.br/docs/siconfi/",
  authType: "NONE",
  requiresAuth: false,
  priority: 10,
  rateLimitPerMinute: 60,
  cacheTtlMinutes: 1440,
  healthPath: "/entes?offset=0&limit=1",
};

interface OrdsPage<T> { items?: T[]; hasMore?: boolean; limit?: number; offset?: number; count?: number }

export interface SiconfiRow {
  exercicio?: number | string; cod_ibge?: number | string; anexo?: string; rotulo?: string; coluna?: string;
  cod_conta?: string; conta?: string; valor?: number | string | null; periodo?: number; periodicidade?: string;
}

const MAX_PAGES = 30;

/**
 * Resumo curto das linhas recebidas (só rótulos contábeis, sem valores nem dados pessoais) para diagnosticar mudanças de formato:
 * vai na mensagem do erro, que fica no log de requisições do painel admin.
 */
export function describeRows(rows: SiconfiRow[]): string {
  const uniq = (xs: Array<string | undefined>, n: number) => [...new Set(xs.map((x) => (x ?? "").trim()).filter(Boolean))].slice(0, n);
  const sample = rows.slice(0, 4).map((r) => `[${r.coluna ?? ""} | ${r.cod_conta ?? ""} | ${(r.conta ?? "").slice(0, 40)} | ${(r.rotulo ?? "").slice(0, 40)}]`);
  return `colunas={${uniq(rows.map((r) => r.coluna), 8).join("; ")}} rotulos={${uniq(rows.map((r) => r.rotulo), 5).join("; ")}} amostra=${sample.join(" ")}`.slice(0, 600);
}

/** Código SICONFI (id_ente) para um ente do nosso modelo. */
export const toIdEnte = (e: { type: string; code: string }) => (e.type === "COUNTRY" ? "1" : e.code);
export function esferaOf(e: { type: string; code: string }): "U" | "E" | "D" | "M" {
  if (e.type === "COUNTRY") return "U";
  if (e.type === "STATE") return e.code === "53" ? "D" : "E";
  return "M";
}

async function fetchAll<T>(ctx: FetchContext, path: string, label: string): Promise<T[]> {
  const out: T[] = [];
  const sep = path.includes("?") ? "&" : "?";
  const limit = 5000;
  for (let page = 0, offset = 0; page < MAX_PAGES; page++) {
    const body = await getJson<OrdsPage<T>>(ctx.http, {
      url: `${ctx.source.baseUrl}${path}${sep}offset=${offset}&limit=${limit}`, label,
    });
    const items = body.items ?? [];
    out.push(...items);
    if (!body.hasMore || items.length === 0) return out;
    offset += items.length;
  }
  throw new AppError("BAD_RESPONSE", `${label}: paginação excedeu ${MAX_PAGES} páginas`);
}

/* ───────────── parsers (puros, testados com fixtures) ───────────── */

/** "1.1.0.0.00.0.0" → nível 2 (quantidade de grupos iniciais diferentes de zero). */
export function revenueCodeInfo(raw: string | undefined): { code: string; level: number } | null {
  const m = raw?.match(/(\d(?:\.\d+){1,7})/);
  if (!m) return null;
  const groups = m[1]!.split(".");
  let level = 0;
  for (const g of groups) { if (/^0+$/.test(g)) break; level++; }
  return level === 0 ? null : { code: m[1]!, level };
}

function pickColumn(cols: Set<string>, exact: string[], fuzzy: (c: string) => boolean): string | null {
  for (const e of exact) if (cols.has(e)) return e;
  const f = [...cols].filter(fuzzy);
  return f.length === 1 ? f[0]! : null; // ambíguo ⇒ não chuta
}

export function parseDcaReceitas(rows: SiconfiRow[], unit: FetchUnit): { facts: FactInput[]; skipped: number } {
  const cols = new Set(rows.map((r) => normalizeText(r.coluna ?? "")));
  const colRealized = pickColumn(cols, ["receitas brutas realizadas"], (c) => /realizad/.test(c) && !/deduc|liquid/.test(c));
  const colForecast = pickColumn(cols, ["previsao inicial da receita orcada"], (c) => /previsao inicial/.test(c));
  const facts: FactInput[] = [];
  let skipped = 0;
  for (const r of rows) {
    const col = normalizeText(r.coluna ?? "");
    const metric = col === colRealized ? "REVENUE_REALIZED" : col === colForecast ? "REVENUE_FORECAST" : null;
    const info = revenueCodeInfo(r.cod_conta);
    const value = parseNumber(r.valor);
    if (!metric || !info || value === null || !/^[12]/.test(info.code) || info.level > 3) { skipped++; continue; }
    facts.push({
      entity_type: unit.entity.type, entity_code: unit.entity.code, metric,
      category_type: "REVENUE_SOURCE", category_code: info.code, category_label: (r.conta ?? "").trim() || info.code,
      period_type: "YEAR", period_year: unit.year, period_number: 0, value, unit: "BRL",
      source_dataset: "DCA-Anexo I-C", source_record_id: `${info.code}|${col}`,
    });
  }
  return { facts, skipped };
}

export function parseFunctionCode(raw: string | undefined): { type: "FUNCTION" | "SUBFUNCTION"; code: string } | null {
  const s = (raw ?? "").trim();
  let m = s.match(/^(?:FU)?(\d{2})$/i);
  if (m) return { type: "FUNCTION", code: m[1]! };
  m = s.match(/^(?:SF)?(\d{2})\.(\d{3})$/i);
  if (m) return { type: "SUBFUNCTION", code: `${m[1]}.${m[2]}` };
  return null;
}

/**
 * Código de função/subfunção de uma linha do Anexo I-E. Ordem de preferência:
 *  1) `cod_conta` ("FU10", "10", "10.301") — formato antigo/fixtures;
 *  2) prefixo do campo `conta` — formato real observado na API: cod_conta = "TotalDespesas" em todas as linhas e a função vem em
 *     `conta`: "01 - Legislativa" → FUNCTION "01"; "01.031 - Ação Legislativa" → SUBFUNCTION "01.031".
 */
export function parseFunctionFromConta(conta: string | undefined): { type: "FUNCTION" | "SUBFUNCTION"; code: string; label: string } | null {
  const s = (conta ?? "").trim();
  let m = s.match(/^(\d{2})\.(\d{3})\s*[-–]\s*(.+)$/);
  if (m) return { type: "SUBFUNCTION", code: `${m[1]}.${m[2]}`, label: m[3]!.trim() };
  m = s.match(/^(\d{2})\s*[-–]\s*(.+)$/);
  if (m) return { type: "FUNCTION", code: m[1]!, label: m[2]!.trim() };
  return null;
}

type Block = "EXCETO" | "INTRA" | null;
/** Linhas que não são função/subfunção: cabeçalhos de bloco (exceto intra / intra), totais e o resíduo "Demais Subfunções". */
const blockOfConta = (conta: string): Block => {
  const c = normalizeText(conta);
  if (/^despesas? exceto intra/.test(c)) return "EXCETO";
  if (/^despesas? intra/.test(c)) return "INTRA";
  return null;
};
const isTotalizer = (conta: string) => /^(total|despesas? (exceto )?intra|despesas? correntes|despesas? de capital)/.test(normalizeText(conta));
const isResidual = (conta: string) => /^demais subfuncoes/.test(normalizeText(conta));

export function parseDcaDespesasFuncao(rows: SiconfiRow[], unit: FetchUnit): { facts: FactInput[]; skipped: number } {
  const cols = new Set(rows.map((r) => normalizeText(r.coluna ?? "")));
  const map = new Map<string, FactInput["metric"]>();
  const add = (metric: FactInput["metric"], exact: string, fuzzy: (c: string) => boolean) => {
    const c = pickColumn(cols, [exact], fuzzy);
    if (c) map.set(c, metric);
  };
  add("EXPENSE_COMMITTED", "despesas empenhadas", (c) => /empenhad/.test(c) && !/restos|inscri/.test(c));
  add("EXPENSE_LIQUIDATED", "despesas liquidadas", (c) => /liquidad/.test(c) && !/restos|inscri/.test(c));
  add("EXPENSE_PAID", "despesas pagas", (c) => /^despesas? pagas?$/.test(c));
  const facts: FactInput[] = [];
  const seen = new Set<string>(); // (coluna, função): uma linha por bloco consolidado — repetição não soma duas vezes
  const block = new Map<string, Block>(); // bloco corrente por coluna, na ordem em que a API devolve as linhas
  let skipped = 0;
  for (const r of rows) {
    const col = normalizeText(r.coluna ?? "");
    const conta = (r.conta ?? "").trim();

    // totalizadores e cabeçalhos de bloco: nunca viram fato; os cabeçalhos só dizem em que bloco estamos
    const header = blockOfConta(conta);
    if (header) block.set(col, header);
    if (header || isTotalizer(conta)) { skipped++; continue; }
    // "Demais Subfunções" é resíduo sem código próprio: já está dentro do total da função; guardá-lo geraria dupla contagem
    if (isResidual(conta)) { skipped++; continue; }

    const metric = map.get(col);
    const fromCod = parseFunctionCode(r.cod_conta);
    const fromConta = fromCod ? null : parseFunctionFromConta(conta);
    const cat = fromCod ?? fromConta;
    const value = parseNumber(r.valor);
    // formato antigo informa o bloco no rótulo; o real, nas linhas-cabeçalho
    const rot = normalizeText(r.rotulo ?? "");
    const intraByLabel = rot.includes("intra") && !rot.includes("exceto");
    const intra = intraByLabel || block.get(col) === "INTRA"; // intraorçamentária fica à parte: somar com o bloco "exceto intra" duplicaria o consolidado
    if (!metric || !cat || value === null || intra) { skipped++; continue; }
    const key = `${col}|${cat.type}|${cat.code}`;
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);
    facts.push({
      entity_type: unit.entity.type, entity_code: unit.entity.code, metric,
      category_type: cat.type, category_code: cat.code,
      category_label: fromConta ? fromConta.label : (conta.replace(/^\s*(FU|SF)?[\d.]+\s*[-–]?\s*/i, "").trim() || cat.code),
      period_type: "YEAR", period_year: unit.year, period_number: 0, value, unit: "BRL",
      source_dataset: "DCA-Anexo I-E", source_record_id: `${cat.type === "FUNCTION" ? "FU" : "SF"}${cat.code}|${col}`,
    });
  }
  return { facts, skipped };
}

/** Grupo de natureza da despesa: "3.1" Pessoal, "3.2" Juros, "3.3" Outras correntes, "4.4" Investimentos, "4.5" Inversões, "4.6" Amortização. */
export function parseExpenseGroupCode(raw: string | undefined): string | null {
  const m = (raw ?? "").trim().match(/^(?:ND)?([34])\.([1-6])(?:\.0+)*$/i);
  return m ? `${m[1]}.${m[2]}` : null;
}

export function parseDcaDespesasNatureza(rows: SiconfiRow[], unit: FetchUnit): { facts: FactInput[]; skipped: number } {
  const cols = new Set(rows.map((r) => normalizeText(r.coluna ?? "")));
  const map = new Map<string, FactInput["metric"]>();
  const add = (metric: FactInput["metric"], exact: string, fuzzy: (c: string) => boolean) => {
    const c = pickColumn(cols, [exact], fuzzy);
    if (c) map.set(c, metric);
  };
  add("EXPENSE_COMMITTED", "despesas empenhadas", (c) => /empenhad/.test(c) && !/restos|inscri/.test(c));
  add("EXPENSE_LIQUIDATED", "despesas liquidadas", (c) => /liquidad/.test(c) && !/restos|inscri/.test(c));
  add("EXPENSE_PAID", "despesas pagas", (c) => /^despesas? pagas?$/.test(c));
  const facts: FactInput[] = [];
  let skipped = 0;
  for (const r of rows) {
    const col = normalizeText(r.coluna ?? "");
    const metric = map.get(col);
    const code = parseExpenseGroupCode(r.cod_conta);
    const value = parseNumber(r.valor);
    const rot = normalizeText(r.rotulo ?? "");
    const intra = rot.includes("intra") && !rot.includes("exceto");
    if (!metric || !code || value === null || intra) { skipped++; continue; }
    facts.push({
      entity_type: unit.entity.type, entity_code: unit.entity.code, metric, category_type: "EXPENSE_GROUP", category_code: code,
      category_label: (r.conta ?? "").replace(/^\s*[\d.]+\s*[-–]?\s*/, "").trim() || code,
      period_type: "YEAR", period_year: unit.year, period_number: 0, value, unit: "BRL", source_dataset: "DCA-Anexo I-D", source_record_id: `${r.cod_conta}|${col}`,
    });
  }
  return { facts, skipped };
}

export function parseRgfDivida(rows: SiconfiRow[], unit: FetchUnit, periodType: "QUARTER" | "SEMESTER"): { facts: FactInput[]; skipped: number } {
  const facts: FactInput[] = [];
  let skipped = 0;
  const wanted = rows.filter((r) => {
    const rot = normalizeText(r.rotulo ?? "");
    return /^divida consolidada( - dc| liquida - dcl|\b)/.test(rot) && !/deducoes|ajuste|precatorios/.test(rot);
  });
  // coluna do saldo "até o período" (nunca o saldo anterior)
  const cols = [...new Set(wanted.map((r) => normalizeText(r.coluna ?? "")))].filter((c) => /(ate o|saldo do exercicio de|saldo do periodo)/.test(c) && !/anterior/.test(c));
  const col = cols.length === 1 ? cols[0]! : null;
  for (const r of rows) {
    const rot = normalizeText(r.rotulo ?? "");
    const isDcl = /^divida consolidada liquida/.test(rot);
    const isDc = /^divida consolidada\s*-?\s*dc/.test(rot);
    const value = parseNumber(r.valor);
    if (!col || normalizeText(r.coluna ?? "") !== col || (!isDc && !isDcl) || value === null) { skipped++; continue; }
    facts.push({
      entity_type: unit.entity.type, entity_code: unit.entity.code, metric: "DEBT",
      category_type: isDcl ? "DEBT_NET_CONSOLIDATED" : "DEBT_CONSOLIDATED", category_code: isDcl ? "DCL" : "DC",
      category_label: isDcl ? "Dívida consolidada líquida" : "Dívida consolidada",
      period_type: periodType, period_year: unit.year, period_number: unit.periodNumber, value, unit: "BRL",
      source_dataset: "RGF-Anexo 02", source_record_id: `${r.cod_conta ?? r.rotulo}|${col}`,
    });
  }
  return { facts, skipped };
}

/* ───────────── adaptador ───────────── */

const enc = encodeURIComponent;

export const siconfiAdapter: IGovernmentSource = {
  definition: SICONFI_DEFINITION,
  adapterKey: "siconfi",
  datasets: ["siconfi.dca.receitas", "siconfi.dca.despesas_funcao", "siconfi.dca.despesas_natureza", "siconfi.rgf.divida"],

  async testConnection(ctx) {
    return pingSource(ctx.http, healthUrl(ctx.source, SICONFI_DEFINITION.healthPath));
  },

  async fetchUnit(unit, ctx): Promise<FetchResult> {
    const id = toIdEnte(unit.entity);
    if (unit.dataset.startsWith("siconfi.dca.")) {
      const anexo = unit.dataset === "siconfi.dca.receitas" ? "DCA-Anexo I-C" : unit.dataset === "siconfi.dca.despesas_natureza" ? "DCA-Anexo I-D" : "DCA-Anexo I-E";
      const path = `/dca?an_exercicio=${unit.year}&no_anexo=${enc(anexo)}&id_ente=${id}`;
      const rows = await fetchAll<SiconfiRow>(ctx, path, `siconfi ${anexo}`);
      const parsed = unit.dataset === "siconfi.dca.receitas" ? parseDcaReceitas(rows, unit) : unit.dataset === "siconfi.dca.despesas_natureza" ? parseDcaDespesasNatureza(rows, unit) : parseDcaDespesasFuncao(rows, unit);
      if (rows.length > 0 && parsed.facts.length === 0) {
        throw new AppError("BAD_RESPONSE", `siconfi ${anexo}: ${rows.length} linhas recebidas, nenhuma reconhecida pelo parser v${ctx.source.parserVersion} (colunas/códigos mudaram?) ${describeRows(rows)}`);
      }
      return { facts: parsed.facts, recordsReceived: rows.length, skipped: parsed.skipped, endpoint: path };
    }
    if (unit.dataset === "siconfi.rgf.divida") {
      // Quadrimestral por padrão; entes pequenos publicam semestralmente.
      for (const [per, pt] of [["Q", "QUARTER"], ["S", "SEMESTER"]] as const) {
        if (per === "S" && unit.periodNumber > 2) break;
        const path = `/rgf?an_exercicio=${unit.year}&in_periodicidade=${per}&nr_periodo=${unit.periodNumber}&co_tipo_demonstrativo=RGF&no_anexo=${enc("RGF-Anexo 02")}&co_esfera=${esferaOf(unit.entity)}&co_poder=E&id_ente=${id}`;
        const rows = await fetchAll<SiconfiRow>(ctx, path, "siconfi RGF-Anexo 02");
        if (rows.length === 0) continue;
        const parsed = parseRgfDivida(rows, unit, pt);
        if (parsed.facts.length === 0) throw new AppError("BAD_RESPONSE", `siconfi RGF-Anexo 02: ${rows.length} linhas recebidas, nenhuma reconhecida pelo parser v${ctx.source.parserVersion} ${describeRows(rows)}`);
        return { facts: parsed.facts, recordsReceived: rows.length, skipped: parsed.skipped, endpoint: path };
      }
      return { facts: [], recordsReceived: 0, skipped: 0, endpoint: "rgf" };
    }
    throw new AppError("INTERNAL", `siconfi não suporta o dataset ${unit.dataset}`);
  },

  async listEntities(ctx): Promise<EntityCandidate[]> {
    interface EnteRow { cod_ibge: number | string; ente: string; uf: string; esfera: string; populacao?: number | string | null; cnpj?: string | null }
    const rows = await fetchAll<EnteRow>(ctx, "/entes", "siconfi entes");
    return parseEntes(rows);
  },
};

export function parseEntes(rows: Array<{ cod_ibge: number | string; ente: string; uf: string; esfera: string; populacao?: number | string | null; cnpj?: string | null }>): EntityCandidate[] {
  const out = new Map<string, EntityCandidate>();
  for (const r of rows) {
    const code = String(r.cod_ibge ?? "").trim();
    const esfera = normalizeText(r.esfera ?? "");
    const pop = parseNumber(r.populacao ?? null);
    if (!code || !r.ente) continue;
    if (esfera.startsWith("uniao")) out.set("COUNTRY:1", { type: "COUNTRY", code: "1", name: "Brasil", uf: null, population: pop, parentCode: null, cnpj: r.cnpj ?? null });
    else if (esfera === "estado" || esfera === "distrito federal") out.set(`STATE:${code}`, { type: "STATE", code, name: cleanEnteName(r.ente), uf: r.uf, population: pop, parentCode: "1", cnpj: r.cnpj ?? null });
    else if (esfera === "municipio" && code.length === 7) out.set(`MUNICIPALITY:${code}`, { type: "MUNICIPALITY", code, name: cleanEnteName(r.ente), uf: r.uf, population: pop, parentCode: code.slice(0, 2), cnpj: r.cnpj ?? null });
  }
  return [...out.values()];
}

/** "Município de Praia Grande", "Prefeitura Municipal de X", "Governo do Estado de São Paulo" → nome simples. */
export function cleanEnteName(raw: string): string {
  return raw
    .replace(/^(Prefeitura Municipal|Munic[ií]pio|Governo do Estado|Estado|Governo do Distrito Federal)\s+(d[eoa]s?\s+)?/i, "")
    .replace(/\s+-\s+[A-Z]{2}$/, "")
    .trim() || raw.trim();
}
