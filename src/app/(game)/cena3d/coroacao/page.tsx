"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { avatarLook } from "@/game/content/characters";
import Coroacao from "@/game/ui/three/Coroacao";

function G() {
  const sp = useSearchParams();
  return <div className="mx-auto max-w-3xl p-3"><Coroacao look={avatarLook(sp.get("av") ?? "av1")} qualidade={(sp.get("q") as "alta") ?? "alta"} reduzir={sp.get("r") === "1"} /></div>;
}
export default function Page() { return <Suspense><G /></Suspense>; }
