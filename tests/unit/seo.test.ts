import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

describe("SEO", () => {
  it("sitemap inclui páginas públicas e os 27 estados, sem admin/api/login", () => {
    const urls = sitemap().map((s) => s.url);
    expect(urls.filter((u) => /\/estados\/[a-z]{2}$/.test(u))).toHaveLength(27);
    expect(urls).toContain("http://localhost:3000/rankings");
    expect(urls.some((u) => /admin|api|login/.test(u))).toBe(false);
  });
  it("robots bloqueia admin, API e login e aponta o sitemap", () => {
    const r = robots();
    expect(JSON.stringify(r.rules)).toMatch(/\/admin/);
    expect(JSON.stringify(r.rules)).toMatch(/\/api\//);
    expect(r.sitemap).toBe("http://localhost:3000/sitemap.xml");
  });
});
