import type { Metadata, Viewport } from "next";
import { InstallCapture } from "@/game/ui/Install";
import "@/game/game.css";

export const metadata: Metadata = {
  title: { default: "MEUS 10% — a caneta e o dinheiro público", template: "%s · MEUS 10%" },
  description: "Aventura investigativa de humor e gestão pública: administre uma UPA, escolha entre desviar ou melhorar e descubra o que o orçamento faz com a história.",
  applicationName: "MEUS 10%",
  manifest: "/meus-10.webmanifest",
  appleWebApp: { capable: true, title: "MEUS 10%", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/meus10-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/meus10-512.png", sizes: "512x512", type: "image/png" }], apple: "/icons/meus10-apple-touch.png" },
  openGraph: { title: "MEUS 10%", description: "Você recebeu uma caneta e dinheiro público. O que vai fazer com eles?", locale: "pt_BR", type: "website", images: ["/promo/og.jpg"] },
};

export const viewport: Viewport = { themeColor: "#ff7a1a", width: "device-width", initialScale: 1 };

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <div className="game"><InstallCapture />{children}</div>;
}
