import { describe, expect, it } from "vitest";
import { canonicalJson, hashOf, normalizeText, parseNumber } from "@/server/core/normalize";
import { normalizeSpec, queryHash } from "@/server/core/query-spec";
import { ZodError } from "zod";

describe("normalização de texto e números", () => {
  it("remove acentos, caixa e pontuação", () => {
    expect(normalizeText("  São José dos Campos – SP! ")).toBe("sao jose dos campos sp");
  });
  it("parseNumber entende JSON e pt-BR, e rejeita lixo", () => {
    expect(parseNumber("1.234.567,89")).toBe(1234567.89);
    expect(parseNumber("12,5")).toBe(12.5);
    expect(parseNumber(42)).toBe(42);
    expect(parseNumber("-3.5")).toBe(-3.5);
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber(NaN)).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber("")).toBeNull();
  });
  it("JSON canônico independe da ordem das chaves", () => {
    expect(hashOf({ a: 1, b: { c: 2, d: 3 } })).toBe(hashOf({ b: { d: 3, c: 2 }, a: 1 }));
    expect(canonicalJson({ a: undefined, b: null, c: 1 })).toBe('{"c":1}');
  });
});

describe("QuerySpec", () => {
  const base = { kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", category_code: "10", year_from: 2022, year_to: 2023 };
  it("consultas equivalentes geram o mesmo hash (ordem, zeros à esquerda)", () => {
    const a = queryHash(normalizeSpec(base));
    const b = queryHash(normalizeSpec({ year_to: 2023, year_from: 2022, category_code: "10", category_type: "FUNCTION", metric: "EXPENSE_LIQUIDATED", entity_code: "03541406".slice(1), entity_type: "MUNICIPALITY", kind: "series" }));
    expect(a).toBe(b);
  });
  it("métricas diferentes ⇒ hashes diferentes (despesa liquidada ≠ paga)", () => {
    expect(queryHash(normalizeSpec(base))).not.toBe(queryHash(normalizeSpec({ ...base, metric: "EXPENSE_PAID" })));
  });
  it("rejeita entradas inválidas", () => {
    expect(() => normalizeSpec({ ...base, entity_code: "1; drop table" })).toThrow(ZodError);
    expect(() => normalizeSpec({ ...base, year_from: 2030, year_to: 2030 })).toThrow(ZodError);
    expect(() => normalizeSpec({ ...base, year_from: 2000, year_to: 2023 })).toThrow(ZodError);
    expect(() => normalizeSpec({ ...base, kind: "breakdown" })).toThrow(ZodError); // múltiplos anos
    expect(() => normalizeSpec({ ...base, metric: "OUTRA" })).toThrow(ZodError);
    expect(() => normalizeSpec({ ...base, category_type: "function; --" })).toThrow(ZodError);
  });
});
