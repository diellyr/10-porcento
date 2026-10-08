import { describe, expect, it } from "vitest";
import { cleanEnteName, parseDcaDespesasFuncao, parseDcaReceitas, parseEntes, parseFunctionCode, revenueCodeInfo } from "@/server/sources/siconfi";
import type { FetchUnit } from "@/server/core/interfaces";
import { dcaDespesasRows, dcaReceitasRows, entesRows } from "../fixtures/siconfi";

const unit = (dataset: string): FetchUnit => ({ dataset, entity: { type: "MUNICIPALITY", code: "3541406" }, year: 2023, periodNumber: 0 });

describe("SICONFI parsers (fixtures sintéticas)", () => {
  it("receitas: mantém níveis 1–3, separa previsão de realizada, ignora deduções/colunas desconhecidas/valores inválidos", () => {
    const { facts, skipped } = parseDcaReceitas(dcaReceitasRows, unit("siconfi.dca.receitas"));
    const key = (f: (typeof facts)[number]) => `${f.metric}:${f.category_code}`;
    expect(facts.map(key).sort()).toEqual(["REVENUE_FORECAST:1.0.0.0.00.0.0", "REVENUE_REALIZED:1.0.0.0.00.0.0", "REVENUE_REALIZED:1.1.0.0.00.0.0"].sort());
    expect(skipped).toBe(4);
    expect(facts.find((f) => f.metric === "REVENUE_FORECAST")!.value).toBe(900);
    expect(facts.every((f) => f.category_type === "REVENUE_SOURCE" && f.period_type === "YEAR")).toBe(true);
  });
  it("receitas: nível do código", () => {
    expect(revenueCodeInfo("1.1.0.0.00.0.0")).toEqual({ code: "1.1.0.0.00.0.0", level: 2 });
    expect(revenueCodeInfo("RO1.7.2.1.50.0.1")?.level).toBe(5);
    expect(revenueCodeInfo("TOTAL")).toBeNull();
  });
  it("despesas por função: mapeia empenhada/liquidada/paga separadamente e não mistura com restos a pagar", () => {
    const { facts } = parseDcaDespesasFuncao(dcaDespesasRows, unit("siconfi.dca.despesas_funcao"));
    const saude = facts.filter((f) => f.category_code === "10");
    expect(Object.fromEntries(saude.map((f) => [f.metric, f.value]))).toEqual({ EXPENSE_COMMITTED: 500, EXPENSE_LIQUIDATED: 450, EXPENSE_PAID: 400 });
    expect(facts.find((f) => f.category_code === "10.301")).toMatchObject({ category_type: "SUBFUNCTION", metric: "EXPENSE_LIQUIDATED", value: 200, category_label: "Atenção Básica" });
    expect(saude[0]!.category_label).toBe("Saúde");
  });
  it("despesas por função: exclui intraorçamentárias (dupla contagem) e linhas de total", () => {
    const { facts } = parseDcaDespesasFuncao(dcaDespesasRows, unit("siconfi.dca.despesas_funcao"));
    expect(facts.find((f) => f.category_code === "10" && f.metric === "EXPENSE_LIQUIDATED")!.value).toBe(450);
    expect(facts.some((f) => f.category_code === "TOTAL")).toBe(false);
  });
  it("coluna ambígua não é adivinhada", () => {
    const rows = [
      { coluna: "Despesas Liquidadas (a)", cod_conta: "FU10", valor: 1, rotulo: "x" },
      { coluna: "Despesas Liquidadas (b)", cod_conta: "FU10", valor: 2, rotulo: "x" },
    ];
    expect(parseDcaDespesasFuncao(rows, unit("x")).facts).toEqual([]);
  });
  it("códigos de função/subfunção", () => {
    expect(parseFunctionCode("FU10")).toEqual({ type: "FUNCTION", code: "10" });
    expect(parseFunctionCode("12")).toEqual({ type: "FUNCTION", code: "12" });
    expect(parseFunctionCode("10.301")).toEqual({ type: "SUBFUNCTION", code: "10.301" });
    expect(parseFunctionCode("TOTAL")).toBeNull();
  });
  it("catálogo de entes", () => {
    const out = parseEntes(entesRows as never);
    expect(out.map((e) => `${e.type}:${e.code}:${e.name}`)).toEqual(["COUNTRY:1:Brasil", "STATE:35:São Paulo", "MUNICIPALITY:3541406:Praia Grande", "MUNICIPALITY:3548500:Santos"]);
    expect(out[2]).toMatchObject({ uf: "SP", parentCode: "35", population: 330000 });
  });
  it("limpa prefixos de nomes de entes", () => {
    expect(cleanEnteName("Prefeitura Municipal de Santos")).toBe("Santos");
    expect(cleanEnteName("Governo do Estado do Rio de Janeiro")).toBe("Rio de Janeiro");
    expect(cleanEnteName("Município de Praia Grande - SP")).toBe("Praia Grande");
  });
});
