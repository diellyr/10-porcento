import { CASE_BY_NUM, DECISION_BY_ID } from "../content/cases";
import { decisoesDoNivel, levelOf, nivelDe } from "../content/levels";
import { CONCEPTS } from "../content/concepts";
import type { Classification, ConceptId, GameState } from "./types";
import { brl, r2 } from "./money";
import { aplicadosTotal, custosTotal, economiaTotal, legado, powerScore, qualidadeAcesso, trambicagem } from "./scoring";

export const INICIO = { qualidade: 50, acesso: 45, equipe: 55, sustentabilidade: 60, estoqueDias: 7, filaMin: 94, confianca: 40 } as const;

export interface PlanItem {
  prioridade: number; problema: string; medida: string; responsavel: string; prazo: string; custo: string; indicador: string;
  fonte: { rotulo: string; url: string | null; classificacao: Classification }; status: "feito" | "recomendado" | "hipotese";
}

export interface Report {
  titulo: string;
  geradoDe: { regras: string; conteudo: string; cenario: string; cenarioHash: string; passos: number };
  resumo: { jogador: string; cargo: string; unidade: string; final: string; finalId: string; decisoes: number; poder: number; legado: number; trambicagem: number };
  decisoes: Array<{ caso: number; titulo: string; escolha: string; tipo: string; base: number; custo: number; economia: number; desvioPct: number; desvioValor: number; resultado: string; consequencias: string[] }>;
  financeiro: { desviado: number; restituido: number; economiasVerificadas: number; receitas: number; custos: number; cortesDeAtendimento: number; obrigacoes: number; patrimonioBruto: number; bensPerdidos: number; patrimonioFinal: number; remuneracaoLegitima: number };
  servicos: Array<{ rotulo: string; inicio: number; fim: number; unidade: string; melhor: "maior" | "menor" }>;
  caminho: { tipo: "desvio" | "integro"; itens: Array<{ titulo: string; texto: string }> };
  conhecimentos: Array<{ id: ConceptId; titulo: string; aplicado: boolean; revisar: boolean }>;
  plano: PlanItem[];
  classificacao: Array<{ rotulo: string; classe: Classification; nota: string }>;
  limites: string;
}

const PLANOS: Array<{ nivel?: number; conceito: ConceptId; problema: string; medida: string; responsavel: string; prazo: string; custoPct: number; indicador: string; melhores: string[] }> = [
  { conceito: "medir-antes", problema: "Remédio falta e outro vence na mesma prateleira.", medida: "Controle de estoque por cobertura em dias, primeiro-a-vencer-primeiro-a-sair e pedidos pelo consumo real.", responsavel: "Coordenação da unidade e Secretaria de Saúde", prazo: "60 a 90 dias", custoPct: 1.2, indicador: "Cobertura de estoque (dias) e perdas por validade (R$/trimestre)", melhores: ["reorganizar"] },
  { conceito: "gargalo", problema: "Fila longa concentrada em poucos horários.", medida: "Escala por demanda horária, com classificação de risco.", responsavel: "Coordenação de enfermagem e gestão da unidade", prazo: "30 dias", custoPct: 0.4, indicador: "Tempo de espera por faixa horária", melhores: ["remanejar-equipe", "escala-risco", "investir-gargalo"] },
  { conceito: "custo-total", problema: "Compras decididas só pelo menor preço de aquisição.", medida: "Comparar custo total (aquisição, manutenção, insumos e treinamento) em 5 anos.", responsavel: "Setor de compras e fiscal de contratos", prazo: "Próximo processo de compra", custoPct: 0.1, indicador: "Custo total por equipamento em 5 anos; tempo de equipamento parado", melhores: ["manutencao-inclusa"] },
  { conceito: "corte-linear", problema: "Ordens de corte linear sem olhar acesso e qualidade.", medida: "Direcionar economias ao desperdício comprovado e medir acesso antes e depois.", responsavel: "Secretaria de Saúde e Tesouraria", prazo: "1 trimestre", custoPct: 0.6, indicador: "Economia verificada com acesso e qualidade mantidos", melhores: ["economia-direcionada", "investir-gargalo"] },
  { conceito: "entrega-vs-anuncio", problema: "Inauguração antes da obra pronta.", medida: "Condicionar medição e inauguração ao cronograma físico.", responsavel: "Fiscalização de obras e Controladoria", prazo: "Cada obra", custoPct: 0.1, indicador: "% físico × % financeiro por obra", melhores: ["corrigir-cronograma", "inauguracao-parcial"] },
  { conceito: "execucao-despesa", problema: "Pagamento liberado sem conferir a entrega.", medida: "Liquidar somente após conferência de quantidade, validade e qualidade.", responsavel: "Fiscal de contratos e almoxarifado", prazo: "Imediato", custoPct: 0.1, indicador: "Divergências entre nota e recebimento", melhores: ["conferir-liquidar-parcial", "devolver-lote"] },
  { conceito: "controle-interno", problema: "Registros dispersos que dificultam o controle.", medida: "Arquivo único de decisões e documentos acessível à Controladoria.", responsavel: "Gestão da unidade e Controladoria", prazo: "90 dias", custoPct: 0.1, indicador: "Pendências documentais por auditoria", melhores: ["abrir-tudo", "pedir-prazo", "prestacao-completa"] },
  { conceito: "conflito-interesses", problema: "Indicação de fornecedores sem comparação.", medida: "Cotação com no mínimo três propostas e declaração de vínculos.", responsavel: "Setor de compras e Controladoria", prazo: "Imediato", custoPct: 0.3, indicador: "Contratos com cotação e diferença de preço", melhores: ["cotar-esclarecer"] },
  { conceito: "reserva-urgencia", problema: "Crise sazonal que encontra estoque e escala no limite.", medida: "Plano de contingência sazonal com reserva e acordos com unidades vizinhas.", responsavel: "Secretaria de Saúde e coordenação da rede", prazo: "Antes do próximo inverno", custoPct: 1, indicador: "Cobertura de estoque no pico e tempo de espera na crise", melhores: ["reforco-emergencial", "remanejar-rede"] },
  { conceito: "transparencia", problema: "Prestação de contas que só mostra o que agrada.", medida: "Relatório periódico com resultados, falhas e plano de correção, em linguagem simples.", responsavel: "Gestão da unidade e Conselho de Saúde", prazo: "Trimestral", custoPct: 0.05, indicador: "Publicações no prazo e perguntas respondidas", melhores: ["prestacao-completa"] },
  { nivel: 2, conceito: "planejamento-necessidade", problema: "Unidade nova escolhida por pedido, não por necessidade medida.", medida: "Mapa de cobertura por território cruzado com a demanda na UPA, antes de decidir onde abrir ou ampliar.", responsavel: "Secretaria de Saúde e Planejamento", prazo: "Antes de cada nova unidade", custoPct: 0.2, indicador: "Cobertura da atenção básica por bairro e atendimentos leves na UPA", melhores: ["ubs-cobertura"] },
  { nivel: 2, conceito: "emenda-custeio", problema: "Equipamento recebido por emenda sem previsão de funcionamento.", medida: "Aceitar emendas de equipamento apenas com plano de sala, equipe, manutenção e fonte de custeio anual.", responsavel: "Secretaria de Saúde e Fazenda municipal", prazo: "Antes do aceite", custoPct: 0.3, indicador: "Equipamentos de emenda em uso × parados", melhores: ["emenda-com-plano"] },
  { nivel: 2, conceito: "compra-compartilhada", problema: "Compras picadas que fracionam uma necessidade única.", medida: "Somar a demanda anual da rede e usar ata de registro de preços ou licitação conjunta.", responsavel: "Central de compras e Controladoria", prazo: "Próximo ciclo de compras", custoPct: 0.1, indicador: "Preço médio pago × ata e número de dispensas por objeto", melhores: ["aderir-ata", "licitar-conjunto"] },
  { nivel: 2, conceito: "fila-regulada", problema: "Fila de especialidades por ordem de chegada.", medida: "Protocolo de encaminhamento por risco, resolução na atenção básica e fila pública consultável.", responsavel: "Regulação municipal e coordenação das UBS", prazo: "30 a 60 dias", custoPct: 0.3, indicador: "Espera dos casos de alto risco e % resolvido na UBS", melhores: ["fila-por-risco"] },
  { nivel: 2, conceito: "folha-sustentavel", problema: "Falta de pessoal com a folha perto do limite.", medida: "Repor vagas permitidas, reorganizar escalas e planejar concurso dentro do limite de pessoal.", responsavel: "Secretaria de Saúde, Administração e Fazenda", prazo: "Ciclo anual", custoPct: 0.5, indicador: "Despesa com pessoal / receita corrente líquida", melhores: ["repor-e-reorganizar"] },
  { nivel: 2, conceito: "credito-adicional", problema: "Dinheiro movido entre dotações sem autorização legislativa.", medida: "Pedir crédito adicional por lei, indicando a fonte, e usar o decreto só até o limite autorizado.", responsavel: "Secretaria de Saúde, Fazenda e Câmara", prazo: "Cada necessidade", custoPct: 0.1, indicador: "Créditos autorizados × remanejamentos sem lei", melhores: ["pedir-credito"] },
  { nivel: 2, conceito: "emergencia-transparencia", problema: "Contratação emergencial sem pesquisa de preço e sem publicação.", medida: "Pesquisa rápida de preços em horas, justificativa formal e publicação imediata da contratação.", responsavel: "Secretaria de Saúde e Controladoria", prazo: "Cada emergência", custoPct: 0.1, indicador: "Preço pago × menor proposta e prazo de publicação", melhores: ["emergencia-documentada"] },
  { nivel: 2, conceito: "audiencia-publica", problema: "Prestação de contas que só mostra o que agrada.", medida: "Audiência pública com resultados, metas não cumpridas e plano de correção.", responsavel: "Secretaria de Saúde e Conselho Municipal de Saúde", prazo: "Quadrimestral", custoPct: 0.05, indicador: "Metas cumpridas e plano de correção publicado", melhores: ["audiencia-honesta"] },
];

/** Níveis 3–7: o plano nasce de cada decisão do nível e do conceito que ela exercitou. */
function planosGenericos(ds: GameState["decisions"]): typeof PLANOS {
  return ds.filter((d) => d.concept).map((d) => {
    const dec = DECISION_BY_ID[d.id]; const melhores = dec ? dec.opcoes.filter((o) => o.kind === "competente").map((o) => o.id) : [];
    const c = CONCEPTS[d.concept];
    return { conceito: d.concept, problema: d.title, medida: c.aplicacao, responsavel: "Equipe responsável pela política e órgão de controle", prazo: "Próximo ciclo", custoPct: dec ? Math.max(0.05, dec.basePct / 10) : 0.1, indicador: "Resultado da decisão acompanhado a cada trimestre, com registro público", melhores };
  });
}

const ALT: Record<string, string> = {
  aurora: "Reorganizar o estoque pelo consumo real e abrir cotação emergencial com ao menos três fornecedores.",
  "favorecer-a": "Escolher a proposta de menor custo total em 5 anos, com ata de comparação publicada.",
  "medicao-inflada": "Liquidar apenas a medição compatível com o cronograma físico e inaugurar por etapas.",
  "receber-mimo": "Conferir quantidade e validade antes de liquidar e acionar a garantia pelas diferenças.",
  comissao: "Abrir cotação com três fornecedores e registrar o pedido de esclarecimentos por escrito.",
  "compra-dispensa": "Usar cotação rápida em 24 h com registro de justificativa e remanejamento entre unidades.",
};
const CONTROLE: Record<string, string> = {
  aurora: "Cotação mínima obrigatória mesmo em compras emergenciais; separação entre quem pede e quem recebe.",
  "favorecer-a": "Comparação de custo total e fiscal de contrato independente.",
  "medicao-inflada": "Medição vinculada ao cronograma físico, com relatório fotográfico e conferência independente.",
  "receber-mimo": "Contagem do recebimento por quem não autoriza o pagamento (segregação de funções).",
  comissao: "Declaração de vínculos e rodízio de responsáveis pela contratação.",
  "compra-dispensa": "Dispensa só com justificativa publicada e conferência posterior da Controladoria.",
};

export function buildReport(s: GameState): Report {
  const A = s.scenario.orcamentoAnual;
  const L = levelOf(s);
  const ini = L.inicio;
  const decs = decisoesDoNivel(s, L.nivel);
  const comDesvio = s.personal.desviado > 0;
  const tr = trambicagem(s);
  const dec = decs.map((d) => ({
    caso: d.caso, titulo: d.title, escolha: d.optionLabel, tipo: d.kind === "desvio" ? "desvio deliberado (fictício)" : d.kind, base: d.baseElegivel, custo: d.custo, economia: d.economia,
    desvioPct: d.desvioPct, desvioValor: d.desvioValor, resultado: d.consequences[0]?.message ?? "", consequencias: d.consequences.slice(1).map((c) => `${c.title}: ${c.message}`),
  }));
  const obrig = r2(-s.ledger.filter((l) => l.tipo === "obrigacao").reduce((a, b) => a + b.valor, 0));
  const cortes = r2(s.ledger.filter((l) => l.tipo === "corte" && l.valor > 0).reduce((a, b) => a + b.valor, 0));
  const itens: Array<{ titulo: string; texto: string }> = [];
  if (comDesvio) {
    for (const d of decs.filter((x) => x.deliberado)) {
      itens.push({ titulo: `${d.title} — desvio de ${String(d.desvioPct).replace(".", ",")}% (${brl(d.desvioValor)}, fictício)`, texto: `Alternativa de gestão possível: ${ALT[d.optionId] ?? "decidir por comparação e registro."} Controle que ajudaria a prevenir: ${CONTROLE[d.optionId] ?? "segregação de funções e registro público da decisão."}` });
    }
    if (s.repairs.length) itens.push({ titulo: "Restituição voluntária", texto: `Foi registrada a restituição de ${brl(s.personal.restituido)} (novo evento). Ela modifica o epílogo, mas não apaga os desvios nem seus efeitos nos serviços.` });
  } else {
    for (const d of decs.filter((x) => x.kind === "competente" || x.kind === "prudente")) {
      itens.push({ titulo: `${d.title}: ${d.optionLabel}`, texto: `${d.consequences.map((c) => c.message).join(" ")} Condição de funcionamento: depende de acompanhar o indicador após a decisão e manter o registro.` });
    }
  }
  const aplicados = new Set(Object.entries(s.knowledge).filter(([, k]) => k.aplicadoEm.length).map(([k]) => k));
  const conhecimentos = (Object.keys(s.knowledge) as ConceptId[]).map((id) => {
    const dec = decs.find((d) => d.concept === id);
    const ruim = dec ? ["comodo", "fraco", "desvio"].includes(dec.kind) : false;
    return { id, titulo: CONCEPTS[id].titulo, aplicado: aplicados.has(id), revisar: ruim && !aplicados.has(id) };
  });
  const planosNivel = nivelDe(s) >= 3 ? planosGenericos(decs) : PLANOS.filter((p) => (p.nivel ?? 1) === nivelDe(s));
  const plano: PlanItem[] = planosNivel.map((p) => {
    const d = decs.find((x) => x.concept === p.conceito);
    const feito = !!d && p.melhores.includes(d.optionId);
    return { problema: p.problema, medida: p.medida, responsavel: p.responsavel, prazo: p.prazo, custo: `≈ ${brl((A * p.custoPct) / 100)} (estimativa didática)`, indicador: p.indicador, fonte: CONCEPTS[p.conceito].fonte, status: feito ? "feito" as const : d ? "recomendado" as const : "hipotese" as const, prioridade: 0 };
  })
    .sort((a, b) => ["recomendado", "hipotese", "feito"].indexOf(a.status) - ["recomendado", "hipotese", "feito"].indexOf(b.status))
    .map((p, i) => ({ ...p, prioridade: i + 1 }));

  return {
    titulo: "Meu plano para melhorar a gestão",
    geradoDe: { regras: s.rulesVersion, conteudo: s.contentVersion, cenario: s.scenario.unidade, cenarioHash: s.scenario.hash, passos: s.steps },
    resumo: { jogador: s.player.nome, cargo: `${L.cargo} (nível ${L.nivel})`, unidade: s.scenario.unidade, final: s.ending?.titulo ?? "Em andamento", finalId: s.ending?.id ?? "em-andamento", decisoes: decs.length, poder: powerScore(s.attrs), legado: legado(s), trambicagem: tr },
    decisoes: dec,
    financeiro: { desviado: s.personal.desviado, restituido: s.personal.restituido, economiasVerificadas: economiaTotal(s), receitas: 0, custos: custosTotal(s), cortesDeAtendimento: cortes, obrigacoes: obrig, patrimonioBruto: s.personal.patrimonio, bensPerdidos: s.ending?.bensPerdidos ?? 0, patrimonioFinal: s.ending?.patrimonioFinal ?? s.personal.patrimonio, remuneracaoLegitima: s.personal.remuneracao },
    servicos: [
      { rotulo: "Qualidade dos serviços", inicio: ini.qualidade, fim: s.pub.qualidade, unidade: "/100", melhor: "maior" },
      { rotulo: "Acesso ao atendimento", inicio: ini.acesso, fim: s.pub.acesso, unidade: "/100", melhor: "maior" },
      { rotulo: L.nivel === 1 ? "Espera média" : L.rotulos.fila.nome, inicio: ini.filaMin, fim: s.pub.filaMin, unidade: L.rotulos.fila.un, melhor: "menor" },
      { rotulo: L.nivel === 1 ? "Cobertura de estoque" : "Cobertura de insumos", inicio: ini.estoqueDias, fim: s.pub.estoqueDias, unidade: " dias", melhor: "maior" },
      { rotulo: "Confiança pública", inicio: INICIO.confianca, fim: s.attrs.confianca, unidade: "/100", melhor: "maior" },
      { rotulo: "Sustentabilidade fiscal", inicio: ini.sustentabilidade, fim: s.pub.sustentabilidade, unidade: "/100", melhor: "maior" },
    ],
    caminho: { tipo: comDesvio ? "desvio" : "integro", itens },
    conhecimentos,
    plano,
    classificacao: [
      { rotulo: s.scenario.reference?.healthSpending ? `Total de saúde do município (${s.scenario.reference.year})` : "Dados oficiais", classe: "oficial", nota: s.scenario.reference?.healthSpending ? `${brl(s.scenario.reference.healthSpending)} — ${s.scenario.reference.source}. É referência: não é o orçamento de nenhuma UPA específica.` : "Este cenário é fictício: nenhum valor oficial foi usado." },
      { rotulo: `Orçamento anual da ${L.rotulos.unidade}`, classe: "estimativa", nota: `${brl(A)} — estimativa didática do cenário. ${s.scenario.orcamentoNota}` },
      { rotulo: "Desvios, economias, custos, efeitos e finais", classe: "simulado", nota: "Resultado calculado pelas regras do jogo a partir das decisões registradas. Não é acusação nem previsão sobre pessoas ou instituições reais." },
    ],
    limites: "Este relatório é uma proposta educativa gerada a partir da sua partida. Ele não é um diagnóstico da gestão pública real, nem prova que uma medida resolve um problema fora do jogo. Um gasto elevado, isoladamente, não prova desperdício ou corrupção. Hipóteses sobre a gestão real exigem evidência adequada.",
  };
}

export const legadoLabel = (s: GameState) => ({ qualidadeAcesso: qualidadeAcesso(s), aplicados: aplicadosTotal(s), caso: CASE_BY_NUM[s.caso]?.titulo ?? "" });
