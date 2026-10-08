import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../core/errors";

let cached: SupabaseClient | null = null;

/** Cliente com service_role: SOMENTE servidor. Nunca importar em componentes de cliente. */
export function serviceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AppError("INTERNAL", "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configuradas");
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

export function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new AppError("INTERNAL", `${what}: ${res.error.message}`);
  return res.data as T;
}
