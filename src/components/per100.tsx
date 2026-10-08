"use client";
import { useMemo, useState } from "react";
import { Card, Notice, Skeleton } from "@/components/ui/primitives";
import { Help } from "@/components/ui/help";
import { SourceNote } from "@/components/ui/provenance";
import { ShareBar } from "@/components/charts/share-bar";
import { BRASIL, PlacePicker, type PlaceValue } from "@/components/place-picker";
import type { Per100 } from "@/lib/dto";
import { useJson } from "@/lib/use-json";

type Side = "expense" | "revenue";
const LENSES: Record<Side, Array<{ id: string; label: string; hint: string }>> = {
  expense: [
    { id: "function", label: "Por área (saúde, educação…)", hint: "Em que área o dinheiro foi aplicado." },
    { id: "nature", label: "Por tipo de gasto (pessoal, juros, investimentos…)", hint: "Com o que o dinheiro foi gasto." },
  ],
  revenue: [
    { id: "origin", label: "Por origem (impostos, contribuições, transferências…)", hint: "De que tipo de receita vem o dinheiro." },
    { id: "tax", label: "Por tributo federal (IR, Cofins, IPI…)", hint: "Disponível para a União, a partir dos dados da Receita Federal." },
  ],
};
const METRICS = [
  { id: "EXPENSE_LIQUIDATED", label: "Liquidada", term: "despesa-liquidada" },
  { id: "EXPENSE_PAID", label: "Paga", term: "despesa-paga" },
  { id: "EXPENSE_COMMITTED", label: "Empenhada", term: "despesa-empenhada" },
];

export function Per100View({ side, initialPlace = BRASIL, lockPlace = false, initial }: { side: Side; initialPlace?: PlaceValue; lockPlace?: boolean; initial?: Per100 | null }) {
  const thisYear = new Date().getFullYear();
  const [place, setPlace] = useState<PlaceValue>(initialPlace);
  const [year, setYear] = useState(initial?.year ?? thisYear - 1);
  const [lens, setLens] = useState(LENSES[side][0]!.id);
  const [metric, setMetric] = useState("EXPENSE_LIQUIDATED");
  const url = useMemo(() => {
    const q = new URLSearchParams({ side, lens, entity_type: place.type, entity_code: place.code, year: String(year) });
    if (side === "expense") q.set("metric", metric);
    return `/api/v1/per-100?${q}`;
  }, [side, lens, place, year, metric]);
  const pristine = initial && place.code === initialPlace.code && year === initial.year && lens === LENSES[side][0]!.id && metric === "EXPENSE_LIQUIDATED";
  const { data, loading, error } = useJson<Per100>(pristine ? null : url);
  const d = pristine ? initial : data;
  const years = Array.from({ length: 12 }, (_, i) => thisYear - 1 - i);
  const sel = "h-10 rounded-lg border border-line bg-surface px-3 text-sm";

  return (
    <div>
      <Card className="mb-6 flex flex-wrap items-end gap-x-5 gap-y-4 p-4">
        {!lockPlace && <PlacePicker value={place} onChange={(p) => { setPlace(p); if (side === "revenue" && p.type !== "COUNTRY" && lens === "tax") setLens("origin"); }} />}
        <label className="text-sm">
          <span className="mb-1 block text-ink-3">Ano</span>
          <select className={sel} value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y}>{y}</option>)}</select>
        </label>
        <label className="min-w-56 flex-1 text-sm">
          <span className="mb-1 block text-ink-3">Como dividir</span>
          <select className={`${sel} w-full`} value={lens} onChange={(e) => setLens(e.target.value)}>
            {LENSES[side].filter((l) => l.id !== "tax" || place.type === "COUNTRY").map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
        {side === "expense" && (
          <label className="text-sm">
            <span className="mb-1 block text-ink-3">Etapa do gasto<Help term={METRICS.find((m) => m.id === metric)!.term} /></span>
            <select className={sel} value={metric} onChange={(e) => setMetric(e.target.value)}>{METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
          </label>
        )}
      </Card>

      {loading && !d ? (
        <div className="space-y-3"><Skeleton className="h-10 w-full" />{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : error ? (
        <Notice tone="warn">{error}</Notice>
      ) : d ? (
        <Card className="p-5 sm:p-7">
          {d.items.length > 0 ? (
            <>
              <h2 className="mb-1 text-xl font-semibold text-ink sm:text-2xl">
                {side === "expense" ? "De cada R$ 100 gastos" : "De cada R$ 100 arrecadados"} {place.type === "COUNTRY" ? "pelo governo federal" : place.type === "STATE" ? `pelo governo de ${place.name}` : `pela prefeitura de ${place.name}`}
              </h2>
              <p className="mb-6 text-sm text-ink-3">
                Ano {d.year}{d.year !== year && <> (ainda não há dados de {year}; mostrando o ano anterior mais recente)</>} · {LENSES[side].find((l) => l.id === d.lens)?.hint}
              </p>
              <ShareBar items={d.items} total={d.total} tail={side === "expense" && d.lens === "function" ? "“Encargos especiais” inclui, entre outros, o pagamento de juros e amortização da dívida." : undefined} />
            </>
          ) : (
            <Notice tone="info">{d.notice ?? "Os dados oficiais deste recorte ainda não estão disponíveis."}</Notice>
          )}
          {d.notice && d.items.length > 0 && <div className="mt-4"><Notice tone="warn">{d.notice}</Notice></div>}
          <div className="mt-6 border-t border-line pt-4"><SourceNote provenance={d.provenance} /></div>
        </Card>
      ) : null}
    </div>
  );
}
