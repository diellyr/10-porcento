import { z } from "zod";
import { AppError } from "@/server/core/errors";
import { container } from "@/server/container";
import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { ttsSettings } from "@/server/game/integrations";
import { readVoiceCache, renderVoice, voiceCacheKey, writeVoiceCache } from "@/server/game/tts";
import { staticVoiceLines } from "@/server/game/voice-lines";

const Body = z.object({ id: z.string().max(120), final: z.boolean().optional(), resumo: z.object({ geradas: z.number(), emCache: z.number(), falhas: z.number() }).optional() });

/** Gera UMA fala e guarda no cache compartilhado (o jogo a usa sem gastar cota). O painel chama uma por vez e mostra o progresso. */
export async function POST(req: Request) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    const b = Body.parse(await req.json());
    if (b.final && b.resumo) {
      await container().registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "game.voices.generated", targetType: "game", targetId: "voices", details: b.resumo });
      return { ok: true };
    }
    const line = staticVoiceLines().find((l) => l.id === b.id);
    if (!line) throw new AppError("NOT_FOUND", "fala inexistente");
    const cfg = await ttsSettings();
    if (!cfg.apiKey) throw new AppError("SOURCE_NOT_CONFIGURED", "Cadastre a chave do ElevenLabs em Fontes de Dados → ElevenLabs.");
    const voice = cfg.voiceFor(line.personagem);
    if (!voice.id) throw new AppError("VALIDATION", `Sem voz para ${line.nome}`);
    const key = voiceCacheKey(voice.id, line.texto);
    if (await readVoiceCache(key)) return { status: "cache", chars: line.texto.length };
    await writeVoiceCache(key, await renderVoice({ apiKey: cfg.apiKey, voiceId: voice.id, model: cfg.model, text: line.texto }));
    return { status: "gerado", chars: line.texto.length };
  }, 400);
}
