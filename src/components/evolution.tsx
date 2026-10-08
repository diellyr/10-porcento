"use client";
import { useEffect, useRef, useState } from "react";
import { SeriesChart } from "@/components/charts/lazy";
import { Card, Notice, Skeleton } from "@/components/ui/primitives";
import { SourceNote } from "@/components/ui/provenance";
import type { QueryDTO } from "@/lib/dto";
import { useJson } from "@/lib/use-json";

/** Evolução de arrecadação × despesa. Só busca quando entra na tela (não pesa o carregamento inicial). */
export function Evolution({ type, code, year, years = 6 }: { type: string; code: string; year: number; years?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const from = Math.max(2000, year - years + 1);
  const base = `entity_type=${type}&entity_code=${code}&year_from=${from}&year_to=${year}&include_points=0&kind=series`;
  const rev = useJson<QueryDTO>(visible ? `/api/v1/query?${base}&metric=REVENUE_REALIZED&category_type=REVENUE_SOURCE` : null);
  const exp = useJson<QueryDTO>(visible ? `/api/v1/query?${base}&metric=EXPENSE_LIQUIDATED&category_type=FUNCTION` : null);
  const loading = visible && (rev.loading || exp.loading);
  const series = [
    { name: "Arrecadação", color: "var(--color-revenue)", data: rev.data?.totals ?? [] },
    { name: "Despesa liquidada", color: "var(--color-expense)", data: exp.data?.totals ?? [] },
  ].filter((s) => s.data.length);
  const notices = [rev.data?.notice, exp.data?.notice].filter(Boolean);
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Evolução: arrecadação e despesas</h2>
      <p className="mb-4 text-sm text-ink-3">Valores nominais (sem correção pela inflação), de {from} a {year}.</p>
      <div ref={ref}>
        {!visible || loading ? <Skeleton className="h-[280px] w-full" /> : series.length ? <SeriesChart series={series} /> : <Notice tone="info">Ainda não há dados oficiais salvos para este período.</Notice>}
      </div>
      {notices.length > 0 && <div className="mt-3"><Notice tone="warn">{notices[0]}</Notice></div>}
      <div className="mt-4 border-t border-line pt-3"><SourceNote provenance={[...(rev.data?.provenance ?? []), ...(exp.data?.provenance ?? [])]} /></div>
    </Card>
  );
}
