/** Só aceita redirecionamento para caminhos internos do jogo (evita open redirect). */
export const safeNextGame = (n: string | null): string => (n && /^\/(?!\/)[\w\-/]*(\?[\w=&\-]*)?$/.test(n) && /^\/(jogo|perfil|elenco)(\/|\?|$)/.test(n) ? n : "/jogo");
