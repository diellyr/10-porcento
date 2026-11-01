import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CHARACTERS } from "../../content/characters";
import type { CharId } from "../../engine/types";
import type { Look } from "../../content/types";
import { bakeGroup } from "./lowpoly";
import { buildPersonagem, contato } from "./estudo/personagem";
import { grain, picture, rug, weave } from "./estudo/tex";

/**
 * Direção visual R2 ("realista cinematográfico") aplicada ao jogo — fase de validação: uma cena (Gabinete da Administração)
 * e um personagem completo (Deputado Cornélio). Recursos em /public/jogo/3d:
 *  - venice_sunset_1k.hdr — Poly Haven (CC0), via exemplos do three.js
 *  - hardwood2_*.jpg — exemplos do three.js (piso de madeira PBR)
 *  - GlamVelvetSofa.glb — © 2021 Wayfair LLC, CC BY 4.0 (crédito exibido em "Sobre o jogo")
 */
const A = "/jogo/3d/";
const gltf = new GLTFLoader();
let hdrPromise: Promise<THREE.DataTexture> | null = null;
let sofaPromise: Promise<THREE.Group> | null = null;
const tl = new THREE.TextureLoader();
const madeiraTex = (() => {
  let p: Promise<{ map: THREE.Texture; rough: THREE.Texture; bump: THREE.Texture }> | null = null;
  return () => (p ??= Promise.all(["hardwood2_diffuse.jpg", "hardwood2_roughness.jpg", "hardwood2_bump.jpg"].map((f) => tl.loadAsync(A + f))).then(([map, rough, bump]) => {
    for (const t of [map!, rough!, bump!]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
    map!.colorSpace = THREE.SRGBColorSpace; return { map: map!, rough: rough!, bump: bump! };
  }));
})();

/** Iluminação por imagem (HDRI real). Devolve a função de descarte. */
export async function ambienteHDRI(renderer: THREE.WebGLRenderer, scene: THREE.Scene, intensidade: number): Promise<() => void> {
  const hdr = await (hdrPromise ??= new HDRLoader().loadAsync(A + "venice_sunset_1k.hdr"));
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromEquirectangular(hdr);
  scene.environment = rt.texture; scene.environmentIntensity = intensidade; scene.environmentRotation.set(0, 1.2, 0);
  return () => { rt.dispose(); pm.dispose(); };
}

/** Piso de madeira PBR (substitui o piso de lajotas da sala). */
export async function pisoMadeira(piso: THREE.Mesh, rep: [number, number] = [3, 2.2]) {
  const t = await madeiraTex();
  const map = t.map.clone(), rough = t.rough.clone(), bump = t.bump.clone();
  for (const x of [map, rough, bump]) { x.repeat.set(rep[0], rep[1]); x.needsUpdate = true; }
  const old = piso.material as THREE.Material;
  piso.material = new THREE.MeshPhysicalMaterial({ map, roughnessMap: rough, bumpMap: bump, bumpScale: 0.6, roughness: 1, color: "#8a6a52", clearcoat: 0.12, clearcoatRoughness: 0.5 });
  old.dispose();
}

const keep = (o: THREE.Object3D) => { o.traverse((c) => { c.userData.keep = true; const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

/**
 * Mobília PBR do Gabinete da Administração (coordenadas locais da sala do jogo, 9,6 × 7 m; parede do fundo em z = −3,36).
 * Mantém as posições dos pontos interativos: mesa (0,4; −0,6), computador (−0,6), pasta (1,6), mural (−2,2), memorando (1,2).
 */
export function gabineteRealista(g: THREE.Group): { sofa: THREE.Group } {
  const root = new THREE.Group(); g.add(root);
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const rb = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2 - 0.001));
  const madeira = new THREE.MeshPhysicalMaterial({ color: "#6a4630", roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.3 });
  void madeiraTex().then((t) => { const m = t.map.clone(); m.repeat.set(0.7, 0.7); m.needsUpdate = true; madeira.map = m; madeira.color.set("#9a7458"); madeira.needsUpdate = true; });
  const couro = new THREE.MeshPhysicalMaterial({ color: "#4e1f17", roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35, bumpMap: grain(), bumpScale: 0.3 });
  const ouro = new THREE.MeshStandardMaterial({ color: "#d9a845", metalness: 1, roughness: 0.25 });
  const escuro = new THREE.MeshStandardMaterial({ color: "#1b1d24", roughness: 0.35 });
  const zb = -3.36;
  // tapete
  put(new THREE.BoxGeometry(4.6, 0.015, 3.2), new THREE.MeshPhysicalMaterial({ map: rug("#6e2a24", "#c7a25a", "#3e1612"), roughness: 0.95, sheen: 0.8, sheenColor: "#ffd0a0" }), 0.4, 0.008, 0.3);
  // mesa executiva
  const mesa = new THREE.Group(); mesa.position.set(0.4, 0, -0.6); root.add(mesa);
  put(rb(3.0, 0.08, 1.3, 0.025), madeira, 0, 0.76, 0, mesa);
  put(rb(2.9, 0.72, 0.06, 0.015), madeira, 0, 0.36, 0.55, mesa);
  for (const s of [-1, 1]) put(rb(0.6, 0.72, 1.2, 0.02), madeira, s * 1.15, 0.36, -0.02, mesa);
  for (let i = 0; i < 3; i++) put(new THREE.BoxGeometry(0.2, 0.02, 0.02), ouro, -1.15, 0.6 - i * 0.2, 0.62, mesa);
  // computador (tela para quem senta), teclado, papéis, telefone, xícara, placa dourada
  const mon = new THREE.Group(); mon.position.set(-1.0, 0.8, -0.05); mon.rotation.y = Math.PI + 0.35; mesa.add(mon);
  put(rb(0.66, 0.4, 0.025, 0.01), escuro, 0, 0.36, 0, mon);
  put(new THREE.PlaneGeometry(0.62, 0.36), new THREE.MeshStandardMaterial({ color: "#0e2a4a", emissive: "#2f72c0", emissiveIntensity: 0.6 }), 0, 0.36, 0.014, mon);
  put(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 10), escuro, 0, 0.09, -0.02, mon); put(rb(0.24, 0.012, 0.16, 0.005), escuro, 0, 0.006, -0.02, mon);
  for (let i = 0; i < 6; i++) { const p = put(new THREE.BoxGeometry(0.3, 0.004, 0.42), new THREE.MeshStandardMaterial({ color: i % 2 ? "#ffffff" : "#f3ecda", roughness: 0.95 }), 1.2 + (i % 3) * 0.01, 0.8 + i * 0.006, 0.15 - i * 0.008, mesa); p.rotation.y = (i % 3 - 1) * 0.08; }
  put(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 24), new THREE.MeshPhysicalMaterial({ color: "#f7f6f2", roughness: 0.15, clearcoat: 1 }), 0.45, 0.85, 0.3, mesa);
  put(rb(0.45, 0.1, 0.05, 0.01), ouro, 0, 0.85, 0.5, mesa).rotation.x = -0.4;
  // luminária de mesa (luz prática quente)
  const lum = new THREE.Group(); lum.position.set(1.25, 0.8, -0.35); mesa.add(lum);
  put(new THREE.CylinderGeometry(0.08, 0.1, 0.02, 24), ouro, 0, 0.01, 0, lum); put(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 10), ouro, 0, 0.2, 0, lum);
  put(new THREE.CylinderGeometry(0.06, 0.14, 0.14, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#1f5a3c", roughness: 0.4, side: THREE.DoubleSide }), 0, 0.42, 0, lum);
  const lamp = new THREE.PointLight("#ffcf8a", 3.2, 4.5, 1.6); lamp.position.set(0, 0.36, 0); lum.add(lamp);
  // cadeira de couro
  const cad = new THREE.Group(); cad.position.set(0.4, 0, -1.8); root.add(cad);
  put(rb(0.76, 0.16, 0.7, 0.06), couro, 0, 0.5, 0, cad); put(rb(0.76, 1.1, 0.16, 0.06), couro, 0, 1.1, -0.32, cad);
  for (const s of [-1, 1]) put(rb(0.1, 0.24, 0.58, 0.04), couro, s * 0.42, 0.68, 0.02, cad);
  const cromo = new THREE.MeshStandardMaterial({ color: "#2a2a30", metalness: 0.85, roughness: 0.3 });
  put(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 12), cromo, 0, 0.22, 0, cad); put(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 5), cromo, 0, 0.03, 0, cad);
  // estantes com livros (fundo)
  const livros = ["#6e2a24", "#2c3e5a", "#4a5e3a", "#7a5a2a", "#3a2a3e", "#8a6a3a", "#1f3a3a"];
  for (const [x, w] of [[-3.75, 1.5], [3.1, 1.3]] as const) {
    const est = new THREE.Group(); est.position.set(x, 0, zb + 0.24); root.add(est);
    put(rb(w, 2.3, 0.04, 0.01), madeira, 0, 1.15, -0.18, est); for (const s of [-1, 1]) put(rb(0.05, 2.3, 0.4, 0.01), madeira, s * (w / 2 - 0.025), 1.15, 0, est); put(rb(w, 0.05, 0.4, 0.01), madeira, 0, 2.28, 0, est);
    for (let r = 0; r < 4; r++) {
      put(new THREE.BoxGeometry(w - 0.1, 0.03, 0.34), madeira, 0, 0.25 + r * 0.52, 0.02, est);
      let bx = -w / 2 + 0.08, k = r * 3 + Math.round(x);
      while (bx < w / 2 - 0.12) { const bw = 0.04 + ((k * 7) % 4) * 0.012, bh = 0.3 + ((k * 5) % 5) * 0.03; const b = put(rb(bw, bh, 0.24, 0.004), new THREE.MeshPhysicalMaterial({ color: livros[Math.abs(k) % livros.length], roughness: 0.7, sheen: 0.3 }), bx + bw / 2, 0.27 + r * 0.52 + bh / 2, 0.04, est); if (k % 9 === 4) b.rotation.z = 0.18; bx += bw + 0.006; k++; }
    }
  }
  // parede do fundo: mural (recados), memorando, retrato do deputado (sátira), relógio
  const quadro = (tex: THREE.Texture, x: number, y: number, qw: number, qh: number, molduraOuro = true) => {
    put(rb(qw + 0.12, qh + 0.12, 0.05, 0.015), molduraOuro ? ouro : madeira, x, y, zb + 0.03);
    put(new THREE.PlaneGeometry(qw, qh), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), x, y, zb + 0.06);
  };
  quadro(picture("retrato"), -0.45, 1.95, 0.7, 0.88);
  quadro(picture("diploma"), 1.2, 2.0, 0.6, 0.48, false);
  const cort = new THREE.MeshPhysicalMaterial({ color: "#c49a5a", roughness: 0.9, bumpMap: weave(0.6), bumpScale: 0.4 });
  put(rb(1.1, 0.8, 0.04, 0.01), cort, -2.2, 2.0, zb + 0.03);
  for (let i = 0; i < 4; i++) put(new THREE.PlaneGeometry(0.22, 0.18), new THREE.MeshStandardMaterial({ color: ["#fff6c0", "#ffd0d6", "#d6f0ff", "#ffffff"][i], roughness: 0.9 }), -2.5 + (i % 2) * 0.45, 2.15 - Math.floor(i / 2) * 0.3, zb + 0.06).rotation.z = (i % 2 ? 0.06 : -0.05);
  // arquivo de aço e planta
  const arq = new THREE.Group(); arq.position.set(-4.4, 0, -1.4); arq.rotation.y = Math.PI / 2; root.add(arq);
  put(rb(0.5, 1.3, 0.6, 0.02), new THREE.MeshStandardMaterial({ color: "#8a939e", metalness: 0.6, roughness: 0.4 }), 0, 0.65, 0, arq);
  for (let i = 0; i < 3; i++) put(new THREE.BoxGeometry(0.16, 0.025, 0.02), new THREE.MeshStandardMaterial({ color: "#d9dde4", metalness: 1, roughness: 0.25 }), 0, 1.1 - i * 0.4, 0.31, arq);
  const vaso = new THREE.Group(); vaso.position.set(-4.2, 0, 2.9); root.add(vaso);
  put(new THREE.CylinderGeometry(0.28, 0.21, 0.52, 28), new THREE.MeshPhysicalMaterial({ color: "#a8572e", roughness: 0.75 }), 0, 0.26, 0, vaso);
  const folha = new THREE.MeshPhysicalMaterial({ color: "#2f6b3a", roughness: 0.55, side: THREE.DoubleSide, sheen: 0.4, sheenColor: "#9fe0a0" });
  for (let i = 0; i < 18; i++) { const a = i * 2.39, hh = 0.62 + (i % 5) * 0.17; const f = put(new THREE.SphereGeometry(0.24, 18, 10, 0, Math.PI), folha, Math.cos(a) * 0.15, hh, Math.sin(a) * 0.15, vaso); f.scale.set(0.55, 1.3, 0.12); f.rotation.set(0.6 + (i % 3) * 0.2, -a, 0.2); }
  // mesa de centro com estatueta dourada (ostentação)
  const mc = new THREE.Group(); mc.position.set(3.4, 0, 1.0); root.add(mc);
  put(rb(1.1, 0.42, 0.65, 0.03), madeira, 0, 0.21, 0, mc);
  put(new THREE.CylinderGeometry(0.08, 0.1, 0.06, 24), ouro, 0, 0.45, 0, mc); put(new THREE.CapsuleGeometry(0.06, 0.1, 6, 16), ouro, 0, 0.55, 0, mc); put(new THREE.SphereGeometry(0.08, 24, 16), ouro, 0, 0.66, 0, mc);
  // sofá: modelo de catálogo carregado depois (o lugar fica reservado)
  const sofa = new THREE.Group(); sofa.position.set(3.4, 0, 2.35); sofa.rotation.y = Math.PI; root.add(sofa);
  void (sofaPromise ??= gltf.loadAsync(A + "GlamVelvetSofa.glb").then((r) => r.scene)).then((s) => {
    const c = s.clone(); const b = new THREE.Box3().setFromObject(c); const sz = b.getSize(new THREE.Vector3()); c.scale.setScalar(2.2 / Math.max(sz.x, sz.z)); sofa.add(keep(c));
  }).catch(() => { /* sem o modelo: sala segue sem sofá */ });
  keep(root);
  return { sofa };
}

/** Pose de cada personagem nomeado no mundo (os demais ficam de pé, parados). */
const POSE: Partial<Record<CharId, "discurso" | "parado" | "cafezinho" | "prancheta">> = { cornelio: "discurso", toninho: "cafezinho", joana: "prancheta", ana: "prancheta", roberto: "prancheta", nelson: "discurso", ramiro: "discurso", goncalo: "discurso", vivian: "prancheta", cecilia: "prancheta" };
const cache = new Map<string, THREE.Group>();

/** Personagem nomeado com modelo de corpo inteiro. Na qualidade média as peças são unidas (menos chamadas de desenho). */
export function personagemRealista(id: CharId, unir = false): THREE.Group {
  const k = `${id}|${unir}`; let g = cache.get(k);
  if (!g) {
    const p = buildPersonagem(CHARACTERS[id].look, "b", POSE[id] ?? "parado"); g = new THREE.Group(); p.root.scale.set(1.3, 1.2, 1.3); g.add(p.root);
    if (unir) bakeGroup(p.root, p.root);
    g.add(contato(0.9, 0.6)); keep(g); g.userData.cache = true; cache.set(k, g);
  }
  return g;
}

/** Figurante (equipe, pacientes, cidadãos): versão leve do mesmo modelo, unida em poucas malhas e reaproveitada por cor/pose. */
const figCache = new Map<string, THREE.Group>();
export function figuranteRealista(look: Look, o: { sit?: boolean; scale?: number } = {}): THREE.Group {
  const k = JSON.stringify([look.pele, look.roupa, look.roupa2, look.roupaTipo, look.cabelo, look.cabeloEstilo, !!o.sit]);
  let base = figCache.get(k);
  if (!base) {
    const p = buildPersonagem(look, "b", o.sit ? "sentado" : "parado", { leve: true }); base = new THREE.Group(); p.root.scale.set(1.3, 1.2, 1.3); base.add(p.root);
    bakeGroup(p.root, p.root); keep(base); figCache.set(k, base);
  }
  const g = base.clone(); g.scale.multiplyScalar(o.scale ?? 1); g.userData.cache = true; return g;
}

/** Feixes de sol entrando pela janela da parede oeste e poeira em suspensão (qualidade alta). */
export function raiosDeSol(w: number, d: number, door: "N" | "S"): THREE.Group {
  const g = new THREE.Group(); void d; void door;
  const dir = new THREE.Vector3(0.62, -0.62, -0.32).normalize(), Y = new THREE.Vector3(0, 1, 0);
  const mat = new THREE.MeshBasicMaterial({ map: feixe(), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: "#ffd6a0" });
  for (let i = 0; i < 4; i++) {
    const L = 4.6, m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, L), mat);
    const o = new THREE.Vector3(-w / 2 + 0.15, 1.75 + (i % 2) * 0.25, (i - 1.5) * 0.32);
    m.position.copy(o).addScaledVector(dir, L / 2); m.quaternion.setFromUnitVectors(Y, dir.clone().negate()); m.rotateY(i * 0.7);
    m.renderOrder = 3; g.add(m);
  }
  const n = 90, arr = new Float32Array(n * 3); let s = Math.round(w * 97); const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) { const k = rnd() * 4; arr[i * 3] = -w / 2 + 0.3 + dir.x * k + (rnd() - 0.5) * 0.6; arr[i * 3 + 1] = 1.8 + dir.y * k + (rnd() - 0.5) * 0.5; arr[i * 3 + 2] = dir.z * k + (rnd() - 0.5) * 1.2; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: "#ffe6c0", size: 0.025, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })));
  return keep(g) as THREE.Group;
}
let feixeTex: THREE.Texture | null = null;
function feixe() {
  if (feixeTex) return feixeTex;
  const c = document.createElement("canvas"); c.width = 64; c.height = 256; const x = c.getContext("2d")!;
  const v = x.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, "rgba(255,240,210,1)"); v.addColorStop(1, "rgba(255,240,210,0)"); x.fillStyle = v; x.fillRect(0, 0, 64, 256);
  const h = x.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)"); x.globalCompositeOperation = "destination-out"; x.fillStyle = h; x.fillRect(0, 0, 64, 256);
  feixeTex = new THREE.CanvasTexture(c); feixeTex.colorSpace = THREE.SRGBColorSpace; return feixeTex;
}
