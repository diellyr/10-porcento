import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { container } from "@/server/container";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    return container().admin.forceRefresh((await params).slug, actor);
  }, 10);
}
