import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/server/core/errors";
import type { FetchUnit, IGovernmentSource } from "@/server/core/interfaces";
import { QueryRouter } from "@/server/router/query-router";
import { SourceRuntime } from "@/server/router/runtime";
import { resetRateWindows } from "@/server/sources/http";
import { ADAPTERS } from "@/server/sources";
import { dcaDespesasRows, entesRows } from "../fixtures/siconfi";
import { fakeFetch, type FakeRoute } from "@/server/dev/fake-fetch";
import { memoryStack } from "@/server/dev/memory";
import type { FactInput, SourceDefinition } from "@/server/core/types";

const NOW = new Date("2026-10-07T12:00:00Z");
const sleep = async () => undefined;

const spec = (over: Record<string, unknown> = {}) => ({
  kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED",
  category_type: "FUNCTION", category_code: "10", year_from: 2023, year_to: 2023, ...over,
});

const bigEntes = {
  items: [
    ...Array.from({ length: 27 }, (_, i) => ({ cod_ibge: 11 + i, ente: `Estado de T${i}`, uf: "XX", esfera: "Estado", populacao: 1 })),
    ...Array.from({ length: 5570 }, (_, i) => ({ cod_ibge: 3500000 + i, ente: `Município de C${i}`, uf: "SP", esfera: "Município", populacao: 1 })),
  ],
  hasMore: false,
};

const dcaRoute = (status = 200, opts: { value?: number } = {}): FakeRoute => ({
  match: /\/dca\?/,
  status,
  body: (url: string) => {
    const y = Number(new URL(url).searchParams.get("an_exercicio"));
    return { items: dcaDespesasRows.map((r) => ({ ...r, exercicio: y, valor: r.coluna === "Despesas Liquidadas" && r.cod_conta === "FU10" && r.rotulo.startsWith("Despesas (") ? (opts.value ?? r.valor) : r.valor })), hasMore: false };
  },
});

async function setup(routes: FakeRoute[], adapters: IGovernmentSource[] = ADAPTERS, options = {}) {
  resetRateWindows();
  const stack = memoryStack();
  const ff = fakeFetch(routes);
  const runtime = new SourceRuntime({ registry: stack.registry, adapters, fetchImpl: ff.impl, sleep, now: () => NOW, env: {} });
  const router = new QueryRouter({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime, options });
  await router.ensureRegistry();
  await stack.data.upsertEntities([
    { type: "COUNTRY", code: "1", name: "Brasil", uf: null, population: null, parentCode: null },
    { type: "STATE", code: "35", name: "São Paulo", uf: "SP", population: null, parentCode: "1" },
    { type: "MUNICIPALITY", code: "3541406", name: "Praia Grande", uf: "SP", population: 330000, parentCode: "35" },
  ], "seed");
  return { ...stack, ff, router, runtime };
}
const siconfi = (s: Awaited<ReturnType<typeof setup>>) => [...s.store.sources.values()].find((x) => x.slug === "siconfi")!;
const dcaCalls = (ff: { calls: Array<{ url: string }> }) => ff.calls.filter((c) => c.url.includes("/dca?"));

describe("QueryRouter — fluxo principal", () => {
  let s: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => { s = await setup([dcaRoute()]); });

  it("miss → busca na fonte → normaliza → persiste → retorna com proveniência", async () => {
    const r = await s.router.execute(spec());
    expect(r.freshness).toBe("fresh");
    expect(r.facts).toHaveLength(1);
    expect(r.facts[0]).toMatchObject({ value: 450, metric: "EXPENSE_LIQUIDATED", categoryCode: "10", categoryLabel: "Saúde", year: 2023 });
    expect(dcaCalls(s.ff)).toHaveLength(1);
    expect(r.provenance[0]).toMatchObject({ sourceName: "SICONFI", provider: "Tesouro Nacional", dataset: "DCA-Anexo I-E", periodLabel: "2023" });
    expect(r.notice).toBeNull();
    // persistiu estruturado (todas as métricas/categorias da unidade, não só a resposta)
    expect(s.store.facts.size).toBeGreaterThan(3);
  });

  it("hit: segunda consulta idêntica não toca a fonte", async () => {
    await s.router.execute(spec());
    const before = s.ff.calls.length;
    const r = await s.router.execute(spec());
    expect(r.freshness).toBe("cached");
    expect(s.ff.calls.length).toBe(before);
    expect([...s.store.queries.values()][0]!.hits).toBe(1);
  });

  it("consultas equivalentes (ordem das chaves) compartilham o cache", async () => {
    await s.router.execute(spec());
    const before = s.ff.calls.length;
    await s.router.execute({ year_to: 2023, year_from: 2023, category_code: "10", category_type: "FUNCTION", metric: "EXPENSE_LIQUIDATED", entity_code: "3541406", entity_type: "MUNICIPALITY", kind: "series" });
    expect(s.ff.calls.length).toBe(before);
  });

  it("consultas diferentes reaproveitam cobertura: só busca o ano que falta", async () => {
    await s.router.execute(spec());
    await s.router.execute(spec({ metric: "EXPENSE_PAID" })); // mesmo dataset/ano ⇒ já coberto
    expect(dcaCalls(s.ff)).toHaveLength(1);
    const r = await s.router.execute(spec({ year_from: 2022 }));
    expect(dcaCalls(s.ff)).toHaveLength(2);
    expect(r.facts.map((f) => f.year).sort()).toEqual([2022, 2023]);
  });

  it("não consulta anos ainda não publicados (DCA do ano corrente)", async () => {
    const r = await s.router.execute(spec({ year_from: 2026, year_to: 2026 }));
    expect(dcaCalls(s.ff)).toHaveLength(0);
    expect(r.facts).toEqual([]);
    expect(r.freshness).toBe("unavailable");
    expect(r.notice).toMatch(/ainda não foram divulgados/);
  });

  it("forceRefresh ignora cache e cobertura", async () => {
    await s.router.execute(spec());
    await s.router.execute(spec(), { forceRefresh: true });
    expect(dcaCalls(s.ff)).toHaveLength(2);
  });

  it("TTL expirado ⇒ busca novamente", async () => {
    await s.router.execute(spec());
    for (const q of s.store.queries.values()) q.expiresAt = new Date(NOW.getTime() - 1000).toISOString();
    for (const c of s.store.coverage) c.expiresAt = new Date(NOW.getTime() - 1000).toISOString();
    await s.router.execute(spec());
    expect(dcaCalls(s.ff)).toHaveLength(2);
  });

  it("valor alterado pela fonte é versionado, não sobrescrito às cegas", async () => {
    let value = 450;
    const v = await setup([{ match: /\/dca\?/, body: () => ({ items: dcaDespesasRows.map((r) => ({ ...r, valor: r.cod_conta === "FU10" && r.coluna === "Despesas Liquidadas" && r.rotulo.startsWith("Despesas (") ? value : r.valor })), hasMore: false }) }]);
    await v.router.execute(spec());
    value = 460;
    const r = await v.router.execute(spec(), { forceRefresh: true });
    expect(r.facts[0]!.value).toBe(460);
    expect(v.store.versions).toEqual([{ key: expect.any(String), previous: 450, next: 460 }]);
  });

  it("cache negativo: fonte sem dados ⇒ cobertura EMPTY com TTL curto, sem erro", async () => {
    const e = await setup([{ match: /\/dca\?/, body: { items: [], hasMore: false } }]);
    const r = await e.router.execute(spec());
    expect(r.facts).toEqual([]);
    expect(e.store.coverage[0]).toMatchObject({ status: "EMPTY" });
    expect(new Date(e.store.coverage[0]!.expiresAt).getTime() - NOW.getTime()).toBeLessThanOrEqual(360 * 60_000);
  });

  it("ente inexistente ⇒ NOT_FOUND tipado (após carregar o catálogo completo)", async () => {
    const n = await setup([{ match: /\/entes/, body: bigEntes }]);
    await expect(n.router.execute(spec({ entity_code: "9999999" }))).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
  it("catálogo indisponível e ente desconhecido ⇒ SOURCE_UNAVAILABLE (não afirma que não existe)", async () => {
    await expect(s.router.execute(spec({ entity_code: "9999999" }))).rejects.toMatchObject({ kind: "SOURCE_UNAVAILABLE" });
  });
});

describe("QueryRouter — falhas, desativação e fallback", () => {
  it("fonte offline e sem dados salvos ⇒ 'unavailable', sem inventar valores nem vazar erro técnico", async () => {
    const s = await setup([{ match: /\/dca\?/, status: 503, text: "upstream failure" }]);
    const r = await s.router.execute(spec());
    expect(r.freshness).toBe("unavailable");
    expect(r.facts).toEqual([]);
    expect(r.notice).toBe("A fonte oficial está temporariamente indisponível. Ainda não temos dados salvos para esta consulta.");
    expect(r.notice).not.toMatch(/503|upstream/);
    expect(r.diagnostics.join(" ")).toMatch(/503/);
    expect(siconfi(s).status).toBe("OFFLINE");
    expect(siconfi(s).lastError).toMatch(/503/);
  });

  it("fonte offline mas com dados anteriores ⇒ usa o que existe e avisa a data", async () => {
    const s = await setup([dcaRoute()]);
    await s.router.execute(spec());
    for (const c of s.store.coverage) c.expiresAt = new Date(NOW.getTime() - 1000).toISOString();
    for (const q of s.store.queries.values()) q.expiresAt = new Date(NOW.getTime() - 1000).toISOString();
    const down = fakeFetch([{ match: /./, throws: "ECONNREFUSED" }]);
    const rt = new SourceRuntime({ registry: s.registry, fetchImpl: down.impl, sleep, now: () => NOW, env: {} });
    const router2 = new QueryRouter({ data: s.data, cache: s.cache, registry: s.registry, runtime: rt });
    const r = await router2.execute(spec());
    expect(r.freshness).toBe("stale");
    expect(r.facts[0]!.value).toBe(450);
    expect(r.notice).toMatch(/dados mais recentes disponíveis de \d{2}\/\d{2}\/\d{4}/);
    expect(r.notice).not.toMatch(/ECONNREFUSED/);
  });

  it("fonte desativada: zero chamadas externas, continua servindo o que está salvo", async () => {
    const s = await setup([dcaRoute()]);
    await s.router.execute(spec());
    await s.registry.update(siconfi(s).id, { enabled: false });
    for (const c of s.store.coverage) c.expiresAt = new Date(NOW.getTime() - 1000).toISOString();
    for (const q of s.store.queries.values()) q.expiresAt = new Date(NOW.getTime() - 1000).toISOString();
    const before = s.ff.calls.length;
    const r = await s.router.execute(spec());
    expect(s.ff.calls.length).toBe(before);
    expect(r.freshness).toBe("stale");
    expect(r.facts).toHaveLength(1);
    expect(r.notice).toMatch(/não está sendo atualizada/);
  });

  it("desativar não apaga dados existentes", async () => {
    const s = await setup([dcaRoute()]);
    await s.router.execute(spec());
    const n = s.store.facts.size;
    await s.registry.update(siconfi(s).id, { enabled: false });
    expect(s.store.facts.size).toBe(n);
  });

  it("fonte que exige credencial sem credencial ⇒ NOT_CONFIGURED, sem chamar a rede", async () => {
    const s = await setup([]);
    const r = await s.router.execute({ kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "BENEFIT_VALUE", category_type: "BENEFIT", year_from: 2025, year_to: 2025 });
    expect(s.ff.calls).toHaveLength(0);
    expect(r.freshness).toBe("unavailable");
    expect(r.notice).toMatch(/ainda não foi configurada/);
    const pt = [...s.store.sources.values()].find((x) => x.slug === "portal-transparencia")!;
    expect(pt.status).toBe("NOT_CONFIGURED");
  });

  it("com credencial, envia a chave no header e persiste benefícios mensais (valor e beneficiários separados)", async () => {
    const s = await setup([{ match: /bolsa-familia/, body: (u: string) => (new URL(u).searchParams.get("pagina") === "1" ? [{ id: 1, valor: 1000, quantidadeBeneficiados: 10 }] : []) }]);
    const pt = [...s.store.sources.values()].find((x) => x.slug === "portal-transparencia")!;
    await s.registry.setCredential(pt.id, "SEGREDO-1234-ABCD", null);
    const r = await s.router.execute({ kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "BENEFICIARIES", category_type: "BENEFIT", year_from: 2025, year_to: 2025 });
    expect(r.facts.length).toBeGreaterThan(0);
    expect(r.facts.every((f) => f.metric === "BENEFICIARIES" && f.unit === "COUNT")).toBe(true);
    const call = s.ff.calls.find((c) => c.url.includes("bolsa-familia"))!;
    expect(call.headers["chave-api-dados"]).toBe("SEGREDO-1234-ABCD");
    // a chave nunca vai para os logs
    expect(JSON.stringify(s.store.logs)).not.toContain("SEGREDO-1234-ABCD");
  });

  it("fallback: primeira fonte falha ⇒ usa a segunda e registra no log", async () => {
    const mk = (slug: string, priority: number, behavior: "fail" | "ok"): IGovernmentSource => ({
      adapterKey: slug, datasets: ["siconfi.dca.despesas_funcao"],
      definition: { slug, name: slug, description: "", provider: "t", category: "fiscal", sourceType: "REST_API", baseUrl: "https://x.test", documentationUrl: "", authType: "NONE", requiresAuth: false, priority, rateLimitPerMinute: 60, cacheTtlMinutes: 60, healthPath: "/" } as SourceDefinition,
      testConnection: async () => ({ ok: true, httpStatus: 200, latencyMs: 1, message: "ok" }),
      fetchUnit: async (u: FetchUnit) => {
        if (behavior === "fail") throw new AppError("SOURCE_UNAVAILABLE", "primária fora do ar");
        const f: FactInput = { entity_type: u.entity.type, entity_code: u.entity.code, metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", category_code: "10", category_label: "Saúde", period_type: "YEAR", period_year: u.year, period_number: 0, value: 123, unit: "BRL", source_dataset: "alt" };
        return { facts: [f], recordsReceived: 1, skipped: 0, endpoint: "alt" };
      },
    });
    const s = await setup([], [mk("primaria", 1, "fail"), mk("secundaria", 2, "ok")]);
    const r = await s.router.execute(spec());
    expect(r.facts[0]).toMatchObject({ value: 123, sourceSlug: "secundaria" });
    expect(r.freshness).toBe("fresh");
    expect(r.diagnostics.join(" ")).toMatch(/primaria.*primária fora do ar/);
  });

  it("orçamento por consulta: o excedente fica 'partial' e é completado na consulta seguinte", async () => {
    const s = await setup([dcaRoute()], ADAPTERS, { maxUnitsPerQuery: 2 });
    const r1 = await s.router.execute(spec({ year_from: 2018, year_to: 2023 }));
    expect(dcaCalls(s.ff)).toHaveLength(2);
    expect(r1.freshness).toBe("partial");
    expect(s.store.queries.size).toBe(0); // consulta incompleta não é consolidada
    await s.router.execute(spec({ year_from: 2018, year_to: 2023 }));
    await s.router.execute(spec({ year_from: 2018, year_to: 2023 }));
    const r4 = await s.router.execute(spec({ year_from: 2018, year_to: 2023 }));
    expect(r4.freshness).toBe("cached");
    expect(dcaCalls(s.ff)).toHaveLength(6);
  });

  it("registra consulta e acertos de cache no log do router", async () => {
    const s = await setup([dcaRoute()]);
    await s.router.execute(spec());
    await s.router.execute(spec());
    const router = s.store.logs.filter((l) => l.queryType === "router");
    expect(router.map((l) => l.cacheHit)).toEqual([false, true]);
  });

  it("respeita o rate limit da fonte: acima do teto não chama a rede", async () => {
    const s = await setup([dcaRoute()]);
    await s.registry.update(siconfi(s).id, { rateLimitPerMinute: 1 });
    s.store.logs.push({ id: 99, sourceId: siconfi(s).id, endpoint: "x", startedAt: new Date(NOW.getTime() - 5000), durationMs: 1, success: true, queryType: null });
    const r = await s.router.execute(spec());
    expect(s.ff.calls).toHaveLength(0);
    expect(r.notice).toMatch(/Muitas consultas/);
  });
});

describe("catálogo de entes", () => {
  it("carrega o cadastro sob demanda e usa fallback quando a fonte principal falha", async () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 3500000 + i, nome: `Cidade ${i}`, microrregiao: { mesorregiao: { UF: { id: 35, sigla: "SP" } } } }));
    const s = await setup([
      { match: /apidatalake.*\/entes/, status: 503 },
      { match: /localidades\/estados/, body: Array.from({ length: 27 }, (_, i) => ({ id: 11 + i, sigla: "XX", nome: `UF${i}` })) },
      { match: /localidades\/municipios/, body: many(5570) },
    ]);
    s.store.entities.clear();
    await s.router.catalog.ensure();
    expect(await s.data.countEntities("MUNICIPALITY")).toBe(5570);
    expect(entesRows.length).toBeGreaterThan(0);
  });
});
