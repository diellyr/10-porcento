import { AppError } from "../core/errors";
import type { IGovernmentSource } from "../core/interfaces";
import type { SourceDefinition } from "../core/types";
import { healthUrl, pingSource } from "./http";

/**
 * Integrações do JOGO que não são fontes de dados fiscais, mas seguem o mesmo cadastro (Source Registry):
 * status, teste de conexão, credencial cifrada e configuração editável no painel administrativo.
 */

/** Vozes sugeridas (vozes prontas do ElevenLabs, sem custo de biblioteca). São PONTO DE PARTIDA: troque pelas que preferir. */
export const DEFAULT_VOICE_IDS: Record<string, string> = {
  joana: "EXAVITQu4vr4xnSDxMaL", celia: "21m00Tcm4TlvDq8ikWAM", ana: "MF3mGyEYCl7XYWbV9V6O", marlene: "AZnzlk1XvdvUeBnXmlld",
  guardiao: "pNInz6obpgDQGcFmaJgB", toninho: "TxGEqnHWrfWFTfGW9XjX", juninho: "ErXwobaYiN019PkySvjV", roberto: "yoZ06aMxZJJ28mfd3POQ",
  bento: "TxGEqnHWrfWFTfGW9XjX", cornelio: "VR6AewLTigWG4xSOukaG", valdemar: "VR6AewLTigWG4xSOukaG",
};

export const ELEVENLABS_DEFINITION: SourceDefinition = {
  slug: "elevenlabs-voz",
  name: "ElevenLabs — vozes do jogo",
  description: "Voz natural em português para os personagens (texto → fala). Sem chave, o jogo usa legendas e a voz provisória do navegador.",
  provider: "ElevenLabs",
  category: "jogo",
  sourceType: "REST_API",
  baseUrl: "https://api.elevenlabs.io",
  documentationUrl: "https://elevenlabs.io/docs/api-reference/text-to-speech/convert",
  authType: "API_KEY_HEADER",
  requiresAuth: true,
  priority: 300,
  rateLimitPerMinute: 60,
  cacheTtlMinutes: 0,
  healthPath: "/v1/models",
  config: { model: "eleven_multilingual_v2", voices: {}, limiteDiarioChamadas: 400, limiteDiarioCaracteres: 40000 },
};

export const ANTHROPIC_DEFINITION: SourceDefinition = {
  slug: "anthropic-ia",
  name: "Anthropic — IA do Guardião",
  description: "Redige a resposta em personagem do Guardião do Cofre na negociação. A IA só escreve texto: os pontos continuam vindo das regras do jogo.",
  provider: "Anthropic",
  category: "jogo",
  sourceType: "REST_API",
  baseUrl: "https://api.anthropic.com",
  documentationUrl: "https://docs.anthropic.com/en/api/getting-started",
  authType: "API_KEY_HEADER",
  requiresAuth: true,
  priority: 310,
  rateLimitPerMinute: 60,
  cacheTtlMinutes: 0,
  healthPath: "/v1/models",
  config: { model: "claude-haiku-5-5", limiteDiarioChamadas: 120, limiteDiarioCaracteres: 60000 },
};

const noFacts = (name: string) => async (): Promise<never> => { throw new AppError("INTERNAL", `${name} não fornece fatos fiscais`); };

export const elevenlabsAdapter: IGovernmentSource = {
  definition: ELEVENLABS_DEFINITION, adapterKey: "game-elevenlabs", datasets: [],
  async testConnection(ctx) {
    if (!ctx.credential) return { ok: false, httpStatus: null, latencyMs: 0, message: "Chave de API não configurada", technical: "credential ausente" };
    return pingSource(ctx.http, healthUrl(ctx.source, ELEVENLABS_DEFINITION.healthPath), { "xi-api-key": ctx.credential });
  },
  fetchUnit: noFacts("ElevenLabs"),
};

export const anthropicAdapter: IGovernmentSource = {
  definition: ANTHROPIC_DEFINITION, adapterKey: "game-anthropic", datasets: [],
  async testConnection(ctx) {
    if (!ctx.credential) return { ok: false, httpStatus: null, latencyMs: 0, message: "Chave de API não configurada", technical: "credential ausente" };
    return pingSource(ctx.http, healthUrl(ctx.source, ANTHROPIC_DEFINITION.healthPath), { "x-api-key": ctx.credential, "anthropic-version": "2023-06-01" });
  },
  fetchUnit: noFacts("Anthropic"),
};
