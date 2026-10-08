import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/primitives";
import { StatesGrid } from "@/components/states-grid";

export const metadata: Metadata = { title: "Estados", description: "Receitas, despesas e dívida dos 26 estados e do Distrito Federal." };

export default function Page() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Entes federativos" title="Estados" subtitle="Os 27 entes subnacionais. Os valores de cada estado são carregados conforme você navega e ficam salvos para as próximas consultas." />
      <StatesGrid />
    </Container>
  );
}
