import { z } from "zod";
import { AppError } from "@/server/core/errors";
import { assertSameOrigin, handle } from "@/server/http-api";
import { applyAndCommit, gameRepo } from "@/server/game/service";
import { requirePlayer } from "@/server/game/session";

const Body = z.object({ id: z.string().min(1).max(80), action: z.any(), version: z.number().int().min(0) });
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(req, { rate: { bucket: "game-action", limit: 240 } }, async () => {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    if (!/^[0-9a-zA-Z-]{8,80}$/.test(id)) throw new AppError("VALIDATION", "id inválido");
    const u = await requirePlayer();
    const b = Body.parse(await req.json());
    const r = await applyAndCommit(gameRepo(), u.id, id, b.id, b.action, b.version);
    return { state: r.state, duplicate: r.duplicate };
  });
}
