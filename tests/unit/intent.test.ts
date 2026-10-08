import { describe, expect, it } from "vitest";
import { parseQuestion } from "@/server/intent/parser";
import { parseSearchTerm } from "@/server/services/search";
import { memoryStack } from "@/server/dev/memory";

const NOW = new Date("2026-10-07T00:00:00Z");

async function deps() {
  const s = memoryStack();
  await s.data.upsertEntities([
    { type: "STATE", code: "35", name: "São Paulo", uf: "SP", population: 1, parentCode: "1" },
    { type: "MUNICIPALITY", code: "3550308", name: "São Paulo", uf: "SP", population: 1, parentCode: "35" },
    { type: "MUNICIPALITY", code: "3548500", name: "Santos", uf: "SP", population: 1, parentCode: "35" },
    { type: "MUNICIPALITY", code: "3541406", name: "Praia Grande", uf: "SP", population: 1, parentCode: "35" },
  ], "t");
  return { data: s.data, now: NOW };
}

describe("parser de linguagem natural → JSON estruturado → QuerySpec", () => {
  it("“Quanto Santos gastou com saúde em 2025?” ⇒ despesa liquidada, função saúde, 2025", async () => {
    const r = await parseQuestion("Quanto Santos gastou com saúde em 2025?", await deps());
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.specs).toEqual([{ kind: "series", entity_type: "MUNICIPALITY", entity_code: "3548500", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", category_code: "10", year_from: 2025, year_to: 2025 }]);
  });
  it("“Despesa com saúde de Santos em 2025” resulta na MESMA consulta estruturada", async () => {
    const a = await parseQuestion("Quanto Santos gastou com saúde em 2025?", await deps());
    const b = await parseQuestion("Despesa com saúde de Santos em 2025", await deps());
    expect(a.status === "ok" && b.status === "ok" && JSON.stringify(a.specs)).toBe(b.status === "ok" ? JSON.stringify(b.specs) : "");
  });
  it("comparação entre dois municípios", async () => {
    const r = await parseQuestion("Compare educação de Praia Grande e Santos", await deps());
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.intent.intent).toBe("compare");
    expect(r.specs.map((s) => s.entity_code).sort()).toEqual(["3541406", "3548500"]);
    expect(r.specs[0]!.category_code).toBe("12");
  });
  it("“estado” desambigua São Paulo (estado × capital)", async () => {
    const st = await parseQuestion("Quanto o estado de São Paulo gastou com educação em 2024?", await deps());
    const ci = await parseQuestion("Quanto a cidade de São Paulo gastou com educação em 2024?", await deps());
    expect(st.status === "ok" && st.specs[0]!.entity_type).toBe("STATE");
    expect(ci.status === "ok" && ci.specs[0]!.entity_type).toBe("MUNICIPALITY");
  });
  it("empenhada/paga mudam o conceito contábil (não são misturados)", async () => {
    const e = await parseQuestion("Quanto Santos empenhou com saúde em 2024?", await deps());
    const p = await parseQuestion("Quanto Santos pagou com saúde em 2024?", await deps());
    expect(e.status === "ok" && e.specs[0]!.metric).toBe("EXPENSE_COMMITTED");
    expect(p.status === "ok" && p.specs[0]!.metric).toBe("EXPENSE_PAID");
  });
  it("ICMS é tributo estadual: pergunta sobre estado é reconhecida, mas sem dado por tributo estadual avisa com honestidade", async () => {
    const r = await parseQuestion("Quanto São Paulo arrecadou de ICMS?", await deps());
    expect(r.status).toBe("unsupported");
  });
  it("ranking: “quais municípios de São Paulo mais aumentaram despesas” ⇒ consulta de ranking validada", async () => {
    const r = await parseQuestion("Quais municípios de São Paulo mais aumentaram despesas?", await deps());
    expect(r).toEqual({ status: "ranking", query: expect.objectContaining({ entity_type: "MUNICIPALITY", uf: "SP", metric: "EXPENSE_LIQUIDATED", order: "change_desc", year: 2025, compare_year: 2024, limit: 10, per_capita: false }) });
  });
  it("ranking: variações de pergunta (estados, receita, saúde por habitante, menores, anos explícitos)", async () => {
    const d = await deps();
    const q = async (t: string) => { const r = await parseQuestion(t, d); return r.status === "ranking" ? r.query : r; };
    expect(await q("Quais estados mais arrecadaram em 2024?")).toMatchObject({ entity_type: "STATE", metric: "REVENUE_REALIZED", order: "value_desc", year: 2024 });
    expect(await q("Quais municípios de SP mais gastaram com saúde por habitante em 2023?")).toMatchObject({ uf: "SP", category_type: "FUNCTION", category_code: "10", per_capita: true, year: 2023 });
    expect(await q("Quais municípios de São Paulo menos gastaram com educação em 2024?")).toMatchObject({ order: "value_asc", category_code: "12" });
    expect(await q("Quais estados mais reduziram despesas entre 2022 e 2024?")).toMatchObject({ order: "change_asc", year: 2024, compare_year: 2022 });
  });
  it("sem ente reconhecido ⇒ pede esclarecimento", async () => {
    const r = await parseQuestion("Quanto gastou com saúde em 2024?", await deps());
    expect(r.status).toBe("needs_clarification");
  });
  it("tentativa de injeção vira apenas texto: nenhum SQL é gerado", async () => {
    const r = await parseQuestion("Quanto Santos gastou com saúde em 2024; DROP TABLE entities;--", await deps());
    expect(r.status).toBe("ok");
    expect(JSON.stringify(r)).not.toMatch(/drop table/i);
  });
  it("anos futuros e períodos longos são recusados pelo validador", async () => {
    const f = await parseQuestion("Quanto Santos gastou com saúde em 2031?", await deps());
    expect(f.status).toBe("needs_clarification");
    const l = await parseQuestion("Quanto Santos gastou com saúde de 2001 a 2024?", await deps());
    expect(l.status).toBe("needs_clarification");
  });
  it("Brasil ⇒ entidade COUNTRY", async () => {
    const r = await parseQuestion("Quanto o Brasil arrecadou em 2024?", await deps());
    expect(r.status === "ok" && r.specs[0]).toMatchObject({ entity_type: "COUNTRY", entity_code: "1", metric: "REVENUE_REALIZED" });
  });
});

describe("busca global", () => {
  it("interpreta “Cidade - UF”", () => {
    expect(parseSearchTerm("Praia Grande - SP")).toEqual({ name: "Praia Grande", uf: "SP" });
    expect(parseSearchTerm("santos/sp")).toEqual({ name: "santos", uf: "SP" });
    expect(parseSearchTerm("Santos, sp")).toEqual({ name: "Santos", uf: "SP" });
    expect(parseSearchTerm("Santa Rita do Passa Quatro")).toEqual({ name: "Santa Rita do Passa Quatro", uf: null });
    expect(parseSearchTerm("Foz do Iguaçu - XX")).toEqual({ name: "Foz do Iguaçu - XX", uf: null });
  });
});
