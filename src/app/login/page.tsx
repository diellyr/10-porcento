"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Wordmark } from "@/components/ui/brand";
import { Button, Card, Notice } from "@/components/ui/primitives";
import { safeNext } from "@/lib/safe-next";
import { supabaseBrowser } from "@/lib/supabase-browser";

function Form() {
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(sp.get("setup") ? "O Supabase ainda não foi configurado neste ambiente." : null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.assign(safeNext(sp.get("next")));
    } catch {
      setErr("E-mail ou senha incorretos.");
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Wordmark /></div>
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Entrar</h1>
          <p className="mb-5 mt-1 text-sm text-ink-3">Acesso à área administrativa.</p>
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm"><span className="mb-1 block text-ink-2">E-mail</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-lg border border-line px-3" /></label>
            <label className="block text-sm"><span className="mb-1 block text-ink-2">Senha</span><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-lg border border-line px-3" /></label>
            {err && <Notice tone="bad">{err}</Notice>}
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Entrando…" : "Entrar"}</Button>
          </form>
        </Card>
      </div>
    </main>
  );
}

export default function Page() {
  return <Suspense><Form /></Suspense>;
}
