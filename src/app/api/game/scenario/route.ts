import { NextResponse } from "next/server";
import { z } from "zod";
import { container } from "@/server/container";
import { handle } from "@/server/http-api";
import { buildScenario, gameRepo } from "@/server/game/service";
import { defaultYear } from "@/lib/server-api";

const Q = z.object({ code: z.string().regex(/^\d{7}$/), nome: z.string().trim().min(2).max(80), uf: z.string().regex(/^[A-Z]{2}$/).optional().or(z.literal("")) });

/** Congela o cenário com os dados oficiais já validados do Brasil Fiscal (consulta sob demanda + cache). Sem dado, não inventa: usa o padrão sinalizado. */
export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "game-scenario", limit: 12 } }, async () => {
    const q = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
    const scenario = await buildScenario(gameRepo(), container().router, { code: q.code, nome: q.nome, uf: q.uf || null }, defaultYear());
    return NextResponse.json({ scenario }, { headers: { "Cache-Control": "no-store" } });
  });
}
