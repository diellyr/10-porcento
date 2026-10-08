import type { Metadata } from "next";
import { RankingsView } from "@/components/rankings-view";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Rankings", description: "Compare estados e municípios: quem mais gasta, arrecada ou aumentou despesas, com a cobertura dos dados à vista." };

export default function Page() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Comparações" title="Rankings" subtitle="Quem gasta ou arrecada mais, quem mais aumentou ou reduziu. O ranking considera os dados oficiais já salvos e sempre mostra quantos entes entraram na conta — nunca apresentamos um ranking parcial como se fosse completo." />
      <RankingsView />
    </Container>
  );
}
