import type { FiscalMetric } from "./types";

/** flow = soma ao longo do período; stock = saldo (usa o último período do ano). */
export const METRIC_INFO: Record<FiscalMetric, { label: string; kind: "flow" | "stock"; glossary: string }> = {
  REVENUE_FORECAST: { label: "Receita prevista", kind: "flow", glossary: "receita-prevista" },
  REVENUE_REALIZED: { label: "Receita arrecadada", kind: "flow", glossary: "receita-realizada" },
  EXPENSE_BUDGETED: { label: "Despesa orçada", kind: "flow", glossary: "despesa-orcada" },
  EXPENSE_COMMITTED: { label: "Despesa empenhada", kind: "flow", glossary: "despesa-empenhada" },
  EXPENSE_LIQUIDATED: { label: "Despesa liquidada", kind: "flow", glossary: "despesa-liquidada" },
  EXPENSE_PAID: { label: "Despesa paga", kind: "flow", glossary: "despesa-paga" },
  TRANSFER: { label: "Transferências", kind: "flow", glossary: "transferencia" },
  DEBT: { label: "Dívida", kind: "stock", glossary: "divida" },
  BENEFIT_VALUE: { label: "Valor de benefícios", kind: "flow", glossary: "beneficio" },
  BENEFICIARIES: { label: "Beneficiários", kind: "stock", glossary: "beneficiarios" },
  CONTRACT_VALUE: { label: "Valor contratado", kind: "flow", glossary: "contrato" },
  FISCAL_INDICATOR: { label: "Indicador fiscal", kind: "flow", glossary: "indicador-fiscal" },
};

/** Funções de governo (Portaria MOG/SOF nº 42/1999). */
export const FUNCTIONS: Record<string, string> = {
  "01": "Legislativa", "02": "Judiciária", "03": "Essencial à Justiça", "04": "Administração", "05": "Defesa Nacional",
  "06": "Segurança Pública", "07": "Relações Exteriores", "08": "Assistência Social", "09": "Previdência Social", "10": "Saúde",
  "11": "Trabalho", "12": "Educação", "13": "Cultura", "14": "Direitos da Cidadania", "15": "Urbanismo", "16": "Habitação",
  "17": "Saneamento", "18": "Gestão Ambiental", "19": "Ciência e Tecnologia", "20": "Agricultura", "21": "Organização Agrária",
  "22": "Indústria", "23": "Comércio e Serviços", "24": "Comunicações", "25": "Energia", "26": "Transporte",
  "27": "Desporto e Lazer", "28": "Encargos Especiais",
};

/** Grupos de natureza da despesa, em linguagem simples. */
export const EXPENSE_GROUPS: Record<string, string> = {
  "3.1": "Pessoal e encargos", "3.2": "Juros da dívida", "3.3": "Outras despesas correntes",
  "4.4": "Investimentos", "4.5": "Inversões financeiras", "4.6": "Amortização da dívida",
};

/** Origens de receita (nível 2 da natureza da receita). */
export const REVENUE_ORIGINS: Record<string, string> = {
  "1.1": "Impostos, taxas e contribuições de melhoria", "1.2": "Contribuições", "1.3": "Patrimonial", "1.4": "Agropecuária",
  "1.5": "Industrial", "1.6": "Serviços", "1.7": "Transferências correntes", "1.9": "Outras receitas correntes",
  "2.1": "Operações de crédito", "2.2": "Alienação de bens", "2.3": "Amortização de empréstimos", "2.4": "Transferências de capital", "2.5": "Outras receitas de capital", "2.9": "Outras receitas de capital",
};

/** Glossário: texto simples, sem exigir conhecimento de contabilidade pública. */
export const GLOSSARY: Record<string, { term: string; text: string }> = {
  "receita-prevista": { term: "Receita prevista", text: "Quanto o governo estimou arrecadar no orçamento do ano." },
  "receita-realizada": { term: "Receita arrecadada", text: "O dinheiro que de fato entrou nos cofres públicos (impostos, contribuições, transferências, etc.)." },
  "despesa-orcada": { term: "Despesa orçada", text: "O limite de gastos autorizado no orçamento." },
  "despesa-empenhada": { term: "Despesa empenhada", text: "É quando o governo reserva o dinheiro e se compromete a pagar por um produto ou serviço. Ainda pode não ter sido entregue nem pago." },
  "despesa-liquidada": { term: "Despesa liquidada", text: "É quando o governo confirma que o produto ou serviço foi entregue e que o pagamento é devido." },
  "despesa-paga": { term: "Despesa paga", text: "O dinheiro que efetivamente saiu dos cofres públicos para quitar a despesa." },
  transferencia: { term: "Transferência", text: "Dinheiro repassado de um governo para outro (por exemplo, da União para estados e municípios)." },
  divida: { term: "Dívida", text: "Quanto o governo deve em um determinado momento." },
  beneficio: { term: "Benefício social", text: "Valor pago diretamente às famílias por programas como Bolsa Família e BPC (dados agregados, sem identificar pessoas)." },
  beneficiarios: { term: "Beneficiários", text: "Quantidade de pessoas ou famílias atendidas no mês." },
  contrato: { term: "Contrato", text: "Acordo pelo qual uma empresa fornece bens ou serviços ao governo." },
  "indicador-fiscal": { term: "Indicador fiscal", text: "Número que resume a situação das contas públicas, como o resultado primário." },
  funcao: { term: "Função de governo", text: "A grande área em que o dinheiro é aplicado (saúde, educação, segurança…)." },
  natureza: { term: "Natureza da despesa", text: "O tipo de gasto: pagar pessoal, pagar juros da dívida, investir em obras, etc." },
  "resultado-primario": { term: "Resultado primário", text: "Diferença entre o que o governo arrecada e o que gasta, sem contar os juros da dívida." },
  "dcl": { term: "Dívida consolidada líquida", text: "Dívida de longo prazo do governo menos o dinheiro e os direitos que ele tem em caixa." },
};
