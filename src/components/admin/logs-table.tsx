"use client";
import { useEffect, useState } from "react";
import { Button, Notice } from "@/components/ui/primitives";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDateTime } from "@/lib/format";

interface Log { id: number; startedAt: string; endpoint: string; httpStatus: number | null; durationMs: number | null; recordsReceived: number; recordsSaved: number; cacheHit: boolean; success: boolean; errorType: string | null; errorMessage: string | null; isTest: boolean; queryType: string | null }

export function LogsTable({ slug }: { slug: string }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [err, setErr] = useState<AdminApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (before?: number, replace = false) => {
    setLoading(true); setErr(null);
    try {
      const q = new URLSearchParams({ limit: "50" });
      if (before) q.set("before", String(before));
      if (onlyErrors) q.set("errors", "1");
      const r = await adminFetch<{ logs: Log[]; next: number | null }>(`/api/admin/sources/${slug}/logs?${q}`);
      setLogs((l) => (replace ? r.logs : [...l, ...r.logs]));
      setNext(r.logs.length === 50 ? r.next : null);
    } catch (e) { setErr(e instanceof AdminApiError ? e : new AdminApiError(String(e))); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(undefined, true); }, [slug, onlyErrors]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} /> Somente erros</label>
        <Button variant="secondary" onClick={() => load(undefined, true)}>Recarregar</Button>
      </div>
      {err && <Notice tone="bad">{err.message}</Notice>}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs text-ink-3"><tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Endpoint</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Duração</th><th className="px-3 py-2 text-right">Registros</th><th className="px-3 py-2">Erro</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-line align-top">
                <td className="tabular whitespace-nowrap px-3 py-2 text-ink-2">{formatDateTime(l.startedAt)}</td>
                <td className="max-w-md px-3 py-2"><span className="break-all font-mono text-xs">{l.endpoint}</span>{(l.isTest || l.cacheHit) && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-3">{l.isTest ? "teste" : "cache"}</span>}</td>
                <td className="px-3 py-2"><span className={`font-medium ${l.success ? "text-ok" : "text-bad"}`}>{l.httpStatus ?? (l.success ? "OK" : "—")}</span></td>
                <td className="tabular px-3 py-2 text-right">{l.durationMs != null ? `${l.durationMs} ms` : "—"}</td>
                <td className="tabular px-3 py-2 text-right">{l.recordsReceived}{l.recordsSaved ? ` → ${l.recordsSaved}` : ""}</td>
                <td className="max-w-xs px-3 py-2 text-xs text-bad">{l.errorType && <strong>{l.errorType}</strong>} {l.errorMessage}</td>
              </tr>
            ))}
            {!logs.length && !loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-3">Nenhum registro ainda.</td></tr>}
          </tbody>
        </table>
      </div>
      {next && <div className="mt-3"><Button variant="secondary" disabled={loading} onClick={() => load(next)}>Carregar mais</Button></div>}
    </div>
  );
}
