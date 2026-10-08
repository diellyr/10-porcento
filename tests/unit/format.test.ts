import { describe, expect, it } from "vitest";
import { formatBRLCompact, formatDate } from "@/lib/format";

describe("formatação", () => {
  it("data só-dia não muda por fuso horário", () => { expect(formatDate("2024-03-01")).toBe("01/03/2024"); expect(formatDate("2024-12-31")).toBe("31/12/2024"); });
  it("timestamp usa o fuso de Brasília", () => { expect(formatDate("2026-10-07T01:00:00Z")).toBe("06/10/2026"); });
  it("vazio", () => { expect(formatDate(null)).toBe("—"); });
  it("valores compactos", () => { expect(formatBRLCompact(1_500_000_000)).toBe("R$ 1,5 bi"); expect(formatBRLCompact(720_000)).toBe("R$ 720 mil"); expect(formatBRLCompact(-2_000_000)).toBe("-R$ 2 mi"); });
});
