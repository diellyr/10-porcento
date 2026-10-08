import { adminHandle } from "@/server/http-api";
import { container } from "@/server/container";
import { dbUsageLevel } from "@/lib/db-usage";

export async function GET(req: Request) {
  return adminHandle(req, async () => {
    const { analytics } = container();
    const limitMb = Number(process.env.DATABASE_LIMIT_MB ?? 500);
    const hours = Math.min(Number(new URL(req.url).searchParams.get("hours") ?? 24), 24 * 30);
    const [stats, usage] = await Promise.all([analytics.dashboardStats(new Date(Date.now() - hours * 3_600_000)), analytics.dbUsage(limitMb * 1024 * 1024)]);
    return { hours, stats, database: { ...usage, level: dbUsageLevel(usage.percent) } };
  });
}
