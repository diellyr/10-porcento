"use client";
import { useState } from "react";
import { BRASIL, PlacePicker, type PlaceValue } from "@/components/place-picker";
import { colorFor } from "@/components/charts/share-bar";
import { Card, Notice, Skeleton } from "@/components/ui/primitives";
import { Help } from "@/components/ui/help";
import { SourceNote } from "@/components/ui/provenance";
import type { QueryDTO } from "@/lib/dto";
import { formatBRL, formatBRLCompact } from "@/lib/format";
import { useJson } from "@/lib/use-json";
import { FUNCTIONS } from "@/server/core/catalog-info";
import { STAGES } from "@/lib/explorer-spec";
import type { FiscalMetric } from "@/server/core/types";

type Level = { kind: "function" } | { kind: "subfunction"; fn: string } | { kind: "agency" };

/**
 * Despesa → função → subfunção (e, para a União, órgão). O detalhe termina onde as fontes integradas terminam:
 * programa, ação, fornecedor e pagamento aparecem quando seus conjuntos de dados forem integrados.
 */
export function DrillDown() {
  const thisYear = new Date().getFullYear();
  const [place, setPlace] = useState<PlaceValue>(BRASIL);
  const [year, setYear] = useState(thisYear - 1);
  const [stage, setStage] = useState<FiscalMetric>("EXPENSE_LIQUIDATED");
  const [level, setLevel] = useState<Level>({ kind: "function" });

  const q = new URLSearchParams({ kind: "breakdown", entity_type: place.type, entity_code: place.code, metric: stage, year_from: String(year), year_to: String(year) });
  if (level.kind === "function") q.set("category_type", "FUNCTION");
  if (level.kind === "subfunction") { q.set("category_type", "SUBFUNCTION"); q.set("category_prefix", `${level.fn}.`); }
  if (level.kind === "agency") q.set("category_type", "AGENCY");
  const { data, loading, error } = useJson<QueryDTO>(`/api/v1/query?${q}`);

  const items = (data?.points ?? []).filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  const total = items.reduce((s, p) => s + p.value, 0);
  const sel = "h-10 rounded-lg border border-line bg-surface px-3 text-sm";
  const crumbs = [
    { label: "Despesa", on: () => setLevel({ kind: "function" }) },
    ...(level.kind === "function" ? [{ label: "Por função", on: null }] : []),
    ...(level.kind === "agency" ? [{ label: "Por órgão", on: null }] : []),
    ...(level.kind === "subfunction" ? [{ label: "Por função", on: () => setLevel({ kind: "function" }) }, { label: FUNCTIONS[level.fn] ?? level.fn, on: null }, { label: "Subfunções", on: null }] : []),
  ];
  const deepest = level.kind === "subfunction" || level.kind === "agency";

  return (
    <div>
      <Card className="mb-6 flex flex-wrap items-end gap-4 p-4">
        <PlacePicker value={place} onChange={(p) => { setPlace(p); setLevel({ kind: "function" }); }} />
        <label className="text-sm"><span className="mb-1 block text-ink-3">Ano</span><select className={sel} value={year} onChange={(e) => setYear(Number(e.target.value))}>{Array.from({ length: 15 }, (_, i) => thisYear - 1 - i).map((y) => <option key={y}>{y}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-ink-3">Etapa do gasto<Help term="despesa-liquidada" /></span><select className={sel} value={stage} onChange={(e) => setStage(e.target.value as FiscalMetric)}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        {place.type === "COUNTRY" && (
          <div className="flex gap-2 text-sm" role="group" aria-label="Visão">
            <button type="button" onClick={() => setLevel({ kind: "function" })} className={`h-10 rounded-lg px-3 ${level.kind !== "agency" ? "bg-primary text-white" : "border border-line"}`}>Por função</button>
            <button type="button" onClick={() => setLevel({ kind: "agency" })} className={`h-10 rounded-lg px-3 ${level.kind === "agency" ? "bg-primary text-white" : "border border-line"}`}>Por órgão</button>
          </div>
        )}
      </Card>

      <nav aria-label="Caminho do detalhamento" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-ink-3">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {c.on ? <button type="button" className="text-primary hover:underline" onClick={c.on}>{c.label}</button> : <span className="font-medium text-ink-2">{c.label}</span>}
          </span>
        ))}
      </nav>

      {loading && !data ? <Skeleton className="h-72 w-full" /> : error ? <Notice tone="warn">{error}</Notice> : (
        <Card className="p-5">
          {data?.notice && <div className="mb-4"><Notice tone="warn">{data.notice}</Notice></div>}
          {items.length === 0 ? <Notice tone="info">Sem dados oficiais disponíveis para este nível e período.</Notice> : (
            <ol className="divide-y divide-line">
              {items.slice(0, 40).map((p, i) => {
                const share = p.value / total;
                const label = level.kind === "function" ? (FUNCTIONS[p.categoryCode ?? ""] ?? p.categoryLabel) : (p.categoryLabel ?? p.categoryCode);
                const drill = level.kind === "function" && p.categoryCode;
                const Row = drill ? "button" : "div";
                return (
                  <li key={`${p.categoryType}${p.categoryCode}`}>
                    <Row {...(drill ? { type: "button" as const, onClick: () => setLevel({ kind: "subfunction", fn: p.categoryCode! }) } : {})} className={`flex w-full items-center gap-3 px-2 py-3 text-left ${drill ? "rounded-lg hover:bg-surface-2" : ""}`}>
                      <span className="size-3 shrink-0 rounded-full" style={{ background: colorFor(i, "") }} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] text-ink">{label}{drill && <span className="ml-2 text-xs text-primary">ver subfunções →</span>}</span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full" style={{ width: `${Math.max(share * 100, 0.5)}%`, background: colorFor(i, "") }} /></span>
                      </span>
                      <span className="tabular w-24 text-right text-sm text-ink-3" title={formatBRL(p.value)}>{formatBRLCompact(p.value)}</span>
                      <span className="tabular w-14 text-right font-semibold">{(share * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
                    </Row>
                  </li>
                );
              })}
            </ol>
          )}
          {deepest && items.length > 0 && <p className="mt-4 rounded-lg bg-surface-2 p-3 text-xs text-ink-3">Este é o nível mais detalhado disponível nas fontes integradas hoje. Programa, ação, fornecedor e pagamento serão exibidos quando esses conjuntos de dados forem integrados.</p>}
          <div className="mt-5 border-t border-line pt-4"><SourceNote provenance={data?.provenance ?? []} /></div>
        </Card>
      )}
    </div>
  );
}
