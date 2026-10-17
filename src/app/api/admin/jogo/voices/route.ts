import { z } from "zod";
import { CHARACTERS } from "@/game/content/characters";
import { AppError } from "@/server/core/errors";
import { container } from "@/server/container";
import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { gameIntegration, resetIntegrationCache, VOICE_ID_RE } from "@/server/game/integrations";

const Body = z.object({
  voices: z.record(z.string().max(64)),
  model: z.string().regex(/^[a-z0-9_]{3,40}$/).optional(),
  limiteDiarioChamadas: z.number().int().min(0).max(100_000).optional(),
  limiteDiarioCaracteres: z.number().int().min(0).max(5_000_000).optional(),
}).strict();

/** Salva os IDs de voz por personagem (vazio = voltar ao padrão), o modelo e os limites diários. Segredos não passam por aqui. */
export async function PUT(req: Request) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    const b = Body.parse(await req.json());
    const known = new Set(Object.keys(CHARACTERS));
    const voices: Record<string, string> = {};
    for (const [id, v] of Object.entries(b.voices)) {
      const t = v.trim();
      if (!known.has(id)) continue;
      if (t && !VOICE_ID_RE.test(t)) throw new AppError("VALIDATION", `ID de voz inválido para ${CHARACTERS[id as keyof typeof CHARACTERS].nome}`);
      if (t) voices[id] = t;
    }
    const cur = (await gameIntegration("elevenlabs-voz")).config;
    const config = { ...cur, voices, ...(b.model ? { model: b.model } : {}), ...(b.limiteDiarioChamadas !== undefined ? { limiteDiarioChamadas: b.limiteDiarioChamadas } : {}), ...(b.limiteDiarioCaracteres !== undefined ? { limiteDiarioCaracteres: b.limiteDiarioCaracteres } : {}) };
    const source = await container().admin.updateSettings("elevenlabs-voz", { config }, actor);
    resetIntegrationCache();
    return { source };
  }, 30);
}
