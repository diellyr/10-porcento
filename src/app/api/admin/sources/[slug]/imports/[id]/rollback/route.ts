import { container } from "@/server/container";
import { adminHandle, assertSameOrigin } from "@/server/http-api";

export const maxDuration = 60;

/** Desfaz a importação: apaga os dados do CSV e devolve as unidades para a API. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    const { slug, id } = await params;
    return container().imports.rollback(slug, id, actor);
  }, 30);
}
