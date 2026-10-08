/** fetch falso programável para testes de adaptadores/router. Nenhum acesso à rede. */
export interface FakeRoute { match: RegExp; status?: number; body?: unknown | ((url: string) => unknown); text?: string; throws?: string; headers?: Record<string, string> }

export function fakeFetch(routes: FakeRoute[]) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const r = routes.find((x) => x.match.test(url));
    if (!r) return new Response("not found", { status: 404 });
    if (r.throws) throw new Error(r.throws);
    const body = typeof r.body === "function" ? (r.body as (u: string) => unknown)(url) : r.body;
    return new Response(r.text ?? JSON.stringify(body ?? {}), { status: r.status ?? 200, headers: r.headers });
  }) as typeof fetch;
  return { impl, calls };
}
