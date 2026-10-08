import { AppError } from "../core/errors";
import { isValidCnpj, type ContractFetchQuery, type ContractRecord } from "../core/contracts";
import type { ContractSearchResult, FetchContext, FetchResult, FetchUnit, IGovernmentSource } from "../core/interfaces";
import { onlyDigits, parseNumber } from "../core/normalize";
import type { FactInput, SourceDefinition } from "../core/types";
import { getJson, healthUrl, pingSource } from "./http";

export const TRANSPARENCIA_DEFINITION: SourceDefinition = {
  slug: "portal-transparencia",
  name: "Portal da Transparência",
  description: "API de dados da CGU: despesas, pagamentos, contratos, licitações, servidores, viagens, cartões, emendas, convênios e benefícios sociais.",
  provider: "Controladoria-Geral da União (CGU)",
  category: "transparencia",
  sourceType: "REST_API",
  baseUrl: "https://api.portaldatransparencia.gov.br/api-de-dados",
  documentationUrl: "https://api.portaldatransparencia.gov.br/swagger-ui/index.html",
  authType: "API_KEY_HEADER",
  requiresAuth: true,
  priority: 20,
  // Oficial: 400/min (700 de 0h às 6h); endpoints restritos 180/min; excesso suspende a chave por 8 h.
  // Usamos um teto conservador.
  rateLimitPerMinute: 90,
  cacheTtlMinutes: 1440,
  healthPath: "/orgaos-siafi?pagina=1",
};

export const TRANSPARENCIA_KEY_HEADER = "chave-api-dados";
const MAX_PAGES = 60;

function headers(ctx: FetchContext): Record<string, string> {
  if (!ctx.credential) throw new AppError("SOURCE_NOT_CONFIGURED", "Portal da Transparência: chave de API não configurada");
  return { [TRANSPARENCIA_KEY_HEADER]: ctx.credential };
}

async function fetchPages<T>(ctx: FetchContext, path: string, label: string): Promise<T[]> {
  const out: T[] = [];
  for (let pagina = 1; pagina <= MAX_PAGES; pagina++) {
    const sep = path.includes("?") ? "&" : "?";
    const items = await getJson<T[]>(ctx.http, { url: `${ctx.source.baseUrl}${path}${sep}pagina=${pagina}`, headers: headers(ctx), label });
    if (!Array.isArray(items)) throw new AppError("BAD_RESPONSE", `${label}: esperado array`);
    if (items.length === 0) return out;
    out.push(...items);
  }
  throw new AppError("BAD_RESPONSE", `${label}: paginação excedeu ${MAX_PAGES} páginas`);
}

/* ───────────── parsers ───────────── */

export interface BenefitRow { id?: number | string; valor?: number | string; quantidadeBeneficiados?: number | string }

export function parseBenefit(rows: BenefitRow[], unit: FetchUnit, code: "BOLSA_FAMILIA" | "BPC", label: string, dataset: string): { facts: FactInput[]; skipped: number } {
  const facts: FactInput[] = [];
  let skipped = 0;
  rows.forEach((r, i) => {
    const value = parseNumber(r.valor);
    const qty = parseNumber(r.quantidadeBeneficiados);
    if (value === null && qty === null) { skipped++; return; }
    const common = {
      entity_type: unit.entity.type, entity_code: unit.entity.code, category_type: "BENEFIT", category_code: code, category_label: label,
      period_type: "MONTH" as const, period_year: unit.year, period_number: unit.periodNumber, source_dataset: dataset,
      source_record_id: String(r.id ?? `row${i}`),
    };
    if (value !== null) facts.push({ ...common, metric: "BENEFIT_VALUE", value, unit: "BRL" });
    if (qty !== null) facts.push({ ...common, metric: "BENEFICIARIES", value: qty, unit: "COUNT" });
  });
  return { facts, skipped };
}

export interface DespesaOrgaoRow { ano?: number; orgao?: string; codigoOrgao?: string; empenhado?: string | number; liquidado?: string | number; pago?: string | number }

export function parseDespesasOrgao(rows: DespesaOrgaoRow[], unit: FetchUnit, sourceDataset = "despesas/por-orgao"): { facts: FactInput[]; skipped: number } {
  const facts: FactInput[] = [];
  const seen = new Set<string>(); // um órgão por ano: repetição (página repetida, órgão listado duas vezes) não soma duas vezes
  let skipped = 0;
  for (const r of rows) {
    const code = String(r.codigoOrgao ?? "").trim();
    if (!code || !r.orgao) { skipped++; continue; }
    if (seen.has(code)) { skipped++; continue; }
    seen.add(code);
    for (const [metric, raw] of [["EXPENSE_COMMITTED", r.empenhado], ["EXPENSE_LIQUIDATED", r.liquidado], ["EXPENSE_PAID", r.pago]] as const) {
      const value = parseNumber(raw);
      if (value === null) { skipped++; continue; }
      facts.push({
        entity_type: "COUNTRY", entity_code: unit.entity.code, related_type: "AGENCY", related_code: code, related_name: r.orgao.trim(),
        metric, category_type: "AGENCY", category_code: code, category_label: r.orgao.trim(),
        period_type: "YEAR", period_year: unit.year, period_number: 0, value, unit: "BRL", source_dataset: sourceDataset,
        source_record_id: code,
      });
    }
  }
  return { facts, skipped };
}


/* ───────────── despesas por órgão ───────────── */

/**
 * `/despesas/por-orgao` EXIGE o órgão (código SIAFI) em `orgao` ou `orgaoSuperior`; só com ano e página responde HTTP 400.
 * Por isso a unidade (União × ano) é montada consultando cada órgão da lista oficial `/orgaos-siafi` — nunca um órgão fixo
 * apresentado como total nacional.
 */
export type OrgaoParam = "orgao" | "orgaoSuperior";
export const DESPESAS_ORGAO_PATH = "/despesas/por-orgao";
const SIAFI_CODE = /^\d{1,10}$/;

/** Caminho (sem página) de UM órgão. A página é acrescentada por `fetchPages`. */
export function despesasOrgaoPath(year: number, code: string, param: OrgaoParam = "orgao"): string {
  if (!SIAFI_CODE.test(code)) throw new AppError("VALIDATION", `código SIAFI inválido: ${code}`);
  return `${DESPESAS_ORGAO_PATH}?ano=${year}&${param}=${code}`;
}

interface DespesasConfig { despesasOrgaos?: unknown; despesasOrgaoParam?: unknown; despesasRequestsPerCall?: unknown }

function despesasConfig(ctx: FetchContext): { codes: string[] | null; param: OrgaoParam; perCall: number } {
  const c = ctx.source.config as DespesasConfig;
  const codes = Array.isArray(c.despesasOrgaos) && c.despesasOrgaos.length > 0
    ? [...new Set(c.despesasOrgaos.map((x) => String(x).trim()))]
    : null;
  if (codes?.some((x) => !SIAFI_CODE.test(x))) throw new AppError("VALIDATION", "config.despesasOrgaos deve conter apenas códigos SIAFI numéricos");
  const param: OrgaoParam = c.despesasOrgaoParam === "orgaoSuperior" ? "orgaoSuperior" : "orgao";
  const perCall = Math.min(Math.max(Number(c.despesasRequestsPerCall) || 80, 5), 400); // abaixo do teto de requisições/min da fonte
  return { codes, param, perCall };
}

/**
 * Progresso por (fonte, ano) entre chamadas: com ~300 órgãos e limite de requisições por minuto, a unidade é montada em
 * várias chamadas. Em memória e com validade curta (melhor esforço); se se perder, apenas recomeça.
 */
interface Progress { agencies: Array<{ code: string; name: string }> | null; done: Map<string, DespesaOrgaoRow[]>; at: number }
const PROGRESS_TTL_MS = 30 * 60_000;
const progress = new Map<string, Progress>();
export function resetDespesasProgress() { progress.clear(); }

async function fetchDespesasOrgao(unit: FetchUnit, ctx: FetchContext): Promise<FetchResult> {
  const cfg = despesasConfig(ctx);
  const key = `${ctx.source.id}|${unit.year}`;
  const now = Date.now();
  for (const [k, v] of progress) if (now - v.at > PROGRESS_TTL_MS) progress.delete(k);
  const st: Progress = progress.get(key) ?? { agencies: null, done: new Map(), at: now };
  progress.set(key, st);
  st.at = now;

  let requests = 0;
  const counting = (): FetchContext => ({ ...ctx, http: { request: (r) => { requests++; return ctx.http.request(r); } } });
  const c = counting();

  // 1) órgãos: a lista oficial paginada (sem repetição) ou a seleção explícita do administrador
  if (!st.agencies) {
    if (cfg.codes) st.agencies = cfg.codes.map((code) => ({ code, name: code }));
    else {
      const listed = parseAgencies(await fetchPages<{ codigo?: string | number; descricao?: string }>(c, "/orgaos-siafi", "transparencia orgaos-siafi"));
      const byCode = new Map<string, { code: string; name: string }>();
      for (const a of listed) if (SIAFI_CODE.test(a.code) && !byCode.has(a.code)) byCode.set(a.code, a);
      st.agencies = [...byCode.values()];
    }
  }
  const agencies = st.agencies;
  if (agencies.length === 0) throw new AppError("BAD_RESPONSE", "transparencia orgaos-siafi: nenhum órgão retornado");

  // 2) despesas de cada órgão pendente, preservando a paginação; para ao atingir o orçamento de requisições da chamada
  let reason: string | null = null;
  for (const a of agencies) {
    if (st.done.has(a.code)) continue;
    if (requests >= cfg.perCall) { reason = `orçamento de ${cfg.perCall} requisições por chamada atingido`; break; }
    try {
      const rows = await fetchPages<DespesaOrgaoRow>(c, despesasOrgaoPath(unit.year, a.code, cfg.param), `transparencia despesas/por-orgao (${a.code})`);
      st.done.set(a.code, rows.map((r) => ({ ...r, codigoOrgao: r.codigoOrgao ?? a.code, orgao: r.orgao ?? a.name })));
    } catch (e) {
      // limite de requisições/indisponibilidade no meio do caminho: guarda o que já veio e continua na próxima chamada
      if (e instanceof AppError && (e.kind === "RATE_LIMITED" || e.kind === "SOURCE_UNAVAILABLE") && st.done.size > 0) { reason = e.kind === "RATE_LIMITED" ? "limite de requisições da fonte" : "fonte indisponível"; break; }
      throw e;
    }
  }

  const rows = [...st.done.values()].flat();
  const dataset = cfg.codes ? "despesas/por-orgao (órgãos selecionados)" : "despesas/por-orgao";
  const p = parseDespesasOrgao(rows, unit, dataset);
  const endpoint = `${DESPESAS_ORGAO_PATH}?ano=${unit.year}&${cfg.param}=<${st.done.size}/${agencies.length} órgãos>`;
  if (st.done.size < agencies.length) {
    return { facts: p.facts, recordsReceived: rows.length, skipped: p.skipped, endpoint, incomplete: { done: st.done.size, total: agencies.length, reason: reason ?? "órgãos pendentes" } };
  }
  progress.delete(key);
  return { facts: p.facts, recordsReceived: rows.length, skipped: p.skipped, endpoint };
}

/* ───────────── contratos e órgãos ───────────── */

const CONTRACT_MAX_PAGES = 40;

export interface RawContract {
  id?: number | string; numero?: string; objeto?: string; dataInicioVigencia?: string; dataFimVigencia?: string; dataAssinatura?: string;
  valorInicialCompra?: number | string; valorFinalCompra?: number | string; valor?: number | string;
  fornecedor?: { cnpjFormatado?: string; cnpj?: string; cpfCnpj?: string; cpfFormatado?: string; nome?: string; razaoSocialReceita?: string };
  unidadeGestora?: { orgaoVinculado?: { codigoSIAFI?: string | number; nome?: string }; nome?: string };
  modalidadeCompra?: { descricao?: string };
}

/** "31/12/2024" ou "2024-12-31T…" → "2024-12-31". */
export function parseDateBR(v: string | undefined | null): string | null {
  if (!v) return null;
  let m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * Normaliza contratos. LGPD: fornecedor pessoa física (CPF) é DESCARTADO por inteiro — nada dele é guardado ou exibido.
 * Linhas sem id, CNPJ válido, valor ou data de início também são descartadas (não adivinhamos).
 */
export function parseContracts(rows: RawContract[]): { records: ContractRecord[]; skipped: number } {
  const seen = new Set<string>();
  const records: ContractRecord[] = [];
  let skipped = 0;
  for (const r of rows) {
    const f = r.fornecedor ?? {};
    const doc = onlyDigits(f.cnpjFormatado ?? f.cnpj ?? f.cpfCnpj ?? "");
    const id = r.id !== undefined && r.id !== null ? String(r.id) : "";
    const initial = parseNumber(r.valorInicialCompra ?? null);
    const final = parseNumber(r.valorFinalCompra ?? null);
    const value = final ?? initial ?? parseNumber(r.valor ?? null);
    const start = parseDateBR(r.dataInicioVigencia) ?? parseDateBR(r.dataAssinatura);
    const agency = r.unidadeGestora?.orgaoVinculado;
    if (doc.length !== 14 || !isValidCnpj(doc) || !id || value === null || value < 0 || !start || seen.has(id)) { skipped++; continue; }
    seen.add(id);
    records.push({
      id, number: r.numero?.trim() || null, object: r.objeto?.trim().slice(0, 600) || null, supplierCnpj: doc,
      supplierName: (f.razaoSocialReceita ?? f.nome ?? doc).trim(), agencyCode: String(agency?.codigoSIAFI ?? "").trim() || "NA",
      agencyName: (agency?.nome ?? r.unidadeGestora?.nome ?? "Órgão não informado").trim(), startDate: start,
      endDate: parseDateBR(r.dataFimVigencia), year: Number(start.slice(0, 4)), initialValue: initial, finalValue: final, value,
      modality: r.modalidadeCompra?.descricao?.trim() || null,
    });
  }
  return { records, skipped };
}

export function parseAgencies(rows: Array<{ codigo?: string | number; descricao?: string }>): Array<{ code: string; name: string }> {
  return rows.filter((r) => r.codigo !== undefined && r.descricao).map((r) => ({ code: String(r.codigo).trim(), name: String(r.descricao).trim() }));
}

async function searchContracts(q: ContractFetchQuery, ctx: FetchContext): Promise<ContractSearchResult> {
  const cfg = ctx.source.config as { contractsPath?: string; contractsBySupplierPath?: string };
  const path = q.by === "supplier"
    ? `/${cfg.contractsBySupplierPath ?? "contratos/cpf-cnpj"}?cpfCnpj=${q.cnpj}`
    : `/${cfg.contractsPath ?? "contratos"}?dataInicial=${encodeURIComponent(`01/01/${q.year}`)}&dataFinal=${encodeURIComponent(`31/12/${q.year}`)}&codigoOrgao=${q.agency}`;
  const rows: RawContract[] = [];
  let truncated = false;
  for (let pagina = 1; pagina <= CONTRACT_MAX_PAGES; pagina++) {
    const items = await getJson<RawContract[]>(ctx.http, { url: `${ctx.source.baseUrl}${path}&pagina=${pagina}`, headers: headers(ctx), label: "transparencia contratos" });
    if (!Array.isArray(items)) throw new AppError("BAD_RESPONSE", "transparencia contratos: esperado array");
    if (items.length === 0) break;
    rows.push(...items);
    if (pagina === CONTRACT_MAX_PAGES) truncated = true;
  }
  const { records, skipped } = parseContracts(rows);
  return { records, recordsReceived: rows.length, skipped, truncated, endpoint: path.replace(/cpfCnpj=\d+/, "cpfCnpj=***") };
}

/* ───────────── adaptador ───────────── */

export const transparenciaAdapter: IGovernmentSource = {
  definition: TRANSPARENCIA_DEFINITION,
  adapterKey: "transparencia",
  datasets: ["transparencia.despesas_orgao", "transparencia.bolsa_familia", "transparencia.bpc"],

  async testConnection(ctx) {
    if (!ctx.credential) {
      return { ok: false, httpStatus: null, latencyMs: 0, message: "Chave de API não configurada", technical: "credential ausente" };
    }
    return pingSource(ctx.http, healthUrl(ctx.source, TRANSPARENCIA_DEFINITION.healthPath), headers(ctx));
  },

  searchContracts,

  async listAgencies(ctx) {
    const rows = await fetchPages<{ codigo?: string | number; descricao?: string }>(ctx, "/orgaos-siafi", "transparencia orgaos-siafi");
    return parseAgencies(rows);
  },

  async fetchUnit(unit, ctx): Promise<FetchResult> {
    if (unit.dataset === "transparencia.despesas_orgao") {
      return fetchDespesasOrgao(unit, ctx);
    }
    if (unit.dataset === "transparencia.bolsa_familia" || unit.dataset === "transparencia.bpc") {
      const isBf = unit.dataset === "transparencia.bolsa_familia";
      const mesAno = `${unit.year}${String(unit.periodNumber).padStart(2, "0")}`;
      const cfg = ctx.source.config as { bolsaFamiliaPath?: string; bpcPath?: string };
      const ep = isBf ? (cfg.bolsaFamiliaPath ?? "novo-bolsa-familia-por-municipio") : (cfg.bpcPath ?? "bpc-por-municipio");
      const path = `/${ep}?mesAno=${mesAno}&codigoIbge=${unit.entity.code}`;
      const rows = await fetchPages<BenefitRow>(ctx, path, `transparencia ${isBf ? "bolsa-familia" : "bpc"}`);
      const p = parseBenefit(rows, unit, isBf ? "BOLSA_FAMILIA" : "BPC", isBf ? "Bolsa Família" : "Benefício de Prestação Continuada (BPC)", ep);
      return { facts: p.facts, recordsReceived: rows.length, skipped: p.skipped, endpoint: path };
    }
    throw new AppError("INTERNAL", `transparencia não suporta o dataset ${unit.dataset}`);
  },
};
