import { describe, expect, it } from "vitest";
import { cleanEnteName, parseDcaDespesasFuncao, parseFunctionFromConta, parseDcaReceitas, parseEntes, parseFunctionCode, revenueCodeInfo } from "@/server/sources/siconfi";
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

import { IE_INTRA, IE_VALORES, ieReal } from "../fixtures/siconfi-ie-real";

describe("DCA I-E no formato real (função/subfunção no campo `conta`, cod_conta = TotalDespesas)", () => {
  const u = { dataset: "siconfi.dca.despesas_funcao", entity: { type: "MUNICIPALITY", code: "3541406" }, year: 2024, periodNumber: 0 } as const;
  const { facts, skipped } = parseDcaDespesasFuncao(ieReal(), u);
  const get = (code: string, metric: string) => facts.filter((f) => f.category_code === code && f.metric === metric);

  it("extrai o código do campo conta: função e subfunção", () => {
    expect(parseFunctionFromConta("01 - Legislativa")).toEqual({ type: "FUNCTION", code: "01", label: "Legislativa" });
    expect(parseFunctionFromConta("01.031 - Ação Legislativa")).toEqual({ type: "SUBFUNCTION", code: "01.031", label: "Ação Legislativa" });
    expect(parseFunctionFromConta("Despesas Exceto Intraorçamentárias")).toBeNull();
    expect(parseFunctionFromConta("Demais Subfunções")).toBeNull();
    expect(parseFunctionFromConta("")).toBeNull();
  });

  it("gera FUNCTION e SUBFUNCTION com rótulo, preservando empenhado, liquidado e pago", () => {
    const leg = facts.filter((f) => f.category_code === "01");
    expect(leg.map((f) => [f.metric, f.value]).sort()).toEqual([["EXPENSE_COMMITTED", 1000], ["EXPENSE_LIQUIDATED", 900], ["EXPENSE_PAID", 800]]);
    expect(leg.every((f) => f.category_type === "FUNCTION" && f.category_label === "Legislativa" && f.source_dataset === "DCA-Anexo I-E")).toBe(true);
    const sub = facts.filter((f) => f.category_code === "01.031");
    expect(sub.map((f) => [f.metric, f.value]).sort()).toEqual([["EXPENSE_COMMITTED", 600], ["EXPENSE_LIQUIDATED", 500], ["EXPENSE_PAID", 450]]);
    expect(sub.every((f) => f.category_type === "SUBFUNCTION" && f.category_label === "Ação Legislativa")).toBe(true);
    expect(get("10", "EXPENSE_PAID")[0]!.value).toBe(4000);
    expect(get("12", "EXPENSE_LIQUIDATED")[0]!.value).toBe(2800);
  });

  it("totalizadores, cabeçalhos de bloco e “Demais Subfunções” não viram fato", () => {
    const labels = facts.map((f) => f.category_label);
    expect(labels.join("|")).not.toMatch(/Exceto|Total|Intra|Demais/i);
    expect(facts.every((f) => f.category_code && /^\d{2}(\.\d{3})?$/.test(f.category_code))).toBe(true);
  });

  it("bloco intraorçamentário fica de fora: a função Saúde não soma o bloco intra (sem dupla contagem)", () => {
    expect(get("10", "EXPENSE_COMMITTED").map((f) => f.value)).toEqual([IE_VALORES["10 - Saúde"]![0]]);
    expect(get("10", "EXPENSE_COMMITTED")[0]!.value).not.toBe(IE_VALORES["10 - Saúde"]![0]! + IE_INTRA["10 - Saúde"]![0]!);
  });

  it("colunas de restos a pagar não são métricas e uma linha por (coluna, função): nada duplicado", () => {
    expect(new Set(facts.map((f) => f.metric))).toEqual(new Set(["EXPENSE_COMMITTED", "EXPENSE_LIQUIDATED", "EXPENSE_PAID"]));
    const keys = facts.map((f) => `${f.metric}|${f.category_type}|${f.category_code}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(facts.map((f) => f.source_record_id)).size).toBe(facts.length); // chaves únicas: o dedupe do persistidor não descarta funções
    // 3 métricas × 5 contas válidas (01, 01.031, 10, 10.301, 12)
    expect(facts).toHaveLength(15);
    expect(skipped).toBeGreaterThan(0);
  });

  it("linha repetida dentro do mesmo bloco não soma duas vezes (mantém a primeira)", () => {
    const dup = [...ieReal(), { ...ieReal()[1]!, valor: 99999 }];
    const r = parseDcaDespesasFuncao(dup, u);
    expect(r.facts.filter((f) => f.category_code === "01" && f.metric === "EXPENSE_COMMITTED").map((f) => f.value)).toEqual([1000]);
  });

  it("formato antigo (cod_conta FU10) continua funcionando", () => {
    const old = parseDcaDespesasFuncao(dcaDespesasRows, unit("siconfi.dca.despesas_funcao")).facts;
    expect(old.some((f) => f.category_code === "10" && f.metric === "EXPENSE_LIQUIDATED" && f.value === 450)).toBe(true);
  });
});
