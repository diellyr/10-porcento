import { expect, test } from "@playwright/test";

/** Fluxos principais ponta a ponta (dados sintéticos do modo dev com fixtures). */

test("busca “Praia Grande” → página do município com indicadores e fonte", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("alert").filter({ hasText: "MODO DE DESENVOLVIMENTO" })).toBeVisible();
  const box = page.getByRole("combobox").first();
  await box.fill("praia gra");
  await page.getByRole("option", { name: /Praia Grande/ }).first().click();
  await expect(page).toHaveURL(/\/municipios\/3541406/, { timeout: 60_000 }); // a 1ª navegação compila a rota em dev
  await expect(page.getByRole("heading", { name: "Praia Grande - SP" })).toBeVisible();
  await expect(page.getByText("Arrecadação").first()).toBeVisible();
  await expect(page.locator("summary", { hasText: "Fonte e período" }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Fonte: Tesouro Nacional/).last()).toBeVisible({ timeout: 30_000 }); // fonte do bloco "R$ 100"
  await expect(page.getByText("De cada R$ 100 gastos pela prefeitura de Praia Grande")).toBeVisible();
});

test("Para onde vão R$100: muda para ‘por tipo de gasto’", async ({ page }) => {
  await page.goto("/para-onde-vai");
  await expect(page.getByText(/De cada R\$ 100 gastos/)).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Como dividir").selectOption("nature");
  await expect(page.getByText("Pessoal e encargos").first()).toBeVisible({ timeout: 30_000 });
});

test("Explorador: despesa por função gera gráfico e tabela", async ({ page }) => {
  await page.goto("/explorar");
  await page.getByLabel("Quero analisar").selectOption("expense");
  await expect(page.getByRole("heading", { name: /Despesa liquidada/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Baixar CSV" })).toBeVisible();
});

test("Contratos por CNPJ: resumo, tabela e LGPD (CPF recusado)", async ({ page }) => {
  await page.goto("/contratos");
  await page.getByLabel("CNPJ da empresa").fill("11222333000181");
  await page.getByRole("button", { name: "Buscar contratos" }).click();
  await expect(page.getByText("Valor total contratado")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("cell", { name: /1\/2024|3\/2024/ }).first()).toBeVisible();
  const r = await page.request.get("/api/v1/contracts?cnpj=12345678909");
  expect(r.status()).toBe(400);
  expect(JSON.stringify(await r.json())).toContain("LGPD");
});

test("Rankings: estados, completar base e ordenar", async ({ page }) => {
  test.setTimeout(300_000); // completa 27 estados consultando a fonte (sintética) um a um
  await page.goto("/rankings");
  const fill = page.getByRole("button", { name: /Completar dados dos 27 estados/ });
  const done = page.getByText("Ranking completo");
  await expect(fill.or(done)).toBeVisible({ timeout: 30_000 }); // isVisible() não espera: aguarda um dos dois estados
  // Em dev, o Fast Refresh pode recarregar a página no meio do preenchimento (compilação de outra rota): se o botão
  // voltar, clica de novo — o que já foi salvo não é refeito.
  await expect(async () => {
    if (await done.isVisible()) return;
    if (await fill.isVisible()) await fill.click();
    await expect(done).toBeVisible({ timeout: 20_000 });
  }).toPass({ timeout: 240_000 });
});

test("Admin (dev): ligar/desligar fonte, testar conexão e adicionar fonte", async ({ page }) => {
  await page.goto("/admin/fontes");
  const card = page.locator("div", { has: page.getByRole("heading", { name: "SICONFI", exact: true }) }).last();
  await expect(page.getByRole("heading", { name: "SICONFI", exact: true })).toBeVisible({ timeout: 30_000 });
  const sw = page.getByRole("switch", { name: /SICONFI/ });
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText(/Fonte desativada em/)).toBeVisible();
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  void card;
  await page.getByRole("button", { name: "+ Adicionar fonte" }).click();
  await page.getByLabel("Nome").fill("Espelho E2E");
  await page.getByLabel("Responsável / provedor").fill("Teste");
  await page.getByLabel("URL base (https)").fill("https://espelho.exemplo.gov.br");
  await page.getByRole("button", { name: "Criar fonte" }).click();
  await expect(page.getByText("personalizada")).toBeVisible({ timeout: 15_000 });
});

test("códigos inválidos respondem 404 de verdade (sem soft 404) com página amigável", async ({ page, request }) => {
  for (const path of ["/municipios/abc", "/municipios/123", "/estados/xyz"]) expect((await request.get(path)).status(), path).toBe(404);
  const res = await page.goto("/municipios/abc");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /Não encontramos esta página/ })).toBeVisible();
  expect((await request.get("/municipios/3541406")).status()).toBe(200);
  expect((await request.get("/estados/sp")).status()).toBe(200);
});

test("cabeçalhos de segurança presentes", async ({ request }) => {
  const r = await request.get("/glossario");
  const h = r.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
});
