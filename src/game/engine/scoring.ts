import { clamp, r2 } from "./money";
import { levelOf, nivelDe } from "../content/levels";
import type { Attrs, GameState } from "./types";

/** Pesos da Pontuação de Poder (seção 7 do documento). Regras propostas, sujeitas a balanceamento. */
export const POWER_WEIGHTS: Record<keyof Attrs, number> = {
  competencia: 0.3, rede: 0.2, persuasao: 0.15, confianca: 0.15, conhecimento: 0.1, popularidade: 0.05, caraDePau: 0.05,
};

export const powerScore = (a: Attrs): number => r2(Object.entries(POWER_WEIGHTS).reduce((s, [k, w]) => s + a[k as keyof Attrs] * w, 0));

/** Índice de Trambicagem: média ponderada pelos valores (desviado ÷ base elegível acumulada), limitado a 10%. */
export function trambicagem(s: Pick<GameState, "personal">): number {
  const { desviado, baseAcumulada } = s.personal;
  if (baseAcumulada <= 0 || desviado <= 0) return 0;
  return r2(Math.min(10, (desviado / baseAcumulada) * 100));
}

export const economiaTotal = (s: GameState) => r2(s.ledger.filter((l) => l.tipo === "economia").reduce((a, b) => a + b.valor, 0));
export const custosTotal = (s: GameState) => r2(-s.ledger.filter((l) => l.escopo === "publico" && l.tipo === "custo" && l.valor < 0).reduce((a, b) => a + b.valor, 0));

/** Gestão de recursos (0–100): sustentabilidade fiscal + economia VERIFICADA (corte de atendimento não entra). */
export function gestaoRecursos(s: GameState): number {
  const meta = s.scenario.orcamentoAnual * 0.02;
  const eco = clamp((economiaTotal(s) / meta) * 100);
  return r2(clamp(s.pub.sustentabilidade * 0.6 + eco * 0.4));
}

export const qualidadeAcesso = (s: GameState) => r2((s.pub.qualidade + s.pub.acesso) / 2);

/** Índice de legado: 35% qualidade e acesso · 25% gestão de recursos · 20% confiança · 20% conhecimento aplicado. */
export function legado(s: GameState): number {
  return r2(qualidadeAcesso(s) * 0.35 + gestaoRecursos(s) * 0.25 + s.attrs.confianca * 0.2 + s.attrs.conhecimento * 0.2);
}

export const aplicadosTotal = (s: GameState) => Object.values(s.knowledge).reduce((a, k) => a + k.aplicadoEm.length, 0);
export const deviosDeliberados = (s: GameState) => s.decisions.filter((d) => d.deliberado);

/** Mundo visual (derivado, nunca o contrário): a apresentação lê estes níveis para mostrar fila, estoque, luxo e degradação. */
export function worldView(s: GameState) {
  const fila = s.pub.filaMin;
  const dias = nivelDe(s) >= 2; // a partir do nível 2 a "fila" tem outra unidade: a gravidade é relativa ao valor inicial do nível
  const rel = dias ? fila / (levelOf(s).inicio.filaMin / 62) : fila;
  return {
    filaNivel: dias ? (rel > 90 ? 4 : rel > 60 ? 3 : rel > 40 ? 2 : rel > 25 ? 1 : 0) : fila > 110 ? 4 : fila > 80 ? 3 : fila > 55 ? 2 : fila > 35 ? 1 : 0,
    estoqueNivel: s.pub.estoqueDias < 5 ? 0 : s.pub.estoqueDias < 9 ? 1 : s.pub.estoqueDias < 14 ? 2 : 3,
    luxoNivel: s.personal.patrimonio > 600_000 ? 3 : s.personal.patrimonio > 250_000 ? 2 : s.personal.patrimonio > 90_000 ? 1 : 0,
    degradacao: s.pub.qualidade < 40 ? 2 : s.pub.qualidade < 58 ? 1 : 0,
    melhoria: s.pub.qualidade >= 75 && s.pub.acesso >= 70 ? 2 : s.pub.qualidade >= 62 ? 1 : 0,
    equipeNivel: s.pub.equipe < 35 ? 0 : s.pub.equipe < 60 ? 1 : 2,
    obraConcluida: s.decisions.some((d) => d.id === "d5" && ["corrigir-cronograma", "inauguracao-parcial"].includes(d.optionId)) && s.caso > 6,
  };
}
export type WorldView = ReturnType<typeof worldView>;
