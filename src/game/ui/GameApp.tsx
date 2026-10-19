"use client";
import { Versao } from "./Versao";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { audio } from "../audio/AudioManager";
import { AVATARS, avatarLook } from "../content/characters";
import { QUIZ } from "../content/concepts";
import { fictionalScenario } from "../content/scenario";
import { CONTENT_VERSION, RULES_VERSION, type Scenario } from "../engine/types";
import { InstallShortcut } from "./Install";
import { HeroArt } from "./art/HeroArt";
import { Portrait } from "./art/Portrait";
import { ClassChip, FictionBadge, Modal, useHydrated } from "./atoms";
import { SettingsPanel } from "./panels";
import { Play } from "./Play";
import { GameProvider, uid, useGame } from "./store";
import { SearchBox } from "@/components/search-box";

type Tela = "titulo" | "novo" | "continuar";

function Shell() {
  const { state, settings, close } = useGame();
  const sp = useSearchParams();
  const router = useRouter();
  const [tela, setTela] = useState<Tela>("titulo");
  const [cfg, setCfg] = useState(false);
  useEffect(() => { const a = sp.get("acao"); if (a === "novo") setTela("novo"); else if (a === "continuar") setTela("continuar"); else if (a === "config") setCfg(true); }, [sp]);
  const hy = useHydrated();
  const cls = `game ${hy && settings.reduzirMovimento ? "reduce-motion" : ""} ${hy && settings.altoContraste ? "contrast" : ""}`;
  useEffect(() => { document.body.classList.toggle("g-large", settings.textoGrande); }, [settings.textoGrande]);
  const sair = () => { close(); setTela("titulo"); router.replace("/jogo"); };

  return (
    <div className={cls} style={hy && settings.textoGrande ? { fontSize: "1.12rem" } : undefined}>
      <a href="#jogo-conteudo" className="g-sr focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[70] focus:rounded-xl focus:bg-white focus:p-3">Ir para o conteúdo</a>
      <main id="jogo-conteudo">
        {state?.phase === "quiz" ? <Quiz /> : state ? <Play onExit={sair} /> : tela === "novo" ? <NewGame onBack={() => setTela("titulo")} /> : tela === "continuar" ? <Continue onBack={() => setTela("titulo")} /> : <Title onNovo={() => setTela("novo")} onContinuar={() => setTela("continuar")} onConfig={() => setCfg(true)} />}
      </main>
      {cfg && <SettingsPanel onClose={() => setCfg(false)} />}
    </div>
  );
}

function Title({ onNovo, onContinuar, onConfig }: { onNovo: () => void; onContinuar: () => void; onConfig: () => void }) {
  const { saves: allSaves, session: sess, settings } = useGame();
  const hy = useHydrated();
  const saves = hy ? allSaves : [];
  const session = hy ? sess : { ...sess, logado: false, nome: null };
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => { if (settings.reduzirMovimento || !ref.current) return; const r = ref.current.getBoundingClientRect(); ref.current.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5) * 2)); ref.current.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5) * 2)); };
  return (
    <div ref={ref} onPointerMove={move} className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="absolute inset-0"><HeroArt avatar="av1" className="h-full w-full" /></div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-transparent to-white/45" aria-hidden />
      <div className="relative z-10 flex flex-1 flex-col items-center px-4 pb-8 pt-8 text-center">
        <p className="g-chip es">🎭 Sátira · tudo é ficção</p>
        <h1 className="mt-2 text-[clamp(3.2rem,12vw,7.5rem)] font-bold leading-none tracking-tight" style={{ textShadow: "0 4px 0 #fff, 0 10px 30px rgb(27 35 64 / .35)", color: "var(--g-blue)" }}>MEUS <span style={{ color: "var(--g-orange-t)" }}>10%</span> <Versao className="!text-base" /></h1>
        <p className="mt-2 max-w-xl text-lg font-bold sm:text-xl" style={{ textShadow: "0 2px 0 #fff" }}>Você recebeu uma caneta e dinheiro público. O que vai fazer com eles?</p>
        <div className="mt-auto flex w-full max-w-sm flex-col gap-3 pt-10">
          <button className="g-btn orange xl" onClick={() => { audio.unlock(); audio.sfx("confirm"); onNovo(); }}>▶ Nova partida</button>
          <button className="g-btn xl" onClick={() => { audio.unlock(); audio.sfx("click"); onContinuar(); }} disabled={saves.length === 0}>↻ Continuar {saves.length > 0 && <span className="g-chip">{saves.length}</span>}</button>
          <button className="g-btn ghost xl" onClick={() => { audio.unlock(); onConfig(); }}>⚙️ Configurações</button>
          <div className="mt-1 flex flex-wrap justify-center gap-2 text-sm font-bold">
            <Link href={session.logado ? "/perfil" : "/entrar?next=/jogo"} className="g-btn sm ghost">{session.logado ? `👤 ${session.nome ?? "Meu perfil"}` : "👤 Entrar / criar perfil"}</Link>
            {session.logado && <Link href="/entrar?next=/jogo" className="g-btn sm ghost">🔁 Trocar de conta</Link>}
            <Link href="/" className="g-btn sm ghost">Sobre o jogo</Link><Link href="/elenco" className="g-btn sm ghost">Elenco</Link><InstallShortcut />
          </div>
        </div>
      </div>
    </div>
  );
}

function Continue({ onBack }: { onBack: () => void }) {
  const { saves, load, removeSave, refreshSaves } = useGame();
  useEffect(() => { void refreshSaves(); }, [refreshSaves]);
  return (
    <div className="mx-auto max-w-2xl p-4">
      <button className="g-btn ghost sm" onClick={onBack}>← Voltar</button>
      <h1 className="mt-3 text-3xl font-bold">Continuar campanha</h1>
      {saves.length === 0 && <p className="mt-4 g-card p-4">Nenhuma partida salva ainda.</p>}
      <ul className="mt-4 grid gap-3">
        {saves.map((m) => (
          <li key={m.id} className="g-card flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1"><p className="font-bold">{m.nome} · {m.unidade.split(" (")[0]}</p><p className="text-sm text-[color:var(--g-ink3)]">{m.final ? `Encerrada: ${m.final}` : m.fase === "quiz" ? "No quiz inicial" : `Caso ${m.caso} de 10`} · {new Date(m.atualizadoEm).toLocaleString("pt-BR")} · {m.origem === "conta" ? "na sua conta" : "neste aparelho"}</p></div>
            <button className="g-btn orange sm" onClick={async () => { audio.unlock(); audio.sfx("confirm"); await load(m.id, m.origem); }}>{m.final ? "Rever" : "Continuar"}</button>
            <button className="g-btn ghost sm" aria-label={`Apagar a partida de ${m.nome}`} onClick={() => { if (window.confirm("Apagar esta partida? Esta ação não pode ser desfeita.")) void removeSave(m); }}>🗑️</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewGame({ onBack }: { onBack: () => void }) {
  const { dispatch, session } = useGame();
  const router = useRouter();
  const [nome, setNome] = useState(session.nome ?? "");
  const [avatar, setAvatar] = useState(session.avatar ?? "av1");
  const [modo, setModo] = useState<"ficticio" | "real">("ficticio");
  const [mun, setMun] = useState<{ code: string; name: string; uf: string | null } | null>(null);
  const [aviso, setAviso] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { if (session.nome && !nome) setNome(session.nome); if (session.avatar) setAvatar(session.avatar); }, [session.nome, session.avatar]); // eslint-disable-line react-hooks/exhaustive-deps

  const iniciar = async () => {
    setBusy(true); setErro(null);
    let scenario: Scenario = fictionalScenario();
    if (modo === "real" && mun) {
      try { const r = await fetch(`/api/game/scenario?code=${mun.code}&nome=${encodeURIComponent(mun.name)}&uf=${mun.uf ?? ""}`, { cache: "no-store" }); if (r.ok) scenario = ((await r.json()) as { scenario: Scenario }).scenario; else setErro("Não foi possível consultar os dados agora: usei o cenário fictício."); } catch { setErro("Sem conexão com os dados: usei o cenário fictício."); }
    }
    audio.unlock(); audio.sfx("confirm");
    const r = dispatch({ type: "start", playerName: nome || "Jogador(a)", avatar, scenario, seed: Math.floor(Math.random() * 2 ** 31), gameId: uid() });
    if (!r.ok) { setErro(r.error ?? "Erro ao iniciar."); setBusy(false); } else router.replace("/jogo");
  };
  return (
    <div className="mx-auto max-w-4xl p-3 sm:p-6">
      <button className="g-btn ghost sm" onClick={onBack}>← Voltar</button>
      <h1 className="mt-3 text-4xl font-bold">Nova partida</h1>
      <p className="mt-1 text-[color:var(--g-ink2)]">Comece como Administrador(a) de UPA. Sem cadastro obrigatório.</p>
      <section className="g-card mt-4 p-4" aria-labelledby="h-nome"><h2 id="h-nome" className="text-xl font-bold">1. Seu personagem</h2>
        <label className="mt-2 block font-bold">Nome fictício<input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 28))} maxLength={28} placeholder="Como o jogo vai chamar você" className="mt-1 h-12 w-full rounded-2xl border-2 border-[color:var(--g-line)] bg-white px-4 text-lg font-normal" autoComplete="nickname" /></label>
        <fieldset className="mt-3"><legend className="font-bold">Avatar pronto (todos jogam igual)</legend>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">{AVATARS.map((a) => <label key={a.id} className={`cursor-pointer rounded-2xl border-[3px] p-1 text-center ${avatar === a.id ? "border-[color:var(--g-blue)] bg-[#eef2fe]" : "border-[color:var(--g-line)] bg-white"}`}><input type="radio" name="avatar" value={a.id} checked={avatar === a.id} onChange={() => setAvatar(a.id)} className="g-sr" /><div className="aspect-square overflow-hidden rounded-xl" style={{ background: "linear-gradient(#fff,#ffeccc)" }}><Portrait look={a.look} enquadramento="rosto" emocao="feliz" className="h-full w-full" /></div><span className="text-xs font-bold">{a.nome}</span></label>)}</div>
          <p className="mt-2 text-xs text-[color:var(--g-ink3)]">Foto opcional (caricatura) fica para uma fase posterior; nada de rosto ou nome influencia pontuação.</p></fieldset>
      </section>
      <section className="g-card mt-3 p-4" aria-labelledby="h-cen"><h2 id="h-cen" className="text-xl font-bold">2. Cenário e dados</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className={`cursor-pointer rounded-2xl border-[3px] p-3 ${modo === "ficticio" ? "border-[color:var(--g-blue)] bg-[#eef2fe]" : "border-[color:var(--g-line)] bg-white"}`}><input type="radio" name="modo" className="g-sr" checked={modo === "ficticio"} onChange={() => setModo("ficticio")} /><b>UPA fictícia (recomendado)</b><span className="block text-sm">Vila Esperança. Orçamento: <ClassChip c="estimativa" curto /> de R$ 24 milhões/ano. Funciona sem rede.</span></label>
          <label className={`cursor-pointer rounded-2xl border-[3px] p-3 ${modo === "real" ? "border-[color:var(--g-blue)] bg-[#eef2fe]" : "border-[color:var(--g-line)] bg-white"}`}><input type="radio" name="modo" className="g-sr" checked={modo === "real"} onChange={() => setModo("real")} /><b>Município real como referência</b><span className="block text-sm">Usa o gasto oficial de saúde (<ClassChip c="oficial" curto />) do município para dimensionar a UPA fictícia. Dados congelados na partida.</span></label>
        </div>
        {modo === "real" && <div className="mt-3"><p className="mb-1 font-bold">Município</p>{mun ? <p className="rounded-2xl bg-[#eef2fe] p-3 font-bold">{mun.name}{mun.uf ? ` – ${mun.uf}` : ""} <button className="g-btn sm ghost ml-2" onClick={() => setMun(null)}>trocar</button></p> : <SearchBox places onPick={(p) => { if (p.type === "MUNICIPALITY") setMun({ code: p.code, name: p.name, uf: p.uf }); }} />}<p className="mt-1 text-xs text-[color:var(--g-ink3)]">O total de saúde do município <b>não</b> é o orçamento de uma UPA específica; a unidade e todos os eventos seguem fictícios.</p></div>}
      </section>
      <section className="g-card mt-3 p-4" style={{ borderColor: "var(--g-red)" }} aria-labelledby="h-aviso"><h2 id="h-aviso" className="text-xl font-bold">3. Antes da primeira decisão</h2>
        <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed"><li>Todos os atos de corrupção são <b>fictícios</b>. Personagens, empresas e valores de desvio não representam pessoas ou órgãos reais.</li><li>Você poderá tentar desviar <b>até 10%</b> da base de um evento — com confirmação explícita. Desvios deliberados <b>ficam registrados</b> e, nesta campanha, levam à responsabilização no encerramento (convenção da ficção).</li><li>Melhorar a gestão exige escolhas difíceis. Economia legítima <b>não</b> vira dinheiro seu.</li></ul>
        <label className="mt-3 flex items-start gap-3 font-bold"><input type="checkbox" checked={aviso} onChange={(e) => setAviso(e.target.checked)} className="mt-0.5 size-6 accent-[color:var(--g-blue)]" />Entendi: é uma simulação satírica.</label></section>
      {erro && <p role="status" className="mt-3 rounded-2xl bg-[#fff3d6] p-3 font-bold">{erro}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3"><button className="g-btn orange xl" disabled={!aviso || busy || (modo === "real" && !mun)} onClick={() => void iniciar()}>{busy ? "Preparando…" : "Começar campanha ▶"}</button><FictionBadge /><span className="text-xs text-[color:var(--g-ink3)]">regras {RULES_VERSION} · conteúdo {CONTENT_VERSION}</span></div>
    </div>
  );
}

function Quiz() {
  const { state: st, dispatch } = useGame();
  const s = st!;
  const q = QUIZ[s.quizStep]!;
  const [eco, setEco] = useState<string | null>(null);
  const resp = (optionId: string, ecoTxt: string) => { audio.sfx("pick"); setEco(ecoTxt); setTimeout(() => { dispatch({ type: "quiz.answer", questionId: q.id, optionId }); setEco(null); }, 1700); };
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center p-4">
      <p className="text-sm font-extrabold uppercase tracking-widest text-[color:var(--g-orange-d)]">Pergunta {s.quizStep + 1} de {QUIZ.length} · só ajusta seus atributos iniciais</p>
      <h1 className="mt-1 text-3xl font-bold leading-tight">{q.pergunta}</h1>
      <div className="mt-4 grid gap-3" role="group" aria-label="Respostas">{q.opcoes.map((o) => <button key={o.id} className="g-btn ghost !justify-start text-left !font-semibold" disabled={!!eco} onClick={() => resp(o.id, o.eco)}>{o.rotulo}</button>)}</div>
      {eco && <p role="status" className="g-pop mt-4 rounded-2xl bg-[#eef2fe] p-4 text-lg font-semibold">{eco}</p>}
      <p className="mt-4 text-xs text-[color:var(--g-ink3)]">O quiz é humorístico: não rotula você como honesto ou corrupto e não bloqueia nenhum caminho.</p>
    </div>
  );
}

export default function GameApp() {
  return <GameProvider><Suspense><Shell /></Suspense></GameProvider>;
}
export { avatarLook, Modal };
