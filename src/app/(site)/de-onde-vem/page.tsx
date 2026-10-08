import type { Metadata } from "next";
import { Per100View } from "@/components/per100";
import { Container, PageHeader } from "@/components/ui/primitives";
import { defaultYear, getPer100 } from "@/lib/server-api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "De onde vêm R$ 100", description: "A composição da arrecadação pública: impostos, contribuições, transferências e outras receitas." };

export default async function Page() {
  const initial = await getPer100({ type: "COUNTRY", code: "1", side: "revenue", lens: "origin", year: defaultYear() });
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Receitas" title="De onde vêm R$ 100" subtitle="A composição do dinheiro que entra nos cofres públicos. Para a União, também é possível dividir por tributo federal (IR, Cofins, CSLL, IPI, IOF…) quando o conjunto de dados da Receita Federal está configurado." />
      <Per100View side="revenue" initial={initial.ok ? initial.data : null} />
    </Container>
  );
}
