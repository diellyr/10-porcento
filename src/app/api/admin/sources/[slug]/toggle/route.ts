import { z } from "zod";
import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { container } from "@/server/container";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    const { enabled } = z.object({ enabled: z.boolean() }).parse(await req.json());
    return { source: await container().admin.setEnabled((await params).slug, enabled, actor) };
  });
}
