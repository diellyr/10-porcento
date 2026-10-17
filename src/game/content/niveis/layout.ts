import type { LocationId } from "../../engine/types";
import type { HotspotEntry, HotspotLayout, LocationLayout } from "../locations";
import { LEVELS } from "../levels";
import type { LocSpec, Tema } from "./tipos";

/** Posições das 5 salas de um nível: mapa 2D (viewBox 1000×620) e grade 3D. A primeira é o local inicial. */
export const SLOTS = [
  { mapa: { x: 380, y: 230, w: 240, h: 170 }, cx: 0, cz: -4.5, door: "S" as const },
  { mapa: { x: 60, y: 60, w: 260, h: 200 }, cx: -10, cz: -4.5, door: "S" as const },
  { mapa: { x: 680, y: 60, w: 260, h: 200 }, cx: 10, cz: -4.5, door: "S" as const },
  { mapa: { x: 60, y: 360, w: 260, h: 200 }, cx: -10, cz: 4.5, door: "N" as const },
  { mapa: { x: 680, y: 360, w: 260, h: 200 }, cx: 10, cz: 4.5, door: "N" as const },
];

/** Paleta de cada tema: cena 2D e sala 3D usam as mesmas cores. */
export const TEMAS: Record<Tema, { wall: [string, string]; wain: string; floor: [string, string]; trim: string; mapa: [string, string]; floor3: [string, string]; wall3: string }> = {
  gabinete: { wall: ["#f4f1e6", "#e6dfc8"], wain: "#9fb7a8", floor: ["#d6c7a4", "#b9a67c"], trim: "#17a493", mapa: ["#e6dfc8", "#b9a67c"], floor3: ["#d9cba8", "#cbbb94"], wall3: "#f4f0e2" },
  dados: { wall: ["#eaf1fb", "#d6e3f5"], wain: "#8fa9cf", floor: ["#c9d3e0", "#a5b3c7"], trim: "#2a5be0", mapa: ["#d6e3f5", "#8fa9cf"], floor3: ["#cfdbea", "#bccbe0"], wall3: "#e8f0fb" },
  plenario: { wall: ["#efe6f3", "#ddd0e8"], wain: "#6a4fa8", floor: ["#bfae9a", "#9c8a74"], trim: "#6a4fa8", mapa: ["#ddd0e8", "#8d72bf"], floor3: ["#c6b7a2", "#b6a68f"], wall3: "#eee4f2" },
  hospital: { wall: ["#e8f7ef", "#cfeedd"], wain: "#6fcfae", floor: ["#e0e8d6", "#c2cdb2"], trim: "#4fb596", mapa: ["#cfeedd", "#6fcfae"], floor3: ["#dbe8d4", "#cadcc0"], wall3: "#e6f6ee" },
  obra: { wall: ["#f3ead6", "#e6d6b0"], wain: "#d9822b", floor: ["#b8b2a4", "#9a9486"], trim: "#d9822b", mapa: ["#f0dfb8", "#d9822b"], floor3: ["#b9b4a6", "#a8a396"], wall3: "#efe6d2" },
  reuniao: { wall: ["#f9ecd6", "#eed3a6"], wain: "#8a5a2b", floor: ["#b0764a", "#7d4d2a"], trim: "#8a5528", mapa: ["#eed3a6", "#c98f55"], floor3: ["#b8825a", "#a8724a"], wall3: "#f6e6c8" },
};

const T = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const E = (casos: number[], ref: string, rotulo: string): HotspotEntry => ({ casos, ref, rotulo });
const spread = (n: number, lo: number, hi: number) => (n <= 1 ? [(lo + hi) / 2] : Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1)));

export const hotspotId = (loc: string, id: string) => `${loc}:${id}`;

/** Gera o LocationLayout 2D (viewBox 1200×675) de um local a partir da spec e da posição (slot) no nível. */
export function buildLocation(spec: LocSpec, slot: number, nivel: number, nomes: Record<string, string> = {}): LocationLayout {
  const L = LEVELS[nivel]!;
  const casos = T(L.primeiro, L.ultimo);
  const hs: HotspotLayout[] = [];
  const px = [[520], [320, 720], [200, 520, 840], [140, 400, 660, 920]][Math.max(0, Math.min(3, spec.pessoas.length - 1))]!;
  spec.pessoas.forEach((p, i) => hs.push({ id: hotspotId(spec.id, p.id), kind: "pessoa", x: px[i]!, y: 200, w: 170, h: 280, icone: "💬", entradas: p.falas.map(([c, conv, r]) => E([c], conv, r)) }));
  const parede = spec.itens.filter((x) => x.onde === "parede"), mesa = spec.itens.filter((x) => x.onde === "mesa");
  spread(parede.length, 160, 900).forEach((x, i) => hs.push({ id: hotspotId(spec.id, parede[i]!.id), kind: "pista", x: Math.round(x), y: 70, w: 200, h: 120, icone: parede[i]!.icone, entradas: parede[i]!.pistas.map(([c, id, r]) => E([c], id, r)) }));
  spread(mesa.length, 200, 820).forEach((x, i) => hs.push({ id: hotspotId(spec.id, mesa[i]!.id), kind: "pista", x: Math.round(x), y: 505, w: 160, h: 90, icone: mesa[i]!.icone, entradas: mesa[i]!.pistas.map(([c, id, r]) => E([c], id, r)) }));
  if (spec.mesa) hs.push({ id: hotspotId(spec.id, "mesa"), kind: "mesa", x: 430, y: 380, w: 340, h: 110, icone: "🖋️", entradas: [E(casos, "decisao", "Mesa: tomar a decisão")] });
  const left = spec.portas.filter((_, i) => i % 2 === 0), right = spec.portas.filter((_, i) => i % 2 === 1);
  const doors = (arr: LocationId[], x: number) => arr.forEach((to, i) => hs.push({ id: hotspotId(spec.id, `d-${to}`), kind: "porta", x, y: 200 + i * (arr.length > 1 ? 145 : 0), w: 100, h: arr.length > 1 ? 135 : 280, icone: "🚪", entradas: [E(casos, to, `Ir para: ${nomes[to] ?? to}`)] }));
  doors(left, 20); doors(right, 1080);
  return { id: spec.id, nome: spec.nome, curto: spec.curto, descricao: spec.descricao, mapa: SLOTS[slot]!.mapa, hotspots: hs };
}

/** Âncora 3D (coordenadas locais da sala) de cada ponto interativo gerado. */
export function buildAnchors(spec: LocSpec, slot: number): Record<string, [number, number, number]> {
  const out: Record<string, [number, number, number]> = {};
  const lx = (x2d: number) => ((x2d - 600) / 600) * 3.6;
  const px = [[520], [320, 720], [200, 520, 840], [140, 400, 660, 920]][Math.max(0, Math.min(3, spec.pessoas.length - 1))]!;
  spec.pessoas.forEach((p, i) => { out[hotspotId(spec.id, p.id)] = [lx(px[i]! + 85), 0, i % 2 ? 1.2 : 1.9]; });
  const parede = spec.itens.filter((x) => x.onde === "parede"), mesa = spec.itens.filter((x) => x.onde === "mesa");
  spread(parede.length, 160, 900).forEach((x, i) => { out[hotspotId(spec.id, parede[i]!.id)] = [lx(x + 100), 2.0, -3.2]; });
  spread(mesa.length, -1.4, 2.2).forEach((x, i) => { out[hotspotId(spec.id, mesa[i]!.id)] = [x, 1.4, -0.4]; });
  if (spec.mesa) out[hotspotId(spec.id, "mesa")] = [0.4, 1.4, -0.6];
  const z = SLOTS[slot]!.door === "S" ? 3.2 : -3.2;
  spread(spec.portas.length, -2.4, 2.4).forEach((x, i) => { out[hotspotId(spec.id, `d-${spec.portas[i]}`)] = [x, 1.9, z]; });
  return out;
}
