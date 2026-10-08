import { z } from "zod";
import { onlyDigits } from "./normalize";

/** Contrato público normalizado (já sem qualquer dado de pessoa física). */
export interface ContractRecord {
  /** id do contrato na fonte */
  id: string;
  number: string | null;
  object: string | null;
  supplierCnpj: string;
  supplierName: string;
  agencyCode: string;
  agencyName: string;
  startDate: string | null;   // ISO (yyyy-mm-dd)
  endDate: string | null;
  year: number;               // ano do início da vigência
  initialValue: number | null;
  finalValue: number | null;
  /** valor exibido: final (inclui aditivos) quando existir, senão o inicial */
  value: number;
  modality: string | null;
}

/** CNPJ válido pelos dígitos verificadores (rejeita sequências repetidas). */
export function isValidCnpj(raw: string): boolean {
  const d = onlyDigits(raw);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) { sum += Number(d[len - i]) * pos--; if (pos < 2) pos = 9; }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export const isCpfLike = (raw: string) => onlyDigits(raw).length === 11;

export const ContractQuerySchema = z
  .object({
    cnpj: z.string().max(24).optional(),
    agency: z.string().regex(/^\d{1,8}$/, "código de órgão inválido").optional(),
    year: z.coerce.number().int().min(2000).max(new Date().getUTCFullYear() + 1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.coerce.number().int().positive().optional(),
  })
  .superRefine((q, ctx) => {
    if (q.cnpj !== undefined) {
      if (isCpfLike(q.cnpj)) ctx.addIssue({ code: "custom", path: ["cnpj"], message: "Por privacidade (LGPD), só consultamos empresas (CNPJ). CPF não é aceito." });
      else if (!isValidCnpj(q.cnpj)) ctx.addIssue({ code: "custom", path: ["cnpj"], message: "CNPJ inválido" });
    }
    if (q.cnpj === undefined && q.agency === undefined) ctx.addIssue({ code: "custom", message: "Informe um CNPJ ou um órgão." });
    if (q.cnpj !== undefined && q.agency !== undefined) ctx.addIssue({ code: "custom", message: "Use CNPJ ou órgão, não os dois." });
    if (q.agency !== undefined && q.year === undefined) ctx.addIssue({ code: "custom", path: ["year"], message: "Para consultar por órgão, informe o ano." });
  });

export type ContractQueryInput = z.infer<typeof ContractQuerySchema>;

/** Consulta normalizada enviada às fontes (sem paginação de leitura). */
export type ContractFetchQuery = { by: "supplier"; cnpj: string } | { by: "agency"; agency: string; year: number };

export const toFetchQuery = (q: ContractQueryInput): ContractFetchQuery =>
  q.cnpj !== undefined ? { by: "supplier", cnpj: onlyDigits(q.cnpj) } : { by: "agency", agency: q.agency!, year: q.year! };

export interface StoredContract {
  factId: number;
  code: string;
  number: string | null;
  object: string | null;
  supplierCnpj: string;
  supplierName: string;
  agencyCode: string | null;
  agencyName: string | null;
  year: number;
  startDate: string | null;
  endDate: string | null;
  initialValue: number | null;
  finalValue: number | null;
  value: number;
  modality: string | null;
  fetchedAt: string;
  sourceSlug: string;
}
