import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/repositories/supabase/client", () => ({
  serviceClient: () => ({ from: () => ({ select: async () => ({ error: { message: "Invalid API key" } }) }) }),
}));

describe("GET /api/health", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it("lista as variáveis ausentes sem revelar valores", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { GET } = await import("@/app/api/health/route");
    const res = await GET(new Request("http://t/api/health", { headers: { "cf-connecting-ip": "1.1.1.1" } }));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.missing).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(JSON.stringify(body)).not.toContain("x.supabase.co");
  });

  it("expõe o erro do banco quando as variáveis existem mas a chave é inválida", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "chave-secreta-xyz");
    const { GET } = await import("@/app/api/health/route");
    const res = await GET(new Request("http://t/api/health", { headers: { "cf-connecting-ip": "2.2.2.2" } }));
    const body = await res.json();
    expect(body.database).toEqual({ ok: false, error: "Invalid API key" });
    expect(JSON.stringify(body)).not.toContain("chave-secreta-xyz");
  });

  it("aponta valores com formato errado, como o comando openssl colado no lugar da chave", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "k");
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "openssl rand -base64 32");
    vi.stubEnv("CRON_SECRET", "openssl rand -hex 32");
    const { GET } = await import("@/app/api/health/route");
    const res = await GET(new Request("http://t/api/health", { headers: { "cf-connecting-ip": "3.3.3.3" } }));
    expect((await res.json()).invalid).toEqual(["CREDENTIALS_ENCRYPTION_KEY", "CRON_SECRET"]);
  });
});
