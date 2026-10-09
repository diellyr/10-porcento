"use client";
import { useEffect, useRef, useState } from "react";
import { CASE_BY_NUM, TOTAL_CASES } from "../content/cases";
import { brlShort } from "../engine/money";
import { powerScore, trambicagem, qualidadeAcesso } from "../engine/scoring";
import { txt, makeCtx } from "../engine/rules";
import type { GameState } from "../engine/types";
import { Meter } from "./atoms";

function useDelta(v: number) { const p = useRef(v); const [d, setD] = useState(0); useEffect(() => { if (p.current !== v) { setD(v - p.current); p.current = v; const t = setTimeout(() => setD(0), 4000); return () => clearTimeout(t); } }, [v]); return d; }

/** HUD integrado à aventura: missão atual, dois mundos (você × população) e recursos. */
export function Hud({ s, onOpenDados, onOpenConta }: { s: GameState; onOpenDados: () => void; onOpenConta: () => void }) {
  const caso = CASE_BY_NUM[Math.min(s.caso, TOTAL_CASES)]!;
  const ctx = makeCtx(s.scenario, s, s.player.nome);
  const dq = useDelta(s.pub.qualidade), da = useDelta(s.pub.acesso), dc = useDelta(s.attrs.confianca), df = useDelta(s.pub.filaMin), dx = useDelta(s.pub.estoqueDias);
  const poder = powerScore(s.attrs);
  const tr = trambicagem(s);
  return (
    <div className="grid gap-2 lg:grid-cols-[1.2fr_1fr_1.4fr]" aria-label="Painel da partida">
      <section className="g-card flex items-center gap-3 px-3 py-2.5" aria-label="Missão atual">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: "var(--g-yellow)" }} aria-hidden>📍</div>
        <div className="min-w-0">
          <p className="text-[0.72rem] font-extrabold uppercase tracking-wider text-[color:var(--g-orange-d)]">{caso.episodio} de {TOTAL_CASES} · {s.casoAberto ? "Missão atual" : "Decisão registrada"}</p>
          <p className="truncate text-base font-bold leading-tight" style={{ fontFamily: "var(--g-display)" }}>{caso.titulo}</p>
          <p className="text-[0.82rem] leading-snug text-[color:var(--g-ink2)]">{s.casoAberto ? txt(caso.objetivo, ctx) : "Veja as consequências e avance para o próximo caso."}</p>
        </div>
      </section>
      <section className="g-card px-3 py-2.5" aria-label="Você">
        <div className="mb-1.5 flex items-center justify-between gap-2"><h2 className="text-sm font-bold">🧑‍💼 Você · Administrador(a)</h2><button type="button" onClick={onOpenConta} className="g-chip si cursor-pointer" aria-label="Abrir minha conta fictícia">🎭 conta fictícia</button></div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <div><p className="text-[0.7rem] font-bold text-[color:var(--g-ink3)]">Patrimônio</p><p className="font-extrabold tabular-nums" style={{ fontFamily: "var(--g-display)" }}>{brlShort(s.personal.patrimonio)}</p></div>
          <div><p className="text-[0.7rem] font-bold text-[color:var(--g-ink3)]">Pontuação de Poder</p><p className="font-extrabold tabular-nums" style={{ fontFamily: "var(--g-display)" }}>{poder.toFixed(0)}</p></div>
          <Meter icon="🤝" label="Influência" value={s.personal.influencia} compact />
          <Meter icon="🔎" label="Evidências" value={Math.min(100, s.personal.evidencias * 8)} good="down" compact />
          {tr > 0 && <p className="col-span-2 text-[0.75rem] font-bold text-[color:var(--g-red-d)]">Índice de Trambicagem: {tr.toFixed(2).replace(".", ",")}% (teto 10%)</p>}
        </div>
      </section>
      <section className="g-card px-3 py-2.5" aria-label="População e serviços">
        <div className="mb-1.5 flex items-center justify-between gap-2"><h2 className="text-sm font-bold">🏥 {s.scenario.unidade.split(" (")[0]}</h2><button type="button" onClick={onOpenDados} className="g-chip of cursor-pointer">📊 Ver os dados reais</button></div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
          <Meter icon="💙" label="Confiança" value={s.attrs.confianca} delta={dc} compact />
          <Meter icon="🩺" label="Qualidade" value={s.pub.qualidade} delta={dq} compact />
          <Meter icon="🚪" label="Acesso" value={s.pub.acesso} delta={da} compact />
          <Meter icon="⏱️" label="Espera" value={s.pub.filaMin} max={150} unit=" min" good="down" delta={df} compact />
          <Meter icon="📦" label="Estoque" value={s.pub.estoqueDias} max={20} unit=" d" delta={dx} compact />
          <div><p className="text-[0.7rem] font-bold text-[color:var(--g-ink3)]">💰 Caixa público</p><p className={`font-extrabold tabular-nums ${s.pub.caixa < 0 ? "text-[color:var(--g-red-d)]" : ""}`} style={{ fontFamily: "var(--g-display)" }}>{brlShort(s.pub.caixa)}</p><p className="sr-only">Qualidade e acesso médios {qualidadeAcesso(s).toFixed(0)}</p></div>
        </div>
      </section>
    </div>
  );
}
