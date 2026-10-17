import { N3 } from "./n3";
import { N4 } from "./n4";
import { N5 } from "./n5";
import { N6 } from "./n6";
import { N7 } from "./n7";
import type { LevelContent } from "./tipos";

/** Conteúdo dos níveis 3 a 7, na ordem da carreira. */
export const NIVEIS: Record<number, LevelContent> = { 3: N3, 4: N4, 5: N5, 6: N6, 7: N7 };
export const NIVEIS_LISTA: LevelContent[] = [N3, N4, N5, N6, N7];

/** Onde cada local dos níveis 3–7 mora: spec, posição (slot) e nível. */
export const LOC_INFO: Record<string, { spec: import("./tipos").LocSpec; slot: number; nivel: number }> = (() => {
  const out: Record<string, { spec: import("./tipos").LocSpec; slot: number; nivel: number }> = {};
  for (const [n, c] of Object.entries(NIVEIS)) c.locais.forEach((spec, slot) => { out[spec.id] = { spec, slot, nivel: Number(n) }; });
  return out;
})();

/** Último nível com conteúdo publicado (os níveis 1 e 2 são sempre jogáveis). */
export const NIVEL_MAX = Math.max(2, ...Object.entries(NIVEIS).filter(([, c]) => c.casos.length > 0).map(([n]) => Number(n)));
