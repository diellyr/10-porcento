import { container } from "@/server/container";
import { adminHandle } from "@/server/http-api";
import { buildSettings, pendingSources } from "@/server/services/settings";

/** Estado da configuração: fontes com chave/arquivo pendente (com link de onde criar) e variáveis do ambiente. Valores nunca são devolvidos. */
export async function GET(req: Request) {
  return adminHandle(req, async () => ({
    pendingSources: pendingSources(await container().admin.list()),
    env: buildSettings(process.env),
    databaseLimitMb: Number(process.env.DATABASE_LIMIT_MB ?? 500),
    mfaRequired: process.env.ADMIN_REQUIRE_MFA !== "0",
  }));
}
