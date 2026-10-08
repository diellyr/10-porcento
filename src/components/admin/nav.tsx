"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/fontes", label: "Fontes de Dados" },
  { href: "/admin/saude", label: "Saúde das APIs" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/cache", label: "Cache" },
  { href: "/admin/dados", label: "Dados" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/auditoria", label: "Auditoria" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Administração" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-5">
      {ITEMS.map((i) => {
        const on = i.exact ? path === i.href : path.startsWith(i.href);
        return <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${on ? "bg-primary-50 text-primary" : "text-ink-2 hover:bg-surface-2"}`}>{i.label}</Link>;
      })}
      <Link href="/" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ink-3 hover:bg-surface-2 lg:mt-4">← Voltar ao site</Link>
    </nav>
  );
}
