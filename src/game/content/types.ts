import type { AttrKey, CharId, Classification, ConceptId, Effects, Emotion, GameState, LocationId, OptionKind, PenGesture } from "../engine/types";

/** Contexto para textos dinâmicos: valores sempre proporcionais ao orçamento (estimado) do cenário. */
export interface Ctx {
  A: number;
  unidade: string;
  municipio: string;
  nome: string;
  /** R$ correspondente a `pct`% do orçamento anual (arredondado para legibilidade) */
  money: (pct: number) => string;
  /** valor bruto de pct% do orçamento */
  val: (pct: number) => number;
  state: GameState | null;
}
export type Txt = string | ((c: Ctx) => string);

export interface VoiceProfile {
  /** direção de atuação (NÃO é um ID de fornecedor) */
  direcao: string;
  /** ajustes da voz provisória do navegador */
  rate: number;
  pitch: number;
  /** nome da variável de ambiente com o ID da voz no fornecedor (ex.: TTS_VOICE_GUARDIAO) */
  envVar: string;
  genero: "f" | "m";
}

export interface Look {
  pele: string;
  peleSombra: string;
  cabelo: string;
  cabeloEstilo: "curto" | "coque" | "cacheado" | "ralo" | "topete" | "bob" | "liso" | "careca" | "penteado" | "branco";
  barba?: "bigode" | "barba" | "cavanhaque";
  oculos?: "redondo" | "meia-lua" | "quadrado" | "escuro";
  roupa: string;
  roupa2: string;
  roupaTipo: "jaleco" | "blusa" | "terno" | "camisa" | "bomber" | "blazer" | "suéter" | "colete";
  idade: number;
  olhos: string;
  /** altura relativa do rosto (0.92–1.08), usada igualmente no 2D e no 3D */
  rosto: number;
}

export interface Character {
  id: CharId;
  nome: string;
  papel: string;
  /** frase de interesse mostrada na agenda */
  interesse: string;
  cor: string;
  voz: VoiceProfile;
  look: Look;
  /** disponível nos níveis já construídos (1 e 2) */
  naUpa: boolean;
}

export interface HotspotDef {
  id: string;
  kind: "pista" | "pessoa" | "porta" | "mesa";
  /** retângulo no viewBox 1200×675 da cena */
  x: number; y: number; w: number; h: number;
  rotulo: string;
  ref: string; // clueId | conversationId | LocationId | "decisao"
  icone: string;
}

export interface LocationDef {
  id: LocationId;
  nome: string;
  curto: string;
  descricao: string;
  /** posição no mapa da UPA (viewBox 1000×620) */
  mapa: { x: number; y: number; w: number; h: number };
  hotspots: HotspotDef[];
}

export interface ClueDef {
  id: string;
  caso: number;
  location: LocationId;
  titulo: string;
  tipo: "documento" | "dado" | "opiniao" | "objeto";
  confiabilidade: "confirmada" | "incompleta" | "opiniao";
  icone: string;
  texto: Txt;
  /** linhas de tabela opcionais */
  tabela?: (c: Ctx) => Array<[string, string]>;
  fonte: { rotulo: string; classificacao: Classification; url?: string };
  /** conteúdo dinâmico a partir do estado da partida (ex.: registros do trimestre) */
  dinamico?: (c: Ctx) => string;
}

export interface FindingDef {
  id: string;
  caso: number;
  a: string;
  b: string;
  titulo: string;
  texto: Txt;
  /** conhecimento APLICADO que reconhece o padrão sem precisar do confronto */
  autoPorConhecimento?: ConceptId[];
}

export interface ConvChoice { id: string; label: string; next: string; fx?: Effects; revela?: string[] }
export interface ConvNode { who: CharId; emo: Emotion; text: Txt; next?: string; choices?: ConvChoice[]; fx?: Effects; revela?: string[] }
export interface ConversationDef {
  id: string;
  caso: number;
  location: LocationId;
  who: CharId;
  titulo: string;
  start: string;
  nodes: Record<string, ConvNode>;
  /** conversas importantes usam rosto 3D */
  apresentacao: "2d" | "3d";
  /** abre automaticamente ao iniciar o caso */
  auto?: boolean;
  /** negociação com o Guardião: depois da conversa, o jogador pode argumentar em texto livre */
  negociacao?: string;
}

export interface NegotiationDef {
  id: string;
  pedido: Txt;
  /** critérios da rubrica (visível ao jogador): cada um vale 1 ponto, calculado pelo MOTOR */
  criterios: Array<{ id: string; rotulo: string; dica: string; palavras: string[][] }>;
  respostas: { fraca: Txt; media: Txt; forte: Txt };
}

export interface OptionPreview {
  custo: Txt;
  prazo: string;
  riscos: Array<{ texto: Txt; precisa?: string }>;
  ganho?: Txt;
}

export interface OptionDef {
  id: string;
  rotulo: string;
  resumo: Txt;
  kind: OptionKind;
  gesto: PenGesture;
  previsao: OptionPreview;
  /** custo imediato para o caixa público (% do orçamento) */
  custoPct: number;
  /** economia verificada (% da base) — só vale se o acesso/qualidade não forem reduzidos */
  economiaPct?: number;
  receitaPct?: number;
  efeitos: Effects;
  /** efeitos que voltam depois: aplicam ao ENTRAR no caso `dueCase = casoAtual + depois` */
  depois?: Array<{ depois: number; efeitos: Effects; titulo: Txt; mensagem: Txt; motivo: Txt; tom: "bom" | "ruim" | "neutro" }>;
  /** exige achado ou conhecimento aplicado para aparecer como disponível */
  requer?: { achado?: string; aplicado?: ConceptId; attr?: { key: AttrKey; min: number }; dica: string };
  /** ajustes condicionados ao estado real da partida (ex.: estoque baixo agrava a crise) */
  ajustes?: Array<{ se: (s: GameState) => boolean; efeitos: Effects; custoPctExtra?: number; nota: Txt }>;
  /** esta opção aplica estes conceitos (se o jogador já os aprendeu, conta como conhecimento aplicado) */
  aplica?: ConceptId[];
  narracao: Txt;
  /** o corte reduz acesso? (então a economia NÃO vira pontuação de eficiência) */
  cortaAcesso?: boolean;
  /** peso de quanto o argumento do jogador (negociação) escala os ganhos */
  escalaPorNegociacao?: string;
  /** é um ato de desvio? (exige confirmação explícita + percentual) */
  desvio?: { rotulo: Txt; explicacao: Txt };
  /** aliados envolvidos */
  aliado?: CharId;
  /** conquista liberada ao escolher esta opção */
  conquista?: string;
  /** só na decisão da eleição simulada: pontos de campanha (±) somados à apuração */
  votos?: number;
}

export interface DecisionDef {
  id: string;
  caso: number;
  titulo: string;
  pergunta: Txt;
  /** base elegível do evento, como % do orçamento anual */
  basePct: number;
  conceito: ConceptId;
  opcoes: OptionDef[];
  /** documento/lugar onde a decisão é tomada */
  mesa: LocationId;
  /** decisão da eleição simulada: o motor apura o resultado a partir do estado */
  eleicao?: boolean;
  gestoPadrao: PenGesture;
  papelAssinado: Txt;
}

export interface CaseDef {
  id: string;
  caso: number;
  titulo: string;
  episodio: string;
  location: LocationId; // onde o caso começa
  chamada: Txt; // o problema
  objetivo: Txt; // HUD
  dica: Txt;
  pistas: string[];
  conversas: string[];
  decisao: string;
}

export interface Concept {
  id: ConceptId;
  titulo: string;
  texto: string;
  aplicacao: string;
  dificuldade: 1 | 2 | 3;
  tema: string;
  fonte: { rotulo: string; url: string | null; classificacao: Classification };
}

export interface QuizQuestion {
  id: string;
  pergunta: string;
  opcoes: Array<{ id: string; rotulo: string; efeitos: Partial<Record<AttrKey, number>>; eco: string }>;
}

export interface AchievementDef { id: string; nome: string; descricao: string; trilha: "gestao" | "satira"; icone: string }
