"use client";
import { useMemo, useState } from "react";
import { SeriesChart } from "@/components/charts/lazy";
import { BRASIL, PlacePicker, type PlaceValue } from "@/components/place-picker";
import { Button, Card, Notice, Skeleton } from "@/components/ui/primitives";
import { Help } from "@/components/ui/help";
import { SourceNote } from "@/components/ui/provenance";
import type { Point, QueryDTO } from "@/lib/dto";
import { buildQuery, categoriesFor, csvCell, metricFor, STAGES, SUBJECTS, type Subject } from "@/lib/explorer-spec";
import { formatBRL, formatNumber } from "@/lib/format";
import { placeLabel } from "@/lib/places";
import { useJson } from "@/lib/use-json";
import { FUNCTIONS, EXPENSE_GROUPS, REVENUE_ORIGINS, METRIC_INFO } from "@/server/core/catalog-info";
import type { FiscalMetric } from "@/server/core/types";

const label = (p: Point) => {
  const c = p.categoryCode ?? "";
  return FUNCTIONS[c] ?? EXPENSE_GROUPS[c] ?? REVENUE_ORIGINS[c.split(".").slice(0, 2).join(".")] ?? p.categoryLabel ?? (c || "Total");
};

/** Série de uma consulta: total por ano quando "Todas"; senão a soma da categoria escolhida. */
function seriesOf(d: QueryDTO | null, specific: boolean): Array<{ year: number; value: number }> {
  if (!d) return [];
  if (!specific && d.totals.length) return d.totals;
  const by = new Map<number, number>();
  for (const p of d.points) by.set(p.year, (by.get(p.year) ?? 0) + p.value);
  return [...by].map(([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year);
}

export function Explorer({ preset, initialPlace }: { preset?: Subject; initialPlace?: PlaceValue }) {
  const thisYear = new Date().getFullYear();
  const [subject, setSubject] = useState<Subject>(preset ?? "revenue");
  const [stage, setStage] = useState<FiscalMetric>("EXPENSE_LIQUIDATED");
  const [measure, setMeasure] = useState<"value" | "people">("value");
  const [place, setPlace] = useState<PlaceValue>(initialPlace ?? (subject === "benefit" ? { type: "MUNICIPALITY", code: "3541406", name: "Praia Grande", uf: "SP" } : BRASIL));
  const [compare, setCompare] = useState<PlaceValue | null>(null);
  const [from, setFrom] = useState(thisYear - 5);
  const [to, setTo] = useState(thisYear - 1);
  const [catId, setCatId] = useState("total");

  const cats = useMemo(() => categoriesFor(subject, place.type), [subject, place.type]);
  const cat = cats.find((c) => c.id === catId) ?? cats[0]!;
  const specific = !!cat.categoryCode;
  const spanOk = to >= from && to - from + 1 <= 12;

  const url = (p: PlaceValue) => (spanOk ? buildQuery({ subject, stage, benefitMeasure: measure, place: p, cat, from, to }) : null);
  const main = useJson<QueryDTO>(url(place));
  const other = useJson<QueryDTO>(compare ? url(compare) : null);

  const unit: "BRL" | "COUNT" = subject === "benefit" && measure === "people" ? "COUNT" : "BRL";
  const metric = metricFor(subject, stage, measure);
  const years = Array.from({ length: thisYear - 2009 }, (_, i) => 2010 + i);
  const sel = "h-10 rounded-lg border border-line bg-surface px-3 text-sm";

  const chartSeries = [
    { name: placeLabel(place), color: "var(--color-primary)", data: seriesOf(main.data, specific) },
    ...(compare ? [{ name: placeLabel(compare), color: "var(--color-accent)", data: seriesOf(other.data, specific) }] : []),
  ].filter((s) => s.data.length);

  // tabela dinâmica: linhas = categoria, colunas = ano
  const pts = main.data?.points ?? [];
  const yrs = [...new Set(pts.map((p) => p.year))].sort((a, b) => a - b);
  const rows = [...new Map(pts.map((p) => [`${p.categoryType}|${p.categoryCode}|${p.relatedCode}`, p])).values()]
    .map((p) => ({ key: `${p.categoryType}|${p.categoryCode}|${p.relatedCode}`, name: label(p), code: p.categoryCode }))
    .map((r) => ({ ...r, cells: yrs.map((y) => pts.find((p) => `${p.categoryType}|${p.categoryCode}|${p.relatedCode}` === r.key && p.year === y)?.value ?? null) }))
    .sort((a, b) => Math.abs(b.cells.at(-1) ?? 0) - Math.abs(a.cells.at(-1) ?? 0))
    .slice(0, 60);
  const fmt = (v: number | null) => (v === null ? "—" : unit === "COUNT" ? formatNumber(v) : formatBRL(v));

  const download = () => {
    const head = ["Categoria", ...yrs].map(csvCell).join(";");
    const body = rows.map((r) => [csvCell(r.name), ...r.cells.map((c) => csvCell(c))].join(";"));
    const src = (main.data?.provenance ?? []).map((p) => `# Fonte: ${p.provider} · ${p.dataset ?? ""} · coletado em ${p.fetchedAt.slice(0, 10)}`).join("\n");
    const blob = new Blob([`﻿${head}\n${body.join("\n")}\n${src}\n`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `brasil-fiscal-${metric.toLowerCase()}-${place.code}-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <Card className="mb-6 space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-4">
          {!preset && (
            <label className="text-sm">
              <span className="mb-1 block text-ink-3">Quero analisar</span>
              <select className={sel} value={subject} onChange={(e) => { const s = e.target.value as Subject; setSubject(s); setCatId("total"); if (s === "benefit" && place.type !== "MUNICIPALITY") setPlace({ type: "MUNICIPALITY", code: "3541406", name: "Praia Grande", uf: "SP" }); }}>
                {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          )}
          {subject === "expense" && (
            <label className="text-sm">
              <span className="mb-1 block text-ink-3">Etapa do gasto<Help term={METRIC_INFO[stage].glossary} /></span>
              <select className={sel} value={stage} onChange={(e) => setStage(e.target.value as FiscalMetric)}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            </label>
          )}
          {subject === "benefit" && (
            <label className="text-sm">
              <span className="mb-1 block text-ink-3">Medida</span>
              <select className={sel} value={measure} onChange={(e) => setMeasure(e.target.value as "value" | "people")}><option value="value">Valor pago (R$)</option><option value="people">Beneficiários</option></select>
            </label>
          )}
        </div>
        <PlacePicker value={place} onChange={(p) => { setPlace(p); setCatId("total"); }} allow={subject === "benefit" ? ["MUNICIPALITY"] : undefined} />
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm"><span className="mb-1 block text-ink-3">De</span><select className={sel} value={from} onChange={(e) => setFrom(Number(e.target.value))}>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Até</span><select className={sel} value={to} onChange={(e) => setTo(Number(e.target.value))}>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label className="min-w-64 flex-1 text-sm"><span className="mb-1 block text-ink-3">Categoria</span>
            <select className={`${sel} w-full`} value={cat.id} onChange={(e) => setCatId(e.target.value)}>{cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          </label>
        </div>
        {subject !== "benefit" && (
          <div className="text-sm">
            {compare ? (
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-ink-3">Comparar com:</span>
                <PlacePicker value={compare} onChange={setCompare} />
                <Button variant="ghost" onClick={() => setCompare(null)}>Remover comparação</Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setCompare(place.type === "COUNTRY" ? { type: "STATE", code: "35", name: "São Paulo", uf: "SP" } : { ...place, code: place.type === "STATE" ? "33" : "3548500", name: place.type === "STATE" ? "Rio de Janeiro" : "Santos", uf: place.type === "STATE" ? "RJ" : "SP" })}>+ Comparar com outro local</Button>
            )}
          </div>
        )}
      </Card>

      {!spanOk && <Notice tone="warn">Escolha um período válido (de 1 a 12 anos, com “Até” maior ou igual a “De”).</Notice>}
      {spanOk && (main.loading || other.loading) && !main.data ? <Skeleton className="h-[340px] w-full" /> : null}
      {main.error && <Notice tone="warn">{main.error}</Notice>}
      {main.data && (
        <div className="space-y-6">
          {main.data.notice && <Notice tone={main.data.freshness === "unavailable" ? "info" : "warn"}>{main.data.notice}</Notice>}
          {chartSeries.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-1 text-lg font-semibold">{METRIC_INFO[metric].label} — {cat.label}</h2>
              <p className="mb-4 text-sm text-ink-3">{from}–{to} · valores nominais{unit === "COUNT" ? "" : ", sem correção pela inflação"}</p>
              <SeriesChart series={chartSeries} unit={unit} />
            </Card>
          )}
          {rows.length > 0 && (
            <Card className="p-0">
              <div className="flex items-center justify-between p-5 pb-3">
                <h2 className="text-lg font-semibold">Tabela de dados</h2>
                <Button variant="secondary" onClick={download}>Baixar CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-y border-line bg-surface-2 text-left text-ink-3"><th className="sticky left-0 bg-surface-2 px-5 py-2 font-medium">Categoria</th>{yrs.map((y) => <th key={y} className="px-3 py-2 text-right font-medium">{y}</th>)}</tr></thead>
                  <tbody>{rows.map((r) => <tr key={r.key} className="border-b border-line last:border-0"><th scope="row" className="sticky left-0 bg-surface px-5 py-2 text-left font-normal">{r.name}</th>{r.cells.map((c, i) => <td key={i} className="tabular whitespace-nowrap px-3 py-2 text-right">{fmt(c)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </Card>
          )}
          {main.data.points.length === 0 && !main.data.notice && <Notice tone="info">Sem dados oficiais disponíveis para este recorte.</Notice>}
          <SourceNote provenance={main.data.provenance} />
        </div>
      )}
    </div>
  );
}
