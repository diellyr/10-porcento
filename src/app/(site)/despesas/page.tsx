import type { Metadata } from "next";
import Link from "next/link";
import { DrillDown } from "@/components/drilldown";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Despesas", description: "Detalhe as despesas públicas: função, subfunção e órgão." };

export default function Page() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Despesas" title="Em que o governo gasta" subtitle={<>Comece pelas grandes áreas e clique para detalhar. Para ver a evolução no tempo, use o <Link className="text-primary hover:underline" href="/explorar">Explorador</Link>.</>} />
      <DrillDown />
    </Container>
  );
}
