/**
 * Rate limit por IP/chave.
 *  • Padrão: memória (por instância) — protege contra rajadas casuais.
 *  • Global: com UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN usa Redis (Upstash REST, sem dependência extra),
 *    contador compartilhado entre todas as instâncias. Se o Redis falhar, cai para memória (fail-open, com aviso no log)
 *    — indisponibilidade do limitador não pode derrubar o site.
 */
export interface LimitResult { ok: boolean; retryAfter: number }

const buckets = new Map<string, { count: number; reset: number }>();

/** Janela fixa em memória. `now` injetável para testes. */
export function rateLimitMemory(key: string, limit: number, windowMs = 60_000, now = Date.now()): LimitResult {
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return b.count > limit ? { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) } : { ok: true, retryAfter: 0 };
}

export interface UpstashConfig { url: string; token: string; fetchImpl?: typeof fetch; timeoutMs?: number }

export async function rateLimitUpstash(cfg: UpstashConfig, key: string, limit: number, windowMs: number): Promise<LimitResult> {
  const doFetch = cfg.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 800);
  try {
    const res = await doFetch(`${cfg.url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST", signal: ctrl.signal,
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", `bf:rl:${key}`], ["PEXPIRE", `bf:rl:${key}`, windowMs, "NX"], ["PTTL", `bf:rl:${key}`]]),
    });
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    const out = (await res.json()) as Array<{ result?: number; error?: string }>;
    if (!Array.isArray(out) || out[0]?.error || typeof out[0]?.result !== "number") throw new Error("resposta inesperada do Upstash");
    const count = out[0].result;
    const pttl = typeof out[2]?.result === "number" && out[2].result > 0 ? out[2].result : windowMs;
    return count > limit ? { ok: false, retryAfter: Math.ceil(pttl / 1000) } : { ok: true, retryAfter: 0 };
  } finally {
    clearTimeout(timer);
  }
}

let warnedAt = 0;
export async function rateLimit(key: string, limit: number, windowMs = 60_000, env: Record<string, string | undefined> = process.env, fetchImpl?: typeof fetch): Promise<LimitResult> {
  const url = env.UPSTASH_REDIS_REST_URL, token = env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try { return await rateLimitUpstash({ url, token, fetchImpl }, key, limit, windowMs); }
    catch (e) {
      if (Date.now() - warnedAt > 60_000) { warnedAt = Date.now(); console.warn("[brasil-fiscal] rate limit global indisponível; usando memória:", e instanceof Error ? e.message : e); }
    }
  }
  return rateLimitMemory(key, limit, windowMs);
}

// Atrás da Cloudflare, `cf-connecting-ip` é definido pela borda e não pode ser forjado pelo visitante.
export const clientIp = (h: Headers) => (h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
export function resetRateLimits() { buckets.clear(); }
