import { z } from "zod";
import { AppError } from "@/server/core/errors";
import { adminHandle, assertSameOrigin } from "@/server/http-api";
import { container } from "@/server/container";

export async function GET(req: Request) {
  return adminHandle(req, async () => ({ users: await container().analytics.listUsers(200) }));
}

export async function PATCH(req: Request) {
  return adminHandle(req, async (actor) => {
    assertSameOrigin(req);
    const { id, role } = z.object({ id: z.string().uuid(), role: z.enum(["user", "admin"]) }).parse(await req.json());
    const { analytics, registry } = container();
    const current = await analytics.getRole(id);
    if (!current) throw new AppError("NOT_FOUND", "usuário não existe");
    if (current === "admin" && role === "user" && (await analytics.countAdmins()) <= 1) throw new AppError("VALIDATION", "não é possível remover o último administrador");
    await analytics.setRole(id, role);
    await registry.audit({ actorId: actor.id, actorEmail: actor.email, action: "user.role_changed", targetType: "user", targetId: id, details: { from: current, to: role } });
    return { ok: true };
  }, 20);
}
