import { container } from "@/server/container";
import { adminHandle, assertSameOrigin } from "@/server/http-api";

export const maxDuration = 60;

/** Recebe um lote de linhas já mapeadas (até 4000) e grava. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  return adminHandle(req, async () => {
    assertSameOrigin(req);
    const { slug, id } = await params;
    return container().imports.chunk(slug, id, await req.json());
  }, 600);
}
