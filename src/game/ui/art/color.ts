/** Utilidades de cor para o retrato 2D (e para o 3D, que reaproveita os mesmos valores de identidade). */
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
export const hex2rgb = (h: string): [number, number, number] => {
  const m = h.replace("#", "");
  const f = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};
export const rgb2hex = (r: number, g: number, b: number) => `#${[r, g, b].map((x) => clamp(x).toString(16).padStart(2, "0")).join("")}`;
export const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hex2rgb(a), [r2, g2, b2] = hex2rgb(b);
  return rgb2hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};
export const darken = (c: string, t: number) => mix(c, "#000000", t);
export const lighten = (c: string, t: number) => mix(c, "#ffffff", t);
export const lipColor = (skin: string) => mix(darken(skin, 0.22), "#a8323a", 0.38);
