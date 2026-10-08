"use client";
import { useEffect, useId, useState } from "react";
import type { BreakdownItem } from "@/lib/dto";
import { formatBRL, formatBRLCompact, formatPercent } from "@/lib/format";
import { Help } from "@/components/ui/help";
import { explainItem } from "@/lib/explain";

const COLORS = ["var(--color-c1)", "var(--color-c2)", "var(--color-c3)", "var(--color-c4)", "var(--color-c5)", "var(--color-c6)", "var(--color-c7)", "var(--color-c8)"];
export const colorFor = (i: number, code: string) => (code === "OTHER" ? "var(--color-c9)" : COLORS[i % COLORS.length]!);

/** "De cada R$100": barra empilhada + lista com o valor em reais e o valor proporcional. Sem pizza (difícil de comparar). */
function ExplainDialog({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const id = useId();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={id} className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 id={id} className="mb-2 text-lg font-semibold text-ink">{title}</h3>
        <p className="text-[15px] leading-relaxed text-ink-2">{text}</p>
        <button type="button" autoFocus onClick={onClose} className="mt-5 h-10 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:opacity-90">Entendi</button>
      </div>
    </div>
  );
}

export function ShareBar({ items, total, tail, onSelect, selected, lens }: { items: BreakdownItem[]; total: number | null; tail?: string; onSelect?: (code: string) => void; selected?: string | null; /** quando informado, mostra “O que é isso?” em cada item */ lens?: string }) {
  const [open, setOpen] = useState<{ title: string; text: string } | null>(null);
  if (!items.length) return null;
  return (
    <div>
      <div className="flex h-10 w-full overflow-hidden rounded-xl bg-surface-2" role="img" aria-label="Divisão proporcional de cada R$ 100">
        {items.map((it, i) => (
          <div key={it.code} title={`${it.label}: ${formatPercent(it.share * 100)} (R$ ${it.per100.toLocaleString("pt-BR")} de cada R$ 100)`} style={{ width: `${Math.max(it.share * 100, 0.4)}%`, background: colorFor(i, it.code) }} className="h-full border-r border-white/70 last:border-r-0" />
        ))}
      </div>
      <ol className="mt-5 divide-y divide-line">
        {items.map((it, i) => {
          const Row = onSelect && it.code !== "OTHER" ? "button" : "div";
          return (
            <li key={it.code} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:gap-2 sm:py-0">
              <Row {...(Row === "button" ? { type: "button" as const, onClick: () => onSelect!(it.code) } : {})} className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left sm:flex-nowrap sm:py-3 ${Row === "button" ? "rounded-lg px-2 hover:bg-surface-2" : "px-2"} ${selected === it.code ? "bg-primary-50" : ""}`}>
                <span className="size-3 shrink-0 rounded-full" style={{ background: colorFor(i, it.code) }} aria-hidden />
                <span className="min-w-0 flex-1 basis-[calc(100%-1.5rem)] break-words text-[15px] text-ink sm:basis-0">{it.label}</span>
                <span className="flex w-full items-baseline justify-between gap-3 pl-6 sm:w-auto sm:pl-0">
                  <span className="tabular whitespace-nowrap text-sm text-ink-3 sm:w-24 sm:text-right">{formatBRLCompact(it.value)}</span>
                  <span className="tabular whitespace-nowrap text-[17px] font-semibold text-ink sm:w-20 sm:text-right">R$ {it.per100.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="tabular whitespace-nowrap text-sm font-semibold text-primary sm:w-14 sm:text-right" title="Parte do total">{formatPercent(it.share * 100)}</span>
                </span>
              </Row>
              {lens && (
                <button type="button" onClick={() => setOpen(explainItem(lens, it))} aria-label={`O que é ${it.label}?`}
                  className="ml-8 w-fit shrink-0 whitespace-nowrap rounded-md bg-yellow-300 px-2 py-0.5 text-xs font-semibold text-yellow-950 hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:ml-0">
                  O que é isso?
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {open && <ExplainDialog title={open.title} text={open.text} onClose={() => setOpen(null)} />}
      {total != null && (
        <p className="mt-3 text-sm text-ink-3">
          Total considerado: <strong className="tabular text-ink-2">{formatBRL(total)}</strong>
          {tail && <> · {tail}</>}
        </p>
      )}
    </div>
  );
}
export { Help };
