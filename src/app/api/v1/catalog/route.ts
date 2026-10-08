import { container } from "@/server/container";
import { AppError } from "@/server/core/errors";
import { handle, strParam } from "@/server/http-api";

/** Descoberta de datasets no catálogo dados.gov.br (usa a credencial da fonte, que nunca sai do servidor). */
export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "catalog", limit: 10 } }, async () => {
    const q = strParam(new URL(req.url).searchParams, "q");
    if (!q || q.length < 3 || q.length > 80) throw new AppError("VALIDATION", "q inválido");
    const { registry, runtime, router } = container();
    await router.ensureRegistry();
    const source = await registry.getBySlug("dados-gov-br");
    if (!source) throw new AppError("NOT_FOUND", "fonte ausente");
    if (!source.enabled) throw new AppError("SOURCE_DISABLED", "dados.gov.br desativada");
    const adapter = runtime.adapterFor(source);
    const ctx = await runtime.context(source);
    if (!adapter?.searchCatalog) throw new AppError("INTERNAL", "adaptador sem catálogo");
    return { items: await adapter.searchCatalog(q, ctx) };
  });
}
