import type { Metadata } from "next";
import { Explorer } from "@/components/explorer";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Receitas", description: "Evolução, composição e comparação da arrecadação da União, dos estados e dos municípios." };

export default function Page() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Receitas" title="Quanto o governo arrecada" subtitle="Filtre por esfera, local, período e categoria. Compare dois locais lado a lado." />
      <Explorer preset="revenue" />
    </Container>
  );
}
