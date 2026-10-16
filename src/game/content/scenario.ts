import { hash32, r2 } from "../engine/money";
import { CONTENT_VERSION, RULES_VERSION, type Scenario, type ScenarioReference } from "../engine/types";

/** Orçamento didático padrão da UPA fictícia (R$ 24 milhões/ano) — SEMPRE uma estimativa. */
export const ORCAMENTO_PADRAO = 24_000_000;
/** Parcela do gasto municipal de saúde usada para dimensionar uma UPA de referência (estimativa didática, não dado oficial). */
export const PARCELA_UPA = 0.06;

export const NOTA_ORCAMENTO =
  "O orçamento da UPA é uma ESTIMATIVA DIDÁTICA do cenário. O total de saúde do município (quando exibido) é dado oficial de referência e não é o orçamento real de nenhuma UPA específica.";

/** Cenário fictício (padrão): funciona sem rede, sem Supabase e sem credenciais. */
export function fictionalScenario(now = new Date().toISOString()): Scenario {
  const base = { kind: "ficticio" as const, municipio: { code: null, nome: "Vila Esperança (fictícia)", uf: null }, unidade: "UPA 24h Dona Esperança", orcamentoAnual: ORCAMENTO_PADRAO };
  return {
    id: "ficticio-vila-esperanca", hash: hash32(JSON.stringify([RULES_VERSION, CONTENT_VERSION, base])), ...base,
    orcamentoClassificacao: "estimativa", orcamentoNota: NOTA_ORCAMENTO, reference: null, congeladoEm: now,
  };
}

/** Cenário referenciado em um município real: o total oficial inspira a escala; a UPA e seus eventos continuam fictícios. */
export function referencedScenario(m: { code: string; nome: string; uf: string | null }, ref: ScenarioReference, now = new Date().toISOString()): Scenario {
  const hs = ref.healthSpending;
  const estimado = hs && hs > 0 ? Math.min(60_000_000, Math.max(8_000_000, Math.round((hs * PARCELA_UPA) / 100_000) * 100_000)) : ORCAMENTO_PADRAO;
  const base = { kind: "referenciado" as const, municipio: { code: m.code, nome: m.nome, uf: m.uf }, unidade: `UPA 24h Dona Esperança (fictícia, em ${m.nome})`, orcamentoAnual: r2(estimado) };
  return {
    id: `ref-${m.code}-${ref.year ?? "s-d"}`, hash: hash32(JSON.stringify([RULES_VERSION, CONTENT_VERSION, base, ref.year, hs])), ...base,
    orcamentoClassificacao: "estimativa",
    orcamentoNota: hs ? `${NOTA_ORCAMENTO} Neste cenário: ${(PARCELA_UPA * 100).toFixed(0)}% do gasto municipal de saúde, limitado a uma faixa didática.` : `${NOTA_ORCAMENTO} Não havia dado oficial disponível: foi usado o valor padrão.`,
    reference: ref, congeladoEm: now,
  };
}
