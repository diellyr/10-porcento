"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, Notice, Skeleton } from "@/components/ui/primitives";
import { Help } from "@/components/ui/help";
import { SourceNote } from "@/components/ui/provenance";
import { buildCsv, downloadCsv } from "@/lib/csv-download";
import { formatBRL, formatBRLCompact, formatPercent } from "@/lib/format";
import { STATES } from "@/lib/places";
import { useJson } from "@/lib/use-json";
import { FUNCTIONS, METRIC_INFO } from "@/server/core/catalog-info";
import type { RankingResult } from "@/server/services/rankings";

const sel = "h-10 rounded-lg border border-line bg-surface px-3 text-sm";
const ORDERS = [["value_desc", "Maiores valores"], ["value_asc", "Menores valores"], ["change_desc", "Maior aumento"], ["change_asc", "Maior redução"]] as const;

export function RankingsView() {
  const thisYear = new Date().getFullYear();
  const [type, setType] = useState<"STATE" | "MUNICIPALITY">("STATE");
  const [uf, setUf] = useState("");
  const [subject, setSubject] = useState<"expense" | "revenue">("expense");
  const [stage, setStage] = useState("EXPENSE_LIQUIDATED");
  const [fn, setFn] = useState("");
  const [order, setOrder] = useState<(typeof ORDERS)[number][0]>("value_desc");
  const [year, setYear] = useState(thisYear - 1);
  const [perCapita, setPerCapita] = useState(false);
  const [version, setVersion] = useState(0);
  const [fill, setFill] = useState<{ done: number; total: number } | null>(null);
  const [fillFailed, setFillFailed] = useState(0);

  const metric = subject === "revenue" ? "REVENUE_REALIZED" : stage;
  const compare = order.startsWith("change") ? year - 1 : null;
  const catType = subject === "revenue" ? "REVENUE_SOURCE" : "FUNCTION";
  const url = useMemo(() => {
    const q = new URLSearchParams({ entity_type: type, metric, year: String(year), order, per_capita: String(perCapita), limit: "20", category_type: catType, v: String(version) });
    if (type === "MUNICIPALITY" && uf) q.set("uf", uf);
    if (subject === "expense" && fn) q.set("category_code", fn);
    if (compare) q.set("compare_year", String(compare));
    return `/api/v1/rankings?${q}`;
  }, [type, uf, subject, metric, fn, order, year, perCapita, compare, catType, version]);
  const { data, loading, error } = useJson<RankingResult>(url);

  /** Uma consulta de estado; em 429 espera o Retry-After e tenta de novo (até 4 vezes). Retorna se deu certo. */
  const fetchState = async (q: URLSearchParams): Promise<boolean> => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await fetch(`/api/v1/query?${q}`).catch(() => null);
      if (r?.ok) return true;
      if (r?.status === 429) { await new Promise((res) => setTimeout(res, Math.min(Number(r.headers.get("retry-after")) || 5, 30) * 1000)); continue; }
      if (r && r.status < 500) return false; // erro definitivo (validação etc.)
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }
    return false;
  };

  const completeStates = async () => {
    const years = compare ? [compare, year] : [year];
    let done = 0, failed = 0;
    setFillFailed(0);
    setFill({ done, total: STATES.length });
    const queue = [...STATES];
    const worker = async () => {
      for (let s = queue.shift(); s; s = queue.shift()) {
        const q = new URLSearchParams({ kind: "series", entity_type: "STATE", entity_code: s.code, metric, category_type: catType, year_from: String(Math.min(...years)), year_to: String(year), include_points: "0" });
        if (subject === "expense" && fn) q.set("category_code", fn);
        if (!(await fetchState(q))) failed++;
        setFill({ done: ++done, total: STATES.length });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setFill(null);
    setFillFailed(failed);
    setVersion((v) => v + 1);
  };

  const listTotal = (data?.items ?? []).reduce((a, r) => a + (r.value > 0 ? r.value : 0), 0);
  const fmt = (v: number) => (perCapita ? `${formatBRL(v)}/hab.` : formatBRLCompact(v));
  const years = Array.from({ length: thisYear - 2009 }, (_, i) => thisYear - 1 - i);
  return (
    <div>
      <Card className="mb-6 flex flex-wrap items-end gap-x-5 gap-y-4 p-4">
        <label className="text-sm"><span className="mb-1 block text-ink-3">Comparar</span>
          <select className={sel} value={type} onChange={(e) => setType(e.target.value as "STATE" | "MUNICIPALITY")}><option value="STATE">Estados</option><option value="MUNICIPALITY">Municípios</option></select></label>
        {type === "MUNICIPALITY" && <label className="text-sm"><span className="mb-1 block text-ink-3">Estado</span>
          <select className={sel} value={uf} onChange={(e) => setUf(e.target.value)}><option value="">Todos</option>{STATES.map((s) => <option key={s.uf} value={s.uf}>{s.name}</option>)}</select></label>}
        <label className="text-sm"><span className="mb-1 block text-ink-3">Assunto</span>
          <select className={sel} value={subject} onChange={(e) => { setSubject(e.target.value as "expense" | "revenue"); setFn(""); }}><option value="expense">Despesa</option><option value="revenue">Receita arrecadada</option></select></label>
        {subject === "expense" && <>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Etapa<Help term={METRIC_INFO[stage as keyof typeof METRIC_INFO].glossary} /></span>
            <select className={sel} value={stage} onChange={(e) => setStage(e.target.value)}><option value="EXPENSE_LIQUIDATED">Liquidada</option><option value="EXPENSE_PAID">Paga</option><option value="EXPENSE_COMMITTED">Empenhada</option></select></label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Área</span>
            <select className={sel} value={fn} onChange={(e) => setFn(e.target.value)}><option value="">Todas</option>{Object.entries(FUNCTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </>}
        <label className="text-sm"><span className="mb-1 block text-ink-3">Ordenar por</span>
          <select className={sel} value={order} onChange={(e) => setOrder(e.target.value as typeof order)}>{ORDERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-ink-3">Ano</span>
          <select className={sel} value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" checked={perCapita} onChange={(e) => setPerCapita(e.target.checked)} /> Por habitante</label>
      </Card>

      {loading && !data && <Skeleton className="h-72" />}
      {error && <Notice tone="warn">{error}</Notice>}
      {data && (
        <div className="space-y-4">
          {data.note && (
            <Notice tone="warn">
              {data.note}
              {fillFailed > 0 && <span className="mt-2 block font-medium">Não foi possível buscar {fillFailed} estado(s) agora (fonte indisponível ou limite de consultas). Tente de novo em instantes.</span>}
              {data.fillable && (
                <span className="mt-2 flex flex-wrap items-center gap-3">
                  <Button variant="secondary" disabled={!!fill} onClick={completeStates}>{fill ? `Buscando dados oficiais… ${fill.done}/${fill.total}` : "Completar dados dos 27 estados"}</Button>
                  <span className="text-xs">Consulta as fontes oficiais estado por estado (pode levar alguns instantes) e salva para as próximas pessoas.</span>
                </span>
              )}
            </Notice>
          )}
          {data.items.length > 0 && (
            <Card className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface-2 text-xs text-ink-3"><tr><th className="px-5 py-2">#</th><th className="px-3 py-2">{type === "STATE" ? "Estado" : "Município"}</th><th className="px-3 py-2 text-right">{compare ?? year}{compare ? ` → ${year}` : ""}</th>{!perCapita && !compare && <th className="px-3 py-2 text-right" title="Parte da soma dos itens desta lista">% da lista</th>}{compare && <th className="px-3 py-2 text-right">Variação</th>}</tr></thead>
                  <tbody>
                    {data.items.map((r, i) => (
                      <tr key={r.code} className="border-b border-line last:border-0">
                        <td className="tabular px-5 py-3 text-ink-3">{i + 1}</td>
                        <td className="px-3 py-3 font-medium"><Link className="hover:text-primary" href={type === "STATE" ? `/estados/${(r.uf ?? "").toLowerCase()}` : `/municipios/${r.code}`}>{r.name}{type === "MUNICIPALITY" && r.uf ? ` - ${r.uf}` : ""}</Link></td>
                        <td className="tabular whitespace-nowrap px-3 py-3 text-right">{compare && r.previous != null && <span className="mr-2 text-ink-3">{fmt(r.previous)} →</span>}<strong>{fmt(r.value)}</strong></td>
                        {!perCapita && !compare && <td className="tabular px-3 py-3 text-right text-ink-2">{listTotal > 0 ? formatPercent((r.value / listTotal) * 100) : "—"}</td>}
                        {compare && <td className={`tabular px-3 py-3 text-right font-semibold ${(r.changePct ?? 0) >= 0 ? "text-warn" : "text-ok"}`}>{r.changePct != null ? `${r.changePct >= 0 ? "+" : ""}${r.changePct.toLocaleString("pt-BR")}%` : "—"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end border-t border-line px-5 py-3">
                <Button variant="secondary" onClick={() => downloadCsv(`brasil-fiscal-ranking-${type.toLowerCase()}-${metric.toLowerCase()}-${year}.csv`, buildCsv(
                  ["Posição", "Código IBGE", "Nome", "UF", "Valor", ...(compare ? [`Valor ${compare}`, "Variação %"] : [])],
                  data.items.map((r, i) => [i + 1, r.code, r.name, r.uf, r.value, ...(compare ? [r.previous, r.changePct] : [])]),
                  [`Fonte: Tesouro Nacional (SICONFI) · ${subject === "revenue" ? "DCA-Anexo I-C" : "DCA-Anexo I-E"} · ${metric} · ${compare ? `${compare}-${year}` : year}${perCapita ? " · por habitante" : ""}`, `Cobertura: ${data.covered} de ${data.total} com dado salvo`, "Valores nominais, sem correção pela inflação"],
                ))}>Baixar CSV</Button>
              </div>
              <p className="border-t border-line px-5 py-3 text-xs text-ink-3">Valores nominais (sem correção pela inflação). Cobertura: {data.covered} de {data.total} {type === "STATE" ? "estados" : "municípios"}{uf ? ` de ${uf}` : ""} com dado salvo. {data.complete ? "Ranking completo." : "Ranking parcial: considera só quem já tem dado."}</p>
            </Card>
          )}
          <SourceNote provenance={[{ sourceSlug: "siconfi", sourceName: "SICONFI", provider: "Tesouro Nacional", dataset: subject === "revenue" ? "DCA-Anexo I-C" : "DCA-Anexo I-E", fetchedAt: new Date().toISOString(), sourceUpdatedAt: null, url: null, documentationUrl: "https://apidatalake.tesouro.gov.br/docs/siconfi/", periodLabel: compare ? `${compare}–${year}` : String(year) }]} />
        </div>
      )}
    </div>
  );
}
