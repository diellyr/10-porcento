"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, Notice } from "@/components/ui/primitives";
import { StatusBadge, Toggle } from "@/components/admin/ui";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDateTime } from "@/lib/format";
import type { SourceView } from "@/server/services/source-admin";

interface TestResult { ok: boolean; httpStatus: number | null; latencyMs: number; message: string; technical?: string; checkedAt: string; status: string }

export function SourceCard({ source, onChange }: { source: SourceView; onChange: (s: SourceView) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async <T,>(key: string, fn: () => Promise<T>, then?: (r: T) => void) => {
    setBusy(key); setError(null); setInfo(null);
    try { const r = await fn(); then?.(r); } catch (e) { setError(e instanceof AdminApiError ? e : new AdminApiError(String(e))); }
    finally { setBusy(null); }
  };
  const reloadOne = async () => onChange((await adminFetch<{ source: SourceView }>(`/api/admin/sources/${source.slug}`)).source);

  const s = source;
  const usagePct = Math.min(100, Math.round((s.usage.callsLastMinute / s.usage.limit) * 100));
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{s.name}{s.custom && <span className="ml-2 rounded bg-primary-50 px-1.5 py-0.5 align-middle text-[11px] font-medium text-primary">personalizada</span>}</h2>
          <p className="text-sm text-ink-3">{s.provider}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={s.status} />
          <Toggle
            checked={s.enabled} label={`${s.enabled ? "Desativar" : "Ativar"} ${s.name}`} disabled={busy === "toggle"}
            onChange={(v) => run("toggle", () => adminFetch<{ source: SourceView }>(`/api/admin/sources/${s.slug}/toggle`, { method: "POST", body: { enabled: v } }), (r) => onChange(r.source))}
          />
        </div>
      </div>
      {s.description && <p className="mt-3 max-w-3xl text-sm text-ink-2">{s.description}</p>}

      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-ink-3">Última consulta</dt><dd className="font-medium">{formatDateTime(s.lastRequestAt)}</dd></div>
        <div><dt className="text-ink-3">Último sucesso</dt><dd className="font-medium">{formatDateTime(s.lastSuccessAt)}</dd></div>
        <div><dt className="text-ink-3">Latência</dt><dd className="font-medium tabular">{s.lastLatencyMs != null ? `${s.lastLatencyMs} ms` : "—"}</dd></div>
        <div><dt className="text-ink-3">Última sincronização</dt><dd className="font-medium">{formatDateTime(s.lastSyncAt)}</dd></div>
        {s.requiresAuth && (
          <div><dt className="text-ink-3">{s.authType === "BEARER_TOKEN" ? "Token" : "API Key"}</dt><dd className="font-mono font-medium">{s.credential.configured ? s.credential.masked : <span className="font-sans text-warn">Não configurada</span>}</dd></div>
        )}
        <div>
          <dt className="text-ink-3">Limite · uso atual</dt>
          <dd className="font-medium tabular">{s.rateLimitPerMinute} req/min · {s.usage.callsLastMinute}/{s.usage.limit}</dd>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden><div className="h-full rounded-full bg-primary" style={{ width: `${usagePct}%` }} /></div>
        </div>
        <div><dt className="text-ink-3">Cache (TTL)</dt><dd className="font-medium tabular">{s.cacheTtlMinutes >= 1440 ? `${Math.round(s.cacheTtlMinutes / 1440)} d` : `${s.cacheTtlMinutes} min`} · prioridade {s.priority}</dd></div>
        <div><dt className="text-ink-3">Tipo</dt><dd className="font-medium">{s.sourceType.replace("_", " ")}</dd></div>
      </dl>

      {!s.enabled && <div className="mt-4"><Notice tone="info">Fonte desativada em {formatDateTime(s.disabledAt)}. Nenhuma consulta externa é feita; os dados já salvos continuam disponíveis.</Notice></div>}
      {s.datasetsConfigured === 0 && <div className="mt-4"><Notice tone="warn">Conectividade verificada não significa dados: nenhum dataset foi configurado ainda (Configurar → datasets). Sem isso, esta fonte não fornece números.</Notice></div>}
      {s.lastError && s.status !== "ONLINE" && <p className="mt-3 break-words rounded-lg bg-bad-bg px-3 py-2 font-mono text-xs text-bad">Último erro: {s.lastError}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy === "test"} onClick={() => run("test", () => adminFetch<{ result: TestResult }>(`/api/admin/sources/${s.slug}/test`, { method: "POST" }), (r) => { setTest(r.result); void reloadOne(); })}>
          {busy === "test" ? `Testando ${s.name}…` : "Testar conexão"}
        </Button>
        <Link href={`/admin/fontes/${s.slug}`} className="inline-flex min-h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2">Configurar</Link>
        {s.datasets.length > 0 && <Link href={`/admin/fontes/${s.slug}#importar`} className="inline-flex min-h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2">Importar CSV</Link>}
        <Link href={`/admin/logs?source=${s.slug}`} className="inline-flex min-h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2">Ver logs</Link>
        <Button variant="secondary" disabled={!s.enabled || busy === "refresh"} onClick={() => run("refresh", () => adminFetch<{ cleared: { queries: number }; refreshed: unknown[] }>(`/api/admin/sources/${s.slug}/refresh`, { method: "POST" }), (r) => { setInfo(`Cache da fonte invalidado (${r.cleared.queries} consultas). ${r.refreshed.length} consulta(s) mais usada(s) atualizada(s) agora; as demais atualizam sob demanda.`); void reloadOne(); })}>
          {busy === "refresh" ? "Atualizando…" : "Forçar atualização"}
        </Button>
        {s.documentationUrl && <a href={s.documentationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-primary hover:underline">Documentação ↗</a>}
      </div>

      {test && (
        <div role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm ${test.ok ? "border-ok/30 bg-ok-bg text-ok" : "border-bad/30 bg-bad-bg text-bad"}`}>
          <p className="font-semibold">{test.ok ? "✓" : "✕"} {test.message}</p>
          <p className="mt-1 tabular">{test.httpStatus ? `HTTP ${test.httpStatus} · ` : ""}Tempo: {test.latencyMs} ms · Última verificação: {formatDateTime(test.checkedAt)}</p>
          {test.technical && !test.ok && <p className="mt-1 break-words font-mono text-xs">{test.technical}</p>}
        </div>
      )}
      {info && <div className="mt-4"><Notice tone="ok">{info}</Notice></div>}
      {error && <div className="mt-4"><Notice tone="bad">{error.message}{error.technical && <span className="mt-1 block break-words font-mono text-xs">{error.technical}</span>}</Notice></div>}
    </Card>
  );
}
