import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { buildCsp } from "@/lib/security-headers";

describe("PWA", () => {
  const m = manifest();

  it("manifesto tem o essencial para ser instalável", () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name!.length).toBeLessThanOrEqual(15);
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBeTruthy();
    expect(m.lang).toBe("pt-BR");
    const sizes = (m.icons ?? []).map((i) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toContain("192x192:any");
    expect(sizes).toContain("512x512:any");
    expect(sizes).toContain("512x512:maskable");
  });

  it("todos os ícones e atalhos do manifesto existem em public/", () => {
    const files = [...(m.icons ?? []), ...(m.shortcuts ?? []).flatMap((s) => s.icons ?? [])].map((i) => `public${i.src}`);
    for (const f of files) {
      expect(existsSync(f), f).toBe(true);
      expect(statSync(f).size).toBeGreaterThan(500);
    }
    expect(existsSync("public/icons/apple-touch-icon.png")).toBe(true);
    expect(existsSync("public/offline.html")).toBe(true);
  });

  it("service worker nunca guarda API, admin, login nem páginas", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    for (const area of ["/api/", "/admin", "/login"]) expect(sw).toContain(area.replaceAll("/", "\\/"));
    expect(sw).toMatch(/req\.mode === "navigate"[\s\S]*caches\.match\(OFFLINE_URL\)/);
    expect(sw).not.toMatch(/cache\.put\(req[^;]*navigate/);
  });

  it("a CSP permite apenas worker e manifesto da própria origem", () => {
    const csp = buildCsp({ production: true });
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("manifest-src 'self'");
  });
});
