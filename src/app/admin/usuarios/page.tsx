"use client";
import { useState } from "react";
import { AdminTitle } from "@/components/admin/ui";
import { Button, Card, Notice, Skeleton } from "@/components/ui/primitives";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDateTime } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";

interface U { id: string; email: string | null; role: "user" | "admin"; createdAt: string }

export default function Page() {
  const { data, error, loading, reload } = useAdminData<{ users: U[] }>("/api/admin/users");
  const [msg, setMsg] = useState<string | null>(null);
  const setRole = async (u: U, role: "user" | "admin") => {
    if (!confirm(`Alterar ${u.email} para ${role === "admin" ? "administrador" : "usuário comum"}?`)) return;
    try { await adminFetch("/api/admin/users", { method: "PATCH", body: { id: u.id, role } }); setMsg(null); reload(); }
    catch (e) { setMsg(e instanceof AdminApiError ? e.message : String(e)); }
  };
  return (
    <>
      <AdminTitle title="Usuários" />
      {(error || msg) && <div className="mb-4"><Notice tone="bad">{error?.message ?? msg}</Notice></div>}
      {loading && !data && <Skeleton className="h-48" />}
      {data && (
        <Card className="divide-y divide-line">
          {data.users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div><p className="font-medium">{u.email ?? u.id}</p><p className="text-xs text-ink-3">Criado em {formatDateTime(u.createdAt)}</p></div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.role === "admin" ? "bg-primary-50 text-primary" : "bg-surface-2 text-ink-2"}`}>{u.role === "admin" ? "Administrador" : "Usuário"}</span>
                <Button variant="secondary" onClick={() => setRole(u, u.role === "admin" ? "user" : "admin")}>{u.role === "admin" ? "Remover admin" : "Tornar admin"}</Button>
              </div>
            </div>
          ))}
          {!data.users.length && <p className="p-6 text-center text-ink-3">Nenhum usuário.</p>}
        </Card>
      )}
      <p className="mt-4 max-w-2xl text-sm text-ink-3">Contas são criadas no Supabase Auth. Toda conta nova nasce como usuário comum; a promoção a administrador é feita aqui (ou por SQL/script na primeira instalação) e fica registrada na auditoria. O último administrador não pode ser removido.</p>
    </>
  );
}
