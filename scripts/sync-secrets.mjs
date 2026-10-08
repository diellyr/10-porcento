#!/usr/bin/env node
// Envia os segredos das VARIÁVEIS DE BUILD da Cloudflare para o Worker em execução (`wrangler secret bulk`).
// Roda no "Deploy command" (`npm run cf:release`), logo depois de `wrangler deploy`. Assim existe UM só lugar para cadastrar
// valores — Settings → Build → Variables and secrets — e o Worker sempre os recebe, sem depender da outra tela de variáveis.
// Uso local para conferir (não envia nada): node scripts/sync-secrets.mjs --dry-run
import { spawnSync } from "node:child_process";

const NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY", "CREDENTIALS_ENCRYPTION_KEY", "CRON_SECRET", "NEXT_PUBLIC_SITE_URL",
  // opcionais
  "CREDENTIALS_ENCRYPTION_KEY_PREVIOUS", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "ADMIN_REQUIRE_MFA",
  "DATABASE_LIMIT_MB", "PORTAL_TRANSPARENCIA_API_KEY", "DADOS_GOV_BR_TOKEN",
];
const REQUIRED = ["SUPABASE_SERVICE_ROLE_KEY", "CREDENTIALS_ENCRYPTION_KEY", "CRON_SECRET", "NEXT_PUBLIC_SITE_URL"];
const dry = process.argv.includes("--dry-run");

const payload = {};
for (const n of NAMES) {
  const v = process.env[n]?.trim();
  if (v) payload[n] = v;
}
const missing = REQUIRED.filter((n) => !(n in payload));
console.log(`[sync-secrets] encontradas: ${Object.keys(payload).join(", ") || "(nenhuma)"}`);
if (missing.length) console.warn(`[sync-secrets] FALTAM nas variáveis de build: ${missing.join(", ")}`);
if (dry) process.exit(missing.length ? 1 : 0);
if (!Object.keys(payload).length) {
  console.error("[sync-secrets] nenhuma variável encontrada — cadastre-as em Settings → Build → Variables and secrets.");
  process.exit(1);
}

// Os valores vão pela entrada padrão do wrangler: nunca em argumentos de linha de comando nem em arquivo.
const r = spawnSync("npx", ["wrangler", "secret", "bulk"], { input: JSON.stringify(payload), stdio: ["pipe", "inherit", "inherit"], encoding: "utf8" });
if (r.status !== 0) {
  console.error("[sync-secrets] falhou ao enviar os segredos ao Worker (veja a mensagem acima).");
  process.exit(r.status ?? 1);
}
console.log("[sync-secrets] segredos enviados ao Worker.");
process.exit(missing.length ? 1 : 0);
