#!/usr/bin/env node
// Gera os ícones do PWA (public/icons/*.png) a partir do símbolo da marca. Uso: PW_CHROMIUM_PATH=... npm run pwa:icons
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const out = resolve(import.meta.dirname, "../public/icons");
mkdirSync(out, { recursive: true });

// Cores do logotipo: verde (fundo), amarelo (barras) e azul-marinho (ponto).
const PRIMARY = "#01913c", BARS = "#fbd101", ACCENT = "#022978";
// Símbolo em viewBox 32x32 (igual ao <Mark/> do site). `full` = fundo cobrindo tudo (maskable/apple); senão cantos arredondados.
const svg = (size, { full, scale }) => {
  const bg = full ? `<rect width="32" height="32" fill="${PRIMARY}"/>` : `<rect width="32" height="32" rx="7" fill="${PRIMARY}"/>`;
  const t = (1 - scale) * 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">${bg}
    <g transform="translate(${t} ${t}) scale(${scale})">
      <rect x="7" y="16" width="4.5" height="9" rx="1.2" fill="${BARS}"/><rect x="13.75" y="11" width="4.5" height="14" rx="1.2" fill="${BARS}"/>
      <rect x="20.5" y="7" width="4.5" height="18" rx="1.2" fill="${BARS}"/><circle cx="25.5" cy="6.5" r="3" fill="${ACCENT}"/></g></svg>`;
};
const jobs = [
  ["icon-192.png", 192, { full: false, scale: 1 }],
  ["icon-512.png", 512, { full: false, scale: 1 }],
  ["icon-maskable-512.png", 512, { full: true, scale: 0.7 }], // zona segura de 80% para máscaras circulares
  ["apple-touch-icon.png", 180, { full: true, scale: 0.85 }],
];
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
for (const [name, size, opt] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:transparent">${svg(size, opt)}</body>`);
  await page.screenshot({ path: join(out, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log("gerado", name);
}
await browser.close();
