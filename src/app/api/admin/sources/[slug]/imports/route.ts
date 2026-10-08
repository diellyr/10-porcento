import { container } from "@/server/container";
import { adminHandle, assertSameOrigin } from "@/server/http-api";

type Ctx = { params: Promise<{ slug: string }> };

/** Conjuntos de dados que a fonte aceita em CSV + histórico das importações. */
export async function GET(req: Request, { params }: Ctx) {
  return adminHandle(req, async () => container().imports.overview((await params).slug));
}

/** Inicia uma importação (cria o registro); as linhas chegam depois, em lotes. */
export async function POST(req: Request, { params }: Ctx) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    return { import: await container().imports.start((await params).slug, await req.json(), actor) };
  }, 30);
}
