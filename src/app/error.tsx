"use client";
import { useEffect } from "react";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/primitives";

/** Fronteira de erro: o cidadão nunca vê stack trace nem mensagem técnica. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[brasil-fiscal] erro de renderização", error.digest ?? ""); }, [error]);
  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center bg-bg px-4 text-center">
      <div className="max-w-md">
        <div className="mb-6 flex justify-center"><Wordmark /></div>
        <h1 className="text-2xl font-bold tracking-tight">Algo deu errado do nosso lado</h1>
        <p className="mt-3 text-ink-2">Não conseguimos carregar esta página agora. Seus dados e as fontes oficiais não foram afetados. Tente novamente em instantes.</p>
        <div className="mt-6"><Button onClick={reset}>Tentar novamente</Button></div>
        {error.digest && <p className="mt-4 text-xs text-ink-3">Código de referência: {error.digest}</p>}
      </div>
    </main>
  );
}
