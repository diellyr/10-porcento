"use client";
import Link from "next/link";
import { MAP_COLS, MAP_ROWS, STATE_TILES } from "@/lib/state-map";
import { STATES } from "@/lib/places";

/** Mapa de navegação dos 27 entes (grade de blocos), acessível por teclado e leitor de tela. */
export function StatesMap() {
  const byUf = new Map(STATES.map((s) => [s.uf, s]));
  return (
    <div>
      <ul className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${MAP_COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${MAP_ROWS}, auto)`, maxWidth: 560 }} aria-label="Mapa dos estados brasileiros">
        {Object.entries(STATE_TILES).map(([uf, pos]) => {
          const s = byUf.get(uf)!;
          return (
            <li key={uf} style={{ gridColumn: pos.col + 1, gridRow: pos.row + 1 }}>
              <Link href={`/estados/${uf.toLowerCase()}`} title={s.name} aria-label={s.name} className="flex aspect-square items-center justify-center rounded-lg border border-line bg-surface text-sm font-semibold text-ink-2 shadow-[var(--shadow-card)] transition-colors hover:border-primary hover:bg-primary-50 hover:text-primary sm:text-base">
                {uf}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 max-w-md text-xs text-ink-3">Cada bloco tem o mesmo tamanho: o mapa serve para navegar, não para comparar áreas ou populações.</p>
    </div>
  );
}
