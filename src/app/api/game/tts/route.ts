import { NextResponse } from "next/server";
import { z } from "zod";
import { CHARACTERS } from "@/game/content/characters";
import { AppError } from "@/server/core/errors";
import { assertSameOrigin, handle } from "@/server/http-api";
import { gameRepo } from "@/server/game/service";
import { ttsSettings } from "@/server/game/integrations";
import { playerOrNull, requirePlayer } from "@/server/game/session";
import { readVoiceCache, renderVoice, voiceCacheKey, writeVoiceCache } from "@/server/game/tts";

/**
 * Voz neural sob demanda, com LIMITES e CACHE. Chave, modelo, vozes e limites vêm do painel administrativo (Admin → Jogo),
 * com variáveis de ambiente como alternativa. Sem chave, devolve 501 e o jogo segue com legendas (e a voz provisória do navegador).
 */
const Body = z.object({ personagem: z.string().max(20), texto: z.string().min(2).max(400), id: z.string().max(120).optional() });

export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "game-tts-s", limit: 60 } }, async () => {
    const u = await playerOrNull();
    const cfg = await ttsSettings();
    return NextResponse.json({ enabled: !!u && !!cfg.apiKey }, { headers: { "Cache-Control": "no-store" } });
  });
}

export async function POST(req: Request) {
  return handle(req, { rate: { bucket: "game-tts", limit: 40 } }, async () => {
    assertSameOrigin(req);
    const u = await requirePlayer();
    const cfg = await ttsSettings();
    const json = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } });
    if (!cfg.apiKey) return json(501, "voz neural não configurada");
    const b = Body.parse(await req.json());
    const ch = Object.values(CHARACTERS).find((c) => c.id === b.personagem && c.id !== "voce");
    if (!ch) throw new AppError("VALIDATION", "personagem inválido");
    const voice = cfg.voiceFor(ch.id);
    if (!voice.id) return json(501, `voz de ${ch.nome} não configurada`);

    const ok = (buf: Buffer | Uint8Array) => new Response(new Uint8Array(buf), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
    const key = voiceCacheKey(voice.id, b.texto);
    const hit = await readVoiceCache(key);
    if (hit) return ok(hit);
    if (!(await gameRepo().takeUsage(u.id, "tts", b.texto.length, cfg.maxCalls, cfg.maxChars))) throw new AppError("RATE_LIMITED", "limite diário de voz neural");
    const buf = await renderVoice({ apiKey: cfg.apiKey, voiceId: voice.id, model: cfg.model, text: b.texto });
    await writeVoiceCache(key, buf);
    return ok(buf);
  });
}
