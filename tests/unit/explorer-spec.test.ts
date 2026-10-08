import { describe, expect, it } from "vitest";
import { buildQuery, categoriesFor, csvCell, metricFor } from "@/lib/explorer-spec";
import { normalizeSpec } from "@/server/core/query-spec";
import { datasetsFor } from "@/server/router/query-router";

const praia = { type: "MUNICIPALITY" as const, code: "3541406", name: "Praia Grande", uf: "SP" };

describe("construtor de consultas do Explorador", () => {
  it("toda combinação oferecida gera um QuerySpec válido", () => {
    for (const subject of ["revenue", "expense", "debt", "benefit"] as const) {
      for (const place of [praia, { type: "STATE" as const, code: "35", name: "SP", uf: "SP" }, { type: "COUNTRY" as const, code: "1", name: "Brasil", uf: null }]) {
        for (const cat of categoriesFor(subject, place.type)) {
          const url = new URL(buildQuery({ subject, stage: "EXPENSE_LIQUIDATED", place, cat, from: 2020, to: 2023 }), "http://x");
          const sp = url.searchParams;
          expect(() => normalizeSpec({
            kind: sp.get("kind"), entity_type: sp.get("entity_type"), entity_code: sp.get("entity_code"), metric: sp.get("metric"),
            category_type: sp.get("category_type") ?? undefined, category_code: sp.get("category_code") ?? undefined, year_from: Number(sp.get("year_from")), year_to: Number(sp.get("year_to")),
          }), `${subject}/${place.type}/${cat.id}`).not.toThrow();
        }
      }
    }
  });
  it("conceitos contábeis: cada etapa da despesa é uma métrica distinta", () => {
    expect(metricFor("expense", "EXPENSE_PAID")).toBe("EXPENSE_PAID");
    expect(metricFor("expense", "EXPENSE_COMMITTED")).toBe("EXPENSE_COMMITTED");
    expect(metricFor("revenue", "EXPENSE_PAID")).toBe("REVENUE_REALIZED");
    expect(metricFor("benefit", "EXPENSE_PAID", "people")).toBe("BENEFICIARIES");
  });
  it("tributo federal só é oferecido para a União", () => {
    expect(categoriesFor("revenue", "MUNICIPALITY").some((c) => c.id === "tax")).toBe(false);
    expect(categoriesFor("revenue", "COUNTRY").some((c) => c.id === "tax")).toBe(true);
  });
  it("Bolsa Família e BPC não disparam o dataset um do outro", () => {
    const base = { kind: "series" as const, entity_type: "MUNICIPALITY" as const, entity_code: "3541406", metric: "BENEFIT_VALUE" as const, category_type: "BENEFIT", year_from: 2024, year_to: 2024 };
    expect(datasetsFor({ ...base, category_code: "BPC" }).map((d) => d.id)).toEqual(["transparencia.bpc"]);
    expect(datasetsFor({ ...base, category_code: "BOLSA_FAMILIA" }).map((d) => d.id)).toEqual(["transparencia.bolsa_familia"]);
  });
  it("CSV: escapa delimitadores e neutraliza fórmulas", () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(null)).toBe("");
  });
});
