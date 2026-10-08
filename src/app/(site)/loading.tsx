import { Container, Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <Container className="py-12" >
      <div role="status" aria-live="polite" aria-label="Carregando">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="mb-6 h-10 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
        <span className="sr-only">Carregando…</span>
      </div>
    </Container>
  );
}
