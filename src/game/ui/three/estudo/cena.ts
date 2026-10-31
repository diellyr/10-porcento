import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CHARACTERS } from "../../../content/characters";
import { darken } from "../../art/color";
import { buildPersonagem, contato, type Estilo, type Personagem } from "./personagem";
import { beam, grain, picture, plaster, rug, wood, weave } from "./tex";

/**
 * Cena do ESTUDO VISUAL: o Gabinete da Administração da UPA, em corte (duas paredes), com o Deputado Cornélio em discurso,
 * Toninho com o cafezinho e Joana com a prancheta. Mesma cena e mesmos personagens para as três direções.
 */
export interface Cena { scene: THREE.Scene; cornelio: Personagem; luzes: THREE.Object3D[]; poeira: THREE.Points | null }

const RW = 7.4, RD = 5.8, WH = 3.0, WT = 0.18;

export function buildCena(e: Estilo): Cena {
  const scene = new THREE.Scene();
  const cart = e === "a", cine = e === "c";
  const rb = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, cart ? 4 : 2, Math.min(r * (cart ? 2.2 : 1), Math.min(w, h, d) / 2 - 0.001));
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const std = (color: string, o: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color: cart ? new THREE.Color(color).offsetHSL(0, 0.08, 0.02) : color, roughness: 0.75, ...o });

  // paleta: cartoon mais saturada; semirrealista neutra; cinematográfica com madeira escura e verde-oliva
  const pal = cart
    ? { parede: "#f6e2bf", rodape: "#c98a52", piso: "#c98a52", lambri: "#7fb39a", madeira: "#a35f30", couro: "#7a2f22", tapete: ["#c94a3c", "#f2c14e", "#8f2a22"] as const }
    : cine
      ? { parede: "#cdbf9f", rodape: "#4a2f1c", piso: "#6b4428", lambri: "#3f5546", madeira: "#5a3520", couro: "#4a1f17", tapete: ["#6e2a24", "#c7a25a", "#3e1612"] as const }
      : { parede: "#e7dcc6", rodape: "#7a5232", piso: "#9b6a43", lambri: "#5f7a68", madeira: "#7a4a2a", couro: "#5e261c", tapete: ["#8a3a2e", "#d4b06a", "#5a2018"] as const };

  // piso de tábuas
  const w = wood(pal.piso); w.map.repeat.set(3, 3); w.rough.repeat.set(3, 3);
  const piso = put(new THREE.BoxGeometry(RW, 0.1, RD), std("#ffffff", { map: cart ? null : w.map, color: cart ? pal.piso : "#ffffff", roughnessMap: cart ? null : w.rough, roughness: cart ? 0.6 : 1, clearcoat: cart ? 0.15 : 0.25, clearcoatRoughness: 0.4 }), 0, -0.05, 0);
  piso.castShadow = false;
  // paredes (fundo e esquerda), lambri, rodapé, moldura
  const pm = std(pal.parede, { map: cart ? null : plaster(pal.parede, 0.05), roughness: 0.92 });
  if (!cart) pm.color.set("#ffffff");
  const lam = std(pal.lambri, { roughness: 0.6, clearcoat: 0.2 });
  const rod = std(pal.rodape, { roughness: 0.5, clearcoat: 0.3 });
  const parede = (x: number, z: number, comp: number, rotY: number) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
    put(new THREE.BoxGeometry(comp, WH, WT), pm, 0, WH / 2, 0, g);
    put(rb(comp, 0.95, 0.04, 0.01), lam, 0, 0.475, WT / 2 + 0.02, g);
    put(rb(comp, 0.05, 0.06, 0.01), rod, 0, 0.98, WT / 2 + 0.03, g);
    put(rb(comp, 0.14, 0.05, 0.01), rod, 0, 0.07, WT / 2 + 0.045, g);
    put(rb(comp, 0.1, 0.08, 0.02), rod, 0, WH - 0.05, WT / 2 + 0.04, g);
    // frisos do lambri
    for (let i = 0; i < Math.floor(comp / 0.9); i++) put(rb(0.72, 0.7, 0.015, 0.01), std(darken(pal.lambri, 0.06), { roughness: 0.6 }), -comp / 2 + 0.6 + i * 0.9, 0.48, WT / 2 + 0.045, g);
    return g;
  };
  const fundo = parede(0, -RD / 2, RW, 0);
  const esq = parede(-RW / 2, 0, RD, Math.PI / 2);

  // porta no fundo (direita)
  const madeira = (() => { const t = wood(pal.madeira, false); return std("#ffffff", { map: cart ? null : t.map, color: cart ? pal.madeira : "#ffffff", roughness: 0.55, clearcoat: 0.45, clearcoatRoughness: 0.35 }); })();
  put(rb(1.1, 2.25, 0.08, 0.02), madeira, 2.45, 1.125, WT / 2 + 0.04, fundo);
  put(rb(1.3, 2.4, 0.06, 0.02), rod, 2.45, 1.2, WT / 2 + 0.02, fundo);
  put(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: "#d9b44a", metalness: 1, roughness: 0.25 }), 2.05, 1.05, WT / 2 + 0.12, fundo);
  // quadros: retrato do deputado (sátira) e diploma
  const quadro = (kind: "retrato" | "diploma" | "paisagem", x: number, y: number, qw: number, qh: number, g: THREE.Object3D) => {
    put(rb(qw + 0.12, qh + 0.12, 0.05, 0.015), new THREE.MeshStandardMaterial({ color: "#c9a043", metalness: 0.85, roughness: 0.3 }), x, y, WT / 2 + 0.03, g);
    const m = put(new THREE.PlaneGeometry(qw, qh), new THREE.MeshStandardMaterial({ map: picture(kind), roughness: 0.55 }), x, y, WT / 2 + 0.06, g); m.castShadow = false;
  };
  quadro("retrato", -0.6, 1.95, 0.85, 1.05, fundo); quadro("diploma", 0.65, 1.85, 0.6, 0.48, fundo);
  // relógio de parede
  const rel = put(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 40), new THREE.MeshStandardMaterial({ color: "#2a2018", roughness: 0.4 }), 1.35, 2.45, WT / 2 + 0.04, fundo); rel.rotation.x = Math.PI / 2;
  const mostr = put(new THREE.CylinderGeometry(0.17, 0.17, 0.01, 40), new THREE.MeshStandardMaterial({ color: "#f6f1e4", roughness: 0.6 }), 1.35, 2.45, WT / 2 + 0.07, fundo); mostr.rotation.x = Math.PI / 2;

  // janela na parede esquerda (moldura, vidro, cortinas)
  const jan = new THREE.Group(); jan.position.set(0.2, 0, WT / 2); esq.add(jan);
  put(rb(1.9, 1.55, 0.1, 0.02), std("#f4efe4", { roughness: 0.5 }), 0, 1.75, 0.02, jan);
  const vidro = put(new THREE.PlaneGeometry(1.7, 1.35), new THREE.MeshBasicMaterial({ color: cine ? "#ffe6b8" : "#d8eeff" }), 0, 1.75, 0.075, jan); vidro.castShadow = false;
  put(new THREE.BoxGeometry(0.05, 1.35, 0.03), std("#f4efe4"), 0, 1.75, 0.09, jan); put(new THREE.BoxGeometry(1.7, 0.05, 0.03), std("#f4efe4"), 0, 1.75, 0.09, jan);
  put(rb(2.1, 0.06, 0.22, 0.01), std("#f4efe4", { roughness: 0.4 }), 0, 0.97, 0.1, jan);
  const cortina = std(cine ? "#7a2a24" : cart ? "#d9534a" : "#9a3a30", { map: null, roughness: 0.85, sheen: 1, sheenColor: "#ffb0a0", bumpMap: weave(0.5), bumpScale: 0.6 });
  for (const s of [-1, 1]) { const c = put(new THREE.CylinderGeometry(0.16, 0.24, 2.35, 18, 1, true), cortina, s * 1.15, 1.6, 0.18, jan); c.scale.z = 0.5; }
  put(new THREE.CylinderGeometry(0.025, 0.025, 2.7, 12), new THREE.MeshStandardMaterial({ color: "#c9a043", metalness: 1, roughness: 0.3 }), 0, 2.8, 0.2, jan).rotation.z = Math.PI / 2;

  // tapete
  const tp = put(new THREE.BoxGeometry(3.6, 0.015, 2.5), std("#ffffff", { map: rug(pal.tapete[0], pal.tapete[1], pal.tapete[2]), roughness: 0.95, sheen: 0.8, sheenColor: "#ffd0a0" }), 0.3, 0.008, 0.55); tp.castShadow = false;

  // mesa executiva, cadeira de couro e objetos
  const mesa = new THREE.Group(); mesa.position.set(0.35, 0, -1.25); scene.add(mesa);
  put(rb(2.3, 0.07, 1.05, 0.02), madeira, 0, 0.76, 0, mesa);
  put(rb(2.2, 0.72, 0.06, 0.015), madeira, 0, 0.36, 0.42, mesa);
  for (const s of [-1, 1]) put(rb(0.5, 0.72, 0.95, 0.02), madeira, s * 0.86, 0.36, -0.02, mesa);
  for (let i = 0; i < 3; i++) put(new THREE.BoxGeometry(0.18, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: "#d9b44a", metalness: 1, roughness: 0.3 }), -0.86, 0.6 - i * 0.2, 0.48, mesa);
  const couro = new THREE.MeshPhysicalMaterial({ color: pal.couro, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35, bumpMap: grain(), bumpScale: cart ? 0.05 : 0.3 });
  const cad = new THREE.Group(); cad.position.set(0.35, 0, -2.05); scene.add(cad);
  put(rb(0.72, 0.16, 0.66, 0.06), couro, 0, 0.5, 0, cad); put(rb(0.72, 1.05, 0.16, 0.06), couro, 0, 1.08, -0.3, cad);
  for (const s of [-1, 1]) put(rb(0.1, 0.24, 0.55, 0.04), couro, s * 0.4, 0.68, 0.02, cad);
  put(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 12), new THREE.MeshStandardMaterial({ color: "#2a2a30", metalness: 0.8, roughness: 0.3 }), 0, 0.22, 0, cad);
  put(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 5), new THREE.MeshStandardMaterial({ color: "#2a2a30", metalness: 0.8, roughness: 0.3 }), 0, 0.03, 0, cad);
  // monitor fino, teclado, papéis, telefone, xícara, placa dourada
  const mon = new THREE.Group(); mon.position.set(-0.35, 0.8, -0.2); mon.rotation.y = Math.PI + 0.45; mesa.add(mon);
  put(rb(0.62, 0.38, 0.025, 0.01), new THREE.MeshStandardMaterial({ color: "#1b1d24", roughness: 0.35 }), 0, 0.33, 0, mon);
  const tela = put(new THREE.PlaneGeometry(0.58, 0.34), new THREE.MeshStandardMaterial({ color: "#0e2a4a", emissive: cine ? "#3a7ac0" : "#2a6ab0", emissiveIntensity: 0.6, roughness: 0.2 }), 0, 0.33, 0.014, mon); tela.castShadow = false;
  put(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 10), new THREE.MeshStandardMaterial({ color: "#2a2a30", metalness: 0.8, roughness: 0.3 }), 0, 0.08, -0.02, mon);
  put(rb(0.22, 0.012, 0.16, 0.005), new THREE.MeshStandardMaterial({ color: "#2a2a30", metalness: 0.8, roughness: 0.3 }), 0, 0.006, -0.02, mon);
  put(rb(0.45, 0.02, 0.14, 0.006), new THREE.MeshStandardMaterial({ color: "#2a2c33", roughness: 0.5 }), -0.2, 0.81, 0.15, mesa).rotation.y = 0.3;
  for (let i = 0; i < 6; i++) { const pp = put(new THREE.BoxGeometry(0.3, 0.004, 0.42), new THREE.MeshStandardMaterial({ color: i % 2 ? "#ffffff" : "#f6efdc", roughness: 0.95 }), 0.55 + (i % 3) * 0.01, 0.8 + i * 0.006, 0.1 - i * 0.008, mesa); pp.rotation.y = (i % 3 - 1) * 0.08; }
  put(rb(0.18, 0.06, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: "#20232b", roughness: 0.4 }), 0.88, 0.82, -0.2, mesa);
  put(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 24), new THREE.MeshPhysicalMaterial({ color: "#f7f6f2", roughness: 0.15, clearcoat: 1 }), 0.25, 0.84, 0.25, mesa);
  const placa = put(rb(0.4, 0.09, 0.05, 0.01), new THREE.MeshStandardMaterial({ color: "#d9b44a", metalness: 1, roughness: 0.25 }), 0, 0.84, 0.38, mesa); placa.rotation.x = -0.4;
  // luminária de mesa (luz prática na cinematográfica)
  const lum = new THREE.Group(); lum.position.set(0.95, 0.8, 0.1); mesa.add(lum);
  put(new THREE.CylinderGeometry(0.08, 0.1, 0.02, 24), new THREE.MeshStandardMaterial({ color: "#c9a043", metalness: 1, roughness: 0.3 }), 0, 0.01, 0, lum);
  put(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 10), new THREE.MeshStandardMaterial({ color: "#c9a043", metalness: 1, roughness: 0.3 }), 0, 0.19, 0, lum);
  const cup = put(new THREE.CylinderGeometry(0.06, 0.13, 0.13, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#1f5a3c", roughness: 0.4, side: THREE.DoubleSide }), 0, 0.4, 0, lum); void cup;
  put(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: "#fff3d0" }), 0, 0.37, 0, lum).castShadow = false;

  // estante com livros (fundo, esquerda) e arquivo
  const est = new THREE.Group(); est.position.set(-2.55, 0, -RD / 2 + WT / 2 + 0.22); scene.add(est);
  put(rb(1.5, 2.3, 0.04, 0.01), madeira, 0, 1.15, -0.18, est); for (const s of [-1, 1]) put(rb(0.05, 2.3, 0.4, 0.01), madeira, s * 0.725, 1.15, 0, est); put(rb(1.5, 0.05, 0.4, 0.01), madeira, 0, 2.28, 0, est);
  const coresLivro = cart ? ["#d9534a", "#f2c14e", "#3a7bd5", "#2fa66a", "#7e57c2", "#f08a3a"] : ["#6e2a24", "#2c3e5a", "#4a5e3a", "#7a5a2a", "#3a2a3e", "#8a6a3a", "#1f3a3a"];
  for (let r = 0; r < 4; r++) {
    put(new THREE.BoxGeometry(1.4, 0.03, 0.34), std(darken(pal.madeira, 0.15)), 0, 0.25 + r * 0.52, 0.04, est);
    let x = -0.66; let k = r * 3;
    while (x < 0.6) { const bw = 0.04 + ((k * 7) % 4) * 0.012, bh = 0.3 + ((k * 5) % 5) * 0.03; const b = put(rb(bw, bh, 0.24, 0.004), std(coresLivro[k % coresLivro.length]!, { roughness: 0.7, sheen: 0.3 }), x + bw / 2, 0.27 + r * 0.52 + bh / 2, 0.06, est); if (k % 9 === 4) b.rotation.z = 0.18; x += bw + 0.006; k++; }
  }
  const arq = new THREE.Group(); arq.position.set(-3.25, 0, -1.35); arq.rotation.y = Math.PI / 2; scene.add(arq);
  put(rb(0.5, 1.3, 0.6, 0.02), std("#8a939e", { metalness: 0.6, roughness: 0.4 }), 0, 0.65, 0, arq);
  for (let i = 0; i < 3; i++) put(new THREE.BoxGeometry(0.16, 0.025, 0.02), new THREE.MeshStandardMaterial({ color: "#d9dde4", metalness: 1, roughness: 0.25 }), 0, 1.1 - i * 0.4, 0.31, arq);

  // sofá de couro (ostentação) e mesa de centro com estátua dourada
  const sof = new THREE.Group(); sof.position.set(2.75, 0, 0.9); sof.rotation.y = -Math.PI / 2; scene.add(sof);
  put(rb(2.1, 0.4, 0.9, 0.08), couro, 0, 0.32, 0, sof); put(rb(2.1, 0.62, 0.22, 0.08), couro, 0, 0.72, -0.36, sof);
  for (const s of [-1, 1]) put(rb(0.22, 0.55, 0.9, 0.08), couro, s * 1.06, 0.4, 0, sof);
  for (let i = 0; i < 3; i++) put(rb(0.64, 0.14, 0.7, 0.06), couro, -0.68 + i * 0.68, 0.58, 0.05, sof);
  const estat = new THREE.Group(); estat.position.set(1.65, 0, 1.6); scene.add(estat);
  put(rb(0.9, 0.42, 0.6, 0.03), madeira, 0, 0.21, 0, estat);
  const ouro = new THREE.MeshStandardMaterial({ color: "#e0b04a", metalness: 1, roughness: 0.18 });
  put(new THREE.CylinderGeometry(0.08, 0.1, 0.06, 24), ouro, 0, 0.45, 0, estat); put(new THREE.SphereGeometry(0.08, 24, 16), ouro, 0, 0.62, 0, estat); put(new THREE.CapsuleGeometry(0.06, 0.1, 6, 16), ouro, 0, 0.52, 0, estat);

  // planta (folhas curvas)
  const vaso = new THREE.Group(); vaso.position.set(-3.0, 0, 1.9); scene.add(vaso);
  put(new THREE.CylinderGeometry(0.26, 0.2, 0.5, 28), std(cart ? "#e27a3a" : "#b8653a", { roughness: 0.7 }), 0, 0.25, 0, vaso);
  const folha = std(cart ? "#3fae5f" : "#2f6b3a", { roughness: 0.55, side: THREE.DoubleSide, sheen: 0.4, sheenColor: "#9fe0a0" });
  for (let i = 0; i < 16; i++) {
    const a = i * 2.39, h = 0.6 + (i % 5) * 0.16; const f = put(new THREE.SphereGeometry(0.22, 18, 10, 0, Math.PI), folha, Math.cos(a) * 0.14, h, Math.sin(a) * 0.14, vaso);
    f.scale.set(0.55, 1.3, 0.12); f.rotation.set(0.6 + (i % 3) * 0.2, -a, 0.2);
  }
  // lixeira e cabideiro
  put(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#3a3f4a", metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }), -1.05, 0.17, -1.6);

  // personagens
  const cornelio = buildPersonagem(CHARACTERS.cornelio.look, e, "discurso");
  cornelio.root.position.set(0.55, 0, -0.1); cornelio.root.rotation.y = -0.25; scene.add(cornelio.root);
  const toninho = buildPersonagem(CHARACTERS.toninho.look, e, "cafezinho");
  toninho.root.position.set(-1.25, 0, 0.35); toninho.root.rotation.y = 0.55; scene.add(toninho.root);
  const joana = buildPersonagem(CHARACTERS.joana.look, e, "prancheta");
  joana.root.position.set(2.15, 0, -1.6); joana.root.rotation.y = -0.6; scene.add(joana.root);
  for (const p of [cornelio, toninho, joana]) { const c = contato(cart ? 1.1 : 0.8, cart ? 0.8 : 0.55); c.position.x = p.root.position.x; c.position.z = p.root.position.z; scene.add(c); }

  // luzes
  const luzes: THREE.Object3D[] = [];
  const sol = new THREE.DirectionalLight(cine ? "#ffc58a" : cart ? "#fff1d8" : "#fff4e6", cine ? 5.2 : cart ? 2.4 : 3.2);
  sol.position.set(-8, cine ? 4.2 : 6.5, 0.6); sol.target.position.set(0.5, 0, 0);
  sol.castShadow = true; const sc = sol.shadow; sc.mapSize.set(4096, 4096); sc.camera.left = -6; sc.camera.right = 6; sc.camera.top = 6; sc.camera.bottom = -6; sc.camera.near = 0.5; sc.camera.far = 25; sc.bias = -0.0004; sc.normalBias = 0.02; sc.radius = cart ? 6 : 4;
  scene.add(sol, sol.target); luzes.push(sol);
  const hemi = new THREE.HemisphereLight(cart ? "#cfe8ff" : "#dde8f5", cart ? "#f1d6b8" : "#8a6a50", cine ? 0.25 : cart ? 1.0 : 0.55); scene.add(hemi);
  const fill = new THREE.DirectionalLight(cine ? "#6d8fd0" : "#cfe0ff", cine ? 0.7 : cart ? 0.8 : 0.5); fill.position.set(6, 4, 8); scene.add(fill);
  const rim = new THREE.DirectionalLight(cart ? "#ffe9c8" : cine ? "#9ec4ff" : "#ffffff", cart ? 1.6 : cine ? 1.8 : 0.6); rim.position.set(3, 5, -7); scene.add(rim);
  if (cine) {
    const abaj = new THREE.SpotLight("#ffcf8a", 9, 4, 0.9, 0.6, 1.4); abaj.position.set(1.3, 1.15, -1.15); abaj.target.position.set(0.9, 0.7, -0.6); abaj.castShadow = true; abaj.shadow.mapSize.set(1024, 1024); abaj.shadow.bias = -0.0005; scene.add(abaj, abaj.target);
    // raios de sol: planos aditivos atravessando a janela
    const bm = new THREE.MeshBasicMaterial({ map: beam(), transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 6.2), bm); b.position.set(-1.0 + i * 0.12, 1.25, 0.1 + (i - 2) * 0.32); b.rotation.set(0, Math.PI / 2, 1.05); b.renderOrder = 2; scene.add(b); }
    scene.fog = new THREE.FogExp2("#2a2026", 0.035);
  }
  // poeira em suspensão (só na cinematográfica)
  let poeira: THREE.Points | null = null;
  if (cine) {
    const n = 600, arr = new Float32Array(n * 3); let s = 9; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) { arr[i * 3] = -2.6 + rnd() * 3.4; arr[i * 3 + 1] = 0.3 + rnd() * 2.4; arr[i * 3 + 2] = -1.6 + rnd() * 3.2; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    poeira = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#ffe6c0", size: 0.012, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(poeira);
  }
  return { scene, cornelio, luzes, poeira };
}
