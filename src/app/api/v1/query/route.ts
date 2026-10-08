import { container } from "@/server/container";
import { normalizeSpec } from "@/server/core/query-spec";
import { cacheable, handle, intParam, strParam } from "@/server/http-api";
import { isComplete, toPublic } from "@/server/services/public-query";

/** Contrato estável consumido pelo frontend. Qualquer backend futuro (Redis, ClickHouse…) deve honrá-lo. */
export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "query", limit: 120 } }, async () => {
    const sp = new URL(req.url).searchParams;
    const spec = normalizeSpec({
      kind: sp.get("kind") ?? "series", entity_type: sp.get("entity_type"), entity_code: sp.get("entity_code"), metric: sp.get("metric"),
      category_type: strParam(sp, "category_type"), category_code: strParam(sp, "category_code"), category_prefix: strParam(sp, "category_prefix"),
      year_from: intParam(sp, "year_from"), year_to: intParam(sp, "year_to"),
    });
    const { router, data } = container();
    const result = await router.execute(spec);
    const ent = await data.findEntity({ type: spec.entity_type, code: spec.entity_code });
    return cacheable(toPublic(result, ent ? { name: ent.name, uf: ent.uf } : undefined, { includePoints: sp.get("include_points") !== "0" }), isComplete(result));
  });
}
