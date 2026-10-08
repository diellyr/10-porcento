import { createHash } from "node:crypto";

import { normalizeText } from "./text";
export { normalizeText };

/** JSON canônico: chaves ordenadas, undefined/null removidos. Base do hash de cache. */
export function canonicalJson(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .filter(([, x]) => x !== undefined && x !== null)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([k, x]) => [k, walk(x)]),
      );
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export const hashOf = (value: unknown) => sha256(canonicalJson(value));

/** Converte número em formato JSON ou pt-BR ("1.234,56") para number; retorna null se inválido. */
export function parseNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.trim();
  if (!s) return null;
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function formatCnpj(d: string): string {
  const x = onlyDigits(d);
  return x.length === 14 ? x.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : d;
}
