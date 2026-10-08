"use client";
import { useState } from "react";
import { Button, Card, Notice } from "@/components/ui/primitives";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import type { SourceView } from "@/server/services/source-admin";

export interface AdapterOption { key: string; label: string; datasets: string[]; requiresAuth: boolean; template: boolean }

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const inp = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm";

export function AddSourceDialog({ adapters, onCreated, onClose }: { adapters: AdapterOption[]; onCreated: (s: SourceView) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: "", slug: "", slugTouched: false, provider: "", description: "", sourceType: "DATASET_DOWNLOAD", baseUrl: "https://", documentationUrl: "", authType: "NONE", adapterKey: adapters.find((a) => a.template)?.key ?? adapters[0]?.key ?? "", priority: 200, rateLimitPerMinute: 30, cacheTtlMinutes: 1440, healthPath: "" });
  const [err, setErr] = useState<AdminApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v, ...(k === "name" && !x.slugTouched ? { slug: slugify(String(v)) } : {}) }));
  const adapter = adapters.find((a) => a.key === f.adapterKey);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await adminFetch<{ source: SourceView }>("/api/admin/sources", {
        method: "POST",
        body: {
          name: f.name, slug: f.slug, provider: f.provider, description: f.description || undefined, sourceType: f.sourceType, baseUrl: f.baseUrl,
          documentationUrl: f.documentationUrl || undefined, authType: f.authType, adapterKey: f.adapterKey, priority: Number(f.priority),
          rateLimitPerMinute: Number(f.rateLimitPerMinute), cacheTtlMinutes: Number(f.cacheTtlMinutes), healthPath: f.healthPath || undefined,
        },
      });
      onCreated(r.source);
    } catch (e2) { setErr(e2 instanceof AdminApiError ? e2 : new AdminApiError(String(e2))); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-start overflow-y-auto bg-black/40 p-4 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <Card className="my-6 w-full max-w-2xl p-5 sm:p-6">
        <h2 id="add-title" className="text-xl font-semibold">Adicionar fonte de dados</h2>
        <p className="mt-1 text-sm text-ink-3">A nova fonte usa um adaptador existente (o “parser”) e entra no fallback do Query Router conforme a prioridade. Formatos realmente novos ainda exigem um adaptador em código.</p>
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block text-ink-3">Nome</span><input className={inp} required minLength={3} value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Identificador (slug)</span><input className={`${inp} font-mono`} required value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value, slugTouched: true })} /></label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Responsável / provedor</span><input className={inp} required value={f.provider} onChange={(e) => set("provider", e.target.value)} /></label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Tipo</span>
            <select className={inp} value={f.sourceType} onChange={(e) => set("sourceType", e.target.value)}>{["REST_API", "CSV", "JSON", "XML", "DATASET_DOWNLOAD"].map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="text-sm sm:col-span-2"><span className="mb-1 block text-ink-3">URL base (https)</span><input className={`${inp} font-mono`} required value={f.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} /></label>
          <label className="text-sm sm:col-span-2"><span className="mb-1 block text-ink-3">Adaptador (parser)</span>
            <select className={inp} value={f.adapterKey} onChange={(e) => set("adapterKey", e.target.value)}>{adapters.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select>
            {adapter && adapter.datasets.length > 0 && <span className="mt-1 block text-xs text-ink-3">Atende: {adapter.datasets.join(", ")}</span>}
          </label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Autenticação</span>
            <select className={inp} value={f.authType} onChange={(e) => set("authType", e.target.value)}><option value="NONE">Nenhuma</option><option value="API_KEY_HEADER">Chave de API (header)</option><option value="API_KEY_QUERY">Chave de API (query)</option><option value="BEARER_TOKEN">Bearer token</option></select>
            {(f.authType !== "NONE" || adapter?.requiresAuth) && <span className="mt-1 block text-xs text-ink-3">A credencial é cadastrada depois, na página da fonte.</span>}</label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Caminho de teste (opcional)</span><input className={`${inp} font-mono`} placeholder="/status" value={f.healthPath} onChange={(e) => set("healthPath", e.target.value)} /></label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Prioridade (menor = preferida)</span><input className={inp} type="number" min={1} max={1000} value={f.priority} onChange={(e) => set("priority", Number(e.target.value))} /></label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Limite (req/min)</span><input className={inp} type="number" min={1} max={600} value={f.rateLimitPerMinute} onChange={(e) => set("rateLimitPerMinute", Number(e.target.value))} /></label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">TTL do cache (min)</span><input className={inp} type="number" min={0} value={f.cacheTtlMinutes} onChange={(e) => set("cacheTtlMinutes", Number(e.target.value))} /></label>
          <label className="text-sm"><span className="mb-1 block text-ink-3">Documentação (opcional)</span><input className={`${inp} font-mono`} value={f.documentationUrl} onChange={(e) => set("documentationUrl", e.target.value)} /></label>
          {err && <div className="sm:col-span-2"><Notice tone="bad">{err.message}{err.technical && <span className="mt-1 block font-mono text-xs">{err.technical}</span>}</Notice></div>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy ? "Criando…" : "Criar fonte"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
