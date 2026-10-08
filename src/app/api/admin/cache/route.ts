import { adminHandle } from "@/server/http-api";
import { container } from "@/server/container";

export async function GET(req: Request) {
  return adminHandle(req, async () => {
    const { analytics } = container();
    const overview = (await analytics.dataOverview()) as { coverage_total?: number; coverage_expired?: number };
    return { coverageTotal: overview.coverage_total ?? 0, coverageExpired: overview.coverage_expired ?? 0 };
  });
}
