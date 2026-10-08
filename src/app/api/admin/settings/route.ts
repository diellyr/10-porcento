import { adminHandle } from "@/server/http-api";

/** Estado da configuração do ambiente — apenas "definido/não definido"; valores nunca são devolvidos. */
export async function GET(req: Request) {
  return adminHandle(req, async () => {
    const set = (k: string) => !!process.env[k];
    let encOk = false;
    try { encOk = Buffer.from(process.env.CREDENTIALS_ENCRYPTION_KEY ?? "", "base64").length === 32; } catch { /* inválida */ }
    return {
      env: [
        { key: "NEXT_PUBLIC_SUPABASE_URL", set: set("NEXT_PUBLIC_SUPABASE_URL"), note: "URL do projeto Supabase" },
        { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", set: set("NEXT_PUBLIC_SUPABASE_ANON_KEY"), note: "chave pública (Auth)" },
        { key: "SUPABASE_SERVICE_ROLE_KEY", set: set("SUPABASE_SERVICE_ROLE_KEY"), note: "somente servidor" },
        { key: "CREDENTIALS_ENCRYPTION_KEY", set: encOk, note: "32 bytes em base64 — cifra as credenciais salvas pelo painel" },
        { key: "CRON_SECRET", set: set("CRON_SECRET"), note: "protege /api/cron/health" },
        { key: "PORTAL_TRANSPARENCIA_API_KEY", set: set("PORTAL_TRANSPARENCIA_API_KEY"), note: "opcional: credencial padrão (o painel tem precedência)" },
        { key: "DADOS_GOV_BR_TOKEN", set: set("DADOS_GOV_BR_TOKEN"), note: "opcional: credencial padrão" },
      ],
      databaseLimitMb: Number(process.env.DATABASE_LIMIT_MB ?? 500),
    };
  });
}
