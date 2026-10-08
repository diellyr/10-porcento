import { describe, expect, it } from "vitest";
import { buildCsp, securityHeaders } from "@/lib/security-headers";

describe("cabeçalhos de segurança", () => {
  const prod = buildCsp({ production: true, supabaseUrl: "https://abc.supabase.co/rest" });
  it("produção: sem eval, sem frames, sem objetos, só origem própria + Supabase", () => {
    expect(prod).toContain("default-src 'self'");
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co");
    expect(prod).toContain("upgrade-insecure-requests");
    expect(prod).not.toContain("unsafe-eval");
    expect(prod).not.toMatch(/ws:|localhost/);
  });
  it("desenvolvimento libera eval e websocket (HMR)", () => {
    const dev = buildCsp({ production: false });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws:");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });
  it("URL do Supabase inválida não quebra a política", () => {
    expect(buildCsp({ production: true, supabaseUrl: "não-é-url" })).toContain("connect-src 'self'");
  });
  it("HSTS só em produção; demais cabeçalhos sempre", () => {
    expect(securityHeaders({ production: true }).map((h) => h.key)).toContain("Strict-Transport-Security");
    expect(securityHeaders({ production: false }).map((h) => h.key)).not.toContain("Strict-Transport-Security");
    expect(securityHeaders({ production: false }).map((h) => h.key)).toEqual(expect.arrayContaining(["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options", "Cross-Origin-Opener-Policy"]));
  });
});
