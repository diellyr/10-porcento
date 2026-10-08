import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { container } from "@/server/container";

export const maxDuration = 60;

export async function POST(req: Request) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    return { results: await container().admin.testAll(actor) };
  }, 6);
}
