"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import type { Classification } from "../engine/types";
import { brl, brlShort } from "../engine/money";

export const CLASS_LABEL: Record<Classification, string> = { oficial: "Dado oficial", estimativa: "Estimativa didática", simulado: "Resultado simulado" };
export const CLASS_CSS: Record<Classification, string> = { oficial: "of", estimativa: "es", simulado: "si" };
export function ClassChip({ c, curto = false }: { c: Classification; curto?: boolean }) {
  return <span className={`g-chip ${CLASS_CSS[c]}`} title={CLASS_LABEL[c]}><span aria-hidden>{c === "oficial" ? "🏛️" : c === "estimativa" ? "📐" : "🎲"}</span>{curto ? CLASS_LABEL[c].split(" ")[0] : CLASS_LABEL[c]}</span>;
}

export const Money = ({ v, short = false }: { v: number; short?: boolean }) => <span className="tabular-nums">{short ? brlShort(v) : brl(v)}</span>;

/** Barra de indicador com valor, ícone e texto (a informação nunca depende só da cor). */
export function Meter({ icon, label, value, max = 100, unit = "", good = "up", tone, compact = false, delta }: { icon: string; label: string; value: number; max?: number; unit?: string; good?: "up" | "down"; tone?: string; compact?: boolean; delta?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const score = good === "up" ? pct : 100 - pct;
  const color = tone ?? (score >= 66 ? "var(--g-green)" : score >= 40 ? "var(--g-yellow)" : "var(--g-red)");
  return (
    <div className={compact ? "min-w-[92px]" : ""} role="group" aria-label={`${label}: ${Math.round(value)}${unit}`}>
      <div className="flex items-center justify-between gap-2 text-[0.78rem] font-bold leading-tight" style={{ fontFamily: "var(--g-display)" }}>
        <span className="flex items-center gap-1"><span aria-hidden>{icon}</span>{label}</span>
        <span className="tabular-nums">{Math.round(value)}{unit}{delta ? <span className="ml-1 text-[0.7rem]" style={{ color: (delta > 0) === (good === "up") ? "var(--g-green-d)" : "var(--g-red-d)" }}>{delta > 0 ? "▲" : "▼"}{Math.abs(Math.round(delta))}</span> : null}</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#ead9b6]" aria-hidden><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

/** Janela modal acessível: foco preso, Esc fecha, devolve o foco ao acionador. */
export function Modal({ title, onClose, children, wide = false, tone, labelledBy, dismissible = true, footer }: { title: string; onClose?: () => void; children: ReactNode; wide?: boolean; tone?: string; labelledBy?: string; dismissible?: boolean; footer?: ReactNode }) {
  const id = useId(); const ref = useRef<HTMLDivElement>(null); const prev = useRef<Element | null>(null);
  useEffect(() => {
    prev.current = document.activeElement;
    const el = ref.current; el?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible && onClose) { e.stopPropagation(); onClose(); }
      if (e.key === "Tab" && el) {
        const f = [...el.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0]!, last = f.at(-1)!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("keydown", key, true); (prev.current as HTMLElement | null)?.focus?.(); };
  }, [onClose, dismissible]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b2340]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible) onClose?.(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? id} tabIndex={-1} className={`g-card g-pop flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-b-[18px] ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"}`} style={tone ? { borderColor: tone } : undefined}>
        <header className="flex items-center justify-between gap-3 border-b-2 border-[color:var(--g-line)] px-4 py-3">
          <h2 id={labelledBy ?? id} className="text-xl font-bold leading-tight">{title}</h2>
          {onClose && dismissible && <button type="button" onClick={onClose} className="g-btn ghost sm" aria-label="Fechar">✕</button>}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-[color:var(--g-line)] bg-[#fff6e3] px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Toast({ msg, tone = "ink" }: { msg: string; tone?: "ink" | "ok" | "bad" }) {
  const bg = tone === "ok" ? "var(--g-green-d)" : tone === "bad" ? "var(--g-red-d)" : "var(--g-ink)";
  return <div role="status" aria-live="polite" className="g-slide pointer-events-none fixed bottom-24 left-1/2 z-[60] max-w-[92vw] -translate-x-1/2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white shadow-2xl" style={{ background: bg, fontFamily: "var(--g-display)" }}>{msg}</div>;
}

export const FictionBadge = ({ className = "" }: { className?: string }) => <span className={`g-chip si ${className}`}>🎭 SIMULAÇÃO FICTÍCIA DO JOGO</span>;
