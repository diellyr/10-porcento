/**
 * DCA-Anexo I-E no formato REAL da API do SICONFI.
 * ORIGEM: as duas primeiras linhas de cada coluna (cabeçalho "Despesas Exceto Intraorçamentárias" e "01 - Legislativa") foram
 * copiadas do erro real exibido no painel (08/10/2026, 820 linhas recebidas): colunas = Despesas Empenhadas; Despesas Liquidadas;
 * Despesas Pagas; Inscrição de Restos a Pagar Não Processados; Inscrição de Restos a Pagar Processados — rótulo único
 * "Total Geral da Despesa por Função" — `cod_conta` = "TotalDespesas" em todas as linhas e a função/subfunção no campo `conta`.
 * As demais linhas COMPLETAM esse layout (subfunções "01.031 - …", "Demais Subfunções", bloco intraorçamentário, totais) e NÃO
 * são cópia da API: devem ser substituídas por uma resposta completa assim que houver uma (veja docs/DATA_SOURCES.md).
 */
export const IE_COLUNAS = [
  "Despesas Empenhadas", "Despesas Liquidadas", "Despesas Pagas",
  "Inscrição de Restos a Pagar Não Processados", "Inscrição de Restos a Pagar Processados",
] as const;

const ROTULO = "Total Geral da Despesa por Função";
const base = (coluna: string, conta: string, valor: number) => ({ exercicio: 2024, anexo: "DCA-Anexo I-E", rotulo: ROTULO, coluna, cod_conta: "TotalDespesas", conta, valor, cod_ibge: 3541406 });

/** valor de cada linha, por coluna (índice 0..4) — facilita conferir no teste */
export const IE_VALORES: Record<string, number[]> = {
  "01 - Legislativa": [1000, 900, 800, 7, 6],
  "01.031 - Ação Legislativa": [600, 500, 450, 3, 2],
  "Demais Subfunções (01)": [400, 400, 350, 4, 4],
  "10 - Saúde": [5000, 4500, 4000, 20, 10],
  "10.301 - Atenção Básica": [2000, 1800, 1700, 5, 5],
  "12 - Educação": [3000, 2800, 2600, 15, 9],
};
/** bloco intraorçamentário (valores pequenos): NÃO pode somar ao bloco "exceto intra" */
export const IE_INTRA: Record<string, number[]> = { "10 - Saúde": [50, 40, 30, 1, 1] };

export function ieReal() {
  const rows: Array<ReturnType<typeof base>> = [];
  IE_COLUNAS.forEach((col, i) => {
    rows.push(base(col, "Despesas Exceto Intraorçamentárias", 9000 + i)); // totalizador do bloco (real)
    for (const [conta, v] of Object.entries(IE_VALORES)) rows.push(base(col, conta.startsWith("Demais") ? "Demais Subfunções" : conta, v[i]!));
    rows.push(base(col, "Despesas Intraorçamentárias", 51 + i)); // cabeçalho/total do bloco intra
    for (const [conta, v] of Object.entries(IE_INTRA)) rows.push(base(col, conta, v[i]!));
    rows.push(base(col, "Total Geral da Despesa por Função", 9051 + i));
  });
  return rows;
}
