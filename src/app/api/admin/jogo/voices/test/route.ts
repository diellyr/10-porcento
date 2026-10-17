import { z } from "zod";
import { CHARACTERS } from "@/game/content/characters";
import { AppError } from "@/server/core/errors";
import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { ttsSettings, VOICE_ID_RE } from "@/server/game/integrations";
import { readVoiceCache, renderVoice, voiceCacheKey, writeVoiceCache } from "@/server/game/tts";
import { speechText } from "@/game/audio/speech";

const Body = z.object({ personagem: z.string().max(20), texto: z.string().max(240).optional(), voiceId: z.string().max(64).optional() });

/** Toca uma amostra (admin). Aceita um ID de voz ainda não salvo, para experimentar antes de gravar. */
export async function POST(req: Request) {
  return adminHandle(req, async () => {
    assertSameOrigin(req);
    const b = Body.parse(await req.json());
    const ch = Object.values(CHARACTERS).find((c) => c.id === b.personagem && c.id !== "voce");
    if (!ch) throw new AppError("VALIDATION", "personagem inválido");
    const cfg = await ttsSettings();
    if (!cfg.apiKey) throw new AppError("SOURCE_NOT_CONFIGURED", "Cadastre a chave do ElevenLabs em Fontes de Dados → ElevenLabs.");
    const voiceId = b.voiceId?.trim() || cfg.voiceFor(ch.id).id;
    if (!voiceId || !VOICE_ID_RE.test(voiceId)) throw new AppError("VALIDATION", "ID de voz inválido");
    const text = speechText(b.texto?.trim() || `Oi, eu sou ${ch.nome}. A Upa recebeu cento e trinta mil reais para o estoque.`);
    const key = voiceCacheKey(voiceId, text);
    const buf = (await readVoiceCache(key)) ?? (await (async () => { const x = await renderVoice({ apiKey: cfg.apiKey!, voiceId, model: cfg.model, text }); await writeVoiceCache(key, x); return x; })());
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  }, 60);
}
