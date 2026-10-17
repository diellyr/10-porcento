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

/** Cenário do nível 2 (Secretaria Municipal), derivado do cenário do nível 1 de forma determinística (o servidor reproduz o mesmo resultado).
 *  Município referenciado: o total oficial de saúde do município passa a ser o orçamento da Secretaria (dado oficial); fictício: estimativa didática. */
export const ORCAMENTO_SECRETARIA_PADRAO = 180_000_000;
export function levelScenario(sc: Scenario, nivel: number): Scenario {
  if (nivel === 1) return sc;
  const hs = sc.reference?.healthSpending ?? null;
  const oficial = !!hs && hs > 0;
  const base = { kind: sc.kind, municipio: sc.municipio, unidade: `Secretaria Municipal de Saúde de ${sc.municipio.nome.replace(/ \(fictícia\)/, "")}${sc.kind === "ficticio" ? " (fictícia)" : ""}`, orcamentoAnual: r2(oficial ? hs! : ORCAMENTO_SECRETARIA_PADRAO) };
  return {
    ...sc, id: `${sc.id}-n${nivel}`, hash: hash32(JSON.stringify([sc.hash, "nivel", nivel, base])), ...base,
    orcamentoClassificacao: oficial ? "oficial" : "estimativa",
    orcamentoNota: oficial
      ? `O orçamento anual da Secretaria é o total oficial de saúde do município (${sc.reference!.year}), via Brasil Fiscal. Os valores das decisões são proporcionais a ele e continuam simulados.`
      : "O orçamento da Secretaria é uma ESTIMATIVA DIDÁTICA do cenário fictício. Nenhum valor oficial foi usado e a ausência de dado não foi convertida em zero.",
  };
}
