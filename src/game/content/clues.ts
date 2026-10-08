import type { ClueDef, FindingDef } from "./types";

const SIM = { rotulo: "Documento do cenário (valores simulados)", classificacao: "simulado" as const };
const EST = { rotulo: "Parâmetro do cenário (estimativa didática)", classificacao: "estimativa" as const };
const CGU = { rotulo: "CGU — Execução da despesa pública", classificacao: "oficial" as const, url: "https://portaldatransparencia.gov.br/entenda-a-gestao-publica/execucao-despesa-publica" };

export const CLUES: ClueDef[] = [
  /* ───── Caso 1 — estoque ───── */
  {
    id: "c1-consumo", caso: 1, location: "farmacia", titulo: "Planilha de consumo (3 meses)", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: "A planilha está sem atualização desde a gestão anterior, mas os números batem com o que a Joana descreve. Veja a cobertura em dias: quanto tempo o estoque dura no ritmo atual.",
    tabela: () => [["Salbutamol spray", "420/mês · estoque 90 · dura 6 dias"], ["Ondansetrona", "120/mês · estoque 40 · dura 10 dias"], ["Amoxicilina", "260/mês · estoque 310 · dura 36 dias"], ["Soro fisiológico", "800/mês · estoque 1.900 · dura 71 dias"], ["Dipirona 500 mg", "300/mês · estoque 1.150 · dura 115 dias"]],
  },
  {
    id: "c1-validade", caso: 1, location: "farmacia", titulo: "Lotes que vencem em 30 dias", tipo: "documento", confiabilidade: "confirmada", icone: "📦", fonte: SIM,
    texto: (c) => `A etiqueta vermelha nas prateleiras não é decoração: são lotes com validade curta. Somados, os itens que vencem antes de serem usados valem cerca de ${c.money(0.52)} (valor simulado).`,
    tabela: () => [["Dipirona 500 mg", "640 caixas vencem em 21 dias"], ["Soro fisiológico", "300 bolsas vencem em 27 dias"], ["Amoxicilina", "90 caixas vencem em 18 dias"]],
  },
  {
    id: "c1-pedido", caso: 1, location: "farmacia", titulo: "Mural de pedidos", tipo: "documento", confiabilidade: "incompleta", icone: "📌", fonte: SIM,
    texto: "“Pedido de reposição de salbutamol enviado. Fornecedor: em análise.” Não há data de entrega nem quantidade confirmada. Quem pediu? A letra é do Toninho, a assinatura é ilegível.",
  },
  {
    id: "c1-oferta", caso: 1, location: "administracao", titulo: "Recado colado na parede", tipo: "opiniao", confiabilidade: "opiniao", icone: "📌", fonte: SIM,
    texto: "Cartão da Aurora Hospitalar (empresa fictícia): “Compra emergencial sem burocracia. Agilidade garantida. Fale com o Toninho.” Abaixo, a lápis: “resolve o estoque em 48h — e tem uma taxa de agilidade por fora, a combinar”.",
  },

  /* ───── Caso 2 — fila ───── */
  {
    id: "c2-espera", caso: 2, location: "recepcao", titulo: "Relatório de espera por horário", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: "A média de 94 minutos esconde um pico violento de madrugada. A recepção só olha a média; o relatório mostra hora a hora.",
    tabela: () => [["07h–11h", "38 min"], ["11h–15h", "41 min"], ["15h–19h", "52 min"], ["19h–23h", "60 min"], ["23h–03h", "118 min"], ["03h–05h", "226 min (pico)"], ["05h–07h", "71 min"]],
  },
  {
    id: "c2-escala", caso: 2, location: "enfermagem", titulo: "Escala de plantão da enfermagem", tipo: "documento", confiabilidade: "confirmada", icone: "🗓️", fonte: SIM,
    texto: "A escala foi montada por turnos, e não pela demanda. Compare quantos técnicos atendem em cada faixa e quantos atendimentos chegam por hora.",
    tabela: () => [["07h–11h", "5 técnicos · 14 atend./h"], ["11h–15h", "5 técnicos · 9 atend./h"], ["15h–23h", "4 técnicos · 11 atend./h"], ["23h–03h", "3 técnicos · 13 atend./h"], ["03h–05h", "3 técnicos · 17 atend./h"], ["05h–07h", "3 técnicos · 10 atend./h"]],
  },
  {
    id: "c2-proposta", caso: 2, location: "administracao", titulo: "E-mail do Primo Juninho: “Hospital 4.0”", tipo: "opiniao", confiabilidade: "incompleta", icone: "💻", fonte: SIM,
    texto: (c) => `“Diagnóstico completo da fila em 60 dias, com metodologia proprietária, por apenas ${c.money(3)}. Sem necessidade de cotação, primo!” A proposta não explica o que será medido, nem entrega parcial. Ser parente não é irregularidade — decidir sem critério é o que preocupa.`,
  },

  /* ───── Caso 3 — contrato barato ───── */
  {
    id: "c3-propostas", caso: 3, location: "administracao", titulo: "Pasta: três propostas de monitores (20 unid.)", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: "Três empresas fictícias, três propostas. A planilha de comparação só mostra o preço de aquisição. O resto está nas letras miúdas.",
    tabela: (c) => [["A — MedTec Barato", `${c.money(3.1)} · assistência sob demanda`], ["B — VitalCare", `${c.money(4.3)} · manutenção e treinamento por 5 anos`], ["C — EcoMonitor", `${c.money(2.7)} · insumos só do fabricante`]],
  },
  {
    id: "c3-manut", caso: 3, location: "enfermagem", titulo: "Ficha de manutenção dos monitores atuais", tipo: "dado", confiabilidade: "confirmada", icone: "🩺", fonte: SIM,
    texto: (c) => `4 dos 12 monitores atuais estão parados há 90 dias aguardando peça. O último conserto custou ${c.money(0.25)} e levou 40 dias — com a UPA sem o equipamento.`,
  },

  /* ───── Caso 4 — corte ───── */
  {
    id: "c4-memo", caso: 4, location: "administracao", titulo: "Memorando da Secretaria", tipo: "documento", confiabilidade: "incompleta", icone: "📄", fonte: SIM,
    texto: "“Determina-se corte linear de 10% nos custeios de todas as unidades, preservando o atendimento sempre que possível.” O memorando não diz como, nem onde, nem o que é 'possível'.",
  },
  {
    id: "c4-pediatria", caso: 4, location: "recepcao", titulo: "Painel de atendimentos", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "Entre 19h e 7h, 18% dos atendimentos são pediátricos. Sem pediatria noturna, as famílias iriam a um pronto-socorro a 14 km daqui. O corte linear da Secretaria poderia fechar justamente esse turno.",
  },
  {
    id: "c4-livro", caso: 4, location: "cofre", titulo: "Livro-caixa do trimestre", tipo: "documento", confiabilidade: "confirmada", icone: "📒", fonte: SIM,
    texto: (c) => `O Guardião mantém o livro em ordem. Entre os custeios, uma linha chama atenção: perdas por validade vencida, cerca de ${c.money(0.52)} no trimestre — dinheiro que podia ter virado remédio.`,
    tabela: (c) => [["Medicamentos e insumos", c.money(5.2)], ["Pessoal de apoio", c.money(7.4)], ["Manutenção", c.money(1.1)], ["Água, energia e limpeza", c.money(1.6)], ["Perdas por validade", c.money(0.52)]],
  },

  /* ───── Caso 5 — obra ───── */
  {
    id: "c5-cronograma", caso: 5, location: "patio", titulo: "Cronograma físico da obra", tipo: "documento", confiabilidade: "confirmada", icone: "🏗️", fonte: SIM,
    texto: "Executado: 62%. Faltam as instalações de gases medicinais e o piso hospitalar, em cerca de 4 semanas. A parte pronta já poderia receber pacientes em macas, mas sem oxigênio canalizado.",
  },
  {
    id: "c5-medicao", caso: 5, location: "patio", titulo: "Boletim de medição da empreiteira", tipo: "documento", confiabilidade: "incompleta", icone: "🪧", fonte: SIM,
    texto: (c) => `A empreiteira (fictícia) pede “medição de 100%” e a liberação do saldo de ${c.money(5)}, para “regularizar antes da inauguração”. O boletim não traz fotos nem o cronograma físico.`,
  },
  {
    id: "c5-convite", caso: 5, location: "administracao", titulo: "Convite de inauguração", tipo: "opiniao", confiabilidade: "opiniao", icone: "💌", fonte: SIM,
    texto: "“Sábado, 10h: inauguração da NOVA sala de observação, com o Deputado Cornélio e a imprensa. Contamos com a sua presença e com o seu discurso!” O convite já saiu em 300 grupos de mensagens.",
  },

  /* ───── Caso 6 — entrega ───── */
  {
    id: "c6-nota", caso: 6, location: "farmacia", titulo: "Nota fiscal e nota de empenho", tipo: "documento", confiabilidade: "confirmada", icone: "🧾", fonte: CGU,
    texto: (c) => `Nota fiscal: 1.200 caixas, valor ${c.money(5.5)}. Empenho: reservado (100%). Liquidação: pendente. Pagamento: bloqueado até a liquidação. Empenho, liquidação e pagamento são etapas da MESMA despesa, e a liquidação é quando se confirma a entrega.`,
  },
  {
    id: "c6-recebimento", caso: 6, location: "farmacia", titulo: "Contagem da carga recebida", tipo: "dado", confiabilidade: "confirmada", icone: "📦", fonte: SIM,
    texto: "Roberto contou o que chegou: 1.050 caixas conferidas. Dessas, 90 têm validade de apenas 40 dias. Faltam 150 caixas em relação à nota.",
    tabela: () => [["Na nota fiscal", "1.200 caixas"], ["Recebidas", "1.050 caixas"], ["Com validade curta (40 dias)", "90 caixas"], ["Faltantes", "150 caixas"]],
  },

  /* ───── Caso 7 — auditoria ───── */
  {
    id: "c7-registros", caso: 7, location: "cofre", titulo: "Arquivo: registros do trimestre", tipo: "documento", confiabilidade: "confirmada", icone: "🔐", fonte: SIM,
    texto: "Tudo o que a Ana vai conferir já está registrado: cada decisão, valor e documento. O arquivo não se reescreve — só se acrescenta. Veja abaixo o que consta hoje.",
    dinamico: (c) => {
      const s = c.state;
      if (!s) return "";
      const n = s.decisions.length;
      const d = s.decisions.filter((x) => x.deliberado);
      const pend = s.decisions.filter((x) => ["atestar-sem-conferir", "consultoria", "aceitar"].includes(x.optionId)).length;
      return `Decisões registradas: ${n}. Desvios deliberados registrados: ${d.length}${d.length ? ` (soma: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(d.reduce((a, b) => a + b.desvioValor, 0))} — valor fictício)` : ""}. Pendências documentais: ${pend}.`;
    },
  },

  /* ───── Caso 8 — favor ───── */
  {
    id: "c8-proposta", caso: 8, location: "administracao", titulo: "Pasta: proposta de manutenção predial", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: (c) => `A empresa Zelo & Cia (fictícia) propõe manutenção predial por ${c.money(3)} ao ano, sem cotação. Indicação “do gabinete do deputado”. Não há comparação de preços nem especificação do serviço. Indicar alguém não é crime — decidir sem comparar é o risco.`,
  },

  /* ───── Caso 9 — inverno ───── */
  {
    id: "c9-boletim", caso: 9, location: "recepcao", titulo: "Boletim de atendimentos", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "Em 10 dias, os atendimentos por síndrome respiratória subiram 65%. A fila triplicou nos horários de pico e o estoque de broncodilatadores é o ponto crítico.",
    dinamico: (c) => (c.state ? `Cobertura atual de estoque: ${c.state.pub.estoqueDias.toFixed(0)} dias. Espera média: ${c.state.pub.filaMin.toFixed(0)} min.` : ""),
  },
  {
    id: "c9-leitos", caso: 9, location: "enfermagem", titulo: "Quadro de leitos", tipo: "dado", confiabilidade: "confirmada", icone: "🛏️", fonte: SIM,
    texto: "São 12 leitos de observação; 11 ocupados. A sala nova poderia aliviar, se estiver mesmo pronta.",
    dinamico: (c) => {
      const d5 = c.state?.decisions.find((x) => x.id === "d5");
      if (!d5) return "";
      return ["corrigir-cronograma", "inauguracao-parcial"].includes(d5.optionId)
        ? "A sala nova entrou em operação com gases medicinais: +6 leitos."
        : "A sala nova segue interditada: leitos adicionais indisponíveis.";
    },
  },

  /* ───── Caso 10 — prestação ───── */
  {
    id: "c10-indicadores", caso: 10, location: "cofre", titulo: "Relatório de indicadores do ciclo", tipo: "dado", confiabilidade: "confirmada", icone: "📊", fonte: EST,
    texto: "O Guardião separou o relatório com tudo o que a partida registrou. Os indicadores abaixo vêm do histórico — nada é inventado.",
    dinamico: (c) => {
      const s = c.state;
      if (!s) return "";
      return `Qualidade ${s.pub.qualidade.toFixed(0)}/100 · Acesso ${s.pub.acesso.toFixed(0)}/100 · Espera ${s.pub.filaMin.toFixed(0)} min · Estoque ${s.pub.estoqueDias.toFixed(0)} dias · Confiança ${s.attrs.confianca.toFixed(0)}/100.`;
    },
  },
];

export const FINDINGS: FindingDef[] = [
  {
    id: "f-vencimento", caso: 1, a: "c1-consumo", b: "c1-validade", titulo: "Falta e desperdício ao mesmo tempo",
    texto: (c) => `Cruzando consumo e validade: há dipirona para 115 dias (e 640 caixas vencem em 21) enquanto o salbutamol dura 6 dias. Perda estimada: ${c.money(0.52)}. Comprar mais não resolve — o problema é medir e remanejar.`,
  },
  {
    id: "f-pico", caso: 2, a: "c2-espera", b: "c2-escala", titulo: "O pico não coincide com a escala", autoPorConhecimento: ["medir-antes"],
    texto: "A espera explode (226 min) quando 3 técnicos atendem 17 pacientes/h. Entre 11h e 15h, 5 técnicos atendem só 9/h. O gargalo é a distribuição da equipe, não apenas o tamanho dela.",
  },
  {
    id: "f-tco", caso: 3, a: "c3-propostas", b: "c3-manut", titulo: "O custo em cinco anos", autoPorConhecimento: ["medir-antes", "gargalo"],
    texto: (c) => `Somando manutenção e insumos em 5 anos: A custa ${c.money(3.1 + 1.8)}, B custa ${c.money(4.3)} e C custa ${c.money(2.7 + 2.6)}. O 'mais barato' no dia da compra é o mais caro no fim.`,
  },
  {
    id: "f-medicao", caso: 5, a: "c5-cronograma", b: "c5-medicao", titulo: "62% construído, 100% cobrado", autoPorConhecimento: ["custo-total", "corte-linear"],
    texto: "O cronograma físico mostra 62% executado; a medição pede 100%. Liberar o saldo seria pagar por serviço que ainda não existe — o que a liquidação existe para evitar.",
  },
  {
    id: "f-divergencia", caso: 6, a: "c6-nota", b: "c6-recebimento", titulo: "A nota não bate com a carga", autoPorConhecimento: ["custo-total", "controle-interno"],
    texto: "A nota fala em 1.200 caixas; chegaram 1.050, e 90 delas têm validade curta. Liquidar tudo seria pagar por 240 caixas que não chegaram ou não servem.",
  },
];

export const CLUE_BY_ID = Object.fromEntries(CLUES.map((c) => [c.id, c])) as Record<string, ClueDef>;
export const FINDING_BY_ID = Object.fromEntries(FINDINGS.map((f) => [f.id, f])) as Record<string, FindingDef>;
