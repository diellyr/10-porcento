"use client";
import { useEffect, useState } from "react";
import type { ApiError } from "./dto";

export interface JsonState<T> { data: T | null; error: string | null; loading: boolean }

/** Busca JSON da Brasil Fiscal API. Cancela requisições obsoletas; mensagens de erro são as públicas da API. */
export function useJson<T>(url: string | null): JsonState<T> {
  const [state, setState] = useState<JsonState<T>>({ data: null, error: null, loading: !!url });
  useEffect(() => {
    if (!url) { setState({ data: null, error: null, loading: false }); return; }
    const ctrl = new AbortController();
    setState((s) => ({ data: s.data, error: null, loading: true }));
    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        const body = (await r.json().catch(() => null)) as (T & Partial<ApiError>) | null;
        if (!r.ok) throw new Error(body?.error?.message ?? "Não foi possível carregar os dados.");
        setState({ data: body as T, error: null, loading: false });
      })
      .catch((e) => { if (e.name !== "AbortError") setState({ data: null, error: e.message, loading: false }); });
    return () => ctrl.abort();
  }, [url]);
  return state;
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
