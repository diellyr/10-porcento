import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "@/lib/version";

describe("versão do app", () => {
  it("segue SemVer", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("version.md declara a mesma versão do package.json e tem entrada no histórico", () => {
    const md = readFileSync("version.md", "utf8");
    expect(md).toContain(`**Versão atual: ${APP_VERSION}**`);
    expect(md).toMatch(new RegExp(`^### ${APP_VERSION.replace(/\./g, "\\.")} — \\d{4}-\\d{2}-\\d{2}`, "m"));
  });
});
