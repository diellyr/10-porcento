import { describe, expect, it } from "vitest";
import { CAPITAIS } from "@/game/content/capitais";
import { CHARACTERS } from "@/game/content/characters";
import { DEFAULT_VOICE_IDS, ANTHROPIC_DEFINITION, ELEVENLABS_DEFINITION } from "@/server/sources/game-services";
import { ENV_CREDENTIALS } from "@/server/router/runtime";
import { VOICE_ID_RE } from "@/server/game/integrations";
import { staticVoiceLines } from "@/server/game/voice-lines";
import { voiceCacheKey } from "@/server/game/tts";

describe("integrações do jogo (painel)", () => {
  it("as duas integrações pedem credencial, são da categoria jogo e não colocam segredo na configuração", () => {
    for (const d of [ELEVENLABS_DEFINITION, ANTHROPIC_DEFINITION]) {
      expect(d.requiresAuth).toBe(true);
      expect(d.category).toBe("jogo");
      expect(d.baseUrl.startsWith("https://")).toBe(true);
      expect(JSON.stringify(d.config)).not.toMatch(/key|secret|token|senha/i);
    }
    expect(ENV_CREDENTIALS["elevenlabs-voz"]).toBe("ELEVENLABS_API_KEY");
    expect(ENV_CREDENTIALS["anthropic-ia"]).toBe("ANTHROPIC_API_KEY");
  });

  it("toda voz sugerida tem formato de ID válido e todo personagem que fala tem sugestão", () => {
    for (const id of Object.values(DEFAULT_VOICE_IDS)) expect(VOICE_ID_RE.test(id)).toBe(true);
    const falantes = new Set(staticVoiceLines().map((l) => l.personagem));
    for (const id of falantes) expect(DEFAULT_VOICE_IDS[id], id).toBeTruthy();
    for (const id of Object.keys(DEFAULT_VOICE_IDS)) expect(CHARACTERS[id as keyof typeof CHARACTERS]).toBeTruthy();
  });

  it("falas fixas: ids únicos, texto normalizado para fala e chave de cache estável", () => {
    const l = staticVoiceLines();
    expect(l.length).toBeGreaterThan(50);
    expect(new Set(l.map((x) => x.id)).size).toBe(l.length);
    expect(l.every((x) => !/R\$|%/.test(x.texto))).toBe(true);
    expect(voiceCacheKey("abc12345", "olá")).toBe(voiceCacheKey("abc12345", "olá"));
    expect(voiceCacheKey("abc12345", "olá")).not.toBe(voiceCacheKey("abc12346", "olá"));
  });

  it("27 capitais com código IBGE de 7 dígitos, sem repetição", () => {
    expect(CAPITAIS).toHaveLength(27);
    expect(new Set(CAPITAIS.map((c) => c.code)).size).toBe(27);
    expect(CAPITAIS.every((c) => /^\d{7}$/.test(c.code) && /^[A-Z]{2}$/.test(c.uf))).toBe(true);
  });
});
