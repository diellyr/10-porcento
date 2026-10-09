import type { Metadata } from "next";
import GameApp from "@/game/ui/GameApp";

export const metadata: Metadata = { title: "Jogar" };
export const dynamic = "force-dynamic";
export default function Page() { return <GameApp />; }
