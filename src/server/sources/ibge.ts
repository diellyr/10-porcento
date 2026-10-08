import { AppError } from "../core/errors";
import { UF_BY_CODE } from "../core/geo";
import type { EntityCandidate, IGovernmentSource } from "../core/interfaces";
import type { SourceDefinition } from "../core/types";
import { getJson, healthUrl, pingSource } from "./http";

export const IBGE_DEFINITION: SourceDefinition = {
  slug: "ibge-localidades",
  name: "IBGE — Localidades",
  description: "Catálogo oficial de estados e municípios com códigos IBGE. Fonte alternativa para o cadastro de entes quando o SICONFI estiver indisponível.",
  provider: "IBGE",
  category: "cadastro",
  sourceType: "REST_API",
  baseUrl: "https://servicodados.ibge.gov.br/api/v1/localidades",
  documentationUrl: "https://servicodados.ibge.gov.br/api/docs/localidades",
  authType: "NONE",
  requiresAuth: false,
  priority: 60,
  rateLimitPerMinute: 30,
  cacheTtlMinutes: 43200,
  healthPath: "/estados/35",
};

interface Municipio { id: number; nome: string; microrregiao?: { mesorregiao?: { UF?: { id: number; sigla: string } } }; "regiao-imediata"?: { "regiao-intermediaria"?: { UF?: { id: number; sigla: string } } } }

export function parseMunicipios(rows: Municipio[]): EntityCandidate[] {
  const out: EntityCandidate[] = [];
  for (const m of rows) {
    const code = String(m.id);
    const uf = m.microrregiao?.mesorregiao?.UF?.sigla ?? m["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla ?? UF_BY_CODE[code.slice(0, 2)] ?? null;
    if (code.length !== 7 || !m.nome) continue;
    out.push({ type: "MUNICIPALITY", code, name: m.nome, uf, population: null, parentCode: code.slice(0, 2) });
  }
  return out;
}

export const ibgeAdapter: IGovernmentSource = {
  definition: IBGE_DEFINITION,
  adapterKey: "ibge",
  datasets: [],
  async testConnection(ctx) {
    return pingSource(ctx.http, healthUrl(ctx.source, IBGE_DEFINITION.healthPath));
  },
  async fetchUnit() {
    throw new AppError("INTERNAL", "IBGE Localidades não fornece fatos fiscais");
  },
  async listEntities(ctx) {
    const states = await getJson<Array<{ id: number; sigla: string; nome: string }>>(ctx.http, { url: `${ctx.source.baseUrl}/estados`, label: "ibge estados" });
    const munis = await getJson<Municipio[]>(ctx.http, { url: `${ctx.source.baseUrl}/municipios`, label: "ibge municípios" });
    const out: EntityCandidate[] = [{ type: "COUNTRY", code: "1", name: "Brasil", uf: null, population: null, parentCode: null }];
    for (const s of states) out.push({ type: "STATE", code: String(s.id), name: s.nome, uf: s.sigla, population: null, parentCode: "1" });
    return [...out, ...parseMunicipios(munis)];
  },
};
