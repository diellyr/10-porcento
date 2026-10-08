import { z } from "zod";
import { AppError } from "@/server/core/errors";
import { container } from "@/server/container";
import { FISCAL_METRICS } from "@/server/core/types";
import { cacheable, handle } from "@/server/http-api";
import { buildPer100 } from "@/server/services/overview";

const Q = z.object({
  side: z.enum(["expense", "revenue"]).default("expense"),
  lens: z.enum(["function", "nature", "origin", "tax"]).default("function"),
  entity_type: z.enum(["COUNTRY", "STATE", "MUNICIPALITY"]).default("COUNTRY"),
  entity_code: z.string().regex(/^\d{1,7}$/).default("1"),
  year: z.coerce.number().int().min(2000).optional(),
  metric: z.enum(FISCAL_METRICS).optional(),
});

export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "per100", limit: 60 } }, async () => {
    const q = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
    if ((q.side === "expense") !== (q.lens === "function" || q.lens === "nature")) throw new AppError("VALIDATION", "lente incompatível com o lado");
    const { data, router } = container();
    await router.ensureRegistry();
    let e = await data.findEntity({ type: q.entity_type, code: q.entity_code });
    if (!e) { await router.catalog.ensure(); e = await data.findEntity({ type: q.entity_type, code: q.entity_code }); }
    if (!e) throw new AppError("NOT_FOUND", `${q.entity_type}:${q.entity_code}`);
    const res = await buildPer100(router, e, { side: q.side, lens: q.lens, year: q.year ?? new Date().getUTCFullYear() - 1, metric: q.metric });
    return cacheable(res, res.freshness === "fresh" || res.freshness === "cached");
  });
}
