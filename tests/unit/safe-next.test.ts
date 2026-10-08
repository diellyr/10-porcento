import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("redirecionamento pós-login", () => {
  it("aceita caminhos internos", () => { expect(safeNext("/admin/fontes")).toBe("/admin/fontes"); });
  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "", null, "/a?b=http://x"])("recusa %s", (v) => { expect(safeNext(v as string | null)).toBe("/admin"); });
});
