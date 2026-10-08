import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { AppError } from "./core/errors";

/** AES-256-GCM. A chave vem de CREDENTIALS_ENCRYPTION_KEY (base64, 32 bytes) e nunca vai ao banco nem ao cliente. */
function parseKey(name: string, raw: string | undefined): Buffer {
  if (!raw) throw new AppError("INTERNAL", `${name} não definida: impossível salvar/ler credenciais`);
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new AppError("INTERNAL", `${name} deve ter 32 bytes em base64 (openssl rand -base64 32)`);
  return k;
}
const key = () => parseKey("CREDENTIALS_ENCRYPTION_KEY", process.env.CREDENTIALS_ENCRYPTION_KEY);

/**
 * Rotação de chave: defina CREDENTIALS_ENCRYPTION_KEY (nova) e CREDENTIALS_ENCRYPTION_KEY_PREVIOUS (antiga).
 * Leitura tenta a nova e depois a antiga; toda escrita usa a nova. `scripts/rotate-credentials-key.mjs` re-cifra tudo.
 */
function decryptWith(k: Buffer, iv: string, tag: string, ct: string): string {
  const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [v, iv, tag, ct] = payload.split(":");
  if (v !== "v1" || !iv || !tag || !ct) throw new AppError("INTERNAL", "credencial armazenada em formato desconhecido");
  try {
    return decryptWith(key(), iv, tag, ct);
  } catch (e) {
    const prev = process.env.CREDENTIALS_ENCRYPTION_KEY_PREVIOUS;
    if (!prev) throw e;
    return decryptWith(parseKey("CREDENTIALS_ENCRYPTION_KEY_PREVIOUS", prev), iv, tag, ct);
  }
}

export const last4 = (s: string) => s.slice(-4);
export const maskSecret = (l4: string) => `••••••••••••${l4}`;
