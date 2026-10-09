/**
 * Cabeçalhos de segurança. A CSP bloqueia scripts/frames/objetos de outras origens e clickjacking.
 * Observação honesta: o Next.js injeta scripts inline na hidratação; sem nonce por requisição (que exigiria renderizar
 * TODAS as páginas dinamicamente) é preciso `'unsafe-inline'` em script-src. Mesmo assim, origens externas ficam bloqueadas.
 */
export interface HeaderEnv { production: boolean; supabaseUrl?: string }

export function buildCsp(env: HeaderEnv): string {
  let supabaseOrigin = "";
  let supabaseWs = "";
  try {
    if (env.supabaseUrl) { const u = new URL(env.supabaseUrl); supabaseOrigin = u.origin; supabaseWs = `wss://${u.host}`; }
  } catch { /* URL inválida: ignora */ }
  const connect = ["'self'", supabaseOrigin, supabaseWs, ...(env.production ? [] : ["ws:", "http://localhost:*"])].filter(Boolean);
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(env.production ? [] : ["'unsafe-eval'"])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": connect,
    "media-src": ["'self'", "blob:", "data:"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(env.production ? { "upgrade-insecure-requests": [] } : {}),
  };
  return Object.entries(directives).map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k)).join("; ");
}

export function securityHeaders(env: HeaderEnv): Array<{ key: string; value: string }> {
  return [
    { key: "Content-Security-Policy", value: buildCsp(env) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ...(env.production ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
  ];
}
