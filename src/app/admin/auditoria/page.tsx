"use client";
import { AdminTitle } from "@/components/admin/ui";
import { Card, Notice, Skeleton } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";

const LABEL: Record<string, string> = {
  "source.enabled": "API habilitada", "source.disabled": "API desabilitada", "source.token_changed": "Token alterado", "source.token_removed": "Token removido",
  "source.config_changed": "Configuração alterada", "cache.cleared": "Cache limpo", "source.force_refresh": "Atualização forçada", "source.tested": "Conexão testada",
  "user.role_changed": "Papel de usuário alterado", "catalog.loaded": "Cadastro de entes carregado",
};

export default function Page() {
  const { data, error, loading } = useAdminData<{ entries: Array<{ id: number; actorEmail: string | null; action: string; targetType: string | null; targetId: string | null; details: Record<string, unknown>; createdAt: string }> }>("/api/admin/audit?limit=100");
  return (
    <>
      <AdminTitle title="Auditoria administrativa" />
      {error && <Notice tone="bad">{error.message}</Notice>}
      {loading && !data && <Skeleton className="h-64" />}
      {data && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm"><thead className="bg-surface-2 text-xs text-ink-3"><tr><th className="px-4 py-2">Quando</th><th className="px-3 py-2">Quem</th><th className="px-3 py-2">Ação</th><th className="px-3 py-2">Alvo</th><th className="px-3 py-2">Detalhes</th></tr></thead>
            <tbody>{data.entries.map((e) => <tr key={e.id} className="border-t border-line align-top"><td className="tabular whitespace-nowrap px-4 py-2">{formatDateTime(e.createdAt)}</td><td className="px-3 py-2">{e.actorEmail ?? "sistema"}</td><td className="px-3 py-2 font-medium">{LABEL[e.action] ?? e.action}</td><td className="px-3 py-2">{e.targetId}</td><td className="max-w-xs break-all px-3 py-2 font-mono text-xs text-ink-3">{Object.keys(e.details).length ? JSON.stringify(e.details) : ""}</td></tr>)}{!data.entries.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-3">Nenhuma ação registrada.</td></tr>}</tbody></table>
        </Card>
      )}
    </>
  );
}
