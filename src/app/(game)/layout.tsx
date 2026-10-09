import type { Metadata } from "next";
import "@/game/game.css";

export const metadata: Metadata = {
  title: { default: "MEUS 10% — a caneta e o dinheiro público", template: "%s · MEUS 10%" },
  description: "Aventura investigativa de humor e gestão pública: administre uma UPA, escolha entre desviar ou melhorar e descubra o que o orçamento faz com a história.",
  applicationName: "MEUS 10%",
  openGraph: { title: "MEUS 10%", description: "Você recebeu uma caneta e dinheiro público. O que vai fazer com eles?", locale: "pt_BR", type: "website", images: ["/promo/og.png"] },
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <div className="game">{children}</div>;
}
