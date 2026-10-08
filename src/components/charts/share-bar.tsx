import type { BreakdownItem } from "@/lib/dto";
import { formatBRL, formatBRLCompact } from "@/lib/format";
import { Help } from "@/components/ui/help";

const COLORS = ["var(--color-c1)", "var(--color-c2)", "var(--color-c3)", "var(--color-c4)", "var(--color-c5)", "var(--color-c6)", "var(--color-c7)", "var(--color-c8)"];
export const colorFor = (i: number, code: string) => (code === "OTHER" ? "var(--color-c9)" : COLORS[i % COLORS.length]!);

/** "De cada R$100": barra empilhada + lista com o valor em reais e o valor proporcional. Sem pizza (difícil de comparar). */
export function ShareBar({ items, total, tail, onSelect, selected }: { items: BreakdownItem[]; total: number | null; tail?: string; onSelect?: (code: string) => void; selected?: string | null }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="flex h-10 w-full overflow-hidden rounded-xl bg-surface-2" role="img" aria-label="Divisão proporcional de cada R$ 100">
        {items.map((it, i) => (
          <div key={it.code} title={`${it.label}: R$ ${it.per100.toLocaleString("pt-BR")}`} style={{ width: `${Math.max(it.share * 100, 0.4)}%`, background: colorFor(i, it.code) }} className="h-full border-r border-white/70 last:border-r-0" />
        ))}
      </div>
      <ol className="mt-5 divide-y divide-line">
        {items.map((it, i) => {
          const Row = onSelect && it.code !== "OTHER" ? "button" : "div";
          return (
            <li key={it.code}>
              <Row {...(Row === "button" ? { type: "button" as const, onClick: () => onSelect!(it.code) } : {})} className={`flex w-full items-center gap-3 py-3 text-left ${Row === "button" ? "rounded-lg px-2 hover:bg-surface-2" : "px-2"} ${selected === it.code ? "bg-primary-50" : ""}`}>
                <span className="size-3 shrink-0 rounded-full" style={{ background: colorFor(i, it.code) }} aria-hidden />
                <span className="min-w-0 flex-1 text-[15px] text-ink">{it.label}</span>
                <span className="tabular w-24 text-right text-sm text-ink-3">{formatBRLCompact(it.value)}</span>
                <span className="tabular w-20 text-right text-[17px] font-semibold text-ink">R$ {it.per100.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </Row>
            </li>
          );
        })}
      </ol>
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
