import type { CharId, ConceptId, LocationId } from "../../engine/types";
import type { AchievementDef, CaseDef, ClueDef, Concept, ConversationDef, DecisionDef, FindingDef, NegotiationDef } from "../types";

/** Estilo visual do local (cena 2D e sala 3D). */
export type Tema = "gabinete" | "dados" | "plenario" | "hospital" | "obra" | "reuniao";

/**
 * Descrição compacta de um local. O layout (posição no mapa, retângulos dos pontos, âncoras 3D) é gerado
 * automaticamente em `layout.ts`: quem escreve o conteúdo só diz QUEM e O QUE há no local, e em quais casos.
 */
export interface LocSpec {
  id: LocationId;
  nome: string;
  curto: string;
  descricao: string;
  tema: Tema;
  /** até 4 pessoas; cada uma pode ter conversas diferentes em casos diferentes */
  pessoas: Array<{ id: string; char: CharId; falas: Array<[caso: number, conversa: string, rotulo: string]> }>;
  /** até 4 objetos investigáveis: na parede (quadros, painéis) ou sobre a mesa (pastas, computador) */
  itens: Array<{ id: string; icone: string; onde: "parede" | "mesa"; pistas: Array<[caso: number, pista: string, rotulo: string]> }>;
  /** o local onde a decisão é assinada tem mesa de decisão (exatamente um por nível) */
  mesa?: boolean;
  /** portas para outros locais do MESMO nível (até 4) */
  portas: LocationId[];
}

/** Tudo o que um nível acrescenta ao jogo. Cada nível é um arquivo `nN.ts` que exporta um destes. */
export interface LevelContent {
  locais: LocSpec[];
  pistas: ClueDef[];
  achados: FindingDef[];
  conversas: ConversationDef[];
  negociacoes: NegotiationDef[];
  decisoes: DecisionDef[];
  casos: CaseDef[];
  conceitos: Partial<Record<ConceptId, Concept>>;
  conquistas: AchievementDef[];
}

export const vazio = (): LevelContent => ({ locais: [], pistas: [], achados: [], conversas: [], negociacoes: [], decisoes: [], casos: [], conceitos: {}, conquistas: [] });
