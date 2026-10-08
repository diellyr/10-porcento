"use client";
import { useId, useState } from "react";
import { GLOSSARY } from "@/server/core/catalog-info";

/** Ajuda contextual: botão "?" acessível (teclado e toque) que explica um termo em linguagem simples. */
export function Help({ term, label }: { term: keyof typeof GLOSSARY | string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const entry = GLOSSARY[term];
  if (!entry) return null;
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label ?? `O que é ${entry.term}?`}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="ml-1 inline-flex size-[18px] items-center justify-center rounded-full border border-line bg-surface-2 text-[11px] font-semibold text-ink-2 hover:border-primary hover:text-primary"
      >
        ?
      </button>
      {open && (
        <span id={id} role="tooltip" className="absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl border border-line bg-surface p-3 text-left text-[13px] font-normal leading-snug text-ink shadow-lg">
          <strong className="mb-1 block font-semibold">{entry.term}</strong>
          {entry.text}
        </span>
      )}
    </span>
  );
}
