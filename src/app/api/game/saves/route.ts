import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, handle } from "@/server/http-api";
import { createSave, gameRepo } from "@/server/game/service";
import { requirePlayer } from "@/server/game/session";

export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "game-saves", limit: 60 } }, async () => {
    const u = await requirePlayer();
    return NextResponse.json({ saves: await gameRepo().listSaves(u.id) }, { headers: { "Cache-Control": "no-store" } });
  });
}
const Body = z.object({ gameId: z.string().min(8).max(80), actions: z.array(z.object({ id: z.string(), action: z.any() })).min(1).max(400) });
export async function POST(req: Request) {
  return handle(req, { rate: { bucket: "game-saves-w", limit: 20 } }, async () => {
    assertSameOrigin(req);
    const u = await requirePlayer();
    const b = Body.parse(await req.json());
    const state = await createSave(gameRepo(), u.id, b.actions);
    return { state };
  });
}
