import { adminHandle } from "@/server/http-api";
import { container } from "@/server/container";

export async function GET(req: Request) {
  return adminHandle(req, async () => container().admin.health());
}
