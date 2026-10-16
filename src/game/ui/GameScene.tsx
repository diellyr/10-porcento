"use client";
import { useCallback, useMemo, useRef } from "react";
import { CHARACTERS } from "../content/characters";
import { CLUE_BY_ID } from "../content/clues";
import { CONV_BY_ID } from "../content/conversations";
import { LOCATIONS, type HotspotLayout } from "../content/locations";
import { worldView } from "../engine/scoring";
import type { CharId, Emotion, GameState } from "../engine/types";
import { LocationScene } from "./art/Scenes";

export interface ActiveHotspot { h: HotspotLayout; ref: string; rotulo: string; estado: "novo" | "visto" | "porta" | "mesa" | "pessoa" | "pessoa-feita" }

export function activeHotspots(s: GameState): ActiveHotspot[] {
  const out: ActiveHotspot[] = [];
  for (const h of LOCATIONS[s.location].hotspots) {
    const e = h.entradas.find((x) => x.casos.includes(s.caso));
    if (!e) continue;
    let estado: ActiveHotspot["estado"];
    if (h.kind === "porta") estado = "porta";
    else if (h.kind === "mesa") estado = "mesa";
    else if (h.kind === "pessoa") estado = s.talked[e.ref] ? "pessoa-feita" : "pessoa";
    else estado = s.clues[e.ref] ? "visto" : "novo";
    out.push({ h, ref: e.ref, rotulo: e.rotulo, estado });
  }
  return out;
}

export function presentPeople(s: GameState): Record<string, CharId> {
  const out: Record<string, CharId> = {};
  for (const a of activeHotspots(s)) if (a.h.kind === "pessoa") { const c = CONV_BY_ID[a.ref]; if (c) out[a.h.id] = c.who; }
  return out;
}

const ICON: Record<string, string> = { novo: "🔍", visto: "✓", porta: "➜", mesa: "🖋️", pessoa: "💬", "pessoa-feita": "✓" };

/** Cena 2D ilustrada com pontos interativos (toque/clique/teclado) e paralaxe por ponteiro. */
export function GameScene({ s, onPick, falando, emocoes, reduzir }: { s: GameState; onPick: (a: ActiveHotspot) => void; falando: CharId | null; emocoes?: Partial<Record<CharId, Emotion>>; reduzir: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const world = useMemo(() => worldView(s), [s]);
  const hs = useMemo(() => activeHotspots(s), [s]);
  const people = useMemo(() => presentPeople(s), [s]);
  const move = useCallback((e: React.PointerEvent) => {
    if (reduzir || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    wrap.current.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5) * 2));
    wrap.current.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5) * 2));
  }, [reduzir]);
  return (
    <div className="relative overflow-x-auto overflow-y-hidden rounded-[14px] [scrollbar-width:thin]" tabIndex={-1}>
      <div ref={wrap} onPointerMove={move} className="relative aspect-video min-w-[760px] w-full select-none" key={s.location}>
        <div className="g-pop absolute inset-0"><LocationScene location={s.location} world={world} caso={s.caso} pessoas={people} falando={falando} emocoes={emocoes} filaMin={s.pub.filaMin} /></div>
        {hs.map((a) => {
          const { h } = a;
          const isPerson = h.kind === "pessoa";
          const done = a.estado === "visto" || a.estado === "pessoa-feita";
          const bx = h.kind === "pessoa" ? h.x + h.w / 2 : h.x + h.w / 2;
          return (
            <button key={h.id} type="button" onClick={() => onPick(a)} data-hotspot={h.id} data-estado={a.estado}
              aria-label={`${a.rotulo}${done ? " (já visto)" : ""}`} title={a.rotulo}
              className="group absolute rounded-2xl border-0 bg-transparent p-0 outline-offset-4"
              style={{ left: `${(h.x / 1200) * 100}%`, top: `${(h.y / 675) * 100}%`, width: `${(h.w / 1200) * 100}%`, height: `${(h.h / 675) * 100}%` }}>
              <span className={`pointer-events-none absolute inset-0 rounded-2xl border-[3px] border-dashed transition-opacity ${done ? "opacity-0 group-hover:opacity-70" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`} style={{ borderColor: "#fff", boxShadow: "0 0 0 3px var(--g-blue), 0 0 24px 4px rgb(255 255 255 / .6)" }} />
              <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${((bx - h.x) / h.w) * 100}%`, top: isPerson ? "-4%" : h.kind === "porta" ? "46%" : "10%" }}>
                <span className={`relative grid size-11 place-items-center rounded-full border-[3px] border-white text-xl font-extrabold shadow-lg ${done ? "bg-[color:var(--g-green)] text-white" : a.estado === "porta" ? "bg-[color:var(--g-blue)] text-white" : a.estado === "mesa" ? "bg-[color:var(--g-yellow)]" : "bg-[color:var(--g-orange)] text-white"}`} style={{ animation: !done && !reduzir ? "g-float 2.4s ease-in-out infinite" : undefined }}>
                  <span aria-hidden>{ICON[a.estado] === "🔍" ? h.icone : ICON[a.estado]}</span>
                  {!done && a.estado !== "porta" && !reduzir && <span className="absolute inset-0 rounded-full border-2 border-[color:var(--g-orange)]" style={{ animation: "g-ring 1.8s infinite" }} />}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { CHARACTERS, CLUE_BY_ID };
