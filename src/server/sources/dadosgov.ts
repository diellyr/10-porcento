import { AppError } from "../core/errors";
import type { CatalogItem, FetchContext, IGovernmentSource } from "../core/interfaces";
import type { SourceDefinition } from "../core/types";
import { getJson, healthUrl, pingSource } from "./http";

export const DADOSGOV_DEFINITION: SourceDefinition = {
  slug: "dados-gov-br",
  name: "dados.gov.br",
  description: "Catálogo do Portal Brasileiro de Dados Abertos: descoberta de novos conjuntos de dados governamentais.",
  provider: "Governo Federal (MGI)",
  category: "catalogo",
  sourceType: "REST_API",
  baseUrl: "https://dados.gov.br/dados/api/publico",
  documentationUrl: "https://dados.gov.br/swagger-ui/index.html",
  authType: "API_KEY_HEADER",
  requiresAuth: true,
  priority: 50,
  rateLimitPerMinute: 30,
  cacheTtlMinutes: 10080,
  healthPath: "/conjuntos-dados?pagina=1&nomeConjuntoDados=arrecadacao",
  config: { keyHeader: "chave-api-dados-abertos" },
};

function headers(ctx: FetchContext): Record<string, string> {
  if (!ctx.credential) throw new AppError("SOURCE_NOT_CONFIGURED", "dados.gov.br: token não configurado");
  const name = (ctx.source.config as { keyHeader?: string }).keyHeader ?? "chave-api-dados-abertos";
  return { [name]: ctx.credential };
}

interface RawDataset {
  id?: string; titulo?: string; descricao?: string; nomeOrganizacao?: string; organizacao?: string; recursos?: Array<{ formato?: string }>;
}

export function parseCatalog(body: unknown): CatalogItem[] {
  const arr = Array.isArray(body) ? body : (body as { registros?: unknown[] })?.registros;
  if (!Array.isArray(arr)) throw new AppError("BAD_RESPONSE", "dados.gov.br: formato de catálogo inesperado");
  return (arr as RawDataset[]).filter((d) => d.id && d.titulo).map((d) => ({
    id: String(d.id), title: String(d.titulo), description: d.descricao ?? null, organization: d.nomeOrganizacao ?? d.organizacao ?? null,
    url: `https://dados.gov.br/dados/conjuntos-dados/${d.id}`,
    formats: [...new Set((d.recursos ?? []).map((r) => (r.formato ?? "").toUpperCase()).filter(Boolean))],
  }));
}

export const dadosGovAdapter: IGovernmentSource = {
  definition: DADOSGOV_DEFINITION,
  adapterKey: "dadosgov",
  datasets: [],
  async testConnection(ctx) {
    if (!ctx.credential) return { ok: false, httpStatus: null, latencyMs: 0, message: "Token não configurado", technical: "credential ausente" };
    return pingSource(ctx.http, healthUrl(ctx.source, DADOSGOV_DEFINITION.healthPath), headers(ctx));
  },
  async fetchUnit() {
    throw new AppError("INTERNAL", "dados.gov.br é um catálogo; não fornece fatos fiscais");
  },
  async searchCatalog(query, ctx) {
    const url = `${ctx.source.baseUrl}/conjuntos-dados?pagina=1&nomeConjuntoDados=${encodeURIComponent(query)}`;
    return parseCatalog(await getJson(ctx.http, { url, headers: headers(ctx), label: "dados.gov.br catálogo" })).slice(0, 20);
  },
};
