"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function YearSelect({ year, minYear = 2010 }: { year: number; minYear?: number }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const last = new Date().getFullYear() - 1;
  const years = Array.from({ length: last - minYear + 1 }, (_, i) => last - i);
  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-2">
      Ano
      <select
        className="h-10 rounded-lg border border-line bg-surface px-3 text-sm"
        value={year}
        onChange={(e) => { const q = new URLSearchParams(sp.toString()); q.set("ano", e.target.value); router.push(`${path}?${q}`, { scroll: false }); }}
      >
        {years.map((y) => <option key={y}>{y}</option>)}
      </select>
    </label>
  );
}
