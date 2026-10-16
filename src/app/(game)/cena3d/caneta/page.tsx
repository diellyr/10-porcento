"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PenScene from "@/game/ui/three/PenScene";

function G() {
  const sp = useSearchParams(); const t = sp.get("t");
  return <div className="h-dvh w-full"><PenScene gesto={(sp.get("g") ?? "assinar") as "assinar"} papel="Autorização de reorganização do estoque — documento fictício" nome="Dielly Souza" avatar={sp.get("a") ?? "av1"} qualidade="alta" reduzir={sp.get("r") === "1"} congelar={t ? Number(t) : undefined} onDone={() => undefined} onFail={() => undefined} onSfx={() => undefined} /></div>;
}
export default function Page() { return <Suspense><G /></Suspense>; }
