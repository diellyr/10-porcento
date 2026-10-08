import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppError } from "./core/errors";
import { container } from "./container";
import { DEV_FIXTURES_ENABLED } from "./dev/fixtures";
import { decideMfa, mfaRequired, type MfaDecision } from "./mfa";

export interface SessionUser { id: string; email: string | null }

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new AppError("INTERNAL", "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas");
  return { url, key };
}

async function serverClient() {
  const { url, key } = supabaseEnv();
  const store = await cookies();
  return createServerClient(url, key, { cookies: { getAll: () => store.getAll(), setAll: () => { /* leitura apenas; o middleware renova a sessão */ } } });
}

/** Estado do segundo fator da sessão atual (ok / precisa verificar / precisa cadastrar). */
export async function getMfaDecision(): Promise<MfaDecision> {
  if (DEV_FIXTURES_ENABLED() || !mfaRequired()) return "ok";
  const sb = await serverClient();
  const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  return decideMfa({ required: true, currentLevel: data?.currentLevel ?? null, nextLevel: data?.nextLevel ?? null });
}

/** Usuário autenticado via cookie de sessão, VALIDADO no servidor do Supabase Auth (getUser, nunca getSession). */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (DEV_FIXTURES_ENABLED()) return { id: "dev-admin", email: "dev@local" }; // somente modo dev com fixtures
  const { url, key } = supabaseEnv();
  const store = await cookies();
  const sb = createServerClient(url, key, {
    cookies: { getAll: () => store.getAll(), setAll: () => { /* leitura apenas; o middleware renova a sessão */ } },
  });
  const { data } = await sb.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

/** O papel vem SEMPRE do banco (profiles.role), nunca do token ou do cliente. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "sem sessão", 401);
  const role = await container().analytics.getRole(user.id);
  if (role !== "admin") throw new AppError("FORBIDDEN", `usuário ${user.id} não é admin`, 403);
  const mfa = await getMfaDecision();
  if (mfa !== "ok") throw new AppError("MFA_REQUIRED", `administrador ${user.id} sem sessão AAL2 (${mfa})`, 403);
  return user;
}

export async function isAdminSession(): Promise<boolean> {
  try { await requireAdmin(); return true; } catch { return false; }
}
