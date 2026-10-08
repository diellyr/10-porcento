/** Resultado da checagem de versão: há versão nova quando o servidor informa um número diferente do código carregado no navegador. */
export function isUpdateAvailable(running: string, server: unknown): server is string {
  return typeof server === "string" && /^\d+\.\d+\.\d+$/.test(server) && server !== running;
}
