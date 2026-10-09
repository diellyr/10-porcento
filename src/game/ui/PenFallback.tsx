"use client";
import { useEffect } from "react";
import type { PenGesture } from "../engine/types";

/** Alternativa 2D equivalente da cena da caneta (mesmos gestos e mesmo resultado), para aparelhos sem 3D ou com "reduzir movimento". */
export function PenFallback({ gesto, papel, nome, reduzir, onDone }: { gesto: PenGesture; papel: string; nome: string; reduzir: boolean; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, reduzir ? 300 : 3600); return () => clearTimeout(t); }, [onDone, reduzir]);
  const dur = reduzir ? "0.01s" : "2.6s";
  return (
    <div className="grid h-full place-items-center bg-gradient-to-b from-[#3a4a7a] to-[#1b2340] p-4">
      <svg viewBox="0 0 800 450" className="max-h-full w-full max-w-3xl" role="img" aria-label={`Documento: ${papel}`}>
        <rect x="60" y="300" width="680" height="120" rx="16" fill="#8a5528" /><rect x="60" y="300" width="680" height="14" rx="7" fill="#b9773d" />
        <g transform="rotate(-2 400 220)"><rect x="190" y="40" width="420" height="300" rx="6" fill="#fffdf8" stroke="#e1d2b0" strokeWidth="3" />
          <text x="400" y="86" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="17" fill="#1b2340">{papel.split(" — ")[0]}</text>
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="226" y={112 + i * 22} width={i === 4 ? 150 : 348} height="6" rx="3" fill="#cfc3a2" />)}
          {gesto !== "recusar" && <path d="M250,300 q20,-30 40,0 t40,0 t40,-10 l40,6" stroke="#1a46d4" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="400" strokeDashoffset="400"><animate attributeName="stroke-dashoffset" from="400" to="0" dur={dur} fill="freeze" begin="0.5s" /></path>}
          {gesto === "recusar" && <g stroke="#e5484d" strokeWidth="8" strokeLinecap="round"><path d="M240,130 L560,300"><animate attributeName="opacity" from="0" to="1" dur={dur} fill="freeze" /></path></g>}
          {gesto === "esclarecer" && <text x="520" y="260" fontFamily="var(--g-display)" fontWeight="700" fontSize="80" fill="#1a46d4" opacity="0"><animate attributeName="opacity" from="0" to="1" dur={dur} fill="freeze" begin="0.4s" />?</text>}
          {gesto === "parecer" && <g transform="rotate(-8 500 250)" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" begin="1.9s" /><rect x="410" y="228" width="170" height="46" rx="8" fill="none" stroke="#1a46d4" strokeWidth="5" /><text x="495" y="262" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="800" fontSize="28" fill="#1a46d4">PARECER</text></g>}
        </g>
        <g><animateTransform attributeName="transform" type="translate" values="520 330; 350 250; 400 280; 350 250" dur={dur} fill="freeze" /><rect x="0" y="-8" width="150" height="16" rx="8" fill="#2a5be0" transform="rotate(-35)" /><circle cx="-8" cy="6" r="6" fill="#1b2340" /></g>
        <text x="400" y="440" textAnchor="middle" fontFamily="var(--g-display)" fontSize="14" fill="#fff" opacity="0.85">{nome}</text>
      </svg>
    </div>
  );
}
