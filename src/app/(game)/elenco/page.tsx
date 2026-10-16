import type { Metadata } from "next";
import { Cast } from "@/game/ui/Cast";

export const metadata: Metadata = { title: "Elenco" };
export default function Page() { return <Cast />; }
