#!/usr/bin/env node
// Gera docs/GUIA_IMPLANTACAO.pdf a partir de docs/GUIA_IMPLANTACAO.md (requer `pandoc` e o Chromium do Playwright).
// Uso: PW_CHROMIUM_PATH=/caminho/do/chrome npm run docs:pdf   (PW_CHROMIUM_PATH é opcional)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const md = join(root, "docs/GUIA_IMPLANTACAO.md");
const out = join(root, "docs/GUIA_IMPLANTACAO.pdf");
const version = /\*\*Versão atual: ([\d.]+)\*\*/.exec(readFileSync(join(root, "version.md"), "utf8"))?.[1] ?? "?";

const css = `
  @page { size: A4; margin: 18mm 16mm; }
  body { font: 11pt/1.5 "Helvetica Neue", Arial, sans-serif; color: #1b1f27; max-width: 100%; }
  h1 { font-size: 21pt; border-bottom: 3px solid #1f4fd8; padding-bottom: 6px; }
  h2 { font-size: 15pt; margin-top: 1.6em; color: #1f4fd8; border-bottom: 1px solid #d9dde5; padding-bottom: 3px; break-after: avoid; }
  h3 { font-size: 12pt; break-after: avoid; }
  code { font: 9.5pt Menlo, Consolas, monospace; background: #f1f3f7; padding: 1px 4px; border-radius: 3px; word-break: break-all; }
  pre { background: #f1f3f7; padding: 9px 11px; border-radius: 6px; overflow-wrap: anywhere; white-space: pre-wrap; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: .8em 0; font-size: 10pt; break-inside: avoid; }
  th, td { border: 1px solid #cfd4de; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #eef1f8; }
  blockquote { margin: .8em 0; padding: 6px 12px; border-left: 4px solid #d98e04; background: #fff7e6; }
  a { color: #1f4fd8; } hr { border: 0; border-top: 1px solid #d9dde5; margin: 1.4em 0; }
  .rodape { color: #596170; font-size: 9pt; }
`;
const dir = mkdtempSync(join(tmpdir(), "guia-"));
const htmlPath = join(dir, "guia.html");
execFileSync("pandoc", [md, "-f", "gfm", "-t", "html5", "-s", "--metadata", "title=Guia de implantação — Brasil Fiscal", "-o", htmlPath]);
let html = readFileSync(htmlPath, "utf8").replace("</head>", `<style>${css}</style></head>`);
html = html.replace(/<header id="title-block-header">[\s\S]*?<\/header>/, ""); // o título já está no H1 do guia
writeFileSync(htmlPath, html);

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const page = await browser.newPage();
await page.goto(`file://${htmlPath}`);
await page.pdf({
  path: out, format: "A4", printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#596170">Brasil Fiscal v${version} — Guia de implantação — página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`,
});
await browser.close();
console.log(`PDF gerado: ${out} (versão ${version})`);
