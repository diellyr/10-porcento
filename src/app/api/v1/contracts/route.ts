import { container } from "@/server/container";
import { cacheable, handle, strParam } from "@/server/http-api";

/**
 * Contratos públicos por fornecedor (CNPJ) ou por órgão + ano.
 * LGPD: apenas pessoa jurídica; CPF é recusado (400) e registros de pessoa física nunca são guardados.
 */
export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "contracts", limit: 30 } }, async () => {
    const sp = new URL(req.url).searchParams;
    const r = await container().contracts.search({
      cnpj: strParam(sp, "cnpj"), agency: strParam(sp, "agency"), year: strParam(sp, "year"), limit: strParam(sp, "limit"), cursor: strParam(sp, "cursor"),
    });
    return cacheable(r, r.freshness === "fresh" || r.freshness === "cached", 300);
  });
}
