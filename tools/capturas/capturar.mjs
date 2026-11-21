// Capturas reais do jogo para QA visual (Chromium com SwiftShader: lento, mas sem GPU).
// uso: node tools/capturas/capturar.mjs <pasta-saida> <porta> <prefixo> [vista,vista,...]
import { chromium } from "playwright";

const [out, port = "3130", prefixo = "cap", lista] = process.argv.slice(2);
const VISTAS = {
  "mapa-n1": "/mundo3d?modo=mapa&q=alta&caso=1",
  "recepcao": "/mundo3d?modo=sala&l=recepcao&q=alta&caso=1",
  "cofre": "/mundo3d?modo=sala&l=cofre&q=alta&caso=1",
  "cofre-media": "/mundo3d?modo=sala&l=cofre&q=media&caso=1&efeitos=fixos",
  "luxo1": "/mundo3d?modo=sala&l=administracao&q=alta&caso=1&patrimonio=120000",
  "luxo3": "/mundo3d?modo=sala&l=administracao&q=alta&caso=1&patrimonio=900000",
  "luxo3-n4": "/mundo3d?modo=sala&l=gabinete-estadual&q=alta&nivel=4&caso=25&patrimonio=900000",
  "secretaria": "/mundo3d?modo=sala&l=secretaria&q=alta&nivel=2&caso=11",
  "mapa-n6": "/mundo3d?modo=mapa&q=alta&nivel=6&caso=37",
  "toninho-conversa": "/mundo3d?modo=sala&l=administracao&q=alta&caso=1&foco=toninho",
  "coroacao": "/cena3d/coroacao?q=alta",
  "coroacao-media": "/cena3d/coroacao?q=media",
  "moedas": "/cena3d/moedas?q=alta&i=3&t=1.1",
  "busto-joana": "/cena3d?c=joana&e=feliz&f=1&q=alta",
  "busto-cornelio": "/cena3d?c=cornelio&e=feliz&q=alta",
};
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
pg.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
pg.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text().slice(0, 200)); });
for (const n of (lista ?? Object.keys(VISTAS).join(",")).split(",")) {
  const extra = process.env.SEM_REDUZIR ? "" : "&reduzir=1";
  await pg.goto(`http://localhost:${port}${VISTAS[n]}${extra}`, { waitUntil: "load", timeout: 180000 });
  await pg.waitForTimeout(Number(process.env.ESPERA ?? (n.startsWith("busto") ? 15000 : 34000)));
  await pg.screenshot({ path: `${out}/${prefixo}-${n}.png` }); console.log(n, "ok");
}
await b.close();
