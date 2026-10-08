import { beforeEach, describe, expect, it } from "vitest";
import type { FetchUnit } from "@/server/core/interfaces";
import { QueryRouter } from "@/server/router/query-router";
import { SourceRuntime } from "@/server/router/runtime";
import { fakeFetch, type FakeRoute } from "@/server/dev/fake-fetch";
import { memoryStack } from "@/server/dev/memory";
import { resetRateWindows } from "@/server/sources/http";
import { ADAPTERS } from "@/server/sources";
import { DESPESAS_ORGAO_PATH, despesasOrgaoPath, parseDespesasOrgao, resetDespesasProgress, transparenciaAdapter } from "@/server/sources/transparencia";

const unit: FetchUnit = { dataset: "transparencia.despesas_orgao", entity: { type: "COUNTRY", code: "1" }, year: 2024, periodNumber: 0 };
const BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

/** API fake: lista de órgãos paginada e despesas por órgão (exige `orgao`/`orgaoSuperior`, como a API real: sem ele, HTTP 400). */
function api(opts: { agencyPages?: Array<Array<{ codigo: string; descricao: string }>>; expensePages?: Record<string, number> } = {}): FakeRoute[] {
  const agencyPages = opts.agencyPages ?? [
    [{ codigo: "36000", descricao: "Ministério da Saúde" }, { codigo: "26000", descricao: "Ministério da Educação" }],
    [{ codigo: "36000", descricao: "Ministério da Saúde" }, { codigo: "20000", descricao: "Presidência" }], // 36000 repetido entre páginas
  ];
  return [
    { match: /\/orgaos-siafi/, body: (u: string) => agencyPages[Number(new URL(u).searchParams.get("pagina")) - 1] ?? [] },
    {
      match: /\/despesas\/por-orgao/,
      body: (u: string) => {
        const q = new URL(u).searchParams;
        const code = q.get("orgao") ?? q.get("orgaoSuperior");
        if (!code || !q.get("ano")) return { status: 400 } as never;
        const pagina = Number(q.get("pagina"));
        const total = opts.expensePages?.[code] ?? 1;
        return pagina <= total ? [{ ano: 2024, codigoOrgao: code, orgao: `Órgão ${code} p${pagina}`, empenhado: 100 + pagina, liquidado: 50, pago: 40 }] : [];
      },
    },
  ];
}
const calls = (ff: { calls: Array<{ url: string }> }, re: RegExp) => ff.calls.map((c) => c.url).filter((u) => re.test(u));

async function setup(routes: FakeRoute[], config: Record<string, unknown> | null = null, wrap?: (f: typeof fetch) => typeof fetch) {
  resetRateWindows(); resetDespesasProgress();
  const s = memoryStack();
  const rt0 = new SourceRuntime({ registry: s.registry });
  await s.registry.ensureSources(rt0.adapters.map((a) => a.definition));
  const source = (await s.registry.getBySlug("portal-transparencia"))!;
  await s.registry.setCredential(source.id, "k-1234567890");
  if (config) await s.registry.update(source.id, { config: { ...source.config, ...config } });
  const ff = fakeFetch(routes);
  const rt = new SourceRuntime({ registry: s.registry, fetchImpl: wrap ? wrap(ff.impl) : ff.impl, sleep: async () => undefined, env: {} });
  return { s, ff, rt, source: (await s.registry.getBySlug("portal-transparencia"))!, ctx: async () => rt.context((await s.registry.getBySlug("portal-transparencia"))!) };
}

describe("montagem das URLs de despesas por órgão", () => {
  it("sempre inclui ano E órgão (SIAFI); a página é acrescentada pelo paginador", () => {
    expect(despesasOrgaoPath(2024, "36000")).toBe("/despesas/por-orgao?ano=2024&orgao=36000");
    expect(despesasOrgaoPath(2024, "20000", "orgaoSuperior")).toBe("/despesas/por-orgao?ano=2024&orgaoSuperior=20000");
    expect(DESPESAS_ORGAO_PATH).toBe("/despesas/por-orgao");
  });
  it("recusa código de órgão que não seja SIAFI numérico (nada de injeção de parâmetros)", () => {
    for (const bad of ["", "36000&pagina=9", "abc", "36 000", "../x"]) expect(() => despesasOrgaoPath(2024, bad)).toThrow(/SIAFI/);
  });
});

describe("transparencia.despesas_orgao — consulta todos os órgãos da lista oficial", () => {
  beforeEach(() => { resetDespesasProgress(); });

  it("lista /orgaos-siafi paginada, consulta CADA órgão com o filtro, pagina as despesas e não duplica", async () => {
    const { ff, ctx } = await setup(api({ expensePages: { "36000": 3 } }));
    const r = await transparenciaAdapter.fetchUnit(unit, await ctx());

    // 1) lista de órgãos paginada até a página vazia
    expect(calls(ff, /orgaos-siafi/).map((u) => new URL(u).searchParams.get("pagina"))).toEqual(["1", "2", "3"]);
    // 2) NENHUMA chamada a por-orgao sem o órgão; todas com o ano
    const exp = calls(ff, /por-orgao/);
    expect(exp.length).toBeGreaterThan(0);
    for (const u of exp) { const q = new URL(u).searchParams; expect(q.get("ano")).toBe("2024"); expect(q.get("orgao")).toMatch(/^\d+$/); }
    // 3) cada órgão (sem repetição) consultado; o órgão com 3 páginas é paginado até a página vazia (4 chamadas)
    const by = (code: string) => exp.filter((u) => new URL(u).searchParams.get("orgao") === code).map((u) => new URL(u).searchParams.get("pagina"));
    expect(by("36000")).toEqual(["1", "2", "3", "4"]);
    expect(by("26000")).toEqual(["1", "2"]);
    expect(by("20000")).toEqual(["1", "2"]);
    // 4) um conjunto de fatos por órgão (3 métricas) — o órgão repetido na lista e as páginas extras não geram duplicatas
    expect(r.incomplete).toBeUndefined();
    const codes = [...new Set(r.facts.map((f) => f.related_code))].sort();
    expect(codes).toEqual(["20000", "26000", "36000"]);
    expect(r.facts).toHaveLength(9);
    expect(new Set(r.facts.map((f) => `${f.related_code}|${f.metric}`)).size).toBe(9);
    expect(r.facts.every((f) => f.entity_type === "COUNTRY" && f.category_type === "AGENCY" && f.period_year === 2024)).toBe(true);
  });

  it("não fixa órgão: sem lista de órgãos não inventa total (erro explícito)", async () => {
    const { ctx, ff } = await setup(api({ agencyPages: [] }));
    await expect(transparenciaAdapter.fetchUnit(unit, await ctx())).rejects.toMatchObject({ kind: "BAD_RESPONSE" });
    expect(calls(ff, /por-orgao/)).toHaveLength(0);
  });

  it("seleção do administrador: só os órgãos configurados, rotulado como seleção (não é total nacional)", async () => {
    const { ctx, ff } = await setup(api(), { despesasOrgaos: ["36000", "36000", "26000"] });
    const r = await transparenciaAdapter.fetchUnit(unit, await ctx());
    expect(calls(ff, /orgaos-siafi/)).toHaveLength(0);
    expect([...new Set(r.facts.map((f) => f.related_code))].sort()).toEqual(["26000", "36000"]);
    expect(r.facts.every((f) => f.source_dataset === "despesas/por-orgao (órgãos selecionados)")).toBe(true);
  });

  it("parâmetro orgaoSuperior configurável e código inválido na seleção é recusado", async () => {
    const a = await setup(api(), { despesasOrgaos: ["20000"], despesasOrgaoParam: "orgaoSuperior" });
    await transparenciaAdapter.fetchUnit(unit, await a.ctx());
    expect(calls(a.ff, /por-orgao/).every((u) => new URL(u).searchParams.get("orgaoSuperior") === "20000" && !new URL(u).searchParams.has("orgao"))).toBe(true);
    const b = await setup(api(), { despesasOrgaos: ["36000&x=1"] });
    await expect(transparenciaAdapter.fetchUnit(unit, await b.ctx())).rejects.toMatchObject({ kind: "VALIDATION" });
  });

  it("orçamento de requisições: devolve PARCIAL (nunca total) e a chamada seguinte continua sem refazer os órgãos prontos", async () => {
    const { ctx, ff } = await setup(api(), { despesasRequestsPerCall: 5 });
    const first = await transparenciaAdapter.fetchUnit(unit, await ctx());
    expect(first.incomplete).toMatchObject({ total: 3 });
    expect(first.incomplete!.done).toBeLessThan(3);
    const doneAfterFirst = new Set(first.facts.map((f) => f.related_code));
    ff.calls.length = 0;

    let last = first, guard = 0;
    while (last.incomplete && guard++ < 5) last = await transparenciaAdapter.fetchUnit(unit, await ctx());
    expect(last.incomplete).toBeUndefined();
    expect([...new Set(last.facts.map((f) => f.related_code))].sort()).toEqual(["20000", "26000", "36000"]);
    expect(last.facts).toHaveLength(9);
    // órgãos já concluídos na 1ª chamada não foram consultados de novo
    for (const code of doneAfterFirst) expect(calls(ff, /por-orgao/).some((u) => new URL(u).searchParams.get("orgao") === code)).toBe(false);
  });

  it("HTTP 429 no meio do caminho: guarda os órgãos já consultados como parcial em vez de perder tudo", async () => {
    let porOrgao = 0;
    const limited = (f: typeof fetch) => ((async (input: RequestInfo | URL, init?: RequestInit) => {
      if (/por-orgao/.test(String(input)) && ++porOrgao > 3) return new Response("{}", { status: 429 });
      return f(input, init);
    }) as typeof fetch);
    const { ctx } = await setup(api(), null, limited);
    const r = await transparenciaAdapter.fetchUnit(unit, await ctx());
    expect(r.incomplete).toMatchObject({ total: 3, reason: "limite de requisições da fonte" });
    expect(r.incomplete!.done).toBeGreaterThanOrEqual(1);
    expect(r.facts.length).toBe(r.incomplete!.done * 3);
  });

  it("HTTP 429 já no primeiro órgão: falha explícita (nada parcial para guardar)", async () => {
    const all429 = (f: typeof fetch) => ((async (input: RequestInfo | URL, init?: RequestInit) => (/por-orgao/.test(String(input)) ? new Response("{}", { status: 429 }) : f(input, init))) as typeof fetch);
    const { ctx } = await setup(api(), null, all429);
    await expect(transparenciaAdapter.fetchUnit(unit, await ctx())).rejects.toMatchObject({ kind: "RATE_LIMITED" });
  });

  it("parser: o mesmo órgão repetido não soma duas vezes", () => {
    const row = { codigoOrgao: "36000", orgao: "Saúde", empenhado: 1, liquidado: 1, pago: 1 };
    const { facts, skipped } = parseDespesasOrgao([row, { ...row, empenhado: 999 }], unit);
    expect(facts).toHaveLength(3);
    expect(facts.find((f) => f.metric === "EXPENSE_COMMITTED")!.value).toBe(1);
    expect(skipped).toBe(1);
  });
});

describe("roteador: unidade parcial não vira cobertura completa", () => {
  beforeEach(() => { resetDespesasProgress(); });
  const NOW = new Date("2026-10-07T12:00:00Z");

  it("salva o que veio, mantém a unidade pendente e responde como parcial (sem total nacional)", async () => {
    resetRateWindows();
    const stack = memoryStack();
    const ff = fakeFetch(api());
    const runtime = new SourceRuntime({ registry: stack.registry, adapters: ADAPTERS, fetchImpl: ff.impl, sleep: async () => undefined, now: () => NOW, env: {} });
    const router = new QueryRouter({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime });
    await router.ensureRegistry();
    const src = (await stack.registry.getBySlug("portal-transparencia"))!;
    await stack.registry.setCredential(src.id, "k-1234567890");
    await stack.registry.update(src.id, { config: { ...src.config, despesasRequestsPerCall: 5 } });
    await stack.data.upsertEntities([{ type: "COUNTRY", code: "1", name: "Brasil", uf: null, population: null, parentCode: null }], "seed");

    const spec = { kind: "breakdown", entity_type: "COUNTRY", entity_code: "1", metric: "EXPENSE_PAID", category_type: "AGENCY", year_from: 2024, year_to: 2024 };
    const r1 = await router.execute(spec);
    expect(r1.freshness).toBe("partial");
    expect(r1.notice).toMatch(/Estamos buscando/);
    expect(stack.store.coverage.filter((c) => c.dataset === "transparencia.despesas_orgao")).toHaveLength(0);

    let last = r1, guard = 0;
    while (last.freshness === "partial" && guard++ < 6) last = await router.execute(spec);
    expect(last.freshness).not.toBe("partial");
    expect(stack.store.coverage.filter((c) => c.dataset === "transparencia.despesas_orgao" && c.status === "OK")).toHaveLength(1);
    expect(new Set(last.facts.map((f) => f.categoryCode)).size).toBe(3);
  });
});
