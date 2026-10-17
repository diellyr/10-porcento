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
  /* ═════════════ Nível 2 — Secretaria Municipal ═════════════ */

  /* ───── Caso 11 — onde abrir a próxima UBS ───── */
  {
    id: "c11-cobertura", caso: 11, location: "planejamento", titulo: "Mapa de cobertura da Atenção Primária", tipo: "dado", confiabilidade: "confirmada", icone: "🗺️", fonte: SIM,
    texto: "Referência didática: cada equipe de saúde da família cobre até 3.000 pessoas. A cobertura de um bairro é a população atendida pelas equipes dividida pela população do bairro.",
    tabela: () => [["Jardim das Flores (14.000 hab.)", "4 equipes · cobertura 86%"], ["Centro (18.000 hab.)", "5 equipes · cobertura 83%"], ["Morro do Sol (9.000 hab.)", "1 equipe · cobertura 33%"], ["Vila Nova (22.000 hab.)", "2 equipes · cobertura 27%"]],
  },
  {
    id: "c11-demanda", caso: 11, location: "ubs", titulo: "Atendimentos por bairro de origem", tipo: "dado", confiabilidade: "confirmada", icone: "🗂️", fonte: SIM,
    texto: "Atendimentos de baixa complexidade (que a atenção básica resolveria) registrados na UPA no último trimestre, segundo o bairro de moradia de quem chegou.",
    tabela: () => [["Vila Nova", "38% dos atendimentos"], ["Morro do Sol", "21%"], ["Centro", "17%"], ["Jardim das Flores", "9%"], ["Outros bairros", "15%"]],
  },
  {
    id: "c11-pedido", caso: 11, location: "camara", titulo: "Ofício do Vereador Nelson", tipo: "documento", confiabilidade: "incompleta", icone: "📄", fonte: SIM,
    texto: "“Solicito a construção da nova UBS no Jardim das Flores, em terreno doado por apoiador, atendendo a compromisso de campanha.” O ofício não traz dados de cobertura nem de demanda. Pedir não é crime — decidir sem olhar os dados é o risco.",
  },

  /* ───── Caso 12 — a emenda do tomógrafo ───── */
  {
    id: "c12-emenda", caso: 12, location: "secretaria", titulo: "Pasta: ofício da emenda parlamentar", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: (c) => `O Deputado Cornélio anuncia uma emenda de ${c.money(1.8)} para a compra de um tomógrafo. O ofício fala só da aquisição: não cita sala adequada, equipe, laudos, manutenção nem insumos.`,
  },
  {
    id: "c12-custeio", caso: 12, location: "planejamento", titulo: "Estimativa de custeio do equipamento", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: EST,
    texto: "O setor técnico estimou o que o município teria de bancar para o aparelho funcionar, em valores proporcionais ao orçamento da Secretaria.",
    tabela: (c) => [["Sala blindada e adequação elétrica (uma vez)", c.money(0.3)], ["Técnicos e radiologista (por ano)", c.money(0.35)], ["Manutenção e insumos (por ano)", c.money(0.25)], ["Custeio anual estimado", c.money(0.6)]],
  },
  {
    id: "c12-exames", caso: 12, location: "planejamento", titulo: "Painel de exames de imagem contratados", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: (c) => `Hoje a rede compra cerca de 1.100 tomografias por mês de um prestador, por aproximadamente ${c.money(1.1)} ao ano. Um aparelho próprio, bem operado, poderia fazer até 1.400 por mês.`,
  },

  /* ───── Caso 13 — compras da rede ───── */
  {
    id: "c13-ata", caso: 13, location: "secretaria", titulo: "E-mail da Central de Compras: ata de registro de preços", tipo: "documento", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: "Uma ata de registro de preços do consórcio intermunicipal (vigente por 12 meses) permite a adesão de outros órgãos, observadas as condições do edital. Os preços estão abaixo da média das últimas compras do município.",
    tabela: () => [["Seringa 5 mL (unidade)", "R$ 0,41 na ata · R$ 0,50 na última compra"], ["Luva de procedimento (caixa)", "R$ 29,00 · R$ 36,00"], ["Curativo (unidade)", "R$ 3,10 · R$ 3,80"], ["Diferença média", "≈ 18% a menos"]],
  },
  {
    id: "c13-dispensas", caso: 13, location: "secretaria", titulo: "Pasta: plano de dispensas do Valdemar", tipo: "opiniao", confiabilidade: "opiniao", icone: "🗂️", fonte: SIM,
    texto: (c) => `Plano do Doutor Valdemar: cinco contratos “pequenos” com a mesma empresa (Medtrade, fictícia) no mesmo mês, cada um abaixo do limite de dispensa, somando ${c.money(1.6)}. Anotação: “é tudo legal: cada nota é pequena”.`,
  },
  {
    id: "c13-consumo", caso: 13, location: "planejamento", titulo: "Consumo mensal de insumos da rede", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: (c) => `A rede consome insumos equivalentes a ${c.money(1.6)} por ano. O consumo cabe nas quantidades registradas na ata. A cobertura do estoque central é de 12 dias.`,
  },

  /* ───── Caso 14 — a fila do cardiologista ───── */
  {
    id: "c14-fila", caso: 14, location: "planejamento", titulo: "Painel da fila por especialidade", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "A fila é ordenada só pela data de chegada. Não há classificação de risco, e ninguém volta para a UBS quando o caso poderia ser resolvido lá.",
    tabela: () => [["Cardiologia", "1.840 na fila · espera média 210 dias"], ["Ortopedia", "1.250 · 180 dias"], ["Dermatologia", "2.300 · 150 dias"], ["Oftalmologia", "900 · 120 dias"]],
  },
  {
    id: "c14-protocolo", caso: 14, location: "planejamento", titulo: "Protocolo de classificação de risco", tipo: "documento", confiabilidade: "confirmada", icone: "📄", fonte: EST,
    texto: "Modelo de protocolo de encaminhamento: define risco alto, médio e baixo e o tempo máximo recomendado de espera para cada um. Aplicado ao cenário, a estimativa é que cerca de 38% dos pedidos de cardiologia sejam de baixo risco e resolvíveis na UBS com apoio à distância.",
  },
  {
    id: "c14-pedido", caso: 14, location: "secretaria", titulo: "Bilhete: lista de “indicados” do vereador", tipo: "opiniao", confiabilidade: "opiniao", icone: "📌", fonte: SIM,
    texto: "“Doutor(a), segue a listinha de 23 nomes para priorizar. São pessoas de bem, todas aqui do bairro.” Não há diagnóstico, nem data do pedido, nem risco informado. Pedir prioridade não é crime — passar à frente sem critério é furar a fila de quem espera.",
  },

  /* ───── Caso 15 — a folha e a cooperativa ───── */
  {
    id: "c15-folha", caso: 15, location: "secretaria", titulo: "Painel de despesa com pessoal", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: "Pelos parâmetros da Lei de Responsabilidade Fiscal para o Executivo municipal, a despesa com pessoal tem um limite máximo e um limite prudencial (95% do máximo), a partir do qual há vedações.",
    tabela: () => [["Despesa com pessoal do Executivo", "52,0% da receita corrente líquida"], ["Limite máximo", "54,0%"], ["Limite prudencial (95%)", "51,3%"], ["Situação", "acima do prudencial, abaixo do máximo"]],
  },
  {
    id: "c15-vagas", caso: 15, location: "planejamento", titulo: "Quadro de vagas abertas e aposentadorias", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: "Há 38 vagas abertas na rede (17 de enfermagem, 8 de médicos, 9 de técnicos e 4 de agentes). Nos próximos 12 meses, 14 profissionais devem se aposentar. A lei ressalva a reposição de aposentadorias e falecimentos na saúde mesmo acima do limite prudencial.",
  },
  {
    id: "c15-proposta", caso: 15, location: "prefeitura", titulo: "Pasta: proposta de “cooperativa de saúde”", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: (c) => `A Cooperativa Saúde Viva (fictícia) forneceria 40 profissionais “como prestação de serviço”, com escala e horário fixos definidos pela Secretaria, por ${c.money(1.4)} ao ano. A proposta afirma que “não conta como despesa de pessoal”. A Secretaria dirigiria o trabalho todos os dias.`,
  },

  /* ───── Caso 16 — o dinheiro acabou antes do fim do trimestre ───── */
  {
    id: "c16-execucao", caso: 16, location: "secretaria", titulo: "Relatório de execução do trimestre", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: "Medicamentos e insumos: a dotação do trimestre está quase toda empenhada e faltam seis semanas de exercício, com pedidos da rede chegando.",
    tabela: (c) => [["Dotação de medicamentos e insumos", c.money(3.0)], ["Empenhado", `${c.money(2.94)} (98%)`], ["Necessidade até o fim do exercício", c.money(0.7)]],
  },
  {
    id: "c16-loa", caso: 16, location: "planejamento", titulo: "Quadro da LOA: dotação por rubrica", tipo: "documento", confiabilidade: "confirmada", icone: "📋", fonte: SIM,
    texto: "A lei orçamentária do município (fictícia) autoriza o Executivo a abrir crédito suplementar por decreto até 0,5% da despesa total fixada. Acima disso, é preciso projeto de lei aprovado pela Câmara. Remanejar entre órgãos ou categorias econômicas diferentes também depende de autorização legislativa.",
  },
  {
    id: "c16-saldos", caso: 16, location: "prefeitura", titulo: "Saldos de dotações de obras paradas", tipo: "dado", confiabilidade: "confirmada", icone: "🗂️", fonte: SIM,
    texto: (c) => `Obras paradas por falta de licença têm ${c.money(1.1)} em dotação que não será usada neste exercício. Usar esse saldo na saúde exige abrir crédito com indicação da fonte e a autorização que a lei exige.`,
  },

  /* ───── Caso 17 — a dengue ───── */
  {
    id: "c17-boletim", caso: 17, location: "planejamento", titulo: "Mapa de casos de dengue por bairro", tipo: "dado", confiabilidade: "confirmada", icone: "🗺️", fonte: SIM,
    texto: "Os casos suspeitos subiram em três semanas e se concentram onde há terrenos baldios, lixo acumulado e menor cobertura de equipes.",
    tabela: () => [["Casos notificados por semana", "412 (antes: 170)"], ["Internações", "31 (antes: 19)"], ["Bairros mais afetados", "Vila Nova e Morro do Sol"]],
  },
  {
    id: "c17-reserva", caso: 17, location: "prefeitura", titulo: "Reserva de contingência do município", tipo: "documento", confiabilidade: "confirmada", icone: "🗂️", fonte: SIM,
    texto: (c) => `A lei orçamentária mantém uma reserva de contingência de ${c.money(1.5)} para eventos imprevistos. Usá-la exige ato formal e justificativa, mas não exige esperar um novo orçamento.`,
  },
  {
    id: "c17-ofertas", caso: 17, location: "secretaria", titulo: "Pasta: propostas “emergenciais”", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: "Três empresas oferecem nebulização, mão de obra de campo e insumos. Para o mesmo item, os preços variam até três vezes (hora de agente de campo: R$ 38, R$ 61 e R$ 115). Nenhuma proposta menciona pesquisa de preço ou publicidade.",
  },

  /* ───── Caso 18 — audiência pública ───── */
  {
    id: "c18-indicadores", caso: 18, location: "secretaria", titulo: "Relatório de indicadores do quadrimestre", tipo: "dado", confiabilidade: "confirmada", icone: "📊", fonte: EST,
    texto: "Os indicadores abaixo vêm do histórico da sua gestão — nada é inventado.",
    dinamico: (c) => {
      const s = c.state;
      if (!s) return "";
      return `Qualidade ${s.pub.qualidade.toFixed(0)}/100 · Acesso ${s.pub.acesso.toFixed(0)}/100 · Espera por consulta ${s.pub.filaMin.toFixed(0)} dias · Insumos ${s.pub.estoqueDias.toFixed(0)} dias · Confiança ${s.attrs.confianca.toFixed(0)}/100.`;
    },
  },
  {
    id: "c18-metas", caso: 18, location: "planejamento", titulo: "Metas da Programação Anual de Saúde", tipo: "dado", confiabilidade: "confirmada", icone: "📋", fonte: SIM,
    texto: "Metas pactuadas para o ano: acesso acima de 60 pontos, espera por consulta de até 45 dias e insumos para pelo menos 15 dias. Algumas serão cumpridas, outras não — e as duas coisas precisam aparecer.",
    dinamico: (c) => {
      const s = c.state;
      if (!s) return "";
      const ok = (b: boolean) => (b ? "cumprida" : "não cumprida");
      return `Acesso (${s.pub.acesso.toFixed(0)}): ${ok(s.pub.acesso >= 60)} · Espera por consulta (${s.pub.filaMin.toFixed(0)} dias): ${ok(s.pub.filaMin <= 45)} · Insumos (${s.pub.estoqueDias.toFixed(0)} dias): ${ok(s.pub.estoqueDias >= 15)}.`;
    },
  },
  {
    id: "c18-convite", caso: 18, location: "camara", titulo: "Convocação da audiência pública quadrimestral", tipo: "documento", confiabilidade: "confirmada", icone: "📄", fonte: SIM,
    texto: "A Comissão de Saúde convocou a audiência pública do quadrimestre, com a presença do Conselho Municipal de Saúde. Pauta: receitas, despesas, indicadores e metas — inclusive as não cumpridas.",
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
  /* ───── Nível 2 ───── */
  {
    id: "f-cobertura", caso: 11, a: "c11-cobertura", b: "c11-demanda", titulo: "A cobertura falta onde a UPA lota", autoPorConhecimento: ["gargalo", "medir-antes"],
    texto: "Os dois bairros com menos cobertura (Vila Nova, 27%, e Morro do Sol, 33%) geram 59% dos atendimentos de baixa complexidade na UPA. O Jardim das Flores, com 86% de cobertura, gera 9%. Uma UBS nova faz mais diferença onde falta cobertura.",
  },
  {
    id: "f-custeio", caso: 12, a: "c12-emenda", b: "c12-custeio", titulo: "A emenda paga o aparelho, não o funcionamento", autoPorConhecimento: ["custo-total", "medir-antes"],
    texto: (c) => `A emenda cobre a compra, mas o município pagaria cerca de ${c.money(0.6)} por ano para operar o equipamento e ${c.money(0.3)} em sala blindada. Sem isso, o tomógrafo fica encaixotado.`,
  },
  {
    id: "f-operacao", caso: 12, a: "c12-custeio", b: "c12-exames", titulo: "Bem operado, o aparelho se paga", autoPorConhecimento: ["custo-total", "gargalo"],
    texto: (c) => `Hoje a rede paga cerca de ${c.money(1.1)} por ano em tomografias compradas. Com sala, equipe e manutenção garantidas, o aparelho próprio substitui parte dessa compra; sem plano de operação, vira despesa parada.`,
  },
  {
    id: "f-ata", caso: 13, a: "c13-ata", b: "c13-consumo", titulo: "A ata cobre o consumo e custa menos", autoPorConhecimento: ["custo-total", "gargalo"],
    texto: (c) => `O consumo anual da rede (${c.money(1.6)}) cabe nas quantidades da ata, e o preço é cerca de 18% menor: aderir poupa algo perto de ${c.money(0.29)} e evita uma nova licitação.`,
  },
  {
    id: "f-fracionamento", caso: 13, a: "c13-dispensas", b: "c13-consumo", titulo: "Cinco notas pequenas, uma compra só", autoPorConhecimento: ["controle-interno", "conflito-interesses"],
    texto: (c) => `Cinco contratos para uma única necessidade anual de ${c.money(1.6)} é fracionamento: a soma é uma compra só. Mesmo que cada parte pareça legal, o conjunto burla a licitação.`,
  },
  {
    id: "f-risco", caso: 14, a: "c14-fila", b: "c14-protocolo", titulo: "Quem espera mais nem sempre precisa mais", autoPorConhecimento: ["gargalo", "medir-antes"],
    texto: "Aplicando o protocolo à fila de cardiologia, cerca de 38% (perto de 700 pessoas) podem ser resolvidas na UBS, enquanto 120 casos de alto risco esperam mais de 300 dias. A fila por ordem de chegada trata igual quem não é igual.",
  },
  {
    id: "f-folha", caso: 15, a: "c15-folha", b: "c15-vagas", titulo: "Repor aposentadorias pode; disfarçar a conta, não", autoPorConhecimento: ["controle-interno", "conflito-interesses"],
    texto: "Repor as 14 aposentadorias é permitido na saúde. Os outros 24 postos exigem reorganizar escalas e jornadas e esperar a folha cair. Contratar 40 pessoas por cooperativa, com horário fixo e chefia da Secretaria, não tira a despesa do limite: ela conta como pessoal.",
  },
  {
    id: "f-credito", caso: 16, a: "c16-loa", b: "c16-saldos", titulo: "Há dinheiro parado — e há um caminho legal", autoPorConhecimento: ["execucao-despesa", "controle-interno"],
    texto: (c) => `A necessidade (${c.money(0.7)}) passa do que o decreto pode suplementar (0,5%) e pode ser coberta pelos saldos de obras paradas (${c.money(1.1)}), com a fonte indicada e projeto de lei à Câmara. Usar o saldo sem autorização seria remanejar por conta própria.`,
  },
  {
    id: "f-emergencia", caso: 17, a: "c17-ofertas", b: "c17-reserva", titulo: "A reserva existe; o preço ainda precisa ser conferido", autoPorConhecimento: ["reserva-urgencia", "custo-total"],
    texto: (c) => `A reserva (${c.money(1.5)}) permite agir já, e a lei permite contratação emergencial — mas os preços variam até três vezes entre as propostas. Pesquisar preço em horas e publicar a contratação dá velocidade sem perder o recibo.`,
  },
  {
    id: "f-prestar", caso: 18, a: "c18-indicadores", b: "c18-metas", titulo: "Metas cumpridas e não cumpridas", autoPorConhecimento: ["transparencia"],
    texto: "Os números mostram metas cumpridas e não cumpridas. Uma prestação de contas honesta inclui as duas coisas e o plano de correção; mostrar só o que agrada reduz a confiança quando a verdade aparece.",
  },
];

export const CLUE_BY_ID = Object.fromEntries(CLUES.map((c) => [c.id, c])) as Record<string, ClueDef>;
export const FINDING_BY_ID = Object.fromEntries(FINDINGS.map((f) => [f.id, f])) as Record<string, FindingDef>;
