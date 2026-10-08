// @ts-nocheck — importa ../.open-next/worker.js, arquivo gerado por `opennextjs-cloudflare build` (não existe antes do build)
// Worker de entrada na Cloudflare: delega as requisições ao app Next.js (gerado pelo OpenNext) e trata o agendamento diário.
import openNext from "../.open-next/worker.js";
export * from "../.open-next/worker.js";

interface Env { CRON_SECRET?: string; NEXT_PUBLIC_SITE_URL?: string; [k: string]: unknown }

export default {
  fetch: openNext.fetch,
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    if (!env.CRON_SECRET || !env.NEXT_PUBLIC_SITE_URL) {
      console.error("[cron] CRON_SECRET ou NEXT_PUBLIC_SITE_URL ausente — verificação diária não executada");
      return;
    }
    const req = new Request(`${env.NEXT_PUBLIC_SITE_URL}/api/cron/health`, { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
    ctx.waitUntil(
      openNext.fetch(req, env, ctx).then(async (res: Response) => console.log(`[cron] health ${res.status} ${(await res.text()).slice(0, 500)}`)),
    );
  },
};
