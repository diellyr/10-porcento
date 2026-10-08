import Link from "next/link";
import { Container } from "./ui/primitives";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <Container className="grid gap-8 py-10 text-sm text-ink-2 md:grid-cols-3">
        <div>
          <p className="font-semibold text-ink">Brasil Fiscal</p>
          <p className="mt-2 max-w-xs text-ink-3">Dados oficiais sobre arrecadação e gastos públicos, apresentados de forma objetiva e sem viés político.</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Como lemos os números</p>
          <p className="mt-2 text-ink-3">Cada valor mostra sua fonte, período e data de coleta. Quando uma fonte oficial está fora do ar, usamos o último dado salvo e avisamos. Nunca estimamos valores.</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Navegue</p>
          <ul className="mt-2 space-y-1 text-ink-3">
            <li><Link className="hover:text-primary" href="/glossario">Glossário</Link></li>
            <li><Link className="hover:text-primary" href="/explorar">Explorar dados</Link></li>
            <li><Link className="hover:text-primary" href="/perguntar">Pergunte ao Brasil Fiscal</Link></li>
            <li><Link className="hover:text-primary" href="/admin">Administração</Link></li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
