import { AppError } from "../core/errors";
import type { HttpClient, HttpRequest, HttpResponse, ISourceRegistry } from "../core/interfaces";
import type { SourceRecord } from "../core/types";
import { hashOf } from "../core/normalize";

/** IP privado, loopback, link-local, CGNAT, reservado ou multicast (v4 e v6). */
export function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase();
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIp(mapped[1]!);
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  if (v.includes(":")) return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
  return true; // não é IP reconhecível: trata como inseguro
}

export type HostResolver = (host: string) => Promise<string[]>;
const defaultResolver: HostResolver = async (host) => {
  const { lookup } = await import("node:dns/promises");
  return (await lookup(host, { all: true })).map((r) => r.address);
};

/**
 * Anti-SSRF em tempo de requisição: resolve o host e recusa se QUALQUER endereço for privado (cobre DNS rebinding simples
 * e redirecionamentos para a rede interna). Limitação: ainda há uma janela entre a resolução e a conexão (TOCTOU) —
 * mitigue também com egress filtering na infraestrutura.
 */
export async function assertPublicTarget(url: string, resolve?: HostResolver): Promise<void> {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new AppError("VALIDATION", `Destino não permitido (${u.protocol}); só https`);
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!resolve && !/^[\d.]+$/.test(host) && !host.includes(":")) return; // sem resolvedor (Cloudflare Workers): o próprio runtime recusa destinos privados
  const addrs = /^[\d.]+$/.test(host) || host.includes(":") ? [host] : await resolve!(host).catch(() => { throw new AppError("SOURCE_UNAVAILABLE", `Não foi possível resolver ${host}`); });
  if (!addrs.length || addrs.some(isPrivateIp)) throw new AppError("VALIDATION", `Destino bloqueado (${host} aponta para rede não pública)`);
}

export interface HttpClientDeps {
  source: SourceRecord;
  registry: ISourceRegistry;
  queryType?: string;
  isTest?: boolean;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Valida o destino contra IPs privados. Padrão: ligado quando NÃO há fetch injetado (produção). */
  dnsGuard?: boolean;
  resolveHost?: HostResolver;
}

const RETRYABLE = new Set([429, 502, 503, 504]);
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Remove segredos e documentos (CPF/CNPJ) de URLs antes de logar. */
export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (/key|token|chave|secret|cpf|cnpj/i.test(k)) u.searchParams.set(k, "***");
    return u.toString();
  } catch {
    return "[url inválida]";
  }
}

/** Limitador em memória (janela deslizante de 60 s) — protege rajadas dentro de uma instância. */
const windows = new Map<string, number[]>();
export function resetRateWindows() { windows.clear(); }

async function acquire(slug: string, limit: number, nowFn: () => number, sleep: (ms: number) => Promise<void>) {
  const arr = windows.get(slug) ?? [];
  const cutoff = nowFn() - 60_000;
  while (arr.length && arr[0]! < cutoff) arr.shift();
  if (arr.length >= limit) {
    const wait = Math.max(0, arr[0]! + 60_000 - nowFn());
    if (wait > 2_000) throw new AppError("RATE_LIMITED", `Limite de ${limit} req/min de ${slug} atingido (aguardar ${Math.ceil(wait / 1000)}s)`);
    await sleep(wait);
  }
  arr.push(nowFn());
  windows.set(slug, arr);
}

export function createHttpClient(deps: HttpClientDeps): HttpClient {
  const { source, registry } = deps;
  const doFetch = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;
  const nowFn = deps.now ?? Date.now;
  const timeoutMs = deps.timeoutMs ?? 15_000;
  const maxRetries = deps.maxRetries ?? 2;
  const guard = deps.dnsGuard ?? deps.fetchImpl === undefined;
  // Em Cloudflare Workers não há resolução de DNS própria: o flag `global_fetch_strictly_public` do wrangler.jsonc já bloqueia IPs privados.
  const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
  const resolveHost = deps.resolveHost ?? (onWorkers ? undefined : defaultResolver);

  return {
    async request(req: HttpRequest): Promise<HttpResponse> {
      let attempt = 0;
      for (;;) {
        await acquire(source.slug, source.rateLimitPerMinute, nowFn, sleep);
        const startedAt = new Date(nowFn());
        const t0 = nowFn();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        let status: number | null = null;
        let text = "";
        let netError: string | null = null;
        let retryAfterMs = 0;
        try {
          // Redirecionamentos são seguidos manualmente (máx. 3), revalidando o destino e removendo credenciais ao trocar de origem.
          let target = req.url;
          let hdrs: Record<string, string> = { Accept: "application/json, text/csv, */*", "User-Agent": "BrasilFiscal/0.1 (+dados-abertos)", ...req.headers };
          let res: Response;
          for (let hop = 0; ; hop++) {
            if (guard) await assertPublicTarget(target, resolveHost);
            res = await doFetch(target, { method: req.method ?? "GET", headers: hdrs, signal: ctrl.signal, redirect: "manual" });
            const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
            if (!loc) break;
            if (hop >= 3) throw new AppError("BAD_RESPONSE", `${req.label}: redirecionamentos demais`);
            const nextUrl = new URL(loc, target).toString();
            if (new URL(nextUrl).origin !== new URL(target).origin) hdrs = { Accept: hdrs.Accept!, "User-Agent": hdrs["User-Agent"]! };
            target = nextUrl;
          }
          status = res.status;
          if (req.method === "HEAD") text = "";
          else if (req.encoding || req.maxBytes) {
            const buf = await res.arrayBuffer();
            if (req.maxBytes && buf.byteLength > req.maxBytes) throw new AppError("BAD_RESPONSE", `${req.label}: arquivo de ${(buf.byteLength / 1e6).toFixed(1)} MB excede o limite de ${(req.maxBytes / 1e6).toFixed(0)} MB`);
            text = new TextDecoder(req.encoding ?? "utf-8").decode(buf);
          } else text = await res.text();
          const ra = Number(res.headers.get("retry-after"));
          if (Number.isFinite(ra) && ra > 0) retryAfterMs = Math.min(ra * 1000, 5_000);
        } catch (e) {
          if (e instanceof AppError) throw e;
          netError = ctrl.signal.aborted ? `timeout após ${timeoutMs} ms` : e instanceof Error ? e.message : String(e);
        } finally {
          clearTimeout(timer);
        }
        const latencyMs = nowFn() - t0;
        const ok = status !== null && status >= 200 && status < 400;
        await registry.logRequest({
          sourceId: source.id, queryType: deps.queryType ?? null, endpoint: redactUrl(req.url).slice(0, 500),
          method: req.method ?? "GET", parametersHash: hashOf(req.url).slice(0, 16),
          startedAt, durationMs: latencyMs, httpStatus: status, success: ok,
          errorType: ok ? null : netError ? "NETWORK" : `HTTP_${status}`,
          errorMessage: ok ? null : (netError ?? text.slice(0, 300)), isTest: deps.isTest ?? false,
        }).catch(() => undefined); // log nunca derruba a consulta

        const retryable = netError !== null || (status !== null && RETRYABLE.has(status));
        if (retryable && attempt < maxRetries && !deps.isTest) {
          attempt++;
          await sleep(retryAfterMs || 500 * 2 ** (attempt - 1));
          continue;
        }
        if (netError !== null) throw new AppError("SOURCE_UNAVAILABLE", `${req.label}: ${netError}`);
        return { status: status!, text, latencyMs };
      }
    },
  };
}

/** GET + valida status + parse JSON. Qualquer desvio vira AppError tipado. */
export async function getJson<T = unknown>(http: HttpClient, req: HttpRequest): Promise<T> {
  const res = await http.request(req);
  if (res.status === 429) throw new AppError("RATE_LIMITED", `${req.label}: HTTP 429`, 429);
  if (res.status === 401 || res.status === 403) throw new AppError("SOURCE_NOT_CONFIGURED", `${req.label}: HTTP ${res.status} (credencial ausente ou inválida)`, res.status);
  if (res.status >= 500) throw new AppError("SOURCE_UNAVAILABLE", `${req.label}: HTTP ${res.status}`, res.status);
  if (res.status >= 400) throw new AppError("BAD_RESPONSE", `${req.label}: HTTP ${res.status} ${res.text.slice(0, 200)}`, res.status);
  try {
    return JSON.parse(res.text) as T;
  } catch {
    throw new AppError("BAD_RESPONSE", `${req.label}: resposta não é JSON válido`, res.status);
  }
}

/** Teste de conexão genérico: GET no healthPath e mede latência. */
export async function pingSource(http: HttpClient, url: string, headers?: Record<string, string>) {
  try {
    const res = await http.request({ url, headers, label: "health" });
    const ok = res.status >= 200 && res.status < 400;
    return {
      ok, httpStatus: res.status, latencyMs: res.latencyMs,
      message: ok ? "API disponível" : res.status === 401 || res.status === 403 ? "Credencial ausente ou inválida" : `Falha (HTTP ${res.status})`,
      technical: ok ? undefined : res.text.slice(0, 300),
    };
  } catch (e) {
    return { ok: false, httpStatus: null, latencyMs: 0, message: "Falha de conexão", technical: e instanceof Error ? e.message : String(e) };
  }
}

/** URL de teste de conexão: `config.healthPath` (editável no painel) tem precedência sobre o padrão do adaptador. */
export function healthUrl(source: { baseUrl: string; config: Record<string, unknown> }, defaultPath: string): string {
  const custom = typeof source.config.healthPath === "string" && source.config.healthPath.startsWith("/") ? source.config.healthPath : defaultPath;
  return `${source.baseUrl}${custom}`;
}
