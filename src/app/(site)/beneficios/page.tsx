import type { Metadata } from "next";
import { Explorer } from "@/components/explorer";
import { Container, Notice, PageHeader } from "@/components/ui/primitives";
import { getPlace } from "@/lib/server-api";

export const metadata: Metadata = { title: "Benefícios e programas sociais", description: "Bolsa Família e BPC por município: valor pago e número de beneficiários (dados agregados)." };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const place = m && /^\d{7}$/.test(m) ? await getPlace("MUNICIPALITY", m) : null;
  const initial = place?.ok ? { type: "MUNICIPALITY" as const, code: place.data.place.code, name: place.data.place.name, uf: place.data.place.uf } : undefined;
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Programas sociais" title="Benefícios por município" subtitle="Valores e número de beneficiários, sempre agregados por município — nenhum dado pessoal é exibido, em respeito à LGPD." />
      <div className="mb-6"><Notice tone="info">Os dados vêm do Portal da Transparência (CGU), que exige uma chave de API configurada pelo administrador. Sem ela, esta página mostra que a fonte não está configurada em vez de exibir valores.</Notice></div>
      <Explorer preset="benefit" initialPlace={initial} />
    </Container>
  );
}
