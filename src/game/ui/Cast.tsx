"use client";
import Link from "next/link";
import { CHARACTERS } from "@/game/content/characters";
import type { Emotion } from "@/game/engine/types";
import { Portrait } from "./art/Portrait";

const EMO: Emotion[] = ["neutro", "feliz", "irônico", "irritado"];
export function Cast() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/" className="g-btn ghost sm">← Início</Link>
      <h1 className="mt-4 text-4xl font-bold">Elenco de MEUS 10%</h1>
      <p className="mt-2 max-w-2xl text-[color:var(--g-ink2)]">Todos os personagens são fictícios e originais. A mesma identidade (rosto, cabelo, roupa e voz) vale nos retratos 2D e nos bustos 3D.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(CHARACTERS).filter((c) => c.id !== "voce").map((c) => (
          <section key={c.id} className="g-card overflow-hidden p-4">
            <div className="flex items-center gap-3"><span className="size-3 rounded-full" style={{ background: c.cor }} /><h2 className="text-xl font-bold">{c.nome}</h2></div>
            <p className="text-sm text-[color:var(--g-ink3)]">{c.papel}{c.naUpa ? "" : " · carreira completa"}</p>
            <div className="mt-3 grid grid-cols-4 gap-1" style={{ background: "linear-gradient(#fff,#ffeccc)", borderRadius: 14 }}>
              {EMO.map((e) => <Portrait key={e} look={c.look} emocao={e} enquadramento="rosto" title={`${c.nome} — ${e}`} className="h-28 w-full" />)}
            </div>
            <p className="mt-3 text-sm">{c.interesse}</p>
            <p className="mt-2 text-xs text-[color:var(--g-ink3)]"><b>Voz:</b> {c.voz.direcao}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
