"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/primitives";
import type { Overview } from "@/lib/dto";
import { formatBRLCompact } from "@/lib/format";
import { STATES } from "@/lib/places";
import { StatesMap } from "@/components/states-map";
import { useJson } from "@/lib/use-json";

function StateCard({ s }: { s: (typeof STATES)[number] }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVis(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setVis(true); io.disconnect(); } }, { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const { data, loading } = useJson<Overview>(vis ? `/api/v1/overview?entity_type=STATE&entity_code=${s.code}` : null);
  const val = (k: string) => data?.indicators.find((i) => i.key === k)?.value ?? null;
  const row = (label: string, k: string) => (
    <div className="flex items-baseline justify-between gap-2 text-sm"><dt className="text-ink-3">{label}</dt><dd className="tabular font-medium text-ink">{loading ? "…" : val(k) === null ? "—" : formatBRLCompact(val(k)!)}</dd></div>
  );
  return (
    <Link ref={ref} href={`/estados/${s.uf.toLowerCase()}`} className="group block">
      <Card className="h-full p-4 transition-colors group-hover:border-primary/40">
        <h3 className="font-semibold text-ink group-hover:text-primary">{s.name} <span className="text-xs font-normal text-ink-3">{s.uf}</span></h3>
        <dl className="mt-3 space-y-1">{row("Receitas", "revenue")}{row("Despesas", "expense")}{row("Dívida", "debt")}</dl>
      </Card>
    </Link>
  );
}

export function StatesGrid() {
  const [view, setView] = useState<"list" | "map">("list");
  const tab = (v: "list" | "map", label: string) => (
    <button type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`h-10 rounded-lg px-4 text-sm font-medium ${view === v ? "bg-primary text-white" : "border border-line bg-surface text-ink-2"}`}>{label}</button>
  );
  return (
    <div>
      <div className="mb-5 flex gap-2" role="tablist" aria-label="Forma de visualização">{tab("list", "Lista com números")}{tab("map", "Mapa")}</div>
      {view === "map" ? <StatesMap /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{STATES.map((s) => <StateCard key={s.code} s={s} />)}</div>}
    </div>
  );
}
