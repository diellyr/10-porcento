import { describe, expect, it } from "vitest";
import { QueryRouter } from "@/server/router/query-router";
import { SourceRuntime } from "@/server/router/runtime";
import { fakeFetch } from "@/server/dev/fake-fetch";
import { memoryStack } from "@/server/dev/memory";
import { resetRateWindows } from "@/server/sources/http";
import { ADAPTERS } from "@/server/sources";
import { ieReal } from "../fixtures/siconfi-ie-real";

describe("SICONFI I-E no formato real, ponta a ponta (adaptador + roteador)", () => {
  it("não falha mais com “nenhuma reconhecida”: grava função e subfunção e responde por função", async () => {
    resetRateWindows();
    const stack = memoryStack();
    const ff = fakeFetch([{ match: /\/dca\?/, body: { items: ieReal(), hasMore: false } }]);
    const runtime = new SourceRuntime({ registry: stack.registry, adapters: ADAPTERS, fetchImpl: ff.impl, sleep: async () => undefined, now: () => new Date("2026-10-08T12:00:00Z"), env: {} });
    const router = new QueryRouter({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime });
    await router.ensureRegistry();
    await stack.data.upsertEntities([
      { type: "COUNTRY", code: "1", name: "Brasil", uf: null, population: null, parentCode: null },
      { type: "STATE", code: "35", name: "São Paulo", uf: "SP", population: null, parentCode: "1" },
      { type: "MUNICIPALITY", code: "3541406", name: "Praia Grande", uf: "SP", population: 330000, parentCode: "35" },
    ], "seed");

    const base = { kind: "series", entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED", year_from: 2024, year_to: 2024 };
    const fn = await router.execute({ ...base, category_type: "FUNCTION", category_code: "10" });
    expect(fn.freshness).toBe("fresh");
    expect(fn.notice).toBeNull();
    expect(fn.facts).toHaveLength(1);
    expect(fn.facts[0]).toMatchObject({ value: 4500, categoryLabel: "Saúde", categoryType: "FUNCTION" }); // bloco intra (40) NÃO somado

    const sub = await router.execute({ ...base, category_type: "SUBFUNCTION", category_code: "01.031" });
    expect(sub.facts[0]).toMatchObject({ value: 500, categoryType: "SUBFUNCTION" });

    // todas as funções da unidade ficaram salvas, sem duplicatas
    const all = [...stack.store.facts.values()].filter((f) => f.metric === "EXPENSE_LIQUIDATED" && f.categoryType === "FUNCTION");
    expect(all.map((f) => f.categoryCode).sort()).toEqual(["01", "10", "12"]);
  });
});
