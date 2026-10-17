import type { Effects } from "../../engine/types";
import { DEV, m, opt, type O } from "../cases-n2";
import { talk } from "../conversations-n2";
import type { AchievementDef, CaseDef, ClueDef, Concept, ConversationDef, DecisionDef, FindingDef, OptionDef } from "../types";
import type { LevelContent, LocSpec } from "./tipos";

/**
 * Nível 4 — Secretário(a) Estadual de Saúde (casos 25–30).
 * Cenário fictício: estado com cinco regiões de saúde, um hospital estadual em obra e uma Assembleia atenta.
 * Valores em % do orçamento anual (estimado) da Secretaria Estadual. Pessoas, empresas e municípios são inventados.
 */

const SIM = { rotulo: "Documento do cenário (valores simulados)", classificacao: "simulado" as const };
const EST = { rotulo: "Parâmetro do cenário (estimativa didática)", classificacao: "estimativa" as const };

/** `opt` do Nível 2 não repassa `conquista`; este wrapper acrescenta. */
const o4 = (o: O & { conquista?: string }): OptionDef => ({ ...opt(o), conquista: o.conquista });

/* ───────────────────────────── Locais ───────────────────────────── */

const locais: LocSpec[] = [
  {
    id: "gabinete-estadual", nome: "Gabinete da Secretaria Estadual", curto: "Gabinete", tema: "gabinete", mesa: true,
    descricao: "Sua sala no Palácio da Saúde: mapas do estado na parede, pastas de obras na mesa e um Governador que passa sem avisar.",
    pessoas: [
      { id: "teodoro", char: "teodoro", falas: [[25, "n4-teodoro-abertura", "Governador Teodoro Lima"], [29, "n4-teodoro-os", "Governador Teodoro Lima"], [30, "n4-teodoro-final", "Governador Teodoro Lima"]] },
      { id: "valdemar", char: "valdemar", falas: [[26, "n4-valdemar-rescisao", "Doutor Valdemar"], [29, "n4-valdemar-os", "Doutor Valdemar"]] },
      { id: "guardiao", char: "guardiao", falas: [[28, "n4-guardiao-repasse", "Guardião do Cofre"]] },
    ],
    itens: [
      { id: "pasta-obras", icone: "🗂️", onde: "parede", pistas: [[26, "c26-contrato", "Processo: contrato da obra"], [29, "c29-proposta", "Processo: proposta do Instituto"]] },
      { id: "computador", icone: "💻", onde: "mesa", pistas: [[27, "c27-aditivo", "Pedido de aditivo no sistema"], [30, "c30-relatorio", "Relatório de gestão do estado"]] },
    ],
    portas: ["painel-regioes", "assembleia", "canteiro", "tribunal"],
  },
  {
    id: "painel-regioes", nome: "Painel de Regiões de Saúde", curto: "Painel", tema: "dados",
    descricao: "Sala de situação com o mapa do estado, as cinco regiões de saúde e os números que ninguém costuma ler antes de pedir um hospital.",
    pessoas: [
      { id: "rita", char: "rita", falas: [[25, "n4-rita-regioes", "Rita Campos"]] },
      { id: "ana", char: "ana", falas: [[27, "n4-ana-matriz", "Ana da Controladoria"]] },
      { id: "lucia", char: "lucia", falas: [[28, "n4-lucia-repasse", "Prefeita Lúcia Andrade"]] },
    ],
    itens: [
      { id: "mapa-leitos", icone: "🗺️", onde: "parede", pistas: [[25, "c25-leitos", "Painel: leitos por região"], [28, "c28-criterios", "Quadro: critérios do rateio"]] },
      { id: "mapa-viagens", icone: "🚌", onde: "parede", pistas: [[25, "c25-viagens", "Mapa: quem viaja para operar"], [27, "c27-referencia", "Tabela de preços de referência"]] },
      { id: "painel-custos", icone: "📊", onde: "mesa", pistas: [[29, "c29-comparativo", "Comparativo: gestão direta"]] },
    ],
    portas: ["gabinete-estadual", "assembleia", "canteiro", "tribunal"],
  },
  {
    id: "assembleia", nome: "Assembleia Legislativa — Comissão de Saúde", curto: "Assembleia", tema: "plenario",
    descricao: "A Comissão de Saúde da Assembleia: microfones, bancadas, ofícios empilhados e deputados que gostam de transformar leito em palanque.",
    pessoas: [
      { id: "cornelio", char: "cornelio", falas: [[25, "n4-cornelio-leitos", "Deputado Cornélio"]] },
      { id: "nelson", char: "nelson", falas: [[28, "n4-nelson-liberar", "Vereador Nelson Tavares"]] },
      { id: "celia", char: "celia", falas: [[30, "n4-celia-assembleia", "Dona Célia"]] },
    ],
    itens: [
      { id: "oficios", icone: "📨", onde: "mesa", pistas: [[25, "c25-pedido", "Ofício do Deputado Cornélio"]] },
      { id: "mural", icone: "📌", onde: "parede", pistas: [[28, "c28-pedido", "Ofício: liberar o repasse"], [30, "c30-convocacao", "Convocação da Comissão de Saúde"]] },
    ],
    portas: ["gabinete-estadual", "painel-regioes", "canteiro", "tribunal"],
  },
  {
    id: "canteiro", nome: "Canteiro do Hospital Estadual", curto: "Canteiro", tema: "obra",
    descricao: "O esqueleto do Hospital Estadual: pilares de concreto, placas de “em breve” desbotadas e o capacete que o fiscal não tira nem para dormir.",
    pessoas: [
      { id: "leandro", char: "leandro", falas: [[26, "n4-leandro-obra", "Leandro Matos"], [27, "n4-leandro-planilha", "Leandro Matos"]] },
      { id: "roberto", char: "roberto", falas: [[26, "n4-roberto-medicao", "Roberto dos Contratos"]] },
      { id: "toninho", char: "toninho", falas: [[27, "n4-toninho-aditivo", "Toninho do Gabinete"]] },
    ],
    itens: [
      { id: "estrutura", icone: "🏗️", onde: "parede", pistas: [[26, "c26-laudo", "Laudo do fiscal sobre a estrutura"]] },
      { id: "boletim", icone: "🪧", onde: "mesa", pistas: [[26, "c26-medicao", "Boletim de medição"], [27, "c27-planilha", "Planilha da proponente"]] },
    ],
    portas: ["gabinete-estadual", "painel-regioes", "assembleia", "tribunal"],
  },
  {
    id: "tribunal", nome: "Tribunal de Contas do Estado — gabinete da conselheira", curto: "Tribunal", tema: "reuniao",
    descricao: "Gabinete da Conselheira Iara Nogueira: processos em pilhas ordenadas, relógio na parede e um bule de café que nunca esfria nem perdoa.",
    pessoas: [
      { id: "iara", char: "iara", falas: [[30, "n4-iara-resposta", "Conselheira Iara Nogueira"]] },
      { id: "bento", char: "bento", falas: [[29, "n4-bento-metas", "Professor Bento"]] },
    ],
    itens: [
      { id: "autos", icone: "📚", onde: "mesa", pistas: [[28, "c28-prestacao", "Autos: prestação de contas"], [30, "c30-notificacao", "Notificação do Tribunal"]] },
      { id: "registro", icone: "🏛️", onde: "parede", pistas: [[29, "c29-vinculos", "Registro de dirigentes"]] },
    ],
    portas: ["gabinete-estadual", "painel-regioes", "assembleia", "canteiro"],
  },
];

/* ───────────────────────────── Pistas ───────────────────────────── */

const pistas: ClueDef[] = [
  /* ───── Caso 25 — 300 leitos novos ───── */
  {
    id: "c25-leitos", caso: 25, location: "painel-regioes", titulo: "Leitos SUS por região de saúde", tipo: "dado", confiabilidade: "confirmada", icone: "🗺️", fonte: EST,
    texto: "Referência didática: quanto menos leitos por 10 mil habitantes, maior a carência da região. O estado vai receber 300 leitos novos e precisa decidir onde colocá-los.",
    tabela: () => [["Metropolitana (2,4 mi hab.)", "26 leitos por 10 mil hab."], ["Litoral (0,6 mi hab.)", "17 leitos por 10 mil hab."], ["Serra (0,9 mi hab.)", "12 leitos por 10 mil hab."], ["Vale (1,1 mi hab.)", "8 leitos por 10 mil hab."], ["Sertão (0,5 mi hab.)", "7 leitos por 10 mil hab."]],
  },
  {
    id: "c25-viagens", caso: 25, location: "painel-regioes", titulo: "Pacientes que viajam mais de 150 km para operar", tipo: "dado", confiabilidade: "confirmada", icone: "🚌", fonte: SIM,
    texto: "Origem dos pacientes internados para cirurgia na rede estadual no último ano. Quanto maior a viagem, maior o custo de transporte, o risco no caminho e a chance de abandonar o tratamento.",
    tabela: () => [["Metropolitana", "2% viajam mais de 150 km"], ["Litoral", "18%"], ["Serra", "34%"], ["Vale", "52%"], ["Sertão", "61%"]],
  },
  {
    id: "c25-pedido", caso: 25, location: "assembleia", titulo: "Ofício do Deputado Cornélio", tipo: "documento", confiabilidade: "incompleta", icone: "📨", fonte: SIM,
    texto: "“Solicito que 120 dos 300 leitos sejam instalados na Região da Serra, em atenção ao compromisso firmado com as lideranças locais.” O ofício não traz dados de carência, população nem deslocamento. Pedir leito para a região é legítimo — o critério é que precisa ser público.",
  },

  /* ───── Caso 26 — hospital com obra parada ───── */
  {
    id: "c26-medicao", caso: 26, location: "canteiro", titulo: "Boletim de medição da empreiteira", tipo: "documento", confiabilidade: "incompleta", icone: "🪧", fonte: SIM,
    texto: "A empreiteira Construtora Pedra Forte (fictícia) apresentou o avanço da obra do Hospital Estadual. Os percentuais são do boletim dela; o do fiscal ainda não foi juntado.",
    tabela: () => [["Execução física atestada pela empresa", "62%"], ["Valor já pago (acumulado)", "71% do contrato"], ["Prazo do contrato", "vence em 30 dias"], ["Saldo de obra a executar", "38%"]],
  },
  {
    id: "c26-laudo", caso: 26, location: "canteiro", titulo: "Laudo do fiscal sobre a estrutura", tipo: "documento", confiabilidade: "confirmada", icone: "🏗️", fonte: SIM,
    texto: (c) => `Leandro Matos, engenheiro fiscal, mediu o que está de pé: a estrutura de concreto está íntegra, mas cerca de 6% do já executado precisa ser refeito (instalações embutidas fora de projeto). Terminar com a contratada custaria perto de ${c.money(2.4)}; rescindir, relicitar e remobilizar custaria cerca de ${c.money(3.6)} e levaria mais de um ano.`,
    tabela: (c) => [["Estrutura", "íntegra"], ["Retrabalho estimado", "6% do executado"], ["Concluir com a contratada", c.money(2.4)], ["Rescindir e relicitar", c.money(3.6) + " + 14 meses"]],
  },
  {
    id: "c26-contrato", caso: 26, location: "gabinete-estadual", titulo: "Processo: contrato e histórico de pagamentos", tipo: "documento", confiabilidade: "confirmada", icone: "🗂️", fonte: SIM,
    texto: (c) => `Contrato de ${c.money(6)}. A empresa pediu aditivo de prazo alegando chuvas e atraso de projetos, mas as justificativas não têm datas nem fotos. Pelos pagamentos feitos, o estado já desembolsou 71% do valor para uma obra que o fiscal mede em 62%: são 9 pontos percentuais — cerca de ${c.money(0.54)} — pagos adiantados.`,
  },

  /* ───── Caso 27 — licitação da segunda fase ───── */
  {
    id: "c27-planilha", caso: 27, location: "canteiro", titulo: "Planilha de preços da proponente (Bloco B)", tipo: "documento", confiabilidade: "incompleta", icone: "📑", fonte: SIM,
    texto: (c) => `Para o Bloco B do hospital (segunda fase), a única proponente apresentou planilha de ${c.money(3)}. Alguns itens chamam a atenção; o projeto básico não traz sondagem do terreno, o que deixa o risco de solo sem dono.`,
    tabela: () => [["Concreto estrutural", "38% acima da referência"], ["Instalações de gases medicinais", "41% acima"], ["Esquadrias e vidros", "12% acima"], ["Sondagem do terreno", "não consta no projeto"]],
  },
  {
    id: "c27-referencia", caso: 27, location: "painel-regioes", titulo: "Tabela de preços de referência", tipo: "dado", confiabilidade: "confirmada", icone: "📊", fonte: EST,
    texto: (c) => `Banco de preços de referência de obras públicas (fictício): serve para comparar o orçamento do estado com o do mercado antes de fechar contrato. Somando os mesmos itens a preços de referência, o Bloco B custaria cerca de ${c.money(2.3)}.`,
    tabela: (c) => [["Bloco B a preço de referência", c.money(2.3)], ["Proposta da proponente", c.money(3)], ["Diferença", c.money(0.7)]],
  },
  {
    id: "c27-aditivo", caso: 27, location: "gabinete-estadual", titulo: "Pedido de aditivo de 25% na obra em andamento", tipo: "documento", confiabilidade: "incompleta", icone: "💻", fonte: SIM,
    texto: (c) => `A construtora pede acrescentar 25% ao contrato (cerca de ${c.money(0.75)}) para “serviços complementares”. Não há projeto, quantitativo nem parecer técnico. A lei admite acréscimos até 25% em obras, mas esse é um teto, e não um direito: cada real precisa ser justificado.`,
  },

  /* ───── Caso 28 — repasse fundo a fundo ───── */
  {
    id: "c28-criterios", caso: 28, location: "painel-regioes", titulo: "Critérios de rateio do repasse fundo a fundo", tipo: "documento", confiabilidade: "confirmada", icone: "🗺️", fonte: SIM,
    texto: "O estado repassa recursos aos fundos municipais de saúde por critérios públicos, e a transferência exige conselho de saúde ativo e relatórios quadrimestrais entregues. Pesos: população (40%), vulnerabilidade social (30%), produção de serviços (30%).",
    tabela: (c) => [["Pedra Alta (18 mil hab.)", "repasse de " + c.money(0.12)], ["Rio Manso (40 mil hab.)", c.money(0.24)], ["Vila Serrana (22 mil hab.)", c.money(0.16)], ["Porto Claro (65 mil hab.)", c.money(0.31)]],
  },
  {
    id: "c28-prestacao", caso: 28, location: "tribunal", titulo: "Autos: prestação de contas dos municípios", tipo: "documento", confiabilidade: "confirmada", icone: "📚", fonte: SIM,
    texto: (c) => `Situação dos municípios no último quadrimestre. Pedra Alta está há dois quadrimestres sem relatório e mantém ${c.money(0.08)} parados na conta do fundo, sem uso. O conselho municipal de saúde não se reúne há seis meses.`,
    tabela: () => [["Pedra Alta", "2 relatórios atrasados · conselho inativo"], ["Rio Manso", "em dia"], ["Vila Serrana", "1 relatório com pendência já sanada"], ["Porto Claro", "em dia"]],
  },
  {
    id: "c28-pedido", caso: 28, location: "assembleia", titulo: "Ofício: liberar o repasse a Pedra Alta", tipo: "opiniao", confiabilidade: "opiniao", icone: "📨", fonte: SIM,
    texto: "“A população de Pedra Alta não pode pagar pela burocracia. Peço a liberação imediata, a prestação de contas a gente vê depois.” O ofício vem assinado por quem tem afinidade com o prefeito do município e não menciona o saldo parado na conta nem o conselho inativo.",
  },

  /* ───── Caso 29 — parceria para gerir uma unidade ───── */
  {
    id: "c29-proposta", caso: 29, location: "gabinete-estadual", titulo: "Processo: proposta do Instituto Vida Plena", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: (c) => `O Instituto Vida Plena (organização fictícia, indicada por gente próxima do Governo) propõe gerir o Hospital Regional de Vale Azul por ${c.money(0.9)} ao ano. As metas são sobre volume (cirurgias e consultas por mês). Não há meta de mortalidade, tempo de espera, satisfação nem prestação de contas aberta.`,
    tabela: () => [["Meta 1", "1.200 consultas por mês"], ["Meta 2", "300 cirurgias por mês"], ["Qualidade, espera, mortalidade", "sem meta"], ["Fiscalização", "relatório da própria organização"]],
  },
  {
    id: "c29-comparativo", caso: 29, location: "painel-regioes", titulo: "Comparativo: custo por leito em gestão direta", tipo: "dado", confiabilidade: "confirmada", icone: "📊", fonte: SIM,
    texto: "Unidade parecida (Hospital Regional do Litoral), em gestão direta, com indicadores de qualidade monitorados. O custo por leito-dia é a base 100; a proposta do Instituto aparece em relação a ela.",
    tabela: () => [["Gestão direta (Litoral)", "custo 100 · mortalidade 3,1% · espera 52 dias"], ["Proposta do Instituto (Vale Azul)", "custo 118 · sem indicador de qualidade"]],
  },
  {
    id: "c29-vinculos", caso: 29, location: "tribunal", titulo: "Registro de dirigentes do Instituto", tipo: "documento", confiabilidade: "confirmada", icone: "🏛️", fonte: SIM,
    texto: "O registro mostra que o diretor-presidente do Instituto Vida Plena foi assessor de um ex-secretário-adjunto e que a empresa de manutenção que subcontratará pertence a um irmão dele. Parceria com terceiro setor é prevista em lei; vínculo escondido, não.",
  },

  /* ───── Caso 30 — Tribunal de Contas e Assembleia ───── */
  {
    id: "c30-notificacao", caso: 30, location: "tribunal", titulo: "Notificação do Tribunal de Contas", tipo: "documento", confiabilidade: "confirmada", icone: "📚", fonte: SIM,
    texto: "A Conselheira Iara Nogueira notificou a Secretaria para esclarecer, em 15 dias, os pontos que apareceram na auditoria do ano: pagamento adiantado na obra do hospital, composição de preços e aditivos, e acompanhamento dos repasses aos municípios. O prazo é improrrogável sem justificativa.",
    tabela: () => [["Apontamento 1", "execução física × pagamento da obra"], ["Apontamento 2", "preços, aditivos e matriz de riscos"], ["Apontamento 3", "prestação de contas dos repasses"], ["Prazo", "15 dias"]],
  },
  {
    id: "c30-relatorio", caso: 30, location: "gabinete-estadual", titulo: "Relatório de gestão da Secretaria Estadual", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: "Relatório consolidado do mandato: leitos instalados por região, evolução da espera por cirurgia eletiva, obras em andamento e metas não cumpridas, cada item com documento comprobatório anexo. Está pronto para ser público.",
    tabela: () => [["Leitos novos", "300 · distribuídos por critério"], ["Espera por cirurgia eletiva", "ver indicador do painel"], ["Obras", "retomada e Bloco B em andamento"], ["Metas não cumpridas", "listadas, com plano de correção"]],
  },
  {
    id: "c30-convocacao", caso: 30, location: "assembleia", titulo: "Convocação da Comissão de Saúde", tipo: "documento", confiabilidade: "confirmada", icone: "📨", fonte: SIM,
    texto: "A Comissão de Saúde convoca a Secretaria para explicar, em sessão aberta, a gestão da obra, os repasses e a parceria do Hospital de Vale Azul. A sessão é transmitida ao vivo e as perguntas dos deputados serão públicas.",
  },
];

/* ───────────────────────────── Achados ───────────────────────────── */

const achados: FindingDef[] = [
  {
    id: "f25-necessidade", caso: 25, a: "c25-leitos", b: "c25-viagens", titulo: "Onde faltam leitos é de onde as pessoas viajam", autoPorConhecimento: ["planejamento-necessidade", "medir-antes"],
    texto: "Vale (8 leitos por 10 mil) e Sertão (7) são as regiões mais carentes e as que mais obrigam a viajar (52% e 61% mais de 150 km). A Metropolitana tem 26 leitos e quase ninguém viaja. Um critério por necessidade colocaria cerca de 110 leitos no Vale, 90 no Sertão, 60 na Serra e 40 no Litoral.",
  },
  {
    id: "f25-pressao", caso: 25, a: "c25-pedido", b: "c25-leitos", titulo: "A Serra pede mais do que a necessidade mostra", autoPorConhecimento: ["planejamento-necessidade"],
    texto: "A Serra tem 12 leitos por 10 mil e 34% viajam: é carente, mas menos que Vale e Sertão. O pedido de 120 leitos (40% do total) para uma região com 18% da população paga a pressão, não a necessidade.",
  },
  {
    id: "f26-fisico-financeiro", caso: 26, a: "c26-medicao", b: "c26-contrato", titulo: "Pagou-se mais do que se construiu", autoPorConhecimento: ["custo-total", "controle-interno"],
    texto: (c) => `O estado pagou 71% de um contrato em que o fiscal mede 62% de obra: são 9 pontos adiantados, perto de ${c.money(0.54)}. Antes de qualquer decisão sobre prazo, é preciso medir o executado, glosar o que foi pago a mais e só então repactuar o saldo.`,
  },
  {
    id: "f26-retomada", caso: 26, a: "c26-laudo", b: "c26-medicao", titulo: "Retomar com medição custa menos que recomeçar", autoPorConhecimento: ["custo-total", "medir-antes"],
    texto: (c) => `A estrutura está íntegra e 38% da obra ainda por fazer custaria cerca de ${c.money(2.4)} com a contratada (com retenção e medição mensal). Rescindir e relicitar sairia em torno de ${c.money(3.6)} e deixaria o hospital parado por mais de um ano.`,
  },
  {
    id: "f27-sobrepreco", caso: 27, a: "c27-planilha", b: "c27-referencia", titulo: "A planilha está cerca de 30% acima da referência", autoPorConhecimento: ["custo-total", "controle-interno"],
    texto: (c) => `Os mesmos itens a preço de referência somam ${c.money(2.3)}; a proposta pede ${c.money(3)}. A diferença (${c.money(0.7)}) se concentra em concreto e gases medicinais, e a falta de sondagem deixa o risco de solo sem dono: o aditivo posterior seria quase certo.`,
  },
  {
    id: "f27-aditivo", caso: 27, a: "c27-aditivo", b: "c27-planilha", titulo: "O aditivo de 25% cobre o que a planilha não previu", autoPorConhecimento: ["controle-interno", "conflito-interesses"],
    texto: (c) => `Sem sondagem e sem matriz de riscos, qualquer imprevisto vira pedido de aditivo. O teto legal de 25% (${c.money(0.75)}) não justifica nada sozinho: sem projeto, quantitativo e parecer técnico, o aditivo é cheque em branco.`,
  },
  {
    id: "f28-condicionalidade", caso: 28, a: "c28-criterios", b: "c28-prestacao", titulo: "O critério existe — e Pedra Alta não o cumpriu", autoPorConhecimento: ["transparencia", "controle-interno"],
    texto: (c) => `Os critérios exigem conselho ativo e relatórios em dia. Pedra Alta tem dois relatórios atrasados, conselho parado e ${c.money(0.08)} sem uso na conta. O caminho é liberar a parcela de forma condicionada, com plano de regularização e apoio técnico, sem punir a população nem fingir que a regra não existe.`,
  },
  {
    id: "f28-saldo", caso: 28, a: "c28-prestacao", b: "c28-pedido", titulo: "O pedido ignora o saldo parado", autoPorConhecimento: ["transparencia"],
    texto: (c) => `O ofício pede mais dinheiro para um município que ainda não usou os ${c.money(0.08)} que já tinha. Liberar sem exigir contas pode premiar a falta de execução e fragilizar quem cumpre as regras.`,
  },
  {
    id: "f29-metas", caso: 29, a: "c29-proposta", b: "c29-comparativo", titulo: "Mais caro e sem meta de qualidade", autoPorConhecimento: ["contrato-gestao", "medir-antes"],
    texto: "A proposta custa cerca de 18% a mais por leito-dia que a gestão direta comparável e mede só volume. Sem metas de mortalidade, espera e satisfação, nem fiscalização independente, a parceria paga mais sem garantir melhor atendimento.",
  },
  {
    id: "f29-vinculo", caso: 29, a: "c29-vinculos", b: "c29-proposta", titulo: "Parceria com porteira aberta para a captura", autoPorConhecimento: ["conflito-interesses", "contrato-gestao"],
    texto: "O dirigente vem do círculo do Governo e a subcontratada é do irmão dele. O chamamento público e as cláusulas de transparência e de conflito de interesses existem para que a parceria seja escolhida pelo mérito e fiscalizada por quem não é parte dela.",
  },
  {
    id: "f30-resposta", caso: 30, a: "c30-notificacao", b: "c30-relatorio", titulo: "Cada apontamento tem resposta documentada", autoPorConhecimento: ["transparencia", "controle-interno"],
    texto: "Os três apontamentos do Tribunal (obra, aditivos e repasses) correspondem a itens do relatório de gestão, cada um com documento anexo. Responder bem é dizer o que foi feito, mostrar a prova e assumir o que falta, e o mesmo relatório serve à Assembleia.",
  },
];

/* ───────────────────────────── Conversas ───────────────────────────── */

const conversas: ConversationDef[] = [
  /* ───── Caso 25 ───── */
  talk("n4-teodoro-abertura", 25, "gabinete-estadual", "teodoro", "Posse na Secretaria Estadual", [
    ["feliz", "Secretário(a)! Teodoro Lima, Governador. Bem-vindo(a) ao Palácio da Saúde. O estado é grande: cinco regiões, 3 milhões de pessoas e um mapa que parece desenhado por quem nunca viajou por ele."],
    ["serio", "O estado vai ganhar 300 leitos novos e todos os deputados já me ligaram. Quero que o critério seja claro, para eu poder explicar. Por onde começa?"],
    ["irônico", "E antes que pergunte: sim, tem um hospital com a obra parada, um aditivo estranho e um Tribunal de Contas que lê tudo. Bom trabalho."],
  ], [
    ["Pelos dados de cada região. Depois eu escuto os deputados.", ["feliz", "Era o que eu esperava. Rita tem o painel de regiões; o Deputado Cornélio já deixou um ofício na Assembleia."], { attrs: { competencia: 1 }, rel: { teodoro: 4 } }],
    ["Prefiro ouvir os deputados antes de olhar os números.", ["irônico", "Ouvir é bom. Só lembre que o mapa é de todos, não só de quem liga."], { rel: { teodoro: 1 } }],
  ], { apresentacao: "3d", auto: true }),
  talk("n4-rita-regioes", 25, "painel-regioes", "rita", "As cinco regiões de saúde", [
    ["serio", "Rita Campos, agora na regulação estadual. Montei este painel: leitos por 10 mil habitantes e a origem de quem opera longe de casa."],
    ["preocupado", "A Metropolitana tem leitos de sobra. Vale e Sertão têm poucos, e a maior parte de quem precisa de cirurgia viaja mais de 150 km."],
  ], [
    ["O que muda se os leitos forem para lá?", ["feliz", "Menos viagem, menos abandono de tratamento, menos ambulância na estrada. Cada leito no Vale evita várias idas à capital."], { rel: { rita: 4 } }],
    ["E a Serra, que também pede?", ["serio", "A Serra é carente, mas menos que as outras duas. Dá para atender depois, com o que sobrar do critério."], { rel: { rita: 2 } }],
  ]),
  talk("n4-cornelio-leitos", 25, "assembleia", "cornelio", "Leitos para a Serra", [
    ["feliz", "Secretário(a)! Deputado Cornélio. Preciso de 120 leitos para a Serra. Lá está a minha gente e a minha palavra."],
    ["irônico", "Dados, dados... a população não come dado. Come hospital."],
  ], [
    ["Vou aplicar um critério público para todas as regiões.", ["serio", "Critério é bonito no papel. Espero que haja espaço para a Serra nele."], { attrs: { competencia: 1 }, rel: { cornelio: -2 } }],
    ["Vou ver o que dá para fazer pela Serra.", ["feliz", "Sabia que podia contar com você. Vamos combinar uma foto no hospital novo."], { rel: { cornelio: 6 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 26 ───── */
  talk("n4-leandro-obra", 26, "canteiro", "leandro", "O que está de pé", [
    ["serio", "Leandro Matos, engenheiro fiscal. Medi cada pilar. A estrutura é boa; o que preocupa é o que está atrás do reboco e o que a empresa diz que já fez."],
    ["preocupado", "O boletim dela diz 62%. O meu diz 62% também, mas o pagamento já passou de 71%. Não fecha."],
  ], [
    ["Preciso do laudo por escrito, com fotos e datas.", ["feliz", "Já está na parede. Fotos, datas, medidas. Nada de “acho que”."], { attrs: { competencia: 1 }, rel: { leandro: 4 } }],
    ["Dá para inaugurar o que já está pronto?", ["irônico", "Dá para inaugurar uma fachada. Hospital, só quando tiver instalação e licença sanitária."], { rel: { leandro: 1 } }],
  ]),
  talk("n4-roberto-medicao", 26, "canteiro", "roberto", "A medição que ninguém conferiu", [
    ["serio", "Roberto dos Contratos. Revi os últimos oito boletins: cada um foi atestado sem a medição do fiscal anexada."],
    ["preocupado", "A diferença entre o que foi pago e o que foi construído dá uns 9 pontos. Dá para glosar, mas tem que ser com planilha, não com palpite."],
  ], [
    ["Vamos montar a glosa com a medição do Leandro.", ["feliz", "Combinado. Eu levo o cálculo e a notificação da empresa antes do vencimento."], { rel: { roberto: 5 } }],
    ["Podemos tolerar a diferença para a obra andar?", ["serio", "Tolerar sem registrar vira pagamento antecipado de nova obra. Prefiro não apostar com dinheiro do estado."], { rel: { roberto: -2 } }],
  ]),
  talk("n4-valdemar-rescisao", 26, "gabinete-estadual", "valdemar", "A rescisão “firme”", [
    ["feliz", "Secretário(a), a solução limpa é rescindir o contrato e licitar tudo de novo. Em três meses a gente tem outro hospital, quase."],
    ["irônico", "Rescisão tem um nome bonito: firmeza. Prazo e custo, deixa para depois."],
  ], [
    ["Quanto custa e quanto tempo leva, de fato?", ["serio", "Mais de um ano, alguma coisa perto do dobro. Mas fica a imagem de quem não negociou."], { attrs: { competencia: 1 }, rel: { valdemar: -1 } }],
    ["Boa ideia. Rescinde e a gente licita.", ["feliz", "Excelente. Já tenho o edital rascunhado... com alguns amigos em mente."], { rel: { valdemar: 6 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 27 ───── */
  talk("n4-leandro-planilha", 27, "canteiro", "leandro", "A planilha do Bloco B", [
    ["serio", "Olhei o projeto básico do Bloco B. Não há sondagem do terreno, e a planilha traz gases medicinais 41% acima do que o mercado cobra."],
    ["preocupado", "Sem matriz de riscos, o risco do solo cai no colo do estado. E no meio da obra aparece o aditivo."],
  ], [
    ["Refaço a planilha com preços de referência e matriz de riscos?", ["feliz", "Faça. Eu entrego a sondagem em duas semanas e a lista de itens a revisar amanhã."], { attrs: { competencia: 1 }, rel: { leandro: 4 } }],
    ["A proponente é a única. Não dá para aceitar?", ["serio", "Ser a única não torna o preço certo. Só torna a comparação mais difícil."], { rel: { leandro: 1 } }],
  ]),
  talk("n4-ana-matriz", 27, "painel-regioes", "ana", "Matriz de riscos e sobrepreço", [
    ["serio", "Ana, da Controladoria. Em obra grande, quem assume o risco do solo, da chuva e do projeto precisa estar escrito no contrato: é a matriz de alocação de riscos."],
    ["irônico", "Sobrepreço é preço acima do que o mercado pratica, e aditivo, quando vira rotina, é outra licitação feita por trás da primeira."],
  ], [
    ["Como eu comprovo o sobrepreço?", ["feliz", "Comparando item a item com tabela de referência. A diferença vira argumento no processo, não opinião."], { rel: { ana: 4 } }],
    ["O aditivo de 25% é um direito da empresa, não?", ["serio", "O limite é teto, não cota. Aditivo precisa de justificativa técnica, projeto e preço."], { rel: { ana: 1 } }],
  ]),
  talk("n4-toninho-aditivo", 27, "canteiro", "toninho", "Um aditivo de amigo", [
    ["feliz", "Secretário(a), a empreiteira é gente boa. Assina o aditivo de 25% e a gente inaugura o Bloco A antes do fim do ano."],
    ["irônico", "Perguntaram se tinha parecer técnico. Eu disse que a técnica é boa vontade."],
  ], [
    ["Sem parecer técnico eu não assino.", ["serio", "Ai ai. Vai atrasar a foto, hein."], { attrs: { competencia: 1 }, rel: { toninho: -2 } }],
    ["Se for só 25%, dá para assinar.", ["feliz", "Essa é a minha parceria! Já mandei imprimir a placa."], { rel: { toninho: 6 }, attrs: { caraDePau: 2 } }],
  ]),
  /* ───── Caso 28 ───── */
  talk("n4-lucia-repasse", 28, "painel-regioes", "lucia", "O repasse visto do município", [
    ["serio", "Lúcia Andrade, prefeita. Dos municípios que recebem o repasse, a gente que presta contas sofre com o prazo; quem não presta recebe do mesmo jeito."],
    ["preocupado", "Se o estado liberar tudo para Pedra Alta sem exigir nada, isso é um recado: cumprir regra não compensa."],
  ], [
    ["Como apoiar quem está atrasado sem punir a população?", ["feliz", "Apoio técnico, prazo para regularizar e liberação por parcelas. O dinheiro chega, com condição."], { attrs: { competencia: 1 }, rel: { lucia: 4 } }],
    ["O repasse deveria ser automático, não?", ["serio", "O repasse é de direito, mas a prestação de contas é parte do direito. As duas andam juntas."], { rel: { lucia: 1 } }],
  ]),
  talk("n4-nelson-liberar", 28, "assembleia", "nelson", "Liberar já", [
    ["feliz", "Secretário(a), a gente não pode deixar Pedra Alta esperando. O prefeito é amigo antigo e a população merece."],
    ["irônico", "Prestação de contas a gente resolve em ano de calma."],
  ], [
    ["Libero por parcela, com plano de regularização.", ["serio", "Parcela... Não é o que eu pedi, mas acho que o prefeito aceita."], { attrs: { competencia: 1 }, rel: { nelson: -1 } }],
    ["Liberou, Vereador. Deixa comigo.", ["feliz", "Sabia! Você é gente fina. A cidade nunca vai esquecer."], { rel: { nelson: 6 }, attrs: { caraDePau: 2 } }],
  ]),
  talk("n4-guardiao-repasse", 28, "gabinete-estadual", "guardiao", "O caixa e o fundo parado", [
    ["serio", "Guardião do Cofre. Pedra Alta tem dinheiro parado na conta do fundo e quer mais. Do meu lado, o caixa tem pressa."],
    ["irônico", "Repasse sem prestação de contas é transferência de saudade."],
  ], [
    ["Vamos condicionar a próxima parcela ao relatório.", ["feliz", "Isso eu consigo defender no Tribunal. Registro tudo."], { rel: { guardiao: 4 } }],
    ["Liberemos tudo, depois cobramos.", ["irritado", "Depois nunca chega com o saldo na mão."], { rel: { guardiao: -3 } }],
  ]),

  /* ───── Caso 29 ───── */
  talk("n4-valdemar-os", 29, "gabinete-estadual", "valdemar", "O contrato de gestão e seus termos", [
    ["feliz", "Secretário(a), o Instituto Vida Plena é uma OS de excelência. Contrato de gestão, termo de parceria, chamamento... É tudo a mesma coisa, só muda o nome."],
    ["irônico", "E em linguagem simples: a gente aprova a proposta, o Instituto cuida, e a gente se livra do problema do hospital."],
  ], [
    ["Quero chamamento público e metas de qualidade.", ["serio", "Burocracia... mas está certo. Dá mais trabalho e menos amigo."], { attrs: { competencia: 1 }, rel: { valdemar: -1 } }],
    ["Pode fechar com o Instituto, então.", ["feliz", "Feito! Já mando a minuta, com cláusula de renovação automática."], { rel: { valdemar: 6 }, attrs: { caraDePau: 2 } }],
  ]),
  talk("n4-teodoro-os", 29, "gabinete-estadual", "teodoro", "A solução rápida do Governador", [
    ["serio", "Secretário(a), preciso de um hospital funcionando em Vale Azul antes da campanha de vacinação. O Instituto pode começar já."],
    ["preocupado", "Mas não quero ver o nome do Governo numa reportagem sobre parceria suspeita. Dá para fazer rápido e bem feito?"],
  ], [
    ["Dá: chamamento público rápido, metas e fiscalização.", ["feliz", "Então faça. Eu assumo o prazo e você assume as metas."], { attrs: { competencia: 1 }, rel: { teodoro: 4 } }],
    ["O Instituto já resolve, sem chamamento.", ["irônico", "Rápido, sim. Bem feito, a gente vê depois."], { rel: { teodoro: 1 } }],
  ], { apresentacao: "3d" }),
  talk("n4-bento-metas", 29, "tribunal", "bento", "Metas que se pode medir", [
    ["serio", "Uma parceria vale o que valem suas metas e quem as fiscaliza. Meta de volume é fácil de cumprir e não diz se o paciente foi bem atendido."],
    ["triste", "O risco é a captura: a parceria passa a servir a quem a executa, não a quem precisa dela."],
  ], [
    ["Que metas vocês colocariam?", ["feliz", "Mortalidade, espera, satisfação, ocupação de leitos e prestação de contas pública. E uma comissão externa para conferir."], { attrs: { conhecimento: 1 }, rel: { bento: 4 } }],
    ["Volume de atendimento não basta?", ["irônico", "Basta para a foto. Para o paciente, só se vier junto com qualidade."], { rel: { bento: 1 } }],
  ]),

  /* ───── Caso 30 ───── */
  talk("n4-iara-resposta", 30, "tribunal", "iara", "A Conselheira Iara Nogueira", [
    ["serio", "Secretário(a), Iara Nogueira. Meu papel não é atrapalhar a gestão, é verificar. A notificação tem três apontamentos e quinze dias."],
    ["irônico", "Já recebi respostas de três páginas dizendo que está tudo bem e de trinta páginas dizendo que nada é com o órgão. Prefiro uma resposta curta, com anexo."],
  ], [
    ["Vou responder ponto a ponto, com documentos.", ["feliz", "É assim que se trabalha. Se algo falhou, diga o que foi corrigido e quando."], { attrs: { competencia: 1, confianca: 1 }, rel: { iara: 5 } }],
    ["Posso pedir prorrogação do prazo?", ["serio", "Pode, com justificativa. Prorrogar sem motivo é mensagem demais para pouca resposta."]],
  ], { apresentacao: "3d" }),
  talk("n4-celia-assembleia", 30, "assembleia", "celia", "A plateia da Assembleia", [
    ["serio", "Secretário(a), Célia, conselheira de saúde. Vim assistir à sessão. Na galeria tem gente que viajou três horas para ouvir."],
    ["triste", "Quando a gente pergunta, as respostas costumam ser cheias de gráfico e vazias de explicação."],
  ], [
    ["Vou contar o que deu certo, o que falhou e o que vou corrigir.", ["feliz", "É disso que a população precisa. Eu fico atenta e ajudo a divulgar."], { rel: { celia: 5 }, attrs: { confianca: 1 } }],
    ["Vou destacar as obras e os leitos novos.", ["irônico", "As obras eu vejo. Quero ouvir sobre o que não deu certo."], { rel: { celia: -2 } }],
  ]),
  talk("n4-teodoro-final", 30, "gabinete-estadual", "teodoro", "Antes da sessão", [
    ["serio", "Secretário(a), a Assembleia e o Tribunal vão fazer perguntas duras. Eu já sei qual é a minha: o que a Secretaria fez por quem mais precisa?"],
    ["feliz", "Gostei de ver leitos no Vale, obra fiscalizada e repasse com regra. Agora diga isso em público, inclusive o que deu errado."],
  ], [
    ["Vou apresentar resultados, falhas e plano de correção.", ["feliz", "Então vá. E leve o relatório consigo."], { attrs: { confianca: 1 }, rel: { teodoro: 5 } }],
    ["Prefiro deixar a assessoria responder.", ["irônico", "Assessoria não vota nem assina por você. Pense."], { rel: { teodoro: -1 } }],
  ], { apresentacao: "3d" }),
];

/* ───────────────────────────── Decisões ───────────────────────────── */

const D = "gabinete-estadual" as const;
const desvioTxt = (rotulo: string) => DEV(rotulo, "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado.");
const ganhoIlicito = () => "Ganho pessoal ilícito (fictício): até 10% da base do evento";
const dep = (depois: number, efeitos: Effects, titulo: string, mensagem: string, motivo: string, tom: "bom" | "ruim" | "neutro") => ({ depois, efeitos, titulo, mensagem, motivo, tom });

const decisoes: DecisionDef[] = [
  /* ───────── D25 — 300 leitos ───────── */
  {
    id: "d25", caso: 25, mesa: D, titulo: "Para onde vão os 300 leitos", conceito: "equidade-regional", basePct: 0, gestoPadrao: "assinar",
    papelAssinado: "PORTARIA — DISTRIBUIÇÃO DE LEITOS NOVOS ENTRE AS REGIÕES DE SAÚDE — documento fictício",
    pergunta: "O estado ganhou 300 leitos novos. Os deputados pedem um pedaço cada um; os dados mostram regiões muito diferentes. Qual será o critério?",
    opcoes: [
      o4({ id: "leitos-necessidade", rotulo: "Distribuir por índice de necessidade e publicar o critério", kind: "competente", resumo: "Combinar leitos por 10 mil habitantes, deslocamento e população, e mostrar a conta a todos.",
        requer: { achado: "f25-necessidade", dica: "Cruze o painel de leitos por região com o mapa de quem viaja mais de 150 km." },
        custo: m(3.4), prazo: "10 meses até a maioria dos leitos abrir", ganho: () => "Leitos onde falta e menos viagens para operar",
        riscos: [{ texto: "Deputados de regiões menos carentes vão reclamar" }, { texto: "Os leitos do Vale e do Sertão exigem equipe que ainda não existe", precisa: "c25-leitos" }],
        custoPct: 3.4, aplica: ["planejamento-necessidade", "medir-antes"], conquista: "n4-leitos-onde-faltam",
        efeitos: { attrs: { competencia: 6, confianca: 2, persuasao: 1 }, pub: { acesso: 6, qualidade: 2 }, filaMin: -6, rel: { rita: 8, teodoro: 4, cornelio: -6 } },
        depois: [dep(2, { pub: { acesso: 4, equipe: 1 }, filaMin: -8, attrs: { confianca: 3 } }, "Menos gente na estrada", "Com leitos no Vale e no Sertão, as viagens de mais de 150 km caíram e a espera por cirurgia encurtou.", "Os leitos foram para onde a necessidade estava medida.", "bom")],
        narracao: "Rita estende o mapa sobre a mesa e põe o dedo no Sertão: “É aqui.” O Deputado Cornélio sai da Assembleia sem se despedir." }),
      o4({ id: "leitos-metade", rotulo: "Liberar 150 leitos pelo critério e adiar a outra metade", kind: "prudente", resumo: "Começar pelo que está claro e esperar uma nova rodada de dados.",
        custo: m(1.8), prazo: "6 meses para a primeira metade", riscos: [{ texto: "A outra metade vira moeda de troca política" }, { texto: "Quem espera continua viajando" }],
        custoPct: 1.8, aplica: ["planejamento-necessidade"], efeitos: { attrs: { competencia: 2 }, pub: { acesso: 3 }, filaMin: -3, rel: { rita: 3, cornelio: -2 } },
        narracao: "Metade dos leitos sai do papel. A outra metade fica à espera de uma próxima rodada — e de uma próxima visita do Deputado." }),
      o4({ id: "leitos-pressao", rotulo: "Atender primeiro quem pressiona (120 para a Serra)", kind: "comodo", resumo: "Distribuir conforme os ofícios e telefonemas mais insistentes.",
        custo: m(3.4), prazo: "10 meses", riscos: [{ texto: "A Serra tem menos carência que Vale e Sertão", precisa: "c25-pedido" }, { texto: "Quem não ligou fica de fora" }],
        custoPct: 3.4, aliado: "cornelio", efeitos: { attrs: { popularidade: 4, rede: 3, competencia: -2 }, pub: { acesso: 1 }, rel: { cornelio: 10, rita: -6 }, favor: { cornelio: 6 }, dependencia: 4 },
        depois: [dep(2, { pub: { acesso: -2 }, filaMin: 5, attrs: { confianca: -3 } }, "Leito bonito, estrada cheia", "Os leitos da Serra abriram, mas o Vale e o Sertão continuam enviando pacientes para longe.", "A distribuição seguiu o pedido, não a necessidade.", "ruim")],
        narracao: "Cornélio inaugura a placa antes da obra. A frase “eu pedi” aparece em todos os cartazes." }),
      o4({ id: "leitos-iguais", rotulo: "Dividir em partes iguais entre as cinco regiões", kind: "fraco", resumo: "60 leitos para cada região, sem olhar população nem carência.",
        custo: m(3.4), prazo: "10 meses", riscos: [{ texto: "Dá leito a quem já tem de sobra e pouco a quem mais precisa" }],
        custoPct: 3.4, efeitos: { attrs: { competencia: -2, popularidade: 2 }, pub: { acesso: 1, qualidade: -1 }, rel: { rita: -4 } },
        depois: [dep(2, { attrs: { confianca: -2 }, filaMin: 3 }, "A conta da igualdade", "Cinco partes iguais para cinco regiões desiguais: a Metropolitana ganhou leitos que não precisava e o Sertão segue esperando.", "Igualdade de números não é equidade.", "ruim")],
        narracao: "Todo mundo recebe igual. Só que ninguém é igual." }),
    ],
  },

  /* ───────── D26 — hospital com obra parada ───────── */
  {
    id: "d26", caso: 26, mesa: D, titulo: "O hospital com a obra parada", conceito: "obra-parada", basePct: 5, gestoPadrao: "assinar",
    papelAssinado: "TERMO DE REPACTUAÇÃO / DECISÃO SOBRE CONTRATO DE OBRA — documento fictício",
    pergunta: "A obra do Hospital Estadual está em 62% e o contrato vence em 30 dias. A empresa quer mais prazo; há quem queira rescindir. O que fazer?",
    opcoes: [
      o4({ id: "obra-medir-repactuar", rotulo: "Medir o executado, glosar o pago a mais e repactuar prazo com medição mensal", kind: "competente", resumo: "Atualizar a medição, descontar o adiantamento, retomar com cronograma e retenção.",
        requer: { achado: "f26-fisico-financeiro", dica: "Compare o boletim de medição com o histórico de pagamentos do contrato." },
        custo: m(2.4), prazo: "Retomada em 60 dias; entrega em 14 meses", ganho: m(0.54),
        riscos: [{ texto: "A empresa pode contestar a glosa" }, { texto: "Cerca de 6% do executado precisa de retrabalho", precisa: "c26-laudo" }],
        custoPct: 2.4, economiaPct: 12, aplica: ["medir-antes", "custo-total", "controle-interno"], conquista: "n4-obra-medida",
        efeitos: { attrs: { competencia: 6, confianca: 2 }, pub: { qualidade: 3, acesso: 2, sustentabilidade: 2 }, filaMin: -2, rel: { leandro: 8, roberto: 6, valdemar: -4 } },
        depois: [dep(2, { pub: { acesso: 4, qualidade: 3 }, filaMin: -6, caixaPct: 0.4, attrs: { confianca: 3 } }, "A obra voltou a andar", "Com medição mensal, glosa aplicada e cronograma público, o hospital recomeçou e cada pagamento acompanha o que foi construído.", "Você mediu o que existia antes de decidir.", "bom")],
        narracao: "Leandro entrega o laudo, Roberto monta a glosa, a empreiteira reclama, assina — e o canteiro volta a ter barulho de obra." }),
      o4({ id: "obra-aditivo-prazo", rotulo: "Aditivo de prazo curto com retenção de 10% e fiscalização reforçada", kind: "prudente", resumo: "Dar seis meses a mais, segurando parte do pagamento, sem refazer a conta do adiantamento.",
        custo: m(2.6), prazo: "Seis meses e reavaliação", economiaPct: 3, riscos: [{ texto: "O adiantamento já pago fica sem acerto" }, { texto: "Pode repetir o atraso" }],
        custoPct: 2.6, aplica: ["controle-interno"], efeitos: { attrs: { competencia: 3 }, pub: { qualidade: 1, acesso: 1 }, rel: { leandro: 3, roberto: 2 } },
        narracao: "O prazo é estendido, a retenção é aplicada, e a pergunta sobre os 9 pontos pagos a mais continua aberta." }),
      o4({ id: "obra-rescindir", rotulo: "Rescindir e relicitar do zero", kind: "comodo", resumo: "Mostrar firmeza cortando o contrato e abrindo nova licitação, sem medir o que já existe.",
        custo: m(3.6), prazo: "Mais de 14 meses até a nova obra começar a andar", riscos: [{ texto: "Hospital parado por mais de um ano", precisa: "c26-laudo" }, { texto: "Disputa judicial com a contratada" }],
        custoPct: 3.6, aliado: "valdemar", efeitos: { attrs: { popularidade: 2, competencia: -2 }, pub: { acesso: -1 }, rel: { valdemar: 6, leandro: -4 } },
        depois: [dep(2, { pub: { acesso: -3, sustentabilidade: -2 }, filaMin: 6, attrs: { confianca: -3 } }, "Esqueleto de concreto", "A rescisão foi parar na Justiça e a estrutura, que estava íntegra, ficou ao relento. O hospital ainda não tem data.", "A decisão veio da imagem de firmeza, não da medição.", "ruim")],
        narracao: "A imprensa elogia a firmeza por um dia. O hospital, por mais um ano, continua sem porta." }),
      o4({ id: "obra-prorrogar-comissao", rotulo: "Prorrogar sem medir e aceitar um “agradecimento” da empreiteira", kind: "desvio", resumo: "Estender o contrato sem glosa e receber um percentual por fora.",
        custo: m(2.8), prazo: "Imediato", ganho: ganhoIlicito, riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "O adiantamento de 9 pontos fica sem acerto", precisa: "c26-contrato" }],
        custoPct: 2.8, desvio: desvioTxt("Aceitar “agradecimento” da empreiteira"), aliado: "valdemar",
        efeitos: { dependencia: 12, influencia: 6, evidencias: 2, rel: { valdemar: 6, leandro: -8, roberto: -6 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [dep(2, { evidencias: 2, pub: { qualidade: -3 }, attrs: { confianca: -3 } }, "A medição que sumiu", "O fiscal registrou por escrito que a prorrogação foi assinada sem a medição dele. A Controladoria abriu uma pasta.", "Pagamento e prazo sem medição.", "ruim")],
        narracao: "A empreiteira agradece. O fiscal anota tudo. O Tribunal de Contas também anota — mais devagar." }),
    ],
  },

  /* ───────── D27 — licitação do Bloco B e aditivo ───────── */
  {
    id: "d27", caso: 27, mesa: D, titulo: "Planilha, aditivo e matriz de riscos", conceito: "sobrepreco-obra", basePct: 4, gestoPadrao: "assinar",
    papelAssinado: "DECISÃO SOBRE ADITIVO E LICITAÇÃO DO BLOCO B — documento fictício",
    pergunta: "A licitação do Bloco B tem uma única proponente com preços altos, e a construtora pede um aditivo de 25% na obra em andamento. Como decidir?",
    opcoes: [
      o4({ id: "planilha-refazer", rotulo: "Refazer a planilha com preço de referência e matriz de riscos; negar aditivo sem justificativa", kind: "competente", resumo: "Cancelar a fase de preços, incluir sondagem e matriz de riscos, e exigir parecer técnico para qualquer aditivo.",
        requer: { achado: "f27-sobrepreco", dica: "Compare a planilha da proponente com a tabela de preços de referência." },
        custo: m(2.3), prazo: "4 meses até republicar o edital", ganho: m(0.7),
        riscos: [{ texto: "A licitação atrasa alguns meses" }, { texto: "A construtora pode recorrer" }, { texto: "Sondagem pode revelar problema real no solo", precisa: "c27-planilha" }],
        custoPct: 2.3, economiaPct: 20, aplica: ["custo-total", "controle-interno", "medir-antes"], conquista: "n4-planilha-refeita",
        efeitos: { attrs: { competencia: 6, confianca: 3, persuasao: 1 }, pub: { sustentabilidade: 4, qualidade: 2 }, rel: { ana: 8, leandro: 6, guardiao: 4, toninho: -6 } },
        depois: [dep(2, { caixaPct: 0.5, pub: { sustentabilidade: 3, acesso: 2 }, attrs: { confianca: 3 }, filaMin: -3 }, "Obra no preço certo", "Com preço de referência, sondagem e riscos alocados, o novo edital atraiu mais de uma proponente e o valor ficou perto do mercado.", "Você comparou antes de assinar.", "bom")],
        narracao: "Ana confere a nova matriz. Leandro entrega a sondagem. Toninho olha para o relógio e para o teto." }),
      o4({ id: "aditivo-parcial", rotulo: "Aceitar só o aditivo que o fiscal justificar (até 8%), com projeto e preço", kind: "prudente", resumo: "Reconhecer o que for tecnicamente necessário e recusar o restante, sem refazer a licitação.",
        custo: m(2.7), prazo: "6 semanas", economiaPct: 6, riscos: [{ texto: "A planilha com sobrepreço do Bloco B segue valendo" }, { texto: "Aditivos podem voltar" }],
        custoPct: 2.7, aplica: ["controle-interno"], efeitos: { attrs: { competencia: 3 }, pub: { sustentabilidade: 1, qualidade: 1 }, rel: { leandro: 3, ana: 3, toninho: -3 } },
        narracao: "O aditivo encolhe de 25% para 8%, com cada item justificado. A planilha do Bloco B continua à espera de uma segunda leitura." }),
      o4({ id: "aditivo-25", rotulo: "Assinar o aditivo de 25% para a obra não parar", kind: "comodo", resumo: "Usar o teto legal como se fosse a regra e seguir em frente.",
        custo: m(3.75), prazo: "Imediato", riscos: [{ texto: "Sem justificativa, o aditivo é cheque em branco", precisa: "c27-aditivo" }, { texto: "Sobrepreço do Bloco B passa sem comparação" }],
        custoPct: 3.75, aliado: "toninho", conquista: "n4-aditivo-de-estimacao",
        efeitos: { attrs: { popularidade: 3, rede: 3, competencia: -3 }, pub: { sustentabilidade: -3 }, rel: { toninho: 8, ana: -6, guardiao: -4 }, favor: { toninho: 4 }, dependencia: 4 },
        depois: [dep(2, { pub: { sustentabilidade: -4, qualidade: -2 }, caixaPct: -0.6, attrs: { confianca: -4 }, evidencias: 1 }, "Aditivo de estimação", "O aditivo foi aprovado sem projeto e o preço do Bloco B subiu na primeira medição. O teto legal virou piso.", "O limite do aditivo foi tratado como direito, não como teto.", "ruim")],
        narracao: "Toninho já tem a placa de “fase dois” pronta. O parecer técnico, nem começou." }),
      o4({ id: "aditivo-taxa", rotulo: "Assinar o aditivo e combinar uma “taxa de aditivo” com a construtora", kind: "desvio", resumo: "Aprovar os 25% e receber um percentual por fora.",
        custo: m(3.75), prazo: "Imediato", ganho: ganhoIlicito, riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Sobrepreço e aditivo: dois problemas em um", precisa: "c27-planilha" }],
        custoPct: 3.75, desvio: desvioTxt("Receber “taxa de aditivo” da construtora"), aliado: "toninho",
        efeitos: { dependencia: 14, influencia: 6, evidencias: 3, rel: { toninho: 8, ana: -8, leandro: -6 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [dep(2, { evidencias: 2, pub: { sustentabilidade: -4 }, attrs: { confianca: -4 } }, "O preço do aditivo", "Os itens do aditivo apareceram acima da referência em todas as comparações da Controladoria.", "Aditivo sem justificativa e com favorecimento.", "ruim")],
        narracao: "O sorriso do Toninho é largo. A pasta de Ana, mais grossa a cada dia." }),
    ],
  },

  /* ───────── D28 — repasse fundo a fundo ───────── */
  {
    id: "d28", caso: 28, mesa: D, titulo: "O repasse e o município sem contas", conceito: "fundo-a-fundo", basePct: 3, gestoPadrao: "assinar",
    papelAssinado: "PORTARIA — REPASSE FUNDO A FUNDO AOS MUNICÍPIOS — documento fictício",
    pergunta: "O município de Pedra Alta pede o repasse, mas não prestou contas há dois quadrimestres. Quem pede é influente. O que fazer?",
    opcoes: [
      o4({ id: "repasse-condicionado", rotulo: "Liberar em parcelas, com plano de regularização e apoio técnico", kind: "competente", resumo: "Notificar, oferecer ajuda para entregar os relatórios e liberar o repasse conforme a regularização.",
        requer: { achado: "f28-condicionalidade", dica: "Compare os critérios do repasse com a situação de prestação de contas dos municípios." },
        custo: m(1.6), prazo: "30 dias para o plano; parcelas ao longo do semestre", economiaPct: 8, ganho: () => "Dinheiro chega ao município, com contas em dia",
        riscos: [{ texto: "O prefeito vai reclamar da condicionalidade" }, { texto: "Exige equipe técnica para apoiar o município", precisa: "c28-prestacao" }],
        custoPct: 1.6, aplica: ["transparencia", "controle-interno"], conquista: "n4-contas-ao-tribunal",
        efeitos: { attrs: { competencia: 5, confianca: 3 }, pub: { acesso: 3, sustentabilidade: 3 }, filaMin: -3, rel: { lucia: 6, guardiao: 6, nelson: -5 } },
        depois: [dep(2, { pub: { acesso: 3, equipe: 2 }, caixaPct: 0.3, attrs: { confianca: 3 } }, "Pedra Alta prestou contas", "Com apoio técnico e parcelas, o município entregou os relatórios, reativou o conselho e usou o saldo parado.", "A regra e o apoio andaram juntos.", "bom")],
        narracao: "Lúcia comenta, baixinho: “Assim a regra deixa de ser punição e vira rotina.” Nelson mastiga o próprio ofício." }),
      o4({ id: "repasse-suspender", rotulo: "Suspender todo o repasse até regularizar", kind: "prudente", resumo: "Bloquear a transferência por completo até que o município entregue os relatórios.",
        custo: m(0.4), prazo: "Imediato; sem data para voltar", riscos: [{ texto: "A população de Pedra Alta paga pelo atraso da prefeitura" }, { texto: "Sem apoio técnico, pode demorar" }],
        custoPct: 0.4, cortaAcesso: true, aplica: ["controle-interno"], efeitos: { attrs: { competencia: 2, confianca: 1 }, pub: { acesso: -2 }, rel: { guardiao: 4, nelson: -6, lucia: -2 } },
        narracao: "A regra é aplicada à risca. O posto de saúde de Pedra Alta fecha para o almoço — e para o jantar." }),
      o4({ id: "repasse-liberar", rotulo: "Liberar tudo agora e cobrar a prestação depois", kind: "comodo", resumo: "Atender o pedido político e deixar as contas para o próximo quadrimestre.",
        custo: m(1.6), prazo: "Imediato", riscos: [{ texto: "O município já tem saldo parado", precisa: "c28-prestacao" }, { texto: "Recado a quem cumpre as regras" }],
        custoPct: 1.6, aliado: "nelson", efeitos: { attrs: { popularidade: 4, rede: 3, competencia: -2 }, rel: { nelson: 10, guardiao: -6, lucia: -4 }, favor: { nelson: 6 }, dependencia: 4 },
        depois: [dep(2, { pub: { sustentabilidade: -3, acesso: -1 }, attrs: { confianca: -3 }, evidencias: 1 }, "O dinheiro que não aparece", "Pedra Alta recebeu e não prestou contas outra vez. Outros municípios perguntam por que precisam cumprir.", "A condicionalidade foi ignorada.", "ruim")],
        narracao: "Nelson telefona para agradecer. A pasta da Controladoria, para perguntar." }),
      o4({ id: "repasse-contrapartida", rotulo: "Liberar em troca de uma “contrapartida” do prefeito", kind: "desvio", resumo: "Liberar o repasse sem regularizar e receber um percentual por fora.",
        custo: m(1.6), prazo: "Imediato", ganho: ganhoIlicito, riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Conselho inativo e saldo parado: o dinheiro some sem rastro", precisa: "c28-prestacao" }],
        custoPct: 1.6, desvio: desvioTxt("Receber “contrapartida” do prefeito"), aliado: "nelson",
        efeitos: { dependencia: 12, influencia: 5, evidencias: 3, rel: { nelson: 8, guardiao: -8, lucia: -6 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [dep(2, { evidencias: 2, pub: { acesso: -2 }, attrs: { confianca: -4 } }, "O fundo sem dono", "O Tribunal abriu um processo sobre os recursos de Pedra Alta e perguntou quem autorizou a liberação sem contas.", "Repasse sem regra e com favorecimento.", "ruim")],
        narracao: "Tudo muito rápido e muito amigável. O tipo de pressa que costuma custar caro depois." }),
    ],
  },

  /* ───────── D29 — parceria para gerir um hospital ───────── */
  {
    id: "d29", caso: 29, mesa: D, titulo: "Quem vai gerir o Hospital de Vale Azul", conceito: "parceria-gestao", basePct: 4, gestoPadrao: "assinar",
    papelAssinado: "EDITAL / CONTRATO DE GESTÃO — HOSPITAL REGIONAL DE VALE AZUL — documento fictício",
    pergunta: "O Governador quer o Hospital de Vale Azul funcionando já. O Instituto Vida Plena propõe gerir a unidade, mas as metas são fracas e os vínculos, estreitos. Como proceder?",
    opcoes: [
      o4({ id: "os-chamamento", rotulo: "Chamamento público com metas de qualidade e comissão fiscalizadora independente", kind: "competente", resumo: "Abrir seleção pública, exigir metas de mortalidade, espera e satisfação, e criar fiscalização externa.",
        requer: { achado: "f29-metas", dica: "Compare a proposta do Instituto com o custo e os indicadores da gestão direta comparável." },
        custo: m(1.8), prazo: "4 meses até o contrato; abertura em 7", economiaPct: 6, ganho: () => "Hospital aberto com metas de qualidade e acesso, e fiscalização",
        riscos: [{ texto: "Demora mais que aceitar a proposta pronta" }, { texto: "Metas exigem um sistema de monitoramento", precisa: "c29-comparativo" }, { texto: "O Instituto pode participar e ganhar — ou não" }],
        custoPct: 1.8, aplica: ["medir-antes", "controle-interno", "transparencia"],
        efeitos: { attrs: { competencia: 6, confianca: 3, persuasao: 1 }, pub: { qualidade: 4, acesso: 4, sustentabilidade: 2 }, filaMin: -4, rel: { bento: 8, ana: 4, teodoro: 3, valdemar: -5 } },
        depois: [dep(2, { pub: { acesso: 4, qualidade: 3 }, filaMin: -6, caixaPct: 0.3, attrs: { confianca: 3 } }, "Hospital aberto, contas abertas", "A parceria começou com metas de qualidade, painel público e comissão externa. A espera por cirurgia caiu e os números são consultáveis.", "A parceria foi escolhida por mérito e fiscalizada por terceiros.", "bom")],
        narracao: "Bento revisa as metas em voz alta. Valdemar reclama do prazo. Teodoro ri: “Pelo menos vai caber no jornal.”" }),
      o4({ id: "os-adiar", rotulo: "Manter a gestão direta e reforçar o hospital com contratações pontuais", kind: "prudente", resumo: "Não terceirizar agora; reorganizar a equipe e abrir só os serviços mais urgentes.",
        custo: m(1.2), prazo: "3 meses para os primeiros serviços", riscos: [{ texto: "Abertura parcial: nem tudo funciona" }, { texto: "A pressão do Governador continua" }],
        custoPct: 1.2, aplica: ["controle-interno"], efeitos: { attrs: { competencia: 3 }, pub: { acesso: 2, equipe: -1 }, filaMin: -2, rel: { bento: 3, teodoro: -2 } },
        narracao: "O hospital abre aos poucos, com a equipe que a Secretaria tem. Não é glamouroso, mas é verificável." }),
      o4({ id: "os-indicada", rotulo: "Contratar o Instituto Vida Plena como propôs", kind: "comodo", resumo: "Aceitar metas, valores e fiscalização da própria proposta.",
        custo: m(2.2), prazo: "Imediato", riscos: [{ texto: "Custo 18% acima da gestão direta", precisa: "c29-comparativo" }, { texto: "Metas só de volume: qualidade sem garantia" }, { texto: "Vínculos do dirigente com o Governo", precisa: "c29-vinculos" }],
        custoPct: 2.2, aliado: "valdemar", conquista: "n4-captura-da-os",
        efeitos: { attrs: { popularidade: 4, rede: 3, competencia: -2 }, pub: { acesso: 2 }, rel: { valdemar: 8, teodoro: 3, bento: -6, ana: -4 }, favor: { valdemar: 4 }, dependencia: 4 },
        depois: [dep(2, { pub: { qualidade: -4, sustentabilidade: -3 }, caixaPct: -0.5, attrs: { confianca: -4 }, evidencias: 1 }, "Muitas cirurgias, pouca qualidade", "O hospital cumpriu a meta de volume, mas a mortalidade subiu e a empresa de manutenção do irmão apareceu nas notas.", "Metas fracas, fiscalização do próprio parceiro e vínculo não declarado.", "ruim")],
        narracao: "O Instituto cumpre as metas que escreveu. Nenhuma delas é sobre o paciente." }),
      o4({ id: "os-participacao", rotulo: "Contratar o Instituto e receber uma “participação” no contrato", kind: "desvio", resumo: "Fechar com a organização indicada e combinar um percentual por fora.",
        custo: m(2.2), prazo: "Imediato", ganho: ganhoIlicito, riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Captura da parceria por quem a executa e a fiscaliza", precisa: "c29-vinculos" }],
        custoPct: 2.2, desvio: desvioTxt("Receber “participação” do Instituto"), aliado: "valdemar",
        efeitos: { dependencia: 14, influencia: 6, evidencias: 3, rel: { valdemar: 8, bento: -8, ana: -6 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [dep(2, { evidencias: 2, pub: { qualidade: -4 }, attrs: { confianca: -4 } }, "Parceria sob suspeita", "A comissão externa que não existia fez falta: as notas da subcontratada foram parar na Controladoria.", "Contrato sem seleção pública e com favorecimento.", "ruim")],
        narracao: "Tudo muito bem escrito. Só falta alguém de fora para ler." }),
    ],
  },

  /* ───────── D30 — Tribunal de Contas e Assembleia ───────── */
  {
    id: "d30", caso: 30, mesa: D, titulo: "Resposta ao Tribunal e à Assembleia", conceito: "controle-externo", basePct: 0, gestoPadrao: "parecer",
    papelAssinado: "RELATÓRIO DE GESTÃO E RESPOSTA AO TRIBUNAL DE CONTAS — documento fictício",
    pergunta: "O Tribunal de Contas notificou a Secretaria e a Assembleia convocou uma sessão pública. É a hora de prestar contas do mandato. Como responder?",
    opcoes: [
      o4({ id: "contas-completas", rotulo: "Responder ponto a ponto com documentos, corrigir o que falhou e publicar o relatório", kind: "competente", gesto: "parecer", resumo: "Dizer o que foi feito, mostrar a prova, assumir o que falta e abrir o relatório à população.",
        requer: { achado: "f30-resposta", dica: "Confronte os apontamentos do Tribunal com o relatório de gestão e seus anexos." },
        custo: () => "R$ 0", prazo: "15 dias", ganho: () => "Confiança de quem fiscaliza e de quem acompanha",
        riscos: [{ texto: "Expõe falhas diante da Assembleia" }, { texto: "Dá trabalho documentar tudo no prazo", precisa: "c30-notificacao" }],
        custoPct: 0, aplica: ["transparencia", "controle-interno"], conquista: "n4-contas-ao-tribunal",
        efeitos: { attrs: { confianca: 8, competencia: 3, popularidade: 1 }, pub: { qualidade: 2, sustentabilidade: 3, acesso: 1 }, rel: { iara: 8, celia: 6, teodoro: 4 } },
        narracao: "A Conselheira Iara lê a resposta de ponta a ponta e anota um “recebido, com louvor”. Dona Célia, na galeria, aplaude baixinho." }),
      o4({ id: "contas-estrito", rotulo: "Responder só o que foi perguntado, dentro do prazo", kind: "prudente", gesto: "parecer", resumo: "Cumprir a notificação sem apresentar o balanço completo à Assembleia.",
        custo: () => "R$ 0", prazo: "15 dias", riscos: [{ texto: "A Assembleia fica sem a visão do conjunto" }],
        custoPct: 0, aplica: ["transparencia"], efeitos: { attrs: { confianca: 2, competencia: 2 }, pub: { sustentabilidade: 1 }, rel: { iara: 3, celia: -1 } },
        narracao: "A resposta é correta e seca. A Assembleia perguntou mais do que o Tribunal; ninguém explicou a diferença." }),
      o4({ id: "contas-prorrogar", rotulo: "Pedir prorrogação e deixar a assessoria jurídica responder", kind: "comodo", gesto: "assinar", resumo: "Ganhar tempo e transferir a explicação para terceiros.",
        custo: () => "R$ 0", prazo: "30 a 45 dias", riscos: [{ texto: "Prazo estendido vira desconfiança" }, { texto: "Quem responde não é quem decidiu" }],
        custoPct: 0, efeitos: { attrs: { confianca: -3, competencia: -1, popularidade: 1 }, rel: { iara: -3, celia: -3 } },
        ajustes: [{ se: (s) => s.personal.evidencias > 0 || s.personal.desviado > 0, efeitos: { attrs: { confianca: -6 } }, nota: "Os registros acumulados apareceram nas perguntas da Assembleia: a confiança caiu." }],
        narracao: "A assessoria responde com doze páginas de ressalvas. A Conselheira devolve com duas perguntas." }),
      o4({ id: "contas-atacar", rotulo: "Atacar o Tribunal na imprensa e minimizar os apontamentos", kind: "fraco", gesto: "assinar", resumo: "Dizer que a auditoria é política e que não há o que explicar.",
        custo: () => "R$ 0", prazo: "Imediato", riscos: [{ texto: "Desgaste com quem fiscaliza" }, { texto: "Os documentos continuam existindo" }],
        custoPct: 0, efeitos: { attrs: { confianca: -6, competencia: -3, popularidade: 2 }, rel: { iara: -8, celia: -4, teodoro: -3 } },
        narracao: "A manchete é ruidosa. A resposta ao Tribunal, continua pendente." }),
    ],
  },
];

/* ───────────────────────────── Casos ───────────────────────────── */

const casos: CaseDef[] = [
  { id: "caso25", caso: 25, titulo: "Para onde vão os 300 leitos", episodio: "Episódio 1", location: "gabinete-estadual", pistas: ["c25-leitos", "c25-viagens", "c25-pedido"], conversas: ["n4-teodoro-abertura", "n4-rita-regioes", "n4-cornelio-leitos"], decisao: "d25",
    chamada: "Você virou Secretário(a) Estadual de Saúde. O estado ganhou 300 leitos novos e quase todos os deputados querem um pedaço do mapa.",
    objetivo: "Compare os leitos por região, o deslocamento de pacientes e os pedidos antes de escolher o critério.", dica: "Dica do Professor Bento: leito novo se distribui pela necessidade medida e pelo deslocamento evitado — não pela voz mais alta." },
  { id: "caso26", caso: 26, titulo: "O hospital com a obra parada", episodio: "Episódio 2", location: "canteiro", pistas: ["c26-medicao", "c26-laudo", "c26-contrato"], conversas: ["n4-leandro-obra", "n4-roberto-medicao", "n4-valdemar-rescisao"], decisao: "d26",
    chamada: "O Hospital Estadual está em 62% e o contrato vence em 30 dias. A empreiteira quer mais prazo; alguns pedem para rescindir de uma vez.",
    objetivo: "Compare a medição com os pagamentos e o laudo do fiscal antes de decidir o destino do contrato.", dica: "Dica do Professor Bento: obra parada não se resolve com firmeza nem com paciência — resolve-se com medição. Primeiro, o que existe." },
  { id: "caso27", caso: 27, titulo: "Planilha, aditivo e matriz de riscos", episodio: "Episódio 3", location: "gabinete-estadual", pistas: ["c27-planilha", "c27-referencia", "c27-aditivo"], conversas: ["n4-leandro-planilha", "n4-ana-matriz", "n4-toninho-aditivo"], decisao: "d27",
    chamada: "A licitação do Bloco B tem preços altos e uma única proponente, e a construtora quer um aditivo de 25% na obra em andamento.",
    objetivo: "Compare a planilha com os preços de referência e examine o pedido de aditivo.", dica: "Dica do Professor Bento: o teto legal do aditivo não é um direito. Preço, projeto e risco precisam estar escritos antes de a obra começar." },
  { id: "caso28", caso: 28, titulo: "O repasse e o município sem contas", episodio: "Episódio 4", location: "painel-regioes", pistas: ["c28-criterios", "c28-prestacao", "c28-pedido"], conversas: ["n4-lucia-repasse", "n4-nelson-liberar", "n4-guardiao-repasse"], decisao: "d28",
    chamada: "Pedra Alta pede o repasse mensal do fundo, mas está há dois quadrimestres sem prestar contas. O pedido vem com padrinhos.",
    objetivo: "Compare os critérios do repasse com a situação de contas do município.", dica: "Dica do Professor Bento: transferência fundo a fundo é direito do município e dever de prestar contas. As duas coisas andam juntas." },
  { id: "caso29", caso: 29, titulo: "Quem vai gerir o Hospital de Vale Azul", episodio: "Episódio 5", location: "gabinete-estadual", pistas: ["c29-proposta", "c29-comparativo", "c29-vinculos"], conversas: ["n4-valdemar-os", "n4-teodoro-os", "n4-bento-metas"], decisao: "d29",
    chamada: "O Instituto Vida Plena oferece gerir o hospital regional. A pressa do Governo é grande; as metas da proposta, pequenas.",
    objetivo: "Compare a proposta com o custo e os indicadores da gestão direta e veja quem está por trás do Instituto.", dica: "Dica do Professor Bento: parceria boa tem meta que importa, fiscalização de fora e seleção pública. Sem isso, o parceiro vira dono." },
  { id: "caso30", caso: 30, titulo: "Resposta ao Tribunal e à Assembleia", episodio: "Episódio 6", location: "tribunal", pistas: ["c30-notificacao", "c30-relatorio", "c30-convocacao"], conversas: ["n4-iara-resposta", "n4-celia-assembleia", "n4-teodoro-final"], decisao: "d30",
    chamada: "O Tribunal de Contas notificou a Secretaria e a Assembleia convocou uma sessão pública. É o encerramento do seu mandato como Secretário(a) Estadual.",
    objetivo: "Confronte a notificação com o relatório de gestão e escolha como prestar contas.", dica: "Dica do Professor Bento: prestar contas ao controle externo é responder, corrigir e mostrar. Quem esconde, perde a confiança; quem mostra, ganha crédito." },
];

/* ───────────────────────────── Conceitos e conquistas ───────────────────────────── */

const L8080 = "https://www.planalto.gov.br/ccivil_03/leis/l8080.htm";
const L8142 = "https://www.planalto.gov.br/ccivil_03/leis/l8142.htm";
const L9637 = "https://www.planalto.gov.br/ccivil_03/leis/l9637.htm";
const L14133 = "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm";
const CF = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm";

const conceitos: Partial<Record<"equidade-regional" | "obra-parada" | "sobrepreco-obra" | "fundo-a-fundo" | "parceria-gestao" | "controle-externo", Concept>> = {
  "equidade-regional": {
    id: "equidade-regional", titulo: "Equidade: dar mais a quem tem menos", tema: "Regionalização e equidade", dificuldade: 2,
    texto: "Distribuir igualmente não é distribuir com justiça: regiões com menos serviços e mais deslocamento precisam de mais. Um critério público (população, carência, distância) torna a escolha explicável e reduz a pressão política.",
    aplicacao: "Na vida real: ao dividir recursos no condomínio, na escola ou na associação, escreva o critério antes de ouvir os pedidos e mostre a conta a todos.",
    fonte: { rotulo: "Lei 8.080/1990 (princípios do SUS: universalidade, equidade e integralidade)", url: L8080, classificacao: "oficial" },
  },
  "obra-parada": {
    id: "obra-parada", titulo: "Obra parada: meça antes de decidir", tema: "Obras públicas", dificuldade: 2,
    texto: "Diante de uma obra parada, as saídas são retomar, rescindir ou reprogramar. Nenhuma é certa sem medir o que foi realmente executado e comparar com o que foi pago. O pagamento deve acompanhar a obra, e a medição independente é o que evita pagar duas vezes pelo mesmo trecho.",
    aplicacao: "Na vida real: numa reforma em casa, só pague a etapa depois de ver o que foi feito, e compare o que foi pago com o que está de pé.",
    fonte: { rotulo: "Lei 14.133/2021 (execução, fiscalização e extinção dos contratos)", url: L14133, classificacao: "oficial" },
  },
  "sobrepreco-obra": {
    id: "sobrepreco-obra", titulo: "Sobrepreço, aditivo e matriz de riscos", tema: "Licitações e contratos de obras", dificuldade: 3,
    texto: "Em obra grande, compare cada item da planilha com preços de referência, escreva quem assume cada risco (matriz de riscos) e só aceite aditivo com projeto, quantitativo e parecer técnico. O limite legal de acréscimo é teto, e não direito.",
    aplicacao: "Na vida real: peça três orçamentos item a item, defina por escrito quem paga os imprevistos e desconfie de “serviço extra” sem detalhe.",
    fonte: { rotulo: "Lei 14.133/2021 (licitações e contratos: matriz de riscos, acréscimos e supressões)", url: L14133, classificacao: "oficial" },
  },
  "fundo-a-fundo": {
    id: "fundo-a-fundo", titulo: "Fundo a fundo: critério, condição e contas", tema: "Transferências e federalismo", dificuldade: 2,
    texto: "Os recursos de saúde podem ser repassados do fundo estadual ao fundo municipal por critérios públicos. A transferência pressupõe conselho de saúde ativo e relatórios em dia. Condicionar a liberação à regularização, com apoio técnico, protege o dinheiro e a população.",
    aplicacao: "Na vida real: ao ajudar um parente ou uma entidade, combine condições claras e acompanhe o uso do que foi dado.",
    fonte: { rotulo: "Lei 8.142/1990 e LC 141/2012 (transferências, conselhos de saúde e prestação de contas)", url: L8142, classificacao: "oficial" },
  },
  "parceria-gestao": {
    id: "parceria-gestao", titulo: "Parceria na gestão: metas que importam", tema: "Parcerias e contratos de gestão", dificuldade: 3,
    texto: "Uma organização social ou parceria pode gerir uma unidade de saúde, mas só funciona com seleção pública, metas de qualidade e acesso, fiscalização independente e regras contra conflito de interesses. Sem isso, o risco é a captura: o parceiro passa a servir a si mesmo.",
    aplicacao: "Na vida real: ao contratar um serviço, defina o que será medido, quem confere e o que acontece se a meta não for cumprida.",
    fonte: { rotulo: "Lei 9.637/1998 (organizações sociais)", url: L9637, classificacao: "oficial" },
  },
  "controle-externo": {
    id: "controle-externo", titulo: "Controle externo: responder, corrigir e prestar contas", tema: "Controle e prestação de contas", dificuldade: 3,
    texto: "O Legislativo, com o auxílio do Tribunal de Contas, fiscaliza a gestão. Responder no prazo, com documentos, assumir o que falhou e mostrar o que foi corrigido constrói credibilidade. Esconder ou atacar o controle só aumenta a desconfiança.",
    aplicacao: "Na vida real: ao ser questionado por quem fiscaliza (família, condomínio, chefe), responda com fatos e documentos, admita o erro e diga o que vai mudar.",
    fonte: { rotulo: "Constituição Federal (controle externo exercido pelo Legislativo com o auxílio do Tribunal de Contas)", url: CF, classificacao: "oficial" },
  },
};

const conquistas: AchievementDef[] = [
  { id: "n4-leitos-onde-faltam", nome: "Leitos Onde Faltam", descricao: "Distribuiu os leitos por critério público de necessidade, não por pressão política.", trilha: "gestao", icone: "🛏️" },
  { id: "n4-obra-medida", nome: "Obra Medida, Obra Retomada", descricao: "Mediu o executado, glosou o pago a mais e retomou a obra com fiscalização.", trilha: "gestao", icone: "📏" },
  { id: "n4-planilha-refeita", nome: "Planilha Refeita", descricao: "Refez a planilha com preço de referência e matriz de riscos, em vez de aceitar sobrepreço.", trilha: "gestao", icone: "🧮" },
  { id: "n4-contas-ao-tribunal", nome: "Contas ao Tribunal", descricao: "Prestou contas com condição, documento e transparência (repasse ou resposta ao controle externo).", trilha: "gestao", icone: "⚖️" },
  { id: "n4-aditivo-de-estimacao", nome: "Aditivo de Estimação", descricao: "Tratou o teto legal do aditivo como direito da empreiteira.", trilha: "satira", icone: "🐕" },
  { id: "n4-captura-da-os", nome: "Parceria Capturada", descricao: "Entregou um hospital a um parceiro com metas feitas pelo próprio parceiro.", trilha: "satira", icone: "🎣" },
];

export const N4: LevelContent = { locais, pistas, achados, conversas, negociacoes: [], decisoes, casos, conceitos, conquistas };
