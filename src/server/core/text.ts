// Utilitário de texto SEM dependências de Node: pode ser importado também por componentes de navegador.

/** minúsculas, sem acento, sem pontuação, espaços colapsados. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
