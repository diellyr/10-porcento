"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import VitrinePatrimonio from "@/game/ui/three/VitrinePatrimonio";

function G() {
  const sp = useSearchParams();
  return <div className="game mx-auto max-w-xl p-3"><VitrinePatrimonio patrimonio={Number(sp.get("p") ?? 300000)} luxo={Number(sp.get("l") ?? 2)} evidencias={Number(sp.get("e") ?? 0)} qualidade={(sp.get("q") as "alta") ?? "alta"} reduzir={sp.get("r") === "1"} /></div>;
}
export default function Page() { return <Suspense><G /></Suspense>; }
