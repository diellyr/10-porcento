"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LOCATIONS } from "@/game/content/locations";
import { LocationScene } from "@/game/ui/art/Scenes";
import { UpaMap } from "@/game/ui/art/UpaMap";
import type { CharId, LocationId } from "@/game/engine/types";

const world = { filaNivel: 3, estoqueNivel: 1, luxoNivel: 0, degradacao: 1, melhoria: 0, equipeNivel: 1, obraConcluida: false };
const P: Record<string, Record<string, CharId>> = {
  recepcao: { celia: "celia" }, farmacia: { roberto: "roberto" }, enfermagem: { joana: "joana" }, administracao: { toninho: "toninho", juninho: "juninho" }, cofre: { guardiao: "guardiao" }, patio: { cornelio: "cornelio" },
};
function G() {
  const sp = useSearchParams(); const only = sp.get("l"); const lux = Number(sp.get("lux") ?? 0); const bom = sp.get("bom") === "1";
  const w = { ...world, luxoNivel: lux, ...(bom ? { filaNivel: 0, estoqueNivel: 3, melhoria: 2, degradacao: 0, equipeNivel: 2, obraConcluida: true } : {}) };
  if (sp.get("mapa")) return <div className="mx-auto max-w-[1200px] p-4" id="mapa"><UpaMap atual="farmacia" nome="UPA 24h Dona Esperança" onSelect={() => undefined} pins={{ recepcao: { novo: 0, objetivo: false }, farmacia: { novo: 3, objetivo: true }, enfermagem: { novo: 1, objetivo: false }, administracao: { novo: 2, objetivo: false }, cofre: { novo: 0, objetivo: false }, patio: { novo: 0, objetivo: false } }} /></div>;
  return <div className="space-y-4 p-4">{(Object.keys(LOCATIONS) as LocationId[]).filter((l) => !only || only === l).map((l) => <div key={l} className="mx-auto aspect-video max-w-[1100px] overflow-hidden rounded-2xl"><LocationScene location={l} world={w} caso={1} pessoas={P[l]!} falando={null} filaMin={94} /></div>)}</div>;
}
export default function Page() { return <Suspense><G /></Suspense>; }
