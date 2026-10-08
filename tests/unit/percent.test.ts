import { describe, expect, it } from "vitest";
import { formatPercent, pctChange } from "@/lib/format";
describe("percentuais", () => {
  it("formata com vírgula e sinal", () => {
    expect(formatPercent(42.17)).toBe("42,2%");
    expect(formatPercent(5.25, { signed: true })).toBe("+5,3%");
    expect(formatPercent(-3.04, { signed: true })).toBe("-3,0%");
  });
  it("variação % só com base válida", () => {
    expect(pctChange(100, 110)).toBeCloseTo(10);
    expect(pctChange(200, 100)).toBeCloseTo(-50);
    expect(pctChange(0, 10)).toBeNull();
    expect(pctChange(null, 10)).toBeNull();
  });
});
