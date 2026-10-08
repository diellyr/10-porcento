import { container } from "@/server/container";
import { cacheable, handle, strParam } from "@/server/http-api";
import { z } from "zod";
import { ALL_SEARCH_TYPES, PLACE_TYPES, searchPlaces } from "@/server/services/search";
import type { EntityType } from "@/server/core/types";

export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "search", limit: 120 } }, async () => {
    const sp = new URL(req.url).searchParams;
    const q = strParam(sp, "q") ?? "";
    // types=places (padrão: estados e municípios) | all (inclui fornecedores e órgãos)
    const mode = z.enum(["places", "all"]).default("places").parse(sp.get("types") ?? undefined);
    const types: EntityType[] = mode === "all" ? ALL_SEARCH_TYPES : PLACE_TYPES;
    const { data, router } = container();
    const results = await searchPlaces(data, router.catalog, q, 8, types);
    return cacheable({ results: results.map((e) => ({ type: e.type, code: e.code, name: e.name, uf: e.uf, population: e.population })) }, true, 3600);
  });
}
