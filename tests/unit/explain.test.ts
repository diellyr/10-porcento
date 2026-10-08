import { describe, expect, it } from "vitest";
import { explainItem } from "@/lib/explain";
import { FUNCTIONS, EXPENSE_GROUPS, REVENUE_ORIGINS } from "@/server/core/catalog-info";

describe("explicações do “O que é isso?”", () => {
  it("toda função, grupo de despesa e origem de receita do catálogo tem texto próprio", () => {
    const generic = /O valor é o total registrado/;
    for (const code of Object.keys(FUNCTIONS)) expect(explainItem("function", { code, label: FUNCTIONS[code]! }).text).not.toMatch(generic);
    for (const code of Object.keys(EXPENSE_GROUPS)) expect(explainItem("nature", { code, label: EXPENSE_GROUPS[code]! }).text).not.toMatch(generic);
    for (const code of Object.keys(REVENUE_ORIGINS)) expect(explainItem("origin", { code, label: REVENUE_ORIGINS[code]! }).text).not.toMatch(generic);
  });
  it("Outros, tributos e itens desconhecidos têm explicação", () => {
    expect(explainItem("function", { code: "OTHER", label: "Outros" }).text).toMatch(/R\$ 100/);
    expect(explainItem("tax", { code: "COFINS", label: "Cofins" }).text).toMatch(/Cofins/);
    expect(explainItem("origin", { code: "9.9", label: "Algo" }).text).toMatch(/de onde o dinheiro veio/);
  });
});
