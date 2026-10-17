import { beforeEach, describe, expect, it } from "vitest";
import { QueryRouter } from "@/server/router/query-router";
import { SourceRuntime } from "@/server/router/runtime";
import { SourceAdminService, assertSafeBaseUrl, deriveStatus } from "@/server/services/source-admin";
import { resetRateWindows } from "@/server/sources/http";
import { dbUsageLevel } from "@/lib/db-usage";
import { dcaDespesasRows } from "../fixtures/siconfi";
import { fakeFetch, type FakeRoute } from "@/server/dev/fake-fetch";
import { memoryStack } from "@/server/dev/memory";

const NOW = new Date("2026-10-07T12:00:00Z");
const actor = { id: "u1", email: "admin@bf.test" };

async function setup(routes: FakeRoute[]) {
  resetRateWindows();
  const stack = memoryStack();
  const ff = fakeFetch(routes);
  const runtime = new SourceRuntime({ registry: stack.registry, fetchImpl: ff.impl, sleep: async () => undefined, now: () => NOW, env: {} });
  const router = new QueryRouter({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime });
  const admin = new SourceAdminService(stack.registry, runtime, stack.cache, router);
  await stack.data.upsertEntities([{ type: "MUNICIPALITY", code: "3541406", name: "Praia Grande", uf: "SP", population: 1, parentCode: "35" }], "t");
  return { ...stack, ff, admin, router };
}

describe("Source Registry (primeira execução)", () => {
  it("cadastra automaticamente as fontes principais, mesmo as que exigem credencial", async () => {
    const s = await setup([]);
    const list = await s.admin.list();
    expect(list.map((x) => x.slug).sort()).toEqual(["anthropic-ia", "dados-gov-br", "elevenlabs-voz", "ibge-localidades", "portal-transparencia", "receita-federal", "siconfi", "tesouro-nacional"]);
    expect(list.find((x) => x.slug === "portal-transparencia")).toMatchObject({ status: "NOT_CONFIGURED", requiresAuth: true });
    expect(list.find((x) => x.slug === "siconfi")).toMatchObject({ status: "UNKNOWN", enabled: true });
  });
  it("é idempotente (não duplica nem sobrescreve edições do admin)", async () => {
    const s = await setup([]);
    await s.admin.list();
    await s.admin.updateSettings("siconfi", { priority: 7 }, actor);
    await s.router.ensureRegistry();
    await s.registry.ensureSources(s.router["runtime"].adapters.filter((a) => !a.template).map((a) => a.definition));
    expect(s.store.sources.size).toBe(8);
    expect((await s.admin.get("siconfi")).priority).toBe(7);
  });
});

describe("habilitar / desabilitar", () => {
  it("desabilita sem apagar dados, registra quem/quando e audita", async () => {
    const s = await setup([{ match: /\/dca\?/, body: { items: dcaDespesasRows, hasMore: false } }]);
    await s.router.execute({ kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", year_from: 2023, year_to: 2023 });
    const facts = s.store.facts.size;
    const v = await s.admin.setEnabled("siconfi", false, actor);
    expect(v).toMatchObject({ enabled: false, status: "DISABLED", disabledBy: "u1" });
    expect(v.disabledAt).toBeTruthy();
    expect(s.store.facts.size).toBe(facts);
    expect(s.store.audits.at(-1)).toMatchObject({ action: "source.disabled", actorEmail: "admin@bf.test" });
    const back = await s.admin.setEnabled("siconfi", true, actor);
    expect(back).toMatchObject({ enabled: true, status: "UNKNOWN", disabledAt: null });
    expect(s.store.audits.at(-1)!.action).toBe("source.enabled");
  });
});

describe("credenciais", () => {
  it("nunca expõe o segredo: só máscara; audita sem o valor", async () => {
    const s = await setup([]);
    const v = await s.admin.setCredential("portal-transparencia", "chave-super-secreta-4K8J", actor);
    expect(v.credential).toEqual({ configured: true, masked: "••••••••••••4K8J", origin: "database" });
    expect(JSON.stringify(v)).not.toContain("super-secreta");
    expect(JSON.stringify(s.store.audits)).not.toContain("super-secreta");
    expect(v.status).toBe("UNKNOWN"); // saiu de NOT_CONFIGURED
    const removed = await s.admin.clearCredential("portal-transparencia", actor);
    expect(removed.credential.configured).toBe(false);
    expect(removed.status).toBe("NOT_CONFIGURED");
  });
  it("fonte sem autenticação recusa credencial", async () => {
    const s = await setup([]);
    await expect(s.admin.setCredential("siconfi", "qualquer-coisa-123", actor)).rejects.toMatchObject({ kind: "VALIDATION" });
  });
  it("credencial vinda de variável de ambiente é reconhecida (também mascarada)", async () => {
    const s = await setup([]);
    const rt = new SourceRuntime({ registry: s.registry, env: { PORTAL_TRANSPARENCIA_API_KEY: "env-key-ABCD1234" } });
    const admin = new SourceAdminService(s.registry, rt, s.cache, s.router);
    const v = await admin.get("portal-transparencia");
    expect(v.credential).toMatchObject({ configured: true, origin: "env", masked: "••••••••••••1234" });
  });
});

describe("configurações", () => {
  it("valida limites e audita alterações", async () => {
    const s = await setup([]);
    const v = await s.admin.updateSettings("siconfi", { cacheTtlMinutes: 60, rateLimitPerMinute: 30, priority: 5 }, actor);
    expect(v).toMatchObject({ cacheTtlMinutes: 60, rateLimitPerMinute: 30, priority: 5 });
    expect(s.store.audits.at(-1)).toMatchObject({ action: "source.config_changed" });
    await expect(s.admin.updateSettings("siconfi", { rateLimitPerMinute: 0 }, actor)).rejects.toThrow();
    await expect(s.admin.updateSettings("siconfi", { campoInventado: 1 }, actor)).rejects.toThrow();
  });
  it("bloqueia SSRF e URLs inseguras", () => {
    for (const u of ["http://api.gov.br", "https://localhost/x", "https://127.0.0.1", "https://169.254.169.254/latest", "https://10.0.0.5", "https://192.168.1.1", "https://[::1]/", "https://user:pw@api.gov.br", "ftp://x.gov.br", "não é url"])
      expect(() => assertSafeBaseUrl(u), u).toThrow();
    expect(assertSafeBaseUrl("https://apidatalake.tesouro.gov.br/ords/siconfi/tt").hostname).toBe("apidatalake.tesouro.gov.br");
  });
  it("recusa segredos dentro da config e URLs inseguras em datasets", async () => {
    const s = await setup([]);
    await expect(s.admin.updateSettings("receita-federal", { config: { datasets: {}, apiKey: "x" } }, actor)).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(s.admin.updateSettings("receita-federal", { config: { headers: { Authorization: "Bearer x" } } }, actor)).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(s.admin.updateSettings("receita-federal", { config: { datasets: { "receita.arrecadacao": { url: "http://x.gov.br/a.csv" } } } }, actor)).rejects.toMatchObject({ kind: "VALIDATION" });
  });
  it("aceita dataset configurado e passa a contá-lo", async () => {
    const s = await setup([]);
    const v = await s.admin.updateSettings("receita-federal", { config: { datasets: { "receita.arrecadacao": { url: "https://dados.gov.br/arrec.csv", columns: { year: "ano", category_code: "tributo", value: "valor" }, metric: "REVENUE_REALIZED", category_type: "TAX" } } } }, actor);
    expect(v.datasetsConfigured).toBe(1);
  });
});

describe("testar conexão", () => {
  it("sucesso ⇒ ONLINE com latência, HTTP e log marcado como teste", async () => {
    const s = await setup([{ match: /entes/, body: { items: [] } }]);
    const r = await s.admin.testConnection("siconfi", actor);
    expect(r).toMatchObject({ ok: true, httpStatus: 200, status: "ONLINE", message: "API disponível" });
    expect((await s.admin.get("siconfi")).status).toBe("ONLINE");
    expect(s.store.logs.some((l) => l.isTest)).toBe(true);
    expect((await s.admin.get("siconfi")).lastSuccessAt).toBeTruthy();
  });
  it("HTTP 503 ⇒ OFFLINE, detalhe técnico guardado", async () => {
    const s = await setup([{ match: /entes/, status: 503, text: "Service unavailable" }]);
    const r = await s.admin.testConnection("siconfi", actor);
    expect(r).toMatchObject({ ok: false, httpStatus: 503, status: "OFFLINE" });
    const v = await s.admin.get("siconfi");
    expect(v.lastError).toMatch(/Service unavailable/);
    expect(v.lastFailureAt).toBeTruthy();
  });
  it("erro de rede ⇒ OFFLINE", async () => {
    const s = await setup([{ match: /./, throws: "getaddrinfo ENOTFOUND" }]);
    expect((await s.admin.testConnection("siconfi", actor)).status).toBe("OFFLINE");
  });
  it("sem credencial não chama a rede e marca NOT_CONFIGURED", async () => {
    const s = await setup([]);
    const r = await s.admin.testConnection("portal-transparencia", actor);
    expect(r).toMatchObject({ ok: false, status: "NOT_CONFIGURED" });
    expect(s.ff.calls).toHaveLength(0);
  });
  it("com credencial envia o header e fica ONLINE", async () => {
    const s = await setup([{ match: /orgaos-siafi/, body: [] }]);
    await s.admin.setCredential("portal-transparencia", "minha-chave-1234", actor);
    const r = await s.admin.testConnection("portal-transparencia", actor);
    expect(r.status).toBe("ONLINE");
    expect(s.ff.calls[0]!.headers["chave-api-dados"]).toBe("minha-chave-1234");
  });
  it("HTTP 401 com credencial ⇒ NOT_CONFIGURED (credencial inválida)", async () => {
    const s = await setup([{ match: /orgaos-siafi/, status: 401, text: "unauthorized" }]);
    await s.admin.setCredential("portal-transparencia", "chave-invalida-9999", actor);
    expect((await s.admin.testConnection("portal-transparencia", actor)).status).toBe("NOT_CONFIGURED");
  });
  it("fonte desativada pode ser testada, mas continua DISABLED", async () => {
    const s = await setup([{ match: /entes/, body: { items: [] } }]);
    await s.admin.setEnabled("siconfi", false, actor);
    const r = await s.admin.testConnection("siconfi", actor);
    expect(r.ok).toBe(true);
    expect((await s.admin.get("siconfi")).status).toBe("DISABLED");
  });
  it("deriveStatus: latência alta ⇒ DEGRADED", () => {
    expect(deriveStatus({ ok: true, httpStatus: 200, latencyMs: 9000, message: "" }, true, false)).toBe("DEGRADED");
    expect(deriveStatus({ ok: false, httpStatus: 404, latencyMs: 10, message: "" }, true, false)).toBe("DEGRADED");
  });
});

describe("painel de saúde", () => {
  it("resume contagens por status", async () => {
    const s = await setup([{ match: /entes|estados\/35/, body: { items: [] } }]);
    await s.admin.testConnection("siconfi", actor);
    await s.admin.setEnabled("dados-gov-br", false, actor);
    const h = await s.admin.health();
    expect(h.total).toBe(8);
    expect(h.counts).toMatchObject({ ONLINE: 1, DISABLED: 1, NOT_CONFIGURED: 3 });
  });
});

describe("logs, cache e atualização forçada", () => {
  it("lista logs da fonte (data, endpoint, status, duração, erro) e filtra erros", async () => {
    const s = await setup([{ match: /\/dca\?/, status: 503, text: "x" }]);
    await s.router.execute({ kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", year_from: 2023, year_to: 2023 });
    const all = await s.admin.logs("siconfi", { limit: 50 });
    expect(all.length).toBeGreaterThan(0);
    expect(all[0]).toMatchObject({ httpStatus: 503, success: false, errorType: "HTTP_503" });
    const errs = await s.admin.logs("siconfi", { limit: 50, onlyErrors: true });
    expect(errs.every((l) => !l.success)).toBe(true);
  });
  it("limpar cache de uma fonte mantém os fatos e audita", async () => {
    const s = await setup([{ match: /\/dca\?/, body: { items: dcaDespesasRows, hasMore: false } }]);
    await s.router.execute({ kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", year_from: 2023, year_to: 2023 });
    const facts = s.store.facts.size;
    const r = await s.admin.clearCache("siconfi", actor);
    expect(r.queries).toBe(1);
    expect(s.store.queries.size).toBe(0);
    expect(s.store.facts.size).toBe(facts);
    expect(s.store.audits.at(-1)).toMatchObject({ action: "cache.cleared" });
  });
  it("forçar atualização refaz as consultas mais usadas e versiona diferenças", async () => {
    let v = 450;
    const s = await setup([{ match: /\/dca\?/, body: () => ({ items: dcaDespesasRows.map((r) => ({ ...r, valor: r.cod_conta === "FU10" && r.coluna === "Despesas Liquidadas" && r.rotulo.startsWith("Despesas (") ? v : r.valor })), hasMore: false }) }]);
    const spec = { kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", category_code: "10", year_from: 2023, year_to: 2023 };
    await s.router.execute(spec);
    v = 470;
    const r = await s.admin.forceRefresh("siconfi", actor);
    expect(r.cleared.queries).toBe(1);
    expect(r.refreshed).toEqual([{ ok: true, metric: "EXPENSE_LIQUIDATED", entity: "MUNICIPALITY:3541406", freshness: "fresh" }]);
    expect(s.store.versions.map((x) => [x.previous, x.next])).toEqual([[450, 470]]);
  });
  it("não força atualização de fonte desativada", async () => {
    const s = await setup([]);
    await s.admin.setEnabled("siconfi", false, actor);
    await expect(s.admin.forceRefresh("siconfi", actor)).rejects.toMatchObject({ kind: "SOURCE_DISABLED" });
  });
});

describe("indicador de uso do banco", () => {
  it.each([[10, "normal"], [59.9, "normal"], [60, "atencao"], [74.9, "atencao"], [75, "alerta"], [85, "alerta"], [85.1, "critico"], [99, "critico"]] as const)("%s%% ⇒ %s", (p, lvl) => {
    expect(dbUsageLevel(p)).toBe(lvl);
  });
});

describe("poda feita pelo app (cron)", () => {
  it("remove logs/cache/cobertura vazia antigos e preserva fatos e dados recentes", async () => {
    const s = await setup([{ match: /\/dca\?/, body: { items: dcaDespesasRows, hasMore: false } }]);
    await s.router.execute({ kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", year_from: 2023, year_to: 2023 });
    const facts = s.store.facts.size;
    const old = new Date(Date.now() - 40 * 86_400_000);
    s.store.logs.push({ id: 900, sourceId: null, endpoint: "velho", startedAt: old, durationMs: 1, success: true });
    const recent = s.store.logs.length;
    const r = await s.analytics.purgeOld(30);
    expect(r.logs).toBe(1);
    expect(s.store.logs.length).toBe(recent - 1);
    expect(s.store.facts.size).toBe(facts);
  });
});
