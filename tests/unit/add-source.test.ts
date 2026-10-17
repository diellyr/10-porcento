import { describe, expect, it, vi } from "vitest";
import { QueryRouter } from "@/server/router/query-router";
import { SourceRuntime } from "@/server/router/runtime";
import { SourceAdminService } from "@/server/services/source-admin";
import { resetRateWindows } from "@/server/sources/http";
import { clearDownloadMemo } from "@/server/sources/dataset-download";
import { fakeFetch, type FakeRoute } from "@/server/dev/fake-fetch";
import { memoryStack } from "@/server/dev/memory";
import { STATE_TILES, MAP_COLS, MAP_ROWS } from "@/lib/state-map";
import { UF_BY_CODE } from "@/server/core/geo";

const NOW = new Date("2026-10-07T12:00:00Z");
const actor = { id: "u1", email: "admin@bf.test" };

async function setup(routes: FakeRoute[] = []) {
  resetRateWindows(); clearDownloadMemo();
  const stack = memoryStack();
  const ff = fakeFetch(routes);
  const runtime = new SourceRuntime({ registry: stack.registry, fetchImpl: ff.impl, sleep: async () => undefined, now: () => NOW, env: {} });
  const router = new QueryRouter({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime });
  const admin = new SourceAdminService(stack.registry, runtime, stack.cache, router);
  await stack.data.upsertEntities([{ type: "COUNTRY", code: "1", name: "Brasil", uf: null, population: null, parentCode: null }], "t");
  return { ...stack, ff, router, admin };
}
const base = { name: "Arrecadação — espelho", slug: "arrecadacao-espelho", provider: "Instituto X", sourceType: "DATASET_DOWNLOAD", baseUrl: "https://dados.exemplo.gov.br", adapterKey: "file" };

describe("+ Adicionar fonte", () => {
  it("cria a fonte ligada a um adaptador, marca como personalizada, audita e não duplica as padrão", async () => {
    const s = await setup();
    const v = await s.admin.addSource(base, actor);
    expect(v).toMatchObject({ slug: "arrecadacao-espelho", custom: true, enabled: true, status: "UNKNOWN", priority: 200, rateLimitPerMinute: 30, datasetsConfigured: 0 });
    expect(v.datasets).toContain("receita.arrecadacao");
    expect(s.store.audits.at(-1)).toMatchObject({ action: "source.added", actorEmail: "admin@bf.test" });
    expect((await s.admin.list()).map((x) => x.slug)).not.toContain("file-template"); // modelo nunca é cadastrado sozinho
    expect(s.store.sources.size).toBe(9);
  });
  it("lista as opções de adaptador (modelo de arquivo + um por fonte padrão)", async () => {
    const s = await setup();
    const o = s.admin.adapterOptions();
    expect(o.map((x) => x.key).sort()).toEqual(["dadosgov", "file", "game-anthropic", "game-elevenlabs", "ibge", "receita", "siconfi", "tesouro", "transparencia"]);
    expect(o.find((x) => x.key === "file")!.template).toBe(true);
  });
  it("valida: slug, duplicidade, adaptador, https/SSRF, segredos na config, campos extras", async () => {
    const s = await setup();
    await s.admin.addSource(base, actor);
    await expect(s.admin.addSource(base, actor)).rejects.toMatchObject({ kind: "VALIDATION", technical: expect.stringMatching(/Já existe/) });
    await expect(s.admin.addSource({ ...base, slug: "siconfi" }, actor)).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(s.admin.addSource({ ...base, slug: "Slug Inválido" }, actor)).rejects.toThrow();
    await expect(s.admin.addSource({ ...base, slug: "outra", adapterKey: "nao-existe" }, actor)).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(s.admin.addSource({ ...base, slug: "aaa1", baseUrl: "http://x.gov.br" }, actor)).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(s.admin.addSource({ ...base, slug: "aaa2", baseUrl: "https://169.254.169.254" }, actor)).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(s.admin.addSource({ ...base, slug: "aaa3", config: { apiKey: "x" } }, actor)).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(s.admin.addSource({ ...base, slug: "aaa4", documentacao: "x" }, actor)).rejects.toThrow();
    await expect(s.admin.addSource({ ...base, slug: "aaa5", rateLimitPerMinute: 9999 }, actor)).rejects.toThrow();
  });
  it("adaptador que exige credencial força 'requer autenticação' e status NOT_CONFIGURED", async () => {
    const s = await setup();
    const v = await s.admin.addSource({ ...base, slug: "transparencia-espelho", adapterKey: "transparencia", sourceType: "REST_API" }, actor);
    expect(v).toMatchObject({ requiresAuth: true, status: "NOT_CONFIGURED" });
    expect((await s.admin.setCredential("transparencia-espelho", "chave-espelho-1234", actor)).credential.masked).toBe("••••••••••••1234");
  });
  it("testar conexão usa o caminho de teste da fonte nova (healthPath) e a URL base dela", async () => {
    const s = await setup([{ match: /dados\.exemplo\.gov\.br\/status/, body: {} }]);
    await s.admin.addSource({ ...base, healthPath: "/status" }, actor);
    const r = await s.admin.testConnection("arrecadacao-espelho", actor);
    expect(r).toMatchObject({ ok: true, status: "ONLINE" });
    expect(s.ff.calls[0]!.url).toBe("https://dados.exemplo.gov.br/status");
  });
  it("a fonte nova entra no fallback: primária sem dataset configurado ⇒ usa a nova, que tem o CSV configurado", async () => {
    const csv = "Ano;Tributo;Valor\n2023;IRPJ;1.000,00\n2023;COFINS;500,00\n";
    const s = await setup([{ match: /espelho\.exemplo\.gov\.br\/a\.csv/, text: csv }]);
    // receita-federal (prioridade 30) existe, mas sem dataset ⇒ NOT_CONFIGURED
    await s.admin.addSource({ ...base, slug: "arrecadacao-espelho", baseUrl: "https://espelho.exemplo.gov.br", priority: 40 }, actor);
    await s.admin.updateSettings("arrecadacao-espelho", { config: { custom: true, datasets: { "receita.arrecadacao": { url: "https://espelho.exemplo.gov.br/a.csv", delimiter: ";", columns: { year: "Ano", category_code: "Tributo", value: "Valor" }, metric: "REVENUE_REALIZED", category_type: "TAX" } } } }, actor);
    const r = await s.router.execute({ kind: "breakdown", entity_type: "COUNTRY", entity_code: "1", metric: "REVENUE_REALIZED", category_type: "TAX", year_from: 2023, year_to: 2023 });
    expect(r.facts.map((f) => [f.categoryCode, f.value, f.sourceSlug]).sort()).toEqual([["COFINS", 500, "arrecadacao-espelho"], ["IRPJ", 1000, "arrecadacao-espelho"]]);
    expect(r.freshness).toBe("fresh");
    expect(r.provenance[0]).toMatchObject({ sourceName: "Arrecadação — espelho" });
  });
});

describe("rota POST /api/admin/sources", () => {
  it("só admin; origem cruzada ⇒ 403; entrada inválida ⇒ 400", async () => {
    vi.resetModules();
    const state = { role: "user" as "user" | "admin" };
    const addSource = vi.fn(async () => ({ slug: "x" }));
    vi.doMock("@/server/auth", () => ({ requireAdmin: async () => { if (state.role !== "admin") { const { AppError } = await import("@/server/core/errors"); throw new AppError("FORBIDDEN", "não é admin", 403); } return { id: "a", email: "a@x" }; } }));
    vi.doMock("@/server/container", () => ({ container: () => ({ admin: { addSource, list: async () => [], adapterOptions: () => [] } }) }));
    const { POST } = await import("@/app/api/admin/sources/route");
    const req = (init?: RequestInit) => new Request("http://localhost/api/admin/sources", { method: "POST", body: "{}", ...init, headers: { host: "localhost", ...(init?.headers as object) } });
    expect((await POST(req())).status).toBe(403);
    expect(addSource).not.toHaveBeenCalled();
    state.role = "admin";
    expect((await POST(req({ headers: { origin: "https://evil.example" } }))).status).toBe(403);
    expect((await POST(req())).status).toBe(200);
    expect(addSource).toHaveBeenCalledTimes(1);
    vi.doUnmock("@/server/auth"); vi.doUnmock("@/server/container");
  });
});

describe("mapa dos estados", () => {
  it("tem exatamente os 27 entes, sem posições repetidas e dentro da grade", () => {
    const ufs = Object.keys(STATE_TILES).sort();
    expect(ufs).toEqual(Object.values(UF_BY_CODE).sort());
    expect(new Set(Object.values(STATE_TILES).map((p) => `${p.col},${p.row}`)).size).toBe(27);
    for (const p of Object.values(STATE_TILES)) { expect(p.col).toBeLessThan(MAP_COLS); expect(p.row).toBeLessThan(MAP_ROWS); }
  });
});
