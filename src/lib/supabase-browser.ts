"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Cliente do navegador: só usa a chave pública (anon). Serve exclusivamente para autenticação. */
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase não configurado");
  return createBrowserClient(url, key);
}
