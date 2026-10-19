/**
 * MEUS 10% — tipos do motor de regras.
 * Nada aqui conhece React, Three.js, áudio ou Supabase: o motor é puro e roda igual no navegador (modo convidado)
 * e no servidor (validação das ações de quem tem conta).
 */

export const RULES_VERSION = "meus10-regras-1.0.0";
export const CONTENT_VERSION = "upa-2026.10";
/** Teto do desvio fictício, por evento e acumulado (seção 7 do documento). */
export const MAX_DEVIATION_PCT = 10;

export type Classification = "oficial" | "estimativa" | "simulado";

export type CharId = "joana" | "celia" | "guardiao" | "toninho" | "juninho" | "roberto" | "ana" | "bento" | "cornelio" | "marlene" | "valdemar" | "voce" | "lucia" | "nelson" | "rita" | "edu"
  | "heitor" | "osvaldo" | "sonia" | "teodoro" | "leandro" | "iara" | "cecilia" | "ramiro" | "pedro" | "augusto" | "helena" | "goncalo" | "vivian" | "claudio" | "estevao";
export const LOCATION_IDS = ["recepcao", "farmacia", "enfermagem", "administracao", "cofre", "patio", "secretaria", "planejamento", "prefeitura", "camara", "ubs",
  // nível 3 — Consórcio Regional
  "consorcio", "cir", "hospregional", "vizinho", "transporte",
  // nível 4 — Secretaria Estadual
  "gabinete-estadual", "painel-regioes", "assembleia", "canteiro", "tribunal",
  // nível 5 — Órgão Federal
  "diretoria", "sala-programas", "comissao-congresso", "controladoria", "almoxarifado-nacional",
  // nível 6 — Ministério
  "gabinete-ministro", "sala-crise", "casa-governo", "plenario", "fazenda",
  // nível 7 — Topo do poder
  "comite-campanha", "estudio-debate", "praca-comicio", "palacio-presidencial", "sala-situacao-nacional",
] as const;
export type LocationId = (typeof LOCATION_IDS)[number];
export type AttrKey = "competencia" | "rede" | "persuasao" | "confianca" | "conhecimento" | "popularidade" | "caraDePau";
export type PubKey = "qualidade" | "acesso" | "equipe" | "sustentabilidade";
export type ConceptId =
  | "medir-antes" | "gargalo" | "custo-total" | "corte-linear" | "entrega-vs-anuncio"
  | "execucao-despesa" | "controle-interno" | "conflito-interesses" | "reserva-urgencia" | "transparencia"
  | "planejamento-necessidade" | "emenda-custeio" | "compra-compartilhada" | "fila-regulada" | "folha-sustentavel" | "credito-adicional" | "emergencia-transparencia" | "audiencia-publica"
  | "consorcio-rateio" | "pactuacao-regional" | "transporte-sanitario" | "contrato-gestao" | "localizacao-regional" | "controle-social-regional"
  | "equidade-regional" | "obra-parada" | "sobrepreco-obra" | "fundo-a-fundo" | "parceria-gestao" | "controle-externo"
  | "programa-metas" | "repasse-condicionado" | "convenio-prestacao" | "compra-nacional" | "monitoramento-avaliacao" | "tomada-contas-especial"
  | "regra-fiscal" | "contingenciamento" | "emenda-transparente" | "prioridade-nacional" | "crise-sanitaria-nacional" | "coalizao-limites"
  | "plano-de-governo" | "debate-publico" | "financiamento-campanha" | "eleicao-limites" | "posse-prioridades" | "legado-prestacao";
export type PenGesture = "assinar" | "recusar" | "esclarecer" | "parecer";
export type OptionKind = "competente" | "prudente" | "comodo" | "fraco" | "desvio";
export type Emotion = "neutro" | "feliz" | "serio" | "irritado" | "surpreso" | "triste" | "irônico" | "preocupado";

/* ───────────── Cenário (dados de referência congelados na partida) ───────────── */

export interface ScenarioReference {
  /** Total de saúde (função 10) liquidado pelo município — dado OFICIAL, usado só como referência. */
  healthSpending: number | null;
  year: number | null;
  source: string;
  freshness: string;
  notice: string | null;
  provenance: Array<{ source: string; dataset: string | null; period: string | null; url: string | null; collectedAt: string | null }>;
  /** link para "Ver os dados reais" no Brasil Fiscal */
  link: string | null;
}

export interface Scenario {
  id: string;
  /** hash do conteúdo congelado — partidas comparáveis usam o mesmo hash */
  hash: string;
  kind: "ficticio" | "referenciado";
  municipio: { code: string | null; nome: string; uf: string | null };
  unidade: string;
  /** Orçamento anual da UPA: SEMPRE estimativa didática. */
  orcamentoAnual: number;
  orcamentoClassificacao: Classification;
  orcamentoNota: string;
  reference: ScenarioReference | null;
  congeladoEm: string;
}

/* ───────────── Estado da partida ───────────── */

export interface Ledger {
  id: string;
  caso: number;
  escopo: "publico" | "pessoal";
  tipo: "custo" | "economia" | "corte" | "receita" | "desvio" | "restituicao" | "remuneracao" | "compra" | "obrigacao";
  valor: number; // com sinal: >0 entra, <0 sai
  rotulo: string;
  decisionId?: string;
  classificacao: Classification;
}

export interface Pending {
  id: string;
  decisionId: string;
  optionId: string;
  dueCase: number; // aplica ao ENTRAR neste caso
  effects: Effects;
  title: string;
  message: string;
  reason: string;
  tone: "bom" | "ruim" | "neutro";
}

export interface Consequence { id: string; caso: number; title: string; message: string; reason: string; tom: "bom" | "ruim" | "neutro"; delayed: boolean; decisionId: string }

export interface DecisionRecord {
  id: string; // decisionId
  actionId: string;
  caso: number;
  optionId: string;
  kind: OptionKind;
  title: string;
  optionLabel: string;
  baseElegivel: number;
  desvioPct: number;
  desvioValor: number;
  custo: number;
  economia: number;
  receita: number;
  deliberado: boolean;
  gesture: PenGesture;
  concept: ConceptId;
  aplicouConceitos: ConceptId[];
  consequences: Consequence[];
}

export interface NotebookEntry {
  id: string;
  decisionId: string;
  caso: number;
  tema: string;
  problema: string;
  decisao: string;
  resultado: string;
  conceito: ConceptId;
  conceitoTitulo: string;
  conceitoTexto: string;
  aplicacao: string;
  fonte: { rotulo: string; url: string | null; classificacao: Classification };
  dificuldade: 1 | 2 | 3;
  versao: string;
  favorito: boolean;
}

export interface Attrs extends Record<AttrKey, number> {}
export interface Pub { qualidade: number; acesso: number; equipe: number; sustentabilidade: number; estoqueDias: number; filaMin: number; caixa: number }
export interface Personal { patrimonio: number; remuneracao: number; desviado: number; restituido: number; baseAcumulada: number; evidencias: number; dependencia: number; influencia: number }

export interface Effects {
  attrs?: Partial<Record<AttrKey, number>>;
  pub?: Partial<Record<PubKey, number>>;
  estoqueDias?: number;
  filaMin?: number;
  rel?: Partial<Record<CharId, number>>;
  favor?: Partial<Record<CharId, number>>;
  evidencias?: number;
  dependencia?: number;
  influencia?: number;
  /** variação direta do caixa público, em % do orçamento anual (negativo = custo adicional) */
  caixaPct?: number;
}

export interface Relation { confianca: number; favor: number; conhecido: boolean }

export interface ConversationRecord { choices: string[]; at: number }

export interface EndingResult {
  id: "reconhecimento" | "responsabilizacao" | "gestao-insuficiente" | "balanco-parcial" | "presidencia" | "imperador";
  titulo: string;
  reparado: boolean;
  motivos: string[];
  poder: number;
  trambicagem: number;
  legado: number;
  /** bens perdidos na responsabilização (ilícito não restituído + multa fictícia de 20%) e patrimônio final */
  bensPerdidos: number;
  patrimonioFinal: number;
  promocao: { elegivel: boolean; viaRede?: boolean; criterios: Array<{ rotulo: string; ok: boolean; detalhe: string }> };
}

/** Registro de um nível já concluído (a carreira acumula níveis). */
export interface LevelRecord { nivel: number; cargo: string; ending: EndingResult; pub: Pub; attrs: Attrs; decisoes: number }

export type Phase = "inicio" | "quiz" | "jogando" | "encerrada" | "abandonada";

export interface GameState {
  v: 1;
  /** nível da carreira em andamento (1 = Administrador de UPA, 2 = Secretário Municipal…). Partidas antigas sem o campo valem 1. */
  nivel: number;
  historico: LevelRecord[];
  /** eleição simulada do nível 7 (ausente até ser disputada) */
  eleicao?: { pct: number; venceu: boolean };
  id: string;
  version: number;
  rulesVersion: string;
  contentVersion: string;
  scenario: Scenario;
  seed: number;
  player: { nome: string; avatar: string };
  phase: Phase;
  quizStep: number;
  quizAnswers: Record<string, string>;
  caso: number; // índice do caso atual
  casoAberto: boolean; // decisão do caso já tomada? (false = ainda a decidir)
  location: LocationId;
  visited: LocationId[];
  attrs: Attrs;
  pub: Pub;
  personal: Personal;
  rel: Partial<Record<CharId, Relation>>;
  clues: Record<string, { caso: number; at: number }>;
  findings: Record<string, { via: "confronto" | "conhecimento"; at: number }>;
  talked: Record<string, ConversationRecord>;
  negociacoes: Record<string, { pontos: number; criterios: string[] }>;
  decisions: DecisionRecord[];
  ledger: Ledger[];
  pending: Pending[];
  consequences: Consequence[];
  notebook: NotebookEntry[];
  knowledge: Record<string, { aprendidoEm: number; aplicadoEm: string[] }>;
  achievements: string[];
  repairs: Array<{ id: string; valor: number; caso: number }>;
  ending: EndingResult | null;
  actionIds: string[];
  actions: Array<{ id: string; action: Action }>;
  steps: number; // interações significativas (para ritmo de sessão)
}

/* ───────────── Ações (única forma de mudar o estado) ───────────── */

export type Action =
  | { type: "start"; playerName: string; avatar: string; scenario: Scenario; seed: number; gameId: string }
  | { type: "quiz.answer"; questionId: string; optionId: string }
  | { type: "go"; location: LocationId }
  | { type: "inspect"; clueId: string }
  | { type: "talk"; conversationId: string; choices: string[] }
  | { type: "confront"; a: string; b: string }
  | { type: "argue"; negotiationId: string; text: string }
  | { type: "decide"; decisionId: string; optionId: string; deviationPct?: number; confirmDeviation?: boolean }
  | { type: "advance" }
  | { type: "repair"; valor: number }
  | { type: "favorite"; entryId: string }
  | { type: "promote" }
  /** joga de novo a fase que acabou de terminar (volta ao início dela; fases anteriores e histórico ficam) */
  | { type: "replay" }
  | { type: "abandon" };

export interface ActionResult { state: GameState; ok: boolean; duplicate?: boolean; error?: string; note?: string }
