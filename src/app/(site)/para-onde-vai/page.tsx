import type { Metadata } from "next";
import { Per100View } from "@/components/per100";
import { Container, PageHeader } from "@/components/ui/primitives";
import { defaultYear, getPer100 } from "@/lib/server-api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Para onde vão R$ 100", description: "De cada R$ 100 gastos pelo governo, quanto vai para saúde, educação, previdência, juros e outras áreas." };

export default async function Page() {
  const initial = await getPer100({ type: "COUNTRY", code: "1", side: "expense", lens: "function", year: defaultYear() });
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Despesas" title="Para onde vão R$ 100" subtitle="Veja como cada R$ 100 gastos pelo governo se dividem. Troque o ano, a esfera (Brasil, estado ou município) e a forma de dividir: por área ou por tipo de gasto." />
      <Per100View side="expense" initial={initial.ok ? initial.data : null} />
    </Container>
  );
}
