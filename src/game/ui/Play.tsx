"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audio } from "../audio/AudioManager";
import { CASE_BY_NUM, DECISION_BY_ID } from "../content/cases";
import { levelOf } from "../content/levels";
import { CONV_BY_ID } from "../content/conversations";
import { LOCATIONS } from "../content/locations";
import { makeCtx, txt } from "../engine/rules";
import { worldView } from "../engine/scoring";
import type { CharId, Consequence, GameState, LocationId, PenGesture } from "../engine/types";
import { AchievementsPanel, AgendaPanel, DataPanel, DossierPanel, LedgerPanel, MapPanel, NotebookPanel, SettingsPanel } from "./panels";
import { activeHotspots, GameScene, presentPeople, type ActiveHotspot } from "./GameScene";
import { ConsequenceModal, DecisionSheet, PenModal } from "./Decision";
import { Dialogue, Negotiation } from "./Dialogue";
import { Modal, Toast, useHydrated } from "./atoms";
import { qualidadeFinal } from "./three/support";
import { World3D, type Modo, type RoomPin } from "./three/World3D";
import { Hud } from "./Hud";
import { useGame } from "./store";
import { Ending } from "./Ending";

type Overlay =
  | { t: "caso" } | { t: "conv"; id: string } | { t: "neg"; id: string } | { t: "decisao" }
  | { t: "caneta"; opt: string; antes: GameState } | { t: "resultado"; antes: GameState; cons: Consequence[]; depois: GameState }
  | { t: "novidades"; cons: Consequence[]; antes: GameState; depois: GameState }
  | { t: "panel"; p: "dossie" | "agenda" | "caderno" | "conta" | "dados" | "conquistas" | "mapa" | "config" | "menu" } | null;

export function Play({ onExit }: { onExit: () => void }) {
  const { state: st, dispatch, settings, sync, session } = useGame();
  const s = st!;
  const [ov, setOv] = useState<Overlay>(null);
  const hy = useHydrated();
  const [modo, setModo] = useState<Modo>("sala");
  const [fail3d, setFail3d] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ink" | "ok" | "bad" } | null>(null);
  const shown = useRef<number>(0);
  const caso = CASE_BY_NUM[Math.min(s.caso, levelOf(s).ultimo)]!;
  const ctx = useMemo(() => makeCtx(s.scenario, s, s.player.nome), [s]);
  const say = useCallback((msg: string, tone: "ink" | "ok" | "bad" = "ink") => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3200); }, []);
  const world = worldView(s);

  // abertura do caso: cartão de episódio uma única vez por caso
  useEffect(() => {
    if (s.phase === "jogando" && s.casoAberto && shown.current !== s.caso && !ov) { shown.current = s.caso; setOv({ t: "caso" }); }
  }, [s.phase, s.casoAberto, s.caso, ov]);
  useEffect(() => { audio.music(s.phase === "encerrada" ? "final" : s.personal.evidencias >= 6 ? "tenso" : s.pub.qualidade >= 70 ? "alegre" : "calmo"); }, [s.phase, s.personal.evidencias, s.pub.qualidade]);

  const hs = useMemo(() => activeHotspots(s), [s]);
  const pendentes = hs.filter((a) => a.estado === "novo" || a.estado === "pessoa").length;
  const deveDecidir = DECISION_BY_ID[caso.decisao]!;
  const q3d = hy ? qualidadeFinal(settings.qualidade3d) : "2d";
  const pins = useMemo(() => {
    const out = {} as Record<LocationId, RoomPin>;
    for (const k of Object.keys(LOCATIONS) as LocationId[]) {
      const novos = LOCATIONS[k].hotspots.filter((h) => h.kind === "pista" || h.kind === "pessoa").filter((h) => h.entradas.some((e) => e.casos.includes(s.caso) && !(s.clues[e.ref] || s.talked[e.ref])));
      out[k] = { novo: s.casoAberto ? novos.length : 0, objetivo: s.casoAberto && caso.location === k };
    }
    return out;
  }, [s, caso]);
  const foco = ov?.t === "conv" ? (hs.find((a) => a.ref === ov.id)?.h.id ?? null) : null;

  const pick = (a: ActiveHotspot) => {
    audio.unlock(); audio.sfx("click");
    if (!s.casoAberto && a.h.kind !== "porta") { say("A decisão deste caso já foi registrada. Avance para o próximo caso.", "ink"); return; }
    if (a.h.kind === "porta") { audio.sfx("whoosh"); dispatch({ type: "go", location: a.ref as LocationId }); return; }
    if (a.h.kind === "mesa") { setOv({ t: "decisao" }); return; }
    if (a.h.kind === "pista") {
      const r = dispatch({ type: "inspect", clueId: a.ref });
      if (r.ok) { audio.sfx("paper"); say("Nova pista no Dossiê.", "ok"); setOv({ t: "panel", p: "dossie" }); } else say(r.error ?? "Não foi possível examinar.", "bad");
      return;
    }
    const conv = CONV_BY_ID[a.ref]!;
    if (s.talked[conv.id]) { if (conv.negociacao && !s.negociacoes[conv.negociacao]) setOv({ t: "neg", id: conv.negociacao }); else say(`Você já conversou com ${conv.titulo ? "esta pessoa" : ""}. As informações estão no Dossiê.`, "ink"); return; }
    setOv({ t: "conv", id: conv.id });
  };

  const finishConv = (id: string, choices: string[]) => {
    const r = dispatch({ type: "talk", conversationId: id, choices });
    const conv = CONV_BY_ID[id]!;
    if (!r.ok) { say(r.error ?? "Erro", "bad"); setOv(null); return; }
    setOv(conv.negociacao ? { t: "neg", id: conv.negociacao } : null);
  };

  const onConfirmed = (optId: string, antes: GameState) => { setOv({ t: "caneta", opt: optId, antes }); };
  const avancar = () => {
    const antes = structuredClone(s);
    const r = dispatch({ type: "advance" });
    if (!r.ok) { say(r.error ?? "Erro", "bad"); return; }
    audio.sfx("whoosh");
    const d = r.state!;
    if (d.phase === "encerrada") { setOv(d.consequences.length ? { t: "novidades", cons: d.consequences, antes, depois: d } : null); return; }
    setOv(d.consequences.length ? { t: "novidades", cons: d.consequences, antes, depois: d } : null);
  };

  const conv = ov?.t === "conv" ? CONV_BY_ID[ov.id]! : null;
  const falando: CharId | null = null;

  if (s.phase === "encerrada" || s.phase === "abandonada") {
    return (
      <>
        <Ending onExit={onExit} />
        {ov?.t === "novidades" && <ConsequenceModal titulo="Últimas consequências" consequences={ov.cons} antes={ov.antes} depois={ov.depois} onClose={() => setOv(null)} rotulo="Ver o desfecho" />}
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1320px] flex-col gap-2 p-2 sm:p-3" data-estado-jogo={s.version}>
      <Hud s={s} onOpenDados={() => setOv({ t: "panel", p: "dados" })} onOpenConta={() => setOv({ t: "panel", p: "conta" })} />
      <section className="g-card overflow-hidden" aria-label={`Local: ${LOCATIONS[s.location].nome}`}>
        <header className="flex flex-wrap items-center gap-2 border-b-2 border-[color:var(--g-line)] bg-[#fff6e3] px-3 py-2">
          <h1 className="text-xl font-bold leading-tight">{LOCATIONS[s.location].nome}</h1>
          <p className="hidden flex-1 text-sm text-[color:var(--g-ink2)] md:block">{LOCATIONS[s.location].descricao}</p>
          {s.casoAberto && pendentes > 0 && <span className="g-chip es ml-auto">🔍 {pendentes} para ver aqui</span>}
          <button type="button" className="g-btn sm teal ml-auto md:ml-0" onClick={() => setOv({ t: "panel", p: "mapa" })}>🗺️ Mapa</button>
        </header>
        {q3d !== "2d" && !fail3d
          ? <World3D s={s} hs={hs} q={q3d} modo={modo} foco={foco} pins={pins} onPick={pick} onModo={setModo} reduzir={settings.reduzirMovimento} onFail={() => setFail3d(true)}
              onGoRoom={(l) => { audio.unlock(); audio.sfx("whoosh"); if (l !== s.location) dispatch({ type: "go", location: l }); setModo("sala"); }} />
          : <><p className="px-3 pt-1 text-xs text-[color:var(--g-ink3)] md:hidden" aria-hidden>↔ Arraste a cena para os lados ou use a lista abaixo.</p>
            <GameScene s={s} onPick={pick} falando={falando} reduzir={settings.reduzirMovimento} /></>}
        <ul className="grid gap-2 border-t-2 border-[color:var(--g-line)] bg-[#fffaf0] p-2.5 sm:grid-cols-2 lg:grid-cols-3" aria-label="O que você pode fazer aqui">
          {hs.map((a) => (
            <li key={a.h.id}><button type="button" onClick={() => pick(a)} className="g-btn ghost sm w-full !justify-start text-left !font-semibold" data-acao={a.h.id}>
              <span aria-hidden>{a.estado === "porta" ? "➜" : a.estado === "visto" || a.estado === "pessoa-feita" ? "✓" : a.h.icone}</span><span className="min-w-0 flex-1 truncate">{a.rotulo}</span>{(a.estado === "novo" || a.estado === "pessoa") && <span className="g-chip es shrink-0">novo</span>}
            </button></li>
          ))}
        </ul>
      </section>

      <nav className="sticky bottom-2 z-30 mt-auto flex flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-[color:var(--g-line)] bg-white/95 p-2 shadow-2xl backdrop-blur" aria-label="Ações da partida">
        <button type="button" className="g-btn sm ghost" onClick={() => setOv({ t: "panel", p: "dossie" })}>🗂️ Dossiê <span className="g-chip">{Object.keys(s.clues).length}</span></button>
        <button type="button" className="g-btn sm ghost" onClick={() => setOv({ t: "panel", p: "agenda" })}>📇 Agenda</button>
        <button type="button" className="g-btn sm ghost" onClick={() => setOv({ t: "panel", p: "caderno" })}>📓 Caderno <span className="g-chip">{s.notebook.length}</span></button>
        <button type="button" className="g-btn sm ghost" onClick={() => setOv({ t: "panel", p: "conquistas" })}>🏅</button>
        {s.casoAberto ? (
          s.location === deveDecidir.mesa
            ? <button type="button" className="g-btn orange" onClick={() => setOv({ t: "decisao" })}>🖋️ Tomar a decisão</button>
            : <button type="button" className="g-btn yellow" onClick={() => { dispatch({ type: "go", location: deveDecidir.mesa }); say(`A decisão é assinada em: ${LOCATIONS[deveDecidir.mesa].nome}.`); }}>🖋️ Ir decidir ({LOCATIONS[deveDecidir.mesa].curto})</button>
        ) : <button type="button" className="g-btn green" onClick={avancar}>{s.caso >= levelOf(s).ultimo ? "🏁 Ver o desfecho" : "➡ Próximo caso"}</button>}
        <button type="button" className="g-btn sm ghost" onClick={() => setOv({ t: "panel", p: "menu" })} aria-label="Menu">☰</button>
        <span className="w-full text-center text-[0.7rem] text-[color:var(--g-ink3)]" aria-live="polite">{sync === "pendente" ? "sincronizando com a conta…" : sync === "sincronizado" ? "salvo na conta e neste aparelho" : sync === "erro" ? "sem sincronizar com a conta (salvo neste aparelho)" : session.logado ? "salvo neste aparelho" : "salvo neste aparelho · entre para guardar na conta"}</span>
      </nav>

      {ov?.t === "caso" && (
        <Modal title={`${caso.episodio} · ${caso.titulo}`} dismissible={false} footer={<button className="g-btn orange xl" autoFocus onClick={() => { audio.unlock(); audio.sfx("confirm"); const auto = Object.values(CONV_BY_ID).find((c) => c.caso === s.caso && c.auto && !s.talked[c.id] && c.location === s.location); setOv(auto ? { t: "conv", id: auto.id } : null); }}>Começar a investigar ▶</button>}>
          <p className="text-lg leading-relaxed">{txt(caso.chamada, ctx)}</p>
          <p className="mt-3 rounded-2xl bg-[#eef2fe] p-3 text-sm"><b>Como funciona:</b> explore os locais, converse, examine documentos e confronte pistas. Depois tome a decisão na mesa — você verá custo, prazo e riscos antes de confirmar.</p>
          {s.caso === 1 && <p className="mt-3 rounded-2xl bg-[#fff1f1] p-3 text-sm"><b>Aviso importante:</b> tudo aqui é ficção. Atos de corrupção são fictícios; desvios deliberados ficam registrados e levam à responsabilização no encerramento. Os finais <i>nacionais</i> (Imperador Supremo, Presidência) pertencem à carreira completa, ainda não disponível.</p>}
          <p className="mt-3 text-sm text-[color:var(--g-ink3)]">💡 {txt(caso.dica, ctx)}</p>
        </Modal>
      )}
      {conv && <Dialogue conv={conv} s={s} onFinish={(c) => finishConv(conv.id, c)} onExit={() => setOv(null)} />}
      {ov?.t === "neg" && <Negotiation negId={ov.id} conv={Object.values(CONV_BY_ID).find((c) => c.negociacao === ov.id)!} onClose={() => setOv(null)} />}
      {ov?.t === "decisao" && <DecisionSheet decisionId={caso.decisao} onClose={() => setOv(null)} onConfirmed={onConfirmed} />}
      {ov?.t === "caneta" && (() => {
        const dec = DECISION_BY_ID[caso.decisao]!; const opt = dec.opcoes.find((o) => o.id === ov.opt)!;
        return <PenModal gesto={opt.gesto as PenGesture} papel={dec.papelAssinado as string} nome={s.player.nome} tom={opt.rotulo} onDone={() => setOv({ t: "resultado", antes: ov.antes, cons: s.consequences, depois: s })} />;
      })()}
      {ov?.t === "resultado" && <ConsequenceModal titulo="Decisão registrada" consequences={ov.cons} antes={ov.antes} depois={ov.depois} onClose={() => setOv(null)} rotulo="Fechar" />}
      {ov?.t === "novidades" && <ConsequenceModal titulo="O que mudou desde a última decisão" consequences={ov.cons} antes={ov.antes} depois={ov.depois} onClose={() => setOv(null)} />}
      {ov?.t === "panel" && ov.p === "dossie" && <DossierPanel onClose={() => setOv(null)} />}
      {ov?.t === "panel" && ov.p === "agenda" && <AgendaPanel onClose={() => setOv(null)} />}
      {ov?.t === "panel" && ov.p === "caderno" && <NotebookPanel onClose={() => setOv(null)} />}
      {ov?.t === "panel" && ov.p === "conta" && <LedgerPanel onClose={() => setOv(null)} />}
      {ov?.t === "panel" && ov.p === "dados" && <DataPanel onClose={() => setOv(null)} />}
      {ov?.t === "panel" && ov.p === "conquistas" && <AchievementsPanel onClose={() => setOv(null)} />}
      {ov?.t === "panel" && ov.p === "config" && <SettingsPanel onClose={() => setOv(null)} />}
      {ov?.t === "panel" && ov.p === "mapa" && <MapPanel onClose={() => setOv(null)} onGo={(l) => dispatch({ type: "go", location: l })} />}
      {ov?.t === "panel" && ov.p === "menu" && (
        <Modal title="Menu" onClose={() => setOv(null)}>
          <div className="grid gap-2">
            <button className="g-btn ghost" onClick={() => setOv({ t: "panel", p: "config" })}>⚙️ Configurações</button>
            <button className="g-btn ghost" onClick={() => setOv({ t: "panel", p: "conta" })}>💳 Contas (pessoal × pública)</button>
            <button className="g-btn ghost" onClick={() => setOv({ t: "panel", p: "dados" })}>📊 Ver os dados reais</button>
            <button className="g-btn ghost" onClick={onExit}>🏠 Salvar e sair para o menu</button>
            <button className="g-btn red" onClick={() => { if (window.confirm("Encerrar agora? Você verá um balanço parcial, sem troféu de campanha concluída, e os desvios já registrados permanecem.")) dispatch({ type: "abandon" }); }}>🚩 Encerrar com balanço parcial</button>
          </div>
        </Modal>
      )}
      {toast && <Toast msg={toast.msg} tone={toast.tone} />}
    </div>
  );
}
