import type { GameState, LocationId } from "../engine/types";

/** Níveis da carreira (seção 6 do documento). Cada nível tem seus casos, locais e rótulos de indicadores. */
export interface LevelDef {
  nivel: number;
  cargo: string;
  cargoCurto: string;
  /** primeiro e último número de caso (numeração global da carreira) */
  primeiro: number;
  ultimo: number;
  locais: LocationId[];
  inicial: LocationId;
  /** remuneração mensal fictícia do cargo (por caso) */
  salario: number;
  /** como os indicadores comuns aparecem neste nível */
  rotulos: { fila: { nome: string; un: string; ajuda: string }; estoque: { nome: string; un: string }; unidade: string };
  /** valores iniciais dos indicadores do nível (% do orçamento no caixa) */
  inicio: { qualidade: number; acesso: number; equipe: number; sustentabilidade: number; estoqueDias: number; filaMin: number; caixaPct: number };
  /** próximo cargo (null = fim do que está construído) */
  proximo: string | null;
  /** o que o nível exige para promover (texto curto para o desfecho) */
  desafio: string;
}

export const LEVELS: Record<number, LevelDef> = {
  1: {
    nivel: 1, cargo: "Administrador(a) de UPA", cargoCurto: "UPA", primeiro: 1, ultimo: 10,
    locais: ["recepcao", "farmacia", "enfermagem", "administracao", "cofre", "patio"], inicial: "recepcao", salario: 9_800,
    rotulos: { fila: { nome: "Espera", un: " min", ajuda: "tempo médio de espera por atendimento" }, estoque: { nome: "Estoque", un: " d" }, unidade: "UPA" },
    inicio: { qualidade: 50, acesso: 45, equipe: 55, sustentabilidade: 60, estoqueDias: 7, filaMin: 94, caixaPct: 20 },
    proximo: "Secretário(a) Municipal de Saúde", desafio: "Estoques, equipe, atendimento e primeiros contratos",
  },
  2: {
    nivel: 2, cargo: "Secretário(a) Municipal de Saúde", cargoCurto: "Secretaria", primeiro: 11, ultimo: 18,
    locais: ["secretaria", "planejamento", "prefeitura", "camara", "ubs"], inicial: "secretaria", salario: 16_500,
    rotulos: { fila: { nome: "Espera por consulta", un: " dias", ajuda: "tempo médio de espera por consulta com especialista" }, estoque: { nome: "Insumos", un: " d" }, unidade: "Secretaria" },
    inicio: { qualidade: 52, acesso: 48, equipe: 56, sustentabilidade: 58, estoqueDias: 12, filaMin: 62, caixaPct: 18 },
    proximo: "Articulador(a) Regional", desafio: "Prioridades de serviços, planejamento e articulação local",
  },
};

export const MAX_NIVEL_DISPONIVEL = 2;
export const nivelDe = (s: { nivel?: number }) => s.nivel ?? 1;
export const levelOf = (s: { nivel?: number }) => LEVELS[nivelDe(s)] ?? LEVELS[1]!;
export const nivelDoCaso = (caso: number) => Number(Object.values(LEVELS).find((l) => caso >= l.primeiro && caso <= l.ultimo)?.nivel ?? 1);
export const casosDoNivel = (n: number) => { const l = LEVELS[n]!; return l.ultimo - l.primeiro + 1; };
export const decisoesDoNivel = (s: Pick<GameState, "decisions">, n: number) => s.decisions.filter((d) => d.caso >= LEVELS[n]!.primeiro && d.caso <= LEVELS[n]!.ultimo);
/** "Episódio 3 de 8" para o caso atual, dentro do nível. */
export const posicaoNoNivel = (s: { nivel?: number; caso: number }) => { const l = levelOf(s); return { n: Math.min(s.caso, l.ultimo) - l.primeiro + 1, de: casosDoNivel(l.nivel) }; };
