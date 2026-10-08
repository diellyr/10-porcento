import { z } from "zod";
import { container } from "@/server/container";
import { cacheable, handle } from "@/server/http-api";

const Q = z.object({ type: z.enum(["STATE", "MUNICIPALITY"]), uf: z.string().regex(/^[A-Z]{2}$/).optional(), limit: z.coerce.number().int().min(1).max(500).default(100), after: z.string().regex(/^\d{1,7}$/).optional() });

export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "entities", limit: 120 } }, async () => {
    const q = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
    const { data, router } = container();
    if ((await data.countEntities(q.type)) === 0) await router.catalog.ensure();
    const rows = await data.listEntities(q.type, { uf: q.uf, limit: q.limit, afterCode: q.after });
    return cacheable({ items: rows.map((e) => ({ type: e.type, code: e.code, name: e.name, uf: e.uf, population: e.population })), next: rows.length === q.limit ? rows.at(-1)!.code : null }, true, 3600);
  });
}
