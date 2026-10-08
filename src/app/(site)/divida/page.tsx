import type { Metadata } from "next";
import { Explorer } from "@/components/explorer";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Dívida", description: "Evolução da dívida pública: Dívida Pública Federal e dívida consolidada de estados e municípios." };

export default function Page() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Dívida" title="Quanto o governo deve" subtitle="Dívida Pública Federal (Tesouro Nacional) e dívida consolidada de estados e municípios (Relatório de Gestão Fiscal). Os valores são nominais e referem-se ao fim de cada período." />
      <Explorer preset="debt" />
    </Container>
  );
}
