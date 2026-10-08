import type { Metadata } from "next";
import { Explorer } from "@/components/explorer";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Explorar dados", description: "Monte sua própria análise: escolha o que analisar, onde, o período e a categoria." };

export default function Page() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Ferramenta" title="Explorar dados" subtitle="Escolha o que você quer analisar, em que local e período. Geramos o gráfico e a tabela — com a fonte de cada número." />
      <Explorer />
    </Container>
  );
}
