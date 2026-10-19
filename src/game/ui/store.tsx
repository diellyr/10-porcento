"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { audio, AUDIO_DEFAULTS, type AudioSettings } from "../audio/AudioManager";
import { apply, migrarEstado } from "../engine/rules";
import type { Action, GameState } from "../engine/types";

export interface Settings extends AudioSettings { reduzirMovimento: boolean; qualidade3d: "auto" | "alta" | "media" | "baixa" | "2d"; altoContraste: boolean; textoGrande: boolean }
export const SETTINGS_DEFAULTS: Settings = { ...AUDIO_DEFAULTS, reduzirMovimento: false, qualidade3d: "auto", altoContraste: false, textoGrande: false };

export interface SessionInfo { logado: boolean; email: string | null; nome: string | null; avatar: string | null; supabase: boolean; tts: boolean }
export interface SaveMeta { id: string; nome: string; unidade: string; caso: number; fase: string; final: string | null; atualizadoEm: string; origem: "local" | "conta" }
export type SyncStatus = "local" | "sincronizado" | "pendente" | "erro";

const K_SETTINGS = "meus10:config", K_INDEX = "meus10:saves", K_SAVE = (id: string) => `meus10:save:${id}`, K_ACTIVE = "meus10:ativo";

const safe = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* armazenamento indisponível: segue sem persistir */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* idem */ } },
};

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

function readIndex(): SaveMeta[] { try { return JSON.parse(safe.get(K_INDEX) ?? "[]") as SaveMeta[]; } catch { return []; } }
export function metaOf(s: GameState, origem: SaveMeta["origem"] = "local"): SaveMeta {
  return { id: s.id, nome: s.player.nome, unidade: s.scenario.unidade, caso: s.caso, fase: s.phase, final: s.ending?.titulo ?? null, atualizadoEm: new Date().toISOString(), origem };
}
export function loadLocal(id: string): GameState | null {
  try { const s = JSON.parse(safe.get(K_SAVE(id)) ?? "null") as GameState | null; return s && s.v === 1 ? migrarEstado(s) : null; } catch { return null; }
}
function saveLocal(s: GameState) {
  safe.set(K_SAVE(s.id), JSON.stringify(s));
  const idx = readIndex().filter((m) => m.id !== s.id); idx.unshift(metaOf(s));
  safe.set(K_INDEX, JSON.stringify(idx.slice(0, 20)));
  safe.set(K_ACTIVE, s.id);
}
export function deleteLocal(id: string) { safe.del(K_SAVE(id)); safe.set(K_INDEX, JSON.stringify(readIndex().filter((m) => m.id !== id))); if (safe.get(K_ACTIVE) === id) safe.del(K_ACTIVE); }

interface Ctx {
  state: GameState | null;
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  session: SessionInfo;
  sync: SyncStatus;
  saves: SaveMeta[];
  /** única porta de entrada para mudar o jogo: aplica o motor localmente e (com conta) valida no servidor */
  dispatch: (a: Action) => { ok: boolean; error?: string; note?: string; state: GameState | null };
  load: (id: string, origem?: "local" | "conta") => Promise<boolean>;
  close: () => void;
  refreshSaves: () => Promise<void>;
  removeSave: (m: SaveMeta) => Promise<void>;
  setSession: (s: SessionInfo) => void;
}
const C = createContext<Ctx | null>(null);
export const useGame = () => { const c = useContext(C); if (!c) throw new Error("useGame fora do GameProvider"); return c; };

const NO_SESSION: SessionInfo = { logado: false, email: null, nome: null, avatar: null, supabase: false, tts: false };

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [settings, setSettingsState] = useState<Settings>(SETTINGS_DEFAULTS);
  const [session, setSession] = useState<SessionInfo>(NO_SESSION);
  const [sync, setSync] = useState<SyncStatus>("local");
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const ref = useRef<GameState | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    try { setSettingsState({ ...SETTINGS_DEFAULTS, ...(JSON.parse(safe.get(K_SETTINGS) ?? "{}") as Partial<Settings>) }); } catch { /* usa padrão */ }
    setSaves(readIndex());
    void fetch("/api/game/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j: SessionInfo | null) => { if (j) setSession(j); }).catch(() => undefined);
  }, []);
  useEffect(() => { audio.set(settings); }, [settings]);
  useEffect(() => {
    document.documentElement.classList.toggle("g-large-text", settings.textoGrande);
  }, [settings.textoGrande]);

  const setSettings = useCallback((p: Partial<Settings>) => {
    setSettingsState((prev) => { const n = { ...prev, ...p }; safe.set(K_SETTINGS, JSON.stringify(n)); return n; });
  }, []);

  const pushServer = useCallback((s: GameState, id: string, action: Action) => {
    if (!sessionRef.current.logado) return;
    setSync("pendente");
    queue.current = queue.current.then(async () => {
      try {
        const body = action.type === "start" ? { gameId: s.id, actions: s.actions } : { id, action, version: s.version - 1 };
        const url = action.type === "start" ? "/api/game/saves" : `/api/game/saves/${s.id}/actions`;
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { state?: GameState };
        // o servidor é a autoridade: se divergir (regras diferentes), adota o estado validado
        if (j.state && ref.current && j.state.id === ref.current.id && j.state.version === ref.current.version && JSON.stringify(j.state.ending) !== JSON.stringify(ref.current.ending)) { const m = migrarEstado(j.state); ref.current = m; setState(m); saveLocal(m); }
        setSync("sincronizado");
      } catch { setSync("erro"); }
    });
  }, []);

  const dispatch = useCallback<Ctx["dispatch"]>((a) => {
    const id = uid();
    const r = apply(ref.current, id, a);
    if (!r.ok) return { ok: false, error: r.error, state: ref.current };
    if (r.duplicate) return { ok: true, state: r.state };
    ref.current = r.state; setState(r.state); saveLocal(r.state); setSaves(readIndex());
    pushServer(r.state, id, a);
    return { ok: true, note: r.note, state: r.state };
  }, [pushServer]);

  const refreshSaves = useCallback(async () => {
    const local = readIndex();
    let remote: SaveMeta[] = [];
    if (sessionRef.current.logado) {
      try { const r = await fetch("/api/game/saves", { cache: "no-store" }); if (r.ok) remote = ((await r.json()) as { saves: SaveMeta[] }).saves.map((m) => ({ ...m, origem: "conta" as const })); } catch { /* offline */ }
    }
    const ids = new Set(remote.map((m) => m.id));
    setSaves([...remote, ...local.filter((m) => !ids.has(m.id))].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)));
  }, []);
  useEffect(() => { void refreshSaves(); }, [session.logado, refreshSaves]);

  const load = useCallback(async (id: string, origem: "local" | "conta" = "local") => {
    let s: GameState | null = null;
    if (origem === "conta") { try { const r = await fetch(`/api/game/saves/${id}`, { cache: "no-store" }); if (r.ok) s = ((await r.json()) as { state: GameState }).state; } catch { /* usa local */ } }
    s = migrarEstado(s) ?? loadLocal(id);
    if (!s) return false;
    ref.current = s; setState(s); safe.set(K_ACTIVE, id); setSync(sessionRef.current.logado ? "sincronizado" : "local");
    return true;
  }, []);
  const close = useCallback(() => { ref.current = null; setState(null); void refreshSaves(); }, [refreshSaves]);
  const removeSave = useCallback(async (m: SaveMeta) => {
    deleteLocal(m.id);
    if (m.origem === "conta") await fetch(`/api/game/saves/${m.id}`, { method: "DELETE" }).catch(() => undefined);
    await refreshSaves();
  }, [refreshSaves]);

  const value = useMemo<Ctx>(() => ({ state, settings, setSettings, session, sync, saves, dispatch, load, close, refreshSaves, removeSave, setSession }), [state, settings, setSettings, session, sync, saves, dispatch, load, close, refreshSaves, removeSave]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
