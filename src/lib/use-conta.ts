"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "./supabase-browser";

/** Contas sugeridas no campo de e-mail (só o e-mail; a senha nunca é guardada aqui). */
export const CONTAS_SUGERIDAS = ["ti@local"];

/** Conta atualmente conectada (se houver) e a ação de sair para entrar com outra conta. */
export function useConta() {
  const [email, setEmail] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    let vivo = true;
    (async () => { try { const { data } = await supabaseBrowser().auth.getUser(); if (vivo) setEmail(data.user?.email ?? null); } catch { /* sem Supabase ou sem sessão */ } if (vivo) setPronto(true); })();
    return () => { vivo = false; };
  }, []);
  const sair = useCallback(async () => { try { await supabaseBrowser().auth.signOut(); } catch { /* sem sessão */ } setEmail(null); }, []);
  return { email, pronto, sair };
}
