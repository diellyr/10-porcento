"use client";
import Link from "next/link";
import { AdminTitle } from "@/components/admin/ui";
import { Card, Notice, Skeleton } from "@/components/ui/primitives";
import { useAdminData } from "@/lib/use-admin";

interface Item { key: string; set: boolean; required: boolean; note: string; howTo: string; url?: string; urlLabel?: string }
interface Pending { slug: string; name: string; kind: "key" | "csv"; howTo: string; createUrl: string; createLabel: string; manageUrl: string }

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-sm font-medium text-primary underline hover:bg-surface-2">
      {children} ↗<span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

function PendingRow({ p }: { p: Pending }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
      <div className="min-w-0 max-w-xl">
        <p className="font-medium">{p.name}</p>
        <p className="mt-1 text-sm text-ink-2">{p.howTo}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <External href={p.createUrl}>{p.createLabel}</External>
          <Link href={p.manageUrl} className="inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-600">
            {p.kind === "key" ? "Cadastrar a chave no painel" : "Cadastrar os arquivos no painel"}
          </Link>
        </div>
      </div>
      <span className="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-medium text-warn">{p.kind === "key" ? "chave pendente" : "arquivos pendentes"}</span>
    </div>
  );
}

function EnvRow({ v }: { v: Item }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
      <div className="min-w-0 max-w-xl">
        <p className="break-all font-mono text-sm font-medium">{v.key}</p>
        <p className="mt-0.5 text-xs text-ink-3">{v.note}</p>
        {!v.set && <p className="mt-2 text-sm text-ink-2"><strong>Como obter:</strong> {v.howTo}</p>}
        {!v.set && v.url && <div className="mt-2"><External href={v.url}>{v.urlLabel ?? "Abrir site"}</External></div>}
      </div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${v.set ? "bg-ok-bg text-ok" : v.required ? "bg-bad-bg text-bad" : "bg-warn-bg text-warn"}`}>
        {v.set ? "definida" : v.required ? "pendente (obrigatória)" : "pendente (opcional)"}
      </span>
    </div>
  );
}

export default function Page() {
  const { data, error, loading } = useAdminData<{ pendingSources: Pending[]; env: Item[]; databaseLimitMb: number; mfaRequired: boolean }>("/api/admin/settings");
  const envPending = data?.env.filter((v) => !v.set && v.required) ?? [];
  return (
    <>
      <AdminTitle title="Configurações" />
      {error && <Notice tone="bad">{error.message}</Notice>}
      {loading && !data && <Skeleton className="h-64" />}
      {data && (
        <>
          <h2 className="mb-2 text-lg font-semibold">Configurações pendentes ({data.pendingSources.length})</h2>
          <p className="mb-3 text-sm text-ink-3">Chaves e arquivos das fontes de dados que ainda faltam. Sem elas, parte das telas fica sem gráficos.</p>
          {data.pendingSources.length === 0 ? (
            <Notice tone="ok">Todas as fontes ativas estão configuradas.</Notice>
          ) : (
            <Card className="divide-y divide-line">{data.pendingSources.map((p) => <PendingRow key={p.slug} p={p} />)}</Card>
          )}

          {!data.mfaRequired && (
            <div className="mt-4"><Notice tone="warn">Verificação em duas etapas (MFA) do painel está <strong>desativada</strong> (<code className="font-mono">ADMIN_REQUIRE_MFA=0</code>). Reative removendo essa variável de build assim que possível.</Notice></div>
          )}

          <details className="mt-8" open={envPending.length > 0}>
            <summary className="cursor-pointer text-lg font-semibold">Variáveis do ambiente (Cloudflare){envPending.length > 0 ? ` — ${envPending.length} obrigatória(s) pendente(s)` : ""}</summary>
            <Card className="mt-3 divide-y divide-line">{data.env.map((v) => <EnvRow key={v.key} v={v} />)}</Card>
            <p className="mt-3 text-sm text-ink-3">Variáveis do ambiente são salvas em Cloudflare → Configurações → Compilação → <em>Variáveis e segredos de compilação</em> (depois, <em>Tentar novamente</em> no build). Valores de segredos nunca são exibidos.</p>
          </details>
          <p className="mt-4 text-sm text-ink-3">Limite de banco considerado no indicador de uso: {data.databaseLimitMb} MB (variável <code className="font-mono">DATABASE_LIMIT_MB</code>).</p>
        </>
      )}
    </>
  );
}
