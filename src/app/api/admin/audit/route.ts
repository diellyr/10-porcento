import { adminHandle, intParam } from "@/server/http-api";
import { container } from "@/server/container";

export async function GET(req: Request) {
  return adminHandle(req, async () => ({ entries: await container().registry.listAudit(Math.min(intParam(new URL(req.url).searchParams, "limit") ?? 100, 200)) }));
}
