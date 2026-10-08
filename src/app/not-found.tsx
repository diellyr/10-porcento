import Link from "next/link";
import { Wordmark } from "@/components/ui/brand";

export default function NotFound() {
  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center bg-bg px-4 text-center">
      <div className="max-w-md">
        <div className="mb-6 flex justify-center"><Wordmark /></div>
        <p className="text-sm font-semibold text-primary">Erro 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Não encontramos esta página</h1>
        <p className="mt-3 text-ink-2">O endereço pode estar errado ou o local ainda não está no cadastro. Tente buscar pelo nome.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-600">Ir para o início</Link>
          <Link href="/municipios" className="inline-flex min-h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2">Buscar município</Link>
        </div>
      </div>
    </main>
  );
}
