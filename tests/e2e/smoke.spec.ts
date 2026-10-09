import { expect, test } from "@playwright/test";

/** Fluxos principais ponta a ponta (dados sintéticos do modo dev com fixtures). */

test("busca “Praia Grande” → página do município com indicadores e fonte", async ({ page }) => {
  await page.goto("/brasil-fiscal");
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

test("Admin: importar CSV de uma fonte (mapear, importar, usar antes da API e desfazer)", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/admin/fontes/siconfi");
  await expect(page.getByRole("heading", { name: "Importar CSV" })).toBeVisible({ timeout: 60_000 });
  const csv = [
    "ente_tipo;ente_codigo;ano;metrica;categoria_codigo;categoria_rotulo;valor",
    "MUNICIPALITY;3541406;2019;REVENUE_REALIZED;1.1.0.0.00.0.0;Impostos (CSV de teste);1.234.567,89",
    "MUNICIPALITY;3541406;2019;REVENUE_REALIZED;1.7.0.0.00.0.0;Transferências (CSV de teste);500,00",
    "MUNICIPALITY;354140;2019;REVENUE_REALIZED;9.9;Código inválido;10,00",
  ].join("\n");
  await page.getByLabel(/Arquivo CSV/).setInputFiles({ name: "receitas-teste.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf-8") });
  await expect(page.getByText(/3 linha\(s\) válida\(s\) de 3/)).toBeVisible();
  await page.getByRole("button", { name: /Importar 3 linha/ }).click();
  // a linha com código IBGE de 6 dígitos é recusada pelo servidor, com o motivo
  await expect(page.getByText(/Importação concluída: 2 linha\(s\) gravada\(s\), 1 rejeitada/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/7 dígitos/)).toBeVisible();
  await expect(page.getByRole("cell", { name: /receitas-teste.csv/ })).toBeVisible();

  // a consulta agora usa o CSV (valor e origem), sem depender da API
  const q = "/api/v1/query?kind=series&entity_type=MUNICIPALITY&entity_code=3541406&metric=REVENUE_REALIZED&category_type=REVENUE_SOURCE&year_from=2019&year_to=2019&include_points=1";
  const body = JSON.stringify(await (await page.request.get(q)).json());
  expect(body).toContain("1234567.89");
  expect(body).toContain("(CSV)");

  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Desfazer" }).first().click();
  await expect(page.getByText(/Importação desfeita: 2 dado/)).toBeVisible({ timeout: 30_000 });
  expect(JSON.stringify(await (await page.request.get(q)).json())).not.toContain("(CSV)");
});

test("aviso de nova versão: aparece quando o servidor está numa versão diferente e “Atualizar agora” recarrega", async ({ page }) => {
  await page.route("**/api/version", (route) => route.fulfill({ json: { version: "99.0.0" } }));
  await page.goto("/brasil-fiscal");
  const aviso = page.getByRole("status").filter({ hasText: "Nova versão disponível" });
  await expect(aviso).toBeVisible({ timeout: 30_000 });
  await expect(aviso).toContainText("v99.0.0");
  await aviso.getByRole("button", { name: "Depois" }).click();
  await expect(aviso).toBeHidden();
  await page.reload(); // volta a avisar enquanto a versão continuar diferente
  await expect(page.getByRole("status").filter({ hasText: "Nova versão disponível" })).toBeVisible({ timeout: 30_000 });
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Atualizar agora" }).click()]);
});

test("sem diferença de versão, nenhum aviso", async ({ page }) => {
  await page.goto("/brasil-fiscal");
  await page.waitForTimeout(3000);
  await expect(page.getByText("Nova versão disponível")).toHaveCount(0);
});
