import { RankingQuerySchema, withDefaultCategory, type RankingData } from "../core/ranking";
import type { RankingQuery } from "../core/ranking";
import type { IDataRepository } from "../core/interfaces";

export interface RankingResult extends RankingData {
  query: RankingQuery & { category_type: string };
  /** todos os entes do recorte têm dado salvo */
  complete: boolean;
  /** o app consegue completar sozinho (27 estados); municípios em massa não */
  fillable: boolean;
  note: string | null;
}

/**
 * Rankings sobre os dados JÁ SALVOS. Nunca finge completude: informa quantos entes entraram na conta e quantos existem.
 * Para estados é possível completar a base (27 consultas); para municípios o ranking vale para os já consultados.
 */
export class RankingService {
  constructor(private data: Pick<IDataRepository, "rankEntities">) {}

  async rank(input: unknown): Promise<RankingResult> {
    const q = withDefaultCategory(RankingQuerySchema.parse(input));
    const d = await this.data.rankEntities(q);
    const complete = d.total > 0 && d.covered >= d.total;
    const scope = q.entity_type === "STATE" ? "estados" : q.uf ? `municípios de ${q.uf}` : "municípios";
    const note = d.items.length === 0
      ? `Ainda não há dados salvos de ${scope} para este recorte.`
      : complete ? null
      : `Considera ${d.covered} de ${d.total} ${scope} (os que já têm dado oficial salvo para este recorte). ${q.entity_type === "STATE" ? "Complete a base para ver o ranking dos 27 estados." : "Municípios entram no ranking conforme são consultados."}`;
    return { ...d, query: q, complete, fillable: q.entity_type === "STATE" && !complete, note };
  }
}
