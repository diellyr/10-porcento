/** Erros com duas faces: mensagem segura para o cidadão e detalhe técnico para o admin. */
export type ErrorKind =
  | "SOURCE_UNAVAILABLE" | "SOURCE_DISABLED" | "SOURCE_NOT_CONFIGURED" | "RATE_LIMITED"
  | "BAD_RESPONSE" | "VALIDATION" | "NOT_FOUND" | "FORBIDDEN" | "UNAUTHENTICATED" | "MFA_REQUIRED" | "INTERNAL";

export class AppError extends Error {
  constructor(
    public kind: ErrorKind,
    public technical: string,
    public httpStatus?: number,
  ) {
    super(technical);
    this.name = "AppError";
  }
}

export const PUBLIC_MESSAGES: Record<ErrorKind, string> = {
  SOURCE_UNAVAILABLE: "A fonte oficial está temporariamente indisponível.",
  SOURCE_DISABLED: "Esta fonte não está sendo atualizada no momento.",
  SOURCE_NOT_CONFIGURED: "Esta fonte ainda não foi configurada.",
  RATE_LIMITED: "Muitas consultas em pouco tempo. Tente novamente em instantes.",
  BAD_RESPONSE: "A fonte oficial retornou dados em um formato inesperado.",
  VALIDATION: "A consulta é inválida. Revise os filtros escolhidos.",
  NOT_FOUND: "Não encontramos o que você procurou.",
  FORBIDDEN: "Você não tem permissão para acessar este recurso.",
  UNAUTHENTICATED: "É necessário entrar para continuar.",
  MFA_REQUIRED: "Confirme sua identidade com o segundo fator (MFA) para continuar.",
  INTERNAL: "Algo deu errado do nosso lado. Tente novamente em instantes.",
};

export function publicMessage(err: unknown): string {
  if (err instanceof AppError) return PUBLIC_MESSAGES[err.kind];
  return PUBLIC_MESSAGES.INTERNAL;
}
