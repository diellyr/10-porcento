import { CASE_BY_NUM } from "@/game/content/cases";
import { fictionalScenario, referencedScenario } from "@/game/content/scenario";
import { ActionLogSchema } from "@/game/engine/schema";
import { apply } from "@/game/engine/rules";
import type { Action, GameState, Scenario, ScenarioReference } from "@/game/engine/types";
import { AppError } from "../core/errors";
import { DEV_FIXTURES_ENABLED } from "../dev/fixtures";
import type { IGameRepo } from "./repo";
import { MemoryGameRepo, SupabaseGameRepo } from "./repo";
import { serviceClient } from "../repositories/supabase/client";

const g = globalThis as unknown as { __gameRepo?: IGameRepo };
export function gameRepo(): IGameRepo {
  return (g.__gameRepo ??= DEV_FIXTURES_ENABLED() ? new MemoryGameRepo() : new SupabaseGameRepo(serviceClient()));
}

const strip = (s: Scenario) => ({ ...s, congeladoEm: "" });

/** O cliente NÃO define o cenário: ele precisa ser o fictício oficial ou um cenário congelado e armazenado pelo servidor. */
export async function verifyScenario(repo: IGameRepo, sc: Scenario): Promise<void> {
  if (!sc || typeof sc !== "object") throw new AppError("VALIDATION", "cenário ausente");
  if (sc.kind === "ficticio") {
    if (JSON.stringify(strip(sc)) !== JSON.stringify(strip(fictionalScenario()))) throw new AppError("VALIDATION", "cenário fictício adulterado");
    return;
  }
  const stored = await repo.getScenario(sc.hash);
  if (!stored || JSON.stringify(strip(stored)) !== JSON.stringify(strip(sc))) throw new AppError("VALIDATION", "cenário não reconhecido pelo servidor");
}

/** Reexecuta TODO o histórico com o motor de regras: o estado do servidor nasce das regras, nunca do que o navegador diz. */
export async function replay(repo: IGameRepo, raw: unknown): Promise<{ state: GameState; log: Array<{ id: string; action: Action }> }> {
  const log = ActionLogSchema.parse(raw) as Array<{ id: string; action: Action }>;
  const first = log[0]!.action;
  if (first.type !== "start") throw new AppError("VALIDATION", "o histórico precisa começar com a ação start");
  await verifyScenario(repo, first.scenario as Scenario);
  let state: GameState | null = null;
  for (const { id, action } of log) {
    const r = apply(state, id, action);
    if (!r.ok) throw new AppError("VALIDATION", `ação inválida (${action.type}): ${r.error}`);
    state = r.state;
  }
  return { state: state!, log };
}

export async function createSave(repo: IGameRepo, userId: string, raw: unknown) {
  const { state, log } = await replay(repo, raw);
  await repo.createSave(userId, state, log);
  return state;
}

export async function applyAndCommit(repo: IGameRepo, userId: string, saveId: string, actionId: string, rawAction: unknown, version: number) {
  const { ActionSchema } = await import("@/game/engine/schema");
  const action = ActionSchema.parse(rawAction) as Action;
  if (action.type === "start") throw new AppError("VALIDATION", "start só é aceito ao criar a partida");
  const cur = await repo.getSave(userId, saveId);
  if (!cur) throw new AppError("NOT_FOUND", "partida não encontrada");
  if (cur.actionIds.includes(actionId)) return { state: cur, duplicate: true };
  const r = apply(cur, actionId, action);
  if (!r.ok) throw new AppError("VALIDATION", r.error ?? "ação inválida");
  const c = await repo.commit(userId, saveId, version, actionId, action, r.state);
  return { state: c.duplicate ? ((await repo.getSave(userId, saveId)) ?? r.state) : r.state, duplicate: c.duplicate, note: r.note };
}

/* ───────── cenário a partir do Brasil Fiscal (dados oficiais verificados) ───────── */

import type { IQueryEngine } from "../core/interfaces";
import { aggregatePoints } from "../services/views";

export async function referenceFromBrasilFiscal(engine: IQueryEngine, code: string, year: number): Promise<ScenarioReference> {
  for (let y = year; y >= year - 2; y--) {
    const r = await engine.execute({ kind: "breakdown", entity_type: "MUNICIPALITY", entity_code: code, metric: "EXPENSE_LIQUIDATED", category_type: "FUNCTION", year_from: y, year_to: y }).catch(() => null);
    if (!r) continue;
    const saude = aggregatePoints(r.facts).find((p) => p.year === y && p.categoryCode === "10");
    if (saude && saude.value > 0) {
      return {
        healthSpending: saude.value, year: y, source: "Despesa liquidada na função Saúde (DCA Anexo I-E, Siconfi/Tesouro Nacional) via Brasil Fiscal",
        freshness: r.freshness, notice: r.notice, link: `/municipios/${code}`,
        provenance: r.provenance.map((p) => ({ source: p.sourceName, dataset: p.dataset, period: p.periodLabel, url: p.url ?? p.documentationUrl, collectedAt: p.fetchedAt })),
      };
    }
  }
  return { healthSpending: null, year: null, source: "Sem dado oficial disponível para este município", freshness: "unavailable", notice: "A fonte não retornou despesa de saúde: o valor padrão do cenário foi usado (ausência de dado não virou zero).", link: `/municipios/${code}`, provenance: [] };
}

export async function buildScenario(repo: IGameRepo, engine: IQueryEngine, m: { code: string; nome: string; uf: string | null }, year: number): Promise<Scenario> {
  const ref = await referenceFromBrasilFiscal(engine, m.code, year);
  const sc = referencedScenario(m, ref);
  const existing = await repo.getScenario(sc.hash); // o primeiro congelamento vale para todas as partidas comparáveis
  if (existing) return existing;
  await repo.putScenario(sc);
  return sc;
}
export { CASE_BY_NUM };
