import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Quality } from "./support";

export function makeRenderer(canvas: HTMLCanvasElement, q: Quality) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: q !== "baixa", alpha: true, powerPreference: q === "alta" ? "high-performance" : "default", preserveDrawingBuffer: false });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === "alta" ? 2 : q === "media" ? 1.5 : 1));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = q !== "baixa";
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.setClearColor(0x000000, 0);
  return r;
}

/** Laço de animação com limite de quadros (30 fps em qualidade média/baixa), pausa em aba oculta e medição de fps. */
export function startLoop(q: Quality, tick: (dt: number, t: number) => void, onFps?: (fps: number) => void) {
  const interval = q === "alta" ? 0 : 1000 / 30;
  let raf = 0, last = performance.now(), start = last, acc = 0, frames = 0, fpsT = last, alive = true;
  const loop = (now: number) => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const dt = now - last;
    if (interval && dt < interval - 1) return;
    last = now; acc += dt;
    tick(Math.min(dt, 100) / 1000, (now - start) / 1000);
    frames++;
    if (now - fpsT >= 1000) { onFps?.(Math.round((frames * 1000) / (now - fpsT))); frames = 0; fpsT = now; }
  };
  raf = requestAnimationFrame(loop);
  return () => { alive = false; cancelAnimationFrame(raf); void acc; };
}

export function disposeTree(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
      for (const v of Object.values(x)) if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
      x.dispose();
    }
  });
}

export const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const gauss = (x: number, s: number) => Math.exp(-(x * x) / (2 * s * s));
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Iluminação por imagem (ambiente de estúdio): reflexos e brilho realistas em pele, olhos, metal e vidro. Devolve a função de descarte. */
export function addEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, intensity = 0.6): () => void {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  const rt = pm.fromScene(env, 0.04);
  scene.environment = rt.texture;
  (scene as unknown as { environmentIntensity: number }).environmentIntensity = intensity;
  env.dispose();
  return () => { rt.dispose(); pm.dispose(); };
}

let poreTex: THREE.CanvasTexture | null = null;
/** Textura de relevo (poros e microirregularidades da pele), gerada uma vez e compartilhada. */
export function poreBump(): THREE.CanvasTexture {
  if (poreTex) return poreTex;
  const n = 256, c = document.createElement("canvas"); c.width = c.height = n;
  const g = c.getContext("2d")!; const img = g.createImageData(n, n);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const base = new Float32Array(n * n); for (let i = 0; i < base.length; i++) base[i] = rnd();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const a = base[y * n + x]!, b = base[((y + 1) % n) * n + x]!, d = base[y * n + ((x + 1) % n)]!, e = base[((y + 1) % n) * n + ((x + 1) % n)]!;
    const v = (a + b + d + e) / 4, pore = rnd() > 0.992 ? 0.35 : 0, k = Math.max(0, Math.min(1, 0.5 + (v - 0.5) * 1.6 - pore));
    const o = (y * n + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(k * 255); img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  poreTex = new THREE.CanvasTexture(c); poreTex.wrapS = poreTex.wrapT = THREE.RepeatWrapping; poreTex.repeat.set(6, 6); poreTex.anisotropy = 4;
  return poreTex;
}

/** Pele com brilho de subsuperfície aproximado: sheen quente, relevo fino de poros e leve emissão da cor da pele. */
export function skinMaterial(color: string | THREE.Color, opts: { vertexColors?: boolean; roughness?: number } = {}): THREE.MeshPhysicalMaterial {
  const col = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color: opts.vertexColors ? new THREE.Color("#ffffff") : col, vertexColors: opts.vertexColors, roughness: opts.roughness ?? 0.52, metalness: 0,
    sheen: 0.35, sheenRoughness: 0.5, sheenColor: col.clone().lerp(new THREE.Color("#ffd8c0"), 0.2),
    clearcoat: 0.08, clearcoatRoughness: 0.6, bumpMap: poreBump(), bumpScale: 0.35,
    emissive: col.clone().multiplyScalar(0.035),
  });
}
