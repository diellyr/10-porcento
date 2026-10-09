import * as THREE from "three";
import type { Look } from "../../content/types";
import type { Emotion } from "../../engine/types";
import { EXPR } from "../art/expr";
import { darken, lighten, lipColor, mix } from "../art/color";
import { gauss, lerp, smooth } from "./common";
import type { Quality } from "./support";

/**
 * Busto 3D PROCEDURAL de MEUS 10%.
 * A cabeça é uma malha orgânica esculpida por funções (testa, arcada, órbitas, nariz, maçãs, lábios, queixo), com cor por
 * vértice, olhos com textura de íris, pálpebras que piscam, sobrancelhas, boca com lábios/dentes/língua animados por visemas,
 * cabelo em cascas modeladas, óculos e roupa. Usa os MESMOS parâmetros de identidade (`Look`) do retrato 2D.
 * STATUS: recurso provisório de produção — o acabamento final depende de modelos esculpidos/riggados (veja ASSETS_PENDENTES.md).
 */
export interface BustState { emocao: Emotion; falando: boolean; nivel: number; olhar: { x: number; y: number }; reduzir: boolean }
export interface Bust { root: THREE.Group; update: (s: BustState, dt: number, t: number) => void; dispose: () => void }

const V = THREE.Vector3;
const FACE_W = 0.9, FACE_H = 1.0, FACE_D = 0.95;

function shape(p: THREE.Vector3, rosto: number, out = new V()): THREE.Vector3 {
  const front = smooth(-0.1, 0.55, p.z);
  const ax = Math.abs(p.x);
  let x = p.x * FACE_W, y = p.y * FACE_H * rosto, z = p.z * FACE_D;
  const low = smooth(-0.05, -1.0, p.y);
  x *= 1 - 0.1 * low * (0.55 + 0.45 * low);                       // mandíbula afunila até o queixo
  x *= 1 + 0.045 * gauss(p.y + 0.52, 0.2) * smooth(0.1, 0.8, ax);   // ângulo da mandíbula
  y -= 0.035 * gauss(p.x, 0.22) * gauss(p.y + 0.98, 0.12);
  z += 0.11 * gauss(p.x, 0.22) * gauss(p.y + 0.9, 0.12) * front;   // queixo
  z -= 0.028 * gauss(p.x, 0.2) * gauss(p.y + 0.78, 0.03) * front;  // sulco mentolabial
  z += 0.045 * gauss(p.y - 0.62, 0.22) * front;                     // testa
  z += 0.06 * gauss(p.y - 0.2, 0.06) * front * smooth(0.0, 0.35, ax + 0.12); // arcada
  z -= 0.07 * gauss(ax - 0.4, 0.14) * gauss(p.y + 0.0, 0.1) * front;      // órbitas
  z -= 0.03 * gauss(ax - 0.38, 0.14) * gauss(p.y + 0.12, 0.05) * front;       // olheira
  // nariz
  z += gauss(p.x, 0.1 + 0.04 * smooth(0.0, -0.4, p.y)) * (0.03 + 0.11 * smooth(0.08, -0.4, p.y)) * gauss(p.y + 0.16, 0.24) * front;
  z += 0.07 * gauss(p.x, 0.12) * gauss(p.y + 0.38, 0.07) * front;                                // ponta
  z += 0.05 * gauss(ax - 0.15, 0.055) * gauss(p.y + 0.44, 0.05) * front;                         // asas
  x += Math.sign(p.x) * 0.02 * gauss(ax - 0.15, 0.06) * gauss(p.y + 0.44, 0.05) * front;
  z -= 0.028 * gauss(p.x, 0.045) * gauss(p.y + 0.56, 0.04) * front;                              // filtro
  // maçãs do rosto e bochechas
  z += 0.09 * gauss(ax - 0.5, 0.2) * gauss(p.y + 0.2, 0.22) * front;
  // lábios
  z += 0.07 * gauss(p.x, 0.25) * gauss(p.y + 0.68, 0.085) * front;
  z -= 0.034 * gauss(p.x, 0.2) * gauss(p.y + 0.69, 0.011) * front;
  // sulco nasolabial leve
  z -= 0.018 * gauss(ax - 0.3, 0.05) * gauss(p.y + 0.52, 0.16) * front;
  return out.set(x, y, z);
}

const mk = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.6, metalness: 0, ...o });

function irisTexture(look: Look): THREE.CanvasTexture {
  const W = 1024, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f6f1ea"; g.fillRect(0, 0, W, H);
  const grad = g.createRadialGradient(W * 0.25, H / 2, 0, W * 0.25, H / 2, 150);
  grad.addColorStop(0, "#fffdf8"); grad.addColorStop(1, "#ece3d6"); g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(190,90,80,0.18)"; g.lineWidth = 1.2;
  for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r1 = 70 + Math.random() * 60; g.beginPath(); g.moveTo(W * 0.25 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1 * 0.9); g.lineTo(W * 0.25 + Math.cos(a) * (r1 + 40), H / 2 + Math.sin(a) * (r1 + 40) * 0.9); g.stroke(); }
  const cx = W * 0.25, cy = H / 2, R = 66;
  const ir = g.createRadialGradient(cx, cy, 6, cx, cy, R);
  ir.addColorStop(0, lighten(look.olhos, 0.35)); ir.addColorStop(0.55, look.olhos); ir.addColorStop(1, darken(look.olhos, 0.55));
  g.fillStyle = ir; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.fill();
  g.strokeStyle = darken(look.olhos, 0.35); g.globalAlpha = 0.5; g.lineWidth = 1.6;
  for (let i = 0; i < 70; i++) { const a = (i / 70) * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20); g.lineTo(cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3)); g.stroke(); }
  g.globalAlpha = 1; g.strokeStyle = "#120c08"; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.stroke();
  g.fillStyle = "#0b0706"; g.beginPath(); g.arc(cx, cy, 25, 0, 6.283); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function hairTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d")!;
  g.fillStyle = color; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) { const x = Math.random() * 256, l = 20 + Math.random() * 80; g.strokeStyle = Math.random() > 0.5 ? lighten(color, 0.16) : darken(color, 0.3); g.globalAlpha = 0.25; g.lineWidth = 1 + Math.random(); g.beginPath(); g.moveTo(x, Math.random() * 256); g.lineTo(x + (Math.random() - 0.5) * 6, Math.random() * 256 + l); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}

export function buildBust(look: Look, q: Quality): Bust {
  const root = new THREE.Group();
  const head = new THREE.Group(); root.add(head);
  const seg = q === "alta" ? 112 : q === "media" ? 84 : 60;
  const rosto = look.rosto;
  const skin = new THREE.Color(look.pele), shade = new THREE.Color(look.peleSombra);
  const age = Math.max(0, Math.min(1, (look.idade - 30) / 40));
  const disposables: Array<{ dispose: () => void }> = [];

  /* ───── crânio/rosto ───── */
  const geo = new THREE.SphereGeometry(1, seg * 2, seg);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new V(), out = new V(), lipC = new THREE.Color(lipColor(look.pele)), blush = new THREE.Color("#d9786a");
  const jawIdx: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    tmp.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    shape(tmp, rosto, out);
    pos.setXYZ(i, out.x, out.y, out.z);
    const front = smooth(-0.1, 0.55, tmp.z), ax = Math.abs(tmp.x);
    const c = skin.clone().lerp(shade, 0.22 * smooth(0.2, 1.0, ax) * (1 - front) + 0.12 * smooth(-0.3, -1, tmp.y));
    c.lerp(shade, 0.32 * gauss(ax - 0.4, 0.13) * gauss(tmp.y - 0.01, 0.1) * front);                     // órbitas mais escuras
    c.lerp(blush, 0.16 * gauss(ax - 0.5, 0.17) * gauss(tmp.y + 0.3, 0.15) * front);                    // bochechas
    c.lerp(blush, 0.12 * gauss(tmp.x, 0.1) * gauss(tmp.y + 0.4, 0.07) * front);                        // ponta do nariz
    c.lerp(lipC, 0.9 * gauss(tmp.x, 0.2) * gauss(tmp.y + 0.68, 0.045) * front);                        // lábios
    c.lerp(shade, 0.3 * gauss(ax - 0.13, 0.03) * gauss(tmp.y + 0.45, 0.03) * front);                   // narinas
    colors.set([c.r, c.g, c.b], i * 3);
    if (tmp.y < -0.62 && front > 0.3) jawIdx.push(i);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const base = new Float32Array(pos.array as Float32Array);
  const skinMat = mk("#ffffff", { vertexColors: true, roughness: 0.58, emissive: skin.clone().multiplyScalar(0.07) });
  const face = new THREE.Mesh(geo, skinMat); face.castShadow = true; face.receiveShadow = true; head.add(face);
  disposables.push(geo, skinMat);

  const surf = (x: number, y: number) => { // ponto da superfície do rosto na linha de visada (x,y)
    const px = x / FACE_W, py = y / (FACE_H * rosto); const pz = Math.sqrt(Math.max(0.0001, 1 - px * px - py * py));
    return shape(new V(px, py, pz).normalize(), rosto, new V());
  };

  /* ───── orelhas ───── */
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mk(look.pele, { roughness: 0.6 }));
    e.scale.set(0.07, 0.2, 0.12); e.position.set(s * 0.8, -0.1, -0.02); e.rotation.z = s * 0.12; e.castShadow = true; head.add(e);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mk(look.peleSombra, { roughness: 0.7 }));
    inner.scale.set(0.035, 0.12, 0.07); inner.position.set(s * 0.82, -0.1, 0.0); head.add(inner);
    disposables.push(e.geometry, inner.geometry);
  }

  /* ───── olhos ───── */
  const eyeTex = irisTexture(look);
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: eyeTex, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const eyes: Array<{ ball: THREE.Mesh; up: THREE.Mesh; low: THREE.Mesh; brow: THREE.Mesh; side: number; cx: number; cy: number; cz: number; bz: number }> = [];
  const lidMat = mk(look.pele, { roughness: 0.6, side: THREE.DoubleSide });
  const browMat = mk(mix(look.cabelo, "#1a1410", 0.25), { roughness: 0.85 });
  const R = 0.165;
  for (const side of [-1, 1]) {
    const sp = surf(side * 0.4, -0.02);
    const cz = sp.z - 0.085;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), eyeMat); ball.position.set(sp.x, sp.y, cz); head.add(ball);
    const up = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), lidMat); up.position.copy(ball.position); head.add(up);
    const low = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 28, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), lidMat); low.position.copy(ball.position); head.add(low);
    const brow = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), browMat); head.add(brow);
    up.castShadow = true;
    eyes.push({ ball, up, low, brow, side, cx: sp.x, cy: sp.y, cz, bz: surf(side * 0.42, sp.y + 0.27).z + 0.018 });
    disposables.push(ball.geometry, up.geometry, low.geometry, brow.geometry);
  }
  disposables.push(eyeTex, eyeMat, lidMat, browMat);

  /* ───── boca (lábios, interior, dentes e língua em decalque curvo) ───── */
  const N = 28, mouthY = -0.68 * FACE_H * rosto;
  const mouth = new THREE.Group(); head.add(mouth);
  const zAt = (x: number, y: number) => surf(x, y).z + 0.012;
  const zRow = Array.from({ length: N + 1 }, (_, i) => zAt(-0.28 + (0.56 * i) / N, mouthY));
  const ribbon = (color: THREE.ColorRepresentation, rough = 0.5) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((N + 1) * 2 * 3), 3));
    const idx: number[] = []; for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: rough, side: THREE.DoubleSide })); m.frustumCulled = false; mouth.add(m); disposables.push(g, m.material as THREE.Material); return m;
  };
  const inner = ribbon("#3a1218", 0.9), teeth = ribbon("#f7f1e6", 0.35), tongue = ribbon("#c4585e", 0.7), upLip = ribbon(lipC.clone().multiplyScalar(1.05), 0.45), loLip = ribbon(lipC.clone().multiplyScalar(0.98), 0.45);
  const setRibbon = (m: THREE.Mesh, top: (u: number) => number, bot: (u: number) => number, zoff: number) => {
    const a = (m.geometry.attributes.position as THREE.BufferAttribute);
    for (let i = 0; i <= N; i++) { const u = i / N, x = -0.28 + 0.56 * u; a.setXYZ(i * 2, x, mouthY + top(u), (zRow[i] ?? 0) + zoff); a.setXYZ(i * 2 + 1, x, mouthY + bot(u), (zRow[i] ?? 0) + zoff); }
    a.needsUpdate = true;
  };

  /* ───── pescoço, tronco e roupa ───── */
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.9, 28), mk(look.peleSombra, { roughness: 0.65 })); neck.position.set(0, -1.1, -0.06); neck.receiveShadow = true; root.add(neck);
  const torsoMat = mk(look.roupa, { roughness: 0.82 });
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.62), torsoMat);
  torso.scale.set(2.1, 1.25, 1.0); torso.position.set(0, -2.45, -0.1); torso.receiveShadow = true; torso.castShadow = true; root.add(torso);
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.0, 0.0), mk(look.pele));
  const trim = mk(look.roupa2, { roughness: 0.75 });
  const addCollar = () => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 12, 36, Math.PI * 1.1), trim); t.rotation.set(Math.PI / 2 - 0.35, 0, Math.PI * 0.95); t.position.set(0, -1.82, 0.28); root.add(t);
  };
  const tri = (pts: Array<[number, number]>, c: string, z: number) => { const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mk(c, { roughness: 0.75, side: THREE.DoubleSide })); m.position.z = z; root.add(m); disposables.push(m.geometry, m.material as THREE.Material); return m; };
  const zT = (y: number) => -0.1 + 1.0 * Math.sqrt(Math.max(0, 1 - Math.pow((y + 2.45) / 1.25, 2))) + 0.01;
  switch (look.roupaTipo) {
    case "jaleco": tri([[-0.5, -1.6], [0.5, -1.6], [0, -2.5]], look.roupa2, zT(-2.0)); break;
    case "terno": case "colete": {
      tri([[-0.5, -1.6], [0.5, -1.6], [0, -2.9]], look.roupaTipo === "terno" ? "#f4f6fb" : look.roupa2, zT(-2.1));
      tri([[-0.09, -1.66], [0.09, -1.66], [0.17, -2.7], [0, -2.9], [-0.17, -2.7]], look.roupaTipo === "terno" ? "#c4262e" : "#7a2e2e", zT(-2.1) + 0.02);
      if (look.roupaTipo === "terno") { tri([[-0.5, -1.6], [-0.22, -1.6], [-0.05, -2.9], [-0.55, -2.4]], darken(look.roupa, 0.2), zT(-2.1) + 0.03); tri([[0.5, -1.6], [0.22, -1.6], [0.05, -2.9], [0.55, -2.4]], darken(look.roupa, 0.2), zT(-2.1) + 0.03); }
      break;
    }
    case "camisa": case "blazer": case "blusa": case "suéter": case "bomber": addCollar(); break;
  }
  disposables.push(neck.geometry, torso.geometry, chest.geometry, torsoMat, trim); chest.visible = false;

  /* ───── cabelo ───── */
  const hairMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#ffffff"), map: hairTexture(look.cabelo), roughness: 0.55, metalness: 0.05 });
  disposables.push(hairMat);
  const t2 = new V(), o2 = new V();
  const hairParams = (() => {
    switch (look.cabeloEstilo) {
      case "curto": return { th: 0.07, line: 0.46, side: 0.1, back: -0.3 };
      case "penteado": return { th: 0.09, line: 0.5, side: 0.12, back: -0.3, quiff: 0.1 };
      case "topete": return { th: 0.08, line: 0.5, side: 0.1, back: -0.3, quiff: 0.2 };
      case "branco": return { th: 0.085, line: 0.5, side: 0.1, back: -0.3 };
      case "ralo": return { th: 0.05, line: 0.62, side: 0.1, back: -0.2, thin: true };
      case "coque": return { th: 0.07, line: 0.58, side: 0.14, back: -0.35, bun: true };
      case "cacheado": return { th: 0.06, line: 0.5, side: 0.12, back: -0.4, curls: true };
      case "bob": return { th: 0.1, line: 0.52, side: -0.62, back: -0.62, curtain: true };
      case "liso": return { th: 0.1, line: 0.52, side: -0.7, back: -0.9, curtain: true, long: true };
      default: return null;
    }
  })();
  if (hairParams && look.cabeloEstilo !== "careca") {
    const hg = new THREE.SphereGeometry(1, seg * 2, seg);
    const hp = hg.attributes.position as THREE.BufferAttribute; const keep: boolean[] = [];
    for (let i = 0; i < hp.count; i++) {
      t2.set(hp.getX(i), hp.getY(i), hp.getZ(i)); const ax = Math.abs(t2.x);
      shape(t2, rosto, o2);
      const hairline = t2.z > 0 ? hairParams.line - 0.28 * smooth(0.45, 1, ax) : hairParams.back;
      const sideLine = ax > 0.82 ? hairParams.side : 9;
      const lineY = Math.min(hairline, sideLine === 9 ? hairline : sideLine);
      const m = smooth(lineY - 0.06, lineY + 0.08, t2.y) * (hairParams.thin ? 1 - 0.0 * ax : 1);
      keep.push(m > -0.5 && m > 0.0001);
      const th = hairParams.th * 0.8 * (1.5 * m - 0.5) + ("quiff" in hairParams && hairParams.quiff ? (hairParams.quiff as number) * gauss(t2.x, 0.5) * gauss(t2.y - 0.75, 0.25) * smooth(0, 0.7, t2.z) : 0);
      const n = o2.clone().normalize();
      hp.setXYZ(i, o2.x + n.x * th + (hairParams.curtain ? -Math.sign(t2.x) * 0 : 0), o2.y + n.y * th, o2.z + n.z * th * (t2.z < -0.2 && hairParams.curtain ? 1.6 : 1));
    }
    const idx = hg.index!; const filtered: number[] = [];
    for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2); if (keep[a] && keep[b] && keep[c]) filtered.push(a, b, c); }
    hg.setIndex(filtered); hg.computeVertexNormals();
    const hair = new THREE.Mesh(hg, hairMat); hair.castShadow = true; hair.receiveShadow = true; head.add(hair); disposables.push(hg);
    if ("bun" in hairParams) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 28, 20), hairMat); b.position.set(0, 1.12 * rosto + 0.12, -0.35); b.castShadow = true; head.add(b); disposables.push(b.geometry); }
    if ("curls" in hairParams) {
      const cg = new THREE.SphereGeometry(0.2, 12, 10); const cnt = q === "baixa" ? 70 : 150; const inst = new THREE.InstancedMesh(cg, hairMat, cnt); const m4 = new THREE.Matrix4(); let k = 0;
      for (let i = 0; i < cnt * 3 && k < cnt; i++) { const y = 1 - (i / (cnt * 3)) * 1.35, r = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.399963; const p = new V(Math.cos(th) * r, y, Math.sin(th) * r); const front = p.z > 0.2 && p.y < 0.5; if (front || p.y < -0.05) continue; shape(p, rosto, o2); const n = p.clone().normalize(); m4.makeTranslation(o2.x + n.x * 0.16, o2.y + n.y * 0.16, o2.z + n.z * 0.16); inst.setMatrixAt(k++, m4); }
      inst.count = k; inst.castShadow = true; head.add(inst); disposables.push(cg);
    }
    if ("long" in hairParams) { const lg = new THREE.CapsuleGeometry(0.62, 1.7, 8, 20); const l = new THREE.Mesh(lg, hairMat); l.scale.set(1.15, 1, 0.55); l.position.set(0, -1.3, -0.7); l.castShadow = true; root.add(l); disposables.push(lg); }
  }

  /* ───── barba e bigode ───── */
  const hairDark = mk(look.cabelo, { roughness: 0.8 });
  if (look.barba === "bigode") { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.3, 4, 10), hairDark); m.rotation.z = Math.PI / 2; const p = surf(0, -0.6 * FACE_H * rosto); m.position.set(0, -0.6 * FACE_H * rosto + 0.0, p.z + 0.03); m.scale.set(1, 1, 0.9); head.add(m); disposables.push(m.geometry); }
  if (look.barba === "cavanhaque") { const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), hairDark); const p = surf(0, -0.9 * FACE_H * rosto); m.position.set(0, -0.88 * FACE_H * rosto, p.z + 0.01); m.scale.set(0.9, 1.3, 0.55); head.add(m); disposables.push(m.geometry); }
  if (look.barba === "barba") {
    const bg = new THREE.SphereGeometry(1, seg * 2, seg); const bp = bg.attributes.position as THREE.BufferAttribute; const k2: boolean[] = [];
    for (let i = 0; i < bp.count; i++) { t2.set(bp.getX(i), bp.getY(i), bp.getZ(i)); shape(t2, rosto, o2); const m = smooth(-0.46, -0.58, t2.y) * smooth(-0.1, 0.35, t2.z) * (1 - gauss(t2.x, 0.2) * smooth(-0.62, -0.7, t2.y) * 0); const mouthHole = gauss(t2.x, 0.3) * gauss(t2.y + 0.68, 0.075); k2.push(m > 0.02 && mouthHole < 0.5); const n = o2.clone().normalize(); const th = 0.055 * m; bp.setXYZ(i, o2.x + n.x * th, o2.y + n.y * th, o2.z + n.z * th); }
    const ix = bg.index!; const f2: number[] = []; for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i), b = ix.getX(i + 1), c = ix.getX(i + 2); if (k2[a] && k2[b] && k2[c]) f2.push(a, b, c); } bg.setIndex(f2); bg.computeVertexNormals();
    const b = new THREE.Mesh(bg, hairMat); head.add(b); disposables.push(bg);
  }

  /* ───── óculos ───── */
  if (look.oculos) {
    const frame = mk(look.oculos === "escuro" ? "#14161c" : "#3a2a1c", { roughness: 0.35, metalness: 0.3 });
    const glass = new THREE.MeshPhysicalMaterial({ color: look.oculos === "escuro" ? "#0b0c10" : "#ffffff", transparent: true, opacity: look.oculos === "escuro" ? 0.92 : 0.12, roughness: 0.05, metalness: 0, clearcoat: 1 });
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const sp = surf(s * 0.37, 0.03);
      const lens = look.oculos === "redondo" ? new THREE.TorusGeometry(0.235, 0.022, 10, 36) : look.oculos === "meia-lua" ? new THREE.TorusGeometry(0.2, 0.02, 10, 24, Math.PI) : new THREE.TorusGeometry(0.2, 0.02, 10, 4);
      const ring = new THREE.Mesh(lens, frame); ring.position.set(sp.x, sp.y - (look.oculos === "meia-lua" ? 0.03 : 0), sp.z + 0.1); if (look.oculos === "meia-lua") ring.rotation.z = Math.PI; else if (look.oculos !== "redondo") ring.rotation.z = Math.PI / 4; if (look.oculos === "quadrado") ring.scale.set(1.0, 0.9, 1);
      const gl = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), glass); gl.position.copy(ring.position); gl.position.z += 0.002;
      const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.8, 6), frame); temple.rotation.x = Math.PI / 2; temple.position.set(s * 0.92, sp.y + 0.02, sp.z - 0.3);
      g.add(ring, gl, temple); disposables.push(lens, gl.geometry, temple.geometry);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 6), frame); bridge.rotation.z = Math.PI / 2; const bp = surf(0, 0.03); bridge.position.set(0, bp.y, bp.z + 0.13); g.add(bridge);
    head.add(g); disposables.push(frame, glass, bridge.geometry);
  }

  head.position.y = -0.02;

  /* ───── animação ───── */
  const cur = { ...EXPR.neutro }; const e0 = { v: 0 };
  let blinkT = 1.5 + Math.random() * 3, blink = 0, sacc = 0, gx = 0, gy = 0, tgx = 0, tgy = 0, openS = 0, wide = 1, nextViseme = 0, phase = Math.random() * 10;
  const _v = new V();

  const update: Bust["update"] = (s, dt, t) => {
    const tg = EXPR[s.emocao];
    const k = Math.min(1, dt * 7);
    for (const key of Object.keys(tg) as Array<keyof typeof tg>) cur[key] = lerp(cur[key], tg[key], k);
    // piscadas e olhar (microsacadas), sempre com foco no interlocutor
    blinkT -= dt; if (blinkT <= 0 && !s.reduzir) { blink = 1; blinkT = 2 + Math.random() * 4.5; }
    blink = Math.max(0, blink - dt * 7.5);
    const blinkAmt = s.reduzir ? 0 : Math.sin(Math.min(1, blink) * Math.PI);
    sacc -= dt; if (sacc <= 0) { tgx = (Math.random() - 0.5) * 0.06; tgy = (Math.random() - 0.5) * 0.04; sacc = 0.7 + Math.random() * 1.8; }
    gx = lerp(gx, s.olhar.x * 0.35 + (s.reduzir ? 0 : tgx), Math.min(1, dt * 9)); gy = lerp(gy, s.olhar.y * 0.25 + (s.reduzir ? 0 : tgy), Math.min(1, dt * 9));
    for (const e of eyes) {
      e.ball.rotation.set(-gy, gx, 0);
      const open = Math.min(1.25, cur.eye) * (1 - blinkAmt);
      e.up.rotation.set(lerp(0.3, -0.62, Math.min(1, open * 0.95)), 0, 0);
      e.low.rotation.x = lerp(-0.12, 0.25, 1 - Math.min(1, open)) - cur.smile * 0.1;
      // sobrancelha
      const side = e.side; const by = e.cy + 0.255 - cur.brow * 0.03 + 0.05 * (open - 1) - cur.browInner * 0.008;
      e.brow.position.set(e.cx + side * 0.02, by, e.bz);
      e.brow.rotation.set(-0.3, side * 0.25, side * cur.browInner * 0.07 + side * 0.08); e.brow.scale.set(0.19, 0.034, 0.05);
    }
    // boca
    const falaAlvo = s.falando ? Math.min(1, s.nivel * 1.25) : 0;
    nextViseme -= dt; if (nextViseme <= 0) { wide = 0.78 + Math.random() * 0.4; nextViseme = 0.07 + Math.random() * 0.12; }
    openS = lerp(openS, falaAlvo, Math.min(1, dt * 18));
    const open = Math.max(cur.open * 0.9, openS * 0.95);
    const smile = cur.smile * (1 - openS * 0.35);
    const w = 0.235 + smile * 0.04 + (s.falando ? (wide - 1) * 0.04 * openS : 0);
    const cornerY = smile * 0.055 - (smile < 0 ? 0.01 : 0) + (cur.smirk ? 0.03 : 0);
    const upL = (u: number) => { const x = (u - 0.5) * 2; const edge = Math.pow(Math.abs(x), 2.2); const cupid = gauss(x - 0.22, 0.16) + gauss(x + 0.22, 0.16); return (0.012 + 0.016 * cupid) * (1 - edge) + cornerY * edge * (x > 0 ? 1 + cur.smirk * 0.5 : 1 - cur.smirk * 0.2) - 0.0; };
    const loL = (u: number) => { const x = (u - 0.5) * 2; const edge = Math.pow(Math.abs(x), 2.2); return (-0.012 - 0.02 * (1 - x * x)) * (1 - edge) - open * 0.2 * (1 - Math.pow(Math.abs(x), 1.7)) + cornerY * edge * (x > 0 ? 1 + cur.smirk * 0.5 : 1); };
    const xs = (u: number) => (u - 0.5) * 2 * (w / 0.28);
    void xs;
    const scaleX = w / 0.28;
    const a = (m: THREE.Mesh) => m;
    // as fitas usam x fixo em [-0.28,0.28]; a largura da boca é aplicada escalando o grupo
    mouth.scale.x = scaleX; mouth.position.x = 0; void a;
    setRibbon(upLip, (u) => upL(u) + 0.026, (u) => upL(u) - 0.016, 0.004);
    setRibbon(loLip, (u) => loL(u) + 0.016, (u) => loL(u) - 0.034, 0.004);
    setRibbon(inner, (u) => upL(u) - 0.005, (u) => loL(u) + 0.005, -0.004);
    setRibbon(teeth, (u) => upL(u) - 0.004, (u) => upL(u) - 0.004 - 0.05 * Math.min(1, open * 3) * (1 - Math.pow(Math.abs((u - 0.5) * 2), 3)), -0.002);
    setRibbon(tongue, (u) => loL(u) + 0.012 + 0.04 * Math.min(1, open * 2), (u) => loL(u) + 0.004, -0.001);
    inner.visible = teeth.visible = tongue.visible = open > 0.03;
    // cabeça: balanço sutil, acenos ao falar e olhar para o interlocutor
    if (!s.reduzir) {
      head.rotation.y = Math.sin(t * 0.45 + phase) * 0.07 + s.olhar.x * 0.18;
      head.rotation.x = Math.sin(t * 0.33 + phase * 1.3) * 0.025 + s.olhar.y * -0.1 + (s.falando ? Math.sin(t * 5.2) * 0.02 * openS - openS * 0.015 : 0);
      head.rotation.z = Math.sin(t * 0.27 + phase * 0.7) * 0.02 + (cur.smirk ? 0.05 : 0);
      root.position.y = Math.sin(t * 1.5) * 0.012;
      torso.scale.y = 1.35 + Math.sin(t * 1.5) * 0.008;
    } else { head.rotation.set(0, 0, 0); root.position.y = 0; }
    _v.set(0, 0, 0); void e0; void jawIdx; void base;
    // maxilar acompanha a abertura da boca
    const pa = geo.attributes.position as THREE.BufferAttribute;
    if (open > 0.02 || (pa as unknown as { _o?: boolean })._o) {
      for (const i of jawIdx) { const y0 = base[i * 3 + 1]!; const wgt = smooth(-0.7 * FACE_H * rosto, -1.0 * FACE_H * rosto, y0) + 0.0; pa.setY(i, y0 - open * 0.09 * (0.3 + wgt)); pa.setZ(i, base[i * 3 + 2]! - open * 0.03 * wgt); }
      pa.needsUpdate = true; (pa as unknown as { _o?: boolean })._o = open > 0.02;
    }
  };

  const dispose = () => { for (const d of disposables) d.dispose(); };
  return { root, update, dispose };
}
