import { describe, expect, it } from "vitest";
import { rowToFact, type ImportRow } from "@/server/core/csv-import";
import { DATASETS } from "@/server/core/datasets";
import { AppError } from "@/server/core/errors";
import { MemoryImports, memoryStack } from "@/server/dev/memory";
import { fakeFetch, type FakeRoute } from "@/server/dev/fake-fetch";
import { QueryRouter } from "@/server/router/query-router";
import { SourceRuntime } from "@/server/router/runtime";
import { ImportService } from "@/server/services/imports";
import { resetRateWindows } from "@/server/sources/http";
import { ADAPTERS } from "@/server/sources";
import { dcaDespesasRows } from "../fixtures/siconfi";

const NOW = new Date("2026-10-07T12:00:00Z");
const ctx = { importId: "imp1", index: 1, now: NOW };
const row = (o: Partial<ImportRow> = {}): ImportRow => ({ ente_codigo: "3541406", ano: 2023, valor: 1000.456, categoria_codigo: "10", ...o });

describe("rowToFact — regras por conjunto de dados", () => {
  const ds = DATASETS["siconfi.dca.despesas_funcao"]!;

  it("converte, arredonda e marca a origem CSV", () => {
    const r = rowToFact(row({ ente_tipo: "município", metrica: "Despesas Liquidadas", categoria_tipo: "FUNCTION" }), ds, ctx);
    expect(r).toMatchObject({ ok: true, fact: { entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED", category_code: "10", value: 1000.46, period_number: 0, source_record_id: "csv:imp1:1", source_dataset: "siconfi.dca.despesas_funcao (CSV)" } });
  });

  it("exige o que não pode ser deduzido e recusa o que o conjunto não aceita", () => {
    const why = (o: Partial<ImportRow>) => { const r = rowToFact(row(o), ds, ctx); return r.ok ? "ok" : r.reason; };
    expect(why({ ente_tipo: "municipio" })).toMatch(/métrica/);                       // várias métricas: informar
    expect(why({ metrica: "EXPENSE_PAID", ente_tipo: "municipio", categoria_tipo: "TAX" })).toMatch(/categoria TAX/);
    expect(why({ metrica: "REVENUE_REALIZED", ente_tipo: "municipio", categoria_tipo: "FUNCTION" })).toMatch(/métrica REVENUE_REALIZED não é aceita/);
    expect(why({ metrica: "EXPENSE_PAID", ente_tipo: "municipio", categoria_tipo: "FUNCTION", ente_codigo: "354140" })).toMatch(/7 dígitos/);
    expect(why({ metrica: "EXPENSE_PAID", ente_tipo: "bairro", categoria_tipo: "FUNCTION" })).toMatch(/não reconhecido/);
    expect(why({ metrica: "EXPENSE_PAID", ente_tipo: "municipio", categoria_tipo: "FUNCTION", categoria_codigo: " " })).toMatch(/categoria vazio/);
  });

  it("normaliza códigos de função/subfunção como os adaptadores (FU10 → 10, SF10.301 → 10.301)", () => {
    const f = (o: Partial<ImportRow>) => rowToFact(row({ ente_tipo: "municipio", metrica: "EXPENSE_PAID", ...o }), ds, ctx);
    expect(f({ categoria_tipo: "FUNCTION", categoria_codigo: "FU10" })).toMatchObject({ ok: true, fact: { category_code: "10" } });
    expect(f({ categoria_tipo: "FUNCTION", categoria_codigo: "4" })).toMatchObject({ ok: true, fact: { category_code: "04" } });
    expect(f({ categoria_tipo: "SUBFUNCTION", categoria_codigo: "SF10.301" })).toMatchObject({ ok: true, fact: { category_code: "10.301" } });
    expect(f({ categoria_tipo: "FUNCTION", categoria_codigo: "Saúde" })).toMatchObject({ ok: false });
    expect(f({ categoria_tipo: "SUBFUNCTION", categoria_codigo: "10" })).toMatchObject({ ok: false });
  });

  it("estado por sigla, país com código 1, período obrigatório em dados mensais e beneficiários como contagem", () => {
    expect(rowToFact(row({ ente_tipo: "estado", ente_codigo: "SP", metrica: "EXPENSE_PAID", categoria_tipo: "FUNCTION" }), ds, ctx)).toMatchObject({ ok: true, fact: { entity_code: "35" } });
    const bolsa = DATASETS["transparencia.bolsa_familia"]!;
    const base = { ente_codigo: "3541406", ano: 2024, valor: 3200, metrica: "BENEFICIARIES" };
    expect(rowToFact(base, bolsa, ctx)).toMatchObject({ ok: false, reason: expect.stringMatching(/período/) });
    expect(rowToFact({ ...base, periodo: 13 }, bolsa, ctx)).toMatchObject({ ok: false });
    expect(rowToFact({ ...base, periodo: 3 }, bolsa, ctx)).toMatchObject({ ok: true, fact: { category_code: "BOLSA_FAMILIA", unit: "COUNT", period_type: "MONTH", period_number: 3 } });
    expect(rowToFact({ ...base, periodo: 3, valor: -1 }, bolsa, ctx)).toMatchObject({ ok: false });
  });
});

describe("ImportService — CSV tem prioridade sobre a API", () => {
  const dca: FakeRoute = {
    match: /\/dca\?/,
    body: (url: string) => ({ items: dcaDespesasRows.map((r) => ({ ...r, exercicio: Number(new URL(url).searchParams.get("an_exercicio")) })), hasMore: false }),
  };
  const spec = (year: number) => ({ kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", category_code: "10", year_from: year, year_to: year });
  const actor = { id: "u1", email: "ti@local" };

  async function setup() {
    resetRateWindows();
    const stack = memoryStack();
    const ff = fakeFetch([dca]);
    const runtime = new SourceRuntime({ registry: stack.registry, adapters: ADAPTERS, fetchImpl: ff.impl, sleep: async () => undefined, now: () => NOW, env: {} });
    const router = new QueryRouter({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime });
    await router.ensureRegistry();
    await stack.data.upsertEntities([
      { type: "COUNTRY", code: "1", name: "Brasil", uf: null, population: null, parentCode: null },
      { type: "STATE", code: "35", name: "São Paulo", uf: "SP", population: null, parentCode: "1" },
      { type: "MUNICIPALITY", code: "3541406", name: "Praia Grande", uf: "SP", population: 330000, parentCode: "35" },
    ], "seed");
    const svc = new ImportService({ registry: stack.registry, imports: new MemoryImports(stack.store), data: stack.data, cache: stack.cache, runtime });
    const apiCalls = () => ff.calls.filter((c) => c.url.includes("/dca?")).length;
    return { ...stack, router, svc, apiCalls };
  }
  const csvRows = (value: number) => [
    { ente_tipo: "MUNICIPALITY", ente_codigo: "3541406", ano: 2023, metrica: "EXPENSE_LIQUIDATED", categoria_tipo: "FUNCTION", categoria_codigo: "10", categoria_rotulo: "Saúde", valor: value },
    { ente_tipo: "MUNICIPALITY", ente_codigo: "3541406", ano: 2023, metrica: "EXPENSE_LIQUIDATED", categoria_tipo: "FUNCTION", categoria_codigo: "12", categoria_rotulo: "Educação", valor: value / 2 },
  ];

  it("consulta o CSV primeiro: não chama a API para o que o CSV cobre, e chama para o resto", async () => {
    const s = await setup();
    const imp = await s.svc.start("siconfi", { dataset: "siconfi.dca.despesas_funcao", filename: "despesas.csv", totalRows: 2 }, actor);
    const r = await s.svc.chunk("siconfi", imp.id, { rows: csvRows(777) });
    expect(r).toMatchObject({ saved: 2, rejected: 0 });
    await s.svc.finish("siconfi", imp.id, actor);

    const covered = await s.router.execute(spec(2023));
    expect(s.apiCalls()).toBe(0);                           // CSV atendeu
    expect(covered.facts).toHaveLength(1);
    expect(covered.facts[0]).toMatchObject({ value: 777, categoryCode: "10" });
    expect(covered.provenance[0]).toMatchObject({ sourceName: "SICONFI", dataset: "siconfi.dca.despesas_funcao (CSV)" });

    const other = await s.router.execute(spec(2022));       // ano fora do CSV → API
    expect(s.apiCalls()).toBe(1);
    expect(other.facts).toHaveLength(1);
  });

  it("substitui o que a API já tinha (sem duplicar) e desfazer devolve a unidade para a API", async () => {
    const s = await setup();
    await s.router.execute(spec(2023));                     // API grava a unidade
    expect(s.apiCalls()).toBe(1);
    const before = [...s.store.facts.values()].filter((f) => f.categoryCode === "10" && f.metric === "EXPENSE_LIQUIDATED" && f.year === 2023);
    expect(before).toHaveLength(1);

    const imp = await s.svc.start("siconfi", { dataset: "siconfi.dca.despesas_funcao", filename: "d.csv", totalRows: 2 }, actor);
    await s.svc.chunk("siconfi", imp.id, { rows: csvRows(999) });
    await s.svc.finish("siconfi", imp.id, actor);
    const after = [...s.store.facts.values()].filter((f) => f.categoryCode === "10" && f.metric === "EXPENSE_LIQUIDATED" && f.year === 2023);
    expect(after).toHaveLength(1);                          // nada de dupla contagem
    expect(after[0]).toMatchObject({ value: 999, sourceDataset: "siconfi.dca.despesas_funcao (CSV)" });
    expect((await s.router.execute(spec(2023))).facts[0]!.value).toBe(999);
    expect(s.apiCalls()).toBe(1);                           // continuou sem nova chamada

    const undo = await s.svc.rollback("siconfi", imp.id, actor);
    expect(undo.facts).toBe(2);
    expect(undo.import.status).toBe("ROLLED_BACK");
    const back = await s.router.execute(spec(2023));
    expect(s.apiCalls()).toBe(2);                           // voltou para a API
    expect(back.facts[0]!.value).toBe(450);                 // valor da API (fixture)
    await expect(s.svc.rollback("siconfi", imp.id, actor)).rejects.toThrow(AppError);
  });

  it("rejeita linhas inválidas com motivo, sem gravar nada delas, e valida o conjunto de dados da fonte", async () => {
    const s = await setup();
    await expect(s.svc.start("siconfi", { dataset: "transparencia.bpc", filename: "x.csv", totalRows: 1 }, actor)).rejects.toThrow(/não aceita/);
    const imp = await s.svc.start("siconfi", { dataset: "siconfi.dca.despesas_funcao", filename: "d.csv", totalRows: 3 }, actor);
    const r = await s.svc.chunk("siconfi", imp.id, { rows: [...csvRows(10), { ...csvRows(5)[0], ente_codigo: "9999999" }, { ente_codigo: "x", ano: "2023", valor: "1" }] });
    expect(r.saved).toBe(2);
    expect(r.rejected).toBe(2);
    expect(r.reasons.join(" | ")).toMatch(/ente não cadastrado/);
    const done = await s.svc.finish("siconfi", imp.id, actor);
    expect(done).toMatchObject({ status: "DONE", rowsSaved: 2, rowsRejected: 2 });
    // importação inexistente / de outra fonte
    await expect(s.svc.chunk("siconfi", "nao-existe", { rows: csvRows(1) })).rejects.toThrow(AppError);
  });

  it("lotes de uma mesma importação que tocam a mesma unidade não apagam o que já foi gravado", async () => {
    const s = await setup();
    const imp = await s.svc.start("siconfi", { dataset: "siconfi.dca.despesas_funcao", filename: "d.csv", totalRows: 2 }, actor);
    const [a, b] = csvRows(100);
    await s.svc.chunk("siconfi", imp.id, { rows: [a] });
    await s.svc.chunk("siconfi", imp.id, { rows: [b] });
    const kept = [...s.store.facts.values()].filter((f) => f.year === 2023 && f.metric === "EXPENSE_LIQUIDATED" && f.recordId?.startsWith(`csv:${imp.id}:`));
    expect(kept.map((f) => f.categoryCode).sort()).toEqual(["10", "12"]);
  });
});
