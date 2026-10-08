import type { Metadata } from "next";
import { PlacePage } from "@/components/place-page";
import { defaultYear, getPlaceByUf } from "@/lib/server-api";
import { notFound } from "next/navigation";
import { CODE_BY_UF } from "@/server/core/geo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }): Promise<Metadata> {
  const { uf } = await params;
  const r = await getPlaceByUf(uf);
  return r.ok ? { title: `${r.data.place.name} — receitas e despesas`, description: `Quanto ${r.data.place.name} arrecada e gasta, com dados oficiais do Tesouro Nacional.` } : { title: "Estado" };
}

export default async function Page({ params, searchParams }: { params: Promise<{ uf: string }>; searchParams: Promise<{ ano?: string }> }) {
  const { uf } = await params;
  const { ano } = await searchParams;
  const code = CODE_BY_UF[uf.toUpperCase()];
  if (!code) notFound();
  const year = Number(ano) >= 2000 ? Number(ano) : defaultYear();
  return <PlacePage type="STATE" code={code} year={year} />;
}
