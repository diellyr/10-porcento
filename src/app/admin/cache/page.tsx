"use client";
import { useState } from "react";
import { AdminTitle, Stat } from "@/components/admin/ui";
import { Button, Card, Notice } from "@/components/ui/primitives";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { useAdminData } from "@/lib/use-admin";
import type { SourceView } from "@/server/services/source-admin";

export default function Page() {
  const cache = useAdminData<{ coverageTotal: number; coverageExpired: number }>("/api/admin/cache");
  const src = useAdminData<{ sources: SourceView[] }>("/api/admin/sources");
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const clear = async (slug: string | null) => {
    if (!confirm(slug ? `Limpar o cache de ${slug}? Os dados salvos permanecem.` : "Limpar TODO o cache? Os dados salvos permanecem, mas as próximas consultas vão à fonte.")) return;
    try {
      const r = await adminFetch<{ queries: number; coverage: number }>(slug ? `/api/admin/sources/${slug}/clear-cache` : "/api/admin/cache/clear", { method: "POST" });
      setMsg({ tone: "ok", text: `Cache limpo: ${r.queries} consultas e ${r.coverage} marcas de cobertura removidas.` });
      cache.reload();
    } catch (e) { setMsg({ tone: "bad", text: e instanceof AdminApiError ? e.message : String(e) }); }
  };
  return (
    <>
      <AdminTitle title="Cache"><Button variant="danger" onClick={() => clear(null)}>Limpar todo o cache</Button></AdminTitle>
      {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Unidades cobertas (dataset × ente × período)" value={cache.data?.coverageTotal ?? "…"} />
        <Stat label="Expiradas (serão atualizadas sob demanda)" value={cache.data?.coverageExpired ?? "…"} />
      </div>
      <Card className="divide-y divide-line">
        {src.data?.sources.map((s) => (
          <div key={s.slug} className="flex items-center justify-between gap-3 px-5 py-3">
            <div><p className="font-medium">{s.name}</p><p className="text-xs text-ink-3">TTL padrão: {s.cacheTtlMinutes} min</p></div>
            <Button variant="secondary" onClick={() => clear(s.slug)}>Limpar cache</Button>
          </div>
        ))}
      </Card>
      <p className="mt-4 max-w-2xl text-sm text-ink-3">Limpar o cache nunca apaga os fatos fiscais já persistidos nem o histórico de versões — apenas invalida a “validade” das consultas, para que a próxima requisição consulte a fonte oficial de novo.</p>
    </>
  );
}
