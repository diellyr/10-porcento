import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, PUBLIC_MESSAGES, type ErrorKind } from "./core/errors";
import { clientIp, rateLimit } from "./rate-limit";

const STATUS: Record<ErrorKind, number> = {
  VALIDATION: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, MFA_REQUIRED: 403, NOT_FOUND: 404, RATE_LIMITED: 429,
  SOURCE_UNAVAILABLE: 503, SOURCE_DISABLED: 503, SOURCE_NOT_CONFIGURED: 503, BAD_RESPONSE: 502, INTERNAL: 500,
};

export interface ApiOptions {
  /** limite por IP/min (nome do bucket + teto). Omitido = sem limite. */
  rate?: { bucket: string; limit: number };
  /** erros técnicos são anexados somente quando a rota é administrativa */
  admin?: boolean;
}

/**
 * `instanceof ZodError` falha quando o zod é empacotado mais de uma vez (camadas RSC/rotas do Next): o erro de validação
 * virava 500. Reconhecemos também pela forma — nome + lista de issues.
 */
export function isZodError(e: unknown): e is ZodError {
  if (e instanceof ZodError) return true;
  const x = e as { name?: unknown; issues?: unknown } | null;
  return !!x && typeof x === "object" && x.name === "ZodError" && Array.isArray(x.issues);
}

export function errorResponse(e: unknown, admin = false): NextResponse {
  if (isZodError(e)) {
    return NextResponse.json({ error: { code: "VALIDATION", message: PUBLIC_MESSAGES.VALIDATION, issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } }, { status: 400 });
  }
  const err = e instanceof AppError ? e : new AppError("INTERNAL", e instanceof Error ? e.message : String(e));
  if (err.kind === "INTERNAL") console.error("[brasil-fiscal]", err.technical);
  return NextResponse.json(
    { error: { code: err.kind, message: PUBLIC_MESSAGES[err.kind], ...(admin ? { technical: err.technical } : {}) } },
    { status: STATUS[err.kind] },
  );
}

/** Envelope único: rate limit, tratamento de erro padronizado, sem vazar detalhes técnicos. */
export async function handle(req: Request, opts: ApiOptions, fn: () => Promise<Response | NextResponse | unknown>): Promise<Response> {
  try {
    if (opts.rate) {
      const r = await rateLimit(`${opts.rate.bucket}:${clientIp(req.headers)}`, opts.rate.limit);
      if (!r.ok) {
        const res = errorResponse(new AppError("RATE_LIMITED", "limite por IP"));
        res.headers.set("Retry-After", String(r.retryAfter));
        return res;
      }
    }
    const out = await fn();
    return out instanceof Response ? out : NextResponse.json(out);
  } catch (e) {
    return errorResponse(e, opts.admin);
  }
}

/** Cache de CDN só para respostas completas; nada de cachear estados degradados. */
export function cacheable(body: unknown, ok: boolean, sMaxAge = 300): NextResponse {
  const res = NextResponse.json(body);
  res.headers.set("Cache-Control", ok ? `public, s-maxage=${sMaxAge}, stale-while-revalidate=3600` : "no-store");
  return res;
}

export const intParam = (sp: URLSearchParams, k: string): number | undefined => {
  const v = sp.get(k);
  return v === null || v === "" ? undefined : Number(v);
};
export const strParam = (sp: URLSearchParams, k: string): string | undefined => sp.get(k) || undefined;

import { requireAdmin, type SessionUser } from "./auth";

/** Rotas administrativas: exige sessão válida + papel admin vindo do banco; erros incluem detalhe técnico. */
export async function adminHandle(req: Request, fn: (actor: SessionUser) => Promise<unknown>, rateLimitPerMin = 120): Promise<Response> {
  return handle(req, { admin: true, rate: { bucket: `admin:${new URL(req.url).pathname}`, limit: rateLimitPerMin } }, async () => {
    const actor = await requireAdmin();
    const out = await fn(actor);
    if (out instanceof Response) return out;
    const res = NextResponse.json(out);
    res.headers.set("Cache-Control", "no-store");
    return res;
  });
}

/** Mutações exigem same-origin (defesa extra contra CSRF além do SameSite dos cookies). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && new URL(origin).host !== host) throw new AppError("FORBIDDEN", `origem ${origin} diferente de ${host}`);
}
