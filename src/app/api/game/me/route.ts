import { NextResponse } from "next/server";
import { handle } from "@/server/http-api";
import { gameRepo } from "@/server/game/service";
import { ttsConfigured } from "@/server/game/integrations";
import { playerOrNull, supabaseConfigured } from "@/server/game/session";
import { DEV_FIXTURES_ENABLED } from "@/server/dev/fixtures";

export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "game-me", limit: 120 } }, async () => {
    const u = await playerOrNull();
    const supabase = supabaseConfigured() || DEV_FIXTURES_ENABLED();
    let nome: string | null = null, avatar: string | null = null;
    if (u && supabase) { try { const p = await gameRepo().getProfile(u.id); nome = p?.display_name ?? null; avatar = p?.avatar ?? null; } catch { /* perfil ainda não criado ou tabela ausente */ } }
    const res = NextResponse.json({ logado: !!u, email: u?.email ?? null, nome, avatar, supabase, tts: await ttsConfigured() });
    res.headers.set("Cache-Control", "no-store");
    return res;
  });
}
