/**
 * Roda UMA vez quando o servidor Node inicia — fora de qualquer renderização.
 * Pré-aquece o contêiner, registra as fontes no Source Registry e carrega o cadastro de entes (5.570 municípios),
 * em segundo plano. Motivos:
 *  • a primeira pessoa a abrir o site não paga a carga do cadastro;
 *  • em desenvolvimento, carregar milhares de itens DENTRO de um Server Component travava o servidor
 *    (o React dev serializa valores aguardados durante a renderização).
 * Falhas aqui são ignoradas: o cadastro continua sendo carregado sob demanda se necessário.
 */
export async function warmUp() {
  try {
    const { container } = await import("./server/container");
    const c = container();
    await c.router.ensureRegistry();
    void c.router.catalog.ensure().catch((e) => console.warn("[brasil-fiscal] pré-carga do cadastro adiada:", e instanceof Error ? e.message : e));
  } catch (e) {
    console.warn("[brasil-fiscal] pré-aquecimento ignorado:", e instanceof Error ? e.message : e);
  }
}
