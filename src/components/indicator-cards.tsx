import Link from "next/link";
import { Card } from "@/components/ui/primitives";
import { Help } from "@/components/ui/help";
import { SourceNote } from "@/components/ui/provenance";
import type { Indicator, Overview } from "@/lib/dto";
import { formatBRL, formatBRLCompact } from "@/lib/format";

const COLOR: Record<Indicator["key"], string> = { revenue: "var(--color-revenue)", expense: "var(--color-expense)", result: "var(--color-result)", debt: "var(--color-debt)" };

function Badge({ i }: { i: Indicator }) {
  if (i.freshness === "stale") return <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-medium text-warn">dado salvo anteriormente</span>;
  if (i.freshness === "unavailable" || i.value === null) return <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-3">indisponível</span>;
  return null;
}

export type IndicatorLinks = Partial<Record<Indicator["key"], { href: string; label: string }>>;

export function IndicatorCard({ i, link }: { i: Indicator; link?: { href: string; label: string } }) {
  const negative = i.key === "result" && i.value !== null && i.value < 0;
  return (
    <Card className={`relative flex flex-col p-5 ${link ? "transition-colors hover:border-primary/40" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-ink-2">{i.label}<span className="relative z-10"><Help term={i.glossary} /></span></h3>
        <Badge i={i} />
      </div>
      <p className="tabular mt-3 text-[28px] font-bold leading-none tracking-tight sm:text-[32px]" style={{ color: i.value === null ? "var(--color-ink-3)" : COLOR[i.key] }} title={i.value !== null ? formatBRL(i.value) : undefined}>
        {i.value === null ? "—" : formatBRLCompact(i.value)}
      </p>
      <p className="mt-2 text-xs text-ink-3">
        {i.value !== null && i.year ? <>Ano de referência: <span className="font-medium text-ink-2">{i.year}</span> · </> : null}
        {i.key === "result" && i.value !== null ? (negative ? "gastou mais do que arrecadou" : "arrecadou mais do que gastou") : i.concept}
      </p>
      {i.notice && <p className="mt-3 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">{i.notice}</p>}
      {link && (
        <Link href={link.href} className="mt-3 text-sm font-semibold text-primary after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          Ver em {link.label} <span aria-hidden>→</span>
        </Link>
      )}
      <details className="relative z-10 mt-3 text-xs">
        <summary className="cursor-pointer select-none text-primary hover:underline">Fonte e período</summary>
        <div className="mt-2"><SourceNote provenance={i.provenance} /></div>
      </details>
    </Card>
  );
}

export function IndicatorGrid({ overview, links }: { overview: Overview; links?: IndicatorLinks }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {overview.indicators.map((i) => <IndicatorCard key={i.key} i={i} link={links?.[i.key]} />)}
    </div>
  );
}
