"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AVATARS, avatarLook } from "../content/characters";
import { ACHIEVEMENTS } from "../content/concepts";
import { safeNextGame } from "../engine/safe";
import { Portrait } from "./art/Portrait";
import { supabaseBrowser } from "@/lib/supabase-browser";

const input = "mt-1 h-12 w-full rounded-2xl border-2 border-[color:var(--g-line)] bg-white px-4 text-lg font-normal";
const hasSupabase = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function ensureProfile(sb: ReturnType<typeof supabaseBrowser>) {
  const me = (await (await fetch("/api/game/me", { cache: "no-store" })).json()) as { logado: boolean; nome: string | null };
  if (!me.logado || me.nome) return;
  const { data } = await sb.auth.getUser();
  const md = (data.user?.user_metadata ?? {}) as { display_name?: string; avatar?: string };
  const nome = (md.display_name ?? data.user?.email?.split("@")[0] ?? "Jogador").slice(0, 28).padEnd(2, "_");
  await fetch("/api/game/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: nome, avatar: /^av[1-9]$/.test(md.avatar ?? "") ? md.avatar : "av1" }) });
}

function EntrarForm() {
  const sp = useSearchParams(); const router = useRouter();
  const next = safeNextGame(sp.get("next"));
  const [modo, setModo] = useState<"entrar" | "criar" | "esqueci" | "nova-senha">(sp.get("recuperar") ? "nova-senha" : "entrar");
  const [email, setEmail] = useState(""); const [senha, setSenha] = useState(""); const [nome, setNome] = useState(""); const [avatar, setAvatar] = useState("av1");
  const [msg, setMsg] = useState<{ t: "ok" | "erro"; s: string } | null>(null); const [busy, setBusy] = useState(false);
  const ok = hasSupabase();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const sb = supabaseBrowser();
      if (modo === "entrar") {
        const { error } = await sb.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error("E-mail ou senha incorretos.");
        await ensureProfile(sb); router.replace(next); router.refresh();
      } else if (modo === "criar") {
        if (nome.trim().length < 2) throw new Error("Escolha um nome de jogador com pelo menos 2 letras.");
        if (senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { display_name: nome.trim(), avatar }, emailRedirectTo: `${location.origin}/entrar` } });
        if (error) throw new Error(/registered|already/i.test(error.message) ? "Este e-mail já tem perfil. Use “Entrar”." : "Não foi possível criar o perfil agora.");
        if (data.session) { await ensureProfile(sb); router.replace(next); router.refresh(); }
        else setMsg({ t: "ok", s: "Perfil criado! Enviamos uma mensagem de confirmação para o seu e-mail. Depois de confirmar, volte e entre." });
      } else if (modo === "esqueci") {
        await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/entrar?recuperar=1` });
        setMsg({ t: "ok", s: "Se o e-mail existir, enviamos um link para criar uma nova senha." });
      } else {
        if (senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        const { error } = await sb.auth.updateUser({ password: senha });
        if (error) throw new Error("Não foi possível alterar a senha. Abra o link do e-mail novamente.");
        setMsg({ t: "ok", s: "Senha alterada. Você já pode jogar." }); setTimeout(() => router.replace(next), 900);
      }
    } catch (err) { setMsg({ t: "erro", s: err instanceof Error ? err.message : "Algo deu errado." }); }
    setBusy(false);
  };

  return (
    <div className="mx-auto grid min-h-dvh max-w-5xl items-center gap-6 p-4 md:grid-cols-[1fr_1.1fr]">
      <aside className="hidden md:block" aria-hidden>
        <div className="g-card overflow-hidden p-4 text-center"><div className="mx-auto h-72 w-64"><Portrait look={avatarLook(avatar)} emocao="feliz" className="h-full w-full" /></div><p className="g-display mt-2 text-3xl font-bold">MEUS <span style={{ color: "var(--g-orange-t)" }}>10%</span></p><p className="text-[color:var(--g-ink2)]">Seu perfil guarda suas campanhas, seu Caderno de Gestão e suas conquistas — em qualquer aparelho.</p></div>
      </aside>
      <main className="g-card p-5 sm:p-7">
        <Link href="/jogo" className="g-btn ghost sm">← Voltar ao jogo</Link>
        <h1 className="mt-3 text-3xl font-bold">{modo === "criar" ? "Criar meu perfil" : modo === "esqueci" ? "Recuperar senha" : modo === "nova-senha" ? "Nova senha" : "Entrar"}</h1>
        <p className="mt-1 text-sm text-[color:var(--g-ink2)]">Entrar é <b>opcional</b>: você joga sem cadastro. O perfil serve para recuperar a campanha em outros aparelhos.</p>
        {!ok && <p role="alert" className="mt-3 rounded-2xl bg-[#fff3d6] p-3 text-sm font-bold">O Supabase ainda não foi conectado neste ambiente, então o login está indisponível. Você continua podendo jogar como convidado, salvando neste aparelho.</p>}
        {modo !== "nova-senha" && <div role="tablist" className="mt-3 flex gap-2">{(["entrar", "criar"] as const).map((m) => <button key={m} type="button" role="tab" aria-selected={modo === m} className={`g-btn sm ${modo === m ? "" : "ghost"}`} onClick={() => { setModo(m); setMsg(null); }}>{m === "entrar" ? "Entrar" : "Criar perfil"}</button>)}</div>}
        <form onSubmit={submit} className="mt-3 space-y-3">
          {modo === "criar" && (<>
            <label className="block font-bold">Nome de jogador<input className={input} value={nome} onChange={(e) => setNome(e.target.value.slice(0, 28))} required minLength={2} autoComplete="nickname" /></label>
            <fieldset><legend className="font-bold">Avatar</legend><div className="mt-1 grid grid-cols-6 gap-1.5">{AVATARS.map((a) => <label key={a.id} className={`cursor-pointer rounded-xl border-[3px] p-0.5 ${avatar === a.id ? "border-[color:var(--g-blue)] bg-[#eef2fe]" : "border-[color:var(--g-line)]"}`}><input type="radio" name="av" className="g-sr" checked={avatar === a.id} onChange={() => setAvatar(a.id)} /><span className="sr-only">{a.nome}</span><div className="aspect-square overflow-hidden rounded-lg" style={{ background: "linear-gradient(#fff,#ffeccc)" }}><Portrait look={a.look} enquadramento="rosto" className="h-full w-full" /></div></label>)}</div></fieldset>
          </>)}
          {modo !== "nova-senha" && <label className="block font-bold">E-mail<input type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>}
          {modo !== "esqueci" && <label className="block font-bold">{modo === "nova-senha" ? "Nova senha" : "Senha"}<input type="password" className={input} value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={modo === "entrar" ? 1 : 8} autoComplete={modo === "entrar" ? "current-password" : "new-password"} />{modo !== "entrar" && <span className="text-xs font-normal text-[color:var(--g-ink3)]">mínimo de 8 caracteres</span>}</label>}
          {msg && <p role={msg.t === "erro" ? "alert" : "status"} className={`rounded-2xl p-3 font-bold ${msg.t === "erro" ? "bg-[#fff1f1] text-[color:var(--g-red-d)]" : "bg-[#e6f6ee] text-[color:var(--g-green-d)]"}`}>{msg.s}</p>}
          <button className="g-btn orange xl w-full" disabled={busy || !ok}>{busy ? "Aguarde…" : modo === "criar" ? "Criar perfil" : modo === "esqueci" ? "Enviar link" : modo === "nova-senha" ? "Salvar nova senha" : "Entrar"}</button>
          {modo === "entrar" && <button type="button" className="w-full text-center text-sm font-bold underline" onClick={() => { setModo("esqueci"); setMsg(null); }}>Esqueci minha senha</button>}
        </form>
        <p className="mt-3 text-xs text-[color:var(--g-ink3)]">A senha é tratada pelo Supabase Auth (nunca armazenada pelo jogo). Veja a <Link href="/jogo">política de dados no próprio jogo</Link>: o histórico da partida pode ser excluído por você a qualquer momento no seu perfil.</p>
      </main>
    </div>
  );
}
export const Entrar = () => <Suspense><EntrarForm /></Suspense>;

interface PerfilData { email: string | null; profile: { display_name: string; avatar: string; pseudonym: string | null; share_results: boolean } | null; saves: Array<{ id: string; nome: string; unidade: string; caso: number; fase: string; final: string | null; atualizadoEm: string }>; conquistas: string[]; estatisticas: { partidas: number; concluidas: number; finais: Record<string, number> } }

export function Perfil() {
  const router = useRouter();
  const [d, setD] = useState<PerfilData | null | "anon">(null);
  const [nome, setNome] = useState(""); const [avatar, setAvatar] = useState("av1"); const [pseudo, setPseudo] = useState(""); const [share, setShare] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/game/profile", { cache: "no-store" }).catch(() => null);
      if (!r || r.status === 401) { setD("anon"); return; }
      if (!r.ok) { setD("anon"); return; }
      const j = (await r.json()) as PerfilData; setD(j);
      setNome(j.profile?.display_name ?? ""); setAvatar(j.profile?.avatar ?? "av1"); setPseudo(j.profile?.pseudonym ?? ""); setShare(j.profile?.share_results ?? false);
    })();
  }, []);
  const salvar = async () => {
    const r = await fetch("/api/game/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: nome, avatar, pseudonym: pseudo || null, share_results: share }) });
    setMsg(r.ok ? "Perfil salvo." : "Confira os campos (nome com 2 a 28 caracteres)."); 
  };
  const sair = async () => { try { await supabaseBrowser().auth.signOut(); } catch { /* sem sessão */ } router.replace("/jogo"); router.refresh(); };
  if (d === null) return <p className="p-6">Carregando…</p>;
  if (d === "anon") return <main className="mx-auto max-w-lg p-6"><div className="g-card p-6 text-center"><h1 className="text-3xl font-bold">Meu perfil</h1><p className="mt-2">Entre para ver seu perfil, suas campanhas e conquistas.</p><Link href="/entrar?next=/perfil" className="g-btn orange xl mt-4">Entrar / criar perfil</Link></div></main>;
  const got = new Set(d.conquistas);
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center gap-2"><Link href="/jogo" className="g-btn ghost sm">← Jogo</Link><button className="g-btn ghost sm ml-auto" onClick={() => void sair()}>Sair da conta</button></div>
      <section className="g-card grid gap-4 p-4 sm:grid-cols-[180px_1fr] sm:p-6" aria-labelledby="h-perfil">
        <div className="mx-auto h-44 w-40 overflow-hidden rounded-3xl" style={{ background: "linear-gradient(#fff,#ffeccc)" }}><Portrait look={avatarLook(avatar)} emocao="feliz" className="h-full w-full" /></div>
        <div className="space-y-3"><h1 id="h-perfil" className="text-3xl font-bold">{d.profile?.display_name ?? "Meu perfil"}</h1><p className="text-sm text-[color:var(--g-ink3)]">{d.email}</p>
          <label className="block font-bold">Nome de jogador<input className={input} value={nome} onChange={(e) => setNome(e.target.value.slice(0, 28))} /></label>
          <div className="grid grid-cols-6 gap-1.5 sm:max-w-md">{AVATARS.map((a) => <label key={a.id} className={`cursor-pointer rounded-xl border-[3px] p-0.5 ${avatar === a.id ? "border-[color:var(--g-blue)] bg-[#eef2fe]" : "border-[color:var(--g-line)]"}`}><input type="radio" name="av" className="g-sr" checked={avatar === a.id} onChange={() => setAvatar(a.id)} /><span className="sr-only">{a.nome}</span><div className="aspect-square overflow-hidden rounded-lg"><Portrait look={a.look} enquadramento="rosto" className="h-full w-full" /></div></label>)}</div>
          <label className="block font-bold">Pseudônimo para rankings (opcional)<input className={input} value={pseudo} onChange={(e) => setPseudo(e.target.value.slice(0, 24))} /></label>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 size-6" checked={share} onChange={(e) => setShare(e.target.checked)} /><span><b>Permitir resultados em rankings voluntários</b><span className="block text-sm text-[color:var(--g-ink3)]">Recurso da fase de competição social (ainda não disponível): nada é público hoje.</span></span></label>
          <div className="flex items-center gap-3"><button className="g-btn orange" onClick={() => void salvar()}>Salvar perfil</button>{msg && <span role="status" className="font-bold">{msg}</span>}</div></div>
      </section>
      <section className="grid gap-3 sm:grid-cols-3"><div className="g-card p-4"><p className="text-sm font-bold">Campanhas</p><p className="g-display text-4xl font-bold">{d.estatisticas.partidas}</p></div><div className="g-card p-4"><p className="text-sm font-bold">Concluídas</p><p className="g-display text-4xl font-bold">{d.estatisticas.concluidas}</p></div><div className="g-card p-4"><p className="text-sm font-bold">Finais</p><ul className="text-sm">{Object.entries(d.estatisticas.finais).map(([k, v]) => <li key={k}>{k}: {v}</li>)}{!Object.keys(d.estatisticas.finais).length && <li>Nenhum ainda</li>}</ul></div></section>
      <section className="g-card p-4"><h2 className="text-xl font-bold">Minhas campanhas</h2><ul className="mt-2 grid gap-2">{d.saves.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#fffaf0] p-2"><span className="min-w-0 flex-1 text-sm"><b>{s.unidade.split(" (")[0]}</b> · {s.final ? `encerrada: ${s.final}` : `caso ${s.caso} de 10`} · {new Date(s.atualizadoEm).toLocaleDateString("pt-BR")}</span><Link href="/jogo?acao=continuar" className="g-btn sm">Abrir</Link></li>)}{!d.saves.length && <li className="text-sm">Nenhuma campanha na conta ainda.</li>}</ul></section>
      <section className="g-card p-4"><h2 className="text-xl font-bold">🏅 Conquistas ({got.size}/{ACHIEVEMENTS.length})</h2><ul className="mt-2 grid gap-2 sm:grid-cols-2">{ACHIEVEMENTS.map((a) => <li key={a.id} className="flex items-center gap-2 text-sm" ><span aria-hidden className="text-2xl">{got.has(a.id) ? a.icone : "🔒"}</span><span className={got.has(a.id) ? "" : "text-[color:var(--g-ink3)]"}><b>{a.nome}</b>{got.has(a.id) ? "" : " (bloqueada)"}<br />{a.descricao}</span></li>)}</ul></section>
    </main>
  );
}
