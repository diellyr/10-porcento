"use client";
import Link from "next/link";
import { useRef } from "react";
import { InstallShortcut } from "./Install";
import { HeroArt } from "./art/HeroArt";

/** Abertura da página inicial: arte original com movimento discreto (paralaxe) e as opções do menu do jogo. */
export function HeroStage() {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    if (!ref.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5) * 2));
    ref.current.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5) * 2));
  };
  return (
    <header ref={ref} onPointerMove={move} className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10"><HeroArt className="h-full w-full" /></div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/70 via-white/15 to-white/60" aria-hidden />
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 pt-4" aria-label="Principal">
        <span className="g-display text-2xl font-bold" style={{ color: "var(--g-blue)" }}>MEUS <span style={{ color: "var(--g-orange-t)" }}>10%</span></span>
        <span className="flex flex-wrap gap-2"><Link href="#como-funciona" className="g-btn ghost sm">Conhecer o jogo</Link><InstallShortcut /><Link href="/entrar" className="g-btn ghost sm">👤 Entrar</Link></span>
      </nav>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-4 pb-10 pt-6 text-center">
        <p className="g-chip es">🎭 Sátira · tudo é ficção · dados públicos de verdade</p>
        <h1 className="mt-3 text-[clamp(3.4rem,13vw,8.5rem)] font-bold leading-none" style={{ color: "var(--g-blue)", textShadow: "0 4px 0 #fff, 0 12px 34px rgb(27 35 64 / .35)" }}>MEUS <span style={{ color: "var(--g-orange-t)" }}>10%</span></h1>
        <p className="mt-3 max-w-2xl text-xl font-extrabold sm:text-2xl" style={{ textShadow: "0 2px 0 #fff" }}>Você recebeu uma caneta e dinheiro público. O que vai fazer com eles?</p>
        <p className="mt-2 max-w-2xl rounded-2xl bg-white/80 px-4 py-2 text-base font-semibold backdrop-blur">Comece administrando uma UPA. Faça escolhas, enfrente pressões e chegue ao topo. Sua fortuna e o futuro da população vão contar histórias diferentes.</p>
        <div className="mt-auto flex w-full max-w-md flex-col gap-3 pt-10">
          <Link href="/jogo?acao=novo" className="g-btn orange xl">▶ QUERO MEUS 10%! <span className="text-sm font-semibold">Nova partida</span></Link>
          <p className="-mt-1 text-sm font-bold" style={{ textShadow: "0 1px 0 #fff" }}>Você decide se tenta desviar recursos ou melhorar a gestão.</p>
          <div className="grid grid-cols-2 gap-3"><Link href="/jogo?acao=continuar" className="g-btn xl">↻ Continuar</Link><Link href="/jogo?acao=config" className="g-btn ghost xl">⚙️ Configurações</Link></div>
          <Link href="#como-funciona" className="g-btn ghost">CONHECER O JOGO</Link>
          <p className="text-xs font-semibold" style={{ textShadow: "0 1px 0 #fff" }}>Grátis e sem cadastro obrigatório. Atos de corrupção são fictícios; desvios deliberados ficam registrados e têm consequências no encerramento.</p>
        </div>
      </div>
    </header>
  );
}
