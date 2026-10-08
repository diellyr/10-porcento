import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/version/route";
import { APP_VERSION } from "@/lib/version";
import { isUpdateAvailable } from "@/lib/update-check";

describe("aviso de atualização", () => {
  it("só há atualização quando o servidor informa uma versão semver diferente da carregada", () => {
    expect(isUpdateAvailable("0.4.2", "0.4.3")).toBe(true);
    expect(isUpdateAvailable("0.4.2", "0.4.2")).toBe(false);
    expect(isUpdateAvailable("0.4.2", undefined)).toBe(false);
    expect(isUpdateAvailable("0.4.2", "<html>erro</html>")).toBe(false);
    expect(isUpdateAvailable("0.4.2", 5)).toBe(false);
  });
  it("/api/version devolve a versão do app, sem cache", async () => {
    const res = await GET();
    expect(await res.json()).toEqual({ version: APP_VERSION });
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
  it("o service worker nunca guarda /api/version", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("public/sw.js", "utf8")).toContain("\\/api\\/");
  });
});
