"use client";
import { useMemo, useRef, useState } from "react";
import { Button, Card, Notice, Skeleton } from "@/components/ui/primitives";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import {
  autoMap, buildRows, chunkByUnit, decodeBuffer, detectDelimiter, parseCsv, templateCsv,
  type ColumnMapping, type Delimiter, type Encoding, type FixedValues,
} from "@/lib/csv-import-client";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import { IMPORT_FIELDS, type ImportFieldKey } from "@/server/core/csv-import";
import type { ImportRecord } from "@/server/core/interfaces";
import type { ImportableDataset } from "@/server/services/imports";

const sel = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm";
const STATUS: Record<string, { label: string; cls: string }> = {
  RUNNING: { label: "em andamento", cls: "bg-warn-bg text-warn" },
  DONE: { label: "concluída", cls: "bg-ok-bg text-ok" },
  FAILED: { label: "falhou", cls: "bg-bad-bg text-bad" },
  ROLLED_BACK: { label: "desfeita", cls: "bg-surface-2 text-ink-3" },
};

/** Campos que o arquivo pode simplesmente não ter: o valor vem do conjunto de dados ou de um valor fixo. */
function fixedOptions(key: ImportFieldKey, ds: ImportableDataset): string[] | null {
  if (key === "ente_tipo") return ds.entityTypes;
  if (key === "metrica") return ds.metrics;
  if (key === "categoria_tipo") return ds.categoryTypes;
  if (key === "categoria_codigo" && ds.categoryCodes) return ds.categoryCodes;
  return null;
}
const isRequired = (key: ImportFieldKey, ds: ImportableDataset) =>
  key === "ente_codigo" || key === "ano" || (key === "ente_tipo" && ds.entityTypes.length > 1) || key === "valor" || (key === "periodo" && ds.periodMax > 0) ||
  (key === "metrica" && ds.metrics.length > 1) || (key === "categoria_tipo" && ds.categoryTypes.length > 1) || (key === "categoria_codigo" && !ds.categoryCodes);

export function CsvImport({ slug }: { slug: string }) {
  const { data, error, loading, reload } = useAdminData<{ datasets: ImportableDataset[]; history: ImportRecord[] }>(`/api/admin/sources/${slug}/imports`);
  const [dsId, setDsId] = useState("");
  const [file, setFile] = useState<{ name: string; buf: ArrayBuffer } | null>(null);
  const [encoding, setEncoding] = useState<Encoding>("utf-8");
  const [delimiter, setDelimiter] = useState<Delimiter | "auto">("auto");
  const [decimal, setDecimal] = useState<"," | ".">(",");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [fixed, setFixed] = useState<FixedValues>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad" | "warn"; text: string; detail?: string[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const ds = data?.datasets.find((d) => d.id === dsId) ?? data?.datasets[0];
  const table = useMemo(() => {
    if (!file) return null;
    const text = decodeBuffer(file.buf, encoding);
    const d = delimiter === "auto" ? detectDelimiter(text) : delimiter;
    return { rows: parseCsv(text, d), delimiter: d };
  }, [file, encoding, delimiter]);
  const headers = table?.rows[0] ?? [];
  const built = useMemo(() => (table && ds ? buildRows(table.rows, mapping, fixed, decimal) : null), [table, ds, mapping, fixed, decimal]);

  const onFile = async (f: File | undefined) => {
    setMsg(null);
    if (!f) { setFile(null); return; }
    if (f.size > 60 * 1024 * 1024) { setMsg({ tone: "bad", text: "Arquivo maior que 60 MB. Divida em partes menores." }); return; }
    const buf = await f.arrayBuffer();
    setFile({ name: f.name, buf });
    const text = decodeBuffer(buf, encoding);
    setMapping(autoMap(parseCsv(text, detectDelimiter(text))[0] ?? []));
  };

  const download = () => {
    if (!ds) return;
    const blob = new Blob(["﻿" + templateCsv(ds.example)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `modelo-${ds.id}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  };

  const run = async () => {
    if (!ds || !built || built.rows.length === 0 || !file) return;
    setMsg(null); setProgress({ done: 0, total: built.rows.length });
    let importId = "";
    try {
      const start = await adminFetch<{ import: ImportRecord }>(`/api/admin/sources/${slug}/imports`, { method: "POST", body: { dataset: ds.id, filename: file.name, totalRows: built.rows.length } });
      importId = start.import.id;
      let saved = 0, rejected = built.invalid.length;
      const reasons = new Set<string>(built.invalid.slice(0, 3).map((i) => `linha ${i.line}: ${i.reason}`));
      let done = 0;
      for (const part of chunkByUnit(built.rows, 3000)) {
        const r = await adminFetch<{ saved: number; rejected: number; reasons: string[] }>(`/api/admin/sources/${slug}/imports/${importId}`, { method: "POST", body: { rows: part } });
        saved += r.saved; rejected += r.rejected; r.reasons.forEach((x) => reasons.add(x));
        done += part.length; setProgress({ done, total: built.rows.length });
      }
      await adminFetch(`/api/admin/sources/${slug}/imports/${importId}/finish`, { method: "POST", body: {} });
      setMsg({
        tone: saved > 0 ? (rejected > 0 ? "warn" : "ok") : "bad",
        text: saved > 0 ? `Importação concluída: ${formatNumber(saved)} linha(s) gravada(s)${rejected ? `, ${formatNumber(rejected)} rejeitada(s)` : ""}. O sistema passa a usar este CSV antes de consultar a API.` : "Nenhuma linha foi gravada.",
        detail: [...reasons].slice(0, 8),
      });
      setFile(null); if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      const ae = e instanceof AdminApiError ? e : new AdminApiError(String(e));
      setMsg({ tone: "bad", text: `${ae.message}${importId ? " A importação foi interrompida; as unidades não concluídas continuam sendo buscadas na API." : ""}`, detail: ae.technical ? [ae.technical] : undefined });
    } finally { setProgress(null); reload(); }
  };

  const undo = async (id: string) => {
    if (!confirm("Desfazer esta importação? Os dados do CSV serão apagados e esses períodos voltarão a ser buscados na API.")) return;
    setMsg(null);
    try {
      const r = await adminFetch<{ facts: number; coverage: number }>(`/api/admin/sources/${slug}/imports/${id}/rollback`, { method: "POST", body: {} });
      setMsg({ tone: "ok", text: `Importação desfeita: ${formatNumber(r.facts)} dado(s) removido(s); ${formatNumber(r.coverage)} período(s) voltam a ser buscados na API.` });
    } catch (e) { const ae = e instanceof AdminApiError ? e : new AdminApiError(String(e)); setMsg({ tone: "bad", text: ae.message, detail: ae.technical ? [ae.technical] : undefined }); }
    finally { reload(); }
  };

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Importar CSV</h2>
      <p className="mt-1 text-sm text-ink-3">
        Os dados do CSV são consultados <strong>antes</strong> da API: para os entes, anos e períodos que o arquivo cobre, o sistema não chama a API; para o restante, continua buscando nela.
        A importação <strong>substitui</strong> os dados já salvos dessas unidades (mesma fonte e mesmo conjunto) e pode ser desfeita.
      </p>
      {error && <div className="mt-3"><Notice tone="bad">{error.message}</Notice></div>}
      {loading && !data && <Skeleton className="mt-4 h-24" />}
      {msg && (
        <div className="mt-4"><Notice tone={msg.tone}>{msg.text}{msg.detail?.map((d, i) => <span key={i} className="mt-1 block break-words font-mono text-xs">{d}</span>)}</Notice></div>
      )}

      {data && data.datasets.length === 0 && <div className="mt-4"><Notice tone="info">Esta fonte não tem conjuntos de dados que aceitem importação de CSV.</Notice></div>}

      {data && ds && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block text-ink-3">O que o arquivo contém</span>
              <select className={sel} value={ds.id} onChange={(e) => { setDsId(e.target.value); setFixed({}); }}>{data.datasets.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
            <div className="flex items-end"><Button type="button" variant="secondary" onClick={download}>Baixar modelo de CSV</Button></div>
          </div>
          <p className="text-sm text-ink-3">{ds.description} Aceita: tipo de ente {ds.entityTypes.join(", ")}; métricas {ds.metrics.join(", ")}; categorias {ds.categoryTypes.join(", ")}{ds.periodMax > 0 ? `; período ${ds.periodMin}–${ds.periodMax}` : "; período = ano inteiro"}.</p>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm md:col-span-2"><span className="mb-1 block text-ink-3">Arquivo CSV (a 1ª linha deve ser o cabeçalho)</span>
              <input ref={fileInput} type="file" accept=".csv,text/csv,text/plain" className={`${sel} py-2`} onChange={(e) => void onFile(e.target.files?.[0])} /></label>
            <label className="text-sm"><span className="mb-1 block text-ink-3">Codificação</span>
              <select className={sel} value={encoding} onChange={(e) => setEncoding(e.target.value as Encoding)}><option value="utf-8">UTF-8</option><option value="iso-8859-1">ISO-8859-1 (Latin-1)</option><option value="windows-1252">Windows-1252</option></select></label>
            <label className="text-sm"><span className="mb-1 block text-ink-3">Separador</span>
              <select className={sel} value={delimiter} onChange={(e) => setDelimiter(e.target.value as Delimiter | "auto")}><option value="auto">Automático{table ? ` (${table.delimiter === "\t" ? "tab" : table.delimiter})` : ""}</option><option value=";">; ponto e vírgula</option><option value=",">, vírgula</option><option value={"\t"}>tabulação</option><option value="|">| barra vertical</option></select></label>
            <label className="text-sm"><span className="mb-1 block text-ink-3">Decimal dos valores</span>
              <select className={sel} value={decimal} onChange={(e) => setDecimal(e.target.value as "," | ".")}><option value=",">1.234,56 (vírgula)</option><option value=".">1,234.56 (ponto)</option></select></label>
          </div>

          {table && headers.length > 0 && (
            <>
              <div>
                <h3 className="mb-2 font-medium">Mapeamento das colunas</h3>
                <p className="mb-3 text-sm text-ink-3">Indique de qual coluna vem cada campo. Quando o arquivo não tem o campo, escolha “valor fixo” (ex.: todas as linhas são “Município”).</p>
                <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-sm">
                  <thead><tr className="text-left text-ink-3"><th className="py-1 pr-3 font-medium">Campo</th><th className="py-1 pr-3 font-medium">Coluna do arquivo</th><th className="py-1 font-medium">Valor fixo (se a coluna estiver vazia/ausente)</th></tr></thead>
                  <tbody>
                    {IMPORT_FIELDS.map((f) => {
                      const opts = fixedOptions(f.key, ds);
                      const req = isRequired(f.key, ds);
                      return (
                        <tr key={f.key} className="border-t border-line align-middle">
                          <td className="py-2 pr-3">{f.label}{req && <span className="text-bad" title="obrigatório"> *</span>}</td>
                          <td className="py-2 pr-3">
                            <select aria-label={`Coluna para ${f.label}`} className={sel} value={mapping[f.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value === "" ? null : Number(e.target.value) })}>
                              <option value="">— não usar —</option>
                              {headers.map((h, i) => <option key={i} value={i}>{h || `(coluna ${i + 1})`}</option>)}
                            </select>
                          </td>
                          <td className="py-2">
                            {opts ? (
                              <select aria-label={`Valor fixo para ${f.label}`} className={sel} value={fixed[f.key] ?? ""} onChange={(e) => setFixed({ ...fixed, [f.key]: e.target.value })}>
                                <option value="">{opts.length === 1 ? `automático (${opts[0]})` : "— nenhum —"}</option>
                                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : <input aria-label={`Valor fixo para ${f.label}`} className={sel} value={fixed[f.key] ?? ""} onChange={(e) => setFixed({ ...fixed, [f.key]: e.target.value })} placeholder={f.key === "ano" ? "ex.: 2023" : ""} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
                <p className="mt-2 text-xs text-ink-3">* obrigatório. Código do ente: IBGE (município 7 dígitos, estado 2 dígitos ou sigla, país 1).</p>
              </div>

              {built && (
                <div>
                  <h3 className="mb-2 font-medium">Conferência</h3>
                  <p className="text-sm">{formatNumber(built.rows.length)} linha(s) válida(s) de {formatNumber(Math.max(0, table.rows.length - 1))}{built.invalid.length > 0 && <>; <strong className="text-bad">{formatNumber(built.invalid.length)} com problema</strong></>}.</p>
                  {built.invalid.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-ink-2">
                      {built.invalid.slice(0, 5).map((i) => <li key={i.line}>linha {i.line}: {i.reason}</li>)}
                      {built.invalid.length > 5 && <li>… e mais {formatNumber(built.invalid.length - 5)}.</li>}
                    </ul>
                  )}
                  {built.rows.length > 0 && (
                    <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[34rem] text-xs">
                      <caption className="sr-only">Primeiras linhas já mapeadas</caption>
                      <thead><tr className="text-left text-ink-3">{IMPORT_FIELDS.map((f) => <th key={f.key} className="py-1 pr-2 font-medium">{f.key}</th>)}</tr></thead>
                      <tbody>{built.rows.slice(0, 5).map((r, i) => <tr key={i} className="border-t border-line">{IMPORT_FIELDS.map((f) => <td key={f.key} className="py-1 pr-2">{String((r as unknown as Record<string, unknown>)[f.key] ?? "")}</td>)}</tr>)}</tbody>
                    </table></div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button type="button" disabled={!!progress || built.rows.length === 0} onClick={() => void run()}>
                      {progress ? "Importando…" : `Importar ${formatNumber(built.rows.length)} linha(s)`}
                    </Button>
                    {progress && (
                      <div className="min-w-48 flex-1">
                        <div role="progressbar" aria-label="Progresso da importação" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((100 * progress.done) / progress.total)}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-ink-3">{formatNumber(progress.done)} de {formatNumber(progress.total)} linhas</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <h3 className="mb-2 font-medium">Histórico de importações</h3>
            {data.history.length === 0 ? <p className="text-sm text-ink-3">Nenhuma importação ainda.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[36rem] text-sm">
                <thead><tr className="text-left text-ink-3"><th className="py-1 pr-3 font-medium">Quando</th><th className="py-1 pr-3 font-medium">Arquivo</th><th className="py-1 pr-3 font-medium">Conjunto</th><th className="py-1 pr-3 font-medium">Situação</th><th className="py-1 pr-3 text-right font-medium">Gravadas</th><th className="py-1 pr-3 text-right font-medium">Rejeitadas</th><th className="py-1 font-medium"><span className="sr-only">Ações</span></th></tr></thead>
                <tbody>{data.history.map((h) => (
                  <tr key={h.id} className="border-t border-line">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(h.createdAt)}<span className="block text-xs text-ink-3">{h.createdByEmail ?? ""}</span></td>
                    <td className="py-2 pr-3 break-all">{h.filename}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{h.dataset}</td>
                    <td className="py-2 pr-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[h.status]?.cls ?? ""}`}>{STATUS[h.status]?.label ?? h.status}</span></td>
                    <td className="py-2 pr-3 text-right">{formatNumber(h.rowsSaved)}<span className="block text-xs text-ink-3">{formatNumber(h.units)} período(s)</span></td>
                    <td className="py-2 pr-3 text-right">{formatNumber(h.rowsRejected)}</td>
                    <td className="py-2 text-right">{(h.status === "DONE" || h.status === "FAILED") && <Button type="button" variant="secondary" className="min-h-9" onClick={() => void undo(h.id)}>Desfazer</Button>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
