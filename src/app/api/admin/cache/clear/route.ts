import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { container } from "@/server/container";

export async function POST(req: Request) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    return container().admin.clearCache(null, actor);
  }, 10);
}
