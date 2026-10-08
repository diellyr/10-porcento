"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SeriesChart } from "@/components/charts/lazy";
import { Button, Card, Notice, Skeleton } from "@/components/ui/primitives";
import { Help } from "@/components/ui/help";
import { SourceNote } from "@/components/ui/provenance";
import type { PlaceDTO } from "@/lib/dto";
import { buildCsv, downloadCsv } from "@/lib/csv-download";
import { formatBRL, formatBRLCompact, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { useDebounced, useJson } from "@/lib/use-json";
import type { ContractsResult } from "@/server/services/contracts";

type Mode = "supplier" | "agency";
const maskCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};
const sel = "h-11 rounded-lg border border-line bg-surface px-3 text-sm";

function AgencyPicker({ onPick }: { onPick: (code: string, name: string) => void }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim(), 250);
  const { data } = useJson<{ results: PlaceDTO[] }>(dq.length >= 3 && !/^\d+$/.test(dq) ? `/api/v1/search?q=${encodeURIComponent(dq)}&types=all` : null);
  const agencies = (data?.results ?? []).filter((r) => r.type === "AGENCY");
  return (
    <div className="relative min-w-72 flex-1">
      <label className="block text-sm"><span className="mb-1 block text-ink-3">Órgão (nome ou código SIAFI)</span>
        <input className={`${sel} w-full`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: Ministério da Saúde ou 36000" />
      </label>
      {/^\d{1,8}$/.test(q.trim()) && <button type="button" className="mt-2 text-sm text-primary hover:underline" onClick={() => onPick(q.trim(), q.trim())}>Usar código {q.trim()}</button>}
      {agencies.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-xl">
          {agencies.map((a) => <li key={a.code}><button type="button" className="flex w-full justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-primary-50" onClick={() => { onPick(a.code, a.name); setQ(a.name); }}><span>{a.name}</span><span className="text-xs text-ink-3">{a.code}</span></button></li>)}
        </ul>
      )}
    </div>
  );
}

export function ContractsExplorer() {
  const router = useRouter();
  const sp = useSearchParams();
  const thisYear = new Date().getFullYear();
  const [mode, setMode] = useState<Mode>(sp.get("orgao") ? "agency" : "supplier");
  const [cnpj, setCnpj] = useState(maskCnpj(sp.get("cnpj") ?? ""));
  const [agency, setAgency] = useState<{ code: string; name: string } | null>(sp.get("orgao") ? { code: sp.get("orgao")!, name: sp.get("orgao")! } : null);
  const [year, setYear] = useState(Number(sp.get("ano")) || thisYear);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [more, setMore] = useState<ContractsResult["items"]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const baseQuery = useMemo(() => {
    if (mode === "supplier") return /^\d{14}$/.test(cnpj.replace(/\D/g, "")) ? `cnpj=${cnpj.replace(/\D/g, "")}` : null;
    return agency ? `agency=${agency.code}&year=${year}` : null;
  }, [mode, cnpj, agency, year]);

  // auto-consulta ao chegar por link compartilhado
  useEffect(() => { if (baseQuery && (sp.get("cnpj") || sp.get("orgao")) && !submitted) setSubmitted(baseQuery); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error } = useJson<ContractsResult>(submitted ? `/api/v1/contracts?${submitted}&limit=25` : null);
  useEffect(() => { setMore([]); setCursor(null); }, [submitted]);
  const nextCursor = cursor ?? data?.next ?? null;
  const items = [...(data?.items ?? []), ...more];
  const hasMore = (cursor === null ? data?.next : cursor) != null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseQuery) return;
    setSubmitted(baseQuery);
    router.replace(mode === "supplier" ? `/contratos?cnpj=${cnpj.replace(/\D/g, "")}` : `/contratos?orgao=${agency!.code}&ano=${year}`, { scroll: false });
  };

  const loadMore = async () => {
    if (!submitted || nextCursor == null) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/v1/contracts?${submitted}&limit=25&cursor=${nextCursor}`);
      const body = (await r.json()) as ContractsResult;
      setMore((m) => [...m, ...body.items]);
      setCursor(body.next ?? 0);
    } finally { setLoadingMore(false); }
  };

  const s = data?.summary;
  const bySupplier = data?.query.by === "supplier";
  return (
    <div>
      <Notice tone="info">Mostramos apenas contratos com <strong>empresas (CNPJ)</strong>, em respeito à LGPD. Contratos com pessoas físicas não são coletados nem exibidos.</Notice>
      <Card className="mb-6 mt-4 p-4 sm:p-5">
        <div className="mb-4 flex gap-2" role="tablist" aria-label="Tipo de busca">
          {([["supplier", "Por fornecedor (CNPJ)"], ["agency", "Por órgão e ano"]] as const).map(([m, label]) => (
            <button key={m} role="tab" aria-selected={mode === m} type="button" onClick={() => setMode(m)} className={`h-10 rounded-lg px-4 text-sm font-medium ${mode === m ? "bg-primary text-white" : "border border-line bg-surface text-ink-2"}`}>{label}</button>
          ))}
        </div>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-4">
          {mode === "supplier" ? (
            <label className="min-w-72 flex-1 text-sm"><span className="mb-1 block text-ink-3">CNPJ da empresa</span>
              <input className={`${sel} w-full font-mono`} inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" aria-describedby="cnpj-help" />
              <span id="cnpj-help" className="mt-1 block text-xs text-ink-3">Digite os 14 números. Para buscar por nome, use a busca no topo (empresas já consultadas).</span>
            </label>
          ) : (
            <>
              <AgencyPicker onPick={(code, name) => setAgency({ code, name })} />
              <label className="text-sm"><span className="mb-1 block text-ink-3">Ano</span>
                <select className={sel} value={year} onChange={(e) => setYear(Number(e.target.value))}>{Array.from({ length: 15 }, (_, i) => thisYear - i).map((y) => <option key={y}>{y}</option>)}</select>
              </label>
            </>
          )}
          <Button type="submit" disabled={!baseQuery || loading} className="h-11 px-6">{loading ? "Consultando…" : "Buscar contratos"}</Button>
        </form>
        {mode === "agency" && agency && <p className="mt-3 text-sm text-ink-3">Órgão selecionado: <strong className="text-ink-2">{agency.name}</strong> ({agency.code})</p>}
      </Card>

      {loading && !data && <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>}
      {error && <Notice tone="warn">{error}</Notice>}
      {data && (
        <div className="space-y-6">
          {data.notice && <Notice tone={data.freshness === "unavailable" ? "info" : "warn"}>{data.notice}</Notice>}
          {s && s.count > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4"><p className="text-sm text-ink-2">Contratos<Help term="contrato" /></p><p className="tabular mt-1 text-2xl font-bold">{formatNumber(s.count)}{s.capped ? "+" : ""}</p></Card>
                <Card className="p-4"><p className="text-sm text-ink-2">Valor total contratado</p><p className="tabular mt-1 text-2xl font-bold text-expense" title={formatBRL(s.totalValue)}>{formatBRLCompact(s.totalValue)}</p></Card>
                <Card className="p-4"><p className="text-sm text-ink-2">Período (início da vigência)</p><p className="tabular mt-1 text-2xl font-bold">{s.byYear[0]!.year}{s.byYear.length > 1 ? `–${s.byYear.at(-1)!.year}` : ""}</p></Card>
              </div>
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                {s.byYear.length > 0 && (
                  <Card className="p-5"><h2 className="mb-3 text-lg font-semibold">Valor contratado por ano</h2>
                    <SeriesChart series={[{ name: "Valor contratado", color: "var(--color-primary)", data: s.byYear.map((y) => ({ year: y.year, value: y.value })) }]} kind="bar" height={240} />
                  </Card>
                )}
                <Card className="p-5"><h2 className="mb-3 text-lg font-semibold">{bySupplier ? "Principais órgãos contratantes" : "Principais fornecedores"}</h2>
                  <ol className="space-y-3 text-sm">{s.top.map((t) => <li key={t.code}><p className="font-medium text-ink">{t.name}</p><p className="tabular text-ink-3">{formatBRLCompact(t.value)}{s.totalValue > 0 && <> · <strong className="text-primary">{formatPercent((t.value / s.totalValue) * 100)}</strong> do total</>} · {t.count} contrato{t.count > 1 ? "s" : ""}</p>{s.totalValue > 0 && <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(Math.max((t.value / s.totalValue) * 100, 0.5), 100)}%` }} /></span>}</li>)}</ol>
                </Card>
              </div>
            </>
          )}
          {items.length > 0 && (
            <Card className="p-0">
              <div className="flex items-center justify-between p-5 pb-3">
                <h2 className="text-lg font-semibold">Contratos</h2>
                <Button variant="secondary" onClick={() => downloadCsv("brasil-fiscal-contratos.csv", buildCsv(
                  ["Número", "Objeto", "CNPJ", "Fornecedor", "Código do órgão", "Órgão", "Início", "Fim", "Valor inicial", "Valor final", "Valor exibido"],
                  items.map((c) => [c.number ?? c.code, c.object, c.supplierCnpj, c.supplierName, c.agencyCode, c.agencyName, c.startDate, c.endDate, c.initialValue, c.finalValue, c.value]),
                  data.provenance.map((p) => `Fonte: ${p.provider} · ${p.dataset ?? ""} · coletado em ${p.fetchedAt.slice(0, 10)}`),
                ))}>Baixar CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-line bg-surface-2 text-xs text-ink-3"><tr><th className="px-5 py-2">Nº</th><th className="px-3 py-2">Objeto</th><th className="px-3 py-2">{bySupplier ? "Órgão" : "Fornecedor"}</th><th className="px-3 py-2">Vigência</th><th className="px-3 py-2 text-right">Valor</th></tr></thead>
                  <tbody>
                    {items.map((c) => (
                      <tr key={c.factId} className="border-b border-line align-top last:border-0">
                        <td className="whitespace-nowrap px-5 py-3 font-medium">{c.number ?? c.code}</td>
                        <td className="max-w-md px-3 py-3 text-ink-2"><span className="line-clamp-3" title={c.object ?? undefined}>{c.object ?? "—"}</span></td>
                        <td className="px-3 py-3">{bySupplier ? (c.agencyName ?? "—") : <a className="text-primary hover:underline" href={`/contratos?cnpj=${c.supplierCnpj}`}>{c.supplierName}</a>}</td>
                        <td className="tabular whitespace-nowrap px-3 py-3 text-ink-2">{formatDate(c.startDate)} → {formatDate(c.endDate)}</td>
                        <td className="tabular whitespace-nowrap px-3 py-3 text-right font-semibold" title={c.initialValue != null && c.finalValue != null && c.initialValue !== c.finalValue ? `Inicial ${formatBRL(c.initialValue)} → final ${formatBRL(c.finalValue)}` : undefined}>{formatBRL(c.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-line px-5 py-3 text-xs text-ink-3">O valor mostrado é o <strong>valor final</strong> do contrato (inclui aditivos) quando a fonte o informa; caso contrário, o valor inicial. Passe o mouse sobre o valor para ver inicial e final.</p>
              {hasMore && <div className="border-t border-line p-4"><Button variant="secondary" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "Carregando…" : "Carregar mais contratos"}</Button></div>}
            </Card>
          )}
          <SourceNote provenance={data.provenance} />
        </div>
      )}
    </div>
  );
}
