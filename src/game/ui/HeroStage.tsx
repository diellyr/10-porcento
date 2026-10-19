"use client";
import { GameBackground } from "./brand/GameBackground";
import { CanetaPoder } from "./brand/CanetaPoder";
import { GameLogo } from "./brand/GameLogo";
import { GameMenuButton } from "./brand/GameMenuButton";
import { IcEngrenagem, IcInfo, IcPerfil, IcPlay, IcRetomar } from "./brand/icons";
import { useRef } from "react";
import { InstallShortcut } from "./Install";

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
    <header ref={ref} onPointerMove={move} className="mx-tela min-h-[100dvh]">
      <GameBackground />
      <CanetaPoder className="home" />
      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-end gap-2 px-4 pt-4" aria-label="Principal">
        <span className="mx-nav"><GameMenuButton compacto href="#como-funciona" icone={<IcInfo />}>Conhecer o jogo</GameMenuButton><span className="mx-instalar"><InstallShortcut className="g-btn" /></span><GameMenuButton compacto href="/entrar" icone={<IcPerfil />}>Entrar</GameMenuButton></span>
      </nav>
      <div className="mx-tela-corpo">
        <p className="mx-selo">🎭 Sátira — tudo é ficção</p>
        <GameLogo />
        <p className="mx-slogan">Você recebeu uma caneta e dinheiro público. O que vai fazer com eles?</p>
        <p className="mx-slogan !text-base !font-semibold">Comece administrando uma UPA. Faça escolhas, enfrente pressões e chegue ao topo — da Secretaria Municipal à Presidência.</p>
        <div className="mx-menu mx-tela-menu">
          <GameMenuButton variante="primario" href="/jogo?acao=novo" icone={<IcPlay />} seta atraso={450}>QUERO MEUS 10%!</GameMenuButton>
          <p className="mx-rodape !mt-0">Você decide se tenta desviar recursos ou melhorar a gestão.</p>
          <div className="mx-grade"><GameMenuButton variante="azul" compacto href="/jogo?acao=continuar" icone={<IcRetomar />} atraso={540}>Continuar</GameMenuButton><GameMenuButton variante="escuro" compacto href="/jogo?acao=config" icone={<IcEngrenagem />} atraso={600}>Configurações</GameMenuButton></div>
          <p className="mx-rodape">Grátis e sem cadastro obrigatório. Atos de corrupção são fictícios; desvios deliberados ficam registrados e têm consequências no encerramento.</p>
        </div>
      </div>
    </header>
  );
}
