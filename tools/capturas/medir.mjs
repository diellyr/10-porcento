// Mede quadros/s (mediana) e chamadas de desenho por quadro no mundo 3D (atributos data-fps/data-calls do World3D).
// ATENÇÃO: no Chromium sem GPU (SwiftShader) os números só servem para comparação relativa na mesma máquina.
// uso: node tools/capturas/medir.mjs <porta> <rótulo> [vista=url ...]
import { chromium } from "playwright";
const [port, rotulo, ...vistas] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const v of vistas) {
  const i0 = v.indexOf("="), nome = v.slice(0, i0), url = v.slice(i0 + 1);
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const t0 = Date.now();
  await pg.goto(`http://localhost:${port}${url}&reduzir=1`, { waitUntil: "load", timeout: 180000 });
  await pg.waitForSelector("[data-pronto]", { state: "attached", timeout: 120000 });
  const pronto = Date.now() - t0;
  await pg.waitForTimeout(Number(process.env.ESPERA ?? 25000));
  const fps = [], calls = [], tris = [];
  for (let i = 0; i < 10; i++) { const d = await pg.evaluate(() => { const e = document.querySelector("[data-pronto]"); return [Number(e?.getAttribute("data-fps")), Number(e?.getAttribute("data-calls")), Number(e?.getAttribute("data-tris"))]; }); fps.push(d[0]); calls.push(d[1]); tris.push(d[2]); await pg.waitForTimeout(1000); }
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log(JSON.stringify({ rotulo, nome, prontoMs: pronto, fpsMediana: med(fps), chamadasDesenho: med(calls), triangulos: med(tris) }));
  await pg.close();
}
await b.close();
