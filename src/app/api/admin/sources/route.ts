import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { container } from "@/server/container";

export async function GET(req: Request) {
  return adminHandle(req, async () => {
    const { admin } = container();
    return { sources: await admin.list(), adapters: admin.adapterOptions() };
  });
}

/** + Adicionar fonte */
export async function POST(req: Request) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    return { source: await container().admin.addSource(await req.json(), actor) };
  }, 20);
}
