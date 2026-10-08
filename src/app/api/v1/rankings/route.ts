import { container } from "@/server/container";
import { cacheable, handle } from "@/server/http-api";

/** Rankings entre estados ou municípios sobre dados salvos, sempre com cobertura (`covered` de `total`). */
export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "rankings", limit: 60 } }, async () => {
    const r = await container().rankings.rank(Object.fromEntries(new URL(req.url).searchParams));
    return cacheable(r, r.complete, 120);
  });
}
