import { expect, test, type Page } from "@playwright/test";
import { CASES, DECISION_BY_ID } from "@/game/content/cases";
import { CONV_BY_ID } from "@/game/content/conversations";
import { CLUE_BY_ID, FINDINGS } from "@/game/content/clues";
import { LOCATIONS } from "@/game/content/locations";
import type { LocationId } from "@/game/engine/types";

/**
 * Jogo completo pela interface (toque/clique): campanha de 10 casos nas duas trajetórias.
 * Roda com a vista 2D (qualidade 3D "2d") para ser rápido no navegador sem GPU; o mapa 3D da UPA é validado em teste próprio (/mundo3d).
 */
const CONFIG = { mudo: true, voz: 0, musica: 0, efeitos: 0, reduzirMovimento: true, qualidade3d: process.env.E2E_Q3D ?? "2d", altoContraste: false, textoGrande: false };

async function novaPartida(page: Page, nome: string, config: object = CONFIG) {
  await page.addInitScript((c) => { try { localStorage.setItem("meus10:config", JSON.stringify(c)); } catch { /* */ } }, config);
  await page.goto("/jogo?acao=novo");
  await page.getByLabel("Nome fictício").fill(nome);
  await page.getByLabel("Entendi: é uma simulação satírica.").check();
  await page.getByRole("button", { name: /Começar campanha/ }).click();
  for (let i = 0; i < 3; i++) {
    const opt = page.getByRole("group", { name: "Respostas" }).getByRole("button").first();
    await opt.click();
    await page.waitForTimeout(1900);
  }
}

async function irPara(page: Page, loc: LocationId) {
  if ((await page.getByRole("heading", { level: 1, name: LOCATIONS[loc].nome }).count()) > 0) return;
  await page.getByRole("button", { name: /Mapa/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${LOCATIONS[loc].nome}`) }).click();
  await expect(page.getByRole("heading", { level: 1, name: LOCATIONS[loc].nome })).toBeVisible();
}

async function conversar(page: Page) {
  for (let i = 0; i < 40; i++) {
    const d = page.getByRole("dialog", { name: /Conversa/ });
    if ((await d.count()) === 0) return;
    const escolha = d.getByRole("group", { name: "Escolha sua resposta" });
    if (await escolha.count()) { await escolha.getByRole("button").first().click({ timeout: 5000 }); continue; }
    const btn = d.getByRole("button", { name: /Continuar|Encerrar conversa|Mostrar tudo/ }).first();
    await btn.click({ timeout: 5000 });
    await page.waitForTimeout(60);
  }
}

async function negociar(page: Page) {
  const dlg = page.getByRole("dialog", { name: /Convença o Guardião/ });
  if ((await dlg.count()) === 0) return;
  await dlg.getByLabel("Seu argumento").fill("Proponho uma alternativa ao corte: reduzir a perda por validade do livro-caixa e manter o acesso da pediatria noturna, sem fechar atendimento, com indicador conferido em um trimestre.");
  await dlg.getByRole("button", { name: "Argumentar" }).click();
  await dlg.getByRole("button", { name: "Continuar" }).click();
}

async function explorar(page: Page, caso: number) {
  const locs = Object.values(LOCATIONS).filter((l) => l.hotspots.some((h) => h.kind !== "porta" && h.kind !== "mesa" && h.entradas.some((e) => e.casos.includes(caso))));
  for (const l of locs) {
    await irPara(page, l.id);
    for (const h of l.hotspots.filter((x) => x.kind !== "porta" && x.kind !== "mesa" && x.entradas.some((e) => e.casos.includes(caso)))) {
      await page.locator(`[data-acao="${h.id}"]`).click();
      if (h.kind === "pista") { await expect(page.getByRole("dialog", { name: "Dossiê do caso" })).toBeVisible(); await page.keyboard.press("Escape"); }
      else { await conversar(page); await negociar(page); }
      await expect(page.locator("[role=dialog]")).toHaveCount(0);
    }
  }
}

async function confrontar(page: Page, caso: number) {
  const fs = FINDINGS.filter((f) => f.caso === caso);
  if (!fs.length) return;
  await page.getByRole("button", { name: /Dossiê/ }).click();
  const dlg = page.getByRole("dialog", { name: "Dossiê do caso" });
  for (const f of fs) {
    for (const id of [f.a, f.b]) await dlg.getByRole("listitem").filter({ hasText: CLUE_BY_ID[id]!.titulo }).getByRole("button", { name: /Marcar para confrontar/ }).click();
    await dlg.getByRole("button", { name: /Confrontar/ }).click();
    await expect(dlg.getByRole("status")).toContainText(f.titulo);
    await dlg.getByRole("tab", { name: /Pistas/ }).click();
  }
  await page.keyboard.press("Escape");
}

async function decidir(page: Page, caso: number, opcao: string, pct = 5) {
  const dec = DECISION_BY_ID[CASES.find((c) => c.caso === caso)!.decisao]!;
  await irPara(page, dec.mesa);
  await page.getByRole("button", { name: /Tomar a decisão/ }).click();
  await page.locator(`[data-opcao="${opcao}"]`).click();
  const o = dec.opcoes.find((x) => x.id === opcao)!;
  if (o.desvio) {
    await page.getByLabel(/Percentual desviado/).fill(String(pct));
    await expect(page.getByRole("button", { name: "Confirmar desvio fictício" })).toBeDisabled();
    await page.getByLabel(/Entendo que isto é um desvio deliberado/).check();
    await page.getByRole("button", { name: "Confirmar desvio fictício" }).click();
  } else await page.getByRole("button", { name: "Confirmar decisão" }).click();
  await page.getByRole("button", { name: /Pular animação|Ver consequências/ }).click();
  await page.getByRole("button", { name: /Fechar/ }).click();
}

async function proximo(page: Page) {
  await page.getByRole("button", { name: /Próximo caso|Ver o desfecho/ }).click();
  const novidades = page.getByRole("dialog", { name: /O que mudou desde|Últimas consequências/ });
  if (await novidades.count()) await novidades.getByRole("button", { name: /Continuar|Ver o desfecho/ }).click();
}

async function jogarCampanha(page: Page, escolher: (caso: number) => { opcao: string; pct?: number }) {
  for (const c of CASES.filter((x) => x.caso <= 10)) {
    await page.getByRole("button", { name: /Começar a investigar/ }).click();
    await conversar(page); // abertura automática (caso 1)
    await expect(page.locator("[role=dialog]")).toHaveCount(0);
    await explorar(page, c.caso);
    await confrontar(page, c.caso);
    const { opcao, pct } = escolher(c.caso);
    await decidir(page, c.caso, opcao, pct);
    await proximo(page);
  }
}

test("campanha competente pela interface: reconhecimento, relatório coerente e persistência após recarregar", async ({ page }) => {
  test.setTimeout(420_000);
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[browser]", m.type(), m.text().slice(0, 300)); });
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 500)));
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) console.log("[nav]", f.url()); });
  await novaPartida(page, "Ana Teste");
  const best: Record<number, string> = { 1: "reorganizar", 2: "remanejar-equipe", 3: "manutencao-inclusa", 4: "economia-direcionada", 5: "corrigir-cronograma", 6: "devolver-lote", 7: "abrir-tudo", 8: "cotar-esclarecer", 9: "reforco-emergencial", 10: "prestacao-completa" };
  // verifica persistência no meio da campanha
  for (const c of CASES.slice(0, 2)) {
    await page.getByRole("button", { name: /Começar a investigar/ }).click(); await conversar(page); await explorar(page, c.caso); await confrontar(page, c.caso); await decidir(page, c.caso, best[c.caso]!); await proximo(page);
  }
  await page.reload();
  const tela = page.getByRole("button", { name: /^Continuar/ });
  await expect(tela).toBeEnabled({ timeout: 15000 });
  await tela.click();
  await page.getByRole("button", { name: "Continuar", exact: true }).first().click();
  await expect(page.getByText("Episódio 3 de 10").first()).toBeVisible();
  for (const c of CASES.filter((x) => x.caso <= 10).slice(2)) {
    await page.getByRole("button", { name: /Começar a investigar/ }).click(); await conversar(page); await explorar(page, c.caso); await confrontar(page, c.caso); await decidir(page, c.caso, best[c.caso]!); await proximo(page);
  }
  // cena final (diálogo de encerramento) e resultado
  await conversar(page);
  await expect(page.getByRole("heading", { level: 1, name: /Reconhecimento da comunidade/ })).toBeVisible();
  await expect(page.getByText("encerramento local", { exact: false }).first()).toBeVisible();
  await page.getByRole("tab", { name: /Relatório/ }).click();
  await expect(page.getByRole("heading", { name: /Meu plano para melhorar a gestão/ }).first()).toBeVisible();
  await expect(page.getByText("Recursos desviados (fictício)")).toBeVisible();
  await page.getByRole("tab", { name: /Card de resultado/ }).click();
  await expect(page.getByRole("img", { name: /Card de resultado/ })).toBeVisible();
  // promoção ao nível 2: a interface abre o primeiro caso da Secretaria sem erro
  await page.getByRole("button", { name: /próxima fase/ }).first().click();
  await expect(page.getByText("Episódio 1 de 8").first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Algo deu errado")).toHaveCount(0);
});

test("campanha com desvio confirmado termina em responsabilização e o relatório lista o desvio", async ({ page }) => {
  test.setTimeout(420_000);
  await novaPartida(page, "Beto Teste");
  await jogarCampanha(page, (n) => {
    const m: Record<number, { opcao: string; pct?: number }> = { 1: { opcao: "aurora", pct: 6.5 }, 2: { opcao: "escala-risco" }, 3: { opcao: "manutencao-inclusa" }, 4: { opcao: "economia-direcionada" }, 5: { opcao: "corrigir-cronograma" }, 6: { opcao: "conferir-liquidar-parcial" }, 7: { opcao: "abrir-tudo" }, 8: { opcao: "cotar-esclarecer" }, 9: { opcao: "reforco-emergencial" }, 10: { opcao: "prestacao-completa" } };
    return m[n]!;
  });
  await conversar(page);
  await expect(page.getByRole("heading", { level: 1, name: /Responsabilização/ })).toBeVisible();
  await page.getByRole("tab", { name: /Relatório/ }).click();
  await expect(page.getByText(/6,5% = R\$/).first()).toBeVisible();
  await expect(page.getByText(/desvio de 6,5%/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Desvios, alternativa de gestão e controles/ })).toBeVisible();
});

test("cancelar a confirmação não registra decisão", async ({ page }) => {
  await novaPartida(page, "Cris Teste");
  await page.getByRole("button", { name: /Começar a investigar/ }).click(); await conversar(page);
  await irPara(page, "administracao");
  await page.getByRole("button", { name: /Tomar a decisão/ }).click();
  await page.locator('[data-opcao="aurora"]').click();
  await expect(page.getByRole("button", { name: "Confirmar desvio fictício" })).toBeDisabled();
  await page.getByRole("button", { name: /Voltar às opções/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Menu/ }).click();
  await page.getByRole("button", { name: /Contas/ }).click();
  await expect(page.getByText("Sem movimentações ainda.").first()).toBeVisible();
  void CONV_BY_ID;
});

test("mapa 3D da UPA: visão geral com as 6 salas, entrar numa sala e marcadores interativos", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/mundo3d?modo=mapa");
  await page.locator("[data-pronto]").waitFor({ timeout: 90_000 });
  const salas = page.getByRole("button", { name: /^Ir para / });
  await expect(salas).toHaveCount(6);
  await expect(salas.first()).toBeVisible({ timeout: 30_000 });
  // girar e aproximar não quebram a cena
  await page.getByRole("button", { name: "Girar para a direita" }).click();
  await page.getByRole("button", { name: "Aproximar" }).click();
  // entrar numa sala: aparecem os marcadores dos pontos interativos
  await page.getByRole("button", { name: /^Ir para Recepção/ }).click();
  const marcador = page.locator('[data-hotspot="celia"]');
  await expect(marcador).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /Ver a UPA toda/ })).toBeVisible();
});
