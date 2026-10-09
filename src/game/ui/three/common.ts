import * as THREE from "three";
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
