import "server-only";
import { container } from "@/server/container";
import { AppError } from "@/server/core/errors";
import type { QuerySpec } from "@/server/core/query-spec";
import { buildOverview, buildPer100 } from "@/server/services/overview";
import { toPublic } from "@/server/services/public-query";
import { searchPlaces } from "@/server/services/search";
import { UF_BY_CODE, CODE_BY_UF } from "@/server/core/geo";
import type { PlaceDTO, QueryDTO } from "./dto";
import type { FiscalMetric } from "@/server/core/types";

/**
 * Cliente da Brasil Fiscal API para Server Components.
 * Hoje chama os serviços em processo; o contrato (DTOs de lib/dto.ts) é idêntico ao das rotas /api/v1,
 * então trocar por `fetch(API_BASE_URL + ...)` quando a API for separada não afeta nenhuma página.
 */
export type Result<T> = { ok: true; data: T } | { ok: false; message: string; setup?: boolean };

async function wrap<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof AppError && e.kind === "INTERNAL" && /SUPABASE|não configurada/i.test(e.technical)) return { ok: false, setup: true, message: "O Supabase ainda não foi configurado neste ambiente." };
    if (e instanceof AppError && e.kind === "NOT_FOUND") return { ok: false, message: "Não encontramos este local." };
    if (e instanceof AppError && e.kind === "SOURCE_UNAVAILABLE") return { ok: false, message: "A fonte oficial está temporariamente indisponível e ainda não temos dados salvos." };
    console.error("[brasil-fiscal] server-api", e instanceof Error ? e.message : e);
    return { ok: false, message: "Não foi possível carregar os dados agora. Tente novamente em instantes." };
  }
}

export const defaultYear = () => new Date().getUTCFullYear() - 1;

export async function getPlace(type: PlaceDTO["type"], code: string): Promise<Result<{ place: PlaceDTO; breadcrumb: Array<{ type: string; code: string; name: string }> }>> {
  return wrap(async () => {
    const { data, router } = container();
    let e = await data.findEntity({ type, code });
    if (!e) { await router.catalog.ensure(); e = await data.findEntity({ type, code }); }
    if (!e) throw new AppError("NOT_FOUND", `${type}:${code}`);
    const breadcrumb = [{ type: "COUNTRY", code: "1", name: "Brasil" }];
    if (type === "MUNICIPALITY") {
      const st = await data.findEntity({ type: "STATE", code: code.slice(0, 2) });
      if (st) breadcrumb.push({ type: "STATE", code: st.code, name: st.name });
    }
    if (type !== "COUNTRY") breadcrumb.push({ type: e.type, code: e.code, name: e.name });
    return { place: { type: e.type as PlaceDTO["type"], code: e.code, name: e.name, uf: e.uf, population: e.population }, breadcrumb };
  });
}

export async function getPlaceByUf(uf: string) {
  const code = CODE_BY_UF[uf.toUpperCase()];
  if (!code) return { ok: false, message: "Estado não encontrado." } as Result<never>;
  return getPlace("STATE", code);
}

export const ufOf = (code: string) => UF_BY_CODE[code.slice(0, 2)] ?? null;

export async function getOverview(type: PlaceDTO["type"], code: string, year = defaultYear()) {
  return wrap(async () => {
    const { data, router } = container();
    await router.ensureRegistry();
    let e = await data.findEntity({ type, code });
    if (!e) { await router.catalog.ensure(); e = await data.findEntity({ type, code }); }
    if (!e) throw new AppError("NOT_FOUND", `${type}:${code}`);
    return buildOverview(router, e, year);
  });
}

export async function getPer100(o: { type: PlaceDTO["type"]; code: string; side: "expense" | "revenue"; lens: "function" | "nature" | "origin" | "tax"; year: number; metric?: FiscalMetric }) {
  return wrap(async () => {
    const { data, router } = container();
    await router.ensureRegistry();
    const e = await data.findEntity({ type: o.type, code: o.code });
    if (!e) throw new AppError("NOT_FOUND", `${o.type}:${o.code}`);
    return buildPer100(router, e, o);
  });
}

export async function getQuery(spec: QuerySpec): Promise<Result<QueryDTO>> {
  return wrap(async () => {
    const { router, data } = container();
    const r = await router.execute(spec);
    const ent = await data.findEntity({ type: spec.entity_type, code: spec.entity_code });
    return toPublic(r, ent ? { name: ent.name, uf: ent.uf } : undefined) as QueryDTO;
  });
}

export async function listPlaces(type: "STATE" | "MUNICIPALITY", opts: { uf?: string; limit: number }): Promise<Result<PlaceDTO[]>> {
  return wrap(async () => {
    const { data, router } = container();
    if ((await data.countEntities(type)) === 0) await router.catalog.ensure();
    return (await data.listEntities(type, opts)).map((e) => ({ type: e.type as PlaceDTO["type"], code: e.code, name: e.name, uf: e.uf, population: e.population }));
  });
}

export async function search(q: string): Promise<Result<PlaceDTO[]>> {
  return wrap(async () => {
    const { data, router } = container();
    return (await searchPlaces(data, router.catalog, q)).map((e) => ({ type: e.type as PlaceDTO["type"], code: e.code, name: e.name, uf: e.uf, population: e.population }));
  });
}
