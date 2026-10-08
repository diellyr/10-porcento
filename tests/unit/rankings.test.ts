import { describe, expect, it } from "vitest";
import { RankingQuerySchema } from "@/server/core/ranking";
import { RankingService } from "@/server/services/rankings";
import { rankingSentence, answerQuestion } from "@/server/services/ask";
import { memoryStack } from "@/server/dev/memory";
import type { FactInput } from "@/server/core/types";

const fx = (code: string, year: number, value: number, cat = "10"): FactInput => ({ entity_type: "MUNICIPALITY", entity_code: code, metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", category_code: cat, period_type: "YEAR", period_year: year, period_number: 0, value, unit: "BRL", source_dataset: "x" });

async function setup() {
  const s = memoryStack();
  await s.data.upsertEntities([
    { type: "MUNICIPALITY", code: "1", name: "Alfa", uf: "SP", population: 100, parentCode: "35" },
    { type: "MUNICIPALITY", code: "2", name: "Beta", uf: "SP", population: 1000, parentCode: "35" },
    { type: "MUNICIPALITY", code: "3", name: "Gama", uf: "SP", population: 50, parentCode: "35" },
    { type: "MUNICIPALITY", code: "4", name: "Delta", uf: "RJ", population: 50, parentCode: "33" },
  ], "src");
  s.store.sources.set("src", { id: "src", slug: "siconfi" } as never);
  await s.data.upsertFacts([fx("1", 2023, 100), fx("1", 2024, 300), fx("2", 2023, 1000), fx("2", 2024, 1100), fx("3", 2024, 40), fx("4", 2024, 999), fx("1", 2024, 5, "12")], "src");
  return { ...s, svc: new RankingService(s.data) };
}
const base = { entity_type: "MUNICIPALITY", metric: "EXPENSE_LIQUIDATED", category_code: "10", year: 2024, uf: "SP" };

describe("validação do ranking", () => {
  it("variação exige ano de comparação anterior; UF só para municípios; per_capita=\"false\" é falso", () => {
    expect(RankingQuerySchema.safeParse({ ...base, order: "change_desc" }).success).toBe(false);
    expect(RankingQuerySchema.safeParse({ ...base, order: "change_desc", compare_year: 2024 }).success).toBe(false);
    expect(RankingQuerySchema.safeParse({ ...base, entity_type: "STATE" }).success).toBe(false);
    expect(RankingQuerySchema.parse({ ...base, per_capita: "false" }).per_capita).toBe(false);
    expect(RankingQuerySchema.parse({ ...base, per_capita: "true" }).per_capita).toBe(true);
    expect(RankingQuerySchema.safeParse({ ...base, metric: "DEBT" }).success).toBe(false);
    expect(RankingQuerySchema.safeParse({ ...base, limit: 500 }).success).toBe(false);
  });
});

describe("RankingService", () => {
  it("ranking por valor com cobertura honesta (não mistura funções nem UFs)", async () => {
    const { svc } = await setup();
    const r = await svc.rank(base);
    expect(r.items.map((i) => i.name)).toEqual(["Beta", "Alfa", "Gama"]);
    expect([r.covered, r.total, r.complete]).toEqual([3, 3, true]);
    expect(r.note).toBeNull();
  });
  it("variação % entre anos só inclui quem tem os dois anos; avisa que é parcial", async () => {
    const { svc } = await setup();
    const r = await svc.rank({ ...base, order: "change_desc", compare_year: 2023 });
    expect(r.items.map((i) => [i.name, i.changePct])).toEqual([["Alfa", 200], ["Beta", 10]]);
    expect([r.covered, r.total, r.complete]).toEqual([2, 3, false]);
    expect(r.note).toMatch(/Considera 2 de 3 municípios de SP/);
    expect(r.fillable).toBe(false); // municípios não são completados em massa
  });
  it("per capita muda a ordem", async () => {
    const { svc } = await setup();
    const r = await svc.rank({ ...base, per_capita: true });
    expect(r.items[0]!.name).toBe("Alfa"); // 300/100
  });
  it("sem dados ⇒ lista vazia e nota clara (nunca inventa)", async () => {
    const { svc } = await setup();
    const r = await svc.rank({ ...base, year: 2010 });
    expect(r.items).toEqual([]);
    expect(r.note).toMatch(/Ainda não há dados salvos/);
  });
  it("texto e resposta em linguagem natural usam só números do ranking", async () => {
    const s = await setup();
    const r = await s.svc.rank({ ...base, order: "change_desc", compare_year: 2023 });
    expect(rankingSentence(r)).toMatch(/Ranking de municípios de SP por maior aumento — despesa liquidada — Saúde, 2023 → 2024:\n1\. Alfa-SP: R\$\s300 \(\+200%\)/);
    const ans = await answerQuestion("Quais municípios de SP mais aumentaram despesas com saúde entre 2023 e 2024?", { data: s.data, engine: { execute: async () => { throw new Error("não deve consultar"); } }, now: new Date("2026-10-07"), ranking: s.svc });
    expect(ans.status).toBe("ok");
    expect(ans.ranking?.items.map((i) => i.name)).toEqual(["Alfa", "Beta"]);
    expect(ans.ranking?.complete).toBe(false);
  });
});
