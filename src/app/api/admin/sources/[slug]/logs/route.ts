import { adminHandle, intParam } from "@/server/http-api";
import { container } from "@/server/container";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return adminHandle(req, async () => {
    const sp = new URL(req.url).searchParams;
    const logs = await container().admin.logs((await params).slug, {
      limit: Math.min(intParam(sp, "limit") ?? 50, 200), beforeId: intParam(sp, "before"), onlyErrors: sp.get("errors") === "1",
    });
    return { logs: logs.map((l) => ({ ...l, startedAt: l.startedAt.toISOString() })), next: logs.length ? logs.at(-1)!.id : null };
  });
}
