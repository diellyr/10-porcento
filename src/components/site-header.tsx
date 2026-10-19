"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "./ui/brand";
import { SearchBox } from "./search-box";

const NAV = [
  { href: "/para-onde-vai", label: "Para onde vai" },
  { href: "/de-onde-vem", label: "De onde vem" },
  { href: "/estados", label: "Estados" },
  { href: "/municipios", label: "Municípios" },
  { href: "/explorar", label: "Explorar" },
];
const MORE = [
  { href: "/receitas", label: "Receitas" },
  { href: "/despesas", label: "Despesas" },
  { href: "/rankings", label: "Rankings" },
  { href: "/contratos", label: "Contratos e fornecedores" },
  { href: "/divida", label: "Dívida" },
  { href: "/beneficios", label: "Benefícios" },
  { href: "/perguntar", label: "Pergunte ao Brasil Fiscal" },
  { href: "/glossario", label: "Glossário" },
];

const ADMIN = { href: "/login?next=/admin", label: "Admin" };

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const link = (href: string) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${path.startsWith(href) ? "bg-primary-50 text-primary" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-white">Ir para o conteúdo</a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Principal" className="ml-2 hidden items-center gap-0.5 xl:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className={link(n.href)}>{n.label}</Link>)}
          <details className="group relative">
            <summary className="cursor-pointer list-none whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2">Mais ▾</summary>
            <div className="absolute left-0 mt-1 w-56 rounded-xl border border-line bg-surface p-1 shadow-xl">
              {MORE.map((n) => <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-surface-2">{n.label}</Link>)}
            </div>
          </details>
          <Link href={ADMIN.href} className={`${link(ADMIN.href)} ml-1 border border-line`}>{ADMIN.label}</Link>
        </nav>
        <div className="ml-auto hidden w-full max-w-[16rem] min-w-0 md:block xl:max-w-sm"><SearchBox /></div>
        <button type="button" className="ml-auto inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line xl:hidden" aria-expanded={open} aria-label="Abrir menu" onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" /></svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-bg px-4 pb-4 pt-3 xl:hidden">
          <div className="mb-3 md:hidden"><SearchBox /></div>
          <nav aria-label="Menu" className="grid grid-cols-2 gap-1">
            {[...NAV, ...MORE, ADMIN].map((n) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={link(n.href)}>{n.label}</Link>)}
          </nav>
        </div>
      )}
    </header>
  );
}
