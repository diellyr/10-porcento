"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audio, type VoiceHandle } from "../audio/AudioManager";
import { CHARACTERS } from "../content/characters";
import { NEG_BY_ID } from "../content/conversations";
import type { ConvNode, ConversationDef } from "../content/types";
import { makeCtx, txt } from "../engine/rules";
import { nivelResposta, scoreArgument } from "../engine/negotiation";
import type { CharId, Emotion, GameState } from "../engine/types";
import { Portrait } from "./art/Portrait";
import { Modal } from "./atoms";
import { qualidadeFinal } from "./three/support";
import { useGame } from "./store";

const FaceScene = dynamic(() => import("./three/FaceScene"), { ssr: false });

/** Retrato da fala: busto 3D animado nas conversas importantes (quando o aparelho suporta); retrato 2D expressivo nas demais. */
export function Speaker({ who, emo, falando, tres, className = "" }: { who: CharId; emo: Emotion; falando: boolean; tres: boolean; className?: string }) {
  const { settings } = useGame();
  const [q, setQ] = useState<ReturnType<typeof qualidadeFinal> | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => { setQ(qualidadeFinal(settings.qualidade3d)); }, [settings.qualidade3d]);
  const c = CHARACTERS[who];
  const use3d = tres && q && q !== "2d" && !falhou;
  return (
    <div className={`relative ${className}`} data-modo={use3d ? "3d" : "2d"}>
      {use3d ? <FaceScene look={c.look} emocao={emo} falando={falando} qualidade={q as "alta" | "media" | "baixa"} reduzir={settings.reduzirMovimento} nivel={() => audio.level()} onFail={() => setFalhou(true)} nome={c.nome} />
        : <Portrait look={c.look} emocao={emo} falando={falando} title={`${c.nome}, ${emo}`} className="h-full w-full" />}
    </div>
  );
}

function useTypewriter(text: string, reduzir: boolean, key: string) {
  const [n, setN] = useState(reduzir ? text.length : 0);
  useEffect(() => {
    if (reduzir) { setN(text.length); return; }
    setN(0);
    const t = setInterval(() => setN((v) => { if (v >= text.length) { clearInterval(t); return v; } return v + 2; }), 22);
    return () => clearInterval(t);
  }, [text, reduzir, key]);
  return { shown: text.slice(0, n), done: n >= text.length, finish: () => setN(text.length) };
}

export function Dialogue({ conv, s, onFinish, onExit }: { conv: ConversationDef; s: GameState; onFinish: (choices: string[]) => void; onExit: () => void }) {
  const { settings } = useGame();
  const ctx = useMemo(() => makeCtx(s.scenario, s, s.player.nome), [s]);
  const [key, setKey] = useState(conv.start);
  const [picked, setPicked] = useState<string[]>([]);
  const [eco, setEco] = useState<string | null>(null);
  const [voz, setVoz] = useState<Pick<VoiceHandle, "fonte" | "provisoria"> | null>(null);
  const [falando, setFalando] = useState(false);
  const hRef = useRef<VoiceHandle | null>(null);
  const node: ConvNode = conv.nodes[key]!;
  const text = txt(node.text, ctx);
  const { shown, done, finish } = useTypewriter(text, settings.reduzirMovimento, `${conv.id}.${key}`);
  const char = CHARACTERS[node.who];

  const falar = useCallback(async () => {
    audio.unlock();
    const h = await audio.speak({ id: `${conv.id}.${key}`, texto: text, voz: char.voz, personagem: char.id });
    hRef.current = h; setVoz({ fonte: h.fonte, provisoria: h.provisoria }); setFalando(h.fonte !== "nenhuma");
    void h.done.then(() => { if (hRef.current === h) setFalando(false); });
  }, [conv.id, key, text, char]);
  useEffect(() => { void falar(); return () => { hRef.current?.stop(); audio.stopVoice(); }; }, [falar]);

  const avancar = (next?: string) => {
    audio.sfx("click"); hRef.current?.stop(); setFalando(false);
    if (next) { setKey(next); return; }
    onFinish(picked);
  };
  const choose = (id: string, label: string, next: string) => { audio.sfx("pick"); setPicked((p) => [...p, id]); setEco(label); setKey(next); };

  const tres = conv.apresentacao === "3d" && conv.who === node.who;
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-gradient-to-t from-[#1b2340]/70 via-[#1b2340]/20 to-transparent" role="dialog" aria-modal="true" aria-label={`Conversa: ${conv.titulo}`}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[6%] flex items-end justify-center sm:justify-start sm:pl-[6%]">
        <div className="g-slide h-[min(62dvh,520px)] w-[min(78vw,420px)]"><Speaker who={node.who} emo={node.emo} falando={falando} tres={tres} className="h-full w-full" /></div>
      </div>
      <div className="relative z-10 mx-auto w-full max-w-4xl p-2 sm:p-4">
        <div className="g-card g-pop relative p-4 sm:ml-[22%] sm:p-5" style={{ borderColor: char.cor }}>
          <div className="absolute -top-4 left-4 rounded-xl px-3 py-1 text-base font-extrabold text-white shadow" style={{ background: char.cor, fontFamily: "var(--g-display)" }}>{char.nome}</div>
          {eco && <p className="mb-2 mt-1 rounded-xl bg-[#eef2fe] px-3 py-1.5 text-sm font-semibold text-[color:var(--g-blue-d)]">Você: “{eco}”</p>}
          <p className="mt-2 min-h-[4.5rem] text-lg leading-relaxed" aria-live="polite" onClick={finish}>{shown}<span className="sr-only">{text.slice(shown.length)}</span></p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {node.choices?.length ? (
              <div className="flex w-full flex-col gap-2" role="group" aria-label="Escolha sua resposta">
                {node.choices.map((c) => <button key={c.id} type="button" disabled={!done} onClick={() => choose(c.id, c.label, c.next)} className="g-btn ghost text-left !justify-start !font-semibold">{c.label}</button>)}
              </div>
            ) : (
              <button type="button" className="g-btn orange" onClick={() => (done ? avancar(node.next) : finish())} autoFocus>{done ? (node.next ? "Continuar ▶" : "Encerrar conversa ✓") : "Mostrar tudo"}</button>
            )}
            <span className="ml-auto flex items-center gap-1.5">
              {voz?.provisoria && <span className="g-chip es" title="Voz natural em português ainda pendente: esta é a voz do navegador, provisória.">🔈 voz provisória do navegador</span>}
              {voz && voz.fonte === "nenhuma" && !settings.mudo && <span className="g-chip">sem voz · legenda</span>}
              <button type="button" className="g-btn ghost sm" onClick={() => void falar()} aria-label="Repetir a fala">🔁</button>
              <button type="button" className="g-btn ghost sm" onClick={onExit} aria-label="Sair da conversa sem concluir">Sair</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Negociação com o Guardião: texto livre; a pontuação vem SOMENTE do motor (rubrica visível). */
export function Negotiation({ negId, conv, onClose }: { negId: string; conv: ConversationDef; onClose: () => void }) {
  const { dispatch, state } = useGame();
  const neg = NEG_BY_ID[negId]!;
  const ctx = makeCtx(state!.scenario, state, state!.player.nome);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const feito = state!.negociacoes[negId];
  const nivel = feito ? nivelResposta(feito.pontos) : null;
  const preview = useMemo(() => scoreArgument(neg, texto), [neg, texto]);
  const enviar = () => { const r = dispatch({ type: "argue", negotiationId: negId, text: texto }); if (!r.ok) setErro(r.error ?? "Erro"); else { audio.sfx("confirm"); } };
  return (
    <Modal title="Convença o Guardião do Cofre" onClose={onClose} wide footer={feito ? <button className="g-btn orange" onClick={onClose}>Continuar</button> : <><button className="g-btn ghost" onClick={onClose}>Deixar para depois</button><button className="g-btn orange" onClick={enviar} disabled={texto.trim().length < 25}>Argumentar</button></>}>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="h-48 sm:h-60"><Speaker who={conv.who} emo={nivel === "forte" ? "feliz" : nivel === "fraca" ? "irritado" : "irônico"} falando={false} tres={false} className="h-full w-full" /></div>
        <div>
          <p className="text-[color:var(--g-ink2)]">{txt(neg.pedido, ctx)}</p>
          <h3 className="mt-3 text-sm font-extrabold uppercase tracking-wide text-[color:var(--g-ink3)]">Rubrica de avaliação (visível)</h3>
          <ul className="mt-1 grid gap-1.5 text-sm">{neg.criterios.map((c) => { const ok = feito ? feito.criterios.includes(c.id) : preview.ok.includes(c.id); return <li key={c.id} className="flex gap-2"><span aria-hidden className={ok ? "text-[color:var(--g-green-d)]" : "text-[color:var(--g-ink3)]"}>{ok ? "✔" : "○"}</span><span><b>{c.rotulo}.</b> <span className="text-[color:var(--g-ink3)]">{c.dica}</span></span></li>; })}</ul>
          {feito ? (
            <div className="mt-4 rounded-2xl border-2 border-[color:var(--g-line)] bg-[#fffaf0] p-3"><p className="text-sm font-bold">Guardião do Cofre:</p><p className="mt-1">“{txt(neg.respostas[nivel!], ctx)}”</p><p className="mt-2 text-sm text-[color:var(--g-ink3)]">Pontos da rubrica: {feito.pontos} de {neg.criterios.length}. Eles ajustam o tamanho da economia aprovada; a pontuação é calculada pelas regras do jogo — não por IA e não altera orçamento nem histórico.</p></div>
          ) : (
            <label className="mt-4 block text-sm font-bold">Seu argumento
              <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 700))} rows={5} className="mt-1 w-full rounded-2xl border-2 border-[color:var(--g-line)] bg-white p-3 text-base font-normal" placeholder="Escreva como convenceria o Guardião, usando o que você descobriu…" />
              <span className="text-xs font-normal text-[color:var(--g-ink3)]">{texto.length}/700 · mínimo 25 caracteres. Só uma tentativa por negociação.</span>
            </label>
          )}
          {erro && <p role="alert" className="mt-2 text-sm font-bold text-[color:var(--g-red-d)]">{erro}</p>}
        </div>
      </div>
    </Modal>
  );
}
