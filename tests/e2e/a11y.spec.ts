import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Auditoria de acessibilidade (WCAG 2.1 A/AA) das páginas principais, com dados sintéticos. */
const PAGES = [
  "/brasil-fiscal", "/", "/jogo", "/jogo?acao=novo", "/entrar", "/elenco", "/perfil", "/glossario", "/municipios", "/estados", "/para-onde-vai", "/de-onde-vem", "/explorar", "/rankings", "/contratos", "/perguntar",
  "/municipios/3541406", "/estados/sp", "/contratos?cnpj=11222333000181", "/admin", "/admin/fontes", "/admin/configuracoes", "/admin/fontes/siconfi",
];

for (const path of PAGES) {
  test(`a11y ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(path.includes("municipios/") || path.includes("contratos?") || path.startsWith("/admin") || path === "/brasil-fiscal" || path === "/" ? 5000 : 2500);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const violations = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes[0]?.target?.join(" ")}`);
    expect(violations, violations.join("\n")).toEqual([]);
  });
}
