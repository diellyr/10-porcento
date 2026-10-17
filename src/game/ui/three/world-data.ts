import type { LocationId } from "../../engine/types";

/** Planta 3D da UPA (unidade ≈ 1 m). Fileira de cima: farmácia · enfermagem · gabinete. Corredor no meio. Fileira de baixo: recepção · pátio · cofre. */
export interface RoomDef { id: LocationId; cx: number; cz: number; w: number; d: number; floor: string; floor2: string; wall: string; trim: string; door: "N" | "S"; outdoor?: boolean }
export const ROOM_W = 9.6, ROOM_D = 7, WALL_H = 2.9, WALL_T = 0.28;

export const ROOMS: Record<LocationId, RoomDef> = {
  farmacia: { id: "farmacia", cx: -10, cz: -4.5, w: ROOM_W, d: ROOM_D, floor: "#cfe8dc", floor2: "#bddccd", wall: "#e8f6ef", trim: "#4fb596", door: "S" },
  enfermagem: { id: "enfermagem", cx: 0, cz: -4.5, w: ROOM_W, d: ROOM_D, floor: "#cfdff2", floor2: "#bed2ea", wall: "#e6eefa", trim: "#5b8fd0", door: "S" },
  administracao: { id: "administracao", cx: 10, cz: -4.5, w: ROOM_W, d: ROOM_D, floor: "#c98e5a", floor2: "#b87d4a", wall: "#f3dcc0", trim: "#8a5528", door: "S" },
  recepcao: { id: "recepcao", cx: -10, cz: 4.5, w: ROOM_W, d: ROOM_D, floor: "#ecd5a4", floor2: "#e0c58f", wall: "#fff0d2", trim: "#e7a23a", door: "N" },
  patio: { id: "patio", cx: 0, cz: 4.5, w: ROOM_W, d: ROOM_D, floor: "#9aa3a8", floor2: "#8c959a", wall: "#d9dfe2", trim: "#f2b134", door: "N", outdoor: true },
  cofre: { id: "cofre", cx: 10, cz: 4.5, w: ROOM_W, d: ROOM_D, floor: "#b9c8bf", floor2: "#a9baaf", wall: "#dfe9e3", trim: "#4b6d5c", door: "N" },
};
export const ROOM_LIST = Object.values(ROOMS);

/** Âncora 3D (coordenadas locais da sala: x, y, z) de cada ponto interativo; a posição de quem está presente vem daqui (y = 0 para pessoas). */
export const ANCHORS: Record<string, [number, number, number]> = {
  // recepção
  "p-patio": [-0.9, 1.5, -3.2], "p-enfermagem": [0.9, 1.5, -3.2], celia: [-2.6, 0, 0.2], "pc-balcao": [1.6, 1.5, -1.3], quadro: [-2.4, 2.1, -3.2],
  // farmácia
  estante: [-3.3, 1.3, -2.2], "pc-consumo": [0.2, 1.5, 0.8], mural: [1.8, 2.0, -3.2], caixas: [3.6, 0.9, 1.6], "mesa-conf": [2.6, 1.3, -0.4], roberto: [1.2, 0, 1.9],
  "p-enf2": [-1.2, 1.9, 3.2], "p-adm2": [1.2, 1.9, 3.2],
  // enfermagem
  joana: [1.8, 0, 0.4], escala: [-2.0, 2.0, -3.2], monitor: [-3.4, 1.5, 1.0], leitos: [-3.6, 1.2, -1.8], "p-rec2": [-1.2, 1.9, 3.2], "p-far2": [1.2, 1.9, 3.2],
  // gabinete
  mesa: [0.4, 1.4, -0.6], toninho: [-3.2, 0, 1.2], juninho: [3.4, 0, 1.4], ana: [2.6, 0, -2.4], "roberto-adm": [-1.2, 0, 2.4], recado: [-2.2, 2.0, -3.2],
  memo: [1.2, 2.0, -3.2], "pc-adm": [-0.6, 1.5, -0.4], pasta: [1.6, 1.3, -0.4], "p-far3": [-1.2, 1.9, 3.2], "p-cofre": [1.2, 1.9, 3.2],
  // cofre
  guardiao: [0.2, 0, -0.9], livro: [-2.2, 1.4, 1.0], "cofre-porta": [3.2, 1.6, -2.9], "mesa-cofre": [0.4, 1.4, 0.4], bento: [-3.2, 0, 1.2], "p-adm4": [0, 1.9, -3.2],
  // pátio
  obra: [2.4, 1.6, -0.6], placa: [-0.6, 1.6, 0.6], cornelio: [-1.4, 0, 1.0], "p-rec3": [0, 1.9, -3.2],
};
