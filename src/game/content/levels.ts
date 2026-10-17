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
  3: {
    nivel: 3, cargo: "Articulador(a) Regional de Saúde", cargoCurto: "Consórcio", primeiro: 19, ultimo: 24,
    locais: ["consorcio", "cir", "hospregional", "vizinho", "transporte"], inicial: "consorcio", salario: 24_000,
    rotulos: { fila: { nome: "Espera por transferência", un: " h", ajuda: "tempo médio até a transferência de pacientes entre municípios" }, estoque: { nome: "Insumos", un: " d" }, unidade: "Consórcio" },
    inicio: { qualidade: 54, acesso: 46, equipe: 55, sustentabilidade: 56, estoqueDias: 14, filaMin: 30, caixaPct: 16 },
    proximo: "Secretário(a) Estadual de Saúde", desafio: "Negociação entre municípios e pactos de cooperação",
  },
  4: {
    nivel: 4, cargo: "Secretário(a) Estadual de Saúde", cargoCurto: "Estado", primeiro: 25, ultimo: 30,
    locais: ["gabinete-estadual", "painel-regioes", "assembleia", "canteiro", "tribunal"], inicial: "gabinete-estadual", salario: 34_000,
    rotulos: { fila: { nome: "Espera por cirurgia eletiva", un: " dias", ajuda: "tempo médio de espera por cirurgia eletiva na rede estadual" }, estoque: { nome: "Insumos", un: " d" }, unidade: "Secretaria Estadual" },
    inicio: { qualidade: 54, acesso: 47, equipe: 54, sustentabilidade: 55, estoqueDias: 15, filaMin: 110, caixaPct: 15 },
    proximo: "Diretor(a) de Órgão Federal", desafio: "Projetos maiores, desigualdades regionais e execução",
  },
  5: {
    nivel: 5, cargo: "Diretor(a) de Órgão Federal", cargoCurto: "Federal", primeiro: 31, ultimo: 36,
    locais: ["diretoria", "sala-programas", "comissao-congresso", "controladoria", "almoxarifado-nacional"], inicial: "diretoria", salario: 46_000,
    rotulos: { fila: { nome: "Atraso médio dos repasses", un: " dias", ajuda: "dias médios entre a liberação e a chegada do repasse" }, estoque: { nome: "Estoque nacional", un: " d" }, unidade: "Agência Federal" },
    inicio: { qualidade: 55, acesso: 48, equipe: 54, sustentabilidade: 55, estoqueDias: 20, filaMin: 45, caixaPct: 14 },
    proximo: "Ministro(a) de Estado", desafio: "Programas, prestação de contas e coordenação",
  },
  6: {
    nivel: 6, cargo: "Ministro(a) de Estado da Saúde", cargoCurto: "Ministério", primeiro: 37, ultimo: 42,
    locais: ["gabinete-ministro", "sala-crise", "casa-governo", "plenario", "fazenda"], inicial: "gabinete-ministro", salario: 62_000,
    rotulos: { fila: { nome: "Fila nacional de espera", un: " dias", ajuda: "tempo médio de espera por especialista no país" }, estoque: { nome: "Estoque estratégico", un: " d" }, unidade: "Ministério" },
    inicio: { qualidade: 55, acesso: 49, equipe: 54, sustentabilidade: 52, estoqueDias: 25, filaMin: 95, caixaPct: 12 },
    proximo: "Presidência da República", desafio: "Agenda nacional, conflitos de prioridades e crise fiscal",
  },
  7: {
    nivel: 7, cargo: "Candidato(a) e Presidente da República (simulado)", cargoCurto: "Presidência", primeiro: 43, ultimo: 48,
    locais: ["comite-campanha", "estudio-debate", "praca-comicio", "palacio-presidencial", "sala-situacao-nacional"], inicial: "comite-campanha", salario: 80_000,
    rotulos: { fila: { nome: "Fila nacional de espera", un: " dias", ajuda: "tempo médio de espera por especialista no país" }, estoque: { nome: "Estoque estratégico", un: " d" }, unidade: "Presidência" },
    inicio: { qualidade: 56, acesso: 50, equipe: 54, sustentabilidade: 52, estoqueDias: 25, filaMin: 90, caixaPct: 12 },
    proximo: null, desafio: "Desfecho da carreira e prestação de contas final",
  },
};


export const nivelDe = (s: { nivel?: number }) => s.nivel ?? 1;
export const levelOf = (s: { nivel?: number }) => LEVELS[nivelDe(s)] ?? LEVELS[1]!;
export const nivelDoCaso = (caso: number) => Number(Object.values(LEVELS).find((l) => caso >= l.primeiro && caso <= l.ultimo)?.nivel ?? 1);
export const casosDoNivel = (n: number) => { const l = LEVELS[n]!; return l.ultimo - l.primeiro + 1; };
export const decisoesDoNivel = (s: Pick<GameState, "decisions">, n: number) => s.decisions.filter((d) => d.caso >= LEVELS[n]!.primeiro && d.caso <= LEVELS[n]!.ultimo);
/** "Episódio 3 de 8" para o caso atual, dentro do nível. */
export const posicaoNoNivel = (s: { nivel?: number; caso: number }) => { const l = levelOf(s); return { n: Math.min(s.caso, l.ultimo) - l.primeiro + 1, de: casosDoNivel(l.nivel) }; };
