"use client";
import Link from "next/link";
import { useState } from "react";
import { AdminTitle, StatusBadge, STATUS_META } from "@/components/admin/ui";
import { Button, Card, Notice, Skeleton } from "@/components/ui/primitives";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDateTime } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";

interface Health { total: number; counts: Record<string, number>; sources: Array<{ slug: string; name: string; provider: string; status: string; lastSuccessAt: string | null; lastFailureAt: string | null; lastLatencyMs: number | null; lastError: string | null }> }

export default function Page() {
  const { data, error, loading, reload } = useAdminData<Health>("/api/admin/health");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<AdminApiError | null>(null);
  const testAll = async () => {
    setBusy(true); setErr(null);
    try { await adminFetch("/api/admin/health/test", { method: "POST" }); reload(); } catch (e) { setErr(e instanceof AdminApiError ? e : new AdminApiError(String(e))); } finally { setBusy(false); }
  };
  const c = data?.counts ?? {};
  const failing = (c.OFFLINE ?? 0) + (c.DEGRADED ?? 0);
  return (
    <>
      <AdminTitle title="Saúde das APIs"><Button onClick={testAll} disabled={busy}>{busy ? "Testando…" : "Testar todas as fontes ativas"}</Button></AdminTitle>
      {(error || err) && <Notice tone="bad">{(error ?? err)!.message}</Notice>}
      {loading && !data && <Skeleton className="h-64" />}
      {data && (
        <>
          <p className="mb-4 text-lg"><strong>{data.total} fontes</strong> · <span className="text-ok">{c.ONLINE ?? 0} online</span> · <span className="text-warn">{c.DEGRADED ?? 0} degradada(s)</span> · <span className="text-bad">{c.OFFLINE ?? 0} offline</span>{(c.NOT_CONFIGURED ?? 0) > 0 && <> · {c.NOT_CONFIGURED} não configurada(s)</>}{(c.DISABLED ?? 0) > 0 && <> · {c.DISABLED} desativada(s)</>}{(c.UNKNOWN ?? 0) > 0 && <> · {c.UNKNOWN} ainda não testada(s)</>}</p>
          {failing > 0 && <div className="mb-4"><Notice tone="warn">Há fontes com problema. Os usuários continuam vendo os últimos dados salvos, com aviso.</Notice></div>}
          <Card className="divide-y divide-line">
            {data.sources.map((s) => (
              <div key={s.slug} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4">
                <Link href={`/admin/fontes/${s.slug}`} className="w-52 font-medium hover:text-primary">{s.name}</Link>
                <StatusBadge status={s.status} />
                <span className="tabular text-sm text-ink-3">Último sucesso: {formatDateTime(s.lastSuccessAt)}</span>
                <span className="tabular text-sm text-ink-3">Latência: {s.lastLatencyMs != null ? `${s.lastLatencyMs} ms` : "—"}</span>
                {s.lastError && s.status !== "ONLINE" && <span className="w-full break-words font-mono text-xs text-bad">{s.lastError}</span>}
              </div>
            ))}
          </Card>
          <p className="mt-4 text-xs text-ink-3">Legenda: {Object.entries(STATUS_META).map(([k, v]) => v.label).join(" · ")}. Os testes são sob demanda ou por agendador externo (/api/cron/health) — não há polling contínuo.</p>
        </>
      )}
    </>
  );
}
