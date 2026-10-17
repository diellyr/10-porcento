import { createHash } from "node:crypto";
import { AppError } from "../core/errors";
import { DEV_FIXTURES_ENABLED } from "../dev/fixtures";
import { serviceClient } from "../repositories/supabase/client";

const mem = new Map<string, Buffer>();

/** Chave do cache de voz: a mesma para o jogo e para o painel, então o que o painel gera já serve aos jogadores. */
export const voiceCacheKey = (voiceId: string, text: string) => createHash("sha256").update(`${voiceId}|${text}`).digest("hex");

export async function readVoiceCache(key: string): Promise<Buffer | null> {
  if (DEV_FIXTURES_ENABLED()) return mem.get(key) ?? null;
  const hit = await serviceClient().storage.from("game-audio").download(`tts/${key}.mp3`).catch(() => null);
  return hit?.data ? Buffer.from(await hit.data.arrayBuffer()) : null;
}

export async function writeVoiceCache(key: string, buf: Buffer): Promise<void> {
  if (DEV_FIXTURES_ENABLED()) { mem.set(key, buf); return; }
  await serviceClient().storage.from("game-audio").upload(`tts/${key}.mp3`, buf, { contentType: "audio/mpeg", upsert: true }).catch(() => undefined);
}

/** Chama o ElevenLabs. Lança SOURCE_UNAVAILABLE com o motivo (sem expor a chave). */
export async function renderVoice(o: { apiKey: string; voiceId: string; model: string; text: string }): Promise<Buffer> {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${o.voiceId}?output_format=mp3_44100_64`, {
    method: "POST", headers: { "xi-api-key": o.apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: o.text, model_id: o.model, language_code: "pt", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 } }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!r?.ok) {
    const detail = r ? (await r.text().catch(() => "")).slice(0, 200) : "falha de rede";
    throw new AppError("SOURCE_UNAVAILABLE", `ElevenLabs ${r?.status ?? ""} ${r?.status === 404 ? "(voz não encontrada: confira o ID)" : r?.status === 401 ? "(chave recusada)" : ""} ${detail}`.replace(/\s+/g, " ").trim());
  }
  return Buffer.from(await r.arrayBuffer());
}
