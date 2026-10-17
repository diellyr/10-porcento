import { z } from "zod";
import { CAPITAIS } from "@/game/content/capitais";
import { AppError } from "@/server/core/errors";
import { container } from "@/server/container";
import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { buildScenario, gameRepo } from "@/server/game/service";
import { defaultYear } from "@/lib/server-api";

const Body = z.object({ code: z.string().regex(/^\d{7}$/), final: z.boolean().optional(), resumo: z.object({ ok: z.number(), semDado: z.number(), falhas: z.number() }).optional() });

/** Consulta a fonte oficial (Siconfi) para UMA capital, salva os fatos no banco e congela o cenário. O painel chama uma de cada vez. */
export async function POST(req: Request) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    const b = Body.parse(await req.json());
    if (b.final && b.resumo) {
      await container().registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "game.preload", targetType: "game", targetId: "capitais", details: b.resumo });
      return { ok: true };
    }
    const cap = CAPITAIS.find((c) => c.code === b.code);
    if (!cap) throw new AppError("VALIDATION", "Só as capitais podem ser pré-carregadas aqui");
    const sc = await buildScenario(gameRepo(), container().router, { code: cap.code, nome: cap.nome, uf: cap.uf }, defaultYear());
    const ref = sc.reference;
    return { code: cap.code, nome: cap.nome, uf: cap.uf, healthSpending: ref?.healthSpending ?? null, year: ref?.year ?? null, freshness: ref?.freshness ?? "unavailable", notice: ref?.notice ?? null };
  }, 120);
}
