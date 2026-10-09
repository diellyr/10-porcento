import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CHARACTERS } from "@/game/content/characters";
import { AppError } from "@/server/core/errors";
import { DEV_FIXTURES_ENABLED } from "@/server/dev/fixtures";
import { assertSameOrigin, handle } from "@/server/http-api";
import { gameRepo } from "@/server/game/service";
import { playerOrNull, requirePlayer, ttsConfigured } from "@/server/game/session";
import { serviceClient } from "@/server/repositories/supabase/client";

/**
 * Voz neural sob demanda, com LIMITES e CACHE. Provedor: ElevenLabs (API key em ELEVENLABS_API_KEY).
 * O ID da voz de cada personagem vem de variável de ambiente (TTS_VOICE_<PERSONAGEM>) — nunca do código.
 * Sem chave/ID, devolve 501 e o jogo segue com legendas (e a voz provisória do navegador).
 */
const MAX_CALLS = 400, MAX_CHARS = 40_000;
const Body = z.object({ personagem: z.string().max(20), texto: z.string().min(2).max(400), id: z.string().max(120).optional() });
const mem = new Map<string, Buffer>();

export async function GET(req: Request) {
  return handle(req, { rate: { bucket: "game-tts-s", limit: 60 } }, async () => {
    const u = await playerOrNull();
    return NextResponse.json({ enabled: !!u && ttsConfigured() }, { headers: { "Cache-Control": "no-store" } });
  });
}

export async function POST(req: Request) {
  return handle(req, { rate: { bucket: "game-tts", limit: 40 } }, async () => {
    assertSameOrigin(req);
    const u = await requirePlayer();
    if (!ttsConfigured()) return new Response(JSON.stringify({ error: "voz neural não configurada" }), { status: 501, headers: { "Content-Type": "application/json" } });
    const b = Body.parse(await req.json());
    const ch = Object.values(CHARACTERS).find((c) => c.id === b.personagem && c.id !== "voce");
    if (!ch) throw new AppError("VALIDATION", "personagem inválido");
    const voiceId = process.env[ch.voz.envVar];
    if (!voiceId || !/^[A-Za-z0-9_-]{8,64}$/.test(voiceId)) return new Response(JSON.stringify({ error: `voz de ${ch.nome} não configurada (${ch.voz.envVar})` }), { status: 501, headers: { "Content-Type": "application/json" } });

    const key = createHash("sha256").update(`${voiceId}|${b.texto}`).digest("hex");
    const path = `tts/${key}.mp3`;
    const ok = (buf: Buffer | Uint8Array) => new Response(new Uint8Array(buf), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });

    if (DEV_FIXTURES_ENABLED()) { const c = mem.get(key); if (c) return ok(c); }
    else {
      const hit = await serviceClient().storage.from("game-audio").download(path).catch(() => null);
      if (hit?.data) return ok(Buffer.from(await hit.data.arrayBuffer()));
    }
    if (!(await gameRepo().takeUsage(u.id, "tts", b.texto.length, MAX_CALLS, MAX_CHARS))) throw new AppError("RATE_LIMITED", "limite diário de voz neural");

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`, {
      method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: b.texto, model_id: process.env.TTS_MODEL ?? "eleven_multilingual_v2", language_code: "pt", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 } }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!r?.ok) throw new AppError("SOURCE_UNAVAILABLE", `tts ${r?.status ?? "falha de rede"}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (DEV_FIXTURES_ENABLED()) mem.set(key, buf);
    else await serviceClient().storage.from("game-audio").upload(path, buf, { contentType: "audio/mpeg", upsert: true }).catch(() => undefined);
    return ok(buf);
  });
}
