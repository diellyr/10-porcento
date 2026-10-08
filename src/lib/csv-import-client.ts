import { IMPORT_FIELDS, type ImportFieldKey } from "@/server/core/csv-import";
import { normalizeText } from "@/server/core/text";

/** Leitura de CSV no navegador (sem enviar o arquivo inteiro ao servidor): decodifica, interpreta, mapeia colunas e monta os lotes. */

export type Encoding = "utf-8" | "iso-8859-1" | "windows-1252";
export type Delimiter = ";" | "," | "\t" | "|";

export function decodeBuffer(buf: ArrayBuffer, encoding: Encoding): string {
  const text = new TextDecoder(encoding).decode(buf);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Escolhe o separador que mais aparece (e de forma consistente) nas primeiras linhas, ignorando o que está entre aspas. */
export function detectDelimiter(text: string): Delimiter {
  const lines = text.split(/\r?\n/).slice(0, 8).filter((l) => l.trim());
  let best: Delimiter = ";", bestScore = -1;
  for (const d of [";", ",", "\t", "|"] as Delimiter[]) {
    const counts = lines.map((l) => { let n = 0, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === d && !q) n++; } return n; });
    if (counts.length === 0 || counts[0] === 0) continue;
    const consistent = counts.every((c) => c === counts[0]);
    const score = counts[0]! * (consistent ? 10 : 1);
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

/** CSV (RFC 4180): aspas duplas, separador e quebras de linha dentro de campos entre aspas. */
export function parseCsv(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** "1.234,56" (decimal ","), "1,234.56" (decimal "."), "R$ 10", "(5)" → -5. Retorna null se não for número. */
export function parseNumberText(raw: string, decimal: "," | "."): number | null {
  let t = raw.trim().replace(/^R\$\s*/i, "").replace(/\s+/g, "");
  if (!t) return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (t.endsWith("-")) { neg = true; t = t.slice(0, -1); }
  if (t.startsWith("-")) { neg = !neg; t = t.slice(1); }
  const thousands = decimal === "," ? /\./g : /,/g;
  t = t.replace(thousands, "");
  if (decimal === ",") t = t.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

export type ColumnMapping = Partial<Record<ImportFieldKey, number | null>>;
export type FixedValues = Partial<Record<ImportFieldKey, string>>;

/** Sugere a coluna de cada campo pelo nome do cabeçalho (sem acento, sem maiúsculas). */
export function autoMap(headers: string[]): ColumnMapping {
  const norm = headers.map((h) => normalizeText(h).replace(/[\s-]+/g, "_"));
  const out: ColumnMapping = {};
  for (const f of IMPORT_FIELDS) {
    // 1º: nome exato do campo; 2º: sinônimos, na ordem de preferência
    const idx = f.aliases.map((a) => norm.indexOf(a)).find((i) => i >= 0);
    out[f.key] = idx === undefined ? null : idx;
  }
  return out;
}

export interface BuiltRow {
  ente_tipo?: string | null; ente_codigo: string; ano: number; periodo?: number | null; metrica?: string | null;
  categoria_tipo?: string | null; categoria_codigo?: string | null; categoria_rotulo?: string | null; valor: number;
}
export interface BuildResult { rows: BuiltRow[]; invalid: Array<{ line: number; reason: string }> }

/** Monta as linhas do formato canônico a partir do mapeamento de colunas e dos valores fixos. `dataStart` = índice da 1ª linha de dados. */
export function buildRows(table: string[][], mapping: ColumnMapping, fixed: FixedValues, decimal: "," | ".", dataStart = 1): BuildResult {
  const rows: BuiltRow[] = [], invalid: BuildResult["invalid"] = [];
  const cell = (r: string[], key: ImportFieldKey): string => {
    const col = mapping[key];
    const v = col !== null && col !== undefined ? (r[col] ?? "").trim() : "";
    return v !== "" ? v : (fixed[key] ?? "").trim();
  };
  for (let i = dataStart; i < table.length; i++) {
    const r = table[i]!;
    const line = i + 1;
    const ano = Number(cell(r, "ano").replace(/\.0+$/, ""));
    const valor = parseNumberText(cell(r, "valor"), decimal);
    const codigo = cell(r, "ente_codigo");
    if (!codigo) { invalid.push({ line, reason: "código do ente vazio" }); continue; }
    if (!Number.isInteger(ano)) { invalid.push({ line, reason: `ano inválido "${cell(r, "ano")}"` }); continue; }
    if (valor === null) { invalid.push({ line, reason: `valor inválido "${cell(r, "valor")}" (confira o separador decimal)` }); continue; }
    const per = cell(r, "periodo");
    const periodo = per === "" ? null : Number(per);
    if (periodo !== null && !Number.isInteger(periodo)) { invalid.push({ line, reason: `período inválido "${per}"` }); continue; }
    rows.push({
      ente_tipo: cell(r, "ente_tipo") || null, ente_codigo: codigo, ano, periodo, metrica: cell(r, "metrica") || null,
      categoria_tipo: cell(r, "categoria_tipo") || null, categoria_codigo: cell(r, "categoria_codigo") || null,
      categoria_rotulo: cell(r, "categoria_rotulo") || null, valor,
    });
  }
  return { rows, invalid };
}

/** Divide em lotes sem separar uma mesma unidade (ente × ano × período) entre lotes, para a cobertura ficar exata. */
export function chunkByUnit(rows: BuiltRow[], max = 3000): BuiltRow[][] {
  const key = (r: BuiltRow) => `${r.ente_tipo ?? ""}|${r.ente_codigo}|${r.ano}|${r.periodo ?? 0}`;
  const groups = new Map<string, BuiltRow[]>();
  for (const r of rows) (groups.get(key(r)) ?? groups.set(key(r), []).get(key(r))!).push(r);
  const out: BuiltRow[][] = [];
  let cur: BuiltRow[] = [];
  for (const g of groups.values()) {
    if (cur.length > 0 && cur.length + g.length > max) { out.push(cur); cur = []; }
    cur.push(...g);
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Texto do modelo de CSV (cabeçalho canônico + linha de exemplo). */
export function templateCsv(example: Record<ImportFieldKey, string>, delimiter: Delimiter = ";"): string {
  const keys = IMPORT_FIELDS.map((f) => f.key);
  return `${keys.join(delimiter)}\n${keys.map((k) => example[k]).join(delimiter)}\n`;
}
