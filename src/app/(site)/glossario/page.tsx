import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/primitives";
import { GLOSSARY } from "@/server/core/catalog-info";

export const metadata: Metadata = { title: "Glossário", description: "Termos de finanças públicas explicados em linguagem simples." };

export default function Page() {
  const items = Object.entries(GLOSSARY).sort(([, a], [, b]) => a.term.localeCompare(b.term, "pt-BR"));
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Ajuda" title="Glossário" subtitle="Você não precisa entender de contabilidade pública para usar o Brasil Fiscal. Estes são os termos que aparecem por aqui." />
      <dl className="max-w-3xl divide-y divide-line">
        {items.map(([k, v]) => (
          <div key={k} id={k} className="py-5">
            <dt className="text-lg font-semibold">{v.term}</dt>
            <dd className="mt-1 text-ink-2">{v.text}</dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}
