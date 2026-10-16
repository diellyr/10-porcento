import type { Metadata } from "next";
import { Entrar } from "@/game/ui/Account";
export const metadata: Metadata = { title: "Entrar", robots: { index: false } };
export default function Page() { return <Entrar />; }
