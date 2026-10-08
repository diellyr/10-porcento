import type { Metadata } from "next";
import { SearchBox } from "@/components/search-box";
import { Container, PageHeader } from "@/components/ui/primitives";
import { STATES } from "@/lib/places";
import Link from "next/link";

export const metadata: Metadata = { title: "Municípios", description: "Encontre sua cidade e veja o que a prefeitura arrecada e gasta." };

export default function Page() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Entes federativos" title="Encontre seu município" subtitle="Digite o nome da cidade — por exemplo, “Praia Grande - SP”." />
      <div className="max-w-2xl"><SearchBox size="lg" autoFocus /></div>
      <h2 className="mb-3 mt-12 text-lg font-semibold">Ou comece por um estado</h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {STATES.map((s) => (
          <li key={s.uf}><Link href={`/estados/${s.uf.toLowerCase()}`} className="block rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:border-primary/40 hover:text-primary">{s.name}</Link></li>
        ))}
      </ul>
    </Container>
  );
}
