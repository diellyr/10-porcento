"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { LogsTable } from "@/components/admin/logs-table";
import { AdminTitle, StatusBadge } from "@/components/admin/ui";
import { Button, Card, Notice, Skeleton } from "@/components/ui/primitives";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { useAdminData } from "@/lib/use-admin";
import type { SourceView } from "@/server/services/source-admin";

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, error, reload } = useAdminData<{ source: SourceView }>(`/api/admin/sources/${slug}`);
  const s = data?.source;
  const [form, setForm] = useState({ priority: 0, cacheTtlMinutes: 0, rateLimitPerMinute: 0, baseUrl: "", config: "{}" });
  const [secret, setSecret] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string; tech?: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (s) setForm({ priority: s.priority, cacheTtlMinutes: s.cacheTtlMinutes, rateLimitPerMinute: s.rateLimitPerMinute, baseUrl: s.baseUrl, config: JSON.stringify(s.config, null, 2) });
  }, [s]);

  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ tone: "ok", text: ok }); reload(); }
    catch (e) { const ae = e instanceof AdminApiError ? e : new AdminApiError(String(e)); setMsg({ tone: "bad", text: ae.message, tech: ae.technical }); }
    finally { setBusy(null); }
  };

  if (error) return <Notice tone="bad">{error.message}</Notice>;
  if (!s) return <Skeleton className="h-96" />;
  const input = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm";

  const saveSettings = () => {
    let config: unknown;
    try { config = JSON.parse(form.config); } catch { setMsg({ tone: "bad", text: "O JSON de configuração é inválido." }); return; }
    return act("save", () => adminFetch(`/api/admin/sources/${slug}`, { method: "PATCH", body: { priority: Number(form.priority), cacheTtlMinutes: Number(form.cacheTtlMinutes), rateLimitPerMinute: Number(form.rateLimitPerMinute), baseUrl: form.baseUrl, config } }), "Configurações salvas.");
  };

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/fontes" className="text-primary hover:underline">← Fontes de Dados</Link></p>
      <AdminTitle title={s.name}><StatusBadge status={s.status} /></AdminTitle>
      {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}{msg.tech && <span className="mt-1 block break-words font-mono text-xs">{msg.tech}</span>}</Notice></div>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Configurações</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm"><span className="mb-1 block text-ink-3">Prioridade (menor = preferida)</span><input className={input} type="number" min={1} max={1000} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></label>
            <label className="text-sm"><span className="mb-1 block text-ink-3">TTL do cache (min)</span><input className={input} type="number" min={0} value={form.cacheTtlMinutes} onChange={(e) => setForm({ ...form, cacheTtlMinutes: Number(e.target.value) })} /></label>
            <label className="text-sm"><span className="mb-1 block text-ink-3">Limite (req/min)</span><input className={input} type="number" min={1} max={600} value={form.rateLimitPerMinute} onChange={(e) => setForm({ ...form, rateLimitPerMinute: Number(e.target.value) })} /></label>
          </div>
          <label className="mt-4 block text-sm"><span className="mb-1 block text-ink-3">URL base (somente https)</span><input className={`${input} font-mono`} value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} /></label>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-ink-3">Configuração avançada (JSON — sem segredos)</span>
            <textarea className="min-h-40 w-full rounded-lg border border-line bg-surface p-3 font-mono text-xs" spellCheck={false} value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} />
          </label>
          {s.sourceType === "DATASET_DOWNLOAD" && (
            <details className="mt-3 rounded-lg bg-surface-2 p-3 text-xs text-ink-2">
              <summary className="cursor-pointer font-medium">Como configurar um dataset de arquivo (CSV)</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">{`{
  "datasets": {
    "${s.datasets[0] ?? "receita.arrecadacao"}": {
      "url": "https://…/arquivo.csv",
      "delimiter": ";",
      "encoding": "latin1",
      "columns": { "year": "Ano", "uf": "UF", "category_code": "Tributo", "value": "Valor" },
      "metric": "REVENUE_REALIZED",
      "category_type": "TAX",
      "scale": 1
    }
  }
}`}</pre>
              <p className="mt-2">Datasets que esta fonte pode atender: {s.datasets.join(", ")}.</p>
            </details>
          )}
          <div className="mt-4"><Button disabled={busy === "save"} onClick={saveSettings}>{busy === "save" ? "Salvando…" : "Salvar configurações"}</Button></div>
        </Card>

        <div className="space-y-6">
          {s.requiresAuth && (
            <Card className="p-5">
              <h2 className="mb-1 text-lg font-semibold">Credencial</h2>
              <p className="mb-4 text-sm text-ink-3">Guardada cifrada no servidor (AES-256-GCM). Nunca é exibida nem enviada ao navegador.</p>
              <p className="mb-3 text-sm">{s.credential.configured ? <>Token configurado <span className="ml-2 font-mono font-semibold">{s.credential.masked}</span> <span className="text-ink-3">({s.credential.origin === "env" ? "variável de ambiente" : "painel"})</span></> : <span className="text-warn">Não configurada</span>}</p>
              <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void act("cred", async () => { await adminFetch(`/api/admin/sources/${slug}/credential`, { method: "PUT", body: { value: secret } }); setSecret(""); }, "Credencial atualizada."); }}>
                <input type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Cole a nova chave/token" className={`${input} min-w-64 flex-1`} aria-label="Nova credencial" />
                <Button type="submit" disabled={secret.length < 8 || busy === "cred"}>Salvar</Button>
                {s.credential.origin === "database" && <Button type="button" variant="danger" disabled={busy === "rm"} onClick={() => confirm("Remover a credencial salva?") && act("rm", () => adminFetch(`/api/admin/sources/${slug}/credential`, { method: "DELETE" }), "Credencial removida.")}>Remover</Button>}
              </form>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Cache e dados</h2>
            <p className="mb-3 text-sm text-ink-2">Limpar o cache desta fonte força nova consulta externa na próxima vez que alguém pedir os dados. <strong>Os dados já salvos não são apagados.</strong></p>
            <Button variant="secondary" disabled={busy === "cc"} onClick={() => act("cc", () => adminFetch(`/api/admin/sources/${slug}/clear-cache`, { method: "POST" }), "Cache da fonte limpo.")}>Limpar cache desta fonte</Button>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 text-lg font-semibold">Sobre</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2"><dt className="w-32 text-ink-3">Datasets</dt><dd>{s.datasets.length ? s.datasets.join(", ") : "— (catálogo/cadastro)"}</dd></div>
              <div className="flex gap-2"><dt className="w-32 text-ink-3">Parser</dt><dd>v{s.parserVersion}</dd></div>
              <div className="flex gap-2"><dt className="w-32 text-ink-3">Autenticação</dt><dd>{s.authType}</dd></div>
              {s.documentationUrl && <div className="flex gap-2"><dt className="w-32 text-ink-3">Documentação</dt><dd><a className="break-all text-primary hover:underline" href={s.documentationUrl} target="_blank" rel="noopener noreferrer">{s.documentationUrl}</a></dd></div>}
            </dl>
          </Card>
        </div>
      </div>

      <h2 id="logs" className="mb-3 mt-10 text-lg font-semibold">Logs recentes</h2>
      <LogsTable slug={slug} />
    </>
  );
}
