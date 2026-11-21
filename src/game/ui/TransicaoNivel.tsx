"use client";
import { useEffect } from "react";
import { audio } from "../audio/AudioManager";
import { LEVELS } from "../content/levels";

/**
 * Passagem cinematográfica ao assumir um novo cargo: cortina grafite, faixa de luz dourada,
 * número do nível e o cargo. Só ilustra a promoção já registrada pelo motor.
 * Com "reduzir movimento" vira um cartão estático. Toque, clique ou Esc pulam.
 */
export function TransicaoNivel({ nivel, viaRede, reduzir, onFim }: { nivel: number; viaRede: boolean; reduzir: boolean; onFim: () => void }) {
  const L = LEVELS[nivel];
  useEffect(() => {
    audio.sfx("level");
    const t = setTimeout(onFim, reduzir ? 2200 : 3600);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") onFim(); };
    window.addEventListener("keydown", esc);
    return () => { clearTimeout(t); window.removeEventListener("keydown", esc); };
  }, [onFim, reduzir]);
  if (!L) return null;
  return (
    <div className={`mx-transicao ${reduzir ? "estatica" : ""}`} role="dialog" aria-modal="true" aria-label={`Nível ${nivel}: ${L.cargo}`} onClick={onFim}>
      <div className="mx-transicao-luz" aria-hidden />
      <div className="mx-transicao-corpo">
        <p className="mx-transicao-sobre">{viaRede ? "🕸️ Subindo pelas conexões" : "⭐ Promoção por mérito"}</p>
        <p className="mx-transicao-nivel"><span>NÍVEL</span> {nivel}</p>
        <h2 className="mx-transicao-cargo">{L.cargo}</h2>
        {L.desafio && <p className="mx-transicao-desafio">{L.desafio}</p>}
        <button type="button" className="mx-transicao-pular" onClick={(e) => { e.stopPropagation(); onFim(); }}>Começar ▶</button>
      </div>
    </div>
  );
}
