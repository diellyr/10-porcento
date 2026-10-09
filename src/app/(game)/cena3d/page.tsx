"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CHARACTERS } from "@/game/content/characters";
import type { CharId, Emotion } from "@/game/engine/types";
import FaceScene from "@/game/ui/three/FaceScene";

function G() {
  const sp = useSearchParams(); const c = (sp.get("c") ?? "guardiao") as CharId | "todos"; const e = (sp.get("e") ?? "neutro") as Emotion; const f = sp.get("f") === "1"; const q = (sp.get("q") ?? "alta") as "alta";
  const [, setX] = useState(0);
  const ids: CharId[] = c === "todos" ? ["joana", "celia", "guardiao", "toninho", "juninho", "roberto", "ana", "bento", "cornelio"] : [c];
  return <div className={`grid h-dvh w-full ${ids.length > 1 ? "grid-cols-3" : ""}`} style={{ background: "linear-gradient(#fff,#ffeccc)" }}>{ids.map((id) => <div key={id} className="h-full min-h-0"><FaceScene look={CHARACTERS[id].look} emocao={e} falando={f} qualidade={q} reduzir={sp.get("r") === "1"} nivel={() => 0.5 + 0.4 * Math.sin(performance.now() / 90)} onFail={() => setX(1)} nome={CHARACTERS[id].nome} /></div>)}</div>;
}
export default function Page() { return <Suspense><G /></Suspense>; }
