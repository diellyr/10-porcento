"use client";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, AdminApiError } from "./admin-fetch";

export function useAdminData<T>(url: string | null, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; error: AdminApiError | null; loading: boolean }>({ data: null, error: null, loading: !!url });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    adminFetch<T>(url)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e) => alive && setState({ data: null, error: e instanceof AdminApiError ? e : new AdminApiError(String(e)), loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...deps]);
  return { ...state, reload };
}
