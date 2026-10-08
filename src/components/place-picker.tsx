"use client";
import { useState } from "react";
import type { PlaceDTO } from "@/lib/dto";
import { STATES, placeLabel } from "@/lib/places";
import { SearchBox } from "./search-box";

export interface PlaceValue { type: "COUNTRY" | "STATE" | "MUNICIPALITY"; code: string; name: string; uf: string | null }
export const BRASIL: PlaceValue = { type: "COUNTRY", code: "1", name: "Brasil", uf: null };

/** Esfera (União/Estado/Município) + local. Estados vêm de lista fixa oficial; municípios, da busca. */
export function PlacePicker({ value, onChange, allow = ["COUNTRY", "STATE", "MUNICIPALITY"] }: { value: PlaceValue; onChange: (v: PlaceValue) => void; allow?: PlaceValue["type"][] }) {
  const [searching, setSearching] = useState(false);
  const labels = { COUNTRY: "Brasil (União)", STATE: "Estado", MUNICIPALITY: "Município" } as const;
  const sel = "h-10 rounded-lg border border-line bg-surface px-3 text-sm";
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="mb-1 block text-ink-3">Esfera</span>
        <select
          className={sel}
          value={value.type}
          onChange={(e) => {
            const t = e.target.value as PlaceValue["type"];
            if (t === "COUNTRY") onChange(BRASIL);
            else if (t === "STATE") onChange({ type: "STATE", code: "35", name: "São Paulo", uf: "SP" });
            else { onChange({ type: "MUNICIPALITY", code: "3541406", name: "Praia Grande", uf: "SP" }); }
            setSearching(false);
          }}
        >
          {allow.map((t) => <option key={t} value={t}>{labels[t]}</option>)}
        </select>
      </label>
      {value.type === "STATE" && (
        <label className="text-sm">
          <span className="mb-1 block text-ink-3">Estado</span>
          <select className={sel} value={value.code} onChange={(e) => { const s = STATES.find((x) => x.code === e.target.value)!; onChange({ type: "STATE", code: s.code, name: s.name, uf: s.uf }); }}>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </label>
      )}
      {value.type === "MUNICIPALITY" && (
        <div className="min-w-64 flex-1 text-sm">
          <span className="mb-1 block text-ink-3">Município</span>
          {searching ? (
            <SearchBox autoFocus places onPick={(p: PlaceDTO) => { if (p.type === "MUNICIPALITY") { onChange({ type: "MUNICIPALITY", code: p.code, name: p.name, uf: p.uf }); setSearching(false); } else { onChange({ type: "STATE", code: p.code, name: p.name, uf: p.uf }); setSearching(false); } }} />
          ) : (
            <button type="button" onClick={() => setSearching(true)} className={`${sel} w-full text-left`}>{placeLabel(value)} <span className="text-ink-3">· alterar</span></button>
          )}
        </div>
      )}
    </div>
  );
}
