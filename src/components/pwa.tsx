"use client";
import { useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/version";
import { isUpdateAvailable } from "@/lib/update-check";

/** Registra o service worker (só em produção) e avisa quando o aparelho fica sem conexão. */
export function PwaRegister() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);

  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-50 bg-ink px-4 py-2 text-center text-sm font-medium text-white">
      Sem conexão. Os dados na tela podem estar desatualizados; reconecte para atualizar.
    </div>
  );
}

interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

/** Botão "Instalar aplicativo" (Chrome/Edge/Android) e dica para iPhone/iPad. Some quando já está instalado. */
export function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed) return null;
  if (evt) {
    return (
      <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2"
        onClick={async () => { await evt.prompt(); await evt.userChoice.catch(() => undefined); setEvt(null); }}>
        Instalar aplicativo
      </button>
    );
  }
  if (ios) return <p className="text-sm text-ink-2">Para instalar no iPhone/iPad: toque em <strong>Compartilhar</strong> e em <strong>Adicionar à Tela de Início</strong>.</p>;
  return null;
}

const CHECK_EVERY_MS = 10 * 60_000;

/**
 * Avisa quando há uma versão nova do site. Compara a versão embutida neste código com a que o servidor está executando
 * (`/api/version`), ao abrir, ao voltar para a aba/aplicativo e a cada 10 minutos. “Atualizar” recarrega a página
 * (e pede ao service worker para buscar a versão nova antes).
 */
export function UpdateNotice() {
  const [next, setNext] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const body = (await r.json()) as { version?: unknown };
        if (alive && isUpdateAvailable(APP_VERSION, body.version)) setNext(body.version);
      } catch { /* sem rede: tenta de novo na próxima checagem */ }
    };
    void check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", check);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("online", check); };
  }, []);

  if (!next || dismissed === next) return null;
  const update = async () => {
    try { const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); } catch { /* segue para o recarregamento */ }
    window.location.reload();
  };
  return (
    <div role="status" className="fixed inset-x-3 bottom-14 z-50 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-xl sm:bottom-4">
      <p className="min-w-0 flex-1"><strong>Nova versão disponível</strong> (v{next}). Atualize para usar as melhorias e correções mais recentes.</p>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={() => setDismissed(next)} className="min-h-10 rounded-lg px-3 font-medium text-ink-2 hover:bg-surface-2">Depois</button>
        <button type="button" onClick={() => void update()} className="min-h-10 rounded-lg bg-primary px-4 font-medium text-white hover:bg-primary-600">Atualizar agora</button>
      </div>
    </div>
  );
}
