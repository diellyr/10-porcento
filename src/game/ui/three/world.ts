import * as THREE from "three";
import type { Look } from "../../content/types";
import type { LocationId } from "../../engine/types";
import { darken, lighten } from "../art/color";
import { bakeGroup, ambulance, ball, blob, board, box, boxPile, cabinet, chair, cone3, cyl, desk, extraLook, mat, monitor, papers, person, plant, safe, shelf, sign, sofa, tree, bed } from "./lowpoly";
import { ANCHORS, ROOM_D, ROOM_W, ROOMS, WALL_H, WALL_T, roomsDoNivel, type RoomDef } from "./world-data";
import type { Quality } from "./support";
import { LOC_INFO } from "../../content/niveis";
import type { Tema } from "../../content/niveis/tipos";

/** Cenário 3D da UPA em corte (casa de bonecas): salas com paredes que baixam quando ficam entre a câmera e o interior. */
export interface WorldDyn { filaNivel: number; estoqueNivel: number; melhoria: number; luxo: number; degradacao: number; filaMin: number; people: Array<{ room: LocationId; hotspotId: string; look: Look; label: string }> }
interface Wall { g: THREE.Group; nx: number; nz: number; roomId: LocationId; low: boolean; k: number }
export interface World {
  root: THREE.Group;
  center: (id: LocationId) => THREE.Vector3;
  anchor: (room: LocationId, hotspotId: string) => THREE.Vector3;
  setDynamic: (d: WorldDyn) => void;
  updateWalls: (cam: THREE.Vector3, dt: number) => void;
  /** vida: respiração e balanço de todos; quem está falando (hotspot) se mexe conforme o nível da voz */
  animate: (t: number, speaking: string | null, level: number) => void;
  drawCalls: () => number;
  dispose: () => void;
}

function floorTexture(c1: string, c2: string, tiles: number, rep: [number, number]) {
  const n = 64 * tiles, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d")!;
  for (let y = 0; y < tiles; y++) for (let x = 0; x < tiles; x++) { g.fillStyle = (x + y) % 2 ? c1 : c2; g.fillRect(x * 64, y * 64, 64, 64); }
  g.strokeStyle = "rgba(0,0,0,.07)"; g.lineWidth = 2; for (let i = 0; i <= tiles; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, n); g.moveTo(0, i * 64); g.lineTo(n, i * 64); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function buildWorld(q: Quality, nivel = 1): World {
  const ROOM_LIST = roomsDoNivel(nivel);
  const root = new THREE.Group();
  const roomG: Record<string, THREE.Group> = {};
  const dynG = new THREE.Group(); root.add(dynG);
  const walls: Wall[] = [];

  // chão do terreno, calçada e rua
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 46), mat("#cfe3b4")); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.27; ground.receiveShadow = true; root.add(ground);
  box(root, 33, 0.12, 20.6, "#e8e0d0", 0, -0.25, 0);
  box(root, 70, 0.08, 6, "#8f969b", 0, -0.27, 14.2); for (let i = -3; i <= 3; i++) box(root, 2.2, 0.01, 0.18, "#f1f1f1", i * 9, -0.19, 14.2);
  // corredor central
  const cf = new THREE.Mesh(new THREE.BoxGeometry(31.4, 0.2, 2.1), new THREE.MeshStandardMaterial({ map: floorTexture("#f4ecda", "#e8dec7", 4, [16, 1]), roughness: 0.7, flatShading: true })); cf.position.set(0, -0.1, 0); cf.receiveShadow = true; root.add(cf);
  for (const x of [-13.5, -5, 4, 13.5]) { box(root, 1.6, 0.12, 0.45, "#7a4b32", x, 0.28, -0.15); box(root, 1.6, 0.34, 0.1, "#7a4b32", x, 0.4, -0.38); }
  for (const x of [-7.5, 7.5]) plant(root, x, 0, 0.9);
  // jardim e árvores ao redor
  for (const [x, z, s] of [[-17.5, -9, 1.1], [17.8, -9.4, 1.2], [-17, 9, 1], [18, 9.2, 1.1], [-5, -9.6, 0.9], [5.5, -9.6, 1], [-15, 12.6, 0.9], [14, 12.8, 1]] as Array<[number, number, number]>) tree(root, x, z, s);

  const mkWall = (r: RoomDef, side: "N" | "S" | "W" | "E", g: THREE.Group, low = false) => {
    const alongX = side === "N" || side === "S";
    const L = alongX ? r.w : r.d;
    const wg = new THREE.Group();
    const hasDoor = side === r.door;
    const H = low ? 0.62 : WALL_H;
    const col = low ? "#f5f7f8" : r.wall;
    const seg = (a: number, b: number, y0 = 0, y1 = H) => {
      const len = b - a; if (len <= 0.01 || y1 - y0 <= 0.01) return;
      const m = box(wg, alongX ? len : WALL_T, y1 - y0, alongX ? WALL_T : len, col, alongX ? (a + b) / 2 : 0, y0, alongX ? 0 : (a + b) / 2);
      if (!low) { box(wg, alongX ? len : WALL_T + 0.08, 0.1, alongX ? WALL_T + 0.08 : len, r.trim, alongX ? (a + b) / 2 : 0, y1 - 0.1, alongX ? 0 : (a + b) / 2); }
      void m;
    };
    if (hasDoor) { const gap = 3.8; seg(-L / 2, -gap / 2); seg(gap / 2, L / 2); if (!low) seg(-gap / 2, gap / 2, 2.35, H); }
    else seg(-L / 2, L / 2);
    if (!low && !hasDoor && (side === "N" || side === "W")) { // janelas nas paredes de fundo
      const n = alongX ? 2 : 1;
      for (let i = 0; i < n; i++) { const off = n === 1 ? 0 : (i === 0 ? -2.6 : 2.6); box(wg, alongX ? 1.7 : 0.1, 1.0, alongX ? 0.1 : 1.7, "#bfe3ff", alongX ? off : 0, 1.2, alongX ? (side === "N" ? 0.1 : 0) : off, { emissive: "#9fd4ff" }); box(wg, alongX ? 1.8 : 0.16, 0.08, alongX ? 0.16 : 1.8, "#f6efe0", alongX ? off : 0, 2.2, alongX ? 0.1 : off); }
    }
    const px = side === "W" ? -r.w / 2 : side === "E" ? r.w / 2 : 0, pz = side === "N" ? -r.d / 2 : side === "S" ? r.d / 2 : 0;
    wg.position.set(px, 0, pz); g.add(wg); bakeGroup(wg, wg);
    walls.push({ g: wg, nx: side === "W" ? -1 : side === "E" ? 1 : 0, nz: side === "N" ? -1 : side === "S" ? 1 : 0, roomId: r.id, low, k: 1 });
  };

  for (const r of ROOM_LIST) {
    const g = new THREE.Group(); g.position.set(r.cx, 0, r.cz); root.add(g); roomG[r.id] = g;
    const ft = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.2, r.d), new THREE.MeshStandardMaterial({ map: floorTexture(r.floor, r.floor2, 4, [r.outdoor ? 2 : 3, 2]), roughness: r.outdoor ? 0.95 : 0.6, flatShading: true }));
    ft.position.y = -0.1; ft.receiveShadow = true; g.add(ft);
    for (const side of ["N", "S", "W", "E"] as const) mkWall(r, side, g, !!r.outdoor);
    props(r.id, g);
  }

  /** Móveis dos níveis 3–7 por tema do local. */
  function propsTema(tema: Tema, nome: string, g: THREE.Group, desk3 = true) {
    switch (tema) {
      case "gabinete": desk(g, 0.4, -0.6, 3.4, 1.3, "#7a4b32"); chair(g, 0.4, -1.7, "#a34a2a", 0, true); monitor(g, -0.6, 0.82, -0.5, 0); papers(g, 1.6, 0.82, -0.4, 5); shelf(g, -3.8, -3.0, 3.0, 0, 4, 0.9, ["#7a4b32", "#a34a2a", "#3a6d9e"]); sofa(g, 3.4, 2.4, Math.PI, "#7a4b32"); chair(g, -1.2, 1.0, "#d9a335", Math.PI); chair(g, 2.0, 1.0, "#d9a335", Math.PI); cyl(g, 0.03, 2.4, "#c8c8c8", -4.2, 0, -2.9); box(g, 1.0, 0.65, 0.02, "#2fa66a", -3.7, 1.7, -2.9); break;
      case "dados": board(g, -2.0, 2.2, -3.33, 2.8, 1.6, 0, "#fffdf8"); board(g, 1.2, 2.2, -3.33, 1.8, 1.4, 0, "#eaf1fb"); board(g, 3.3, 2.2, -3.33, 1.4, 1.4, 0, "#f5f7ff"); desk(g, 0.2, -0.2, 3.4, 1.4, "#eef2f7"); monitor(g, -0.8, 0.8, -0.2); monitor(g, 0.8, 0.8, -0.2); papers(g, 1.8, 0.8, 0, 4); chair(g, 0.2, -1.4, "#2a5be0", 0, true); chair(g, -1.2, 1.1, "#2a5be0", Math.PI); chair(g, 1.6, 1.1, "#2a5be0", Math.PI); cabinet(g, -4.2, 0.5, Math.PI / 2, "#8c97a6", 1.2, 1.7); break;
      case "plenario": box(g, 4.4, 0.5, 1.0, "#6a4fa8", 0, 0, -2.2); box(g, 4.5, 0.08, 1.1, "#8d72bf", 0, 0.5, -2.2); desk(g, 0, 0.2, 3.0, 1.2, "#8a6a4a"); for (let i = 0; i < 4; i++) { chair(g, -3.4 + i * 2.2, 2.2, "#6a4fa8", Math.PI); chair(g, -3.4 + i * 2.2, 1.2, "#6a4fa8", Math.PI); } cyl(g, 0.03, 2.4, "#c8c8c8", 4.2, 0, 2.9); box(g, 0.9, 0.6, 0.02, "#2fa66a", 3.75, 1.75, 2.9); break;
      case "hospital": desk(g, -0.6, -1.4, 3.0, 1.0, "#eef2f7"); monitor(g, -0.6, 0.8, -1.4); chair(g, -0.6, -2.4, "#4fb596", 0, true); bed(g, 3.4, -1.7, Math.PI / 2); bed(g, 3.4, 0.5, Math.PI / 2); cabinet(g, -4.2, 0.6, Math.PI / 2, "#dfe6f0", 1.2, 1.4); for (let i = 0; i < 4; i++) chair(g, -3.2 + i * 1.3, 2.4, "#4fb596", Math.PI); break;
      case "obra": for (const [x, z] of [[1.6, -1.2], [3.8, -1.2], [1.6, 0.6], [3.8, 0.6]]) cyl(g, 0.06, 2.6, "#8f969b", x!, 0, z!); box(g, 2.4, 0.08, 1.9, "#c9a066", 2.7, 1.3, -0.3); box(g, 2.4, 0.08, 1.9, "#c9a066", 2.7, 2.4, -0.3); boxPile(g, -3.4, 1.8, 4, "#c9a066"); cone3(g, -1.2, 2.2); cone3(g, 0.6, 2.6); desk(g, 0.4, -0.6, 3.0, 1.2, "#d8d0bc"); papers(g, 0.4, 0.82, -0.5, 4); chair(g, 0.4, -1.7, "#d9822b", 0, true); break;
      case "reuniao": desk(g, 0, 0, 5.2, 1.6, "#8a5528"); for (let i = 0; i < 5; i++) { chair(g, -2.2 + i * 1.1, -1.3, "#a34a2a", 0, true); chair(g, -2.2 + i * 1.1, 1.3, "#a34a2a", Math.PI, true); } papers(g, -1.0, 0.82, 0, 5); papers(g, 1.4, 0.82, 0, 4); shelf(g, 3.2, -3.0, 2.6, 0, 4, 0.9, ["#7a4b32", "#a34a2a", "#3a6d9e"]); cyl(g, 0.03, 2.4, "#c8c8c8", -4.2, 0, -2.9); box(g, 1.0, 0.65, 0.02, "#2fa66a", -3.7, 1.7, -2.9); break;
    }
    sign(g, nome.length > 26 ? nome.slice(0, 25) + "…" : nome, 3.2, 0.5, -0.6, 2.75, tema === "plenario" || tema === "hospital" ? 3.33 : -3.33, tema === "plenario" || tema === "hospital" ? Math.PI : 0, "#17a493"); plant(g, -4.3, 3.0, 1);
    void desk3;
  }

  function props(id: LocationId, g: THREE.Group) {
    const info = LOC_INFO[id]; if (info) { propsTema(info.spec.tema, info.spec.curto, g); return; }
    switch (id) {
      case "recepcao": {
        box(g, 4.6, 1.05, 0.9, "#f0a14c", 1.2, 0, -1.7); box(g, 4.7, 0.1, 1.0, "#ffd08a", 1.2, 1.05, -1.7); box(g, 0.9, 1.05, 2.0, "#f0a14c", 3.35, 0, -0.6); box(g, 1.0, 0.1, 2.1, "#ffd08a", 3.35, 1.05, -0.6);
        monitor(g, 1.6, 1.15, -1.7, 0, "#d9f1ff"); papers(g, 0.2, 1.15, -1.6); box(g, 0.5, 1.7, 0.5, "#2a5be0", 4.2, 0, -3.0); box(g, 0.3, 0.3, 0.02, "#fffdf8", 4.2, 1.2, -2.74); cyl(g, 0.1, 0.02, "#ffcf44", 4.2, 0.8, -2.73, {}, true).rotation.x = Math.PI / 2;
        for (let i = 0; i < 6; i++) chair(g, -4.0 + i * 1.25, 2.3, "#2a5be0", Math.PI);
        for (let i = 0; i < 4; i++) chair(g, -3.4 + i * 1.25, 0.9, "#2a5be0", Math.PI);
        sign(g, "Recepção · Triagem", 3.0, 0.5, -2.4, 2.45, -3.33, 0, "#17a493"); plant(g, -4.3, -2.9, 1); plant(g, 4.3, 3.0, 0.9);
        box(g, 0.1, 2.2, 1.4, "#a9dcf5", -4.78, 0, 1.2, { emissive: "#a9dcf5" });
        break; }
      case "farmacia": {
        shelf(g, -3.3, -3.0, 3.2, 0, 4, 1); shelf(g, -4.5, -0.6, 3.0, Math.PI / 2, 4, 1); box(g, 4.0, 1.0, 0.9, "#e9dcc4", 0.4, 0, 0.6); box(g, 4.1, 0.08, 1.0, "#cfe8dc", 0.4, 1.0, 0.6);
        sign(g, "Farmácia", 2.0, 0.5, 1.8, 2.45, -3.33, 0, "#17a493"); board(g, 1.2, 2.4, -3.33, 1.4, 1.0); cabinet(g, 3.8, -2.9, 0, "#cfd8e0", 1.0, 1.8);
        box(g, 0.7, 1.7, 0.7, "#f4f6fb", 4.2, 0, 0.8); box(g, 0.4, 0.5, 0.02, "#8fd0ff", 4.2, 1.0, 1.16); plant(g, 4.3, -3.0, 0.9); chair(g, 0.6, 1.9, "#4fb596", Math.PI, true);
        break; }
      case "enfermagem": {
        bed(g, -3.6, -1.7, Math.PI / 2); bed(g, -3.6, 0.4, Math.PI / 2); cyl(g, 0.04, 1.8, "#9aa5b5", -2.6, 0, -0.5); box(g, 0.3, 0.4, 0.05, "#101a30", -2.6, 1.3, -0.45, { emissive: "#4ae3a0" });
        box(g, 0.05, 1.8, 2.8, "#8fd0e8", -2.0, 0.05, -0.6, { transparent: true, opacity: 0.55 });
        desk(g, 2.2, -2.5, 2.4, 1.0, "#eef2f7"); monitor(g, 2.2, 0.8, -2.55); chair(g, 2.2, -1.5, "#5b8fd0", 0, true);
        board(g, -2.2, 2.4, -3.33, 2.6, 1.3, 0, "#f5f7ff"); sign(g, "Enfermagem", 2.2, 0.5, 2.6, 2.5, -3.33, 0, "#5b8fd0");
        cabinet(g, 4.2, -0.4, -Math.PI / 2, "#dfe6f0", 1.2, 1.2); box(g, 0.9, 0.9, 0.6, "#e5484d", 3.9, 0, 1.8); box(g, 0.4, 0.1, 0.1, "#fff", 3.9, 0.55, 2.12); plant(g, 4.3, -3.0, 0.9);
        break; }
      case "administracao": {
        desk(g, 0.4, -0.6, 3.0, 1.3, "#8a5528"); chair(g, 0.4, -1.7, "#a34a2a", 0, true); monitor(g, -0.6, 0.82, -0.5, 0); papers(g, 1.6, 0.82, -0.4, 5); cyl(g, 0.1, 0.5, "#ffcf44", 1.9, 0.82, -0.8, { emissive: "#ffcf44" });
        shelf(g, -3.8, -3.0, 3.0, 0, 4, 0.9, ["#7a4b32", "#a34a2a", "#3a6d9e", "#d9b44a", "#2f6f4f"]); shelf(g, 3.0, -3.0, 2.6, 0, 4, 0.9, ["#7a4b32", "#a34a2a", "#3a6d9e"]);
        sofa(g, 3.4, 2.2, Math.PI, "#7a4b32"); box(g, 1.0, 0.4, 0.6, "#c98e5a", 3.4, 0, 1.2); chair(g, -1.2, 1.0, "#d9a335", Math.PI); chair(g, 2.0, 0.9, "#d9a335", Math.PI);
        sign(g, "Gabinete", 1.8, 0.5, 0, 2.7, -3.33, 0, "#8a5528"); cyl(g, 0.03, 2.2, "#c8c8c8", -4.3, 0, 2.5); box(g, 0.9, 0.55, 0.02, "#2fa66a", -3.85, 1.55, 2.5); plant(g, -4.3, 3.0, 1.1);
        break; }
      case "cofre": {
        safe(g, 3.2, -2.9); box(g, 3.6, 1.05, 0.9, "#6f8f7e", 0.2, 0, 0.5); box(g, 3.7, 0.1, 1.0, "#9bb8a8", 0.2, 1.05, 0.5); box(g, 0.5, 0.06, 0.38, "#7a2e2e", -1.2, 1.15, 0.5); papers(g, 1.4, 1.15, 0.4);
        cabinet(g, -4.3, -1.2, Math.PI / 2, "#8c97a6", 1.2, 1.7); cabinet(g, -4.3, 0.4, Math.PI / 2, "#8c97a6", 1.2, 1.7); cabinet(g, -4.3, 2.0, Math.PI / 2, "#8c97a6", 1.2, 1.7);
        sign(g, "Tesouraria", 2.2, 0.5, -1.4, 2.5, -3.33, 0, "#4b6d5c"); chair(g, 0.2, 1.7, "#4b6d5c", Math.PI, true); plant(g, 4.3, 3.0, 0.9);
        break; }
      case "secretaria": {
        desk(g, 0.4, -0.6, 3.4, 1.3, "#d8d0bc"); chair(g, 0.4, -1.7, "#17a493", 0, true); monitor(g, -0.6, 0.82, -0.5, 0); papers(g, 1.6, 0.82, -0.4, 5);
        shelf(g, -3.8, -3.0, 3.0, 0, 4, 0.9, ["#2f6f4f", "#3a6d9e", "#d9b44a"]); board(g, 1.4, 2.5, -3.33, 1.6, 1.0, 0, "#fffdf8"); desk(g, 2.2, -2.7, 2.0, 0.9, "#c9d2dc"); monitor(g, 2.2, 0.8, -2.7);
        sofa(g, 3.6, 2.4, Math.PI, "#3a8f86"); chair(g, -1.2, 1.0, "#17a493", Math.PI); chair(g, 2.0, 0.9, "#17a493", Math.PI);
        sign(g, "Secretaria de Saúde", 2.6, 0.5, -1.0, 2.7, -3.33, 0, "#17a493"); plant(g, -4.3, 3.0, 1.1);
        break; }
      case "planejamento": {
        board(g, -2.0, 2.2, -3.33, 2.8, 1.6, 0, "#fffdf8"); board(g, 0.8, 2.2, -3.33, 1.8, 1.4, 0, "#eaf1fb"); board(g, 3.0, 2.2, -3.33, 1.6, 1.4, 0, "#f5f7ff");
        desk(g, 0.2, -0.2, 3.4, 1.4, "#eef2f7"); monitor(g, -0.8, 0.8, -0.2); monitor(g, 0.8, 0.8, -0.2); papers(g, 1.8, 0.8, 0, 4); chair(g, 0.2, -1.4, "#2a5be0", 0, true); chair(g, -1.2, 1.1, "#2a5be0", Math.PI); chair(g, 1.6, 1.1, "#2a5be0", Math.PI);
        cabinet(g, -4.2, 0.5, Math.PI / 2, "#8c97a6", 1.2, 1.7); sign(g, "Sala de Situação", 2.6, 0.5, -0.4, 2.8, -3.33, 0, "#2a5be0"); plant(g, 4.3, 3.0, 0.9);
        break; }
      case "prefeitura": {
        desk(g, 0.4, -0.6, 3.2, 1.3, "#7a4b32"); chair(g, 0.4, -1.8, "#a34a2a", 0, true); monitor(g, -0.5, 0.82, -0.5, 0); papers(g, 1.5, 0.82, -0.4, 5);
        cyl(g, 0.03, 2.4, "#c8c8c8", -4.2, 0, -2.9); box(g, 1.0, 0.65, 0.02, "#2fa66a", -3.7, 1.7, -2.9); box(g, 0.5, 0.5, 0.02, "#f2c94c", -3.7, 1.7, -2.88);
        shelf(g, 3.2, -3.0, 2.6, 0, 4, 0.9, ["#7a4b32", "#a34a2a", "#3a6d9e"]); sofa(g, 3.4, 2.4, Math.PI, "#7a4b32"); chair(g, -1.0, 1.2, "#d9a335", Math.PI); chair(g, 1.8, 1.2, "#d9a335", Math.PI);
        sign(g, "Gabinete da Prefeita", 2.8, 0.5, 0.4, 2.7, -3.33, 0, "#8a5528"); plant(g, -4.3, 3.0, 1.1);
        break; }
      case "camara": {
        box(g, 4.4, 0.5, 1.0, "#6a4fa8", 0, 0, -2.2); box(g, 4.5, 0.08, 1.1, "#8d72bf", 0, 0.5, -2.2); desk(g, 0, 0.2, 3.0, 1.2, "#8a6a4a");
        for (let i = 0; i < 4; i++) chair(g, -3.4 + i * 2.2, 2.2, "#6a4fa8", Math.PI); for (let i = 0; i < 4; i++) chair(g, -3.4 + i * 2.2, 1.2, "#6a4fa8", Math.PI);
        sign(g, "Comissão de Saúde", 3.0, 0.5, 0, 2.5, 3.33, Math.PI, "#6a4fa8"); cyl(g, 0.03, 2.4, "#c8c8c8", 4.2, 0, 2.9); box(g, 0.9, 0.6, 0.02, "#2fa66a", 3.75, 1.75, 2.9); plant(g, -4.3, 3.0, 1);
        break; }
      case "ubs": {
        desk(g, -0.6, -1.4, 3.0, 1.0, "#eef2f7"); monitor(g, -0.6, 0.8, -1.4); chair(g, -0.6, -2.4, "#4fb596", 0, true);
        bed(g, 3.4, -1.7, Math.PI / 2); cabinet(g, -4.2, 0.6, Math.PI / 2, "#dfe6f0", 1.2, 1.4); board(g, -1.2, 2.4, 3.15, 2.0, 1.1, Math.PI, "#fffdf8");
        for (let i = 0; i < 4; i++) chair(g, -3.2 + i * 1.3, 2.2, "#4fb596", Math.PI); sign(g, "UBS Esperança", 2.4, 0.5, 1.6, 2.6, 3.33, Math.PI, "#4fb596"); plant(g, 4.3, 3.0, 0.9);
        break; }
      case "patio": {
        ambulance(g, -2.8, -2.4, 0.05); ambulance(g, -2.2, 0.3, -0.06);
        // obra da sala de observação: andaime, madeira e faixa
        for (const [x, z] of [[1.6, -1.2], [3.8, -1.2], [1.6, 0.6], [3.8, 0.6]]) cyl(g, 0.06, 2.6, "#8f969b", x!, 0, z!);
        box(g, 2.4, 0.08, 1.9, "#c9a066", 2.7, 1.3, -0.3); box(g, 2.4, 0.08, 1.9, "#c9a066", 2.7, 2.4, -0.3); for (let i = 0; i < 4; i++) box(g, 0.5, 0.35, 0.4, "#b9773d", 1.9 + i * 0.55, 2.48, -0.3);
        boxPile(g, 4.0, 2.4, 4, "#c9a066"); cone3(g, 1.2, 1.8); cone3(g, 4.2, 1.4); cone3(g, 0.6, 2.4);
        for (const x of [-1.6, 1.4]) cyl(g, 0.05, 2.2, "#6b7280", x, 0, -3.1);
        sign(g, "INAUGURAÇÃO", 3.0, 0.7, -0.1, 1.9, -3.1, 0, "#e5484d"); cyl(g, 0.05, 1.0, "#6b7280", -3.8, 0, 2.8); box(g, 1.2, 0.7, 0.05, "#f2b134", -3.8, 1.1, 2.82);
        tree(g, -4.2, -2.8, 0.8); tree(g, 4.3, 3.0, 0.8);
        break; }
    }
  }

  function decor(id: LocationId, g: THREE.Group) {
    const clock = (x: number, y: number, z: number) => { const c = cyl(g, 0.3, 0.06, "#ffffff", x, y, z, {}, true); c.rotation.x = Math.PI / 2; const h1 = box(g, 0.03, 0.2, 0.02, "#1b2340", x, y - 0.0, z + 0.05); void h1; box(g, 0.14, 0.03, 0.02, "#1b2340", x + 0.05, y + 0.0, z + 0.05); };
    const bin = (x: number, z: number, c = "#6b7280") => { cyl(g, 0.2, 0.5, c, x, 0, z, {}, true); cyl(g, 0.23, 0.05, darken(c, 0.2), x, 0.5, z, {}, true); };
    const rug = (x: number, z: number, w: number, d: number, c: string) => { box(g, w, 0.03, d, c, x, 0, z); box(g, w - 0.3, 0.035, d - 0.3, lighten(c, 0.18), x, 0, z); };
    const ext = (x: number, z: number, rot = 0) => { const e = new THREE.Group(); e.position.set(x, 0, z); e.rotation.y = rot; g.add(e); cyl(e, 0.09, 0.5, "#d12c2c", 0, 0.4, 0, {}, true); box(e, 0.1, 0.1, 0.1, "#222", 0, 0.9, 0); };
    switch (id) {
      case "recepcao": rug(-1.2, 0.3, 3.4, 2.4, "#4a72d9"); bin(-4.4, 2.0); clock(0.4, 2.4, -3.3); ext(4.3, -2.1); board(g, 3.2, 2.5, -3.33, 1.1, 0.8, 0, "#fff3dc"); break;
      case "farmacia": clock(-0.8, 2.4, -3.3); bin(-2.4, 2.6); ext(4.4, 2.6, -Math.PI / 2); rug(0.4, 2.0, 2.6, 1.6, "#7fc4a6"); break;
      case "enfermagem": clock(0.6, 2.4, -3.3); bin(3.8, -2.2, "#9aa5b5"); rug(1.0, 1.4, 2.8, 1.8, "#8fb4e6"); ext(-4.4, 2.4, Math.PI / 2); box(g, 0.3, 0.4, 0.12, "#f4f6fb", 0.2, 1.1, -3.25); break;
      case "administracao": rug(0.4, 0.4, 4.4, 3.0, "#8a2f2f"); clock(-1.6, 2.5, -3.3); board(g, 4.0, 2.5, -3.33, 1.2, 0.8, 0, "#e8dcc4"); cyl(g, 0.06, 1.6, "#6b4a2a", 4.3, 0, 2.6); box(g, 0.5, 0.05, 0.05, "#6b4a2a", 4.3, 1.5, 2.6); bin(-1.8, -2.6, "#8a5528"); break;
      case "cofre": rug(0.2, 1.4, 3.2, 2.0, "#4b6d5c"); clock(3.0, 2.5, -3.3); bin(-3.4, 2.8); ext(4.4, 2.8, -Math.PI / 2); box(g, 1.0, 0.02, 0.7, "#e8dcc4", 1.8, 1.16, 0.4); break;
      case "secretaria": case "planejamento": case "prefeitura": case "camara": case "ubs": default: clock(-2.8, 2.5, id === "camara" || id === "ubs" ? 3.3 : -3.3); bin(-4.4, -2.6); rug(0.4, 1.4, 3.2, 2.0, id === "prefeitura" ? "#8a2f2f" : "#4a72d9"); break;
      case "patio": box(g, 1.8, 0.15, 0.5, "#8a5528", 3.8, 0.45, -2.9); box(g, 1.8, 0.4, 0.1, "#8a5528", 3.8, 0.6, -3.1); for (let i = 0; i < 4; i++) { cyl(g, 0.1, 0.8, "#f2b134", -4.4 + i * 0.01, 0, -2.0 + i * 1.3, {}, true); } break;
    }
  }
  for (const r of ROOM_LIST) decor(r.id, roomG[r.id]!);

  /** Junta as peças fixas (cor por vértice): o mundo todo vira poucas chamadas de desenho. Paredes e partes dinâmicas ficam de fora. */
  bakeGroup(root, root, new Set<THREE.Object3D>([dynG, ...walls.map((w) => w.g)]));

  /* ───────── parte dinâmica: reconstruída quando o estado muda ───────── */
  const clearDyn = () => { for (const c of [...dynG.children]) { dynG.remove(c); c.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry && (m.userData.own === true)) m.geometry.dispose(); const mm = m.material as THREE.Material | undefined; if (mm && (mm as THREE.MeshBasicMaterial).map) { (mm as THREE.MeshBasicMaterial).map!.dispose(); mm.dispose(); } }); } };
  const local = (room: LocationId, x: number, y: number, z: number) => new THREE.Vector3(ROOMS[room].cx + x, y, ROOMS[room].cz + z);
  const setDynamic = (d: WorldDyn) => {
    clearDyn();
    // equipe e figurantes das salas (dão vida; não têm fala)
    const at = (room: LocationId, x: number, z: number, look: Look, o: { sit?: boolean; yaw?: number; scale?: number } = {}) => { const p = person(look, { sit: o.sit, scale: o.scale }); p.position.copy(local(room, x, o.sit ? 0.08 : 0, z)); p.rotation.y = o.yaw ?? 0; p.userData.extra = true; dynG.add(p); return p; };
    const nurse = (c: string, skin: string) => ({ ...extraLook(c, skin), roupaTipo: "jaleco" as const, roupa2: "#e9fbf8" });
    if (nivel === 1) {
    // TV de espera na recepção
    const tvc = d.filaMin > 80 ? "#ff7a6b" : d.filaMin > 50 ? "#ffd85a" : "#6ff0a6";
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d")!;
    x.fillStyle = "#0e1a3a"; x.fillRect(0, 0, 512, 256); x.fillStyle = "#8fd0ff"; x.font = "700 40px system-ui"; x.textAlign = "center"; x.fillText("ESPERA MÉDIA", 256, 80); x.fillStyle = tvc; x.font = "800 110px system-ui"; x.fillText(`${Math.round(d.filaMin)} min`, 256, 200);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const tv = new THREE.Group(); tv.position.copy(local("recepcao", -2.4, 1.55, -3.3)); dynG.add(tv);
    box(tv, 2.5, 1.35, 0.1, "#1b2340", 0, -0.1, 0); const sc = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.15), new THREE.MeshBasicMaterial({ map: tex })); sc.position.set(0, 0.5, 0.07); tv.add(sc);
    // fila: pessoas sentadas na recepção
    const n = Math.min(6, 1 + d.filaNivel);
    const cols = [["#c9577a", "#a9724f"], ["#4f8f6f", "#d9ab87"], ["#d9a335", "#7a4a30"], ["#6d6fc4", "#c68d64"], ["#cc5a4a", "#8d5b3d"], ["#4a8fb8", "#e0b48f"]];
    for (let i = 0; i < n; i++) { const p = person(extraLook(cols[i]![0]!, cols[i]![1]!), { sit: true, scale: 0.95 }); p.position.copy(local("recepcao", -4.0 + i * 1.25, 0.08, 2.3)); p.rotation.y = Math.PI; dynG.add(p); }
    const kid = person(extraLook("#e2701c", "#c88a62"), { scale: 0.62 }); kid.position.copy(local("recepcao", -4.3, 0, 0.9)); kid.rotation.y = Math.PI; dynG.add(kid);
    // estoque da farmácia: prateleiras extras conforme o nível; melhoria: plantas viçosas
    const fa = new THREE.Group(); fa.position.set(ROOMS.farmacia.cx, 0, ROOMS.farmacia.cz); dynG.add(fa);
    if (d.estoqueNivel <= 1) { box(fa, 0.9, 0.04, 0.9, "#e5484d", -3.3, 2.3, -2.55); sign(fa, "FALTA", 1.0, 0.36, -3.3, 2.65, -2.9, 0, "#e5484d"); } else boxPile(fa, 3.6, 1.8, Math.min(6, d.estoqueNivel + 2), "#d9a35b");
    if (d.melhoria > 0) { plant(dynG, ROOMS.recepcao.cx + 0.4, ROOMS.recepcao.cz - 2.9, 0.9, true); plant(dynG, ROOMS.enfermagem.cx - 4.3, ROOMS.enfermagem.cz + 3.0, 0.9, true); }
    at("enfermagem", -2.4, 1.6, nurse("#2bb3a3", "#c4895e"), { yaw: -1.4 }); at("enfermagem", 2.2, -1.5, nurse("#5b8fd0", "#8d5b3d"), { sit: true, yaw: 0 });
    { const pt = person(extraLook("#f7fbff", "#d9ab87", "#8a8a8a"), { sit: true }); pt.rotation.set(-Math.PI / 2 + 0.25, 0, 0); pt.position.copy(local("enfermagem", -3.6, 0.52, -1.35)); pt.rotation.order = "YXZ"; pt.rotation.y = 0; pt.rotation.x = -1.35; pt.userData.extra = true; dynG.add(pt); }
    at("farmacia", -1.4, -1.6, nurse("#6fcfae", "#b57a52"), { yaw: Math.PI }); at("farmacia", 0.6, 1.9, nurse("#4fb596", "#d9ab87"), { sit: true, yaw: Math.PI });
    at("cofre", 0.2, 1.7, extraLook("#6b7a99", "#c68d64"), { sit: true, yaw: Math.PI }); at("cofre", -2.4, -2.2, extraLook("#2e8a7a", "#8d5b3d"), { yaw: 0.6 });
    at("administracao", -1.2, 1.0, extraLook("#a34a2a", "#e0b48f", "#c9b27a"), { sit: true, yaw: Math.PI });
    at("patio", -4.2, 1.4, { ...extraLook("#ffffff", "#c88a62"), roupa2: "#e5484d" }, { yaw: 1.2 }); at("patio", 3.6, 1.6, { ...extraLook("#ffcf44", "#a9724f"), cabeloEstilo: "careca" }, { yaw: -2.3 });
    at("recepcao", -4.2, -1.9, extraLook("#e5e7eb", "#c68d64"), { yaw: 0.4 });
    for (const [x, c, sk] of [[-9.5, "#4a8fb8", "#e0b48f"], [3.0, "#cc5a4a", "#7a4a30"], [11.5, "#6d6fc4", "#c68d64"]] as Array<[number, string, string]>) { const w = person(extraLook(c, sk)); w.position.set(x, 0, 0.1); w.rotation.y = x < 5 ? 1.57 : -1.57; w.userData.extra = true; w.userData.walk = { x0: x, amp: 1.6 }; dynG.add(w); }
    // luxo: o gabinete ganha ostentação (sátira); degradação: lixo e luzes frias
    if (d.luxo > 0) {
      const ad = new THREE.Group(); ad.position.set(ROOMS.administracao.cx, 0, ROOMS.administracao.cz); dynG.add(ad);
      box(ad, 1.5, 1.0, 0.08, "#d9b44a", -2.4, 1.4, -3.3, { metal: 0.7, rough: 0.35 }); box(ad, 1.3, 0.8, 0.04, "#7fb6ea", -2.4, 1.5, -3.26);
      cyl(ad, 0.25, 0.1, "#d9b44a", 3.6, 0, -1.2, { metal: 0.8 }, true); cyl(ad, 0.18, 0.5, "#d9b44a", 3.6, 0.1, -1.2, { metal: 0.8 }, true); ball(ad, 0.28, "#d9b44a", 3.6, 0.9, -1.2, { metal: 0.8 });
      if (d.luxo > 1) { box(ad, 3.6, 0.02, 2.4, "#d9b44a", 0.4, 0.02, 1.4, { metal: 0.5 }); cyl(ad, 0.4, 0.6, "#c4262e", -4.0, 0, 1.6, {}, true); }
    }
    if (d.degradacao > 1) { for (const [rm, x, z] of [["recepcao", 3.4, 2.8], ["farmacia", -1.2, 2.6], ["enfermagem", -1.0, 2.8]] as Array<[LocationId, number, number]>) { const t = new THREE.Group(); t.position.copy(local(rm, x, 0, z)); dynG.add(t); cyl(t, 0.22, 0.5, "#6b7280", 0, 0, 0, {}, true); for (let i = 0; i < 5; i++) box(t, 0.14, 0.12, 0.14, ["#e7e1c8", "#c9c3a8", "#9aa5b5"][i % 3]!, (i - 2) * 0.1, 0.5 + (i % 2) * 0.08, ((i * 7) % 3) * 0.05); } }
    } else if (nivel === 2) {
      const staff = (c: string, skin: string) => ({ ...extraLook(c, skin), roupaTipo: "blazer" as const });
      at("secretaria", -1.2, 1.0, staff("#17a493", "#c68d64"), { sit: true, yaw: Math.PI }); at("secretaria", 2.2, -1.9, staff("#3a6d9e", "#8d5b3d"), { sit: true, yaw: 0 });
      at("planejamento", -2.4, 1.6, staff("#2a5be0", "#e0b48f"), { yaw: -1.4 }); at("planejamento", -0.8, -1.2, staff("#5b8fd0", "#a9724f"), { sit: true, yaw: 0 });
      at("prefeitura", 3.2, 1.8, staff("#8a5528", "#d9ab87"), { sit: true, yaw: Math.PI });
      at("camara", -3.4, 2.2, staff("#6a4fa8", "#c68d64"), { sit: true, yaw: Math.PI }); at("camara", 0.2, 1.2, staff("#8d72bf", "#7a4a30"), { sit: true, yaw: Math.PI }); at("camara", 2.8, -2.6, staff("#6a4fa8", "#e0b48f"), { yaw: 0 });
      at("ubs", -3.2, 2.2, { ...extraLook("#e5484d", "#c88a62"), roupa2: "#fff" }, { sit: true, yaw: Math.PI }); at("ubs", -2.0, 2.2, extraLook("#6d6fc4", "#a9724f"), { sit: true, yaw: Math.PI }); at("ubs", 3.0, 0.4, { ...extraLook("#4fb596", "#d9ab87"), roupaTipo: "jaleco", roupa2: "#e9fbf8" }, { yaw: -1.5 });
      for (const [x, c, sk] of [[-9.5, "#4a8fb8", "#e0b48f"], [3.0, "#cc5a4a", "#7a4a30"]] as Array<[number, string, string]>) { const w = person(extraLook(c, sk)); w.position.set(x, 0, 0.1); w.rotation.y = x < 5 ? 1.57 : -1.57; w.userData.extra = true; w.userData.walk = { x0: x, amp: 1.6 }; dynG.add(w); }
      if (d.melhoria > 0) { plant(dynG, ROOMS.ubs.cx + 0.4, ROOMS.ubs.cz - 2.9, 0.9, true); plant(dynG, ROOMS.secretaria.cx + 4.3, ROOMS.secretaria.cz - 3.0, 0.9, true); }
    } else {
      const cols: Array<[string, string]> = [["#3a6d9e", "#e0b48f"], ["#8a5528", "#c68d64"], ["#6a4fa8", "#a9724f"], ["#17a493", "#d9ab87"], ["#c4622d", "#8d5b3d"]];
      ROOM_LIST.forEach((r, i) => {
        const [c, sk] = cols[i % cols.length]!;
        at(r.id, -3.4, r.door === "S" ? 1.8 : -1.8, { ...extraLook(c, sk), roupaTipo: "blazer" as const }, { sit: i % 2 === 0, yaw: r.door === "S" ? Math.PI : 0 });
        at(r.id, 3.4, r.door === "S" ? -1.4 : 1.4, extraLook(cols[(i + 2) % cols.length]![0], cols[(i + 1) % cols.length]![1]), { yaw: r.door === "S" ? 0.6 : -2.5 });
      });
      for (const [x, c, sk] of [[-9.5, "#4a8fb8", "#e0b48f"], [3.0, "#cc5a4a", "#7a4a30"]] as Array<[number, string, string]>) { const w = person(extraLook(c, sk)); w.position.set(x, 0, 0.1); w.rotation.y = x < 5 ? 1.57 : -1.57; w.userData.extra = true; w.userData.walk = { x0: x, amp: 1.6 }; dynG.add(w); }
    }
    // personagens presentes (os que têm conversa neste caso)
    for (const pe of d.people) {
      const a = ANCHORS[pe.hotspotId]; if (!a) continue;
      const p = person(pe.look); p.position.copy(local(pe.room, a[0], 0, a[2])); p.rotation.y = ROOMS[pe.room].door === "N" ? 0.35 : -0.35; p.userData.hotspot = pe.hotspotId; p.userData.base = p.rotation.y; dynG.add(p);
    }
  };

  const updateWalls = (cam: THREE.Vector3, dt: number) => {
    for (const w of walls) {
      if (w.low) continue;
      const r = ROOMS[w.roomId]; const dx = cam.x - r.cx, dz = cam.z - r.cz; const len = Math.hypot(dx, dz) || 1;
      const facing = (w.nx * dx + w.nz * dz) / len;
      const target = facing > 0.18 ? 0.13 : 1;
      w.k += (target - w.k) * (1 - Math.exp(-dt * 7)); w.g.scale.y = Math.max(0.01, w.k);
    }
  };

  const animate = (t: number, speaking: string | null, level: number) => {
    for (const o of dynG.children) {
      const u = o.userData as { hotspot?: string; extra?: boolean; walk?: { x0: number; amp: number }; ph?: number; base?: number; y0?: number };
      if (!u.hotspot && !u.extra) continue;
      u.ph ??= (o.id * 1.7) % 6.28; u.y0 ??= o.position.y;
      const talk = u.hotspot && u.hotspot === speaking;
      if (u.walk) { o.position.x = u.walk.x0 + Math.sin(t * 0.35 + u.ph) * u.walk.amp; o.position.y = u.y0 + Math.abs(Math.sin(t * 4.2 + u.ph)) * 0.04; continue; }
      if (o.rotation.x === 0) o.position.y = u.y0 + Math.sin(t * 1.5 + u.ph) * 0.012;
      if (u.hotspot) { const b = u.base ?? 0; o.rotation.y = b + Math.sin(t * 0.6 + u.ph) * 0.05 + (talk ? Math.sin(t * 2.2) * 0.12 : 0); }
      if (talk) o.position.y = u.y0 + Math.abs(Math.sin(t * 11)) * (0.015 + level * 0.09);
    }
  };
  const drawCalls = () => walls.length + 1;

  const dispose = () => {
    root.traverse((o) => { const m = o as THREE.Mesh; const mm = m.material as THREE.Material | undefined; if (mm && (mm as THREE.MeshBasicMaterial).map) (mm as THREE.MeshBasicMaterial).map!.dispose(); });
    // geometrias compartilhadas ficam no módulo; materiais em cache são liberados por disposeMats (chamado pelo componente)
  };
  void blob; void darken; void lighten; void ROOM_W; void ROOM_D; void q;
  return { root, center: (id) => new THREE.Vector3(ROOMS[id].cx, 0, ROOMS[id].cz), anchor: (room, hs) => { const a = ANCHORS[hs] ?? [0, 1, 0]; return local(room, a[0], a[1], a[2]); }, setDynamic, updateWalls, animate, drawCalls, dispose };
}
