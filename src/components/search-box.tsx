"use client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { PlaceDTO } from "@/lib/dto";
import { placeHref, placeKindLabel, placeLabel } from "@/lib/places";
import { useDebounced, useJson } from "@/lib/use-json";

/** Busca global: município, estado (órgão, programa e fornecedor entram quando esses dados forem integrados). */
export function SearchBox({ size = "md", autoFocus = false, onPick, places = false }: { size?: "md" | "lg"; autoFocus?: boolean; onPick?: (p: PlaceDTO) => void; /** só estados e municípios (usado por seletores de local) */ places?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const dq = useDebounced(q.trim(), 250);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const { data, loading, error } = useJson<{ results: PlaceDTO[] }>(dq.length >= 2 ? `/api/v1/search?q=${encodeURIComponent(dq)}${places ? "" : "&types=all"}` : null);
  const results = data?.results ?? [];

  useEffect(() => { setActive(0); }, [dq]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (p: PlaceDTO) => { setOpen(false); setQ(""); onPick ? onPick(p) : router.push(placeHref(p)); };
  const big = size === "lg";

  return (
    <div ref={box} className="relative w-full">
      <label htmlFor={`${listId}-in`} className="sr-only">Pesquisar município, estado, órgão, programa ou fornecedor</label>
      <input
        id={`${listId}-in`}
        autoFocus={autoFocus}
        type="search"
        role="combobox"
        aria-expanded={open && q.length >= 2}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={q}
        placeholder={big ? "Digite sua cidade…" : "Pesquisar município, estado, órgão, programa ou fornecedor…"}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); if (results[active]) pick(results[active]); else if (q.trim().length >= 3) router.push(`/perguntar?q=${encodeURIComponent(q.trim())}`); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className={`w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-ink shadow-[var(--shadow-card)] placeholder:text-ink-3 focus:border-primary ${big ? "h-14 text-lg" : "h-10 text-sm"}`}
      />
      <svg aria-hidden className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 ${big ? "size-5" : "size-4"}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" strokeLinecap="round" /></svg>
      {open && dq.length >= 2 && (
        <ul id={listId} role="listbox" className="absolute z-40 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-xl">
          {loading && <li className="px-3 py-2 text-sm text-ink-3">Buscando…</li>}
          {!loading && error && <li className="px-3 py-2 text-sm text-ink-3">{error}</li>}
          {!loading && !error && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-ink-3">Nenhum local encontrado. <a className="text-primary underline underline-offset-2" href={`/perguntar?q=${encodeURIComponent(dq)}`}>Pergunte ao Brasil Fiscal</a></li>
          )}
          {results.map((p, i) => (
            <li key={p.type + p.code} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => pick(p)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-primary-50" : ""}`}>
                <span className="font-medium text-ink">{placeLabel(p)}</span>
                <span className="text-xs text-ink-3">{placeKindLabel(p.type)}{p.population ? ` · ${p.population.toLocaleString("pt-BR")} hab.` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
