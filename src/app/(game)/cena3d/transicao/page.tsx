"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TransicaoNivel } from "@/game/ui/TransicaoNivel";

function G() {
  const sp = useSearchParams();
  return <div className="game"><TransicaoNivel nivel={Number(sp.get("n") ?? 2)} viaRede={sp.get("rede") === "1"} reduzir={sp.get("r") === "1"} onFim={() => undefined} /></div>;
}
export default function Page() { return <Suspense><G /></Suspense>; }
