import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/components/search-box";
import { IndicatorGrid, type IndicatorLinks } from "@/components/indicator-cards";
import { Card, Container, Notice, SetupNotice, Skeleton } from "@/components/ui/primitives";
import { defaultYear, getOverview } from "@/lib/server-api";

export const dynamic = "force-dynamic";

// cada indicador leva ao menu que explica aquele número
const INDICATOR_LINKS: IndicatorLinks = {
  revenue: { href: "/de-onde-vem", label: "De onde vem" },
  expense: { href: "/para-onde-vai", label: "Para onde vai" },
  result: { href: "/explorar", label: "Explorar dados" },
  debt: { href: "/divida", label: "Dívida" },
};

async function BrasilNumbers() {
  const year = defaultYear();
  const r = await getOverview("COUNTRY", "1", year);
  if (!r.ok) return r.setup ? <SetupNotice /> : <Notice tone="warn">{r.message}</Notice>;
  return (
    <>
      <IndicatorGrid overview={r.data} links={INDICATOR_LINKS} />
      <p className="mt-4 text-sm text-ink-3">
        Cada indicador mostra o conceito contábil usado e a fonte oficial. Onde a fonte ainda não divulgou o ano de {year}, usamos o ano anterior e informamos.
      </p>
    </>
  );
}

const TILES = [
  { href: "/para-onde-vai", title: "Para onde vão R$ 100", text: "De cada R$ 100 gastos pelo governo: saúde, educação, previdência, juros…" },
  { href: "/de-onde-vem", title: "De onde vêm R$ 100", text: "A composição da arrecadação: impostos, contribuições e transferências." },
  { href: "/estados", title: "Estados", text: "Receitas, despesas e dívida dos 26 estados e do Distrito Federal." },
  { href: "/municipios", title: "Municípios", text: "Encontre sua cidade e veja o que a prefeitura arrecada e gasta." },
  { href: "/contratos", title: "Contratos e fornecedores", text: "Quanto o governo federal contratou de uma empresa ou de um órgão, por CNPJ." },
  { href: "/explorar", title: "Explorar dados", text: "Monte sua própria análise: escolha o que, onde e o período." },
  { href: "/perguntar", title: "Pergunte ao Brasil Fiscal", text: "“Quanto Santos gastou com saúde em 2024?” Respostas com fonte." },
];

export default function Home() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 sm:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-primary">Brasil Fiscal</p>
          <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">Entenda para onde vai o dinheiro público.</h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg text-ink-2">Quanto o Brasil arrecada e gasta — da União ao seu município — com dados oficiais, fonte sempre à vista e sem jargão.</p>
          <div className="mt-8 max-w-2xl"><SearchBox size="lg" /></div>
          <p className="mt-4 text-sm text-ink-3">
            Experimente: <Link className="text-primary hover:underline" href="/municipios/3541406">Praia Grande</Link>, <Link className="text-primary hover:underline" href="/municipios/3548500">Santos</Link>, <Link className="text-primary hover:underline" href="/estados/sp">São Paulo</Link>
          </p>
        </Container>
      </section>

      <Container className="py-12">
        <h2 className="mb-5 text-2xl font-semibold tracking-tight">O Brasil em números</h2>
        <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44" />)}</div>}>
          <BrasilNumbers />
        </Suspense>
      </Container>

      <Container className="pb-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className="group">
              <Card className="h-full p-6 transition-colors group-hover:border-primary/40">
                <h3 className="text-lg font-semibold text-ink group-hover:text-primary">{t.title} <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span></h3>
                <p className="mt-2 text-sm text-ink-2">{t.text}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
