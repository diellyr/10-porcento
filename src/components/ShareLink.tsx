"use client";
import { useEffect, useRef, useState } from "react";

/** Parâmetros que podem ir no link compartilhado; o resto (tokens de login/recuperação, códigos) fica de fora. */
const SEGUROS = new Set(["next"]);

/** Link da página atual sem fragmento (#access_token…) e sem parâmetros sensíveis. */
export function linkCompartilhavel(href: string): string {
  const u = new URL(href);
  const limpo = new URL(u.origin + u.pathname);
  for (const [k, v] of u.searchParams) if (SEGUROS.has(k)) limpo.searchParams.append(k, v);
  return limpo.toString();
}

/**
 * Botão "Compartilhar link": abre o compartilhamento nativo (celulares) ou copia o link.
 * Se nada disso estiver disponível, mostra o link selecionado para copiar à mão.
 */
export function ShareLink({ className, titulo = "MEUS 10%" }: { className?: string; titulo?: string }) {
  const [estado, setEstado] = useState<"" | "copiado" | "manual">("");
  const [url, setUrl] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => { if (estado === "manual") campo.current?.select(); if (estado === "copiado") { const t = setTimeout(() => setEstado(""), 2500); return () => clearTimeout(t); } }, [estado]);

  const compartilhar = async () => {
    const link = linkCompartilhavel(window.location.href); setUrl(link);
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: titulo, url: link }); return; }
      catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(link); setEstado("copiado"); }
    catch { setEstado("manual"); }
  };

  return (
    <span className="relative inline-flex flex-col items-end">
      <button type="button" className={className} onClick={() => void compartilhar()} aria-label="Compartilhar o link desta página">
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "-3px", marginRight: 6 }}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
        Compartilhar link
      </button>
      <span role="status" aria-live="polite" className="absolute right-0 top-full z-10 mt-1">
        {estado === "copiado" && <span className="whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-xs font-bold text-white">Link copiado!</span>}
        {estado === "manual" && <input ref={campo} readOnly value={url} aria-label="Link desta página" className="w-64 max-w-[80vw] rounded-lg border bg-white px-2 py-1 text-xs text-black shadow" />}
      </span>
    </span>
  );
}
