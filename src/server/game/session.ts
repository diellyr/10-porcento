import { getSessionUser, type SessionUser } from "../auth";
import { AppError } from "../core/errors";

export async function playerOrNull(): Promise<SessionUser | null> { try { return await getSessionUser(); } catch { return null; } }
export async function requirePlayer(): Promise<SessionUser> {
  const u = await playerOrNull();
  if (!u) throw new AppError("UNAUTHENTICATED", "sem sessão");
  return u;
}
export const supabaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
