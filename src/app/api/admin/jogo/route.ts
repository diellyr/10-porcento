import { CHARACTERS } from "@/game/content/characters";
import { container } from "@/server/container";
import { adminHandle } from "@/server/http-api";
import { gameIntegration, ttsSettings } from "@/server/game/integrations";
import { staticVoiceLines } from "@/server/game/voice-lines";
import { DEFAULT_VOICE_IDS } from "@/server/sources/game-services";
import { serviceClient } from "@/server/repositories/supabase/client";
import { DEV_FIXTURES_ENABLED } from "@/server/dev/fixtures";

/** Integrações usadas pelo jogo, na ordem em que aparecem no painel. */
const GAME_SLUGS = ["siconfi", "ibge-localidades", "portal-transparencia", "dados-gov-br", "elevenlabs-voz", "anthropic-ia"] as const;

async function count(table: string): Promise<number | null> {
  if (DEV_FIXTURES_ENABLED()) return null;
  try { const r = await serviceClient().from(table).select("*", { count: "exact", head: true }); return r.error ? null : r.count ?? 0; } catch { return null; }
}

export async function GET(req: Request) {
  return adminHandle(req, async () => {
    const c = container();
    const integrations = (await Promise.all(GAME_SLUGS.map(async (slug) => { try { return await c.admin.get(slug); } catch { return null; } }))).filter((x) => x !== null);
    const tts = await ttsSettings();
    const eleven = await gameIntegration("elevenlabs-voz");
    const own = ((eleven.config as { voices?: Record<string, string> }).voices) ?? {};
    const personagens = Object.values(CHARACTERS).filter((ch) => ch.id !== "voce").map((ch) => ({
      id: ch.id, nome: ch.nome, papel: ch.papel, genero: ch.voz.genero, direcao: ch.voz.direcao,
      voiceId: own[ch.id] ?? "", efetivo: tts.voiceFor(ch.id), padrao: DEFAULT_VOICE_IDS[ch.id] ?? null,
    }));
    const falas = staticVoiceLines();
    const [perfis, partidas, eventos, cenarios, fatos, entes] = await Promise.all(["game_profiles", "game_saves", "game_events", "game_scenarios", "fiscal_facts", "entities"].map(count));
    return {
      integrations, model: tts.model,
      voices: { personagens, falas: falas.length, caracteres: falas.reduce((s, l) => s + l.texto.length, 0) },
      banco: { perfis, partidas, eventos, cenarios, fatos, entes },
      ambiente: { supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY, chaveCredenciais: !!process.env.CREDENTIALS_ENCRYPTION_KEY },
    };
  });
}
