"use client";
import { useState, useSyncExternalStore } from "react";
import { Modal } from "./atoms";

interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }
type Snap = { evt: InstallEvent | null; installed: boolean };

/** Guarda o evento de instalação do navegador (ele dispara uma vez, cedo) para qualquer botão "Atalho" usar depois. */
let snap: Snap = { evt: null, installed: false };
const subs = new Set<() => void>();
const set = (n: Partial<Snap>) => { snap = { ...snap, ...n }; subs.forEach((f) => f()); };
let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  snap = { ...snap, installed: standalone };
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); set({ evt: e as InstallEvent }); });
  window.addEventListener("appinstalled", () => set({ installed: true, evt: null }));
}
const subscribe = (f: () => void) => { start(); subs.add(f); return () => { subs.delete(f); }; };
const server: Snap = { evt: null, installed: false };

/** Monta no layout do jogo: começa a escutar o evento de instalação assim que a página abre. */
export function InstallCapture() { useSyncExternalStore(subscribe, () => snap, () => server); return null; }

/** Botão "Atalho": instala o jogo como aplicativo (Chrome/Edge/Android) ou ensina o passo a passo (iPhone, Firefox, outros). Some se já instalado. */
export function InstallShortcut({ className = "g-btn sm ghost", label = "📲 Atalho" }: { className?: string; label?: string }) {
  const s = useSyncExternalStore(subscribe, () => snap, () => server);
  const [help, setHelp] = useState(false);
  if (s.installed) return null;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const ios = /iphone|ipad|ipod/i.test(ua);
  const android = /android/i.test(ua);
  const go = async () => {
    if (s.evt) { const e = s.evt; set({ evt: null }); await e.prompt(); await e.userChoice.catch(() => undefined); return; }
    setHelp(true);
  };
  return (
    <>
      <button type="button" className={className} onClick={() => void go()} aria-haspopup={s.evt ? undefined : "dialog"} title="Instalar o jogo como aplicativo, com atalho na tela inicial">{label}</button>
      {help && (
        <Modal title="Criar atalho do jogo" onClose={() => setHelp(false)} footer={<button className="g-btn orange" onClick={() => setHelp(false)}>Entendi</button>}>
          <p className="font-semibold">Instale o MEUS 10% como aplicativo: ele abre em tela cheia, com ícone próprio, direto da tela inicial.</p>
          <ol className="mt-3 grid list-decimal gap-2 pl-6">
            {ios ? (<>
              <li>Abra esta página no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li><li>Escolha <b>Adicionar à Tela de Início</b> e confirme.</li>
            </>) : android ? (<>
              <li>Toque no menu <b>⋮</b> do navegador.</li><li>Escolha <b>Instalar aplicativo</b> (ou <b>Adicionar à tela inicial</b>).</li><li>Confirme em <b>Instalar</b>.</li>
            </>) : (<>
              <li>No <b>Chrome</b> ou <b>Edge</b>, clique no ícone de instalar ⊕ no final da barra de endereço — ou abra o menu <b>⋮</b> → <b>Instalar MEUS 10%</b>.</li><li>Confirme em <b>Instalar</b>. O atalho aparece na área de trabalho e no menu de aplicativos.</li>
            </>)}
          </ol>
          <p className="mt-3 text-sm text-[color:var(--g-ink3)]">Não achou a opção? O navegador pode não oferecer instalação (ex.: aba anônima, Firefox no computador). Use o Chrome ou o Edge.</p>
        </Modal>
      )}
    </>
  );
}
