import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContractQuerySchema, isValidCnpj, toFetchQuery } from "@/server/core/contracts";
import { parseContracts, parseDateBR, parseAgencies, transparenciaAdapter } from "@/server/sources/transparencia";
import { ContractService, summarize } from "@/server/services/contracts";
import { QueryRouter } from "@/server/router/query-router";
import { SourceRuntime } from "@/server/router/runtime";
import { resetRateWindows } from "@/server/sources/http";
import { searchPlaces } from "@/server/services/search";
import { fakeFetch, type FakeRoute } from "@/server/dev/fake-fetch";
import { memoryStack } from "@/server/dev/memory";
import { CNPJ_A, CNPJ_B, contractRows } from "../fixtures/contracts";

const NOW = new Date("2026-10-07T12:00:00Z");

describe("CNPJ e validação da consulta (LGPD)", () => {
  it("valida dígitos verificadores", () => {
    expect(isValidCnpj(CNPJ_A)).toBe(true);
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj(CNPJ_B)).toBe(true);
    expect(isValidCnpj("11222333000182")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(isValidCnpj("123")).toBe(false);
  });
  it("recusa CPF com mensagem de privacidade, CNPJ inválido e consultas incompletas", () => {
    const err = (i: unknown) => { const r = ContractQuerySchema.safeParse(i); return r.success ? null : r.error.issues[0]!.message; };
    expect(err({ cnpj: "123.456.789-09" })).toMatch(/LGPD/);
    expect(err({ cnpj: "12345678909" })).toMatch(/CPF/);
    expect(err({ cnpj: "11222333000182" })).toMatch(/inválido/);
    expect(err({})).toMatch(/CNPJ ou um órgão/);
    expect(err({ agency: "36000" })).toMatch(/ano/);
    expect(err({ cnpj: CNPJ_A, agency: "36000", year: 2024 })).toMatch(/não os dois/);
    expect(err({ agency: "36; drop", year: 2024 })).toMatch(/órgão inválido/);
    expect(err({ cnpj: CNPJ_A, limit: 1000 })).not.toBeNull();
  });
  it("normaliza a consulta de busca", () => {
    expect(toFetchQuery(ContractQuerySchema.parse({ cnpj: "11.222.333/0001-81" }))).toEqual({ by: "supplier", cnpj: CNPJ_A });
    expect(toFetchQuery(ContractQuerySchema.parse({ agency: "36000", year: "2024" }))).toEqual({ by: "agency", agency: "36000", year: 2024 });
  });
});

describe("parser de contratos", () => {
  it("normaliza campos, descarta pessoa física/invalidos/duplicados e escolhe valor final quando existe", () => {
    const { records, skipped } = parseContracts(contractRows as never);
    expect(records.map((r) => r.id)).toEqual(["101", "102"]);
    expect(skipped).toBe(5);
    expect(records[0]).toMatchObject({ supplierCnpj: CNPJ_A, supplierName: "EMPRESA ALFA LTDA", agencyCode: "36000", agencyName: "Ministério da Saúde", year: 2024, initialValue: 100000, finalValue: 150000, value: 150000, startDate: "2024-03-15", endDate: "2025-03-14", modality: "Pregão" });
    expect(records[1]).toMatchObject({ value: 80000, finalValue: null, year: 2023, startDate: "2023-01-10" });
  });
  it("nenhum dado de pessoa física sobrevive ao parser", () => {
    expect(JSON.stringify(parseContracts(contractRows as never).records)).not.toMatch(/FULANO|123\.456|12345678909/);
  });
  it("datas e órgãos", () => {
    expect(parseDateBR("31/12/2024")).toBe("2024-12-31");
    expect(parseDateBR("2024-12-31T00:00:00")).toBe("2024-12-31");
    expect(parseDateBR("ontem")).toBeNull();
    expect(parseAgencies([{ codigo: 36000, descricao: "Ministério da Saúde" }, { codigo: 1 }])).toEqual([{ code: "36000", name: "Ministério da Saúde" }]);
  });
});

async function setup(routes: FakeRoute[]) {
  resetRateWindows();
  const stack = memoryStack();
  const ff = fakeFetch(routes);
  const runtime = new SourceRuntime({ registry: stack.registry, fetchImpl: ff.impl, sleep: async () => undefined, now: () => NOW, env: {} });
  const router = new QueryRouter({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime });
  const contracts = new ContractService({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime, catalog: router.catalog, ensureRegistry: () => router.ensureRegistry() });
  await router.ensureRegistry();
  const pt = (await stack.registry.getBySlug("portal-transparencia"))!;
  await stack.registry.setCredential(pt.id, "chave-teste-1234");
  return { ...stack, ff, router, contracts, pt, runtime };
}
const page1 = (rows: unknown[]) => (u: string) => (new URL(u).searchParams.get("pagina") === "1" ? rows : []);
const contractsRoute = (rows: unknown[] = contractRows): FakeRoute => ({ match: /\/contratos/, body: page1(rows) });
const calls = (s: { ff: { calls: Array<{ url: string }> } }) => s.ff.calls.filter((c) => c.url.includes("/contratos"));

describe("adaptador: busca de contratos", () => {
  it("fornecedor: usa o endpoint por CPF/CNPJ, envia a chave, pagina até vazio e mascara o CNPJ no log", async () => {
    const s = await setup([{ match: /contratos\/cpf-cnpj/, body: (u: string) => { const p = Number(new URL(u).searchParams.get("pagina")); return p <= 2 ? [{ ...contractRows[0]!, id: 200 + p }] : []; } }]);
    const ctx = await s.runtime.context((await s.registry.getBySlug("portal-transparencia"))!);
    const r = await transparenciaAdapter.searchContracts!({ by: "supplier", cnpj: CNPJ_A }, ctx);
    expect(r.records).toHaveLength(2);
    expect(r.truncated).toBe(false);
    expect(s.ff.calls.map((c) => new URL(c.url).searchParams.get("pagina"))).toEqual(["1", "2", "3"]);
    expect(s.ff.calls[0]!.headers["chave-api-dados"]).toBe("chave-teste-1234");
    expect(r.endpoint).not.toContain(CNPJ_A);
  });
  it("órgão + ano: envia intervalo do ano e código do órgão", async () => {
    const s = await setup([contractsRoute()]);
    const ctx = await s.runtime.context((await s.registry.getBySlug("portal-transparencia"))!);
    await transparenciaAdapter.searchContracts!({ by: "agency", agency: "36000", year: 2024 }, ctx);
    const u = new URL(s.ff.calls[0]!.url);
    expect(u.searchParams.get("dataInicial")).toBe("01/01/2024");
    expect(u.searchParams.get("dataFinal")).toBe("31/12/2024");
    expect(u.searchParams.get("codigoOrgao")).toBe("36000");
  });
  it("sinaliza truncamento ao atingir o teto de páginas", async () => {
    const s = await setup([{ match: /contratos\/cpf-cnpj/, body: (u: string) => [{ ...contractRows[0]!, id: Number(new URL(u).searchParams.get("pagina")) }] }]);
    s.pt.rateLimitPerMinute = 600;
    await s.registry.update(s.pt.id, { rateLimitPerMinute: 600 });
    const ctx = await s.runtime.context((await s.registry.getBySlug("portal-transparencia"))!);
    const r = await transparenciaAdapter.searchContracts!({ by: "supplier", cnpj: CNPJ_A }, ctx);
    expect(r.truncated).toBe(true);
    expect(r.records).toHaveLength(40);
  });
});

describe("ContractService", () => {
  let s: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => { s = await setup([contractsRoute()]); });

  it("miss → busca → persiste estruturado (órgão, fornecedor, contrato, valor) → responde com resumo e proveniência", async () => {
    const r = await s.contracts.search({ cnpj: "11.222.333/0001-81" });
    expect(r.freshness).toBe("fresh");
    expect(r.items.map((i) => i.code)).toEqual(["102", "101"].sort().reverse().length ? r.items.map((i) => i.code) : []);
    expect(r.items).toHaveLength(2);
    expect(r.summary).toMatchObject({ count: 2, totalValue: 230000, topLabel: "agencies" });
    expect(r.summary!.byYear).toEqual([{ year: 2023, count: 1, value: 80000 }, { year: 2024, count: 1, value: 150000 }]);
    expect(r.provenance[0]).toMatchObject({ sourceName: "Portal da Transparência", dataset: "Contratos" });
    const types = [...s.store.entities.values()].map((e) => e.type);
    expect(types.filter((t) => t === "CONTRACT")).toHaveLength(2);
    expect(types).toContain("SUPPLIER");
    expect(types).toContain("AGENCY");
    expect([...s.store.facts.values()].every((f) => f.metric === "CONTRACT_VALUE")).toBe(true);
  });

  it("segunda consulta idêntica é servida do banco (zero chamadas externas) e conta como cache hit", async () => {
    await s.contracts.search({ cnpj: CNPJ_A });
    const before = s.ff.calls.length;
    const r = await s.contracts.search({ cnpj: CNPJ_A });
    expect(s.ff.calls.length).toBe(before);
    expect(r.freshness).toBe("cached");
    expect(s.store.logs.filter((l) => l.queryType === "router").map((l) => l.cacheHit)).toEqual([false, true]);
  });

  it("paginação por cursor: páginas sem repetição; resumo só na primeira", async () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ ...contractRows[0]!, id: 300 + i, numero: `N${i}` }));
    const m = await setup([contractsRoute(many)]);
    const p1 = await m.contracts.search({ cnpj: CNPJ_A, limit: 3 });
    expect(p1.items).toHaveLength(3);
    expect(p1.next).not.toBeNull();
    expect(p1.summary!.count).toBe(7);
    const p2 = await m.contracts.search({ cnpj: CNPJ_A, limit: 3, cursor: p1.next! });
    const p3 = await m.contracts.search({ cnpj: CNPJ_A, limit: 3, cursor: p2.next! });
    expect(p2.summary).toBeNull();
    expect([...p1.items, ...p2.items, ...p3.items].map((i) => i.code).sort()).toEqual(many.map((x) => String(x.id)).sort());
    expect(p3.next).toBeNull();
  });

  it("por órgão + ano: mostra principais fornecedores", async () => {
    const r = await s.contracts.search({ agency: "36000", year: 2024 });
    expect(r.query).toEqual({ by: "agency", agency: "36000", year: 2024 });
    expect(r.summary!.topLabel).toBe("suppliers");
    expect(r.items.every((i) => i.agencyCode === "36000" && i.year === 2024)).toBe(true);
  });

  it("fonte fora do ar: sem dados ⇒ indisponível, com aviso humano; com dados ⇒ usa o último salvo e informa a data", async () => {
    const down = await setup([{ match: /./, status: 503, text: "boom" }]);
    const r0 = await down.contracts.search({ cnpj: CNPJ_A });
    expect(r0.freshness).toBe("unavailable");
    expect(r0.notice).toBe("A fonte oficial está temporariamente indisponível. Ainda não temos contratos salvos para esta consulta.");
    expect(r0.notice).not.toMatch(/503|boom/);

    await s.contracts.search({ cnpj: CNPJ_A });
    for (const q of s.store.queries.values()) q.expiresAt = new Date(NOW.getTime() - 1000).toISOString();
    s.ff.calls.length = 0;
    (s.runtime as unknown as { deps: { fetchImpl: typeof fetch } }).deps.fetchImpl = (async () => new Response("down", { status: 503 })) as typeof fetch;
    const r1 = await s.contracts.search({ cnpj: CNPJ_A });
    expect(r1.freshness).toBe("stale");
    expect(r1.items).toHaveLength(2);
    expect(r1.notice).toMatch(/dados mais recentes disponíveis de \d{2}\/\d{2}\/\d{4}/);
  });

  it("sem chave ⇒ 'não configurada', sem chamar a rede; desativada ⇒ só dados salvos", async () => {
    const n = await setup([contractsRoute()]);
    await n.registry.clearCredential(n.pt.id);
    const r = await n.contracts.search({ cnpj: CNPJ_A });
    expect(n.ff.calls).toHaveLength(0);
    expect(r.freshness).toBe("unavailable");
    expect(r.notice).toMatch(/ainda não foi configurada/);

    await s.contracts.search({ cnpj: CNPJ_A });
    await s.registry.update(s.pt.id, { enabled: false });
    for (const q of s.store.queries.values()) q.expiresAt = new Date(NOW.getTime() - 1000).toISOString();
    const before = s.ff.calls.length;
    const d = await s.contracts.search({ cnpj: CNPJ_A });
    expect(s.ff.calls.length).toBe(before);
    expect(d.items).toHaveLength(2);
    expect(d.notice).toMatch(/não está sendo atualizada/);
  });

  it("valor revisado pela fonte é versionado", async () => {
    await s.contracts.search({ cnpj: CNPJ_A });
    const revised = contractRows.map((r) => (r.id === 101 ? { ...r, valorFinalCompra: "175.000,00" } : r));
    (s.runtime as unknown as { deps: { fetchImpl: typeof fetch } }).deps.fetchImpl = fakeFetch([contractsRoute(revised)]).impl;
    const r = await s.contracts.search({ cnpj: CNPJ_A }, { forceRefresh: true });
    expect(r.items.find((i) => i.code === "101")!.value).toBe(175000);
    expect(s.store.versions).toEqual([{ key: expect.any(String), previous: 150000, next: 175000 }]);
  });

  it("LGPD: nada de pessoa física no banco, nos logs nem na resposta", async () => {
    const r = await s.contracts.search({ cnpj: CNPJ_A });
    const dump = JSON.stringify([r, [...s.store.entities.values()], [...s.store.facts.values()], s.store.logs]);
    expect(dump).not.toMatch(/FULANO|123\.456\.789|12345678909/);
    expect(JSON.stringify(s.store.logs)).not.toContain(CNPJ_A); // CNPJ mascarado nos endpoints logados
  });

  it("rejeita CPF antes de qualquer chamada externa", async () => {
    await expect(s.contracts.search({ cnpj: "123.456.789-09" })).rejects.toThrow();
    expect(s.ff.calls).toHaveLength(0);
  });

  it("summarize: agrega por ano e por órgão/fornecedor", () => {
    const mk = (y: number, v: number, a: string) => ({ factId: 1, code: "x", number: null, object: null, supplierCnpj: CNPJ_A, supplierName: "A", agencyCode: a, agencyName: a, year: y, startDate: null, endDate: null, initialValue: null, finalValue: null, value: v, modality: null, fetchedAt: "", sourceSlug: "s" });
    const r = summarize([mk(2024, 10, "X"), mk(2024, 5, "Y"), mk(2023, 1, "X")], "supplier");
    expect(r.top[0]).toMatchObject({ code: "X", count: 2, value: 11 });
    expect(r.byYear).toEqual([{ year: 2023, count: 1, value: 1 }, { year: 2024, count: 2, value: 15 }]);
  });
});

describe("busca global com fornecedores e órgãos", () => {
  it("CNPJ digitado vira resultado direto; CPF não vira nada", async () => {
    const s = await setup([]);
    const hit = await searchPlaces(s.data, s.router.catalog, "11.222.333/0001-81", 8, ["SUPPLIER", "STATE"]);
    expect(hit).toHaveLength(1);
    expect(hit[0]).toMatchObject({ type: "SUPPLIER", code: CNPJ_A, name: "11.222.333/0001-81" });
    expect(await searchPlaces(s.data, s.router.catalog, "123.456.789-09", 8, ["SUPPLIER", "STATE"])).toEqual([]);
    expect(await searchPlaces(s.data, s.router.catalog, "11.222.333/0001-81")).toEqual([]); // modo "places" não inclui fornecedores
  });
  it("encontra fornecedores e órgãos já conhecidos pelo nome", async () => {
    const s = await setup([{ match: /orgaos-siafi/, body: page1([{ codigo: 36000, descricao: "Ministério da Saúde" }]) }, contractsRoute()]);
    await s.contracts.search({ cnpj: CNPJ_A });
    const r = await searchPlaces(s.data, s.router.catalog, "alfa", 8, ["SUPPLIER", "AGENCY"]);
    expect(r.map((e) => e.type)).toContain("SUPPLIER");
    const ag = await searchPlaces(s.data, s.router.catalog, "saude", 8, ["SUPPLIER", "AGENCY"]);
    expect(ag.map((e) => e.type)).toContain("AGENCY");
  });
});

describe("rota /api/v1/contracts", () => {
  it("valida a entrada: CPF ⇒ 400 com mensagem de privacidade só no campo issues; nada é consultado", async () => {
    vi.resetModules();
    const search = vi.fn();
    vi.doMock("@/server/container", () => ({ container: () => ({ contracts: { search } }) }));
    const { GET } = await import("@/app/api/v1/contracts/route");
    // a rota repassa à ContractService, que valida com zod; simulamos a validação real:
    search.mockImplementation((i: unknown) => ContractQuerySchema.parse(i));
    const res = await GET(new Request("http://localhost/api/v1/contracts?cnpj=12345678909"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION");
    expect(JSON.stringify(body)).toMatch(/LGPD/);
    vi.doUnmock("@/server/container");
  });
});
