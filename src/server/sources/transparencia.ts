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

export function parseDespesasOrgao(rows: DespesaOrgaoRow[], unit: FetchUnit): { facts: FactInput[]; skipped: number } {
  const facts: FactInput[] = [];
  let skipped = 0;
  for (const r of rows) {
    const code = String(r.codigoOrgao ?? "").trim();
    if (!code || !r.orgao) { skipped++; continue; }
    for (const [metric, raw] of [["EXPENSE_COMMITTED", r.empenhado], ["EXPENSE_LIQUIDATED", r.liquidado], ["EXPENSE_PAID", r.pago]] as const) {
      const value = parseNumber(raw);
      if (value === null) { skipped++; continue; }
      facts.push({
        entity_type: "COUNTRY", entity_code: unit.entity.code, related_type: "AGENCY", related_code: code, related_name: r.orgao.trim(),
        metric, category_type: "AGENCY", category_code: code, category_label: r.orgao.trim(),
        period_type: "YEAR", period_year: unit.year, period_number: 0, value, unit: "BRL", source_dataset: "despesas/por-orgao",
        source_record_id: code,
      });
    }
  }
  return { facts, skipped };
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
      const path = `/despesas/por-orgao?ano=${unit.year}`;
      const rows = await fetchPages<DespesaOrgaoRow>(ctx, path, "transparencia despesas/por-orgao");
      const p = parseDespesasOrgao(rows, unit);
      return { facts: p.facts, recordsReceived: rows.length, skipped: p.skipped, endpoint: path };
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
