import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Look } from "../../../content/types";
import { darken, lighten, lipColor } from "../../art/color";
import { gauss, poreBump, smooth } from "../common";
import { grain, hair as hairTex, iris, weave } from "./tex";

/**
 * Personagem de corpo inteiro do ESTUDO VISUAL (proposta, não usada no jogo).
 * Cabeça esculpida por funções sobre uma esfera densa, olhos com íris/pálpebras, mãos com dedos articulados, roupas em camadas
 * (paletó com lapelas, camisa, gravata), sapatos de couro e acessórios. As três direções compartilham a construção e mudam
 * proporções, exagero da caricatura e materiais.
 */
export type Estilo = "a" | "b" | "c";
export type Pose = "discurso" | "cafezinho" | "prancheta" | "parado";

interface Prop {
  R: number;          // raio vertical da cabeça (m)
  perna: number;      // altura do quadril
  tronco: number;     // quadril → ombro
  largura: number;    // multiplicador de largura do corpo
  barriga: number;    // exagero da barriga
  olho: number;       // tamanho dos olhos
  nariz: number;      // tamanho do nariz
  dedos: 4 | 5;
  braco: [number, number]; // braço, antebraço
  membro: number;     // raio de braço/perna
  mao: number;        // escala da mão
  caricatura: number; // 0..1 exagero das expressões
}
const PROP: Record<Estilo, Prop> = {
  a: { R: 0.2, perna: 0.46, tronco: 0.44, largura: 1.35, barriga: 1.55, olho: 1.55, nariz: 1.7, dedos: 4, braco: [0.22, 0.2], membro: 0.07, mao: 1.7, caricatura: 1 },
  b: { R: 0.118, perna: 0.9, tronco: 0.56, largura: 1, barriga: 1.15, olho: 1, nariz: 1, dedos: 5, braco: [0.3, 0.27], membro: 0.048, mao: 1, caricatura: 0.35 },
  c: { R: 0.118, perna: 0.9, tronco: 0.56, largura: 1, barriga: 1.15, olho: 1, nariz: 1, dedos: 5, braco: [0.3, 0.27], membro: 0.048, mao: 1, caricatura: 0.35 },
};

/* ───────────── materiais ───────────── */
function mSkin(e: Estilo, cor: string) {
  const c = new THREE.Color(cor);
  if (e === "a") c.offsetHSL(0, 0.06, 0.02);
  return new THREE.MeshPhysicalMaterial({
    color: c, roughness: e === "a" ? 0.5 : 0.55, sheen: e === "a" ? 0.45 : 0.3, sheenRoughness: 0.5, sheenColor: c.clone().lerp(new THREE.Color("#ffd2b8"), 0.35),
    clearcoat: e === "a" ? 0.12 : 0.06, clearcoatRoughness: 0.55, emissive: c.clone().multiplyScalar(e === "a" ? 0.06 : 0.035),
    ...(e === "a" ? {} : { bumpMap: poreBump(), bumpScale: 0.25 }),
  });
}
function mCloth(e: Estilo, cor: string, tipo: "la" | "algodao" | "jaleco" = "algodao") {
  const c = new THREE.Color(cor); if (e === "a") c.offsetHSL(0, 0.05, 0.02);
  const t = weave(tipo === "la" ? 1 : 0.6);
  return new THREE.MeshPhysicalMaterial({
    color: c, roughness: tipo === "la" ? 0.78 : 0.86, sheen: tipo === "la" ? 0.7 : 0.35, sheenRoughness: 0.7, sheenColor: c.clone().lerp(new THREE.Color("#ffffff"), 0.35),
    bumpMap: t, bumpScale: e === "a" ? 0.12 : 0.55,
  });
}
const mLeather = (e: Estilo, cor = "#2a1a14") => new THREE.MeshPhysicalMaterial({ color: cor, roughness: e === "a" ? 0.3 : 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, bumpMap: grain(), bumpScale: e === "a" ? 0.05 : 0.2 });
const mGold = () => new THREE.MeshStandardMaterial({ color: "#e0b04a", metalness: 1, roughness: 0.22 });
function mHair(e: Estilo, cor: string, gel = false) {
  return new THREE.MeshPhysicalMaterial({
    color: e === "a" ? new THREE.Color(cor).offsetHSL(0, 0.04, 0.03) : "#ffffff", map: e === "a" ? null : hairTex(cor), roughness: gel ? 0.42 : 0.6,
    clearcoat: gel ? 0.35 : 0.08, clearcoatRoughness: 0.3, sheen: 0.12, sheenColor: lighten(cor, 0.12), bumpMap: e === "a" ? null : hairTex(cor), bumpScale: 0.6,
  });
}

/* ───────────── utilidades ───────────── */
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
/** Tubo que afina nas pontas (sobrancelha, bigode, lábios): esferas alongadas ao longo de uma curva, unidas visualmente. */
function strand(parent: THREE.Object3D, pts: THREE.Vector3[], r0: number, r1: number, mat: THREE.Material, n = 14, achata = 0.7) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.Group(); parent.add(g);
  const geo = new THREE.SphereGeometry(1, 20, 14);
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const r = r0 + (r1 - r0) * Math.sin(Math.PI * t); // fino nas pontas
    const m = new THREE.Mesh(geo, mat); m.position.copy(p); m.scale.set(r * 1.9, r, r * achata);
    m.quaternion.setFromUnitVectors(V(1, 0, 0), tan); m.castShadow = true; g.add(m);
  }
  return g;
}
/** Tubo contínuo (lábios, colarinho). */
function tube(parent: THREE.Object3D, pts: THREE.Vector3[], r: number, mat: THREE.Material, closed = false) {
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), 48, r, 12, closed);
  return add(parent, geo, mat);
}

/* ───────────── cabeça ───────────── */
/** Deformação do crânio/rosto (coordenadas da esfera unitária → rosto). Usada pela malha e para apoiar os detalhes na superfície. */
function deformar(e: Estilo, v: THREE.Vector3, out = new THREE.Vector3()) {
  const cart = e === "a";
  const W = cart ? 0.9 : 0.8, H = cart ? 0.95 : 1.0, D = cart ? 0.9 : 0.88;
  const ax = Math.abs(v.x), front = smooth(-0.05, 0.6, v.z);
  let x = v.x * W, y = v.y * H, z = v.z * D;
  if (v.z < 0) { y *= 1.03; z *= 1.05; }
  const low = smooth(-0.1, -1, v.y);
  x *= 1 - (cart ? 0.05 : 0.2) * low;
  if (cart) x *= 1 + 0.1 * gauss(v.y + 0.4, 0.3);
  z += (cart ? 0.05 : 0.1) * gauss(v.x, 0.26) * gauss(v.y + 0.86, 0.14) * front;
  z += (cart ? 0.08 : 0.05) * gauss(ax - 0.45, 0.2) * gauss(v.y + 0.2, 0.2) * front;
  z -= (cart ? 0.015 : 0.035) * gauss(ax - 0.34, 0.12) * gauss(v.y - 0.06, 0.09) * front;
  z += 0.035 * gauss(v.y - 0.24, 0.07) * front * smooth(0, 0.3, ax + 0.1);
  return out.set(x, y, z);
}
/** Ponto da superfície do rosto na direção (x, y) da esfera unitária (lado da frente) e a normal aproximada. */
function sup(e: Estilo, x: number, y: number) {
  const z = Math.sqrt(Math.max(0.0001, 1 - x * x - y * y));
  const p = deformar(e, V(x, y, z)); const d = 0.01;
  const px = deformar(e, V(x + d, y, Math.sqrt(Math.max(0.0001, 1 - (x + d) ** 2 - y * y)))).sub(p);
  const py = deformar(e, V(x, y + d, Math.sqrt(Math.max(0.0001, 1 - x * x - (y + d) ** 2)))).sub(p);
  return { p, n: px.cross(py).normalize() };
}

/** Íris como calota esférica com UV radial (encaixa na esclera sem "flutuar"). */
function irisCap(R: number, ir: number, mat: THREE.Material) {
  const geo = new THREE.SphereGeometry(R * 1.004, 40, 16, 0, Math.PI * 2, 0, Math.asin(Math.min(0.95, ir / R)));
  const pos = geo.attributes.position!, uv = geo.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * ir) * 0.98, 0.5 + pos.getZ(i) / (2 * ir) * 0.98);
  const m = new THREE.Mesh(geo, mat); m.rotation.x = Math.PI / 2; m.castShadow = false; return m;
}

type Hair = { frente: number; lados: number; nuca: number; volume: (x: number, y: number, z: number) => number; topo?: number };
function cabeloCasca(e: Estilo, base: THREE.SphereGeometry, cfg: Hair, mat: THREE.Material) {
  const geo = base.clone(); const pos = geo.attributes.position!; const unit = (base as unknown as { _unit: Float32Array })._unit;
  const keep: boolean[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = unit[i * 3]!, y = unit[i * 3 + 1]!, z = unit[i * 3 + 2]!;
    const tz = smooth(-0.35, 0.65, z);
    let thr = cfg.nuca + (cfg.frente - cfg.nuca) * tz;
    if (Math.abs(x) > 0.55 && z > -0.45) thr = Math.min(Math.max(thr, cfg.lados), thr + 0.4);
    if (Math.abs(x) > 0.82 && y < 0.22 && y > -0.5 && z > -0.5 && cfg.lados > -0.3) thr = Math.max(thr, 0.22); // orelhas à mostra
    keep.push(y > thr && (cfg.topo === undefined || y < cfg.topo || z < -0.1));
    const k = cfg.volume(x, y, z);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  }
  const idx = geo.index!; const out: number[] = [];
  for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2); if (keep[a] && keep[b] && keep[c]) out.push(a, b, c); }
  geo.setIndex(out); geo.computeVertexNormals();
  void e;
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
}

function cabeca(look: Look, e: Estilo, P: Prop, expr: { sobrancelha: number; sorriso: number; palpebra: number }) {
  const g = new THREE.Group();
  const cart = e === "a";
  const sk = mSkin(e, look.pele);
  const geo = new THREE.SphereGeometry(1, 120, 90);
  const pos = geo.attributes.position!; const unit = new Float32Array(pos.array as Float32Array); (geo as unknown as { _unit: Float32Array })._unit = unit;
  const v = new THREE.Vector3(), o = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); deformar(e, v, o); pos.setXYZ(i, o.x, o.y, o.z); }
  geo.computeVertexNormals();
  // tons da pele por região: bochechas e nariz mais rosados; sombra de barba no queixo e buço
  const base = new THREE.Color(look.pele); if (cart) base.offsetHSL(0, 0.06, 0.02);
  const rosa = new THREE.Color("#c8584a"), barba = base.clone().lerp(new THREE.Color("#3a3a44"), 0.5);
  const cols = new Float32Array(pos.count * 3); const cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = unit[i * 3]!, y = unit[i * 3 + 1]!, z = unit[i * 3 + 2]!, fr = smooth(0, 0.6, z);
    cc.copy(base).lerp(rosa, (cart ? 0.26 : 0.16) * gauss(Math.abs(x) - 0.45, 0.17) * gauss(y + 0.22, 0.16) * fr);
    if (look.barba) cc.lerp(barba, 0.22 * fr * Math.max(smooth(-0.45, -0.85, y) * smooth(0.95, 0.5, Math.abs(x)), gauss(x, 0.3) * gauss(y + 0.48, 0.07)));
    cols[i * 3] = cc.r; cols[i * 3 + 1] = cc.g; cols[i * 3 + 2] = cc.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const skv = mSkin(e, "#ffffff"); skv.vertexColors = true; skv.emissive = base.clone().multiplyScalar(cart ? 0.06 : 0.035); skv.sheenColor = base.clone().lerp(new THREE.Color("#ffd2b8"), 0.35);
  add(g, geo, skv);
  // nariz: ponte + ponta (+ asas), apoiados na superfície
  const nk = P.nariz;
  const nb = sup(e, 0, -0.12), nt = sup(e, 0, -0.34);
  const ponte = add(g, new THREE.SphereGeometry(1, 40, 28), sk, 0, (nb.p.y + nt.p.y) / 2 + 0.02, (nb.p.z + nt.p.z) / 2 - 0.02);
  ponte.scale.set(0.075 * nk, 0.2 * (cart ? 0.9 : 1), 0.1 * nk); ponte.rotation.x = -0.3;
  add(g, new THREE.SphereGeometry(0.08 * nk, 32, 24), sk, 0, nt.p.y + 0.01, nt.p.z + (cart ? 0.06 : 0.035));
  for (const s of [-1, 1]) { const a = add(g, new THREE.SphereGeometry(1, 24, 16), sk, s * 0.075 * nk, nt.p.y - 0.035, nt.p.z - 0.015); a.scale.set(0.055 * nk, 0.045, 0.05); }
  // orelhas
  for (const s of [-1, 1]) { const q = deformar(e, V(s * 0.995, 0, -0.05)); const or = add(g, new THREE.SphereGeometry(1, 28, 20), sk, q.x + s * 0.015, -0.04, q.z - 0.02); or.scale.set(0.07, cart ? 0.22 : 0.2, 0.14); or.rotation.y = s * 0.4; }
  // olhos: esclera embutida na órbita, íris em calota, pálpebras
  const eyeR = (cart ? 0.165 : 0.12) * (cart ? 1 : P.olho);
  const sclera = new THREE.MeshPhysicalMaterial({ color: "#f6f2ec", roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04 });
  const irisM = new THREE.MeshPhysicalMaterial({ map: iris(look.olhos), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 });
  const lid = mSkin(e, look.pele);
  for (const s of [-1, 1]) {
    const so = sup(e, s * (cart ? 0.33 : 0.32), cart ? 0.08 : 0.06);
    const c = so.p.clone().addScaledVector(so.n, -eyeR * (cart ? 0.35 : 0.5));
    const eg = new THREE.Group(); eg.position.copy(c); eg.rotation.y = s * 0.1; g.add(eg);
    add(eg, new THREE.SphereGeometry(eyeR, 40, 28), sclera);
    const ic = irisCap(eyeR, eyeR * (cart ? 0.6 : 0.5), irisM); ic.rotation.y = -s * 0.08; ic.rotation.x = Math.PI / 2 + 0.06; eg.add(ic);
    if (cart) { const hl = add(eg, new THREE.SphereGeometry(eyeR * 0.13, 12, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" }), eyeR * 0.25, eyeR * 0.28, eyeR * 0.97); hl.castShadow = false; }
    const up = add(eg, new THREE.SphereGeometry(eyeR * 1.06, 40, 16, 0, Math.PI * 2, 0, Math.PI * 0.36), lid); up.rotation.x = 0.12 + expr.palpebra; up.rotation.z = -s * 0.06;
    const lo = add(eg, new THREE.SphereGeometry(eyeR * 1.04, 40, 10, 0, Math.PI * 2, Math.PI * 0.76, Math.PI * 0.24), lid); lo.rotation.x = -0.1;
    // linha de cílios (contorno superior)
    const cil = add(eg, new THREE.TorusGeometry(eyeR * 1.02, eyeR * 0.05, 8, 40, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: "#1b1310", roughness: 0.6 }), 0, 0, 0);
    cil.rotation.set(Math.PI / 2 - 1.0 - expr.palpebra, 0, Math.PI * 0.05); cil.position.set(0, eyeR * 0.02, eyeR * 0.02);
  }
  // sobrancelhas: apoiadas na arcada; a direita arqueada (ironia)
  const hm = mHair(e, look.cabelo);
  for (const s of [-1, 1]) {
    const lift = s > 0 ? expr.sobrancelha : 0, by = (cart ? 0.29 : 0.25) + lift;
    const pts = [-0.12, -0.27, -0.44].map((xx, i) => { const q = sup(e, s * -xx, by + (i === 1 ? 0.035 + lift * 0.3 : 0)); return q.p.clone().addScaledVector(q.n, 0.02); });
    strand(g, pts, cart ? 0.026 : 0.016, cart ? 0.045 : 0.027, hm, 12, 0.55);
  }
  // boca: linha + lábio inferior, sorriso de canto
  const sm = expr.sorriso, my = cart ? -0.56 : -0.58;
  const bocaPts = (dy: number, off: number) => [-0.24, -0.11, 0, 0.11, 0.25].map((xx) => { const cy = my + dy + (xx < 0 ? 0.02 * sm : 0.07 * sm) * (Math.abs(xx) / 0.25) ** 2; const q = sup(e, xx, cy); return q.p.clone().addScaledVector(q.n, off); });
  tube(g, bocaPts(0, 0.008), cart ? 0.014 : 0.009, new THREE.MeshStandardMaterial({ color: darken(look.pele, 0.62), roughness: 0.8 }));
  const lip = new THREE.MeshPhysicalMaterial({ color: lipColor(look.pele), roughness: 0.38, clearcoat: 0.35, sheen: 0.3 });
  strand(g, bocaPts(-0.05, 0.012).slice(1, 4), cart ? 0.02 : 0.013, cart ? 0.034 : 0.022, lip, 10, 0.6);
  if (!cart) strand(g, bocaPts(0.022, 0.008).slice(1, 4), 0.008, 0.012, lip, 10, 0.5);
  // bigode farto (sátira) acompanhando o rosto
  if (look.barba === "bigode") {
    const k = cart ? 1.35 : 1;
    const pts = [-0.36, -0.2, 0, 0.2, 0.37].map((xx) => { const q = sup(e, xx, -0.44 + (Math.abs(xx) > 0.3 ? 0.06 : 0)); return q.p.clone().addScaledVector(q.n, 0.045 * k); });
    strand(g, pts, 0.03 * k, 0.062 * k, mHair(e, look.cabelo), 22, 0.7);
  }
  // cabelo: casca que acompanha o crânio, com linha do cabelo e volume por estilo
  const hh = mHair(e, look.cabelo, look.cabeloEstilo === "penteado");
  const vol = (b: number, topo = 0) => (x: number, y: number, z: number) => b + topo * smooth(0.2, 1, y) * smooth(-0.2, 0.6, z) + 0.004 * Math.sin(x * 40 + y * 30);
  const H: Partial<Record<Look["cabeloEstilo"], Hair>> = {
    penteado: { frente: 0.64, lados: 0.1, nuca: -0.62, volume: vol(1.045, 0.08) },
    curto: { frente: 0.5, lados: 0.05, nuca: -0.6, volume: vol(1.04, 0.03) },
    topete: { frente: 0.46, lados: 0.05, nuca: -0.6, volume: vol(1.05, 0.1) },
    coque: { frente: 0.48, lados: 0.05, nuca: -0.55, volume: vol(1.035) },
    liso: { frente: 0.45, lados: -0.75, nuca: -0.95, volume: vol(1.05) },
    bob: { frente: 0.45, lados: -0.6, nuca: -0.85, volume: vol(1.06) },
    cacheado: { frente: 0.42, lados: -0.1, nuca: -0.7, volume: (x, y, z) => 1.12 + 0.04 * Math.sin(x * 22) * Math.sin(y * 19) * Math.sin(z * 21) },
    ralo: { frente: 0.2, lados: -0.05, nuca: -0.55, topo: 0.55, volume: vol(1.03) },
    branco: { frente: 0.2, lados: -0.05, nuca: -0.55, topo: 0.6, volume: vol(1.035) },
  };
  const cfg = H[look.cabeloEstilo];
  if (cfg) g.add(cabeloCasca(e, geo, cfg, hh));
  if (look.cabeloEstilo === "coque") { const q = deformar(e, V(0, 0.55, -0.8)); add(g, new THREE.SphereGeometry(0.27, 32, 24), hh, q.x, q.y + 0.05, q.z - 0.1); }
  if (look.cabeloEstilo === "penteado") { const q = deformar(e, V(-0.1, 0.78, 0.55).normalize()); const onda = add(g, new THREE.SphereGeometry(1, 40, 24), hh, q.x, q.y + 0.02, q.z - 0.06); onda.scale.set(0.5, 0.14, 0.32); onda.rotation.set(-0.45, 0.1, 0.12); }
  g.scale.setScalar(P.R);
  return g;
}

/* ───────────── mãos ───────────── */
function mao(e: Estilo, P: Prop, skin: THREE.Material, curl: number[], polegar = 0.4) {
  const g = new THREE.Group(); const k = P.mao;
  const palma = add(g, new RoundedBoxGeometry(0.075 * k, 0.085 * k, 0.03 * k, 3, 0.012 * k), skin, 0, -0.045 * k, 0);
  palma.scale.set(1, 1, P.dedos === 4 ? 1.25 : 1);
  const n = P.dedos, larg = 0.075 * k, rr = (P.dedos === 4 ? 0.013 : 0.0085) * k;
  const lens = n === 4 ? [0.042, 0.048, 0.046, 0.038] : [0.04, 0.046, 0.044, 0.036];
  for (let i = 0; i < 4; i++) {
    const x = -larg / 2 + larg * (i + 0.5) / 4;
    let parent: THREE.Object3D = g; let y = -0.088 * k;
    for (let seg = 0; seg < 2; seg++) {
      const j = new THREE.Group(); j.position.set(seg === 0 ? x : 0, y, 0); j.rotation.x = (curl[i] ?? 0) * (seg === 0 ? 0.9 : 1.3); parent.add(j);
      const L = lens[i]! * k * (seg === 0 ? 0.55 : 0.45);
      add(j, new THREE.CapsuleGeometry(rr, L, 6, 12), skin, 0, -L / 2 - rr * 0.4, 0);
      parent = j; y = -L - rr * 0.6;
    }
  }
  // polegar
  const t = new THREE.Group(); t.position.set(larg * 0.5, -0.03 * k, 0.012 * k); t.rotation.set(0.5 + polegar, 0, -0.6); g.add(t);
  add(t, new THREE.CapsuleGeometry(rr * 1.1, 0.03 * k, 6, 12), skin, 0, -0.022 * k, 0);
  return g;
}

/** Faixa sobre a frente do tronco (seção elíptica): meia-largura w(u), raio R(u) do tronco, achatamento zs, deslocamento e centro x(u). */
function faixa(u0: number, u1: number, w: (u: number) => number, R: (u: number) => number, zs: number, off: number, tronco: number, cx: (u: number) => number = () => 0) {
  const nu = 24, nx = 8, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nu; i++) {
    const u = u0 + (u1 - u0) * (i / nu), hw = Math.max(0.0005, w(u)), rr = R(u);
    for (let j = 0; j <= nx; j++) { const x = cx(u) + hw * (j / nx * 2 - 1); const z = zs * Math.sqrt(Math.max(0, rr * rr - x * x)) + off; pos.push(x, u * tronco, z); }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nx; j++) { const a = i * (nx + 1) + j, b = a + nx + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/* ───────────── corpo ───────────── */
export interface Personagem { root: THREE.Group; cabeca: THREE.Group; altura: number }

export function buildPersonagem(look: Look, e: Estilo, pose: Pose): Personagem {
  const P = PROP[e]; const root = new THREE.Group();
  const cart = e === "a";
  const skin = mSkin(e, look.pele);
  const terno = look.roupaTipo === "terno" || look.roupaTipo === "blazer";
  const jaleco = look.roupaTipo === "jaleco";
  const clothTop = mCloth(e, jaleco ? look.roupa2 : look.roupa, terno ? "la" : jaleco ? "jaleco" : "algodao");
  const calca = mCloth(e, terno ? look.roupa : jaleco ? look.roupa : "#3a4268", terno ? "la" : "algodao");
  const camisa = mCloth(e, terno ? "#f4f6fb" : look.roupa2, "algodao");
  const hip = P.perna, sh = hip + P.tronco, Lw = P.largura;
  const r = P.membro;

  // pernas
  for (const s of [-1, 1]) {
    const x = s * 0.1 * Lw * (cart ? 1.15 : 1);
    const coxa = P.perna * 0.5, canela = P.perna * 0.45;
    add(root, new THREE.CapsuleGeometry(r * 1.45 * (cart ? 1.1 : 1), coxa, 8, 20), calca, x, hip - coxa / 2, 0);
    add(root, new THREE.CapsuleGeometry(r * 1.2 * (cart ? 1.1 : 1), canela, 8, 20), calca, x, hip - coxa - canela / 2 + 0.01, 0.005);
    // sapato de couro: bico arredondado + sola
    const sap = new THREE.Group(); sap.position.set(x, 0, 0.04); root.add(sap);
    const bico = add(sap, new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), mLeather(e), 0, 0.02, 0.02); bico.scale.set(0.058 * (cart ? 1.5 : 1), 0.07 * (cart ? 1.3 : 1), 0.135 * (cart ? 1.3 : 1));
    add(sap, new RoundedBoxGeometry(0.12 * (cart ? 1.5 : 1), 0.022, 0.3 * (cart ? 1.3 : 1), 2, 0.008), new THREE.MeshStandardMaterial({ color: "#1a1210", roughness: 0.7 }), 0, 0.011, 0.02);
  }
  // tronco (lathe: quadril → cintura/barriga → peito → ombros)
  const radAt = (u: number, k: number) => {
    const uu = Math.min(1, Math.max(0, u));
    let rad = 0.165 + 0.02 * Math.sin(uu * Math.PI) + 0.05 * gauss(u - 0.32, 0.17) * (P.barriga - 1) * 2.4 + 0.04 * smooth(0.55, 0.88, u);
    rad *= 1 - 0.42 * smooth(0.9, 1.0, u); if (u < 0) rad *= 1 + 0.1 * smooth(0, -0.4, u);
    return rad * Lw * k;
  };
  const prof = (k: number, comp = 0) => {
    const pts: THREE.Vector2[] = []; const N = 30;
    for (let i = 0; i <= N; i++) { const y = -comp + (P.tronco + comp) * (i / N); pts.push(new THREE.Vector2(Math.max(0.02, radAt(y / P.tronco, k)), y)); }
    pts.push(new THREE.Vector2(0.065 * Lw * k, P.tronco + 0.012)); pts.push(new THREE.Vector2(0.001, P.tronco + 0.014)); return pts;
  };
  const zs = 0.68; // achata o tronco na profundidade
  const tronco = add(root, new THREE.LatheGeometry(prof(1, 0.04), 56), terno || jaleco ? camisa : clothTop, 0, hip, 0); tronco.scale.z = zs;
  const frente = (t: number, k = 1) => radAt(t, k) * zs;
  // linha dos ombros contínua (sem "bolhas")
  const ombros = add(root, new THREE.CapsuleGeometry(r * 1.32, 0.36 * Lw, 10, 24), terno || jaleco ? clothTop : clothTop, 0, sh - 0.045, -0.005); ombros.rotation.z = Math.PI / 2; ombros.scale.z = 0.85;
  if (terno) {
    const pal = add(root, new THREE.LatheGeometry(prof(1.06, 0.16), 48), clothTop, 0, hip, 0); pal.scale.z = zs;
    // abertura em V, gravata e lapelas: faixas que acompanham a curva do paletó (não "flutuam" sobre a barriga)
    const ty = P.tronco, KJ = 1.06;
    add(root, faixa(0.44, 0.95, (u) => 0.082 * Lw * smooth(0.44, 0.99, u), (u) => frente(u, KJ) / zs, zs, 0.007, ty), camisa, 0, hip, 0);
    const grav = new THREE.MeshPhysicalMaterial({ color: "#b0182a", roughness: 0.35, sheen: 0.8, sheenColor: "#ff8090", side: THREE.DoubleSide });
    add(root, faixa(0.4, 0.92, (u) => (0.014 + 0.024 * smooth(0.92, 0.5, u) - 0.026 * smooth(0.46, 0.4, u)) * Lw, (u) => frente(u, KJ) / zs, zs, 0.009, ty), grav, 0, hip, 0);
    const no = add(root, new THREE.SphereGeometry(0.022 * Lw, 20, 14), grav, 0, hip + ty * 0.94, frente(0.94, KJ) + 0.014); no.scale.set(1.15, 1, 0.7);
    add(root, new RoundedBoxGeometry(0.065 * Lw, 0.008, 0.008, 2, 0.003), mGold(), 0, hip + ty * 0.68, frente(0.68, KJ) + 0.016);
    const lapela = mCloth(e, darken(look.roupa, 0.14), "la"); (lapela as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
    for (const s of [-1, 1]) add(root, faixa(0.42, 0.95, (u) => 0.03 * Lw * (0.6 + smooth(0.5, 0.85, u)), (u) => frente(u, KJ) / zs, zs, 0.006, ty, (u) => s * (0.082 * Lw * smooth(0.44, 0.99, u) + 0.03 * Lw * (0.6 + smooth(0.5, 0.85, u)) * 0.7)), lapela, 0, hip, 0);
    // botões e broche
    for (let i = 0; i < 2; i++) add(root, new THREE.CylinderGeometry(0.011, 0.011, 0.006, 16), new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.3 }), 0, hip + P.tronco * (0.36 - i * 0.12), frente(0.36 - i * 0.12, 1.06) + 0.004).rotation.x = Math.PI / 2;
    add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16), mGold(), -0.11 * Lw, hip + P.tronco * 0.78, frente(0.78, 1.06) + 0.004).rotation.x = Math.PI / 2;
  } else if (jaleco) {
    const coat = add(root, new THREE.LatheGeometry(prof(1.08, 0.42), 48), clothTop, 0, hip, 0); coat.scale.z = zs;
    const scrub = mCloth(e, look.roupa, "algodao");
    const vShape = new THREE.Shape(); vShape.moveTo(-0.08, P.tronco * 0.98); vShape.lineTo(0.08, P.tronco * 0.98); vShape.lineTo(0, P.tronco * 0.55); vShape.closePath();
    void vShape; add(root, faixa(0.55, 0.99, (u) => 0.085 * smooth(0.55, 0.99, u), (u) => frente(u, 1.08) / zs, zs, 0.004, P.tronco), scrub, 0, hip, 0);
    add(root, new RoundedBoxGeometry(0.09, 0.07, 0.01, 2, 0.004), clothTop, 0.1, hip + P.tronco * 0.62, frente(0.62, 1.08) + 0.004);
    add(root, new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8), new THREE.MeshStandardMaterial({ color: "#2a5be0" }), 0.11, hip + P.tronco * 0.66, frente(0.66, 1.08) + 0.012);
  } else {
    // camisa: colarinho e botões
    for (let i = 0; i < 4; i++) add(root, new THREE.CylinderGeometry(0.007, 0.007, 0.004, 12), new THREE.MeshStandardMaterial({ color: "#f4f0e6", roughness: 0.3 }), 0, hip + P.tronco * (0.85 - i * 0.18), frente(0.85 - i * 0.18) + 0.004).rotation.x = Math.PI / 2;
    add(root, new RoundedBoxGeometry(0.08, 0.07, 0.008, 2, 0.003), mCloth(e, darken(look.roupa, 0.08)), -0.1, hip + P.tronco * 0.7, frente(0.7) + 0.003);
  }
  // cinto
  const cinto = add(root, new THREE.TorusGeometry(0.168 * Lw * (1 + 0.02), 0.018, 10, 48), mLeather(e, "#1d1410"), 0, hip, 0); cinto.rotation.x = Math.PI / 2; cinto.scale.y = zs;
  if (!terno && !jaleco) add(root, new RoundedBoxGeometry(0.05, 0.035, 0.012, 2, 0.004), mGold(), 0, hip, 0.168 * Lw * zs + 0.012);
  // pescoço, colarinho e cabeça
  const neckH = cart ? 0.03 : 0.05;
  add(root, new THREE.CylinderGeometry(0.052 * (cart ? 1.4 : 1), 0.06 * (cart ? 1.4 : 1), neckH + 0.04, 24), skin, 0, sh + neckH / 2 - 0.01, 0);
  const col = add(root, new THREE.CylinderGeometry(0.066 * (cart ? 1.4 : 1), 0.072 * (cart ? 1.4 : 1), 0.045, 28, 1, true), camisa, 0, sh + 0.025, 0.004); (col.material as THREE.Material).side = THREE.DoubleSide;
  const expr = look.barba === "bigode" ? { sobrancelha: 0.06 * (0.5 + P.caricatura), sorriso: 0.9, palpebra: 0.08 } : { sobrancelha: 0.01, sorriso: 0.6, palpebra: 0 };
  const head = cabeca(look, e, P, expr);
  head.position.set(0, sh + neckH + P.R * 0.92, 0.01); root.add(head);

  // braços: ombro → cotovelo → punho → mão (poses)
  const POSES: Record<Pose, Array<{ ab: number; fl: number; tw: number; cot: number; cz?: number; curl: number[]; pol?: number }>> = {
    discurso: [{ ab: 0.12, fl: 0.15, tw: 0, cot: 0.25, curl: [0.5, 0.6, 0.7, 0.7] }, { ab: 1.0, fl: 0.25, tw: 0, cot: 0.25, cz: 1.75, curl: [0, 1.3, 1.4, 1.4], pol: 0.9 }],
    cafezinho: [{ ab: 0.1, fl: 0.1, tw: 0, cot: 0.2, curl: [0.5, 0.6, 0.6, 0.7] }, { ab: 0.15, fl: 0.5, tw: -0.2, cot: 1.45, curl: [0.9, 1, 1.1, 1.1] }],
    prancheta: [{ ab: 0.15, fl: 0.5, tw: 0.4, cot: 1.5, curl: [0.4, 0.4, 0.5, 0.5] }, { ab: 0.15, fl: 0.5, tw: -0.4, cot: 1.5, curl: [0.4, 0.4, 0.5, 0.5] }],
    parado: [{ ab: 0.1, fl: 0.05, tw: 0, cot: 0.2, curl: [0.5, 0.6, 0.6, 0.7] }, { ab: 0.1, fl: 0.05, tw: 0, cot: 0.2, curl: [0.5, 0.6, 0.6, 0.7] }],
  };
  const braco = mCloth(e, jaleco ? look.roupa2 : look.roupa, terno ? "la" : "algodao");
  const maos: THREE.Group[] = [];
  POSES[pose].forEach((p, i) => {
    const s = i === 0 ? -1 : 1; // 0 = esquerdo, 1 = direito
    const ombro = new THREE.Group(); ombro.position.set(s * (0.19 * Lw + r * 0.5), sh - 0.05, 0); ombro.rotation.set(-p.fl, s * p.tw, s * p.ab); root.add(ombro);
    add(ombro, new THREE.SphereGeometry(r * 1.3, 24, 16), braco);
    const [L1, L2] = P.braco;
    add(ombro, new THREE.CapsuleGeometry(r * 1.25, L1, 8, 20), braco, 0, -L1 / 2, 0);
    const cot = new THREE.Group(); cot.position.y = -L1; cot.rotation.set(-p.cot, 0, s * (p.cz ?? 0)); ombro.add(cot);
    add(cot, new THREE.SphereGeometry(r * 1.1, 20, 14), braco); add(cot, new THREE.CylinderGeometry(r * 1.1, r * 1.02, L2, 24), braco, 0, -L2 / 2, 0);
    // punho da camisa e relógio de ouro (só o esquerdo)
    const pun = add(cot, new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.03, 24), camisa, 0, -L2 - 0.012, 0); void pun;
    if (s < 0 && terno) { const rel = add(cot, new THREE.TorusGeometry(r * 0.95, 0.009, 10, 28), mGold(), 0, -L2 + 0.03, 0); rel.rotation.x = Math.PI / 2; add(cot, new THREE.CylinderGeometry(0.018, 0.018, 0.008, 24), mGold(), 0, -L2 + 0.03, r * 0.95).rotation.x = Math.PI / 2; }
    const m = mao(e, P, skin, p.curl, p.pol); m.position.y = -L2 - 0.03; m.rotation.y = s * 0.15; cot.add(m); maos.push(m);
  });
  // acessórios por pose
  if (pose === "cafezinho") {
    const xic = new THREE.Group(); xic.position.set(0, -0.09 * P.mao, 0.05 * P.mao); maos[1]!.add(xic);
    add(xic, new THREE.CylinderGeometry(0.03 * P.mao, 0.024 * P.mao, 0.05 * P.mao, 24), new THREE.MeshPhysicalMaterial({ color: "#fbfbf8", roughness: 0.15, clearcoat: 1 }));
    add(xic, new THREE.CylinderGeometry(0.026 * P.mao, 0.026 * P.mao, 0.004, 24), new THREE.MeshStandardMaterial({ color: "#3a2010", roughness: 0.2 }), 0, 0.022 * P.mao, 0);
  }
  if (pose === "prancheta") {
    const pr = new THREE.Group(); pr.position.set(0, sh - 0.2 * (cart ? 0.7 : 1), 0.2 * Lw); pr.rotation.x = -0.5; root.add(pr);
    add(pr, new RoundedBoxGeometry(0.24 * (cart ? 1.3 : 1), 0.32 * (cart ? 1.3 : 1), 0.012, 2, 0.006), new THREE.MeshStandardMaterial({ color: "#8a5a34", roughness: 0.6 }));
    add(pr, new THREE.PlaneGeometry(0.21 * (cart ? 1.3 : 1), 0.27 * (cart ? 1.3 : 1)), new THREE.MeshStandardMaterial({ color: "#fbfaf6", roughness: 0.9 }), 0, -0.01, 0.007);
    add(pr, new RoundedBoxGeometry(0.08, 0.03, 0.02, 2, 0.006), new THREE.MeshStandardMaterial({ color: "#c8ccd4", metalness: 0.8, roughness: 0.3 }), 0, 0.15 * (cart ? 1.3 : 1), 0.01);
  }
  const altura = sh + neckH + P.R * 2;
  return { root, cabeca: head, altura };
}

/** Sombra de contato (oclusão sob os pés): disco com gradiente, reforça o apoio no chão. */
export function contato(w: number, d: number): THREE.Mesh {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.003; m.renderOrder = 1; return m;
}
