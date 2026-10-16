import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameState, Scenario } from "@/game/engine/types";
import { AppError } from "../core/errors";
import { must } from "../repositories/supabase/client";

export interface SaveMetaRow { id: string; nome: string; unidade: string; caso: number; fase: string; final: string | null; atualizadoEm: string }
export interface ProfileRow { user_id: string; display_name: string; avatar: string; pseudonym: string | null; share_results: boolean }
export interface CommitResult { duplicate: boolean; version: number }

/** Persistência do jogo. A implementação Supabase usa funções SQL atômicas; a de memória serve ao modo dev e aos testes. */
export interface IGameRepo {
  getProfile(userId: string): Promise<ProfileRow | null>;
  upsertProfile(p: ProfileRow): Promise<void>;
  listSaves(userId: string): Promise<SaveMetaRow[]>;
  getSave(userId: string, id: string): Promise<GameState | null>;
  createSave(userId: string, state: GameState, actions: Array<{ id: string; action: unknown }>): Promise<void>;
  commit(userId: string, saveId: string, expected: number, actionId: string, action: unknown, state: GameState): Promise<CommitResult>;
  deleteSave(userId: string, id: string): Promise<void>;
  getScenario(hash: string): Promise<Scenario | null>;
  putScenario(s: Scenario): Promise<void>;
  takeUsage(userId: string, kind: "tts" | "ai", chars: number, maxCalls: number, maxChars: number): Promise<boolean>;
  listAchievements(userId: string): Promise<string[]>;
}

const meta = (s: GameState): SaveMetaRow => ({ id: s.id, nome: s.player.nome, unidade: s.scenario.unidade, caso: s.caso, fase: s.phase, final: s.ending?.titulo ?? null, atualizadoEm: new Date().toISOString() });

export class MemoryGameRepo implements IGameRepo {
  profiles = new Map<string, ProfileRow>();
  saves = new Map<string, { user: string; state: GameState; actionIds: Set<string>; at: string }>();
  scenarios = new Map<string, Scenario>();
  usage = new Map<string, { calls: number; chars: number }>();
  async getProfile(u: string) { return this.profiles.get(u) ?? null; }
  async upsertProfile(p: ProfileRow) { this.profiles.set(p.user_id, p); }
  async listSaves(u: string) { return [...this.saves.values()].filter((x) => x.user === u).map((x) => ({ ...meta(x.state), atualizadoEm: x.at })).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)); }
  async getSave(u: string, id: string) { const x = this.saves.get(id); return x && x.user === u ? structuredClone(x.state) : null; }
  async createSave(u: string, state: GameState, actions: Array<{ id: string }>) {
    if (this.saves.has(state.id)) throw new AppError("VALIDATION", "partida já existe");
    this.saves.set(state.id, { user: u, state: structuredClone(state), actionIds: new Set(actions.map((a) => a.id)), at: new Date().toISOString() });
  }
  async commit(u: string, id: string, expected: number, actionId: string, _a: unknown, state: GameState) {
    const x = this.saves.get(id);
    if (!x || x.user !== u) throw new AppError("NOT_FOUND", "save_not_found");
    if (x.actionIds.has(actionId)) return { duplicate: true, version: x.state.version };
    if (x.state.version !== expected) throw new AppError("VALIDATION", "version_conflict", 409);
    x.actionIds.add(actionId); x.state = structuredClone(state); x.at = new Date().toISOString();
    return { duplicate: false, version: state.version };
  }
  async deleteSave(u: string, id: string) { if (this.saves.get(id)?.user === u) this.saves.delete(id); }
  async getScenario(h: string) { return this.scenarios.get(h) ?? null; }
  async putScenario(s: Scenario) { this.scenarios.set(s.hash, s); }
  async listAchievements(u: string) { return [...new Set([...this.saves.values()].filter((x) => x.user === u).flatMap((x) => x.state.achievements))]; }
  async takeUsage(u: string, kind: string, chars: number, maxCalls: number, maxChars: number) {
    const k = `${u}:${kind}:${new Date().toISOString().slice(0, 10)}`; const c = this.usage.get(k) ?? { calls: 0, chars: 0 };
    if (c.calls + 1 > maxCalls || c.chars + chars > maxChars) return false;
    this.usage.set(k, { calls: c.calls + 1, chars: c.chars + chars }); return true;
  }
}

export class SupabaseGameRepo implements IGameRepo {
  constructor(private db: SupabaseClient) {}
  async getProfile(u: string) { return must(await this.db.from("game_profiles").select("*").eq("user_id", u).maybeSingle(), "game_profiles") as ProfileRow | null; }
  async upsertProfile(p: ProfileRow) { must(await this.db.from("game_profiles").upsert(p, { onConflict: "user_id" }).select().single(), "game_profiles.upsert"); }
  async listSaves(u: string) {
    const rows = must(await this.db.from("game_saves").select("id, phase, caso, ending_id, updated_at, state").eq("user_id", u).order("updated_at", { ascending: false }).limit(30), "game_saves") as Array<{ id: string; updated_at: string; state: GameState }>;
    return rows.map((r) => ({ ...meta(r.state), atualizadoEm: r.updated_at }));
  }
  async getSave(u: string, id: string) { const r = must(await this.db.from("game_saves").select("state").eq("user_id", u).eq("id", id).maybeSingle(), "game_saves.get") as { state: GameState } | null; return r?.state ?? null; }
  async createSave(u: string, state: GameState, actions: Array<{ id: string; action: unknown }>) {
    const { error } = await this.db.rpc("game_create_save", { p_user: u, p_save: state.id, p_scenario: state.scenario, p_state: state, p_actions: actions });
    if (error) throw new AppError(/duplicate key/.test(error.message) ? "VALIDATION" : "INTERNAL", `game_create_save: ${error.message}`);
  }
  async commit(u: string, id: string, expected: number, actionId: string, action: unknown, state: GameState) {
    const { data, error } = await this.db.rpc("game_commit_action", { p_user: u, p_save: id, p_expected: expected, p_action_id: actionId, p_action: action, p_state: state });
    if (error) {
      if (/version_conflict/.test(error.message)) throw new AppError("VALIDATION", "version_conflict", 409);
      if (/save_not_found/.test(error.message)) throw new AppError("NOT_FOUND", "save_not_found");
      throw new AppError("INTERNAL", `game_commit_action: ${error.message}`);
    }
    return data as CommitResult;
  }
  async deleteSave(u: string, id: string) { must(await this.db.from("game_saves").delete().eq("user_id", u).eq("id", id).select(), "game_saves.delete"); }
  async getScenario(h: string) { const r = must(await this.db.from("game_scenarios").select("data").eq("hash", h).maybeSingle(), "game_scenarios") as { data: Scenario } | null; return r?.data ?? null; }
  async putScenario(s: Scenario) { must(await this.db.from("game_scenarios").upsert({ hash: s.hash, scenario_id: s.id, kind: s.kind, data: s }, { onConflict: "hash", ignoreDuplicates: true }).select(), "game_scenarios.put"); }
  async listAchievements(u: string) { return (must(await this.db.from("game_achievements").select("achievement_id").eq("user_id", u), "game_achievements") as Array<{ achievement_id: string }>).map((r) => r.achievement_id); }
  async takeUsage(u: string, kind: "tts" | "ai", chars: number, maxCalls: number, maxChars: number) {
    const { data, error } = await this.db.rpc("game_usage_take", { p_user: u, p_kind: kind, p_chars: chars, p_max_calls: maxCalls, p_max_chars: maxChars });
    if (error) throw new AppError("INTERNAL", `game_usage_take: ${error.message}`);
    return !!data;
  }
}
