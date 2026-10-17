import type { ConceptId } from "../../engine/types";
import type { AchievementDef, CaseDef, ClueDef, Concept, DecisionDef, FindingDef, OptionDef } from "../types";
import { DEV, m, opt, type O } from "../cases-n2";
import { talk } from "../conversations-n2";
import type { LevelContent, LocSpec } from "./tipos";

/**
 * Nível 3 — Articulador(a) Regional de Saúde (casos 19–24).
 * Cenário fictício: Consórcio Intermunicipal de Saúde de uma região de 8 municípios.
 * Valores em % do orçamento (estimado) do Consórcio; espera por transferência em horas.
 */

const SIM = { rotulo: "Documento do cenário (valores simulados)", classificacao: "simulado" as const };
const EST = { rotulo: "Parâmetro do cenário (estimativa didática)", classificacao: "estimativa" as const };
const opc = (o: O & { conquista?: string }): OptionDef => ({ ...opt(o), conquista: o.conquista });
const DESVIO_TXT = "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado.";
const GANHO_DESVIO = () => "Ganho pessoal ilícito (fictício): até 10% da base do evento";

/* ═════════════════════════ Locais ═════════════════════════ */

const locais: LocSpec[] = [
  {
    id: "consorcio", nome: "Sede do Consórcio Intermunicipal de Saúde", curto: "Consórcio", tema: "gabinete", mesa: true,
    descricao: "Sala da secretaria-executiva: contratos de rateio, atas e uma cafeteira que atende oito municípios.",
    pessoas: [
      { id: "sonia", char: "sonia", falas: [[19, "n3-sonia-abertura", "Sônia: seu primeiro dia no Consórcio"], [21, "n3-sonia-central", "Sônia: a ideia da central"], [23, "n3-sonia-estudo", "Sônia: o estudo do centro de diagnóstico"], [24, "n3-sonia-fechamento", "Sônia: o balanço do mandato"]] },
      { id: "guardiao", char: "guardiao", falas: [[19, "n3-guardiao-rateio", "Guardião: o caixa do Consórcio"]] },
      { id: "juninho", char: "juninho", falas: [[21, "n3-juninho-ambulancias", "Juninho: a oferta de ambulâncias"]] },
    ],
    itens: [
      { id: "painel-rateio", icone: "📊", onde: "parede", pistas: [[19, "c19-rateio", "Painel: rateio por município"], [24, "c24-execucao", "Painel: execução do ano"]] },
      { id: "pasta-contratos", icone: "🗂️", onde: "mesa", pistas: [[19, "c19-contrato", "Pasta: contrato de rateio"], [22, "c22-minuta", "Pasta: minuta de prorrogação"]] },
      { id: "pasta-propostas", icone: "📁", onde: "mesa", pistas: [[21, "c21-proposta", "Pasta: proposta de ambulâncias"], [23, "c23-estudo", "Pasta: estudo de viabilidade"]] },
    ],
    portas: ["cir", "hospregional", "vizinho", "transporte"],
  },
  {
    id: "cir", nome: "Comissão Intergestores Regional (CIR)", curto: "CIR", tema: "reuniao",
    descricao: "Mesa comprida onde os oito secretários de saúde sentam para pactuar — e para discordar com educação.",
    pessoas: [
      { id: "celia", char: "celia", falas: [[20, "n3-celia-cir", "Dona Célia: o olhar do conselho regional"], [23, "n3-celia-acesso", "Dona Célia: quem chega longe"], [24, "n3-celia-prestacao", "Dona Célia: a prestação de contas"]] },
      { id: "bento", char: "bento", falas: [[22, "n3-bento-gestao", "Professor Bento: gestão por contrato"]] },
    ],
    itens: [
      { id: "painel-fluxo", icone: "🔀", onde: "parede", pistas: [[20, "c20-fluxo", "Painel: fluxo de pacientes entre municípios"]] },
      { id: "quadro-atas", icone: "📜", onde: "parede", pistas: [[20, "c20-ppi", "Quadro: pactuação vigente"], [24, "c24-atas", "Quadro: atas da CIR"]] },
      { id: "caderno", icone: "📓", onde: "mesa", pistas: [[24, "c24-conselho", "Caderno do conselho regional"]] },
    ],
    portas: ["consorcio", "hospregional"],
  },
  {
    id: "hospregional", nome: "Hospital Regional", curto: "Hospital", tema: "hospital",
    descricao: "Corredores cheios, maca no corredor e um diretor que fala de orçamento até dormindo.",
    pessoas: [
      { id: "heitor", char: "heitor", falas: [[20, "n3-heitor-fluxo", "Dr. Heitor: pacientes sem guia"], [22, "n3-heitor-contrato", "Dr. Heitor: o contrato do hospital"]] },
      { id: "ana", char: "ana", falas: [[22, "n3-ana-metas", "Ana: o que o contrato cumpriu"]] },
    ],
    itens: [
      { id: "mural-triagem", icone: "📋", onde: "parede", pistas: [[20, "c20-relato", "Mural da triagem"], [22, "c22-metas", "Painel de metas do contrato"]] },
      { id: "relatorio-financeiro", icone: "💻", onde: "mesa", pistas: [[22, "c22-custo", "Relatório de repasses e custos"]] },
    ],
    portas: ["consorcio", "cir"],
  },
  {
    id: "vizinho", nome: "Prefeitura de Pedra Alta (município vizinho)", curto: "Pedra Alta", tema: "gabinete",
    descricao: "Gabinete com bandeira, fotos de inauguração e uma maquete do hospital que ainda não existe.",
    pessoas: [
      { id: "osvaldo", char: "osvaldo", falas: [[19, "n3-osvaldo-desconto", "Prefeito Osvaldo: o pedido de desconto"], [20, "n3-osvaldo-vagas", "Prefeito Osvaldo: os pacientes"], [23, "n3-osvaldo-terreno", "Prefeito Osvaldo: o terreno"]] },
    ],
    itens: [
      { id: "maquete", icone: "🏗️", onde: "parede", pistas: [[23, "c23-pressao", "Maquete e carta-oferta de terreno"]] },
      { id: "oficio-prefeito", icone: "📄", onde: "mesa", pistas: [[19, "c19-pedido", "Ofício do Prefeito Osvaldo"]] },
    ],
    portas: ["consorcio", "transporte"],
  },
  {
    id: "transporte", nome: "Central de Transporte Sanitário", curto: "Transporte", tema: "dados",
    descricao: "Mapa na parede, rádio ligado e uma lousa com as viagens do dia (e as viagens vazias).",
    pessoas: [
      { id: "roberto", char: "roberto", falas: [[21, "n3-roberto-frota", "Roberto: a frota e as viagens"]] },
    ],
    itens: [
      { id: "painel-frota", icone: "🚑", onde: "parede", pistas: [[21, "c21-frota", "Painel: frota dos municípios"], [23, "c23-deslocamento", "Mapa de deslocamento"]] },
      { id: "planilha-viagens", icone: "💻", onde: "mesa", pistas: [[21, "c21-custo", "Planilha: custo por viagem"]] },
    ],
    portas: ["consorcio", "vizinho"],
  },
];

/* ═════════════════════════ Pistas ═════════════════════════ */

const pistas: ClueDef[] = [
  /* ───── Caso 19 — rateio atrasado ───── */
  {
    id: "c19-rateio", caso: 19, location: "consorcio", titulo: "Painel do rateio por município", tipo: "dado", confiabilidade: "confirmada", icone: "📊", fonte: SIM,
    texto: (c) => `O contrato de rateio divide o custeio do Consórcio (${c.money(6)} por ano) segundo um critério objetivo: a população de cada município. Pedra Alta, com 21% da população, deixou de pagar 4 das 12 parcelas deste ano.`,
    tabela: () => [["Vila Serena (48 mil hab.)", "28% · em dia"], ["Pedra Alta (36 mil hab.)", "21% · 4 parcelas atrasadas"], ["Santa Aurora (24 mil hab.)", "14% · em dia"], ["Rio das Cotias (20 mil hab.)", "12% · em dia"], ["Monte Claro (16 mil hab.)", "9% · em dia"], ["Outros três (26 mil hab.)", "16% · em dia"]],
  },
  {
    id: "c19-contrato", caso: 19, location: "consorcio", titulo: "Contrato de rateio e protocolo do Consórcio", tipo: "documento", confiabilidade: "confirmada", icone: "🗂️", fonte: { rotulo: "Lei 11.107/2005 (Consórcios Públicos) — contrato de rateio", classificacao: "oficial", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11107.htm" },
    texto: "Os municípios só entregam recursos ao Consórcio por meio de contrato de rateio, firmado a cada exercício e compatível com o orçamento de cada ente. O critério de divisão vale para todos e só muda por decisão da assembleia, não por pedido individual. O atraso gera juros previstos no contrato e, persistindo, pode levar à suspensão do município.",
  },
  {
    id: "c19-pedido", caso: 19, location: "vizinho", titulo: "Ofício do Prefeito Osvaldo", tipo: "opiniao", confiabilidade: "opiniao", icone: "📄", fonte: SIM,
    texto: (c) => `“Pedra Alta é a cidade que mais recebe pacientes de fora e merece desconto de 30% no rateio, inclusive retroativo.” O ofício não traz números de atendimento. As quatro parcelas atrasadas somam cerca de ${c.money(0.42)}; o desconto pedido tiraria perto de ${c.money(0.38)} do caixa do ano.`,
  },

  /* ───── Caso 20 — pactuação de referências ───── */
  {
    id: "c20-fluxo", caso: 20, location: "cir", titulo: "Fluxo de pacientes entre municípios", tipo: "dado", confiabilidade: "confirmada", icone: "🔀", fonte: SIM,
    texto: "Encaminhamentos para ortopedia e cardiologia do Hospital Regional no último trimestre, por município de origem, comparados com as cotas pactuadas.",
    tabela: () => [["Pedra Alta", "412 enviados · cota pactuada 150"], ["Vila Serena", "380 enviados · cota 400"], ["Santa Aurora", "190 enviados · cota 200"], ["Rio das Cotias", "150 enviados · cota 160"], ["Demais municípios", "208 enviados · cota 260"]],
  },
  {
    id: "c20-ppi", caso: 20, location: "cir", titulo: "Pactuação vigente e fluxo de contrarreferência", tipo: "documento", confiabilidade: "confirmada", icone: "📜", fonte: { rotulo: "Decreto 7.508/2011 (regiões de saúde, CIR e referências)", classificacao: "oficial", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/decreto/d7508.htm" },
    texto: "A pactuação foi aprovada na CIR há três anos e define quem referencia quem, em quais cotas e com qual protocolo. Pelo desenho regional, o paciente volta ao município de origem após a alta (contrarreferência), com plano de acompanhamento. A pactuação não é revista desde que Pedra Alta triplicou o encaminhamento.",
  },
  {
    id: "c20-relato", caso: 20, location: "hospregional", titulo: "Mural da triagem do Hospital", tipo: "opiniao", confiabilidade: "opiniao", icone: "📋", fonte: SIM,
    texto: "Recado fixado pela triagem: “Chegaram 9 pacientes de ortopedia sem guia de encaminhamento e 14 altas sem para onde voltar. Maca no corredor de novo.” O relato é de quem está na porta; os números completos estão no painel da CIR.",
  },

  /* ───── Caso 21 — transporte sanitário ───── */
  {
    id: "c21-frota", caso: 21, location: "transporte", titulo: "Painel da frota dos municípios", tipo: "dado", confiabilidade: "confirmada", icone: "🚑", fonte: SIM,
    texto: "Cada município mantém suas ambulâncias, com motorista, seguro e manutenção, e cada uma roda quase sempre sozinha: na ida levam o paciente e na volta voltam vazias.",
    tabela: () => [["Ambulâncias em operação na região", "14"], ["Viagens por mês (todas)", "1.260"], ["Taxa de ocupação média", "38%"], ["Viagens de volta sem paciente", "62%"], ["Ambulâncias paradas aguardando peça", "3"]],
  },
  {
    id: "c21-custo", caso: 21, location: "transporte", titulo: "Planilha de custo por viagem", tipo: "dado", confiabilidade: "incompleta", icone: "💻", fonte: EST,
    texto: (c) => `Estimativa da Central: com a regulação do transporte e viagens combinadas, o custo por viagem cai em torno de 30%. Frota avulsa: ${c.money(2.6)} por ano para 5 veículos novos com manutenção. Central compartilhada com 8 veículos regulados: ${c.money(2.0)} por ano. A estimativa não inclui o custo do sistema de regulação (cerca de ${c.money(0.3)}).`,
    tabela: () => [["Custo médio por viagem (frota avulsa)", "R$ 410"], ["Custo médio por viagem (central regulada)", "R$ 285"], ["Tempo médio até a transferência hoje", "30 h"], ["Tempo estimado com central", "22 h"]],
  },
  {
    id: "c21-proposta", caso: 21, location: "consorcio", titulo: "Proposta de venda de 5 ambulâncias", tipo: "documento", confiabilidade: "incompleta", icone: "📁", fonte: SIM,
    texto: (c) => `Uma revendedora, apresentada pelo Primo Juninho, oferece 5 ambulâncias “com desconto de fim de ano”, por ${c.money(2.6)}. A proposta não detalha manutenção, motoristas, seguro nem como os veículos seriam divididos entre os municípios. É uma única cotação.`,
  },

  /* ───── Caso 22 — contrato de gestão do hospital ───── */
  {
    id: "c22-metas", caso: 22, location: "hospregional", titulo: "Painel de metas do contrato de gestão", tipo: "dado", confiabilidade: "confirmada", icone: "📈", fonte: SIM,
    texto: "O contrato vigente do Hospital Regional, com a organização gestora, tinha metas de produção e de qualidade. Resultado do ano que termina:",
    tabela: () => [["Cirurgias eletivas/mês (meta 320)", "268 · 84%"], ["Taxa de ocupação de leitos (meta 85%)", "92% · acima do desejável"], ["Tempo médio de permanência (meta 5,0 dias)", "6,3 dias"], ["Pacientes avaliados como bem atendidos (meta 90%)", "81%"], ["Relatório trimestral entregue no prazo", "2 de 4"]],
  },
  {
    id: "c22-custo", caso: 22, location: "hospregional", titulo: "Relatório de repasses e custos", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: (c) => `O Consórcio repassou ${c.money(5.0)} no ano ao hospital, em parcelas fixas, independentemente de resultado. O custo por leito subiu 9% no período, sem que o número de leitos ou de cirurgias tivesse crescido na mesma proporção.`,
  },
  {
    id: "c22-minuta", caso: 22, location: "consorcio", titulo: "Minuta de termo aditivo de prorrogação", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: (c) => `A minuta prorroga o contrato por mais 12 meses “nas mesmas condições”, no valor de ${c.money(5.0)}. Não traz metas, indicadores, penalidades nem comissão de acompanhamento. O Diretor Heitor pediu “agilidade para não parar o hospital”.`,
  },

  /* ───── Caso 23 — localização do centro de diagnóstico ───── */
  {
    id: "c23-deslocamento", caso: 23, location: "transporte", titulo: "Mapa de demanda e deslocamento", tipo: "dado", confiabilidade: "confirmada", icone: "🗺️", fonte: SIM,
    texto: "Exames de imagem e diagnóstico que a região hoje compra fora, por município, e tempo médio de viagem até cada local candidato ao novo centro.",
    tabela: () => [["Vila Serena (48 mil hab.)", "1.900 exames/mês · 25 min do polo"], ["Santa Aurora (24 mil hab.)", "850/mês · 40 min"], ["Rio das Cotias (20 mil hab.)", "720/mês · 55 min"], ["Pedra Alta (36 mil hab.)", "1.100/mês · 90 min"], ["Tempo médio da população ao centro: em Santa Aurora", "48 min"], ["Tempo médio da população ao centro: em Pedra Alta", "92 min"]],
  },
  {
    id: "c23-estudo", caso: 23, location: "consorcio", titulo: "Estudo de viabilidade do centro de diagnóstico", tipo: "documento", confiabilidade: "confirmada", icone: "📁", fonte: EST,
    texto: (c) => `O estudo técnico aponta que o centro precisa de pelo menos 3.000 exames por mês para se pagar e custa cerca de ${c.money(3.0)} para instalar. Em Santa Aurora, ponto central da rede, 74% da população chega ao centro em até 60 minutos; em Pedra Alta, 31%.`,
  },
  {
    id: "c23-pressao", caso: 23, location: "vizinho", titulo: "Carta-oferta de terreno do Prefeito Osvaldo", tipo: "opiniao", confiabilidade: "opiniao", icone: "📄", fonte: SIM,
    texto: "“Doamos o terreno. Pedra Alta merece o centro, e quem pensa diferente não conhece a história da cidade.” A carta não traz população atendida, tempo de deslocamento nem estudo de custo. O terreno fica em área de difícil acesso para a maior parte da região.",
  },

  /* ───── Caso 24 — prestação de contas regional ───── */
  {
    id: "c24-execucao", caso: 24, location: "consorcio", titulo: "Painel de execução do ano", tipo: "dado", confiabilidade: "confirmada", icone: "📊", fonte: SIM,
    texto: "Resultado do ano do Consórcio, com o que foi cumprido e o que ficou para trás. A prestação de contas precisa mostrar as duas colunas.",
    tabela: () => [["Rateio arrecadado", "97% do previsto"], ["Pactuações revistas na CIR", "2 de 3 planejadas"], ["Central de transporte em operação", "sim, desde o 3º trimestre"], ["Metas do contrato do hospital cumpridas", "5 de 8"], ["Centro de diagnóstico", "obra iniciada, 35% executada"]],
  },
  {
    id: "c24-atas", caso: 24, location: "cir", titulo: "Atas da CIR do ano", tipo: "documento", confiabilidade: "confirmada", icone: "📜", fonte: SIM,
    texto: "As atas registram o que foi decidido: pactuação de referências, cotas do hospital, regras do rateio e do transporte. Duas decisões ainda estão pendentes de cumprimento, e três atas não foram publicadas no portal do Consórcio.",
  },
  {
    id: "c24-conselho", caso: 24, location: "cir", titulo: "Caderno do conselho regional", tipo: "opiniao", confiabilidade: "opiniao", icone: "📓", fonte: SIM,
    texto: "Anotações de Dona Célia: “O conselho quer saber três coisas: quanto cada cidade pagou, quanto cada cidade usou e o que ficou prometido e não saiu. Quem não prestou contas ano passado voltou a ser chamado de ‘a administração do mistério’.”",
  },
];

/* ═════════════════════════ Achados ═════════════════════════ */

const achados: FindingDef[] = [
  {
    id: "f19-criterio", caso: 19, a: "c19-rateio", b: "c19-contrato", titulo: "O critério vale para todos — e o atraso pesa nos outros", autoPorConhecimento: ["custo-total", "controle-interno"],
    texto: (c) => `O rateio é por população, igual para todos, e só muda por decisão coletiva. Pedra Alta deve cerca de ${c.money(0.42)}; um desconto individual teria de ser coberto pelos outros sete municípios ou por menos serviço. O caminho previsto é cobrar o devido, com juros do contrato, e negociar um parcelamento formal.`,
  },
  {
    id: "f19-uso", caso: 19, a: "c19-rateio", b: "c19-pedido", titulo: "Pedido sem dado não muda o critério", autoPorConhecimento: ["medir-antes"],
    texto: "O pedido do Prefeito afirma que Pedra Alta atende muitos pacientes de fora, mas não apresenta números. Se houver um uso maior, a revisão do critério passa pela assembleia, com dados de todos; um desconto avulso beneficiaria um e prejudicaria os outros.",
  },
  {
    id: "f20-excesso", caso: 20, a: "c20-fluxo", b: "c20-ppi", titulo: "Pedra Alta envia quase o triplo da cota", autoPorConhecimento: ["fila-regulada", "medir-antes"],
    texto: "Pedra Alta encaminhou 412 pacientes contra uma cota pactuada de 150, enquanto os outros municípios usaram menos do que tinham combinado. A pactuação não é revista há três anos e não prevê contrarreferência efetiva: o hospital recebe, mas o paciente não tem para onde voltar.",
  },
  {
    id: "f21-central", caso: 21, a: "c21-frota", b: "c21-custo", titulo: "Frota ociosa custa mais que frota dividida", autoPorConhecimento: ["compra-compartilhada", "custo-total"],
    texto: (c) => `Com 38% de ocupação e 62% das voltas vazias, a frota atual é cara para o que entrega. Uma central regulada, com 8 veículos e viagens combinadas, custa cerca de ${c.money(2.0)} e reduz o custo por viagem de R$ 410 para R$ 285, além de encurtar a espera por transferência.`,
  },
  {
    id: "f21-avulsa", caso: 21, a: "c21-proposta", b: "c21-custo", titulo: "Comprar mais carros não resolve a ociosidade", autoPorConhecimento: ["custo-total", "controle-interno"],
    texto: (c) => `A proposta traz 5 veículos por ${c.money(2.6)}, com uma única cotação e sem manutenção ou motoristas. Mais ambulâncias avulsas aumentariam a frota parada e o custo fixo; o gargalo é de organização das viagens, não de quantidade de carros.`,
  },
  {
    id: "f22-metas", caso: 22, a: "c22-metas", b: "c22-custo", titulo: "Repasse fixo, resultado abaixo da meta", autoPorConhecimento: ["medir-antes", "custo-total"],
    texto: (c) => `O hospital recebeu ${c.money(5.0)} em parcelas fixas e entregou 84% das cirurgias previstas, ocupação acima do desejável e metade dos relatórios no prazo. Um contrato com metas, indicadores e parte variável do pagamento torna a cobrança possível; a prorrogação sem metas repetiria a situação.`,
  },
  {
    id: "f23-polo", caso: 23, a: "c23-deslocamento", b: "c23-estudo", titulo: "O ponto central serve mais gente com menos viagem", autoPorConhecimento: ["planejamento-necessidade", "gargalo"],
    texto: "Santa Aurora concentra o maior fluxo da rede, com 74% da população a até 60 minutos do centro (contra 31% em Pedra Alta) e o volume mínimo de exames para o centro se pagar. Instalar onde há demanda e acesso atende mais pessoas; o terreno doado não compensa a distância.",
  },
  {
    id: "f24-lacunas", caso: 24, a: "c24-execucao", b: "c24-atas", titulo: "A prestação de contas precisa mostrar também o pendente", autoPorConhecimento: ["transparencia", "controle-interno"],
    texto: "Há conquistas (central de transporte, rateio quase todo em dia) e pendências (duas decisões da CIR por cumprir, três atas sem publicação, metade do contrato do hospital fora da meta). Prestar contas é apresentar as duas listas, com o plano para a segunda.",
  },
];

/* ═════════════════════════ Conversas ═════════════════════════ */

const conversas = [
  /* ───── Caso 19 ───── */
  talk("n3-sonia-abertura", 19, "consorcio", "sonia", "Seu primeiro dia no Consórcio", [
    ["feliz", "Bem-vindo(a) ao Consórcio, Articulador(a)! Sônia Pacheco, secretária-executiva. Aqui, oito municípios dividem hospital, transporte e exames que nenhum conseguiria sozinho."],
    ["serio", "A regra do jogo: cada um paga a sua parte pelo contrato de rateio, e as grandes decisões saem da Comissão Intergestores Regional. Quando todos pagam e pactuam, funciona. Quando um falha, os outros sete sentem."],
    ["irônico", "E adivinha: o primeiro problema já está na sua mesa. Pedra Alta atrasou o rateio e o Prefeito Osvaldo quer desconto. Com muito carinho, claro."],
  ], [
    ["Vou olhar o contrato e os números antes.", ["feliz", "Música para os meus ouvidos. O painel e a pasta de contratos estão aqui na sala. O Guardião cuida do caixa e o Prefeito Osvaldo está na cidade dele."], { attrs: { competencia: 1 }, rel: { sonia: 4 } }],
    ["Qual a posição de cada município?", ["serio", "Oito municípios, oito prioridades e uma única mesa. Em consórcio, conversar bastante é uma obrigação, não um defeito."], { rel: { sonia: 2 } }],
  ], { apresentacao: "3d", auto: true }),
  talk("n3-guardiao-rateio", 19, "consorcio", "guardiao", "O caixa do Consórcio", [
    ["serio", "Sou o tesoureiro do Consórcio. Com Pedra Alta atrasada, o caixa já está apertado: pago os fornecedores em dia ou pago a folha — os dois, não."],
    ["preocupado", "Se eu cobrir o buraco com o rateio dos outros, estou fazendo um empréstimo que ninguém autorizou."],
  ], [
    ["Vamos cobrar o devido, com parcelamento formal.", ["feliz", "Assim eu consigo prever o caixa. Parcelamento por escrito e juros do contrato — sem favor e sem surpresa."], { rel: { guardiao: 4 } }],
    ["Dá para usar a reserva dos outros municípios?", ["irritado", "Sem contrato, é dinheiro de oito donos nas mãos de um só devedor. Eu não faria."], { rel: { guardiao: -2 }, attrs: { competencia: 1 } }],
  ]),
  talk("n3-osvaldo-desconto", 19, "vizinho", "osvaldo", "O pedido de desconto", [
    ["feliz", "Articulador(a)! Que prazer! Pedra Alta é a locomotiva da região: recebe paciente de todo canto e ainda paga rateio. Quero 30% de desconto — ontem."],
    ["irônico", "Não fique com essa cara de planilha. Entre amigos, a gente se entende."],
  ], [
    ["Preciso ver os números de uso. E o parcelamento do atraso.", ["serio", "Números... Bem, se o senhor insiste. Mas lembre: a região precisa de Pedra Alta. E de uma foto sua comigo, de preferência."], { rel: { osvaldo: -2 }, attrs: { competencia: 1 } }],
    ["Vou ver o que dá para fazer pelo desconto.", ["feliz", "Sabia que o senhor era um homem de visão! Mande o termo. Eu assino sorrindo."], { rel: { osvaldo: 6 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 20 ───── */
  talk("n3-celia-cir", 20, "cir", "celia", "O olhar do conselho regional", [
    ["serio", "Boa tarde! Agora represento o conselho regional de saúde. O senhor sabe que, na minha cidade, a paciente de ortopedia chegou ao hospital de Pedra Alta com a guia errada?"],
    ["triste", "Ninguém explica nada para quem está na maca. Cada município diz que é do outro."],
  ], [
    ["A CIR precisa rever a pactuação.", ["feliz", "É isso. Pactuar não é empurrar: é combinar quem atende o quê, para onde o paciente vai e como volta."], { rel: { celia: 5 }, attrs: { confianca: 1 } }],
    ["Vou pedir mais vagas ao Hospital Regional.", ["irônico", "Vaga sem regra é fila com outro nome."], { rel: { celia: -1 } }],
  ]),
  talk("n3-heitor-fluxo", 20, "hospregional", "heitor", "Pacientes sem guia", [
    ["serio", "Dr. Heitor Brandão. Há trinta anos aprendo que ortopedia não é problema de município: é problema de maca. Hoje, nove pacientes chegaram sem guia."],
    ["preocupado", "Recebo, atendo e, na alta, não sei para onde mandar. Ninguém quer o paciente de volta. Se continuar assim, o hospital vira depósito."],
  ], [
    ["Precisamos de contrarreferência pactuada.", ["feliz", "Finalmente! Se cada município assumir a volta com plano de cuidado, libero leito e atendo mais gente."], { rel: { heitor: 4 } }],
    ["O hospital pode atender todos, sem limite?", ["irritado", "Sem limite, os leitos acabam e quem sofre é quem precisa de verdade. Cota existe para isso."], { rel: { heitor: -1 }, attrs: { competencia: 1 } }],
  ]),
  talk("n3-osvaldo-vagas", 20, "vizinho", "osvaldo", "Os pacientes de Pedra Alta", [
    ["irônico", "Dizem que mando pacientes demais. Pois mando mesmo! Quem tem hospital bom que atenda. Aqui o povo não pode esperar."],
    ["serio", "Cota? Pactuação? A pessoa com a perna quebrada não lê ata."],
  ], [
    ["A pactuação protege o paciente, inclusive os seus.", ["serio", "Se for para valer, eu sento na CIR. Mas quero voz — e quero reajustar a cota de Pedra Alta."], { rel: { osvaldo: 2 }, attrs: { persuasao: 1 } }],
    ["Vou dar prioridade aos seus pacientes.", ["feliz", "Aí sim! Combinado. E ninguém precisa saber."], { rel: { osvaldo: 6 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 21 ───── */
  talk("n3-roberto-frota", 21, "transporte", "roberto", "A frota e as viagens", [
    ["serio", "Roberto, fiscal de contratos, emprestado para a Central. Passei a semana contando ambulâncias. Treze rodando, três paradas por peça."],
    ["irônico", "A ambulância vai cheia e volta vazia. Se existisse a ‘ambulância solidária’, dava para trazer alguém na volta. Mas cada prefeitura quer a sua, com a sua pintura."],
  ], [
    ["Uma central dividida poderia combinar as viagens?", ["feliz", "Poderia! Regulação, rota combinada e manutenção única. Dá trabalho no começo, mas o custo por viagem despenca."], { rel: { roberto: 5 } }],
    ["Mais veículos resolveriam?", ["serio", "Mais veículos sem regra são mais viagens vazias. O problema é a organização das viagens."], { rel: { roberto: 2 }, attrs: { competencia: 1 } }],
  ]),
  talk("n3-juninho-ambulancias", 21, "consorcio", "juninho", "A oferta de ambulâncias", [
    ["feliz", "Primo! Olha que oportunidade: cinco ambulâncias zero, com desconto de fim de ano. Eu conheço o pessoal da revendedora."],
    ["irônico", "Compra rápida, foto bonita, cada prefeito com a sua. Todo mundo feliz!"],
  ], [
    ["Quero outras cotações e ver a manutenção.", ["triste", "Outras cotações? Mas essa é a melhor. Pelo menos eu acho."], { rel: { juninho: -3 }, attrs: { competencia: 1 } }],
    ["Manda o contrato, primo.", ["feliz", "Sabia que podia contar contigo! Uma comissãozinha para a família, ninguém vai notar."], { rel: { juninho: 6 }, attrs: { caraDePau: 2 } }],
  ]),
  talk("n3-sonia-central", 21, "consorcio", "sonia", "A ideia da central", [
    ["serio", "Pensei numa central de transporte sanitário: frota compartilhada, regulação única e viagens combinadas. O Consórcio existe para isso."],
    ["preocupado", "O problema é que prefeito gosta de ver a ambulância dele na rua. Mostrar o custo por viagem ajuda mais do que discurso."],
  ], [
    ["Vamos levar o custo por viagem à CIR.", ["feliz", "Boa. Número no quadro convence mais que promessa."], { rel: { sonia: 4 }, attrs: { persuasao: 1 } }],
    ["Podemos fazer as duas coisas?", ["irônico", "Duas coisas custam o dobro e parecem uma decisão. Eu escolheria uma."], { rel: { sonia: 1 } }],
  ]),

  /* ───── Caso 22 ───── */
  talk("n3-heitor-contrato", 22, "hospregional", "heitor", "O contrato do hospital", [
    ["serio", "O contrato vence em trinta dias. Renovar sem mudança é o que todos querem: é rápido, sem briga e sem metas para cobrar."],
    ["irônico", "Metas, o senhor sabe, geram relatório. Relatório gera pergunta. Pergunta gera reunião. E eu sou médico, não secretário de reunião."],
  ], [
    ["Metas e indicadores protegem o hospital também.", ["serio", "Se vierem metas realistas e apoio, eu aceito. Só não quero meta feita no escuro."], { rel: { heitor: 2 }, attrs: { persuasao: 1 } }],
    ["Prorrogo como está, para não parar o hospital.", ["feliz", "O senhor é prático! O hospital não para e eu agradeço."], { rel: { heitor: 6 }, attrs: { caraDePau: 1 } }],
  ], { apresentacao: "3d" }),
  talk("n3-ana-metas", 22, "hospregional", "ana", "O que o contrato cumpriu", [
    ["serio", "Ana, da Controladoria. Conferi os relatórios trimestrais: dois de quatro chegaram no prazo, e nenhum trouxe o custo por leito."],
    ["preocupado", "Pagar parcela fixa sem medir resultado é pagar pela intenção. Se prorrogar sem metas, eu assino o parecer com ressalva."],
  ], [
    ["Quais indicadores você incluiria?", ["feliz", "Ocupação, permanência, cirurgias, satisfação e prazo dos relatórios. Parte do pagamento variável, para dar o que cobrar."], { rel: { ana: 5 }, attrs: { competencia: 1 } }],
    ["Isso não complica o hospital?", ["irônico", "Complica tanto quanto complica o piloto ter altímetro. É só o que faz o voo ser previsível."], { rel: { ana: 1 } }],
  ]),
  talk("n3-bento-gestao", 22, "cir", "bento", "Gestão por contrato", [
    ["serio", "Articulador(a), contratar a gestão de um hospital não é entregar a chave e ir embora. O contrato é o seu painel de controle."],
    ["feliz", "Meta clara, indicador medido, relatório no prazo, acompanhamento e consequência. Sem isso, o contrato é apenas um carimbo."],
  ], [
    ["Que consequência faz sentido?", ["serio", "Parte do pagamento ligada ao resultado e prazo para corrigir. O objetivo não é punir; é manter o serviço bom."], { rel: { bento: 4 }, attrs: { conhecimento: 1 } }],
    ["Isso não gera conflito com o hospital?", ["irônico", "Gera uma conversa. Conflito mesmo é o paciente na maca no corredor."], { rel: { bento: 1 } }],
  ]),

  /* ───── Caso 23 ───── */
  talk("n3-osvaldo-terreno", 23, "vizinho", "osvaldo", "O terreno de Pedra Alta", [
    ["feliz", "O centro de diagnóstico tem de ficar aqui! Doamos o terreno, e eu já mandei fazer a maquete. É a cidade que mais precisa."],
    ["irônico", "Quem pensa diferente nunca esteve no baile da padroeira. Aqui é onde o povo se encontra."],
  ], [
    ["Vou comparar todos os locais com dados de acesso.", ["serio", "Dados! O senhor vai me mandar para o fim da fila de novo. Mas tudo bem: a maquete aguenta."], { rel: { osvaldo: -3 }, attrs: { competencia: 1 } }],
    ["Pedra Alta é uma ótima candidata.", ["feliz", "Era isso! Vou mandar inaugurar já."], { rel: { osvaldo: 7 }, attrs: { caraDePau: 2 } }],
  ]),
  talk("n3-sonia-estudo", 23, "consorcio", "sonia", "O estudo do centro de diagnóstico", [
    ["serio", "O estudo de viabilidade é claro: o centro precisa de volume mínimo de exames e de acesso viário. Escolher o lugar errado é pagar duas vezes: pela obra e pelo transporte."],
    ["preocupado", "Politicamente, qualquer escolha cria um descontente. O que muda é se o descontentamento é com a decisão ou com o critério."],
  ], [
    ["Vamos publicar o critério antes da escolha.", ["feliz", "Excelente. Critério público é o melhor guarda-chuva contra pressão."], { rel: { sonia: 5 }, attrs: { confianca: 1 } }],
    ["E se escolhermos o que dá menos briga?", ["irônico", "Menos briga hoje, mais custo amanhã. Mas é uma escolha, sim."], { rel: { sonia: -1 } }],
  ]),
  talk("n3-celia-acesso", 23, "cir", "celia", "Quem chega longe", [
    ["triste", "O senhor sabia que a minha vizinha pegou três ônibus para fazer uma tomografia? Voltou com o exame e a pressão alta."],
    ["serio", "Se o centro ficar longe de quem mais precisa, a gente reabre a fila em outro lugar."],
  ], [
    ["Vou considerar o tempo de deslocamento.", ["feliz", "É disso que estamos falando. O mapa explica melhor que eu."], { rel: { celia: 5 } }],
    ["Pressão política também pesa.", ["irônico", "Pesa em quem vota. Mas a dor de quem espera não vota nem pede audiência."], { rel: { celia: -2 } }],
  ]),

  /* ───── Caso 24 ───── */
  talk("n3-celia-prestacao", 24, "cir", "celia", "A prestação de contas", [
    ["serio", "O conselho regional vai estar na primeira fila. Queremos saber quanto cada cidade pagou, quanto usou e o que ficou prometido."],
    ["triste", "Já ouvi muita apresentação em que só havia fotos de fita cortada."],
  ], [
    ["Vou mostrar o que deu certo, o que falhou e o plano.", ["feliz", "É o relatório que esperávamos. Vamos fazer perguntas, mas com respeito."], { rel: { celia: 6 }, attrs: { confianca: 1 } }],
    ["Vou mostrar os melhores resultados.", ["irônico", "As conquistas a gente vê na rua. É das falhas que a gente quer saber."], { rel: { celia: -2 } }],
  ]),
  talk("n3-sonia-fechamento", 24, "consorcio", "sonia", "O balanço do mandato", [
    ["feliz", "Chegamos ao fim do ciclo. A central roda, a pactuação foi revista e o hospital tem contrato com metas. Foi muita mesa, muito café e pouca briga — para os padrões da região."],
    ["serio", "Falta o capítulo que a maioria esquece: contar tudo para quem paga e para quem usa. Ata, rateio, resultado e pendência."],
  ], [
    ["Vamos publicar tudo no portal do Consórcio.", ["feliz", "Aí o Consórcio deixa de ser a ‘administração do mistério’. Eu preparo as atas."], { rel: { sonia: 5 }, attrs: { confianca: 1 } }],
    ["Basta apresentar na CIR.", ["serio", "A CIR é ótima, mas quem usa o serviço não está na CIR."], { rel: { sonia: 0 } }],
  ], { apresentacao: "3d" }),
];

/* ═════════════════════════ Decisões ═════════════════════════ */

const decisoes: DecisionDef[] = [
  /* ───────── D19 — rateio ───────── */
  {
    id: "d19", caso: 19, mesa: "consorcio", titulo: "O rateio atrasado e o pedido de desconto", conceito: "consorcio-rateio", basePct: 3, gestoPadrao: "assinar",
    papelAssinado: "TERMO DE PARCELAMENTO DO RATEIO — documento fictício",
    pergunta: "Pedra Alta deve quatro parcelas e o Prefeito Osvaldo pede 30% de desconto retroativo. O caixa do Consórcio está apertado. O que você decide?",
    opcoes: [
      opc({ id: "rateio-parcelado", rotulo: "Cobrar o devido com parcelamento formal e rever o critério na assembleia", kind: "competente", resumo: "Manter o critério do contrato, formalizar o parcelamento do atraso e levar o pedido de revisão, com dados, à assembleia.",
        requer: { achado: "f19-criterio", dica: "Compare o painel do rateio com as cláusulas do contrato: o critério vale para todos." },
        custo: m(0.6), prazo: "4 semanas", ganho: m(0.42), riscos: [{ texto: "O Prefeito Osvaldo vai fechar a cara" }, { texto: "Exige acompanhar o parcelamento mês a mês" }],
        custoPct: 0.6, aplica: ["consorcio-rateio", "medir-antes"], conquista: "n3-rateio-em-dia",
        efeitos: { attrs: { competencia: 6, confianca: 2, persuasao: 1 }, pub: { sustentabilidade: 5, qualidade: 1 }, rel: { sonia: 6, guardiao: 5, osvaldo: -4 } },
        depois: [{ depois: 2, efeitos: { pub: { sustentabilidade: 4, acesso: 2 }, caixaPct: 0.5, attrs: { confianca: 3 } }, titulo: "O rateio voltou ao caixa", mensagem: "Pedra Alta quitou o parcelamento e os outros sete municípios viram que a regra valia para todos. O caixa do Consórcio respirou.", motivo: "Critério igual para todos e atraso formalizado.", tom: "bom" }],
        narracao: "Sônia carimba o termo com um sorriso discreto. O Guardião anota a primeira parcela e, pela primeira vez no mês, dorme tranquilo." }),
      opc({ id: "rateio-notificar", rotulo: "Notificar e exigir o pagamento integral em 30 dias", kind: "prudente", resumo: "Aplicar o contrato como está, sem abrir espaço de negociação.",
        custo: m(0.3), prazo: "30 dias", riscos: [{ texto: "Pode travar o relacionamento com Pedra Alta" }, { texto: "Sem parcelamento, o prazo pode não ser cumprido" }],
        custoPct: 0.3, efeitos: { attrs: { competencia: 3, persuasao: -1 }, pub: { sustentabilidade: 2 }, rel: { sonia: 3, guardiao: 3, osvaldo: -6 } },
        narracao: "O ofício sai seco e correto. A resposta de Pedra Alta chega em forma de silêncio." }),
      opc({ id: "rateio-desconto", rotulo: "Conceder o desconto de 30% a Pedra Alta", kind: "comodo", resumo: "Atender o pedido do Prefeito para manter a paz, deixando a diferença a cargo dos outros municípios.", conquista: "n3-desconto-do-prefeito",
        custo: m(0.4), prazo: "Imediato", riscos: [{ texto: "Os outros sete municípios vão pagar a diferença", precisa: "c19-rateio" }, { texto: "Abre precedente: todos pedirão desconto" }],
        custoPct: 0.4, aliado: "osvaldo", efeitos: { attrs: { popularidade: 3, rede: 3, competencia: -2 }, pub: { sustentabilidade: -3 }, rel: { osvaldo: 10, sonia: -6, guardiao: -5 }, favor: { osvaldo: 6 }, dependencia: 3 },
        depois: [{ depois: 2, efeitos: { pub: { sustentabilidade: -4, acesso: -2 }, caixaPct: -0.5, attrs: { confianca: -4 } }, titulo: "A fila dos descontos", mensagem: "Santa Aurora e Rio das Cotias pediram o mesmo desconto, e o caixa do Consórcio ficou curto para o transporte.", motivo: "Um desconto avulso quebrou o critério que valia para todos.", tom: "ruim" }],
        narracao: "Osvaldo sai sorrindo, com a foto no celular. Sônia fecha a pasta devagar, sem comentar." }),
      opc({ id: "rateio-agrado", rotulo: "Conceder o desconto e aceitar um “agradecimento” do Prefeito", kind: "desvio", resumo: "Dar o desconto e receber um percentual por fora, sem registrar.",
        custo: m(0.4), prazo: "Imediato", ganho: GANHO_DESVIO, riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Os outros municípios pagam a conta" }],
        custoPct: 0.4, desvio: DEV("Receber “agradecimento” do Prefeito", DESVIO_TXT), aliado: "osvaldo",
        efeitos: { dependencia: 12, influencia: 6, evidencias: 2, rel: { osvaldo: 8, sonia: -8, guardiao: -6 }, attrs: { rede: 4, caraDePau: 3 }, pub: { sustentabilidade: -2 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { sustentabilidade: -3 }, attrs: { confianca: -3 } }, titulo: "O desconto que ninguém aprovou", mensagem: "A diferença no caixa não bateu com nenhuma ata. Ana pediu os documentos do desconto.", motivo: "Desconto sem deliberação da assembleia.", tom: "ruim" }],
        narracao: "O envelope vem discreto. A ata que deveria autorizar o desconto, nem tanto." }),
    ],
  },

  /* ───────── D20 — pactuação ───────── */
  {
    id: "d20", caso: 20, mesa: "consorcio", titulo: "Quem recebe quem: a pactuação de ortopedia e cardiologia", conceito: "pactuacao-regional", basePct: 2, gestoPadrao: "assinar",
    papelAssinado: "RESOLUÇÃO DA CIR — REFERÊNCIAS E CONTRARREFERÊNCIAS — documento fictício",
    pergunta: "Pedra Alta envia quase o triplo da sua cota ao Hospital Regional e os pacientes não têm para onde voltar. Como resolver?",
    opcoes: [
      opc({ id: "pactuar-cir", rotulo: "Repactuar na CIR: cotas revistas, guia e protocolo, e contrarreferência com plano de cuidado", kind: "competente", resumo: "Rodada de pactuação com dados dos oito municípios, protocolo único de encaminhamento e retorno do paciente com plano.",
        custo: m(0.8), prazo: "6 semanas", ganho: () => "Hospital com leito livre e paciente que sabe para onde ir e como voltar", riscos: [{ texto: "Pedra Alta vai pedir cota maior" }, { texto: "Exige trabalho técnico nos municípios" }],
        custoPct: 0.8, aplica: ["pactuacao-regional", "fila-regulada", "medir-antes"], conquista: "n3-pacto-na-cir",
        efeitos: { attrs: { competencia: 6, confianca: 3, persuasao: 2 }, pub: { acesso: 6, qualidade: 3 }, filaMin: -3, rel: { celia: 6, heitor: 6, osvaldo: -3, sonia: 4 } },
        depois: [{ depois: 2, efeitos: { filaMin: -3, pub: { acesso: 4, qualidade: 2 }, attrs: { confianca: 3 } }, titulo: "A volta do paciente tem rota", mensagem: "As altas passaram a voltar com plano de cuidado e o hospital liberou leitos. A espera por transferência encurtou.", motivo: "Referência e contrarreferência foram pactuadas, em vez de empurradas.", tom: "bom" }],
        narracao: "Os oito secretários saem da CIR com a ata na mão. Dona Célia levanta o polegar. O Prefeito Osvaldo, por pouco, também." }),
      opc({ id: "pactuar-limitar", rotulo: "Limitar temporariamente os encaminhamentos de Pedra Alta ao valor da cota", kind: "prudente", resumo: "Aplicar a cota atual enquanto se agenda a nova pactuação.",
        custo: m(0.4), prazo: "3 semanas", riscos: [{ texto: "Pacientes de Pedra Alta podem ficar sem atendimento nesse intervalo" }, { texto: "A cota atual está defasada" }],
        custoPct: 0.4, efeitos: { attrs: { competencia: 2 }, pub: { acesso: 1, qualidade: 1 }, filaMin: 1, rel: { heitor: 3, osvaldo: -8, celia: -2 } },
        narracao: "A cota entra em vigor na segunda-feira. Na terça, o Prefeito já liga reclamando." }),
      opc({ id: "pactuar-nada", rotulo: "Seguir recebendo todos os pacientes, sem mudar nada", kind: "comodo", resumo: "Deixar o hospital absorver o excedente e não abrir a discussão na CIR.",
        custo: m(0.2), prazo: "Imediato", riscos: [{ texto: "O hospital continua lotado", precisa: "c20-relato" }, { texto: "Os outros municípios deixam de cumprir as cotas" }],
        custoPct: 0.2, efeitos: { attrs: { popularidade: 2, competencia: -2 }, pub: { acesso: -1 }, filaMin: 2, rel: { osvaldo: 4, heitor: -6, celia: -4 } },
        depois: [{ depois: 2, efeitos: { filaMin: 4, pub: { acesso: -3, qualidade: -2 }, attrs: { confianca: -3 } }, titulo: "Maca no corredor", mensagem: "Sem regra, cada município empurrou os pacientes que quis. O hospital ficou lotado e a transferência demorou mais.", motivo: "O excedente foi absorvido, não organizado.", tom: "ruim" }],
        narracao: "O hospital segue recebendo todo mundo. Dr. Heitor suspira e pede mais uma maca." }),
      opc({ id: "pactuar-prioridade", rotulo: "Dar prioridade aos pacientes indicados pelo Prefeito, em troca de “apoio”", kind: "desvio", resumo: "Furar a fila para os pacientes indicados e receber um percentual por fora.",
        custo: m(0.5), prazo: "Imediato", ganho: GANHO_DESVIO, riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Quem tem urgência clínica fica para trás" }],
        custoPct: 0.5, desvio: DEV("Receber “apoio” do Prefeito pela prioridade", DESVIO_TXT), aliado: "osvaldo",
        efeitos: { dependencia: 12, influencia: 5, evidencias: 2, rel: { osvaldo: 8, celia: -8, heitor: -4 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, attrs: { confianca: -4 }, pub: { acesso: -2 } }, titulo: "A fila furada", mensagem: "Pacientes graves descobriram que foram ultrapassados por nomes sem prioridade clínica, e o conselho regional abriu um pedido de explicação.", motivo: "Critério político no lugar de critério clínico.", tom: "ruim" }],
        narracao: "A lista do Prefeito anda em um dia. A de quem espera há semanas, não." }),
    ],
  },

  /* ───────── D21 — transporte sanitário ───────── */
  {
    id: "d21", caso: 21, mesa: "consorcio", titulo: "Cinco ambulâncias ou uma central?", conceito: "transporte-sanitario", basePct: 4, gestoPadrao: "assinar",
    papelAssinado: "AUTORIZAÇÃO DE CENTRAL DE TRANSPORTE SANITÁRIO — documento fictício",
    pergunta: "A frota atual roda 38% ocupada, mas há uma oferta de cinco ambulâncias novas. Como melhorar o transporte entre os municípios?",
    opcoes: [
      opc({ id: "central-regulada", rotulo: "Montar a Central de Transporte compartilhada, com regulação e viagens combinadas", kind: "competente", resumo: "Frota compartilhada, regulação única, manutenção centralizada e custo por viagem acompanhado.",
        requer: { achado: "f21-central", dica: "Compare a frota ociosa com o custo por viagem da central regulada." },
        custo: m(2.0), prazo: "3 meses até operar", ganho: m(0.6), riscos: [{ texto: "Os prefeitos perdem a “ambulância com o nome da cidade”" }, { texto: (c) => `O sistema de regulação custa cerca de ${c.money(0.3)} a mais`, precisa: "c21-custo" }],
        custoPct: 2.0, economiaPct: 6, aplica: ["transporte-sanitario", "compra-compartilhada", "custo-total"], conquista: "n3-frota-compartilhada",
        efeitos: { attrs: { competencia: 6, confianca: 2, persuasao: 1 }, pub: { acesso: 6, qualidade: 3, sustentabilidade: 2 }, filaMin: -4, rel: { sonia: 6, roberto: 6, juninho: -4 } },
        depois: [{ depois: 2, efeitos: { filaMin: -4, pub: { acesso: 5, sustentabilidade: 2 }, caixaPct: 0.4, attrs: { confianca: 3 } }, titulo: "As voltas deixaram de ser vazias", mensagem: "A central combinou as viagens, reduziu o custo por viagem e a transferência passou a levar menos horas.", motivo: "A frota foi organizada, não apenas ampliada.", tom: "bom" }],
        narracao: "Roberto prende o mapa de rotas na parede. Pela primeira vez, a lousa da Central tem poucos espaços vazios." }),
      opc({ id: "comprar-menos", rotulo: "Comprar duas ambulâncias para as cidades mais distantes, com cotação aberta", kind: "prudente", resumo: "Reforço pontual da frota, sem criar a central.",
        custo: m(1.0), prazo: "2 meses", riscos: [{ texto: "Não resolve a ociosidade" }, { texto: "Adiciona custo de manutenção" }],
        custoPct: 1.0, aplica: ["custo-total"], efeitos: { attrs: { competencia: 3 }, pub: { acesso: 3, sustentabilidade: -1 }, filaMin: -1, rel: { roberto: 2, sonia: 1 } },
        narracao: "Duas ambulâncias novas chegam. A taxa de ocupação continua a mesma." }),
      opc({ id: "ambulancias-avulsas", rotulo: "Comprar as cinco ambulâncias da proposta, uma por município", kind: "fraco", resumo: "Fechar a compra com a única cotação recebida e distribuir os carros.",
        custo: m(2.6), prazo: "1 mês", riscos: [{ texto: "Frota maior e mais ociosa", precisa: "c21-frota" }, { texto: "Compra com uma única cotação" }],
        custoPct: 2.6, aliado: "juninho", efeitos: { attrs: { popularidade: 3, rede: 2, competencia: -3 }, pub: { acesso: 2, sustentabilidade: -4 }, evidencias: 1, rel: { juninho: 8, roberto: -6, sonia: -4 } },
        depois: [{ depois: 2, efeitos: { filaMin: 2, evidencias: 2, pub: { sustentabilidade: -3 }, attrs: { confianca: -3 } }, titulo: "Garagem cheia, viagens vazias", mensagem: "Cinco carros novos foram para cinco garagens. A ocupação continuou baixa e a conta de manutenção subiu.", motivo: "Mais carros, a mesma desorganização.", tom: "ruim" }],
        narracao: "A foto da entrega é linda, com cinco prefeitos ao lado de cinco ambulâncias brilhantes." }),
      opc({ id: "ambulancias-comissao", rotulo: "Comprar as ambulâncias e combinar uma “comissão de agilidade” com a revendedora", kind: "desvio", resumo: "Fechar a compra sem comparar e receber um percentual por fora.",
        custo: m(2.6), prazo: "1 mês", ganho: GANHO_DESVIO, riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Preço acima do mercado e sem concorrência" }],
        custoPct: 2.6, desvio: DEV("Receber “comissão de agilidade” da revendedora", DESVIO_TXT), aliado: "juninho",
        efeitos: { dependencia: 14, influencia: 5, evidencias: 3, rel: { juninho: 8, roberto: -8, sonia: -6 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { sustentabilidade: -4 }, attrs: { confianca: -3 } }, titulo: "O preço da pressa", mensagem: "As ambulâncias vieram acima do preço de tabela e dois veículos tinham defeito. Roberto guardou todas as notas.", motivo: "Compra sem cotação e com favorecimento.", tom: "ruim" }],
        narracao: "Tudo muito rápido, muito amigável e com uma ou outra nota faltando." }),
    ],
  },

  /* ───────── D22 — contrato de gestão ───────── */
  {
    id: "d22", caso: 22, mesa: "consorcio", titulo: "Renovar o contrato do hospital: com metas ou sem?", conceito: "contrato-gestao", basePct: 4, gestoPadrao: "assinar",
    papelAssinado: "TERMO DE CONTRATO DE GESTÃO DO HOSPITAL REGIONAL — documento fictício",
    pergunta: "O contrato de gestão do Hospital Regional vence em trinta dias. A minuta de prorrogação não traz metas. O que você assina?",
    opcoes: [
      opc({ id: "contrato-metas", rotulo: "Renovar com metas, indicadores, parte variável do pagamento e comissão de acompanhamento", kind: "competente", resumo: "Novo contrato com metas realistas, relatórios trimestrais, acompanhamento do Consórcio e consequência para o descumprimento.",
        custo: m(1.4), prazo: "6 semanas até assinar", ganho: () => "Hospital mais produtivo e contas mais claras", riscos: [{ texto: "Dr. Heitor vai estranhar a cobrança" }, { texto: "Exige acompanhar os indicadores todo trimestre" }],
        custoPct: 1.4, aplica: ["contrato-gestao", "medir-antes", "controle-interno"], conquista: "n3-contrato-com-metas",
        efeitos: { attrs: { competencia: 6, confianca: 3 }, pub: { qualidade: 6, acesso: 4, sustentabilidade: 2 }, filaMin: -3, rel: { ana: 7, bento: 5, heitor: -2, sonia: 4 } },
        depois: [{ depois: 2, efeitos: { pub: { qualidade: 4, acesso: 3 }, filaMin: -3, caixaPct: 0.3, attrs: { confianca: 3 } }, titulo: "O hospital passou a mostrar serviço", mensagem: "Com metas e relatórios no prazo, as cirurgias eletivas voltaram a crescer e a ocupação caiu para um nível seguro.", motivo: "O contrato passou a medir resultado, não só a pagar parcelas.", tom: "bom" }],
        narracao: "Ana lê o contrato inteiro e assina o parecer sem ressalvas. Dr. Heitor suspira e pede mais café." }),
      opc({ id: "contrato-ponte", rotulo: "Prorrogar por 6 meses com metas mínimas e fazer novo chamamento", kind: "prudente", resumo: "Uma solução de transição com metas básicas enquanto se prepara o contrato definitivo.",
        custo: m(0.9), prazo: "2 semanas", riscos: [{ texto: "Metas mínimas são fáceis demais" }, { texto: "Adia a decisão para o próximo ciclo" }],
        custoPct: 0.9, efeitos: { attrs: { competencia: 3, confianca: 1 }, pub: { qualidade: 2, acesso: 1 }, rel: { ana: 3, heitor: 1 } },
        narracao: "A ponte é segura e curta. A discussão de fundo fica para o semestre que vem." }),
      opc({ id: "contrato-sem-metas", rotulo: "Prorrogar por 12 meses, nas mesmas condições", kind: "comodo", resumo: "Assinar a minuta como veio, sem metas, para o hospital não parar.",
        custo: m(0.3), prazo: "Imediato", riscos: [{ texto: "Parcela fixa, sem resultado cobrado", precisa: "c22-minuta" }, { texto: "A Controladoria registrará ressalva" }],
        custoPct: 0.3, aliado: "heitor", efeitos: { attrs: { popularidade: 2, rede: 2, competencia: -3 }, pub: { qualidade: -1 }, rel: { heitor: 8, ana: -8, bento: -4 } },
        depois: [{ depois: 2, efeitos: { pub: { qualidade: -4, sustentabilidade: -3 }, filaMin: 3, attrs: { confianca: -4 } }, titulo: "Doze meses sem régua", mensagem: "Sem metas, as cirurgias continuaram abaixo do previsto e o custo por leito subiu mais um pouco.", motivo: "O pagamento fixo não dependia de resultado.", tom: "ruim" }],
        narracao: "O hospital agradece com bolo e café. Ana anexa uma ressalva de duas páginas." }),
      opc({ id: "contrato-consultoria", rotulo: "Prorrogar sem metas e contratar a “consultoria” indicada pelo Primo Juninho", kind: "desvio", resumo: "Prorrogar sem cobrança e incluir uma consultoria que devolve um percentual por fora.",
        custo: m(1.2), prazo: "2 semanas", ganho: GANHO_DESVIO, riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Consultoria sem escopo definido" }],
        custoPct: 1.2, desvio: DEV("Receber percentual da “consultoria”", DESVIO_TXT), aliado: "juninho",
        efeitos: { dependencia: 14, influencia: 6, evidencias: 3, rel: { juninho: 8, ana: -9, bento: -5 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { sustentabilidade: -4, qualidade: -2 }, attrs: { confianca: -3 } }, titulo: "A consultoria sem relatório", mensagem: "A consultoria entregou uma apresentação de 10 slides e uma nota de valor alto. Ana pediu o contrato e o escopo.", motivo: "Contratação sem escopo e com favorecimento.", tom: "ruim" }],
        narracao: "A consultoria é contratada em dois dias. O relatório, ao que parece, ainda está sendo escrito." }),
    ],
  },

  /* ───────── D23 — localização ───────── */
  {
    id: "d23", caso: 23, mesa: "consorcio", titulo: "Onde instalar o centro de diagnóstico regional", conceito: "localizacao-regional", basePct: 3, gestoPadrao: "assinar",
    papelAssinado: "RESOLUÇÃO DE LOCALIZAÇÃO DO CENTRO DE DIAGNÓSTICO — documento fictício",
    pergunta: "O Consórcio vai instalar um centro de diagnóstico regional. O Prefeito Osvaldo oferece terreno em Pedra Alta; os dados apontam outro lugar. Onde instalar?",
    opcoes: [
      opc({ id: "polo-demanda", rotulo: "Instalar em Santa Aurora, onde há demanda e melhor acesso, com critério publicado", kind: "competente", resumo: "Escolher o local pelo volume de exames, tempo de deslocamento e viabilidade, com o critério aprovado na CIR.",
        requer: { achado: "f23-polo", dica: "Cruze o mapa de deslocamento com o estudo de viabilidade do centro." },
        custo: m(3.0), prazo: "10 meses até funcionar", ganho: () => "Mais gente a menos de uma hora do diagnóstico", riscos: [{ texto: "Pedra Alta vai reclamar" }, { texto: "A obra leva meses" }],
        custoPct: 3.0, aplica: ["localizacao-regional", "planejamento-necessidade", "medir-antes"], conquista: "n3-polo-pela-necessidade",
        efeitos: { attrs: { competencia: 6, confianca: 3, persuasao: 1 }, pub: { acesso: 6, qualidade: 3 }, filaMin: -2, rel: { celia: 7, sonia: 5, osvaldo: -7 } },
        depois: [{ depois: 1, efeitos: { filaMin: -3, pub: { acesso: 4, sustentabilidade: 2 }, attrs: { confianca: 3 } }, titulo: "O exame ficou mais perto", mensagem: "O centro atende mais de três mil exames por mês e a maioria da população chega em menos de uma hora.", motivo: "A localização foi escolhida pela necessidade medida.", tom: "bom" }],
        narracao: "Dona Célia estende o mapa na mesa e aponta Santa Aurora com o dedo. O Prefeito Osvaldo sai sem se despedir." }),
      opc({ id: "dois-pontos", rotulo: "Instalar em Santa Aurora e criar um ponto de coleta em Pedra Alta", kind: "prudente", resumo: "Polo no local de maior demanda e um ponto de coleta de exames em Pedra Alta.",
        custo: m(3.5), prazo: "12 meses", riscos: [{ texto: "Custo maior" }, { texto: "O ponto de coleta tem pouco uso no início" }],
        custoPct: 3.5, efeitos: { attrs: { competencia: 4, persuasao: 2 }, pub: { acesso: 4, sustentabilidade: -1 }, filaMin: -1, rel: { celia: 4, osvaldo: 1, sonia: 2 } },
        narracao: "A solução desagrada menos gente, mas pesa mais no caixa." }),
      opc({ id: "centro-pedra-alta", rotulo: "Instalar em Pedra Alta, onde o Prefeito doa o terreno", kind: "comodo", resumo: "Aceitar a doação e a pressão política, sem comparar com a demanda e o acesso.",
        custo: m(3.0), prazo: "10 meses", riscos: [{ texto: "Só 31% da população chega em até uma hora", precisa: "c23-estudo" }, { texto: "Centro com pouco volume e transporte mais caro" }],
        custoPct: 3.0, aliado: "osvaldo", efeitos: { attrs: { popularidade: 3, rede: 3, competencia: -3 }, rel: { osvaldo: 10, celia: -7, sonia: -4 }, favor: { osvaldo: 6 }, dependencia: 3 },
        depois: [{ depois: 1, efeitos: { filaMin: 3, pub: { acesso: -3, sustentabilidade: -3 }, attrs: { confianca: -3 } }, titulo: "Centro longe de quase todos", mensagem: "O centro abriu, mas a maioria dos pacientes ainda viaja mais de uma hora e o volume de exames ficou abaixo do esperado.", motivo: "O local foi escolhido por pressão, não por acesso.", tom: "ruim" }],
        narracao: "Osvaldo inaugura a placa antes da obra. A maquete finalmente ganha um terreno." }),
      opc({ id: "centro-terreno-primo", rotulo: "Aceitar o terreno e combinar um “agradecimento” pessoal com o dono da obra", kind: "desvio", resumo: "Decidir pelo terreno doado e receber um percentual por fora do construtor.",
        custo: m(3.2), prazo: "10 meses", ganho: GANHO_DESVIO, riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Local ruim e obra cara" }],
        custoPct: 3.2, desvio: DEV("Receber “agradecimento” do construtor", DESVIO_TXT), aliado: "osvaldo",
        efeitos: { dependencia: 14, influencia: 6, evidencias: 3, rel: { osvaldo: 8, celia: -8, sonia: -6 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 1, efeitos: { evidencias: 2, pub: { acesso: -3, sustentabilidade: -3 }, attrs: { confianca: -4 } }, titulo: "O terreno tem dono", mensagem: "O construtor era sócio de um parente do doador, e o orçamento da obra veio acima da média. O conselho pediu cópia do processo.", motivo: "Obra e terreno fechados por favorecimento.", tom: "ruim" }],
        narracao: "Tudo muito cordial entre os amigos da região. O tipo de cordialidade que costuma custar caro." }),
    ],
  },

  /* ───────── D24 — prestação de contas ───────── */
  {
    id: "d24", caso: 24, mesa: "consorcio", titulo: "Prestação de contas à CIR e ao conselho regional", conceito: "controle-social-regional", basePct: 0, gestoPadrao: "parecer",
    papelAssinado: "RELATÓRIO DE GESTÃO REGIONAL — documento fictício",
    pergunta: "É hora de prestar contas ao conselho regional e à CIR. O que você apresenta?",
    opcoes: [
      opc({ id: "contas-completas", rotulo: "Apresentar resultados, pendências e plano de correção, e publicar atas e relatório no portal", kind: "competente", gesto: "parecer", resumo: "Mostrar o rateio por município, o que foi pactuado e cumprido, e o que ficou pendente, com publicação.",
        custo: () => "R$ 0", prazo: "Imediato", riscos: [{ texto: "Expõe pendências diante dos prefeitos" }, { texto: "Aumenta a confiança de quem acompanha" }],
        custoPct: 0, aplica: ["controle-social-regional", "transparencia", "contrato-gestao", "consorcio-rateio"], conquista: "n3-contas-regionais",
        efeitos: { attrs: { confianca: 8, competencia: 3, popularidade: 1 }, pub: { qualidade: 2, acesso: 2, sustentabilidade: 2 }, rel: { celia: 6, bento: 4, sonia: 5 } },
        narracao: "Dona Célia, na primeira fila, anota tudo. No fim, levanta a mão — e agradece." }),
      opc({ id: "contas-resumo", rotulo: "Apresentar só os resultados favoráveis à CIR", kind: "comodo", gesto: "parecer", resumo: "Mostrar a central, o contrato novo e deixar as pendências nos anexos.",
        custo: () => "R$ 0", prazo: "Imediato", riscos: [{ texto: "A omissão aparece quando alguém lê as atas" }],
        custoPct: 0, efeitos: { attrs: { popularidade: 4, confianca: 1 } },
        ajustes: [{ se: (s) => s.personal.evidencias > 0 || s.personal.desviado > 0, efeitos: { attrs: { confianca: -8 } }, nota: "Os registros mostram o que os slides esconderam: a confiança caiu." }],
        narracao: "Os slides são lindos. As atas, nem tanto." }),
      opc({ id: "contas-adiar", rotulo: "Adiar a prestação de contas para o próximo ano", kind: "fraco", gesto: "assinar", resumo: "Empurrar a apresentação para depois da eleição dos prefeitos.",
        custo: () => "R$ 0", prazo: "Indefinido", riscos: [{ texto: "Prestação de contas atrasada vira desconfiança" }],
        custoPct: 0, efeitos: { attrs: { confianca: -6, competencia: -3 }, rel: { celia: -5, sonia: -4 } },
        narracao: "A apresentação é adiada. A dúvida, não." }),
    ],
  },
];

/* ═════════════════════════ Casos ═════════════════════════ */

const casos: CaseDef[] = [
  { id: "caso19", caso: 19, titulo: "O rateio atrasado e o pedido de desconto", episodio: "Episódio 1", location: "consorcio", pistas: ["c19-rateio", "c19-contrato", "c19-pedido"], conversas: ["n3-sonia-abertura", "n3-guardiao-rateio", "n3-osvaldo-desconto"], decisao: "d19",
    chamada: "Você virou Articulador(a) Regional de Saúde, no Consórcio de oito municípios. Pedra Alta atrasou o rateio e o Prefeito Osvaldo quer desconto.",
    objetivo: "Compare o painel do rateio, o contrato e o pedido do Prefeito antes de decidir.", dica: "Dica do Professor Bento: em consórcio, o critério vale para todos. Desconto avulso para um é conta a mais para os outros sete." },
  { id: "caso20", caso: 20, titulo: "Quem recebe quem", episodio: "Episódio 2", location: "consorcio", pistas: ["c20-fluxo", "c20-ppi", "c20-relato"], conversas: ["n3-celia-cir", "n3-heitor-fluxo", "n3-osvaldo-vagas"], decisao: "d20",
    chamada: "Um município está “empurrando” pacientes de ortopedia e cardiologia para o Hospital Regional, e ninguém quer o paciente de volta.",
    objetivo: "Cruze o fluxo de pacientes com a pactuação vigente.", dica: "Dica do Professor Bento: pactuar é combinar quem atende o quê e como o paciente volta. Empurrar não é pactuar." },
  { id: "caso21", caso: 21, titulo: "Cinco ambulâncias ou uma central?", episodio: "Episódio 3", location: "consorcio", pistas: ["c21-frota", "c21-custo", "c21-proposta"], conversas: ["n3-roberto-frota", "n3-juninho-ambulancias", "n3-sonia-central"], decisao: "d21",
    chamada: "As ambulâncias da região rodam quase vazias, e uma revendedora oferece cinco novas. A alternativa é uma central compartilhada.",
    objetivo: "Compare a ocupação da frota, o custo por viagem e a proposta de venda.", dica: "Dica do Professor Bento: frota compartilhada e regulada custa menos por viagem do que muitos carros parados." },
  { id: "caso22", caso: 22, titulo: "Renovar o contrato do hospital", episodio: "Episódio 4", location: "consorcio", pistas: ["c22-metas", "c22-custo", "c22-minuta"], conversas: ["n3-heitor-contrato", "n3-ana-metas", "n3-bento-gestao"], decisao: "d22",
    chamada: "O contrato de gestão do Hospital Regional vence em trinta dias, e a minuta pronta prorroga tudo sem metas.",
    objetivo: "Compare as metas cumpridas, o custo do hospital e a minuta de prorrogação.", dica: "Dica do Professor Bento: contrato de gestão sem meta é só repasse. Meta, indicador e acompanhamento são o que protege o dinheiro público." },
  { id: "caso23", caso: 23, titulo: "Onde instalar o centro de diagnóstico", episodio: "Episódio 5", location: "consorcio", pistas: ["c23-deslocamento", "c23-estudo", "c23-pressao"], conversas: ["n3-osvaldo-terreno", "n3-sonia-estudo", "n3-celia-acesso"], decisao: "d23",
    chamada: "O Consórcio vai instalar um centro de diagnóstico regional. Todo prefeito quer o centro na sua cidade, e só um local atende bem a região.",
    objetivo: "Cruze o mapa de deslocamento com o estudo de viabilidade antes de escolher o local.", dica: "Dica do Professor Bento: serviço regional se instala onde a demanda e o acesso estão, não onde a pressão é maior." },
  { id: "caso24", caso: 24, titulo: "Prestação de contas regional", episodio: "Episódio 6", location: "consorcio", pistas: ["c24-execucao", "c24-atas", "c24-conselho"], conversas: ["n3-celia-prestacao", "n3-sonia-fechamento"], decisao: "d24",
    chamada: "O ciclo está terminando. A CIR e o conselho regional esperam saber o que foi feito, o que falhou e o que ficou pendente.",
    objetivo: "Reúna a execução do ano, as atas da CIR e as expectativas do conselho.", dica: "Dica do Professor Bento: prestar contas regional é mostrar o que cada município pagou, usou e o que ficou prometido e não saiu." },
];

/* ═════════════════════════ Conceitos e conquistas ═════════════════════════ */

const L11107 = "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11107.htm";
const D7508 = "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/decreto/d7508.htm";
const L8142 = "https://www.planalto.gov.br/ccivil_03/leis/l8142.htm";

const conceitos: Partial<Record<ConceptId, Concept>> = {
  "consorcio-rateio": {
    id: "consorcio-rateio", titulo: "Rateio justo é critério igual e pagamento em dia", tema: "Consórcios públicos", dificuldade: 2,
    texto: "Em um consórcio público, os municípios dividem as despesas por contrato de rateio, com critério objetivo (por exemplo, a população) e valores previstos no orçamento de cada um. Desconto avulso ou atraso de um recai sobre os outros, e mudanças de critério são decididas em conjunto, com dados.",
    aplicacao: "Na vida real: em qualquer divisão de custos (condomínio, associação, cooperativa), regra igual para todos e prazo cumprido evitam que um grupo pague a conta de quem pediu favor.",
    fonte: { rotulo: "Lei 11.107/2005 (consórcios públicos) — contrato de rateio", url: L11107, classificacao: "oficial" },
  },
  "pactuacao-regional": {
    id: "pactuacao-regional", titulo: "Pactuar é combinar, não empurrar", tema: "Regionalização do SUS", dificuldade: 2,
    texto: "Na regionalização do SUS, os municípios pactuam na Comissão Intergestores Regional quem referencia pacientes para onde, em que quantidade e com que protocolo — e como o paciente retorna ao município de origem (contrarreferência). Sem pactuação, cada município empurra o paciente e o hospital lota.",
    aplicacao: "Na vida real: ao dividir tarefas em uma equipe ou família, combine quem faz o quê e como se faz a entrega do que foi feito; sem combinação, tudo cai em quem está mais perto.",
    fonte: { rotulo: "Decreto 7.508/2011 (organização do SUS, regiões de saúde e CIR)", url: D7508, classificacao: "oficial" },
  },
  "transporte-sanitario": {
    id: "transporte-sanitario", titulo: "Frota compartilhada custa menos que muitos carros parados", tema: "Transporte sanitário", dificuldade: 2,
    texto: "O transporte de pacientes entre municípios pode ser organizado por uma central de regulação com frota compartilhada, rotas combinadas e custo por viagem acompanhado. Comprar mais veículos sem organizar as viagens aumenta o custo fixo e a ociosidade.",
    aplicacao: "Na vida real: dividir carona, ferramenta ou espaço com regras claras costuma custar menos do que cada um ter o seu parado a maior parte do tempo.",
    fonte: { rotulo: "Conceito didático; regulação e organização do SUS (Lei 8.080/1990)", url: null, classificacao: "estimativa" },
  },
  "contrato-gestao": {
    id: "contrato-gestao", titulo: "Contrato de gestão precisa de meta, indicador e controle", tema: "Gestão de serviços por contrato", dificuldade: 3,
    texto: "Quando um serviço (como um hospital) é gerido por contrato, o pagamento deve se ligar a metas claras, indicadores medidos, relatórios no prazo e acompanhamento por uma comissão independente. Prorrogar sem metas transforma o contrato em repasse automático.",
    aplicacao: "Na vida real: ao contratar um serviço, escreva o que será entregue, como será medido e o que acontece se não for cumprido, antes de pagar.",
    fonte: { rotulo: "Conceito didático; Lei 14.133/2021 (contratos administrativos) e controle interno", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm", classificacao: "oficial" },
  },
  "localizacao-regional": {
    id: "localizacao-regional", titulo: "Serviço regional vai onde estão a demanda e o acesso", tema: "Planejamento regional", dificuldade: 2,
    texto: "Ao instalar um serviço regional, avalie a população atendida, o volume de uso, o tempo de deslocamento e a viabilidade de custo. A pressão política é um dado a considerar, mas não substitui o critério; publicar o critério antes da escolha reduz a disputa.",
    aplicacao: "Na vida real: ao escolher onde abrir um posto, uma loja ou um ponto de atendimento, meça quem chega com facilidade e quanto vai usar, e só depois ouça os pedidos.",
    fonte: { rotulo: "Decreto 7.508/2011 (regiões de saúde e planejamento regional)", url: D7508, classificacao: "oficial" },
  },
  "controle-social-regional": {
    id: "controle-social-regional", titulo: "Prestar contas na região é mostrar o que cada um pagou, usou e prometeu", tema: "Controle social e transparência", dificuldade: 3,
    texto: "O Consórcio e a CIR devem prestar contas ao conselho de saúde e à população: rateio por município, atas, metas cumpridas e pendências, com publicação em portal. Mostrar as falhas e o plano de correção aumenta a confiança; esconder pendências a derruba.",
    aplicacao: "Na vida real: em qualquer grupo que gerencia dinheiro comum, relatório honesto e aberto vale mais do que um resumo bonito.",
    fonte: { rotulo: "Lei 8.142/1990 (participação da comunidade no SUS) e LC 141/2012 (prestação de contas)", url: L8142, classificacao: "oficial" },
  },
};


const conquistas: AchievementDef[] = [
  { id: "n3-rateio-em-dia", nome: "Rateio em Dia", descricao: "Cobrou o rateio pelo critério igual e formalizou o parcelamento do atraso.", trilha: "gestao", icone: "🧮" },
  { id: "n3-pacto-na-cir", nome: "Pacto na CIR", descricao: "Repactuou referências e contrarreferências em vez de deixar o paciente ser empurrado.", trilha: "gestao", icone: "🤝" },
  { id: "n3-frota-compartilhada", nome: "Frota Compartilhada", descricao: "Montou a central de transporte regulada em vez de comprar carros avulsos.", trilha: "gestao", icone: "🚑" },
  { id: "n3-polo-pela-necessidade", nome: "Polo Pela Necessidade", descricao: "Instalou o centro regional onde a população e o acesso pediam, não onde o prefeito pedia.", trilha: "gestao", icone: "📍" },
  { id: "n3-contrato-com-metas", nome: "Contrato com Metas", descricao: "Renovou o contrato do hospital com metas, indicadores e acompanhamento.", trilha: "gestao", icone: "📈" },
  { id: "n3-contas-regionais", nome: "Contas Regionais", descricao: "Prestou contas à CIR e ao conselho regional com resultados, pendências e plano.", trilha: "gestao", icone: "📣" },
  { id: "n3-desconto-do-prefeito", nome: "O Desconto do Prefeito", descricao: "Deu desconto de rateio a um município e mandou a conta para os outros sete.", trilha: "satira", icone: "🏷️" },
];

export const N3: LevelContent = { locais, pistas, achados, conversas, negociacoes: [], decisoes, casos, conceitos, conquistas };
