#!/usr/bin/env node
// Re-cifra todas as credenciais de fontes com a chave NOVA.
// Uso:
//   1) gere a nova chave:   openssl rand -base64 32
//   2) CREDENTIALS_ENCRYPTION_KEY=<nova> CREDENTIALS_ENCRYPTION_KEY_PREVIOUS=<antiga> \
//        node --env-file=.env.local scripts/rotate-credentials-key.mjs
//   3) depois do sucesso, faça deploy com a chave nova e remova a _PREVIOUS.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const need = (n) => { const v = process.env[n]; if (!v) { console.error(`Defina ${n}.`); process.exit(1); } return v; };
const key = (n, v) => { const b = Buffer.from(v, "base64"); if (b.length !== 32) { console.error(`${n} deve ter 32 bytes em base64.`); process.exit(1); } return b; };
const next = key("CREDENTIALS_ENCRYPTION_KEY", need("CREDENTIALS_ENCRYPTION_KEY"));
const prev = process.env.CREDENTIALS_ENCRYPTION_KEY_PREVIOUS ? key("CREDENTIALS_ENCRYPTION_KEY_PREVIOUS", process.env.CREDENTIALS_ENCRYPTION_KEY_PREVIOUS) : null;

const dec = (k, payload) => {
  const [v, iv, tag, ct] = payload.split(":");
  if (v !== "v1") throw new Error("formato desconhecido");
  const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64")); d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
};
const enc = (k, plain) => {
  const iv = randomBytes(12); const c = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
};

const db = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const { data, error } = await db.from("source_credentials").select("source_id, secret_ciphertext");
if (error) { console.error(error.message); process.exit(1); }
let ok = 0, failed = 0;
for (const row of data ?? []) {
  try {
    let plain;
    try { plain = dec(next, row.secret_ciphertext); }            // já está na chave nova
    catch { if (!prev) throw new Error("não decifra com a chave nova e não há _PREVIOUS"); plain = dec(prev, row.secret_ciphertext); }
    const { error: e2 } = await db.from("source_credentials").update({ secret_ciphertext: enc(next, plain), updated_at: new Date().toISOString() }).eq("source_id", row.source_id);
    if (e2) throw e2;
    ok++;
  } catch (e) { failed++; console.error(`✗ ${row.source_id}: ${e.message}`); }
}
await db.from("admin_audit_log").insert({ actor_email: "script:rotate-credentials-key", action: "credentials.key_rotated", details: { rotated: ok, failed } });
console.log(`✓ ${ok} credencial(is) re-cifrada(s); ${failed} falha(s).`);
process.exit(failed ? 1 : 0);
