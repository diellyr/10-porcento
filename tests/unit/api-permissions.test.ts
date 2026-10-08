import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/core/errors";

const state = { user: null as null | { id: string; email: string }, role: null as null | "user" | "admin" };
const calls: string[] = [];

vi.mock("@/server/auth", () => ({
  requireAdmin: async () => {
    if (!state.user) throw new AppError("UNAUTHENTICATED", "sem sessão", 401);
    if (state.role !== "admin") throw new AppError("FORBIDDEN", "não é admin", 403);
    return state.user;
  },
  getSessionUser: async () => state.user,
}));
vi.mock("@/server/container", () => ({
  container: () => ({
    admin: {
      list: async () => { calls.push("list"); return []; },
      adapterOptions: () => [],
      setEnabled: async (slug: string, enabled: boolean) => { calls.push(`toggle:${slug}:${enabled}`); return { slug, enabled }; },
      setCredential: async (slug: string) => { calls.push(`cred:${slug}`); return { slug }; },
      testConnection: async () => { throw new AppError("INTERNAL", "stack: segredo interno db://user:pw@host"); },
    },
    analytics: { listUsers: async () => [], getRole: async () => "admin", countAdmins: async () => 1, setRole: async () => undefined },
    registry: { audit: async () => undefined },
  }),
}));

import { GET as listSources } from "@/app/api/admin/sources/route";
import { POST as toggle } from "@/app/api/admin/sources/[slug]/toggle/route";
import { PUT as putCredential } from "@/app/api/admin/sources/[slug]/credential/route";
import { POST as testSource } from "@/app/api/admin/sources/[slug]/test/route";
import { GET as users } from "@/app/api/admin/users/route";
import { resetRateLimits } from "@/server/rate-limit";

const req = (url: string, init?: RequestInit) => new Request(`http://localhost${url}`, { ...init, headers: { host: "localhost", ...(init?.headers as Record<string, string>) } });
const slug = (s: string) => ({ params: Promise.resolve({ slug: s }) });

beforeEach(() => { state.user = null; state.role = null; calls.length = 0; resetRateLimits(); });

describe("permissões das rotas administrativas", () => {
  it("sem sessão ⇒ 401 e nada é executado", async () => {
    const r = await listSources(req("/api/admin/sources"));
    expect(r.status).toBe(401);
    expect(calls).toEqual([]);
  });
  it("usuário comum ⇒ 403 em leitura e em TODAS as mutações", async () => {
    state.user = { id: "u", email: "u@x.com" }; state.role = "user";
    expect((await listSources(req("/api/admin/sources"))).status).toBe(403);
    expect((await toggle(req("/x", { method: "POST", body: JSON.stringify({ enabled: false }) }), slug("siconfi"))).status).toBe(403);
    expect((await putCredential(req("/x", { method: "PUT", body: JSON.stringify({ value: "12345678" }) }), slug("siconfi"))).status).toBe(403);
    expect((await users(req("/x"))).status).toBe(403);
    expect(calls).toEqual([]);
  });
  it("administrador ⇒ 200, sem cache e com audit/ação executada", async () => {
    state.user = { id: "a", email: "a@x.com" }; state.role = "admin";
    const r = await listSources(req("/api/admin/sources"));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const t = await toggle(req("/x", { method: "POST", body: JSON.stringify({ enabled: false }) }), slug("siconfi"));
    expect(t.status).toBe(200);
    expect(calls).toEqual(["list", "toggle:siconfi:false"]);
  });
  it("valida entrada (zod) ⇒ 400", async () => {
    state.user = { id: "a", email: "a@x.com" }; state.role = "admin";
    expect((await toggle(req("/x", { method: "POST", body: JSON.stringify({ enabled: "sim" }) }), slug("siconfi"))).status).toBe(400);
    expect((await putCredential(req("/x", { method: "PUT", body: JSON.stringify({ value: "x" }) }), slug("portal-transparencia"))).status).toBe(400);
  });
  it("mutação com Origin de outro site ⇒ 403 (CSRF)", async () => {
    state.user = { id: "a", email: "a@x.com" }; state.role = "admin";
    const r = await toggle(req("/x", { method: "POST", headers: { origin: "https://evil.example" }, body: JSON.stringify({ enabled: false }) }), slug("siconfi"));
    expect(r.status).toBe(403);
    expect(calls).toEqual([]);
  });
  it("erros internos mostram detalhe técnico só para admin; mensagem pública é genérica", async () => {
    state.user = { id: "a", email: "a@x.com" }; state.role = "admin";
    const r = await testSource(req("/x", { method: "POST" }), slug("siconfi"));
    const body = await r.json();
    expect(r.status).toBe(500);
    expect(body.error.message).toBe("Algo deu errado do nosso lado. Tente novamente em instantes.");
    expect(body.error.technical).toMatch(/segredo interno/);
  });
  it("rate limit das rotas admin ⇒ 429", async () => {
    state.user = { id: "a", email: "a@x.com" }; state.role = "admin";
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await testSource(req("/x", { method: "POST" }), slug("siconfi"))).status;
    expect(last).toBe(429);
  });
});

import { isZodError } from "@/server/http-api";
import { isBadPlacePath } from "@/middleware";

describe("regressões encontradas pelo E2E", () => {
  it("erro do zod é reconhecido mesmo vindo de outra cópia do módulo (antes virava 500)", () => {
    class ZodError extends Error { name = "ZodError"; issues = [{ path: ["cnpj"], message: "x" }]; }
    expect(isZodError(new ZodError("x"))).toBe(true);
    expect(isZodError(new Error("x"))).toBe(false);
    expect(isZodError({ name: "ZodError" })).toBe(false);
    expect(isZodError(null)).toBe(false);
  });
  it("middleware: só caminhos de local mal formados viram 404", () => {
    for (const p of ["/municipios/abc", "/municipios/123", "/municipios/35414069", "/estados/xyz", "/estados/s", "/municipios/ab-c"]) expect(isBadPlacePath(p), p).toBe(true);
    for (const p of ["/municipios/3541406", "/municipios/3541406/", "/estados/sp", "/estados/SP", "/municipios", "/estados", "/admin"]) expect(isBadPlacePath(p), p).toBe(false);
  });
});
