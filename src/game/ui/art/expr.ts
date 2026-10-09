import type { Emotion } from "@/game/engine/types";

/** Parâmetros de expressão: mesmos conceitos usados no rosto 3D (sobrancelha, abertura do olho, boca). */
export interface Expr { brow: number; browInner: number; eye: number; smile: number; open: number; smirk: number; blush: number }
export const EXPR: Record<Emotion, Expr> = {
  neutro: { brow: 0, browInner: 0, eye: 1, smile: 0.15, open: 0, smirk: 0, blush: 0 },
  feliz: { brow: -1, browInner: 0, eye: 0.82, smile: 1, open: 0.35, smirk: 0, blush: 0.5 },
  serio: { brow: 1, browInner: 1.5, eye: 0.95, smile: -0.1, open: 0, smirk: 0, blush: 0 },
  irritado: { brow: 2.5, browInner: 4, eye: 0.85, smile: -0.7, open: 0.08, smirk: 0, blush: 0.35 },
  surpreso: { brow: -4, browInner: -1, eye: 1.25, smile: 0, open: 0.8, smirk: 0, blush: 0 },
  triste: { brow: -1, browInner: -3.5, eye: 0.9, smile: -0.75, open: 0, smirk: 0, blush: 0 },
  irônico: { brow: -2, browInner: 1, eye: 0.88, smile: 0.35, open: 0, smirk: 1, blush: 0 },
  preocupado: { brow: -2, browInner: -3, eye: 1, smile: -0.35, open: 0.05, smirk: 0, blush: 0 },
};

