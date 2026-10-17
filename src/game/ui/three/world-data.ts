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
  // Nível 2 (Secretaria): as salas ocupam as mesmas posições da grade; cada nível só constrói as suas.
  planejamento: { id: "planejamento", cx: -10, cz: -4.5, w: ROOM_W, d: ROOM_D, floor: "#cfdbea", floor2: "#bccbe0", wall: "#e8f0fb", trim: "#2a5be0", door: "S" },
  secretaria: { id: "secretaria", cx: 0, cz: -4.5, w: ROOM_W, d: ROOM_D, floor: "#d9cba8", floor2: "#cbbb94", wall: "#f4f0e2", trim: "#17a493", door: "S" },
  prefeitura: { id: "prefeitura", cx: 10, cz: -4.5, w: ROOM_W, d: ROOM_D, floor: "#b8825a", floor2: "#a8724a", wall: "#f6e6c8", trim: "#8a5528", door: "S" },
  ubs: { id: "ubs", cx: -10, cz: 4.5, w: ROOM_W, d: ROOM_D, floor: "#dbe8d4", floor2: "#cadcc0", wall: "#e6f6ee", trim: "#4fb596", door: "N" },
  camara: { id: "camara", cx: 10, cz: 4.5, w: ROOM_W, d: ROOM_D, floor: "#c6b7a2", floor2: "#b6a68f", wall: "#eee4f2", trim: "#6a4fa8", door: "N" },
};
/** Salas construídas em cada nível da carreira. */
export const ROOMS_POR_NIVEL: Record<number, LocationId[]> = {
  1: ["farmacia", "enfermagem", "administracao", "recepcao", "patio", "cofre"],
  2: ["planejamento", "secretaria", "prefeitura", "ubs", "camara"],
};
export const roomsDoNivel = (nivel: number): RoomDef[] => (ROOMS_POR_NIVEL[nivel] ?? ROOMS_POR_NIVEL[1]!).map((id) => ROOMS[id]);
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
  // nível 2 — secretaria
  "n2-mesa": [0.4, 1.4, -0.6], "n2-marlene": [-3.0, 0, 1.2], "n2-valdemar": [3.4, 0, 1.4], "n2-roberto": [-1.4, 0, 2.0], "n2-pc": [2.2, 1.5, -2.6], "n2-pasta": [1.6, 1.3, -0.4], "n2-recado": [-2.2, 2.0, -3.2],
  "n2-d-plan": [-2.4, 1.9, 3.2], "n2-d-pref": [-0.8, 1.9, 3.2], "n2-d-cam": [0.8, 1.9, 3.2], "n2-d-ubs": [2.4, 1.9, 3.2],
  // planejamento
  "n2-rita": [1.8, 0, 0.4], "n2-painel-mapa": [-2.0, 2.0, -3.2], "n2-painel-fila": [0.8, 2.0, -3.2], "n2-mesa-dados": [0.2, 1.3, -0.2], "n2-quadro-metas": [3.0, 2.0, -3.2], "n2-d-sec-p": [-1.2, 1.9, 3.2], "n2-d-ubs-p": [1.2, 1.9, 3.2],
  // prefeitura
  "n2-lucia": [0.6, 0, -1.6], "n2-guardiao": [-3.0, 0, 1.2], "n2-mesa-pref": [0.4, 1.3, -0.6], "n2-d-sec-r": [-1.2, 1.9, 3.2], "n2-d-cam-r": [1.2, 1.9, 3.2],
  // câmara
  "n2-nelson": [-3.2, 0, 1.0], "n2-cornelio": [3.2, 0, 1.0], "n2-celia": [-1.2, 0, 2.0], "n2-bento": [1.4, 0, 2.0], "n2-mesa-cam": [0, 1.3, 0.2], "n2-d-pref-c": [-1.2, 1.9, -3.2], "n2-d-sec-c": [1.2, 1.9, -3.2],
  // UBS
  "n2-edu": [1.8, 0, 0.4], "n2-balcao": [-0.6, 1.4, -1.4], "n2-d-sec-u": [-1.2, 1.9, -3.2], "n2-d-plan-u": [1.2, 1.9, -3.2],
  obra: [2.4, 1.6, -0.6], placa: [-0.6, 1.6, 0.6], cornelio: [-1.4, 0, 1.0], "p-rec3": [0, 1.9, -3.2],
};
