"use client";
import Link from "next/link";
import { useEffect } from "react";

/** Fronteira de erro do jogo: mostra o motivo resumido (sem stack) para facilitar o relato do problema. O progresso fica salvo neste aparelho. */
export default function GameError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[meus10] erro de renderização:", error.message, error.stack?.split("\n").slice(0, 4).join(" | ")); }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center" style={{ background: "#fff8ec" }}>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">Opa, o jogo tropeçou</h1>
        <p className="mt-3 text-[color:#4a5170]">Seu progresso está salvo neste aparelho. Toque em “Tentar de novo”; se repetir, volte ao menu e use “Continuar”.</p>
        <p className="mx-auto mt-3 max-w-sm break-words rounded-xl bg-white/70 p-2 text-xs" role="note">Detalhe técnico para relatar: <code>{error.message || "sem mensagem"}</code>{error.digest ? ` · ${error.digest}` : ""}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="g-btn orange">Tentar de novo</button>
          <Link href="/jogo" className="g-btn ghost">Voltar ao menu</Link>
        </div>
      </div>
    </main>
  );
}
