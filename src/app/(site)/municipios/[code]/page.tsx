import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlacePage } from "@/components/place-page";
import { defaultYear, getPlace } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  if (!/^\d{7}$/.test(code)) return { title: "Município" };
  const r = await getPlace("MUNICIPALITY", code);
  return r.ok ? { title: `${r.data.place.name}${r.data.place.uf ? ` - ${r.data.place.uf}` : ""} — receitas e despesas`, description: `Quanto ${r.data.place.name} arrecada e gasta, com dados oficiais do Tesouro Nacional.` } : { title: "Município" };
}

export default async function Page({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ ano?: string }> }) {
  const { code } = await params;
  if (!/^\d{7}$/.test(code)) notFound();
  const { ano } = await searchParams;
  return <PlacePage type="MUNICIPALITY" code={code} year={Number(ano) >= 2000 ? Number(ano) : defaultYear()} />;
}
