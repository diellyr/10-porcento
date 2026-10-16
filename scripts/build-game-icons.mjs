#!/usr/bin/env node
// Gera os ícones do PWA do jogo MEUS 10% (public/icons/meus10-*.png). Uso: PW_CHROMIUM_PATH=... node scripts/build-game-icons.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const out = resolve(import.meta.dirname, "../public/icons");
mkdirSync(out, { recursive: true });

// Símbolo em viewBox 100x100: fundo laranja, "10%" em azul-marinho com sombra branca e uma caneta amarela cruzando o canto.
const svg = (size, { full, scale }) => {
  const t = (1 - scale) * 50;
  const bg = full ? `<rect width="100" height="100" fill="url(#g)"/>` : `<rect width="100" height="100" rx="22" fill="url(#g)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#ff7a1a"/></linearGradient></defs>${bg}
    <g transform="translate(${t} ${t}) scale(${scale})">
      <text x="50" y="58" text-anchor="middle" font-family="Fredoka, Nunito, 'Arial Rounded MT Bold', Arial, sans-serif" font-weight="800" font-size="40" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round">10%</text>
      <text x="50" y="58" text-anchor="middle" font-family="Fredoka, Nunito, 'Arial Rounded MT Bold', Arial, sans-serif" font-weight="800" font-size="40" fill="#1b2340">10%</text>
      <g transform="rotate(-10 50 78)"><rect x="16" y="73" width="54" height="9" rx="4.5" fill="#1a46d4"/><polygon points="70,73 86,77.5 70,82" fill="#ffc933"/><circle cx="21" cy="77.5" r="2" fill="#fff"/></g>
    </g></svg>`;
};
const jobs = [
  ["meus10-192.png", 192, { full: false, scale: 1 }],
  ["meus10-512.png", 512, { full: false, scale: 1 }],
  ["meus10-maskable-512.png", 512, { full: true, scale: 0.72 }],
  ["meus10-apple-touch.png", 180, { full: true, scale: 0.85 }],
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
