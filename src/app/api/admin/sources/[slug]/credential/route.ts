import { z } from "zod";
import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { container } from "@/server/container";

type Ctx = { params: Promise<{ slug: string }> };

/** O valor chega uma única vez, é cifrado no servidor e NUNCA é devolvido: a resposta traz apenas a máscara. */
export async function PUT(req: Request, { params }: Ctx) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    const { value } = z.object({ value: z.string().min(8).max(512) }).parse(await req.json());
    return { source: await container().admin.setCredential((await params).slug, value, actor) };
  }, 20);
}

export async function DELETE(req: Request, { params }: Ctx) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    return { source: await container().admin.clearCredential((await params).slug, actor) };
  }, 20);
}
