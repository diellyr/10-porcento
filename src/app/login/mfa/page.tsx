"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Wordmark } from "@/components/ui/brand";
import { Button, Card, Notice } from "@/components/ui/primitives";
import { safeNext } from "@/lib/safe-next";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Mode = "loading" | "enroll" | "verify";

function Form() {
  const sp = useSearchParams();
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: user } = await sb.auth.getUser();
        if (!user.user) { window.location.assign("/login?next=/admin"); return; }
        const { data } = await sb.auth.mfa.listFactors();
        const verified = data?.totp?.[0]; // listFactors devolve só fatores verificados em `totp`
        if (verified) { setFactorId(verified.id); setMode("verify"); return; }
        // limpa tentativas de cadastro abandonadas e cria um fator novo
        for (const f of data?.all ?? []) if (f.factor_type === "totp" && f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
        const { data: enr, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Brasil Fiscal ${new Date().toISOString().slice(0, 10)}` });
        if (error || !enr) throw error ?? new Error("enroll");
        setFactorId(enr.id); setQr(enr.totp.qr_code); setSecret(enr.totp.secret); setMode("enroll");
      } catch { setErr("Não foi possível iniciar a verificação em duas etapas. Tente recarregar a página."); }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true); setErr(null);
    try {
      const { error } = await supabaseBrowser().auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, "") });
      if (error) throw error;
      window.location.assign(safeNext(sp.get("next")));
    } catch { setErr("Código incorreto ou expirado. Confira o relógio do celular e tente de novo."); setBusy(false); }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Wordmark /></div>
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Verificação em duas etapas</h1>
          {mode === "loading" && !err && <p className="mt-3 text-sm text-ink-3">Carregando…</p>}
          {mode === "enroll" && (
            <div className="mt-3 space-y-3 text-sm text-ink-2">
              <p>Para proteger a área administrativa, cadastre um aplicativo autenticador (Google Authenticator, Authy, 1Password…). Escaneie o QR code e digite o código de 6 dígitos.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img src={qr} alt="QR code para cadastrar o autenticador" className="mx-auto size-44 rounded-lg border border-line bg-white p-2" />}
              {secret && <p className="break-all text-center font-mono text-xs text-ink-3">Sem câmera? Chave manual: {secret}</p>}
            </div>
          )}
          {mode === "verify" && <p className="mt-3 text-sm text-ink-2">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>}
          {mode !== "loading" && (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <label className="block text-sm"><span className="mb-1 block text-ink-2">Código</span>
                <input inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={7} required value={code} onChange={(e) => setCode(e.target.value)} className="h-11 w-full rounded-lg border border-line px-3 text-center font-mono text-lg tracking-widest" />
              </label>
              {err && <Notice tone="bad">{err}</Notice>}
              <Button type="submit" disabled={busy || code.replace(/\s/g, "").length !== 6} className="w-full">{busy ? "Verificando…" : mode === "enroll" ? "Ativar e entrar" : "Verificar"}</Button>
            </form>
          )}
          {mode === "loading" && err && <div className="mt-4"><Notice tone="bad">{err}</Notice></div>}
        </Card>
      </div>
    </main>
  );
}

export default function Page() { return <Suspense><Form /></Suspense>; }
