import { CODE_BY_UF } from "@/server/core/geo";

/**
 * Mapa em grade (cartograma de blocos): cada estado ocupa o mesmo espaço, em posição aproximada à geográfica.
 * É um mapa de NAVEGAÇÃO — não codifica área nem população (evita distorção visual de estados grandes/pequenos).
 */
export const STATE_TILES: Record<string, { col: number; row: number }> = {
  RR: { col: 2, row: 0 }, AP: { col: 3, row: 0 },
  AM: { col: 1, row: 1 }, PA: { col: 2, row: 1 }, MA: { col: 4, row: 1 }, CE: { col: 5, row: 1 }, RN: { col: 6, row: 1 },
  AC: { col: 0, row: 2 }, RO: { col: 1, row: 2 }, MT: { col: 2, row: 2 }, TO: { col: 3, row: 2 }, PI: { col: 4, row: 2 }, PE: { col: 5, row: 2 }, PB: { col: 6, row: 2 },
  GO: { col: 2, row: 3 }, DF: { col: 3, row: 3 }, BA: { col: 4, row: 3 }, AL: { col: 5, row: 3 },
  MS: { col: 2, row: 4 }, MG: { col: 3, row: 4 }, SE: { col: 4, row: 4 },
  SP: { col: 3, row: 5 }, ES: { col: 4, row: 5 },
  PR: { col: 2, row: 6 }, RJ: { col: 3, row: 6 },
  SC: { col: 2, row: 7 },
  RS: { col: 2, row: 8 },
};

export const MAP_COLS = 7;
export const MAP_ROWS = 9;
export const tileCode = (uf: string) => CODE_BY_UF[uf];
