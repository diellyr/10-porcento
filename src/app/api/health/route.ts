import { NextResponse } from "next/server";
import { serviceClient } from "@/server/repositories/supabase/client";
import { DEV_FIXTURES_ENABLED } from "@/server/dev/fixtures";
import { deriveKey } from "@/server/crypto";
import { APP_VERSION } from "@/lib/version";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de implantação, público e seguro: informa só SE cada variável está definida (nunca o valor) e se o banco
 * responde. Serve para descobrir, sem abrir os logs, por que o site mostra "Configuração necessária".
 */
export async function GET(req: Request) {
  const rl = await rateLimit(`health:${clientIp(req.headers)}`, 30);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const has = (k: string) => Boolean(process.env[k]);
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: has("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: has("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),
    CREDENTIALS_ENCRYPTION_KEY: has("CREDENTIALS_ENCRYPTION_KEY"),
    CRON_SECRET: has("CRON_SECRET"),
    NEXT_PUBLIC_SITE_URL: has("NEXT_PUBLIC_SITE_URL"),
  };
  const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  // Definida mas com formato errado (ex.: colou o comando "openssl rand ..." em vez do valor gerado). Nunca revela o valor.
  const invalid: string[] = [];
  if (env.CREDENTIALS_ENCRYPTION_KEY && !deriveKey(process.env.CREDENTIALS_ENCRYPTION_KEY)) invalid.push("CREDENTIALS_ENCRYPTION_KEY");
  const cron = process.env.CRON_SECRET?.trim() ?? "";
  if (env.CRON_SECRET && (cron.length < 32 || /\s/.test(cron))) invalid.push("CRON_SECRET");
  let database: { ok: boolean; error?: string } = { ok: false, error: "variáveis do Supabase ausentes" };
  if (DEV_FIXTURES_ENABLED()) database = { ok: true };
  else if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { error } = await serviceClient().from("data_sources").select("id", { count: "exact", head: true });
      database = error ? { ok: false, error: error.message.slice(0, 200) } : { ok: true };
    } catch (e) {
      database = { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) };
    }
  }
  const ok = missing.length === 0 && invalid.length === 0 && database.ok;
  return NextResponse.json({ ok, version: APP_VERSION, missing, invalid, env, database }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
