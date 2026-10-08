import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

/** Versão em execução no servidor. O navegador compara com a versão do código que ele carregou e avisa para atualizar. */
export async function GET() {
  return NextResponse.json({ version: APP_VERSION }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
