import type { Metadata } from "next";
import { Suspense } from "react";
import { ContractsExplorer } from "@/components/contracts-explorer";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Contratos e fornecedores", description: "Contratos do governo federal com empresas: por CNPJ ou por órgão e ano, com valores, vigência e fonte oficial." };

export default function Page() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Contratos" title="Contratos e fornecedores" subtitle="Quanto o governo federal contratou de uma empresa, ou o que um órgão contratou em um ano. Dados do Portal da Transparência (CGU)." />
      <Suspense><ContractsExplorer /></Suspense>
    </Container>
  );
}
