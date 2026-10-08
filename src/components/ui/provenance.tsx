import type { Provenance } from "@/lib/dto";
import { formatDate } from "@/lib/format";

/** Fonte sempre visível: órgão, dataset, competência, datas de coleta/atualização e link oficial. */
export function SourceNote({ provenance, className = "" }: { provenance: Provenance[]; className?: string }) {
  if (!provenance.length) {
    return <p className={`text-xs text-ink-3 ${className}`}>Fonte: dado oficial ainda não coletado para este recorte.</p>;
  }
  return (
    <ul className={`space-y-1.5 text-xs text-ink-3 ${className}`}>
      {provenance.map((p) => (
        <li key={`${p.sourceSlug}|${p.dataset}`} className="leading-relaxed">
          <span className="font-medium text-ink-2">Fonte: {p.provider || p.sourceName}</span>
          {p.dataset && <> · {p.dataset}</>}
          {" · "}Competência: {p.periodLabel}
          {" · "}Coletado em {formatDate(p.fetchedAt)}
          {p.sourceUpdatedAt && <> · Atualizado na fonte em {formatDate(p.sourceUpdatedAt)}</>}
          {(p.url || p.documentationUrl) && (
            <>
              {" · "}
              <a className="text-primary underline-offset-2 hover:underline" href={p.url ?? p.documentationUrl!} target="_blank" rel="noopener noreferrer">
                Ver fonte oficial
              </a>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
