"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { audio } from "../audio/AudioManager";
import { DECISION_BY_ID } from "../content/cases";
import { levelOf } from "../content/levels";
import type { OptionDef } from "../content/types";
import { brl, brlShort } from "../engine/money";
import { makeCtx, optionCost, optionLock, txt } from "../engine/rules";
import { MAX_DEVIATION_PCT, type Consequence, type GameState, type PenGesture } from "../engine/types";
import { Modal } from "./atoms";
import { useGame } from "./store";
import { qualidadeFinal } from "./three/support";
import { PenFallback } from "./PenFallback";

const PenScene = dynamic(() => import("./three/PenScene"), { ssr: false });

const known = (s: GameState, k?: string) => !k || !!s.clues[k] || !!s.findings[k];

export function DecisionSheet({ decisionId, onClose, onConfirmed }: { decisionId: string; onClose: () => void; onConfirmed: (optionId: string, antes: GameState) => void }) {
  const { state: st, dispatch } = useGame();
  const s = st!;
  const dec = DECISION_BY_ID[decisionId]!;
  const ctx = makeCtx(s.scenario, s, s.player.nome);
  const [sel, setSel] = useState<OptionDef | null>(null);
  const [pct, setPct] = useState(5);
  const [ciente, setCiente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const base = (dec.basePct / 100) * s.scenario.orcamentoAnual;
  const desvio = sel?.desvio;
  const valor = Math.round(base * pct) / 100;
  const nUnknown = (o: OptionDef) => o.previsao.riscos.filter((r) => !known(s, r.precisa)).length;

  const confirmar = () => {
    if (!sel) return;
    const antes = structuredClone(s);
    const r = dispatch({ type: "decide", decisionId, optionId: sel.id, ...(desvio ? { deviationPct: pct, confirmDeviation: ciente } : {}) });
    if (!r.ok) { setErro(r.error ?? "Não foi possível registrar."); audio.sfx("error"); return; }
    onConfirmed(sel.id, antes);
  };

  if (sel) {
    const custo = optionCost(s, sel);
    const semCaixa = custo > s.pub.caixa;
    return (
      <Modal title="Revise antes de confirmar" onClose={() => { setSel(null); setErro(null); }} wide
        footer={<><button className="g-btn ghost" onClick={() => { setSel(null); setErro(null); }}>← Voltar às opções</button><button className={`g-btn ${desvio ? "red" : "orange"} xl`} onClick={confirmar} disabled={!!desvio && !ciente}>{desvio ? "Confirmar desvio fictício" : "Confirmar decisão"}</button></>}>
        <h3 className="text-xl font-bold">{sel.rotulo}</h3>
        <p className="mt-1">{txt(sel.resumo, ctx)}</p>
        <PrevisaoBlock s={s} o={sel} />
        {semCaixa && <p role="alert" className="mt-3 rounded-2xl bg-[#fff3d6] p-3 text-sm font-bold">⚠ O caixa atual ({brlShort(s.pub.caixa)}) não cobre {brlShort(custo)}. A diferença vira obrigação para o próximo ciclo (restos a pagar) e reduz a sustentabilidade fiscal.</p>}
        {desvio && (
          <div className="mt-4 rounded-2xl border-[3px] border-[color:var(--g-red)] bg-[#fff1f1] p-4" role="group" aria-label="Confirmação de ato de desvio fictício">
            <p className="text-lg font-extrabold text-[color:var(--g-red-d)]">⚠ Ato de desvio (fictício)</p>
            <p className="mt-1 text-sm">{txt(desvio.explicacao, ctx)} O percentual é de no máximo <b>{MAX_DEVIATION_PCT}%</b> da base elegível <i>deste evento</i> ({brl(base)}). Fica registrado para sempre no histórico, no relatório e no final.</p>
            <label className="mt-3 block text-sm font-bold">Percentual desviado: {String(pct).replace(".", ",")}% → ganho ilícito fictício de {brl(valor)}
              <input type="range" min={0.5} max={MAX_DEVIATION_PCT} step={0.5} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="mt-1 w-full accent-[color:var(--g-red)]" />
            </label>
            <label className="mt-3 flex items-start gap-3 text-sm font-bold"><input type="checkbox" checked={ciente} onChange={(e) => setCiente(e.target.checked)} className="mt-0.5 size-6 accent-[color:var(--g-red)]" />Entendo que isto é um desvio deliberado, fictício, e que ele terá consequências nos serviços, nas relações e no encerramento da campanha.</label>
          </div>
        )}
        {erro && <p role="alert" className="mt-3 font-bold text-[color:var(--g-red-d)]">{erro}</p>}
        <p className="mt-3 text-xs text-[color:var(--g-ink3)]">Nada é registrado até você tocar em “Confirmar”. Fechar, voltar ou passar o cursor não grava nenhuma decisão.</p>
      </Modal>
    );
  }

  return (
    <Modal title={dec.titulo} onClose={onClose} wide>
      <p className="text-lg">{txt(dec.pergunta, ctx)}</p>
      <p className="mt-1 text-sm text-[color:var(--g-ink3)]">Cada alternativa mostra custo, prazo e riscos previsíveis. O que você ainda não investigou aparece como incerteza. Alternativas plausíveis, interesses em conflito: nenhuma é “o botão verde”.</p>
      <ul className="mt-4 grid gap-3">
        {dec.opcoes.map((o) => {
          const lock = optionLock(s, o);
          const n = nUnknown(o);
          return (
            <li key={o.id}>
              <button type="button" disabled={!!lock} onClick={() => { audio.sfx("pick"); setSel(o); setPct(5); setCiente(false); }} data-opcao={o.id} aria-disabled={!!lock}
                className="g-card w-full p-3 text-left transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-60" style={o.desvio ? { borderColor: "var(--g-red)" } : undefined}>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold" style={{ fontFamily: "var(--g-display)" }}>{o.rotulo}</span>
                  {o.desvio && <span className="g-chip" style={{ background: "#fff1f1", borderColor: "#f3b3b3", color: "#a52a2f" }}>⚠ ato de desvio fictício</span>}
                  {lock && <span className="g-chip">🔒 bloqueada</span>}
                </span>
                <span className="mt-1 block text-sm">{txt(o.resumo, ctx)}</span>
                {lock ? <span className="mt-2 block rounded-xl bg-[#eef2fe] p-2 text-sm font-semibold">💡 {lock}</span> : (
                  <span className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
                    <span><b>Custo:</b> {txt(o.previsao.custo, ctx)}</span><span><b>Prazo:</b> {o.previsao.prazo}</span>
                    <span>{n > 0 ? <b className="text-[color:var(--g-orange-d)]">❔ {n} risco(s) por investigar</b> : <b className="text-[color:var(--g-green-d)]">Riscos conhecidos</b>}</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

function PrevisaoBlock({ s, o }: { s: GameState; o: OptionDef }) {
  const ctx = makeCtx(s.scenario, s, s.player.nome);
  const riscos = o.previsao.riscos;
  const visiveis = riscos.filter((r) => known(s, r.precisa));
  const ocultos = riscos.length - visiveis.length;
  return (
    <dl className="mt-3 grid gap-2 rounded-2xl bg-[#fffaf0] p-3 text-sm sm:grid-cols-2">
      <div><dt className="font-extrabold">Custo</dt><dd>{txt(o.previsao.custo, ctx)}</dd></div>
      <div><dt className="font-extrabold">Prazo</dt><dd>{o.previsao.prazo}</dd></div>
      {o.previsao.ganho && <div className="sm:col-span-2"><dt className="font-extrabold">Ganho esperado</dt><dd>{txt(o.previsao.ganho, ctx)}</dd></div>}
      <div className="sm:col-span-2"><dt className="font-extrabold">Riscos previsíveis</dt>
        <dd><ul className="list-disc pl-5">{visiveis.map((r, i) => <li key={i}>{txt(r.texto, ctx)}</li>)}{ocultos > 0 && <li className="font-bold text-[color:var(--g-orange-d)]">❔ Há {ocultos} risco(s) que você ainda não investigou. Decidir assim é decidir com incerteza.</li>}</ul></dd></div>
    </dl>
  );
}

/** Cena da caneta: 3D (braço, mão e caneta reais) quando o aparelho suporta; 2D equivalente caso contrário. A animação só ilustra a decisão JÁ confirmada. */
export function PenModal({ gesto, papel, nome, tom, onDone }: { gesto: PenGesture; papel: string; nome: string; tom: string; onDone: () => void }) {
  const { settings, state } = useGame();
  const [q, setQ] = useState<ReturnType<typeof qualidadeFinal> | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [fim, setFim] = useState(false);
  useEffect(() => { setQ(qualidadeFinal(settings.qualidade3d)); }, [settings.qualidade3d]);
  const pele = useMemo(() => state?.player.avatar ?? "av1", [state?.player.avatar]);
  const legenda = { assinar: "Você assina o documento.", recusar: "Você recusa a proposta.", esclarecer: "Você pede esclarecimentos por escrito.", parecer: "Você emite o parecer." }[gesto];
  const done = () => { setFim(true); };
  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-[#1b2340]" role="dialog" aria-modal="true" aria-label="Cena da caneta">
      <div className="relative min-h-0 flex-1">
        {q && q !== "2d" && !falhou ? <PenScene gesto={gesto} papel={papel} nome={nome} avatar={pele} qualidade={q as "alta" | "media" | "baixa"} reduzir={settings.reduzirMovimento} onDone={done} onFail={() => setFalhou(true)} onSfx={(n) => audio.sfx(n)} />
          : q ? <PenFallback gesto={gesto} papel={papel} nome={nome} reduzir={settings.reduzirMovimento} onDone={done} /> : null}
        <p className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit max-w-[92vw] rounded-2xl bg-white/90 px-4 py-2 text-center font-bold text-[color:var(--g-ink)] shadow-lg" style={{ fontFamily: "var(--g-display)" }} role="status">{legenda}</p>
        {q === "2d" && <p className="pointer-events-none absolute left-3 top-14 rounded-xl bg-white/85 px-2 py-1 text-xs font-bold">versão 2D equivalente</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 bg-[#fff8ec] p-3">
        <span className="text-sm font-bold text-[color:var(--g-ink2)]">{tom}</span>
        <button type="button" className="g-btn orange" onClick={onDone} autoFocus>{fim ? "Ver consequências ▶" : "Pular animação ⏭"}</button>
      </div>
    </div>
  );
}

const TOM = { bom: ["✅", "var(--g-green)"], ruim: ["⚠️", "var(--g-red)"], neutro: ["ℹ️", "var(--g-blue)"] } as const;

export function diffChips(a: GameState, b: GameState) {
  const rows: Array<[string, number, string, "up" | "down"]> = [
    ["Qualidade", b.pub.qualidade - a.pub.qualidade, "", "up"], ["Acesso", b.pub.acesso - a.pub.acesso, "", "up"], ["Confiança", b.attrs.confianca - a.attrs.confianca, "", "up"],
    ["Equipe", b.pub.equipe - a.pub.equipe, "", "up"], ["Espera", b.pub.filaMin - a.pub.filaMin, levelOf(b).rotulos.fila.un, "down"], ["Estoque", b.pub.estoqueDias - a.pub.estoqueDias, " d", "up"],
    ["Sustentabilidade", b.pub.sustentabilidade - a.pub.sustentabilidade, "", "up"], ["Popularidade", b.attrs.popularidade - a.attrs.popularidade, "", "up"], ["Competência", b.attrs.competencia - a.attrs.competencia, "", "up"],
  ];
  return rows.filter((r) => Math.round(r[1]) !== 0);
}

export function ConsequenceModal({ titulo, consequences, antes, depois, onClose, rotulo = "Continuar" }: { titulo: string; consequences: Consequence[]; antes?: GameState; depois: GameState; onClose: () => void; rotulo?: string }) {
  const chips = antes ? diffChips(antes, depois) : [];
  const caixa = antes ? depois.pub.caixa - antes.pub.caixa : 0;
  const pat = antes ? depois.personal.patrimonio - antes.personal.patrimonio : 0;
  useEffect(() => { audio.sfx(consequences.some((c) => c.tom === "ruim") ? "alert" : "success"); }, [consequences]);
  return (
    <Modal title={titulo} wide dismissible={false} footer={<button className="g-btn orange xl" onClick={onClose} autoFocus>{rotulo} ▶</button>}>
      <ul className="grid gap-3">
        {consequences.map((c) => (
          <li key={c.id} className="g-card g-pop p-3" style={{ borderColor: TOM[c.tom][1] }}>
            <p className="flex items-center gap-2 text-lg font-bold"><span aria-hidden>{TOM[c.tom][0]}</span>{c.title}{c.delayed && <span className="g-chip">consequência posterior</span>}</p>
            <p className="mt-1">{c.message}</p>
            <p className="mt-1 text-sm text-[color:var(--g-ink3)]"><b>Por quê?</b> {c.reason}</p>
          </li>
        ))}
      </ul>
      {(chips.length > 0 || caixa !== 0 || pat !== 0) && (
        <div className="mt-4"><h3 className="text-sm font-extrabold uppercase tracking-wide text-[color:var(--g-ink3)]">O que mudou</h3>
          <p className="mt-1 flex flex-wrap gap-1.5">{chips.map(([n, v, u, g]) => { const bom = (v > 0) === (g === "up"); return <span key={n} className="g-chip" style={{ background: bom ? "#e6f6ee" : "#fdeaea", borderColor: bom ? "#a8dcc0" : "#f3b3b3", color: bom ? "#1d7447" : "#a52a2f" }}>{v > 0 ? "▲" : "▼"} {n} {v > 0 ? "+" : "−"}{Math.abs(Math.round(v))}{u}</span>; })}
            {caixa !== 0 && <span className="g-chip">💰 Caixa público {caixa > 0 ? "+" : "−"}{brlShort(Math.abs(caixa))}</span>}
            {pat !== 0 && <span className="g-chip si">🎭 Conta pessoal fictícia {pat > 0 ? "+" : "−"}{brlShort(Math.abs(pat))}</span>}</p></div>
      )}
    </Modal>
  );
}
