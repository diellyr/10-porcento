import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, assertSameOrigin } from "@/server/http-api";
import { gameRepo } from "@/server/game/service";
import { requirePlayer } from "@/server/game/session";

const Body = z.object({ display_name: z.string().trim().min(2).max(28), avatar: z.string().regex(/^av[1-9]$/), pseudonym: z.string().trim().min(2).max(24).nullable().optional(), share_results: z.boolean().optional() });

export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "game-profile", limit: 60 } }, async () => {
    const u = await requirePlayer();
    const repo = gameRepo();
    const [p, saves, conquistas] = await Promise.all([repo.getProfile(u.id), repo.listSaves(u.id), repo.listAchievements(u.id)]);
    const finais: Record<string, number> = {};
    for (const s of saves) if (s.final) finais[s.final] = (finais[s.final] ?? 0) + 1;
    return NextResponse.json({ email: u.email, profile: p, saves, conquistas, estatisticas: { partidas: saves.length, concluidas: saves.filter((s) => s.final).length, finais } }, { headers: { "Cache-Control": "no-store" } });
  });
}
export async function PUT(req: Request) {
  return handle(req, { rate: { bucket: "game-profile-w", limit: 20 } }, async () => {
    assertSameOrigin(req);
    const u = await requirePlayer();
    const b = Body.parse(await req.json());
    await gameRepo().upsertProfile({ user_id: u.id, display_name: b.display_name, avatar: b.avatar, pseudonym: b.pseudonym ?? null, share_results: b.share_results ?? false });
    return { ok: true };
  });
}
