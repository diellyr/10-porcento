import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, deriveKey, encryptSecret } from "@/server/crypto";

describe("CREDENTIALS_ENCRYPTION_KEY", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("aceita 32 bytes em base64 sem alterar a chave (compatível com o formato antigo)", () => {
    const raw = Buffer.alloc(32, 7).toString("base64");
    expect(deriveKey(raw)?.equals(Buffer.alloc(32, 7))).toBe(true);
  });

  it("aceita texto aleatório de 32+ caracteres (derivando SHA-256) e recusa o comando colado por engano", () => {
    expect(deriveKey("aB3$kP9!zQ7@mW2#xR5&tY8*uI1^oL4%")?.length).toBe(32);
    expect(deriveKey("openssl rand -base64 32")).toBeNull();
    expect(deriveKey("curto")).toBeNull();
    expect(deriveKey("")).toBeNull();
  });

  it("cifra e decifra com chave em texto", () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "aB3$kP9!zQ7@mW2#xR5&tY8*uI1^oL4%");
    expect(decryptSecret(encryptSecret("minha-chave-api"))).toBe("minha-chave-api");
  });
});
