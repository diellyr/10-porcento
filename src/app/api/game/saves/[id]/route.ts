import { NextResponse } from "next/server";
import { AppError } from "@/server/core/errors";
import { assertSameOrigin, handle } from "@/server/http-api";
import { gameRepo } from "@/server/game/service";
import { requirePlayer } from "@/server/game/session";

const ID = /^[0-9a-zA-Z-]{8,80}$/;
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(req, { rate: { bucket: "game-save", limit: 120 } }, async () => {
    const { id } = await ctx.params;
    if (!ID.test(id)) throw new AppError("VALIDATION", "id inválido");
    const u = await requirePlayer();
    const s = await gameRepo().getSave(u.id, id);
    if (!s) throw new AppError("NOT_FOUND", "partida");
    return NextResponse.json({ state: s }, { headers: { "Cache-Control": "no-store" } });
  });
}
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(req, { rate: { bucket: "game-save-d", limit: 20 } }, async () => {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    if (!ID.test(id)) throw new AppError("VALIDATION", "id inválido");
    const u = await requirePlayer();
    await gameRepo().deleteSave(u.id, id);
    return { ok: true };
  });
}
