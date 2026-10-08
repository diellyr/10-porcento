import { timingSafeEqual } from "node:crypto";
import { container } from "@/server/container";
import { AppError } from "@/server/core/errors";
import { handle } from "@/server/http-api";

export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(got), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Chamado por agendador externo (Cron Trigger da Cloudflare / pg_cron + pg_net): testa as fontes habilitadas e poda logs antigos. SEM polling contínuo. */
export async function GET(req: Request) {
  return handle(req, {}, async () => {
    if (!authorized(req)) throw new AppError("UNAUTHENTICATED", "CRON_SECRET inválido ou ausente", 401);
    const { admin, analytics } = container();
    const results = await admin.testAll({ id: null, email: "cron" });
    const purged = await analytics.purgeOld(30);
    return { tested: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.status])), purged };
  });
}
