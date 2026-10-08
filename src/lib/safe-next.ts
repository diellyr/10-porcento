/** Só aceita redirecionamento para caminhos internos (evita open redirect). */
export const safeNext = (n: string | null) => (n && /^\/(?!\/)[\w\-/]*$/.test(n) ? n : "/admin");
