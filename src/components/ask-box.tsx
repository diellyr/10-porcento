"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Notice } from "@/components/ui/primitives";
import { SourceNote } from "@/components/ui/provenance";
import type { Provenance } from "@/lib/dto";

interface Answer { entity: { name: string; uf: string | null }; text: string; notice: string | null; freshness: string; provenance: Provenance[] }
interface RankingAnswer { text: string; note: string | null; covered: number; total: number; complete: boolean }
interface Resp { status: "ok" | "needs_clarification" | "unsupported"; message: string | null; answers: Answer[]; ranking?: RankingAnswer | null }

const EXAMPLES = ["Quanto Santos gastou com saúde em 2024?", "Compare educação de Praia Grande e Santos", "Quanto o Brasil arrecadou em 2024?", "Quais estados mais gastaram com saúde em 2024?"];

export function AskBox({ initial }: { initial?: string }) {
  const [q, setQ] = useState(initial ?? "");
  const [res, setRes] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ran = useRef(false);

  const ask = async (text: string) => {
    if (text.trim().length < 3) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/v1/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }) });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error?.message ?? "Erro ao responder.");
      setRes(body);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro ao responder."); setRes(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (initial && !ran.current) { ran.current = true; void ask(initial); } }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-3xl">
      <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="pergunta">Sua pergunta</label>
        <input id="pergunta" value={q} maxLength={300} onChange={(e) => setQ(e.target.value)} placeholder="Pergunte ao Brasil Fiscal…" className="h-12 flex-1 rounded-xl border border-line bg-surface px-4 text-base" />
        <Button type="submit" disabled={loading} className="h-12 px-6">{loading ? "Consultando…" : "Perguntar"}</Button>
      </form>
      <p className="mt-3 flex flex-wrap gap-2 text-sm text-ink-3">Exemplos: {EXAMPLES.map((e) => <button key={e} type="button" className="rounded-full border border-line bg-surface px-3 py-1 text-ink-2 hover:border-primary/50" onClick={() => { setQ(e); void ask(e); }}>{e}</button>)}</p>
      <div className="mt-8 space-y-4" aria-live="polite">
        {err && <Notice tone="warn">{err}</Notice>}
        {res && res.status !== "ok" && <Notice tone="info">{res.message}</Notice>}
        {res?.status === "ok" && res.ranking && (
          <Card className="p-5">
            <p className="whitespace-pre-line text-lg text-ink">{res.ranking.text}</p>
            {res.ranking.note && <div className="mt-3"><Notice tone="warn">{res.ranking.note}</Notice></div>}
            <p className="mt-3 text-xs text-ink-3">Cobertura: {res.ranking.covered} de {res.ranking.total} com dado salvo. <a className="text-primary hover:underline" href="/rankings">Abrir em Rankings</a></p>
          </Card>
        )}
        {res?.status === "ok" && res.answers.map((a, i) => (
          <Card key={i} className="p-5">
            <p className="text-lg text-ink">{a.text}</p>
            {a.notice && <div className="mt-3"><Notice tone="warn">{a.notice}</Notice></div>}
            <div className="mt-4 border-t border-line pt-3"><SourceNote provenance={a.provenance} /></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
