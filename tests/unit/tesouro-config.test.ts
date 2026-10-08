import { describe, expect, it } from "vitest";
import { AppError } from "@/server/core/errors";
import { DATASETS } from "@/server/core/datasets";
import { fakeFetch } from "@/server/dev/fake-fetch";
import { memoryStack } from "@/server/dev/memory";
import { QueryRouter } from "@/server/router/query-router";
import { SourceRuntime } from "@/server/router/runtime";
import { SourceAdminService } from "@/server/services/source-admin";
import { clearDownloadMemo, fileDatasetExample, validateFileDatasetsConfig } from "@/server/sources/dataset-download";
import { resetRateWindows } from "@/server/sources/http";

const NOW = new Date("2026-10-07T12:00:00Z");
const actor = { id: "u1", email: "admin@bf.test" };
const URL = "https://www.tesourotransparente.gov.br/ckan/dataset/dpf/resource/x/download/dpf.csv";
// valores em centavos (scale 0.01): 1.234.567.890 centavos + 100 centavos = R$ 12.345.679,90 no total
const CSV = "Ano;Titulo;Valor\n2024;DPF;1234567890\n2024;DPF;100\n2023;DPF;999\n";
const cfg = (category_type: string, metric = "DEBT") => ({
  datasets: { "tesouro.divida_publica": { url: URL, delimiter: ";", encoding: "utf-8", columns: { year: "Ano", category_code: "Titulo", value: "Valor" }, metric, category_type, unit: "BRL", scale: 0.01 } },
});
const spec = { kind: "series", entity_type: "COUNTRY", entity_code: "1", metric: "DEBT", category_type: "DEBT_FEDERAL", year_from: 2024, year_to: 2024 };

async function setup(status = 200) {
  resetRateWindows(); clearDownloadMemo();
  const stack = memoryStack();
  const ff = fakeFetch([{ match: /dpf\.csv/, status, text: status === 200 ? CSV : "erro" }]);
  const runtime = new SourceRuntime({ registry: stack.registry, fetchImpl: ff.impl, sleep: async () => undefined, now: () => NOW, env: {} });
  const router = new QueryRouter({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime });
  const admin = new SourceAdminService(stack.registry, runtime, stack.cache, router);
  await router.ensureRegistry();
  await stack.data.upsertEntities([{ type: "COUNTRY", code: "1", name: "Brasil", uf: null, population: null, parentCode: null }], "t");
  const source = (await stack.registry.getBySlug("tesouro-nacional"))!;
  const logs = () => stack.store.logs.filter((l) => l.sourceId === source.id);
  return { ...stack, router, admin, source, logs };
}
const msg = (fn: () => void) => { try { fn(); } catch (e) { return e instanceof AppError ? e.technical : String(e); } return ""; };

describe("validação da configuração de dataset contra o catálogo", () => {
  it("aceita a configuração correta e recusa a categoria antiga dizendo o campo e os valores permitidos", () => {
    expect(() => validateFileDatasetsConfig(cfg("DEBT_FEDERAL"), ["tesouro.divida_publica"])).not.toThrow();
    expect(msg(() => validateFileDatasetsConfig(cfg("DEBT"), ["tesouro.divida_publica"]))).toBe('config.datasets["tesouro.divida_publica"].category_type "DEBT" inválido para tesouro.divida_publica. Valores permitidos: DEBT_FEDERAL');
    expect(msg(() => validateFileDatasetsConfig(cfg("DEBT_FEDERAL", "TAX"), ["tesouro.divida_publica"]))).toMatch(/\.metric "TAX" inválido.*Valores permitidos: DEBT$/);
  });
  it("recusa dataset desconhecido, coluna faltando e escala inválida", () => {
    expect(msg(() => validateFileDatasetsConfig({ datasets: { "x.y": {} } }, ["tesouro.divida_publica"]))).toMatch(/dataset inválido.*tesouro\.divida_publica/);
    const c = cfg("DEBT_FEDERAL") as any;
    delete c.datasets["tesouro.divida_publica"].columns.value;
    expect(msg(() => validateFileDatasetsConfig(c, ["tesouro.divida_publica"]))).toMatch(/columns\.value é obrigatório/);
    const z = cfg("DEBT_FEDERAL") as any; z.datasets["tesouro.divida_publica"].scale = 0;
    expect(msg(() => validateFileDatasetsConfig(z, ["tesouro.divida_publica"]))).toMatch(/scale/);
  });
  it("os modelos gerados do catálogo passam na própria validação (nunca divergem)", () => {
    for (const id of ["receita.arrecadacao", "tesouro.divida_publica", "tesouro.resultado_fiscal"]) {
      const ex = fileDatasetExample(id) as any;
      ex.datasets[id].url = "https://x.test/a.csv";
      expect(() => validateFileDatasetsConfig(ex, [id])).not.toThrow();
    }
    const d = (fileDatasetExample("tesouro.divida_publica") as any).datasets["tesouro.divida_publica"];
    expect(d).toMatchObject({ metric: "DEBT", category_type: "DEBT_FEDERAL" });
    expect(DATASETS["tesouro.divida_publica"]!.categoryTypes).toContain(d.category_type);
  });
  it("o painel não grava configuração inválida e grava a correta (updateSettings)", async () => {
    const s = await setup();
    await expect(s.admin.updateSettings("tesouro-nacional", { config: cfg("DEBT") }, actor)).rejects.toMatchObject({ kind: "VALIDATION", technical: expect.stringContaining("Valores permitidos: DEBT_FEDERAL") });
    expect((await s.registry.getBySlug("tesouro-nacional"))!.config).toEqual({ datasets: {} });
    const v = await s.admin.updateSettings("tesouro-nacional", { config: cfg("DEBT_FEDERAL") }, actor);
    expect(v.datasetsConfigured).toBe(1);
    expect(v.datasetExamples["tesouro.divida_publica"]).toBeDefined();
    await expect(s.admin.addSource({ name: "Espelho DPF", slug: "espelho-dpf", provider: "Instituto X", sourceType: "DATASET_DOWNLOAD", baseUrl: "https://dados.exemplo.gov.br", adapterKey: "file", config: cfg("DEBT") }, actor)).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});

describe("fluxo completo do Tesouro: download → CSV → normalização → validação → persistência", () => {
  it("config antiga (DEBT): download HTTP 200 mas importação rejeitada, nada persistido, log com status 200", async () => {
    const s = await setup();
    await s.registry.update(s.source.id, { config: cfg("DEBT") }); // simula a config legada já gravada no banco
    const r = await s.router.execute(spec, { sourceSlug: "tesouro-nacional", forceRefresh: true });
    expect(r.facts).toHaveLength(0);
    expect(r.diagnostics.join("\n")).toMatch(/validação rejeitou 1\/1 linhas \(categoria DEBT fora do dataset: 1\)/);
    expect(s.store.facts.size).toBe(0);
    const logs = s.logs();
    expect(logs.find((l) => l.endpoint.startsWith("https://") && l.httpStatus === 200 && l.success)).toBeDefined(); // download ok
    const rej = logs.find((l) => l.endpoint.includes("rejeitada"))!;
    expect(rej).toMatchObject({ success: false, httpStatus: 200, errorType: "IMPORT_BAD_RESPONSE", recordsSaved: 0 });
    expect(rej.errorMessage).toMatch(/categoria DEBT fora do dataset/);
    expect((await s.registry.getBySlug("tesouro-nacional"))!).toMatchObject({ lastHttpStatus: 200, status: "DEGRADED" });
  });
  it("config corrigida (DEBT_FEDERAL): 1 registro agregado, aceito e persistido com escala 0,01", async () => {
    const s = await setup();
    await s.admin.updateSettings("tesouro-nacional", { config: cfg("DEBT_FEDERAL") }, actor);
    const r = await s.router.execute(spec, { sourceSlug: "tesouro-nacional", forceRefresh: true });
    expect(r.diagnostics.filter((d) => /rejeit|BAD_RESPONSE/.test(d))).toEqual([]);
    expect(r.facts).toHaveLength(1);
    expect(r.facts[0]).toMatchObject({ metric: "DEBT", categoryType: "DEBT_FEDERAL", year: 2024, value: 12345679.9 });
    expect(s.store.facts.size).toBe(1);
    const persist = s.logs().find((l) => l.endpoint.startsWith("persist tesouro.divida_publica 2024"))!;
    expect(persist).toMatchObject({ success: true, recordsReceived: 3, recordsSaved: 1 });
    expect(s.logs().some((l) => l.endpoint.includes("rejeitada"))).toBe(false);
  });
  it("erro HTTP real do download (503) continua registrado com o próprio status", async () => {
    const s = await setup(503);
    await s.admin.updateSettings("tesouro-nacional", { config: cfg("DEBT_FEDERAL") }, actor);
    await s.router.execute(spec, { sourceSlug: "tesouro-nacional", forceRefresh: true });
    expect(s.logs().some((l) => l.httpStatus === 503 && !l.success)).toBe(true);
    expect((await s.registry.getBySlug("tesouro-nacional"))!.lastHttpStatus).toBe(503);
  });
});
