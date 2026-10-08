import type { Metadata } from "next";
import { AskBox } from "@/components/ask-box";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Pergunte ao Brasil Fiscal", description: "Faça perguntas em português sobre arrecadação, despesas e dívida e receba respostas com fonte oficial." };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Perguntas" title="Pergunte ao Brasil Fiscal" subtitle="Escreva sua pergunta em português. Ela é convertida em uma consulta estruturada e validada — nunca em SQL — e respondida apenas com dados oficiais." />
      <AskBox initial={q?.slice(0, 300)} />
    </Container>
  );
}
