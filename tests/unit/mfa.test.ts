import { beforeEach, describe, expect, it, vi } from "vitest";
import { decideMfa, mfaRequired } from "@/server/mfa";

describe("política de MFA", () => {
  it("produção exige por padrão; ADMIN_REQUIRE_MFA=0 desliga; dev só com =1; fixtures nunca", () => {
    expect(mfaRequired({ NODE_ENV: "production" })).toBe(true);
    expect(mfaRequired({ NODE_ENV: "production", ADMIN_REQUIRE_MFA: "0" })).toBe(false);
    expect(mfaRequired({ NODE_ENV: "development" })).toBe(false);
    expect(mfaRequired({ NODE_ENV: "development", ADMIN_REQUIRE_MFA: "1" })).toBe(true);
    expect(mfaRequired({ NODE_ENV: "development", ADMIN_REQUIRE_MFA: "1", BRASIL_FISCAL_DEV_FIXTURES: "1" })).toBe(false);
  });
  it("decide entre ok, verificar e cadastrar", () => {
    expect(decideMfa({ required: false, currentLevel: "aal1", nextLevel: "aal1" })).toBe("ok");
    expect(decideMfa({ required: true, currentLevel: "aal2", nextLevel: "aal2" })).toBe("ok");
    expect(decideMfa({ required: true, currentLevel: "aal1", nextLevel: "aal2" })).toBe("verify");
    expect(decideMfa({ required: true, currentLevel: "aal1", nextLevel: "aal1" })).toBe("enroll");
    expect(decideMfa({ required: true, currentLevel: null, nextLevel: null })).toBe("enroll");
  });
});

describe("requireAdmin com MFA", () => {
  const state = { user: { id: "u1", email: "a@x.com" } as { id: string; email: string } | null, role: "admin" as "admin" | "user", aal: { currentLevel: "aal1", nextLevel: "aal1" } };
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.ADMIN_REQUIRE_MFA = "1";
    delete process.env.BRASIL_FISCAL_DEV_FIXTURES;
    state.user = { id: "u1", email: "a@x.com" }; state.role = "admin"; state.aal = { currentLevel: "aal1", nextLevel: "aal1" };
    vi.doMock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
    vi.doMock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user } }), mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: state.aal }) } } }) }));
    vi.doMock("@/server/container", () => ({ container: () => ({ analytics: { getRole: async () => state.role } }) }));
  });
  const run = async () => (await import("@/server/auth")).requireAdmin();

  it("admin sem segundo fator ⇒ MFA_REQUIRED (cadastrar ou verificar)", async () => {
    await expect(run()).rejects.toMatchObject({ kind: "MFA_REQUIRED", technical: expect.stringContaining("enroll") });
    state.aal = { currentLevel: "aal1", nextLevel: "aal2" };
    await expect(run()).rejects.toMatchObject({ kind: "MFA_REQUIRED", technical: expect.stringContaining("verify") });
  });
  it("admin com AAL2 ⇒ passa", async () => {
    state.aal = { currentLevel: "aal2", nextLevel: "aal2" };
    await expect(run()).resolves.toMatchObject({ id: "u1" });
  });
  it("não-admin continua FORBIDDEN e sem sessão UNAUTHENTICATED (antes de qualquer MFA)", async () => {
    state.role = "user";
    await expect(run()).rejects.toMatchObject({ kind: "FORBIDDEN" });
    state.user = null;
    await expect(run()).rejects.toMatchObject({ kind: "UNAUTHENTICATED" });
  });
  it("com MFA desligado, admin AAL1 passa", async () => {
    process.env.ADMIN_REQUIRE_MFA = "0";
    await expect(run()).resolves.toMatchObject({ id: "u1" });
  });
});
