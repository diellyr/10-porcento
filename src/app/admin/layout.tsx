import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/nav";
import { Wordmark } from "@/components/ui/brand";
import { Notice } from "@/components/ui/primitives";
import { DevBanner } from "@/components/dev-banner";
import { container } from "@/server/container";
import { getMfaDecision, getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Administração", template: "%s · Admin Brasil Fiscal" }, robots: { index: false, follow: false } };

/** Controle de acesso no servidor: sessão válida E papel admin vindo do banco. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect("/login?next=/admin");
  let role: "user" | "admin" | null = null;
  try { role = await container().analytics.getRole(user.id); } catch { role = null; }
  if (role !== "admin") {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-md space-y-3"><Notice tone="bad"><strong>Acesso restrito.</strong> Sua conta ({user.email}) não tem permissão de administrador.</Notice><p className="text-sm"><Link href="/login?next=/admin" className="font-semibold text-primary hover:underline">Entrar com outra conta (ex.: ti@local)</Link> · <Link href="/" className="text-primary hover:underline">Voltar ao site</Link></p></div>
      </main>
    );
  }
  if ((await getMfaDecision().catch(() => "enroll")) !== "ok") redirect("/login/mfa?next=/admin");
  return (
    <>
    <DevBanner />
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-surface lg:min-h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-5">
          <Wordmark />
          <p className="hidden truncate text-xs text-ink-3 lg:mt-3 lg:block">{user.email}</p>
        </div>
        <AdminNav />
      </aside>
      <main id="conteudo" className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
    </>
  );
}
