import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { container } from "@/server/container";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    return container().admin.clearCache((await params).slug, actor);
  }, 20);
}
