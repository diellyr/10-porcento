import { AppError } from "@/server/core/errors";
import { container } from "@/server/container";
import { cacheable, handle } from "@/server/http-api";

export async function GET(req: Request, ctx: { params: Promise<{ type: string; code: string }> }) {
  return handle(req, { rate: { bucket: "entity", limit: 120 } }, async () => {
    const { type, code } = await ctx.params;
    const t = type.toUpperCase();
    if ((t !== "STATE" && t !== "MUNICIPALITY" && t !== "COUNTRY") || !/^\d{1,7}$/.test(code)) throw new AppError("VALIDATION", "tipo/código inválido");
    const { data, router } = container();
    let e = await data.findEntity({ type: t, code });
    if (!e) { await router.catalog.ensure(); e = await data.findEntity({ type: t, code }); }
    if (!e) throw new AppError("NOT_FOUND", `${t}:${code}`);
    const breadcrumb = [{ type: "COUNTRY", code: "1", name: "Brasil" }];
    if (t === "MUNICIPALITY") {
      const st = await data.findEntity({ type: "STATE", code: code.slice(0, 2) });
      if (st) breadcrumb.push({ type: "STATE", code: st.code, name: st.name });
    }
    if (t !== "COUNTRY") breadcrumb.push({ type: e.type, code: e.code, name: e.name });
    return cacheable({ entity: { type: e.type, code: e.code, name: e.name, uf: e.uf, population: e.population }, breadcrumb }, true, 3600);
  });
}
