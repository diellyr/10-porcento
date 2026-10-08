import { csvCell } from "./explorer-spec";

/** Monta um CSV (separador ";", BOM UTF-8 para o Excel, células protegidas contra injeção de fórmulas) com rodapé de fonte. */
export function buildCsv(header: string[], rows: Array<Array<string | number | null>>, sourceLines: string[] = []): string {
  const body = [header.map(csvCell).join(";"), ...rows.map((r) => r.map(csvCell).join(";"))];
  return `﻿${[...body, ...sourceLines.map((l) => `# ${l.replace(/[\r\n]+/g, " ")}`)].join("\n")}\n`;
}

export function downloadCsv(filename: string, csv: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
