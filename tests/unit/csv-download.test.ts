import { describe, expect, it } from "vitest";
import { buildCsv } from "@/lib/csv-download";

describe("exportação CSV", () => {
  it("BOM, separador ;, aspas e rodapé de fonte", () => {
    const csv = buildCsv(["Nome", "Valor"], [["Praia; Grande", 10.5], ['Diz "oi"', null]], ["Fonte: Tesouro\nNacional"]);
    expect(csv.startsWith("﻿Nome;Valor\n")).toBe(true);
    expect(csv).toContain('"Praia; Grande";10.5');
    expect(csv).toContain('"Diz ""oi""";');
    expect(csv.trimEnd().endsWith("# Fonte: Tesouro Nacional")).toBe(true);
  });
  it("neutraliza fórmulas em planilhas (objeto de contrato malicioso)", () => {
    const csv = buildCsv(["Objeto"], [['=HYPERLINK("http://evil")'], ["+cmd"], ["@x"]]);
    const lines = csv.split("\n");
    expect(lines[1]!.startsWith("\"'=")).toBe(true);
    expect(lines[2]).toBe("'+cmd");
    expect(lines[3]).toBe("'@x");
  });
});
