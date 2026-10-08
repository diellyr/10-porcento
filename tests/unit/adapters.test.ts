import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/core/errors";
import type { FetchContext, FetchUnit } from "@/server/core/interfaces";
import { createHttpClient, getJson, redactUrl, resetRateWindows } from "@/server/sources/http";
import { parseBenefit, parseDespesasOrgao, transparenciaAdapter } from "@/server/sources/transparencia";
import { aggregateRows, clearDownloadMemo, receitaAdapter, tesouroAdapter, type FileDatasetConfig } from "@/server/sources/dataset-download";
import { csvToObjects, parseCsv } from "@/server/sources/csv";
import { parseCatalog } from "@/server/sources/dadosgov";
import { parseMunicipios } from "@/server/sources/ibge";
import { applyPersistencePolicy, validateFacts, MAX_ROWS_PER_UNIT } from "@/server/router/validate";
import { DATASETS } from "@/server/core/datasets";
import { decryptSecret, encryptSecret, maskSecret } from "@/server/crypto";
import { rateLimit, rateLimitMemory, rateLimitUpstash, resetRateLimits } from "@/server/rate-limit";
import type { FactInput, SourceRecord } from "@/server/core/types";
import { fakeFetch } from "@/server/dev/fake-fetch";
import { memoryStack } from "@/server/dev/memory";
import { SourceRuntime } from "@/server/router/runtime";

const baseFact = (over: Partial<FactInput> = {}): FactInput => ({
  entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", category_code: "10",
  period_type: "YEAR", period_year: 2023, period_number: 0, value: 10, unit: "BRL", source_dataset: "x", ...over,
});
const unit: FetchUnit = { dataset: "siconfi.dca.despesas_funcao", entity: { type: "MUNICIPALITY", code: "3541406" }, year: 2023, periodNumber: 0 };

async function ctxFor(slug: string, routes: Parameters<typeof fakeFetch>[0], cred: string | null = null, sleep = async () => undefined) {
  resetRateWindows();
  const s = memoryStack();
  await new SourceRuntime({ registry: s.registry }).adapters.length;
  const rt0 = new SourceRuntime({ registry: s.registry });
  await s.registry.ensureSources(rt0.adapters.map((a) => a.definition));
  const source = (await s.registry.getBySlug(slug))!;
  if (cred) await s.registry.setCredential(source.id, cred);
  const ff = fakeFetch(routes);
  const rt = new SourceRuntime({ registry: s.registry, fetchImpl: ff.impl, sleep, env: {} });
  return { ctx: await rt.context(source), ff, s, source, rt };
}

describe("cliente HTTP", () => {
  it("redige segredos em URLs de log", () => {
    expect(redactUrl("https://x.gov.br/a?token=abc&q=1&chave=zz&cpfCnpj=11222333000181")).toBe("https://x.gov.br/a?token=***&q=1&chave=***&cpfCnpj=***");
  });
  it("repete em 503 (controlado, com backoff) e depois tem sucesso", async () => {
    let n = 0;
    const sleeps: number[] = [];
    const { ctx, ff } = await ctxFor("siconfi", [{ match: /entes/, body: () => (++n < 3 ? undefined : { items: [] }), status: 200 }], null, async (ms?: number) => void sleeps.push(ms as number));
    // 1ª e 2ª resposta: 503
    const flaky = fakeFetch([]);
    let calls = 0;
    const http = createHttpClient({ source: ctx.source, registry: (await ctxFor("siconfi", [])).s.registry, fetchImpl: (async () => (++calls < 3 ? new Response("down", { status: 503 }) : new Response("{}", { status: 200 }))) as typeof fetch, sleep: async (ms) => void sleeps.push(ms) });
    const r = await http.request({ url: "https://x.test/a", label: "t" });
    expect(r.status).toBe(200);
    expect(calls).toBe(3);
    expect(sleeps).toEqual([500, 1000]);
    expect(flaky.calls).toHaveLength(0);
    expect(ff.calls).toHaveLength(0);
  });
  it("não repete além do limite e devolve o último status", async () => {
    const { ctx } = await ctxFor("siconfi", []);
    let calls = 0;
    const http = createHttpClient({ source: ctx.source, registry: (await ctxFor("siconfi", [])).s.registry, fetchImpl: (async () => (calls++, new Response("down", { status: 503 }))) as typeof fetch, sleep: async () => undefined });
    expect((await http.request({ url: "https://x.test/a", label: "t" })).status).toBe(503);
    expect(calls).toBe(3);
  });
  it("não repete em teste de conexão (resposta imediata)", async () => {
    const { ctx, s } = await ctxFor("siconfi", []);
    let calls = 0;
    const http = createHttpClient({ source: ctx.source, registry: s.registry, isTest: true, fetchImpl: (async () => (calls++, new Response("x", { status: 503 }))) as typeof fetch, sleep: async () => undefined });
    await http.request({ url: "https://x.test/a", label: "t" });
    expect(calls).toBe(1);
  });
  it("erro de rede vira AppError SOURCE_UNAVAILABLE e é logado", async () => {
    const { ctx, s } = await ctxFor("siconfi", []);
    const http = createHttpClient({ source: ctx.source, registry: s.registry, maxRetries: 0, fetchImpl: (async () => { throw new Error("ECONNRESET"); }) as typeof fetch });
    await expect(http.request({ url: "https://x.test/a", label: "t" })).rejects.toMatchObject({ kind: "SOURCE_UNAVAILABLE" });
    expect(s.store.logs.at(-1)).toMatchObject({ success: false, errorType: "NETWORK" });
  });
  it("respeita o limite por minuto da fonte (espera curta ou falha com RATE_LIMITED)", async () => {
    const { ctx, s, source } = await ctxFor("siconfi", []);
    let t = 1_000_000;
    const slept: number[] = [];
    const http = createHttpClient({ source: { ...source, rateLimitPerMinute: 2 } as SourceRecord, registry: s.registry, now: () => t, sleep: async (ms) => { slept.push(ms); t += ms; }, fetchImpl: (async () => new Response("{}")) as typeof fetch });
    await http.request({ url: "https://x.test/1", label: "t" });
    await http.request({ url: "https://x.test/2", label: "t" });
    await expect(http.request({ url: "https://x.test/3", label: "t" })).rejects.toMatchObject({ kind: "RATE_LIMITED" }); // espera > 2 s ⇒ falha em vez de bloquear
    expect(slept).toEqual([]);
    expect(ctx).toBeTruthy();
  });
  it("getJson tipa erros: 401/403 ⇒ não configurada, 429 ⇒ rate limit, JSON inválido ⇒ BAD_RESPONSE", async () => {
    const mk = (status: number, text: string) => ({ request: async () => ({ status, text, latencyMs: 1 }) });
    await expect(getJson(mk(403, ""), { url: "u", label: "l" })).rejects.toMatchObject({ kind: "SOURCE_NOT_CONFIGURED" });
    await expect(getJson(mk(429, ""), { url: "u", label: "l" })).rejects.toMatchObject({ kind: "RATE_LIMITED" });
    await expect(getJson(mk(200, "<html>"), { url: "u", label: "l" })).rejects.toMatchObject({ kind: "BAD_RESPONSE" });
    await expect(getJson(mk(500, "x"), { url: "u", label: "l" })).rejects.toMatchObject({ kind: "SOURCE_UNAVAILABLE" });
  });
});

describe("Portal da Transparência", () => {
  it("benefícios: separa valor (BRL) e beneficiários (COUNT)", () => {
    const u: FetchUnit = { dataset: "transparencia.bolsa_familia", entity: { type: "MUNICIPALITY", code: "3541406" }, year: 2025, periodNumber: 3 };
    const { facts, skipped } = parseBenefit([{ id: 1, valor: "1.000,50", quantidadeBeneficiados: 10 }, { id: 2 }], u, "BOLSA_FAMILIA", "Bolsa Família", "d");
    expect(facts.map((f) => [f.metric, f.value, f.unit, f.period_type, f.period_number])).toEqual([["BENEFIT_VALUE", 1000.5, "BRL", "MONTH", 3], ["BENEFICIARIES", 10, "COUNT", "MONTH", 3]]);
    expect(skipped).toBe(1);
  });
  it("benefícios: nunca contém dados pessoais (só agregados por município)", () => {
    const u: FetchUnit = { dataset: "transparencia.bpc", entity: { type: "MUNICIPALITY", code: "3541406" }, year: 2025, periodNumber: 1 };
    const { facts } = parseBenefit([{ id: 1, valor: 1, quantidadeBeneficiados: 1, ...( { nome: "FULANO", cpf: "123" } as object) }], u, "BPC", "BPC", "d");
    expect(JSON.stringify(facts)).not.toMatch(/FULANO|123/);
  });
  it("despesas por órgão: empenhado/liquidado/pago viram métricas distintas e cria o órgão relacionado", () => {
    const u: FetchUnit = { dataset: "transparencia.despesas_orgao", entity: { type: "COUNTRY", code: "1" }, year: 2024, periodNumber: 0 };
    const { facts } = parseDespesasOrgao([{ codigoOrgao: "36000", orgao: "Ministério da Saúde", empenhado: "10,00", liquidado: "8,00", pago: "7,00" }, { orgao: "sem código" }], u);
    expect(facts.map((f) => [f.metric, f.value, f.related_code, f.related_name])).toEqual([
      ["EXPENSE_COMMITTED", 10, "36000", "Ministério da Saúde"], ["EXPENSE_LIQUIDATED", 8, "36000", "Ministério da Saúde"], ["EXPENSE_PAID", 7, "36000", "Ministério da Saúde"]]);
  });
  it("pagina até página vazia, enviando a chave no header", async () => {
    const { ctx, ff } = await ctxFor("portal-transparencia", [{ match: /por-orgao/, body: (u: string) => { const p = Number(new URL(u).searchParams.get("pagina")); return p <= 2 ? [{ codigoOrgao: String(p), orgao: `O${p}`, empenhado: 1, liquidado: 1, pago: 1 }] : []; } }], "k-1234567890");
    const r = await transparenciaAdapter.fetchUnit({ dataset: "transparencia.despesas_orgao", entity: { type: "COUNTRY", code: "1" }, year: 2024, periodNumber: 0 }, ctx);
    expect(r.recordsReceived).toBe(2);
    expect(ff.calls.map((c) => new URL(c.url).searchParams.get("pagina"))).toEqual(["1", "2", "3"]);
    expect(ff.calls.every((c) => c.headers["chave-api-dados"] === "k-1234567890")).toBe(true);
  });
  it("sem chave ⇒ SOURCE_NOT_CONFIGURED sem tocar a rede", async () => {
    const { ctx, ff } = await ctxFor("portal-transparencia", []);
    await expect(transparenciaAdapter.fetchUnit({ dataset: "transparencia.bpc", entity: { type: "MUNICIPALITY", code: "3541406" }, year: 2024, periodNumber: 1 }, ctx)).rejects.toMatchObject({ kind: "SOURCE_NOT_CONFIGURED" });
    expect(ff.calls).toHaveLength(0);
  });
});

describe("adaptador de arquivos (Receita / Tesouro)", () => {
  const cfg: FileDatasetConfig = { url: "https://x.gov.br/a.csv", delimiter: ";", columns: { year: "Ano", uf: "UF", category_code: "Tributo", value: "Valor" }, metric: "REVENUE_REALIZED", category_type: "TAX" };
  const csv = ["Ano;UF;Tributo;Valor", "2023;SP;IRPJ;1.000,00", "2023;SP;IRPJ;500,00", "2023;RJ;IRPJ;7,00", "2023;SP;COFINS;300,00", "2022;SP;IRPJ;999,00", "2023;SP;;5,00", "2023;SP;IPI;abc"].join("\n");

  it("CSV: aspas, delimitador e BOM", () => {
    expect(parseCsv('﻿a;b\n"x;y";"he said ""hi"""\n')).toEqual([["a", "b"], ["x;y", 'he said "hi"']]);
    expect(csvToObjects("a;b\r\n1;2\r\n")).toEqual([{ a: "1", b: "2" }]);
  });
  it("agrega por tributo, filtra ano e UF, ignora linhas inválidas", () => {
    const { facts, skipped } = aggregateRows(csvToObjects(csv), cfg, { dataset: "receita.arrecadacao", entity: { type: "STATE", code: "35" }, year: 2023, periodNumber: 0 });
    expect(Object.fromEntries(facts.map((f) => [f.category_code, f.value]))).toEqual({ IRPJ: 1500, COFINS: 300 });
    expect(skipped).toBe(2);
    expect(facts.every((f) => f.metric === "REVENUE_REALIZED" && f.category_type === "TAX")).toBe(true);
  });
  it("União soma todas as UFs", () => {
    const { facts } = aggregateRows(csvToObjects(csv), cfg, { dataset: "receita.arrecadacao", entity: { type: "COUNTRY", code: "1" }, year: 2023, periodNumber: 0 });
    expect(facts.find((f) => f.category_code === "IRPJ")!.value).toBe(1507);
  });
  it("sem dataset configurado ⇒ SOURCE_NOT_CONFIGURED (nunca inventa)", async () => {
    clearDownloadMemo();
    const { ctx, ff } = await ctxFor("receita-federal", []);
    await expect(receitaAdapter.fetchUnit({ dataset: "receita.arrecadacao", entity: { type: "COUNTRY", code: "1" }, year: 2023, periodNumber: 0 }, ctx)).rejects.toMatchObject({ kind: "SOURCE_NOT_CONFIGURED" });
    expect(ff.calls).toHaveLength(0);
  });
  it("baixa, decodifica latin1 e acusa coluna inexistente com mensagem útil", async () => {
    clearDownloadMemo();
    const latin1 = Buffer.from("Ano;UF;Tributo;Valor\n2023;SP;Contribuição;10,00\n", "latin1");
    const { ctx } = await ctxFor("receita-federal", []);
    const mk = (body: Buffer) => ({ ...ctx, source: { ...ctx.source, config: { datasets: { "receita.arrecadacao": { ...cfg, encoding: "latin1" as const } } } }, http: createHttpClient({ source: ctx.source, registry: memoryStack().registry, fetchImpl: (async () => new Response(new Uint8Array(body))) as typeof fetch }) } as FetchContext);
    const ok = await receitaAdapter.fetchUnit({ dataset: "receita.arrecadacao", entity: { type: "STATE", code: "35" }, year: 2023, periodNumber: 0 }, mk(latin1));
    expect(ok.facts[0]).toMatchObject({ category_label: "Contribuição", value: 10 });
    clearDownloadMemo();
    await expect(receitaAdapter.fetchUnit({ dataset: "receita.arrecadacao", entity: { type: "STATE", code: "35" }, year: 2023, periodNumber: 0 }, mk(Buffer.from("A;B\n1;2\n")))).rejects.toThrow(/coluna "Ano" não existe/);
    expect(tesouroAdapter.datasets).toContain("tesouro.divida_publica");
  });
});

describe("catálogos", () => {
  it("dados.gov.br: normaliza itens e rejeita formato inesperado", () => {
    expect(parseCatalog([{ id: "1", titulo: "Arrecadação", descricao: "d", nomeOrganizacao: "RFB", recursos: [{ formato: "csv" }, { formato: "CSV" }] }, { id: "2" }])).toEqual([
      { id: "1", title: "Arrecadação", description: "d", organization: "RFB", url: "https://dados.gov.br/dados/conjuntos-dados/1", formats: ["CSV"] }]);
    expect(() => parseCatalog({ foo: 1 })).toThrow(AppError);
  });
  it("IBGE: municípios com UF", () => {
    expect(parseMunicipios([{ id: 3541406, nome: "Praia Grande", microrregiao: { mesorregiao: { UF: { id: 35, sigla: "SP" } } } }, { id: 12, nome: "inválido" }])).toEqual([
      { type: "MUNICIPALITY", code: "3541406", name: "Praia Grande", uf: "SP", population: null, parentCode: "35" }]);
  });
});

describe("validação e política de persistência", () => {
  const ds = DATASETS["siconfi.dca.despesas_funcao"]!;
  it("descarta linhas inválidas e mantém as boas", () => {
    const good = Array.from({ length: 6 }, (_, i) => baseFact({ source_record_id: `g${i}` }));
    const r = validateFacts([...good, baseFact({ value: NaN }), baseFact({ period_year: 2020 }), baseFact({ entity_code: "999" }), baseFact({ metric: "REVENUE_REALIZED" })], unit, { ...ds, metrics: [...ds.metrics] });
    expect(r.valid).toHaveLength(6);
    expect(r.dropped).toBe(4);
  });
  it("rejeita lote majoritariamente inválido (parser quebrado)", () => {
    expect(() => validateFacts([baseFact(), baseFact({ value: NaN }), baseFact({ value: Infinity })], unit, ds)).toThrow(/validação rejeitou/);
  });
  it("arredonda para centavos e impede COUNT em métrica monetária", () => {
    expect(validateFacts([baseFact({ value: 1.005 + 1 })], unit, ds).valid[0]!.value).toBeCloseTo(2.01, 2);
    expect(() => validateFacts([baseFact({ unit: "COUNT" })], unit, ds)).toThrow();
  });
  it("deduplica no lote", () => {
    const { rows } = applyPersistencePolicy([baseFact({ source_record_id: "a" }), baseFact({ source_record_id: "a" }), baseFact({ source_record_id: "b" })]);
    expect(rows).toHaveLength(2);
  });
  it("unidade gigante é reduzida (agrega em vez de gravar tudo)", () => {
    const many = Array.from({ length: MAX_ROWS_PER_UNIT + 500 }, (_, i) => baseFact({ category_type: "SUBFUNCTION", category_code: `10.${i}`, source_record_id: String(i) }));
    const keep = baseFact({ category_type: "FUNCTION", category_code: "12", source_record_id: "f" });
    const { rows, note } = applyPersistencePolicy([...many, keep]);
    expect(rows).toEqual([keep]);
    expect(note).toMatch(/unidade grande/);
  });
});

describe("criptografia de credenciais", () => {
  beforeEach(() => { process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64"); });
  it("AES-GCM: ida e volta; texto cifrado não contém o segredo; IV aleatório", () => {
    const c1 = encryptSecret("segredo-123456"), c2 = encryptSecret("segredo-123456");
    expect(decryptSecret(c1)).toBe("segredo-123456");
    expect(c1).not.toContain("segredo");
    expect(c1).not.toBe(c2);
  });
  it("detecta adulteração e chave errada", () => {
    const c = encryptSecret("x".repeat(20));
    const parts = c.split(":");
    parts[3] = Buffer.from("tampered-data-xx").toString("base64");
    expect(() => decryptSecret(parts.join(":"))).toThrow();
    process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    expect(() => decryptSecret(c)).toThrow();
  });
  it("exige chave válida", () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = "curta";
    expect(() => encryptSecret("abc")).toThrow(/32 bytes/);
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    expect(() => encryptSecret("abc")).toThrow(/não definida/);
  });
  it("rotação: lê com a chave antiga (PREVIOUS), escreve com a nova; sem PREVIOUS a antiga falha", () => {
    const A = Buffer.alloc(32, 1).toString("base64"), B = Buffer.alloc(32, 2).toString("base64");
    process.env.CREDENTIALS_ENCRYPTION_KEY = A;
    const old = encryptSecret("segredo-antigo-1234");
    process.env.CREDENTIALS_ENCRYPTION_KEY = B;
    expect(() => decryptSecret(old)).toThrow();
    process.env.CREDENTIALS_ENCRYPTION_KEY_PREVIOUS = A;
    expect(decryptSecret(old)).toBe("segredo-antigo-1234");
    const fresh = encryptSecret("segredo-novo-5678");
    delete process.env.CREDENTIALS_ENCRYPTION_KEY_PREVIOUS;
    expect(decryptSecret(fresh)).toBe("segredo-novo-5678"); // já na chave nova
  });
  it("máscara mostra só os 4 últimos caracteres", () => { expect(maskSecret("4K8J")).toBe("••••••••••••4K8J"); });
});

describe("rate limit da API pública", () => {
  beforeEach(resetRateLimits);
  it("bloqueia após o teto e libera na nova janela", () => {
    expect(rateLimitMemory("k", 2, 1000, 0).ok).toBe(true);
    expect(rateLimitMemory("k", 2, 1000, 1)).toEqual({ ok: true, retryAfter: 0 });
    expect(rateLimitMemory("k", 2, 1000, 2).ok).toBe(false);
    expect(rateLimitMemory("outro", 2, 1000, 2).ok).toBe(true);
    expect(rateLimitMemory("k", 2, 1000, 1500).ok).toBe(true);
  });
});
void vi;

describe("rate limit global (Upstash/Redis)", () => {
  const mk = (counts: number[], pttl = 30_000) => {
    const calls: Array<{ url: string; body: unknown; auth: string | null }> = [];
    let i = 0;
    const impl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)), auth: new Headers(init?.headers).get("authorization") });
      return new Response(JSON.stringify([{ result: counts[Math.min(i++, counts.length - 1)] }, { result: 1 }, { result: pttl }]));
    }) as typeof fetch;
    return { impl, calls };
  };
  it("usa contador compartilhado: permite até o teto, bloqueia acima com Retry-After do TTL", async () => {
    const { impl, calls } = mk([1, 2, 3]);
    const cfg = { url: "https://redis.test/", token: "tok", fetchImpl: impl };
    expect((await rateLimitUpstash(cfg, "k", 2, 60_000)).ok).toBe(true);
    expect((await rateLimitUpstash(cfg, "k", 2, 60_000)).ok).toBe(true);
    expect(await rateLimitUpstash(cfg, "k", 2, 60_000)).toEqual({ ok: false, retryAfter: 30 });
    expect(calls[0]).toMatchObject({ url: "https://redis.test/pipeline", auth: "Bearer tok" });
    expect(calls[0]!.body).toEqual([["INCR", "bf:rl:k"], ["PEXPIRE", "bf:rl:k", 60000, "NX"], ["PTTL", "bf:rl:k"]]);
  });
  it("com variáveis definidas usa o Redis; se o Redis falhar, cai para memória (fail-open)", async () => {
    resetRateLimits();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const env = { UPSTASH_REDIS_REST_URL: "https://redis.test", UPSTASH_REDIS_REST_TOKEN: "t" };
    const down = (async () => new Response("boom", { status: 500 })) as typeof fetch;
    expect((await rateLimit("fallback", 1, 60_000, env, down)).ok).toBe(true);
    expect((await rateLimit("fallback", 1, 60_000, env, down)).ok).toBe(false); // memória aplicou o teto
    warn.mockRestore();
  });
  it("sem variáveis, usa memória", async () => {
    resetRateLimits();
    expect((await rateLimit("m", 1, 60_000, {})).ok).toBe(true);
    expect((await rateLimit("m", 1, 60_000, {})).ok).toBe(false);
  });
});

import { assertPublicTarget, isPrivateIp } from "@/server/sources/http";

describe("guard anti-SSRF no cliente HTTP", () => {
  it("classifica IPs não públicos (v4/v6/mapeado)", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) expect(isPrivateIp(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "200.152.38.1", "172.32.0.1", "2001:4860:4860::8888"]) expect(isPrivateIp(ip), ip).toBe(false);
  });
  it("recusa host que resolve para rede interna (DNS rebinding) e qualquer endereço privado entre vários", async () => {
    await expect(assertPublicTarget("https://evil.example/x", async () => ["10.0.0.5"])).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(assertPublicTarget("https://evil.example/x", async () => ["8.8.8.8", "169.254.169.254"])).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(assertPublicTarget("https://ok.example/x", async () => ["200.152.38.1"])).resolves.toBeUndefined();
    await expect(assertPublicTarget("http://ok.example/x", async () => ["200.152.38.1"])).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(assertPublicTarget("https://169.254.169.254/latest", async () => [])).rejects.toMatchObject({ kind: "VALIDATION" });
    await expect(assertPublicTarget("https://nao-resolve.example", async () => { throw new Error("ENOTFOUND"); })).rejects.toMatchObject({ kind: "SOURCE_UNAVAILABLE" });
  });
  it("cliente: bloqueia host interno antes de conectar; segue redirect revalidando e sem vazar credencial a outra origem", async () => {
    const { ctx, s } = await ctxFor("siconfi", []);
    const seen: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ url: String(url), headers: Object.fromEntries(new Headers(init?.headers).entries()) });
      return String(url).startsWith("https://api.gov.br/a")
        ? new Response(null, { status: 302, headers: { location: "https://cdn.exemplo.com/b" } })
        : new Response("{}", { status: 200 });
    }) as typeof fetch;
    const resolveHost = async (h: string) => (h === "intranet.exemplo.com" ? ["10.0.0.9"] : ["200.152.38.1"]);
    const http = createHttpClient({ source: ctx.source, registry: s.registry, fetchImpl, resolveHost, dnsGuard: true, maxRetries: 0 });
    const r = await http.request({ url: "https://api.gov.br/a", headers: { "chave-api-dados": "SEGREDO" }, label: "t" });
    expect(r.status).toBe(200);
    expect(seen[0]!.headers["chave-api-dados"]).toBe("SEGREDO");
    expect(seen[1]!.url).toBe("https://cdn.exemplo.com/b");
    expect(seen[1]!.headers["chave-api-dados"]).toBeUndefined();
    seen.length = 0;
    await expect(http.request({ url: "https://intranet.exemplo.com/x", label: "t" })).rejects.toMatchObject({ kind: "VALIDATION" });
    expect(seen).toHaveLength(0); // nem chegou a conectar
    const toInternal = (async () => new Response(null, { status: 302, headers: { location: "https://intranet.exemplo.com/secret" } })) as typeof fetch;
    const http2 = createHttpClient({ source: ctx.source, registry: s.registry, fetchImpl: toInternal, resolveHost, dnsGuard: true, maxRetries: 0 });
    await expect(http2.request({ url: "https://api.gov.br/a", label: "t" })).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});
