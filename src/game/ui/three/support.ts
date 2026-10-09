"use client";
import type { Settings } from "../store";

export type Quality = "alta" | "media" | "baixa";
let cached: boolean | null = null;

/** O dispositivo consegue desenhar 3D? (WebGL disponível). Sem isso, o jogo usa a alternativa 2D equivalente. */
export function webglOk(): boolean {
  if (cached !== null) return cached;
  try {
    const c = document.createElement("canvas");
    cached = !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { cached = false; }
  return cached;
}

/** Qualidade automática por memória/núcleos/ponteiro; pode ser forçada nas configurações. */
export function qualidadeFinal(cfg: Settings["qualidade3d"]): Quality | "2d" {
  if (cfg === "2d") return "2d";
  if (!webglOk()) return "2d";
  if (cfg !== "auto") return cfg;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const fraco = (nav.deviceMemory ?? 4) <= 2 || (navigator.hardwareConcurrency ?? 4) <= 2;
  const movel = matchMedia("(pointer: coarse)").matches;
  return fraco ? "baixa" : movel ? "media" : "alta";
}
export const pixelRatioFor = (q: Quality) => Math.min(window.devicePixelRatio || 1, q === "alta" ? 2 : q === "media" ? 1.5 : 1);
