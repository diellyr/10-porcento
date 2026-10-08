import type { MetadataRoute } from "next";
import { STATES } from "@/lib/places";

const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Páginas estáticas + os 27 estados. Municípios (5.570) são descobertos pela busca e por links internos. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site();
  const fixed = ["", "/para-onde-vai", "/de-onde-vem", "/estados", "/municipios", "/receitas", "/despesas", "/divida", "/beneficios", "/contratos", "/rankings", "/explorar", "/perguntar", "/glossario"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...STATES.map((s) => ({ url: `${base}/estados/${s.uf.toLowerCase()}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
