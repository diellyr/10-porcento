import { describe, expect, it } from "vitest";
import { autoMap, buildRows, chunkByUnit, decodeBuffer, detectDelimiter, parseCsv, parseNumberText, templateCsv } from "@/lib/csv-import-client";

describe("leitura de CSV no navegador", () => {
  it("detecta o separador e interpreta aspas, separador e quebra de linha dentro do campo", () => {
    const txt = 'ano;conta;valor\n2023;"Saúde; e ""saneamento""";1.234,56\n2023;"linha\nquebrada";10,00\n';
    expect(detectDelimiter(txt)).toBe(";");
    const t = parseCsv(txt, ";");
    expect(t).toHaveLength(3);
    expect(t[1]).toEqual(["2023", 'Saúde; e "saneamento"', "1.234,56"]);
    expect(t[2]![1]).toBe("linha\nquebrada");
    expect(detectDelimiter("a,b,c\n1,2,3\n")).toBe(",");
    expect(detectDelimiter("a\tb\n1\t2\n")).toBe("\t");
  });

  it("decodifica ISO-8859-1 e remove BOM", () => {
    const latin1 = new Uint8Array([0x53, 0x61, 0xfa, 0x64, 0x65]); // "Saúde" em Latin-1
    expect(decodeBuffer(latin1.buffer, "iso-8859-1")).toBe("Saúde");
    const bom = new TextEncoder().encode("﻿ano").buffer;
    expect(decodeBuffer(bom, "utf-8")).toBe("ano");
  });

  it("interpreta números pt-BR e internacionais, moeda, negativos", () => {
    expect(parseNumberText("1.234.567,89", ",")).toBe(1234567.89);
    expect(parseNumberText("1,234,567.89", ".")).toBe(1234567.89);
    expect(parseNumberText("R$ 10,5", ",")).toBe(10.5);
    expect(parseNumberText("(1.000,00)", ",")).toBe(-1000);
    expect(parseNumberText("-5", ",")).toBe(-5);
    expect(parseNumberText("abc", ",")).toBeNull();
    expect(parseNumberText("1.2.3", ",")).toBe(123); // pontos são milhares em pt-BR
    expect(parseNumberText("", ",")).toBeNull();
  });

  it("sugere o mapeamento pelo nome das colunas", () => {
    const m = autoMap(["Exercício", "cod_ibge", "Conta", "cod_conta", "Valor", "Coluna"]);
    expect(m.ano).toBe(0); expect(m.ente_codigo).toBe(1); expect(m.categoria_rotulo).toBe(2);
    expect(m.categoria_codigo).toBe(3); expect(m.valor).toBe(4); expect(m.metrica).toBe(5);
    expect(m.ente_tipo).toBeNull();
  });

  it("monta linhas com valores fixos e aponta as inválidas com a linha do arquivo", () => {
    const table = [["ibge", "ano", "cod", "valor"], ["3541406", "2023", "10", "1.000,50"], ["3541406", "20x3", "10", "5"], ["3541406", "2023", "10", "xyz"], ["", "2023", "10", "5"]];
    const m = { ente_codigo: 0, ano: 1, categoria_codigo: 2, valor: 3 };
    const r = buildRows(table, m, { ente_tipo: "MUNICIPALITY", metrica: "EXPENSE_LIQUIDATED" }, ",");
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ ente_tipo: "MUNICIPALITY", ente_codigo: "3541406", ano: 2023, metrica: "EXPENSE_LIQUIDATED", valor: 1000.5 });
    expect(r.invalid.map((i) => i.line)).toEqual([3, 4, 5]);
  });

  it("lotes nunca dividem uma unidade (ente × ano × período)", () => {
    const mk = (cod: string, n: number) => Array.from({ length: n }, () => ({ ente_codigo: cod, ano: 2023, valor: 1 }));
    const chunks = chunkByUnit([...mk("A", 6), ...mk("B", 6), ...mk("C", 3)], 10);
    expect(chunks.map((c) => c.length)).toEqual([6, 9]);
    for (const c of chunks) expect(new Set(c.map((r) => r.ente_codigo)).size).toBeLessThanOrEqual(2);
    expect(chunkByUnit(mk("X", 25), 10)).toHaveLength(1); // unidade maior que o lote fica inteira
  });

  it("modelo de CSV tem cabeçalho canônico e uma linha de exemplo", () => {
    const t = templateCsv({ ente_tipo: "MUNICIPALITY", ente_codigo: "3541406", ano: "2023", periodo: "", metrica: "DEBT", categoria_tipo: "X", categoria_codigo: "1", categoria_rotulo: "Ex", valor: "1,5" });
    expect(t.split("\n")[0]).toBe("ente_tipo;ente_codigo;ano;periodo;metrica;categoria_tipo;categoria_codigo;categoria_rotulo;valor");
    expect(t.split("\n")).toHaveLength(3);
  });
});
