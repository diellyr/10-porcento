"use client";
import { AdminTitle } from "@/components/admin/ui";
import { Card, Notice, Skeleton } from "@/components/ui/primitives";
import { useAdminData } from "@/lib/use-admin";

export default function Page() {
  const { data, error, loading } = useAdminData<{ env: Array<{ key: string; set: boolean; note: string }>; databaseLimitMb: number }>("/api/admin/settings");
  return (
    <>
      <AdminTitle title="Configurações" />
      {error && <Notice tone="bad">{error.message}</Notice>}
      {loading && !data && <Skeleton className="h-64" />}
      {data && (
        <>
          <Card className="divide-y divide-line">
            {data.env.map((v) => (
              <div key={v.key} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div><p className="font-mono text-sm font-medium">{v.key}</p><p className="text-xs text-ink-3">{v.note}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${v.set ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`}>{v.set ? "definida" : "não definida"}</span>
              </div>
            ))}
          </Card>
          <p className="mt-4 text-sm text-ink-3">Limite de banco considerado no indicador de uso: {data.databaseLimitMb} MB (variável <code className="font-mono">DATABASE_LIMIT_MB</code>). Valores de segredos nunca são exibidos. Credenciais das fontes são gerenciadas em <strong>Fontes de Dados</strong>.</p>
        </>
      )}
    </>
  );
}
