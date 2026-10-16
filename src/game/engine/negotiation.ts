import type { NegotiationDef } from "../content/types";

/** Padrões de tentativa de manipular o sistema pelo texto. Não concedem nada — zeram a pontuação desta fala. */
const INJECTION = /(ignor(e|ar|em)\s+(as\s+|todas\s+as\s+)?(regras|instru)|administrador\s+do\s+sistema|modo\s+(desenvolvedor|admin)|system\s*prompt|jailbreak|aumente?\s+o\s+teto|zerar?\s+o\s+hist)/i;

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export interface ArgumentScore { pontos: number; ok: string[]; suspeito: boolean }

/**
 * A rubrica é VISÍVEL ao jogador e calculada pelo motor (determinística). A IA, quando existe, só redige a resposta em
 * personagem: ela nunca produz nem altera estes pontos.
 */
export function scoreArgument(neg: NegotiationDef, texto: string): ArgumentScore {
  if (INJECTION.test(texto)) return { pontos: 0, ok: [], suspeito: true };
  const t = norm(texto);
  const ok: string[] = [];
  for (const c of neg.criterios) {
    const passa = c.palavras.every((grupo) => grupo.some((p) => t.includes(norm(p))));
    if (passa) ok.push(c.id);
  }
  return { pontos: ok.length, ok, suspeito: false };
}

export const nivelResposta = (pontos: number): "fraca" | "media" | "forte" => (pontos >= 3 ? "forte" : pontos === 2 ? "media" : "fraca");
