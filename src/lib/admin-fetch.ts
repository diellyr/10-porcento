"use client";

export class AdminApiError extends Error {
  constructor(message: string, public technical?: string, public status?: number) { super(message); }
}

/** fetch para /api/admin: lança AdminApiError com a mensagem pública e, para admins, o detalhe técnico. */
export async function adminFetch<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const r = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new AdminApiError(body?.error?.message ?? "Erro na requisição", body?.error?.technical, r.status);
  return body as T;
}
