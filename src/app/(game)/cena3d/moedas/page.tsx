"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import ChuvaDeMoedas from "@/game/ui/three/ChuvaDeMoedas";

function G() {
  const sp = useSearchParams(); const [n, setN] = useState(0);
  return <div className="grid min-h-dvh place-items-center bg-[#fff8ec]"><button className="g-btn" onClick={() => setN((x) => x + 1)}>Chover de novo</button>{<ChuvaDeMoedas key={n} qualidade={(sp.get("q") as "alta") ?? "alta"} intensidade={Number(sp.get("i") ?? 3)} {...(sp.get("t") ? { instante: Number(sp.get("t")) } : {})} />}</div>;
}
export default function Page() { return <Suspense><G /></Suspense>; }
