import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Container, Notice, PageHeader, SetupNotice, Skeleton } from "@/components/ui/primitives";
import { IndicatorGrid } from "@/components/indicator-cards";
import { Evolution } from "@/components/evolution";
import { Per100View } from "@/components/per100";
import { Help } from "@/components/ui/help";
import { SourceNote } from "@/components/ui/provenance";
import { YearSelect } from "@/components/year-select";
import type { PlaceDTO, Provenance } from "@/lib/dto";
import { formatBRLCompact } from "@/lib/format";
import { getOverview, getPer100, getPlace, getQuery } from "@/lib/server-api";
import { placeLabel } from "@/lib/places";
import type { QuerySpec } from "@/server/core/query-spec";

const AREAS: Array<{ key: string; label: string; term: string; metric: QuerySpec["metric"]; category_type: string; category_code: string }> = [
  { key: "health", label: "Saúde", term: "funcao", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", category_code: "10" },
  { key: "education", label: "Educação", term: "funcao", metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", category_code: "12" },
  { key: "staff", label: "Pessoal e encargos", term: "natureza", metric: "EXPENSE_LIQUIDATED", category_type: "EXPENSE_GROUP", category_code: "3.1" },
  { key: "invest", label: "Investimentos", term: "natureza", metric: "EXPENSE_LIQUIDATED", category_type: "EXPENSE_GROUP", category_code: "4.4" },
  { key: "transfers", label: "Transferências recebidas", term: "transferencia", metric: "REVENUE_REALIZED", category_type: "REVENUE_SOURCE", category_code: "1.7.0.0.00.0.0" },
];

async function Areas({ place, year }: { place: PlaceDTO; year: number }) {
  const results = await Promise.all(AREAS.map((a) => getQuery({ kind: "series", entity_type: place.type as "STATE", entity_code: place.code, metric: a.metric, category_type: a.category_type, category_code: a.category_code, year_from: year, year_to: year })));
  const prov: Provenance[] = results.flatMap((r) => (r.ok ? r.data.provenance : []));
  return (
    <section aria-labelledby="areas" className="mt-12">
      <h2 id="areas" className="mb-1 text-xl font-semibold">Principais áreas em {year}</h2>
      <p className="mb-4 text-sm text-ink-3">Despesa liquidada por área, e transferências correntes recebidas de outros governos.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {AREAS.map((a, i) => {
          const r = results[i]!;
          const v = r.ok ? r.data.points.find((p) => p.year === year)?.value ?? null : null;
          return (
            <Card key={a.key} className="p-4">
              <p className="text-sm text-ink-2">{a.label}<Help term={a.term} /></p>
              <p className="tabular mt-2 text-xl font-bold" style={{ color: a.metric === "REVENUE_REALIZED" ? "var(--color-revenue)" : "var(--color-expense)" }}>{v === null ? "—" : formatBRLCompact(v)}</p>
              {v === null && <p className="mt-1 text-xs text-ink-3">indisponível</p>}
            </Card>
          );
        })}
      </div>
      <div className="mt-3"><SourceNote provenance={dedupe(prov)} /></div>
    </section>
  );
}

const dedupe = (ps: Provenance[]) => [...new Map(ps.map((p) => [`${p.sourceSlug}|${p.dataset}`, p])).values()];

export async function PlacePage({ type, code, year }: { type: "STATE" | "MUNICIPALITY"; code: string; year: number }) {
  const placeRes = await getPlace(type, code);
  if (!placeRes.ok) {
    if (placeRes.message === "Não encontramos este local.") notFound(); // página 404 padrão (noindex)
    return <Container className="py-12">{placeRes.setup ? <SetupNotice /> : <Notice tone="warn">{placeRes.message}</Notice>}</Container>;
  }
  const { place, breadcrumb } = placeRes.data;
  const [overview, per100] = await Promise.all([
    getOverview(type, code, year),
    getPer100({ type, code, side: "expense", lens: "function", year }),
  ]);
  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label="Você está em" className="mb-4 text-sm text-ink-3">
        <ol className="flex flex-wrap items-center gap-1.5">
          {breadcrumb.map((b, i) => (
            <li key={b.type + b.code} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>›</span>}
              {i < breadcrumb.length - 1 ? <Link className="hover:text-primary" href={b.type === "COUNTRY" ? "/" : `/estados/${(placeRes.data.place.uf ?? "").toLowerCase()}`}>{b.name}</Link> : <span className="font-medium text-ink-2" aria-current="page">{b.name}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <PageHeader eyebrow={type === "STATE" ? "Estado" : "Município"} title={placeLabel(place)} subtitle={place.population ? `${place.population.toLocaleString("pt-BR")} habitantes (estimativa informada pelo ente ao Tesouro Nacional).` : undefined}>
        <div className="mt-5"><YearSelect year={year} /></div>
      </PageHeader>

      {overview.ok ? <IndicatorGrid overview={overview.data} /> : <Notice tone="warn">{overview.message}</Notice>}

      <section aria-labelledby="per100" className="mt-12">
        <h2 id="per100" className="mb-4 text-xl font-semibold">Para onde vai o dinheiro</h2>
        <Per100View side="expense" initialPlace={{ type, code, name: place.name, uf: place.uf }} lockPlace initial={per100.ok ? per100.data : null} />
      </section>

      <Suspense fallback={<div className="mt-12 grid gap-3 sm:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}>
        <Areas place={place} year={year} />
      </Suspense>

      <section className="mt-12"><Evolution type={type} code={code} year={year} /></section>

      {type === "MUNICIPALITY" && (
        <p className="mt-8 text-sm text-ink-2">Quer ver programas sociais? <Link className="text-primary hover:underline" href={`/beneficios?m=${code}`}>Bolsa Família e BPC em {place.name}</Link>.</p>
      )}
    </Container>
  );
}
