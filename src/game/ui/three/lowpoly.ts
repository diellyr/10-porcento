import * as THREE from "three";
import type { Look } from "../../content/types";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { darken, lighten } from "../art/color";

/** Peças low-poly (faces chapadas, cores vivas). Tudo em unidades ≈ metros; origem de cada peça no chão. */
const mats = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, o: { rough?: number; metal?: number; emissive?: string; transparent?: boolean; opacity?: number; flat?: boolean } = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${o.rough ?? ""}|${o.metal ?? ""}|${o.emissive ?? ""}|${o.opacity ?? ""}|${o.flat ?? ""}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.82, metalness: o.metal ?? 0, flatShading: o.flat ?? true, transparent: o.transparent, opacity: o.opacity ?? 1, emissive: o.emissive ? new THREE.Color(o.emissive) : undefined, emissiveIntensity: o.emissive ? 0.9 : 0 });
    mats.set(key, m);
  }
  return m;
}
const vcMats = new Map<string, THREE.MeshStandardMaterial>();
export const disposeMats = () => { for (const m of mats.values()) m.dispose(); mats.clear(); for (const m of vcMats.values()) m.dispose(); vcMats.clear(); };

/** Material com cor por vértice: milhares de peças de cores diferentes viram poucas chamadas de desenho. */
function vcMaterial(src: THREE.MeshStandardMaterial): { key: string; mat: THREE.MeshStandardMaterial; colored: boolean } {
  const emissive = src.emissiveIntensity > 0 && src.emissive.getHex() !== 0;
  const key = `${src.roughness}|${src.metalness}|${src.flatShading}|${src.transparent ? src.opacity : 1}|${emissive ? src.color.getHexString() + src.emissive.getHexString() : ""}`;
  let m = vcMats.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: emissive ? src.color : "#ffffff", vertexColors: !emissive, roughness: src.roughness, metalness: src.metalness, flatShading: src.flatShading, transparent: src.transparent, opacity: src.opacity, emissive: emissive ? src.emissive : undefined, emissiveIntensity: emissive ? src.emissiveIntensity : 0 }); vcMats.set(key, m); }
  return { key, mat: m, colored: !emissive };
}

/** Junta as malhas de um grupo (em coordenadas locais de `rel`), uma malha por tipo de material. Itens em `skip` ficam como estão. */
export function bakeGroup(group: THREE.Object3D, rel: THREE.Object3D, skip: Set<THREE.Object3D> = new Set()) {
  group.updateMatrixWorld(true); rel.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(rel.matrixWorld).invert(); const mm = new THREE.Matrix4();
  const buckets = new Map<string, { mat: THREE.MeshStandardMaterial; list: THREE.BufferGeometry[] }>(); const gone: THREE.Mesh[] = [];
  const visit = (o: THREE.Object3D) => {
    if (skip.has(o)) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && m.material instanceof THREE.MeshStandardMaterial && !m.material.map && !m.userData.keep) {
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()) as THREE.BufferGeometry;
      for (const n of Object.keys(g.attributes)) if (n !== "position" && n !== "normal" && n !== "uv") g.deleteAttribute(n);
      g.applyMatrix4(mm.multiplyMatrices(inv, m.matrixWorld));
      const v = vcMaterial(m.material);
      if (v.colored) { const n = g.attributes.position!.count, c = new Float32Array(n * 3), col = m.material.color; for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; } g.setAttribute("color", new THREE.BufferAttribute(c, 3)); }
      else g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count * 3).fill(1), 3));
      (buckets.get(v.key) ?? buckets.set(v.key, { mat: v.mat, list: [] }).get(v.key)!).list.push(g); gone.push(m);
    }
    for (const c of [...o.children]) visit(c);
  };
  visit(group);
  for (const m of gone) m.parent?.remove(m);
  for (const { mat: material, list } of buckets.values()) {
    const merged = mergeGeometries(list, false); list.forEach((x) => x.dispose()); if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.own = true; group.add(mesh);
  }
}

const boxG = new THREE.BoxGeometry(1, 1, 1);
const cylG = new THREE.CylinderGeometry(1, 1, 1, 10);
const cylHiG = new THREE.CylinderGeometry(1, 1, 1, 18);
const coneG = new THREE.ConeGeometry(1, 1, 8);
const icoG = new THREE.IcosahedronGeometry(1, 1);
const sphG = new THREE.SphereGeometry(1, 14, 10);

type P = THREE.Object3D;
function put<T extends THREE.Mesh>(m: T, parent: P, x: number, y: number, z: number, shadow = true): T { m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; }

/** Caixa com base em y (y = altura da base). */
export function box(parent: P, w: number, h: number, d: number, color: string, x: number, y: number, z: number, o: Parameters<typeof mat>[1] = {}) {
  const m = new THREE.Mesh(boxG, mat(color, o)); m.scale.set(w, h, d); return put(m, parent, x, y + h / 2, z);
}
export function cyl(parent: P, r: number, h: number, color: string, x: number, y: number, z: number, o: Parameters<typeof mat>[1] = {}, hi = false) {
  const m = new THREE.Mesh(hi ? cylHiG : cylG, mat(color, o)); m.scale.set(r, h, r); return put(m, parent, x, y + h / 2, z);
}
export function cone(parent: P, r: number, h: number, color: string, x: number, y: number, z: number) {
  const m = new THREE.Mesh(coneG, mat(color)); m.scale.set(r, h, r); return put(m, parent, x, y + h / 2, z);
}
export function blob(parent: P, r: number, color: string, x: number, y: number, z: number, sy = 1) {
  const m = new THREE.Mesh(icoG, mat(color)); m.scale.set(r, r * sy, r); return put(m, parent, x, y, z);
}
export function ball(parent: P, r: number, color: string, x: number, y: number, z: number, o: Parameters<typeof mat>[1] = {}) {
  const m = new THREE.Mesh(sphG, mat(color, { flat: false, ...o })); m.scale.set(r, r, r); return put(m, parent, x, y, z);
}

/* ───────────── móveis ───────────── */

export function plant(parent: P, x: number, z: number, s = 1, fresh = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  cyl(g, 0.34, 0.5, "#c4622d", 0, 0, 0); cyl(g, 0.38, 0.1, "#d8763a", 0, 0.5, 0);
  const leaf = fresh ? "#35a95f" : "#9aa84a";
  blob(g, 0.55, leaf, 0, 1.15, 0, 1.2); blob(g, 0.4, darken(leaf, 0.12), 0.28, 1.55, 0.1, 1.1); blob(g, 0.36, lighten(leaf, 0.1), -0.25, 1.4, -0.12, 1);
  return g;
}
export function tree(parent: P, x: number, z: number, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  cyl(g, 0.22, 1.3, "#8a5a34", 0, 0, 0); blob(g, 1.0, "#3fa860", 0, 2.1, 0, 1.1); blob(g, 0.75, "#58c077", 0.5, 2.6, 0.2, 1);
  return g;
}
export function chair(parent: P, x: number, z: number, color = "#2a5be0", rotY = 0, office = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  if (office) { cyl(g, 0.05, 0.42, "#4a5070", 0, 0, 0); box(g, 0.78, 0.06, 0.1, "#4a5070", 0, 0.02, 0); box(g, 0.1, 0.06, 0.78, "#4a5070", 0, 0.02, 0); }
  else { for (const [dx, dz] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]) box(g, 0.06, 0.42, 0.06, "#4a5070", dx!, 0, dz!); }
  box(g, 0.68, 0.12, 0.64, color, 0, 0.42, 0); box(g, 0.68, 0.7, 0.1, darken(color, 0.1), 0, 0.54, -0.3);
  return g;
}
export function desk(parent: P, x: number, z: number, w = 2.2, d = 1, color = "#c98e5a", rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  box(g, w, 0.1, d, color, 0, 0.72, 0); box(g, 0.1, 0.72, d - 0.1, darken(color, 0.2), -w / 2 + 0.1, 0, 0); box(g, 0.1, 0.72, d - 0.1, darken(color, 0.2), w / 2 - 0.1, 0, 0);
  box(g, w - 0.2, 0.5, 0.06, darken(color, 0.12), 0, 0.2, -d / 2 + 0.08);
  return g;
}
export function monitor(parent: P, x: number, y: number, z: number, rotY = 0, screen = "#9fd4ff") {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
  box(g, 0.5, 0.34, 0.05, "#2b3350", 0, 0.16, 0); box(g, 0.44, 0.28, 0.02, screen, 0, 0.19, 0.03, { emissive: screen }); box(g, 0.12, 0.14, 0.1, "#454d6e", 0, 0, 0); box(g, 0.3, 0.03, 0.2, "#2b3350", 0, 0, 0);
  return g;
}
export function shelf(parent: P, x: number, z: number, w = 2.4, rotY = 0, rows = 4, full = 1, palette = ["#e9a25a", "#7cc4a1", "#e2d089", "#9ab6ea", "#e88f8f"]) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  box(g, w, 2.2, 0.1, "#e9dcc4", 0, 0, -0.3); box(g, 0.08, 2.2, 0.62, "#d9c9a6", -w / 2, 0, 0); box(g, 0.08, 2.2, 0.62, "#d9c9a6", w / 2, 0, 0);
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const y = 0.1 + r * 0.55; box(g, w, 0.06, 0.62, "#d9c9a6", 0, y, 0);
    for (let i = 0; i < Math.floor(w / 0.38); i++) { if ((i * 7 + r * 3) % 10 >= full * 10) continue; const h = 0.28 + ((i + r) % 3) * 0.06; box(g, 0.28, h, 0.3, palette[(k++) % palette.length]!, -w / 2 + 0.3 + i * 0.38, y + 0.03, -0.05); }
  }
  return g;
}
export function bed(parent: P, x: number, z: number, rotY = 0, sheet = "#f7fbff") {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  box(g, 1.0, 0.1, 2.1, "#98a4b8", 0, 0.34, 0); box(g, 0.9, 0.18, 1.9, sheet, 0, 0.44, 0); box(g, 0.6, 0.12, 0.34, "#ffffff", 0, 0.62, -0.7); box(g, 0.98, 0.34, 0.06, "#7b8aa3", 0, 0.4, -1.04);
  for (const [dx, dz] of [[-0.45, -0.95], [0.45, -0.95], [-0.45, 0.95], [0.45, 0.95]]) cyl(g, 0.04, 0.34, "#5a6783", dx!, 0, dz!);
  return g;
}
export function sofa(parent: P, x: number, z: number, rotY = 0, color = "#7a4b32") {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  box(g, 2.2, 0.4, 0.9, color, 0, 0.1, 0); box(g, 2.2, 0.7, 0.24, darken(color, 0.12), 0, 0.4, -0.36); box(g, 0.24, 0.55, 0.9, darken(color, 0.12), -1.1, 0.1, 0); box(g, 0.24, 0.55, 0.9, darken(color, 0.12), 1.1, 0.1, 0);
  return g;
}
export function cabinet(parent: P, x: number, z: number, rotY = 0, color = "#8c97a6", w = 0.9, h = 1.5) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  box(g, w, h, 0.6, color, 0, 0, 0); for (let i = 0; i < 3; i++) { box(g, w - 0.1, 0.02, 0.02, darken(color, 0.3), 0, 0.2 + i * (h / 3.2), 0.31); box(g, 0.2, 0.05, 0.04, "#d9dde4", 0, 0.34 + i * (h / 3.2), 0.32); }
  return g;
}
export function papers(parent: P, x: number, y: number, z: number, n = 3) { for (let i = 0; i < n; i++) box(parent, 0.4, 0.015, 0.3, i % 2 ? "#ffffff" : "#fbf4e2", x + i * 0.02, y + i * 0.016, z - i * 0.02); }
export function boxPile(parent: P, x: number, z: number, n = 4, color = "#d9a35b") {
  for (let i = 0; i < n; i++) box(parent, 0.7, 0.5, 0.55, i % 2 ? darken(color, 0.1) : color, x + (i % 2) * 0.1, Math.floor(i / 2) * 0.5, z + (i % 2) * 0.55 * 0.4 - (i % 3) * 0.1);
}
export function cone3(parent: P, x: number, z: number) { cone(parent, 0.2, 0.55, "#ff7a1a", x, 0, z); cyl(parent, 0.27, 0.05, "#f0f0f0", x, 0.22, z); box(parent, 0.5, 0.04, 0.5, "#333a52", x, 0, z); }
export function ambulance(parent: P, x: number, z: number, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  box(g, 3.4, 1.4, 1.5, "#fafafa", 0, 0.4, 0); box(g, 1.1, 1.0, 1.46, "#eaf1f7", 1.8, 0.4, 0); box(g, 0.1, 0.5, 1.3, "#7fb6ea", 2.36, 0.9, 0, { emissive: "#7fb6ea" });
  box(g, 3.4, 0.2, 1.54, "#e5484d", 0, 0.9, 0); box(g, 0.5, 0.1, 0.5, "#e5484d", -0.4, 1.8, 0); box(g, 0.1, 0.5, 0.18, "#e5484d", 0.1, 1.76, 0); box(g, 0.28, 0.12, 0.28, "#3a6df0", 0.9, 1.84, 0, { emissive: "#3a6df0" });
  for (const dx of [-1.0, 1.2]) for (const dz of [-0.78, 0.78]) { cyl(g, 0.34, 0.2, "#23283a", dx, 0.05, dz, {}, true).rotation.x = Math.PI / 2; }
  return g;
}
export function safe(parent: P, x: number, z: number, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  box(g, 1.7, 1.9, 1.0, "#5d6b78", 0, 0, 0, { metal: 0.5, rough: 0.5 }); box(g, 1.4, 1.6, 0.06, "#7b8996", 0, 0.15, 0.52, { metal: 0.5, rough: 0.45 });
  const w = cyl(g, 0.3, 0.1, "#d9b44a", 0, 0.8, 0.58, { metal: 0.8, rough: 0.35 }, true); w.rotation.x = Math.PI / 2; box(g, 0.08, 0.5, 0.06, "#d9b44a", 0, 0.62, 0.64);
  return g;
}
export function sign(parent: P, text: string, w: number, h: number, x: number, y: number, z: number, rotY = 0, bg = "#17a493", fg = "#ffffff") {
  const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * (h / w));
  const g2 = c.getContext("2d")!; g2.fillStyle = bg; g2.fillRect(0, 0, c.width, c.height); g2.fillStyle = fg; g2.font = `700 ${Math.round(c.height * 0.5)}px system-ui, sans-serif`; g2.textAlign = "center"; g2.textBaseline = "middle"; g2.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); m.position.set(x, y, z); m.rotation.y = rotY; parent.add(m);
  return m;
}
export function board(parent: P, x: number, y: number, z: number, w: number, h: number, rotY = 0, color = "#b9773d") {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
  box(g, w + 0.16, h + 0.16, 0.06, "#8a5528", 0, -h / 2 - 0.08, 0); box(g, w, h, 0.04, color, 0, -h / 2, 0.03);
  const cols = ["#ffd34a", "#7fd4a0", "#ff9aa8", "#fff"]; for (let i = 0; i < 6; i++) box(g, 0.28, 0.2, 0.01, cols[i % 4]!, -w / 2 + 0.3 + (i % 3) * (w / 3.4), -0.3 - Math.floor(i / 3) * 0.42, 0.06);
  return g;
}

/* ───────────── pessoas ───────────── */
export function person(look: Look, o: { sit?: boolean; scale?: number } = {}): THREE.Group {
  const g = new THREE.Group(); const s = (o.scale ?? 1) * (look.idade > 60 ? 0.96 : 1) * look.rosto * 0.98; g.scale.setScalar(s);
  const skin = look.pele, cloth = look.roupa, pants = look.roupaTipo === "terno" || look.roupaTipo === "blazer" ? "#2a3150" : look.roupaTipo === "jaleco" ? "#3b6f8f" : "#3a4268";
  const legH = o.sit ? 0.38 : 0.82;
  if (o.sit) { box(g, 0.2, 0.2, 0.5, pants, -0.14, 0.42, 0.14); box(g, 0.2, 0.2, 0.5, pants, 0.14, 0.42, 0.14); box(g, 0.18, 0.46, 0.18, pants, -0.14, 0, 0.36); box(g, 0.18, 0.46, 0.18, pants, 0.14, 0, 0.36); }
  else { box(g, 0.2, legH, 0.22, pants, -0.14, 0, 0); box(g, 0.2, legH, 0.22, pants, 0.14, 0, 0); box(g, 0.22, 0.1, 0.32, "#23283a", -0.14, 0, 0.04); box(g, 0.22, 0.1, 0.32, "#23283a", 0.14, 0, 0.04); }
  const ty = o.sit ? 0.52 : legH;
  const torso = box(g, 0.56, 0.7, 0.32, cloth, 0, ty, 0);
  if (look.roupaTipo === "terno" || look.roupaTipo === "blazer") { box(g, 0.14, 0.56, 0.02, "#f4f6fb", 0, ty + 0.1, 0.17); box(g, 0.07, 0.46, 0.03, "#c4262e", 0, ty + 0.08, 0.18); }
  else if (look.roupaTipo === "jaleco") box(g, 0.18, 0.6, 0.02, look.roupa2, 0, ty + 0.08, 0.17);
  else box(g, 0.34, 0.1, 0.02, look.roupa2, 0, ty + 0.58, 0.17);
  box(g, 0.14, 0.6, 0.16, cloth, -0.36, ty + 0.04, o.sit ? 0.1 : 0); box(g, 0.14, 0.6, 0.16, cloth, 0.36, ty + 0.04, o.sit ? 0.1 : 0);
  box(g, 0.11, 0.12, 0.12, skin, -0.36, ty - 0.06, o.sit ? 0.18 : 0); box(g, 0.11, 0.12, 0.12, skin, 0.36, ty - 0.06, o.sit ? 0.18 : 0);
  box(g, 0.14, 0.1, 0.14, skin, 0, ty + 0.7, 0);
  const hy = ty + 1.04;
  ball(g, 0.27, skin, 0, hy, 0);
  ball(g, 0.035, "#1a1210", -0.1, hy + 0.03, 0.245); ball(g, 0.035, "#1a1210", 0.1, hy + 0.03, 0.245);
  box(g, 0.1, 0.02, 0.02, darken(skin, 0.4), 0, hy - 0.11, 0.26);
  const hair = look.cabelo;
  switch (look.cabeloEstilo) {
    case "careca": break;
    case "coque": ball(g, 0.29, hair, 0, hy + 0.07, -0.03).scale.set(0.29, 0.22, 0.29); ball(g, 0.13, hair, 0, hy + 0.3, -0.05); break;
    case "cacheado": ball(g, 0.3, hair, 0, hy + 0.12, -0.1).scale.set(0.33, 0.27, 0.3); break;
    case "bob": case "liso": ball(g, 0.3, hair, 0, hy + 0.07, -0.04).scale.set(0.31, 0.26, 0.31); box(g, 0.6, 0.4, 0.1, hair, 0, hy - 0.3, -0.2); break;
    case "branco": case "ralo": ball(g, 0.285, "#d8dadf", 0, hy + 0.08, -0.03).scale.set(0.29, 0.2, 0.29); break;
    default: ball(g, 0.29, hair, 0, hy + 0.08, -0.03).scale.set(0.29, 0.22, 0.29);
  }
  if (look.barba === "bigode") box(g, 0.2, 0.05, 0.04, hair, 0, hy - 0.07, 0.265);
  if (look.oculos) { box(g, 0.34, 0.012, 0.02, "#2a2018", 0, hy + 0.03, 0.27); box(g, 0.12, 0.1, 0.02, "#bfe3ff", -0.1, hy + 0.03, 0.27, { transparent: true, opacity: 0.5 }); box(g, 0.12, 0.1, 0.02, "#bfe3ff", 0.1, hy + 0.03, 0.27, { transparent: true, opacity: 0.5 }); }
  void torso;
  bakeGroup(g, g);
  return g;
}
export const extraLook = (c: string, skin: string, hair = "#2a1d14"): Look => ({ pele: skin, peleSombra: darken(skin, 0.2), cabelo: hair, cabeloEstilo: "curto", roupa: c, roupa2: lighten(c, 0.4), roupaTipo: "camisa", idade: 35, olhos: "#222", rosto: 1 });
