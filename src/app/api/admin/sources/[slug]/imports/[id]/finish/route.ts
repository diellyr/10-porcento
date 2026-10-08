import { container } from "@/server/container";
import { adminHandle, assertSameOrigin } from "@/server/http-api";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    const { slug, id } = await params;
    return { import: await container().imports.finish(slug, id, actor) };
  }, 30);
}
