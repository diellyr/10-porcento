import type { IDataRepository } from "../core/interfaces";
import { UF_NAMES } from "../core/geo";
import { normalizeText } from "../core/normalize";
import type { Entity, EntityType } from "../core/types";
import { isValidCnpj } from "../core/contracts";
import { formatCnpj, onlyDigits } from "../core/normalize";
import type { CatalogService } from "../router/catalog";

/** "Praia Grande - SP", "praia grande/sp", "Santos, SP" → { name, uf }. */
export function parseSearchTerm(raw: string): { name: string; uf: string | null } {
  const t = raw.trim();
  const m = t.match(/^(.*?)[\s]*[-–,/][\s]*([A-Za-z]{2})$/);
  if (m && m[1] && UF_NAMES[m[2]!.toUpperCase()]) return { name: m[1].trim(), uf: m[2]!.toUpperCase() };
  return { name: t, uf: null };
}

export const PLACE_TYPES: EntityType[] = ["STATE", "MUNICIPALITY"];
export const ALL_SEARCH_TYPES: EntityType[] = ["STATE", "MUNICIPALITY", "SUPPLIER", "AGENCY"];

/**
 * Busca global. Estados/municípios (cadastro oficial), fornecedores e órgãos já consultados, e CNPJ digitado
 * (14 dígitos válidos viram um resultado direto). CPF nunca vira resultado (LGPD).
 */
export async function searchPlaces(data: IDataRepository, catalog: CatalogService, raw: string, limit = 8, types: EntityType[] = PLACE_TYPES): Promise<Entity[]> {
  const term = raw.slice(0, 80);
  const digits = onlyDigits(term);
  if (types.includes("SUPPLIER") && digits.length === 14 && /^[\d./-]+$/.test(term.trim()) && isValidCnpj(digits)) {
    const known = await data.findEntity({ type: "SUPPLIER", code: digits });
    return [known ?? { id: `cnpj-${digits}`, type: "SUPPLIER", code: digits, name: formatCnpj(digits), uf: null, population: null, parentId: null }];
  }
  if (digits.length >= 11 && /^[\d./-]+$/.test(term.trim())) return []; // número documental que não é CNPJ válido: nada a buscar
  const { name, uf } = parseSearchTerm(term);
  if (normalizeText(name).length < 2) return [];
  if ((await data.countEntities("STATE")) === 0) await catalog.ensure().catch(() => undefined); // primeira busca carrega o cadastro
  if (types.includes("AGENCY") && normalizeText(name).length >= 3) await catalog.ensureAgencies().catch(() => undefined);
  const found = await data.searchEntities(name, types, uf ? 25 : limit);
  return (uf ? found.filter((e) => e.uf === uf) : found).slice(0, limit);
}
