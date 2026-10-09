import type { Metadata } from "next";
import { Perfil } from "@/game/ui/Account";
export const metadata: Metadata = { title: "Meu perfil", robots: { index: false } };
export default function Page() { return <Perfil />; }
