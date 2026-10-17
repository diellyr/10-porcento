"use client";
import { LOCATIONS } from "@/game/content/locations";
import type { LocationId } from "@/game/engine/types";

export interface MapPin { novo: number; objetivo: boolean }

const ROOM_COLOR: Record<LocationId, [string, string]> = {
  recepcao: ["#ffe0a6", "#f2b54f"], farmacia: ["#cdf3e3", "#6fcfae"], enfermagem: ["#d4e8ff", "#7fb2ee"], administracao: ["#ffd9b8", "#f29a4a"], cofre: ["#d6e4dc", "#6f9a86"], patio: ["#e4ecd4", "#9bc27a"],
  secretaria: ["#e6dfc8", "#b9a67c"], planejamento: ["#d6e3f5", "#8fa9cf"], prefeitura: ["#eed3a6", "#c98f55"], camara: ["#ddd0e8", "#8d72bf"], ubs: ["#cfeedd", "#6fcfae"],
};

/** Mapa da UPA: planta ilustrada com os locais investigáveis. Os botões são HTML (teclado/toque) sobre o desenho. */
export function UpaMap({ atual, pins, onSelect, nome, locais }: { atual: LocationId; pins: Partial<Record<LocationId, MapPin>>; onSelect: (l: LocationId) => void; nome: string; locais?: readonly LocationId[] }) {
  const ids = (locais ?? (Object.keys(LOCATIONS) as LocationId[]).filter((k) => !["secretaria", "planejamento", "prefeitura", "camara", "ubs"].includes(k))) as LocationId[];
  return (
    <div className="relative w-full" style={{ aspectRatio: "1000 / 620" }}>
      <svg viewBox="0 0 1000 620" className="absolute inset-0 h-full w-full" role="img" aria-label={`Planta de ${nome}`}>
        <defs>
          <linearGradient id="mp-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dff0c8" /><stop offset="1" stopColor="#bfe0a0" /></linearGradient>
          <filter id="mp-sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#1b2340" floodOpacity="0.2" /></filter>
          {(Object.keys(ROOM_COLOR) as LocationId[]).map((k) => <linearGradient key={k} id={`mp-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ROOM_COLOR[k][0]} /><stop offset="1" stopColor={ROOM_COLOR[k][1]} /></linearGradient>)}
        </defs>
        <rect width="1000" height="620" rx="26" fill="url(#mp-grass)" />
        <rect x="0" y="574" width="1000" height="46" fill="#9da4a8" /><rect x="40" y="594" width="80" height="6" rx="3" fill="#fff" opacity="0.7" /><rect x="220" y="594" width="80" height="6" rx="3" fill="#fff" opacity="0.7" /><rect x="400" y="594" width="80" height="6" rx="3" fill="#fff" opacity="0.7" /><rect x="580" y="594" width="80" height="6" rx="3" fill="#fff" opacity="0.7" />
        {/* corredores */}
        <rect x="30" y="296" width="940" height="30" rx="10" fill="#fff8e6" opacity="0.9" />
        {[[900, 120], [980, 520], [350, 590], [640, 590]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="22" fill="#4aa56a" /><circle cx={(x as number) - 10} cy={(y as number) - 8} r="14" fill="#6cc487" /></g>)}
        {ids.map((k) => {
          const m = LOCATIONS[k].mapa;
          return (
            <g key={k} filter="url(#mp-sh)">
              <rect x={m.x} y={m.y} width={m.w} height={m.h} rx="22" fill={`url(#mp-${k})`} stroke={atual === k ? "#1a46d4" : "#fff"} strokeWidth={atual === k ? 6 : 4} />
              <text x={m.x + m.w / 2} y={m.y + m.h - 18} textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="24" fill="#1b2340">{LOCATIONS[k].curto}</text>
            </g>
          );
        })}
        <text x="500" y="318" textAnchor="middle" fontFamily="var(--g-display)" fontSize="15" fill="#8a7a58" letterSpacing="6">CORREDOR</text>
        <text x="500" y="607" textAnchor="middle" fontFamily="var(--g-display)" fontSize="14" fill="#fff" letterSpacing="4">RUA DA ESPERANÇA</text>
      </svg>
      {ids.map((k) => {
        const m = LOCATIONS[k].mapa; const pin = pins[k] ?? { novo: 0, objetivo: false };
        return (
          <button key={k} type="button" onClick={() => onSelect(k)} aria-label={`${LOCATIONS[k].nome}${atual === k ? " (você está aqui)" : ""}${pin.objetivo ? ", objetivo atual" : ""}${pin.novo ? `, ${pin.novo} novidade(s)` : ""}`}
            className="absolute flex items-start justify-center rounded-[22px] border-0 bg-transparent p-0 outline-offset-2 hover:bg-white/20 focus-visible:bg-white/25"
            style={{ left: `${m.x / 10}%`, top: `${(m.y / 620) * 100}%`, width: `${m.w / 10}%`, height: `${(m.h / 620) * 100}%` }}>
            {atual === k && <span className="mt-2 rounded-full bg-[color:var(--g-blue)] px-2.5 py-0.5 text-xs font-bold text-white">Você está aqui</span>}
            {pin.novo > 0 && (
              <span className="absolute right-2 top-2 grid size-9 place-items-center rounded-full border-[3px] border-white bg-[color:var(--g-orange)] text-base font-extrabold text-white shadow-lg" style={{ fontFamily: "var(--g-display)" }}>
                {pin.novo}
                <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-[color:var(--g-orange)]" style={{ animation: "g-ring 1.8s infinite" }} />
              </span>
            )}
            {pin.objetivo && <span className="absolute left-2 top-2 rounded-full bg-[color:var(--g-yellow)] px-2 py-0.5 text-xs font-extrabold text-[color:var(--g-ink)]">📍 Caso</span>}
          </button>
        );
      })}
    </div>
  );
}
