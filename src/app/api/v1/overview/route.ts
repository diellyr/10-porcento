import { z } from "zod";
import { AppError } from "@/server/core/errors";
import { container } from "@/server/container";
import { cacheable, handle } from "@/server/http-api";
import { buildOverview } from "@/server/services/overview";

const Q = z.object({ entity_type: z.enum(["COUNTRY", "STATE", "MUNICIPALITY"]).default("COUNTRY"), entity_code: z.string().regex(/^\d{1,7}$/).default("1"), year: z.coerce.number().int().min(2000).optional() });

export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "overview", limit: 60 } }, async () => {
    const q = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
    const year = q.year ?? new Date().getUTCFullYear() - 1;
    const { data, router } = container();
    await router.ensureRegistry();
    let e = await data.findEntity({ type: q.entity_type, code: q.entity_code });
    if (!e) { await router.catalog.ensure(); e = await data.findEntity({ type: q.entity_type, code: q.entity_code }); }
    if (!e) throw new AppError("NOT_FOUND", `${q.entity_type}:${q.entity_code}`);
    const ov = await buildOverview(router, e, year);
    const complete = ov.indicators.every((i) => i.freshness === "fresh" || i.freshness === "cached");
    return cacheable(ov, complete);
  });
}
