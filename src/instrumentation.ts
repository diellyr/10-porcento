/**
 * Roda UMA vez quando o servidor Node inicia — fora de qualquer renderização.
 * Pré-aquece o contêiner, registra as fontes no Source Registry e carrega o cadastro de entes (5.570 municípios),
 * em segundo plano. Motivos:
 *  • a primeira pessoa a abrir o site não paga a carga do cadastro;
 *  • em desenvolvimento, carregar milhares de itens DENTRO de um Server Component travava o servidor
 *    (o React dev serializa valores aguardados durante a renderização).
 * Falhas aqui são ignoradas: o cadastro continua sendo carregado sob demanda se necessário.
 */
export async function register() {
  // O import é condicional ao runtime para o bundle Edge não tentar incluir módulos do Node (crypto, etc.).
  if (process.env.NEXT_RUNTIME === "nodejs") await (await import("./instrumentation-node")).warmUp();
}
