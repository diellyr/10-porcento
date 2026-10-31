import * as THREE from "three";

/** Texturas procedurais do estudo visual (canvas): madeira, tecido, reboco, couro, tapete, cabelo. Cacheadas por chave. */
const cache = new Map<string, THREE.CanvasTexture>();
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function canvas(n: number, w = n) { const c = document.createElement("canvas"); c.width = w; c.height = n; return { c, g: c.getContext("2d")! }; }
function tex(key: string, c: HTMLCanvasElement, color: boolean, rep: [number, number] = [1, 1]) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace; cache.set(key, t); return t;
}
const get = (key: string) => cache.get(key);

/** Ruído de valor suave (para manchas e veios). */
function noise2(n: number, cell: number): Float32Array {
  const g = Math.ceil(n / cell) + 1, base = new Float32Array(g * g); for (let i = 0; i < base.length; i++) base[i] = rnd();
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const s = (t: number) => t * t * (3 - 2 * t);
    const a = base[y0 * g + x0]!, b = base[y0 * g + x0 + 1]!, c = base[(y0 + 1) * g + x0]!, d = base[(y0 + 1) * g + x0 + 1]!;
    out[y * n + x] = a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy);
  }
  return out;
}

/** Piso de tábuas de madeira: cor e mapa de rugosidade. */
export function wood(tone: string, plank = true): { map: THREE.Texture; rough: THREE.Texture } {
  const key = `wood${tone}${plank}`; const m = get(key), r = get(key + "r"); if (m && r) return { map: m, rough: r };
  seed = 11; const n = 1024; const { c, g } = canvas(n); const { c: cr, g: gr } = canvas(n);
  const base = new THREE.Color(tone); const N = noise2(n, 64), F = noise2(n, 8);
  const img = g.createImageData(n, n), imr = gr.createImageData(n, n);
  const rows = plank ? 8 : 1, rowH = n / rows;
  for (let y = 0; y < n; y++) {
    const row = Math.floor(y / rowH), shift = (row * 337) % n, rowTone = 0.9 + ((row * 53) % 7) / 40;
    for (let x = 0; x < n; x++) {
      const xx = (x + shift) % n, seam = plank && (y % rowH < 2 || (xx % (n / 2)) < 2);
      const grain = Math.sin((y * 0.9 + N[y * n + xx]! * 40 + Math.sin(xx * 0.012) * 6) * 0.9) * 0.5 + 0.5;
      const k = (0.78 + grain * 0.16 + (F[y * n + x]! - 0.5) * 0.08) * rowTone * (seam ? 0.55 : 1);
      const o = (y * n + x) * 4;
      img.data[o] = Math.min(255, base.r * 255 * k); img.data[o + 1] = Math.min(255, base.g * 255 * k); img.data[o + 2] = Math.min(255, base.b * 255 * k); img.data[o + 3] = 255;
      const rv = seam ? 255 : 120 + grain * 60; imr.data[o] = imr.data[o + 1] = imr.data[o + 2] = rv; imr.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0); gr.putImageData(imr, 0, 0);
  return { map: tex(key, c, true), rough: tex(key + "r", cr, false) };
}

/** Trama de tecido (relevo): lã de terno, algodão de camisa, sarja. */
export function weave(fine = 1): THREE.Texture {
  const key = `weave${fine}`; const t = get(key); if (t) return t;
  seed = 23; const n = 256; const { c, g } = canvas(n); const img = g.createImageData(n, n); const step = 4 * fine;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const a = Math.sin((x + y) * Math.PI / step) * 0.5 + 0.5, b = Math.sin((x - y) * Math.PI / (step * 1.7)) * 0.5 + 0.5;
    const v = 0.45 + a * 0.3 + b * 0.12 + (rnd() - 0.5) * 0.12; const o = (y * n + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.max(0, Math.min(255, v * 255)); img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0); return tex(key, c, false, [8, 8]);
}

/** Reboco/parede pintada: leve manchado para quebrar a cor chapada. */
export function plaster(tone: string, k = 0.06): THREE.Texture {
  const key = `pl${tone}${k}`; const t = get(key); if (t) return t;
  seed = 31; const n = 512; const { c, g } = canvas(n); const N = noise2(n, 48), F = noise2(n, 6); const base = new THREE.Color(tone); const img = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = 1 + (N[i]! - 0.5) * k * 2 + (F[i]! - 0.5) * k; const o = i * 4; img.data[o] = Math.min(255, base.r * 255 * v); img.data[o + 1] = Math.min(255, base.g * 255 * v); img.data[o + 2] = Math.min(255, base.b * 255 * v); img.data[o + 3] = 255; }
  g.putImageData(img, 0, 0); return tex(key, c, true, [3, 2]);
}

/** Couro: granulado fino para relevo. */
export function grain(): THREE.Texture {
  const t = get("grain"); if (t) return t;
  seed = 41; const n = 256; const { c, g } = canvas(n); const N = noise2(n, 3); const img = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = 0.5 + (N[i]! - 0.5) * 0.9 + (rnd() > 0.97 ? -0.25 : 0); const o = i * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.max(0, Math.min(255, v * 255)); img.data[o + 3] = 255; }
  g.putImageData(img, 0, 0); return tex("grain", c, false, [4, 4]);
}

/** Tapete com borda e padrão geométrico discreto. */
export function rug(c1: string, c2: string, borda: string): THREE.Texture {
  const key = `rug${c1}${c2}${borda}`; const t = get(key); if (t) return t;
  seed = 51; const n = 512; const { c, g } = canvas(n);
  g.fillStyle = borda; g.fillRect(0, 0, n, n); g.fillStyle = c1; g.fillRect(28, 28, n - 56, n - 56);
  g.strokeStyle = c2; g.lineWidth = 6; g.strokeRect(52, 52, n - 104, n - 104);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.fillStyle = (i + j) % 2 ? c2 : borda; g.globalAlpha = 0.35; g.beginPath(); g.arc(100 + i * 62, 100 + j * 62, 10, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1; const img = g.getImageData(0, 0, n, n); for (let i = 0; i < n * n; i++) { const v = 1 + (rnd() - 0.5) * 0.12; const o = i * 4; img.data[o] = Math.min(255, img.data[o]! * v); img.data[o + 1] = Math.min(255, img.data[o + 1]! * v); img.data[o + 2] = Math.min(255, img.data[o + 2]! * v); }
  g.putImageData(img, 0, 0); return tex(key, c, true);
}

/** Fios de cabelo (relevo e variação de tom), verticais. */
export function hair(color: string): THREE.Texture {
  const key = `hair${color}`; const t = get(key); if (t) return t;
  seed = 61; const n = 512; const { c, g } = canvas(n); const base = new THREE.Color(color);
  g.fillStyle = `#${base.getHexString()}`; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * n, l = 0.25 + rnd() * 0.5, k = 0.65 + rnd() * 0.7;
    g.strokeStyle = `rgba(${Math.min(255, base.r * 255 * k)},${Math.min(255, base.g * 255 * k)},${Math.min(255, base.b * 255 * k)},0.55)`;
    g.lineWidth = 1 + rnd() * 1.5; g.beginPath(); const y0 = rnd() * n; g.moveTo(x, y0); g.bezierCurveTo(x + (rnd() - 0.5) * 20, y0 + n * l * 0.3, x + (rnd() - 0.5) * 20, y0 + n * l * 0.6, x + (rnd() - 0.5) * 12, y0 + n * l); g.stroke();
  }
  return tex(key, c, true, [3, 1]);
}

/** Íris: anel com fibras, pupila e limbo escuro. */
export function iris(color: string): THREE.Texture {
  const key = `iris${color}`; const t = get(key); if (t) return t;
  seed = 71; const n = 256; const { c, g } = canvas(n); const base = new THREE.Color(color), cx = n / 2;
  g.fillStyle = "#f4efe8"; g.fillRect(0, 0, n, n);
  const gr = g.createRadialGradient(cx, cx, 8, cx, cx, cx * 0.95); gr.addColorStop(0, `#${base.clone().multiplyScalar(0.5).getHexString()}`); gr.addColorStop(0.55, `#${base.clone().lerp(new THREE.Color("#c8a06a"), 0.25).getHexString()}`); gr.addColorStop(0.92, `#${base.clone().multiplyScalar(0.45).getHexString()}`); gr.addColorStop(1, "#1a1210");
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, cx * 0.96, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 180; i++) { const a = rnd() * Math.PI * 2, r0 = cx * 0.32, r1 = cx * (0.6 + rnd() * 0.32); g.strokeStyle = `rgba(255,235,200,${0.05 + rnd() * 0.12})`; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1); g.stroke(); }
  g.fillStyle = "#0b0807"; g.beginPath(); g.arc(cx, cx, cx * 0.36, 0, Math.PI * 2); g.fill();
  return tex(key, c, true);
}

/** Feixe de luz (gradiente vertical) para raios de sol volumétricos falsos. */
export function beam(): THREE.Texture {
  const t = get("beam"); if (t) return t;
  const { c, g } = canvas(256, 64); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,240,210,0.9)"); gr.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = h; g.fillRect(0, 0, 64, 256);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; cache.set("beam", tx); return tx;
}

/** Quadro com pintura/foto genérica (moldura feita em 3D). */
export function picture(kind: "paisagem" | "retrato" | "diploma"): THREE.Texture {
  const key = `pic${kind}`; const t = get(key); if (t) return t;
  const { c, g } = canvas(256, 320);
  if (kind === "paisagem") { const s = g.createLinearGradient(0, 0, 0, 256); s.addColorStop(0, "#7ec3f0"); s.addColorStop(1, "#f6d8a8"); g.fillStyle = s; g.fillRect(0, 0, 320, 256); g.fillStyle = "#5c9a5a"; g.beginPath(); g.moveTo(0, 190); g.quadraticCurveTo(110, 120, 200, 180); g.quadraticCurveTo(260, 150, 320, 175); g.lineTo(320, 256); g.lineTo(0, 256); g.fill(); g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(240, 70, 26, 0, Math.PI * 2); g.fill(); }
  else if (kind === "retrato") { g.fillStyle = "#2d3d5c"; g.fillRect(0, 0, 320, 256); g.fillStyle = "#d9a981"; g.beginPath(); g.ellipse(160, 110, 46, 56, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#1d2f5a"; g.beginPath(); g.ellipse(160, 250, 110, 80, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#2a2321"; g.beginPath(); g.ellipse(160, 70, 50, 26, 0, Math.PI, 0); g.fill(); g.fillStyle = "#c4262e"; g.fillRect(150, 180, 20, 60); g.fillStyle = "#d9b44a"; g.font = "700 22px sans-serif"; g.textAlign = "center"; g.fillText("O DEPUTADO", 160, 30); }
  else { g.fillStyle = "#fbf4e2"; g.fillRect(0, 0, 320, 256); g.strokeStyle = "#b08a3a"; g.lineWidth = 8; g.strokeRect(14, 14, 292, 228); g.fillStyle = "#3a2a18"; g.font = "700 26px serif"; g.textAlign = "center"; g.fillText("HONRA AO MÉRITO", 160, 80); g.font = "16px serif"; g.fillText("por relevantes serviços", 160, 120); g.fillText("de inauguração", 160, 145); g.fillStyle = "#c4262e"; g.beginPath(); g.arc(160, 200, 22, 0, Math.PI * 2); g.fill(); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; cache.set(key, tx); return tx;
}
