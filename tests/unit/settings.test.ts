import { describe, expect, it } from "vitest";
import { buildSettings } from "@/server/services/settings";

describe("buildSettings", () => {
  const find = (items: ReturnType<typeof buildSettings>, k: string) => items.find((i) => i.key === k)!;

  it("marca pendentes e nunca devolve valores", () => {
    const items = buildSettings({ NEXT_PUBLIC_SUPABASE_URL: "https://abcd1234.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "valor-super-secreto" });
    expect(find(items, "SUPABASE_SERVICE_ROLE_KEY").set).toBe(true);
    expect(find(items, "CREDENTIALS_ENCRYPTION_KEY").set).toBe(false);
    expect(JSON.stringify(items)).not.toContain("valor-super-secreto");
  });

  it("aponta o site onde cada chave é criada, com o projeto Supabase correto", () => {
    const items = buildSettings({ NEXT_PUBLIC_SUPABASE_URL: "https://abcd1234.supabase.co" });
    expect(find(items, "SUPABASE_SERVICE_ROLE_KEY").url).toBe("https://supabase.com/dashboard/project/abcd1234/settings/api-keys");
    expect(find(items, "PORTAL_TRANSPARENCIA_API_KEY").url).toContain("portaldatransparencia.gov.br");
    expect(find(items, "DADOS_GOV_BR_TOKEN").url).toBe("https://dados.gov.br");
    expect(find(items, "UPSTASH_REDIS_REST_URL").url).toContain("upstash.com");
    for (const i of items.filter((x) => x.url)) expect(i.url!.startsWith("https://")).toBe(true);
  });

  it("valida o formato: comando colado como valor continua pendente", () => {
    const items = buildSettings({ CREDENTIALS_ENCRYPTION_KEY: "openssl rand -base64 32", CRON_SECRET: "openssl rand -hex 32" });
    expect(find(items, "CREDENTIALS_ENCRYPTION_KEY").set).toBe(false);
    expect(find(items, "CRON_SECRET").set).toBe(false);
    const ok = buildSettings({ CREDENTIALS_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"), CRON_SECRET: "a".repeat(40) });
    expect(find(ok, "CREDENTIALS_ENCRYPTION_KEY").set).toBe(true);
    expect(find(ok, "CRON_SECRET").set).toBe(true);
  });
});

import { pendingSources } from "@/server/services/settings";

describe("pendingSources", () => {
  const base = { enabled: true, documentationUrl: null, datasetsConfigured: null, credential: { configured: false } };
  const sources = [
    { ...base, slug: "siconfi", name: "SICONFI", requiresAuth: false, sourceType: "REST_API" },
    { ...base, slug: "portal-transparencia", name: "Portal da Transparência", requiresAuth: true, sourceType: "REST_API" },
    { ...base, slug: "dados-gov-br", name: "dados.gov.br", requiresAuth: true, sourceType: "REST_API", credential: { configured: true } },
    { ...base, slug: "tesouro-nacional", name: "Tesouro Nacional", requiresAuth: false, sourceType: "DATASET_DOWNLOAD", datasetsConfigured: 0 },
    { ...base, slug: "receita-federal", name: "Receita Federal", requiresAuth: false, sourceType: "DATASET_DOWNLOAD", datasetsConfigured: 2 },
    { ...base, slug: "outra", name: "Desativada", requiresAuth: true, sourceType: "REST_API", enabled: false },
  ];

  it("lista só fontes ativas sem chave ou sem arquivos, chaves primeiro, com o site de criação", () => {
    const p = pendingSources(sources);
    expect(p.map((x) => x.slug)).toEqual(["portal-transparencia", "tesouro-nacional"]);
    expect(p[0]).toMatchObject({ kind: "key", createUrl: "https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email", manageUrl: "/admin/fontes/portal-transparencia" });
    expect(p[1]).toMatchObject({ kind: "csv", createUrl: "https://www.tesourotransparente.gov.br/" });
  });

  it("fonte desconhecida usa a documentação como link e nunca fica sem URL", () => {
    const p = pendingSources([{ ...base, slug: "x", name: "X", requiresAuth: true, sourceType: "REST_API", documentationUrl: "https://exemplo.gov.br/docs" }]);
    expect(p[0]!.createUrl).toBe("https://exemplo.gov.br/docs");
  });
});
