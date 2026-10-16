/** Dinheiro: sempre em reais com 2 casas (arredondado), nunca em ponto flutuante "cru". */
export const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
export const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

const full = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const num1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** "R$ 130.000,00" */
export const brl = (v: number) => full.format(r2(v));

/** Forma curta e legível: "R$ 130 mil", "R$ 1,4 milhão", "R$ 24 milhões". Valores pequenos usam o formato cheio. */
export function brlShort(v: number): string {
  const a = Math.abs(v), sign = v < 0 ? "−" : "";
  if (a >= 1_000_000) {
    const m = a / 1_000_000;
    return `${sign}R$ ${num1.format(m)} ${m >= 2 ? "milhões" : "milhão"}`;
  }
  if (a >= 10_000) return `${sign}R$ ${num1.format(Math.round(a / 1000))} mil`;
  if (a >= 1_000) return `${sign}R$ ${num1.format(a / 1000)} mil`;
  return `${sign}${full.format(a)}`;
}

export const pct = (v: number, d = 1) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: d }).format(v)}%`;

/** FNV-1a 32-bit — hash curto e determinístico (ids de cenário, cache de áudio). Não é criptográfico. */
export function hash32(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** PRNG determinístico (mulberry32) — só para variações cosméticas; as regras nunca dependem de sorte. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
