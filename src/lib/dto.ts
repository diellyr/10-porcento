/** Tipos do contrato público da API (JSON). Importados por frontend e usados pelas rotas — única fonte de verdade. */
export type { Point } from "@/server/services/views";
export type { Overview, Indicator, Per100 } from "@/server/services/overview";
export type { BreakdownItem } from "@/server/services/views";
export type { Provenance } from "@/server/core/types";

import type { Point } from "@/server/services/views";
import type { Provenance } from "@/server/core/types";
import type { Freshness } from "@/server/core/interfaces";
import type { QuerySpec } from "@/server/core/query-spec";

export interface PlaceDTO { type: "COUNTRY" | "STATE" | "MUNICIPALITY" | "SUPPLIER" | "AGENCY"; code: string; name: string; uf: string | null; population?: number | null }

export interface QueryDTO {
  spec: QuerySpec;
  entity: { name: string; uf: string | null } | null;
  points: Point[];
  totals: Array<{ year: number; value: number }>;
  freshness: Freshness;
  notice: string | null;
  provenance: Provenance[];
  generatedAt: string;
}

export interface ApiError { error: { code: string; message: string; technical?: string } }
