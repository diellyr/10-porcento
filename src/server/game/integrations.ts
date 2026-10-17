import { CHARACTERS } from "@/game/content/characters";
import { container } from "../container";
import { DEFAULT_VOICE_IDS } from "../sources/game-services";

/**
 * Credenciais e configuração das integrações do jogo. O painel administrativo (Source Registry, credencial cifrada) tem precedência;
 * variáveis de ambiente continuam valendo como alternativa; vozes sem ID próprio usam a sugestão padrão.
 */
export interface GameIntegration { apiKey: string | null; config: Record<string, unknown>; enabled: boolean }

const memo = new Map<string, { at: number; v: GameIntegration }>();
const TTL = 30_000;
export function resetIntegrationCache() { memo.clear(); }

export async function gameIntegration(slug: "elevenlabs-voz" | "anthropic-ia"): Promise<GameIntegration> {
  const hit = memo.get(slug);
  if (hit && Date.now() - hit.at < TTL) return hit.v;
  let v: GameIntegration = { apiKey: null, config: {}, enabled: true };
  try {
    const c = container();
    await c.router.ensureRegistry();
    const s = await c.registry.getBySlug(slug);
    if (s) v = { apiKey: s.enabled ? (await c.runtime.credential(s)).value : null, config: s.config ?? {}, enabled: s.enabled };
  } catch { /* sem registro (ex.: banco fora do ar): cai para variáveis de ambiente */ }
  if (!v.apiKey && v.enabled) v.apiKey = (slug === "elevenlabs-voz" ? process.env.ELEVENLABS_API_KEY : process.env.ANTHROPIC_API_KEY) ?? null;
  memo.set(slug, { at: Date.now(), v });
  return v;
}

export async function ttsConfigured(): Promise<boolean> { return !!(await gameIntegration("elevenlabs-voz")).apiKey; }

export async function aiSettings() {
  const g = await gameIntegration("anthropic-ia");
  const cfg = g.config as { model?: string; limiteDiarioChamadas?: number; limiteDiarioCaracteres?: number };
  return { apiKey: g.apiKey, model: cfg.model || process.env.GAME_AI_MODEL || "claude-haiku-5-5", maxCalls: cfg.limiteDiarioChamadas ?? 120, maxChars: cfg.limiteDiarioCaracteres ?? 60_000 };
}

export const VOICE_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export async function ttsSettings() {
  const g = await gameIntegration("elevenlabs-voz");
  const cfg = g.config as { model?: string; voices?: Record<string, string>; limiteDiarioChamadas?: number; limiteDiarioCaracteres?: number };
  const voiceFor = (charId: string): { id: string | null; origem: "painel" | "ambiente" | "padrao" } => {
    const own = cfg.voices?.[charId]?.trim();
    if (own && VOICE_ID_RE.test(own)) return { id: own, origem: "painel" };
    const ch = Object.values(CHARACTERS).find((c) => c.id === charId);
    const env = ch ? process.env[ch.voz.envVar] : undefined;
    if (env && VOICE_ID_RE.test(env)) return { id: env, origem: "ambiente" };
    const def = DEFAULT_VOICE_IDS[charId];
    return def ? { id: def, origem: "padrao" } : { id: null, origem: "padrao" };
  };
  return { apiKey: g.apiKey, model: cfg.model || process.env.TTS_MODEL || "eleven_multilingual_v2", maxCalls: cfg.limiteDiarioChamadas ?? 400, maxChars: cfg.limiteDiarioCaracteres ?? 40_000, voiceFor };
}
