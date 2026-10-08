import { UF_NAMES, CODE_BY_UF } from "@/server/core/geo";
import type { PlaceDTO } from "./dto";

export const placeHref = (p: Pick<PlaceDTO, "type" | "code" | "uf">) =>
  p.type === "COUNTRY" ? "/" : p.type === "STATE" ? `/estados/${(p.uf ?? "").toLowerCase()}`
    : p.type === "SUPPLIER" ? `/contratos?cnpj=${p.code}` : p.type === "AGENCY" ? `/contratos?orgao=${p.code}` : `/municipios/${p.code}`;

export const placeKindLabel = (t: PlaceDTO["type"]) => ({ COUNTRY: "País", STATE: "Estado", MUNICIPALITY: "Município", SUPPLIER: "Fornecedor", AGENCY: "Órgão" })[t];

export const placeLabel = (p: Pick<PlaceDTO, "name" | "uf" | "type">) => (p.type === "MUNICIPALITY" && p.uf ? `${p.name} - ${p.uf}` : p.name);

export const STATES = Object.entries(UF_NAMES)
  .map(([uf, name]) => ({ uf, name, code: CODE_BY_UF[uf]! }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
