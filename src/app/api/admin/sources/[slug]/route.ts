import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { container } from "@/server/container";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Ctx) {
  return adminHandle(req, async () => ({ source: await container().admin.get((await params).slug) }));
}

export async function PATCH(req: Request, { params }: Ctx) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    return { source: await container().admin.updateSettings((await params).slug, await req.json(), actor) };
  });
}
