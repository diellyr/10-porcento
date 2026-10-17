import type { AchievementDef, CaseDef, ClueDef, Concept, ConversationDef, DecisionDef, FindingDef, OptionDef } from "../types";
import type { ConceptId } from "../../engine/types";
import { DEV, m, opt as optBase, type O } from "../cases-n2";
import { talk } from "../conversations-n2";
import type { LevelContent, LocSpec } from "./tipos";

/**
 * Nível 5 — Diretor(a) de Órgão Federal (casos 31–36).
 * Cenário fictício: Agência Federal de Programas de Saúde. Indicador "fila" = atraso médio dos repasses, em DIAS (início: 45).
 * Valores em % do orçamento (estimado) da Agência no cenário. Personagens, órgãos, municípios e valores são fictícios.
 */

/** `opt` do Nível 2 + conquista liberada ao escolher a opção. */
const opt = (o: O & { conquista?: string }): OptionDef => ({ ...optBase(o), conquista: o.conquista });

const SIM = { rotulo: "Documento do cenário (valores simulados)", classificacao: "simulado" as const };
const EST = { rotulo: "Parâmetro do cenário (estimativa didática)", classificacao: "estimativa" as const };

const CF = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm";
const LRF = "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm";
const L14133 = "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm";
const L8142 = "https://www.planalto.gov.br/ccivil_03/leis/l8142.htm";
const L8443 = "https://www.planalto.gov.br/ccivil_03/leis/l8443.htm";

/* ═════════════════════════ Locais ═════════════════════════ */

const LOCAIS: LocSpec[] = [
  {
    id: "diretoria", nome: "Diretoria da Agência", curto: "Diretoria", tema: "gabinete", mesa: true,
    descricao: "O gabinete da Agência Federal de Programas de Saúde: uma mesa grande, um mapa do país na parede e uma pilha de portarias esperando assinatura.",
    pessoas: [
      { id: "cecilia", char: "cecilia", falas: [[31, "n5-cecilia-abertura", "Falar com Cecília Moura"]] },
      { id: "teodoro", char: "teodoro", falas: [[32, "n5-teodoro-atrasos", "Falar com o Governador Teodoro"]] },
      { id: "guardiao", char: "guardiao", falas: [[32, "n5-guardiao-fluxo", "Falar com o Guardião"]] },
      { id: "lucia", char: "lucia", falas: [[33, "n5-lucia-convenio", "Falar com a Prefeita Lúcia"]] },
    ],
    itens: [
      { id: "pasta", icone: "🗂️", onde: "mesa", pistas: [[31, "c31-minuta", "Pasta: minuta do programa"], [33, "c33-plano", "Pasta: plano de trabalho do convênio"], [35, "c35-relatorio", "Pasta: relatório da consultoria"]] },
      { id: "quadro", icone: "📋", onde: "parede", pistas: [[32, "c32-criterios", "Quadro: proposta de critérios de repasse"], [36, "c36-defesa", "Quadro: defesa do ex-gestor"]] },
    ],
    portas: ["sala-programas", "comissao-congresso", "controladoria", "almoxarifado-nacional"],
  },
  {
    id: "sala-programas", nome: "Sala de Programas e Monitoramento", curto: "Programas", tema: "dados",
    descricao: "Telões com painéis de indicadores, planilhas de repasses e equipes que acompanham, município por município, o que cada programa entrega.",
    pessoas: [
      { id: "bento", char: "bento", falas: [[31, "n5-bento-linhabase", "Falar com o Professor Bento"], [35, "n5-bento-avaliacao", "Falar com o Professor Bento"]] },
      { id: "cecilia", char: "cecilia", falas: [[32, "n5-cecilia-criterios", "Falar com Cecília Moura"]] },
      { id: "valdemar", char: "valdemar", falas: [[33, "n5-valdemar-flexibilizar", "Falar com o Doutor Valdemar"]] },
      { id: "ana", char: "ana", falas: [[35, "n5-ana-indicadores", "Falar com Ana"]] },
    ],
    itens: [
      { id: "painel", icone: "📺", onde: "parede", pistas: [[31, "c31-diagnostico", "Painel: diagnóstico da saúde da mulher"], [32, "c32-atrasos", "Painel: atraso dos repasses"], [35, "c35-indicadores", "Painel: metas e resultados do programa"]] },
      { id: "planilha", icone: "💻", onde: "mesa", pistas: [[33, "c33-execucao", "Planilha: execução física e financeira"], [34, "c34-escala", "Planilha: simulação de compra nacional"], [36, "c36-extrato", "Planilha: extrato da conta do convênio"]] },
    ],
    portas: ["diretoria", "controladoria"],
  },
  {
    id: "comissao-congresso", nome: "Comissão de Saúde do Congresso", curto: "Comissão", tema: "plenario",
    descricao: "Bancadas de madeira, microfones demais e muita gente com pressa de aparecer na foto. É aqui que o orçamento da saúde vira discurso.",
    pessoas: [
      { id: "ramiro", char: "ramiro", falas: [[31, "n5-ramiro-nome", "Falar com o Senador Ramiro"], [35, "n5-ramiro-manchete", "Falar com o Senador Ramiro"]] },
      { id: "cornelio", char: "cornelio", falas: [[32, "n5-cornelio-parcela", "Falar com o Deputado Cornélio"]] },
      { id: "celia", char: "celia", falas: [[36, "n5-celia-encerramento", "Falar com Dona Célia"]] },
    ],
    itens: [
      { id: "oficios", icone: "📄", onde: "mesa", pistas: [[31, "c31-oficio", "Ofício do Senador Ramiro"]] },
      { id: "quadro-avisos", icone: "📌", onde: "parede", pistas: [[32, "c32-pedido", "Bilhete do Deputado Cornélio"]] },
    ],
    portas: ["diretoria"],
  },
  {
    id: "controladoria", nome: "Controladoria — sala de auditoria", curto: "Controladoria", tema: "reuniao",
    descricao: "Mesa redonda, caixas de arquivo com etiquetas e um auditor que lê nota fiscal como quem lê romance policial.",
    pessoas: [
      { id: "pedro", char: "pedro", falas: [[33, "n5-pedro-prestacao", "Falar com Pedro Salgado"], [36, "n5-pedro-tce", "Falar com Pedro Salgado"]] },
      { id: "iara", char: "iara", falas: [[36, "n5-iara-contraditorio", "Falar com a Conselheira Iara"]] },
    ],
    itens: [
      { id: "dossie", icone: "🗂️", onde: "mesa", pistas: [[33, "c33-pendencias", "Dossiê: pendências da prestação"], [35, "c35-campo", "Dossiê: relatório de campo"]] },
      { id: "quadro-processos", icone: "📋", onde: "parede", pistas: [[36, "c36-convenio", "Quadro: termo do convênio e saldo"]] },
    ],
    portas: ["diretoria", "sala-programas"],
  },
  {
    id: "almoxarifado-nacional", nome: "Almoxarifado Nacional de Insumos", curto: "Almoxarifado", tema: "hospital",
    descricao: "Prateleiras até o teto, câmaras frias zumbindo e etiquetas de validade por todo lado. Aqui a política pública pesa, congela e vence.",
    pessoas: [
      { id: "roberto", char: "roberto", falas: [[34, "n5-roberto-estoque", "Falar com Roberto dos Contratos"]] },
      { id: "toninho", char: "toninho", falas: [[34, "n5-toninho-fatiar", "Falar com Toninho"]] },
      { id: "rita", char: "rita", falas: [[34, "n5-rita-demanda", "Falar com Rita Campos"]] },
      { id: "juninho", char: "juninho", falas: [[35, "n5-juninho-relatorio", "Falar com o Primo Juninho"]] },
    ],
    itens: [
      { id: "painel-estoque", icone: "📺", onde: "parede", pistas: [[34, "c34-consumo", "Painel: demanda e cobertura de estoque"]] },
      { id: "caixa-propostas", icone: "📦", onde: "mesa", pistas: [[34, "c34-propostas", "Caixa: cinco propostas regionais"]] },
    ],
    portas: ["diretoria"],
  },
];

/* ═════════════════════════ Pistas ═════════════════════════ */

const PISTAS: ClueDef[] = [
  /* ───── Caso 31 — programa de saúde da mulher ───── */
  {
    id: "c31-diagnostico", caso: 31, location: "sala-programas", titulo: "Diagnóstico da saúde da mulher por região", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "A linha de base: onde estamos hoje. Um programa que não sabe de onde parte não consegue dizer, depois, se melhorou. A mortalidade materna e a cobertura de exame preventivo variam muito entre as regiões.",
    tabela: () => [["Norte", "mortalidade materna 92 por 100 mil nascidos · preventivo 41%"], ["Nordeste", "78 por 100 mil · preventivo 48%"], ["Centro-Oeste", "61 por 100 mil · preventivo 55%"], ["Sudeste", "44 por 100 mil · preventivo 63%"], ["Sul", "39 por 100 mil · preventivo 66%"]],
  },
  {
    id: "c31-minuta", caso: 31, location: "diretoria", titulo: "Minuta do “Programa Senador Ramiro Duarte de Saúde da Mulher”", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: "A minuta tem nome solene, verba reservada e três páginas de “objetivos”. Falta o resto: para quem é o programa, que resultado se espera, em quanto tempo e como será medido. Onde deveria haver meta, há adjetivo.",
    tabela: () => [["Nome do programa", "com o nome do relator"], ["População-alvo", "não definida"], ["Linha de base", "não informada"], ["Metas e indicadores", "“melhorar a saúde da mulher”"], ["Prazo de avaliação", "não definido"]],
  },
  {
    id: "c31-oficio", caso: 31, location: "comissao-congresso", titulo: "Ofício do Senador Ramiro: lista de municípios", tipo: "opiniao", confiabilidade: "opiniao", icone: "📄", fonte: SIM,
    texto: "O relator pede que o programa leve o seu nome e que os primeiros recursos sigam para uma lista de municípios “prioritários”. Pedir é do jogo político; distribuir sem critério é o problema. A lista não cita nenhum indicador.",
    tabela: () => [["Municípios indicados", "12"], ["Na base eleitoral do senador", "9 de 12"], ["Entre os 20% mais críticos em mortalidade materna", "3 de 12"], ["Regiões Norte e Nordeste", "2 de 12"]],
  },

  /* ───── Caso 32 — repasses atrasados ───── */
  {
    id: "c32-atrasos", caso: 32, location: "sala-programas", titulo: "Painel: por que os repasses atrasam", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "O atraso médio é de 45 dias entre a liberação e a chegada do repasse. Quando se separa por causa, a surpresa é que a maior parte não está na falta de dinheiro: está no papel que volta incompleto.",
    tabela: () => [["Documentação incompleta do ente", "56% dos atrasos · média 56 dias"], ["Fila de pareceres na própria Agência", "31% · média 38 dias"], ["Limitação orçamentária e financeira", "11% · média 29 dias"], ["Outras causas", "2% · média 14 dias"]],
  },
  {
    id: "c32-criterios", caso: 32, location: "diretoria", titulo: "Minuta de portaria: repasse com critérios", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: "A equipe de Cecília propõe uma parcela fixa, mensal e previsível, mais uma parcela variável ligada a resultados (cobertura vacinal, pré-natal, plano de saúde atualizado). Falta regra de transição para os municípios pequenos, que têm menos estrutura.",
    tabela: () => [["Parcela fixa (previsível)", "70% do valor"], ["Parcela por desempenho", "30% do valor"], ["Condicionalidades", "plano de saúde, cadastro e relatório de gestão em dia"], ["Calendário de pagamento", "publicado no início do ano"], ["Regra para municípios pequenos", "ainda não definida"]],
  },
  {
    id: "c32-pedido", caso: 32, location: "comissao-congresso", titulo: "Bilhete do Deputado Cornélio", tipo: "opiniao", confiabilidade: "opiniao", icone: "📌", fonte: SIM,
    texto: "“Cecília, querida: libera primeiro a parcela do meu município, que o prefeito é meu amigo e a eleição está chegando. Depois a gente conversa sobre critério.” Escrito a lápis, num guardanapo da cafeteria da Comissão.",
  },

  /* ───── Caso 33 — convênio com prestação pendente ───── */
  {
    id: "c33-plano", caso: 33, location: "diretoria", titulo: "Plano de trabalho do convênio de Vila Aurora", tipo: "documento", confiabilidade: "confirmada", icone: "🗂️", fonte: SIM,
    texto: "O plano de trabalho é o contrato de verdade: diz o que será entregue, quando e quanto será pago em cada etapa. A segunda parcela só sai depois de comprovada a primeira.",
    tabela: () => [["Objeto", "6 unidades móveis de saúde da mulher"], ["Parcela 1", "40% · já paga"], ["Parcela 2", "30% · depende da prestação de contas da parcela 1"], ["Parcela 3", "30% · depende da conclusão do objeto"], ["Prazo de execução", "12 meses"]],
  },
  {
    id: "c33-pendencias", caso: 33, location: "controladoria", titulo: "Parecer da prestação de contas da parcela 1", tipo: "dado", confiabilidade: "confirmada", icone: "🗂️", fonte: SIM,
    texto: "O parecer não acusa ninguém: apenas conta o que tem comprovante e o que não tem. Há notas válidas, notas sem identificação do convênio e duas notas com data anterior ao início da parceria.",
    tabela: () => [["Gasto com nota fiscal válida", "62% da parcela 1"], ["Gasto sem comprovante adequado", "38% da parcela 1"], ["Notas anteriores ao convênio", "2 notas"], ["Rendimentos da conta não aplicados", "pendente"], ["Prazo para a prefeitura regularizar", "ainda não notificado"]],
  },
  {
    id: "c33-execucao", caso: 33, location: "sala-programas", titulo: "Execução física e financeira do objeto", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: "A visita técnica mostra a obra andando: o objeto avançou quase tanto quanto o dinheiro gasto. O problema parece estar mais no papel e nas datas do que no serviço, mas só o contraditório dirá.",
    tabela: () => [["Unidades móveis previstas", "6"], ["Entregues e em uso", "4"], ["Em fabricação", "2"], ["Execução física", "67%"], ["Execução financeira comprovada", "62%"]],
  },

  /* ───── Caso 34 — compra nacional ───── */
  {
    id: "c34-consumo", caso: 34, location: "almoxarifado-nacional", titulo: "Painel: demanda anual e cobertura de estoque", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "A demanda nacional é previsível: calendário de vacinação, consumo dos programas e sazonalidade. O estoque atual cobre pouco, e um processo de compra de grande escala leva meses.",
    tabela: () => [["Vacina A (rotina)", "demanda 12 mi doses/ano · estoque cobre 18 dias"], ["Vacina B (campanha)", "demanda 8 mi doses/ano · estoque cobre 31 dias"], ["Insumo de diagnóstico", "demanda 3 mi kits/ano · estoque cobre 20 dias"], ["Prazo médio de uma compra nacional", "90 dias"]],
  },
  {
    id: "c34-propostas", caso: 34, location: "almoxarifado-nacional", titulo: "Caixa: cinco propostas regionais do mesmo produto", tipo: "documento", confiabilidade: "incompleta", icone: "📦", fonte: SIM,
    texto: "Cinco processos separados, um por macrorregião, para o mesmo item, com o mesmo fornecedor líder em todos. Cada um fica abaixo do valor que exigiria o rito mais rigoroso, mas a soma é uma compra só.",
    tabela: () => [["Região 1", "preço unitário 100 (índice)"], ["Região 2", "preço unitário 104"], ["Região 3", "preço unitário 107"], ["Região 4", "preço unitário 103"], ["Região 5", "preço unitário 109"]],
  },
  {
    id: "c34-escala", caso: 34, location: "sala-programas", titulo: "Simulação: compra nacional com entrega escalonada", tipo: "dado", confiabilidade: "incompleta", icone: "💻", fonte: EST,
    texto: "Somando a demanda, o poder de compra cresce. A simulação mostra preço menor numa compra nacional única, mas só se houver planejamento: entregas escalonadas, mais de um fornecedor habilitado e estoque de segurança até o primeiro lote.",
    tabela: () => [["Preço unitário na compra nacional", "índice 82 (contra 100 a 109 nas cinco compras)"], ["Entregas", "escalonadas em 4 lotes"], ["Fornecedores habilitados", "2 (principal e reserva)"], ["Risco se houver só um fornecedor e atraso", "desabastecimento de até 6 semanas"]],
  },

  /* ───── Caso 35 — indicadores ruins ───── */
  {
    id: "c35-indicadores", caso: 35, location: "sala-programas", titulo: "Painel: metas e resultados do programa (1 ano)", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "Depois de um ano, o programa tem boas e más notícias. Só um indicador bateu a meta, e é o mais fácil de bater: o número de municípios que aderiram. Os indicadores de resultado, os que importam para a mulher, ficaram abaixo.",
    tabela: () => [["Municípios aderidos", "meta 400 · realizado 412"], ["Exame preventivo (cobertura)", "meta 60% · realizado 51%"], ["Pré-natal com 7 consultas ou mais", "meta 70% · realizado 66%"], ["Redução da mortalidade materna", "meta -10% · realizado -3%"]],
  },
  {
    id: "c35-relatorio", caso: 35, location: "diretoria", titulo: "Relatório da consultoria do Primo Juninho", tipo: "opiniao", confiabilidade: "opiniao", icone: "🗂️", fonte: SIM,
    texto: "Capa brilhante, gráfico de pizza em 3D e a frase “sucesso absoluto”. O relatório só usa dois dados: a adesão dos municípios e uma pesquisa de satisfação com os próprios gestores. Não tem linha de base, não mostra as metas e não explica nenhuma causa.",
    tabela: () => [["Indicadores usados", "adesão e satisfação dos gestores"], ["Indicadores de resultado", "nenhum"], ["Linha de base", "não apresentada"], ["Custo da consultoria", "sem licitação, “sob medida”"]],
  },
  {
    id: "c35-campo", caso: 35, location: "controladoria", titulo: "Relatório de campo da auditoria", tipo: "dado", confiabilidade: "confirmada", icone: "🗂️", fonte: SIM,
    texto: "Os auditores visitaram os municípios que ficaram abaixo da meta. A causa mais comum não é falta de vontade: é um gargalo na ponta, no tempo que o laudo do exame leva para voltar e na falta de transporte até o laboratório.",
    tabela: () => [["Municípios visitados abaixo da meta", "38"], ["Com laudo demorando mais de 45 dias", "26 de 38 (68%)"], ["Sem transporte até o laboratório", "17 de 38"], ["Com equipe treinada e meta batida", "0 de 38"]],
  },

  /* ───── Caso 36 — tomada de contas especial ───── */
  {
    id: "c36-convenio", caso: 36, location: "controladoria", titulo: "Termo do convênio antigo e situação financeira", tipo: "documento", confiabilidade: "confirmada", icone: "🗂️", fonte: SIM,
    texto: "Convênio encerrado há dois anos, com prestação de contas incompleta. A conta é simples: do que foi repassado, parte foi aplicada e comprovada, parte foi gasta sem comprovante e parte nunca foi usada.",
    tabela: () => [["Total repassado", "100%"], ["Aplicado e comprovado", "71%"], ["Aplicado sem comprovante", "14%"], ["Saldo não aplicado em conta", "15%"], ["Situação", "prestação de contas não aprovada"]],
  },
  {
    id: "c36-extrato", caso: 36, location: "sala-programas", titulo: "Extrato da conta do convênio", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: "O saldo ficou parado na conta específica por 18 meses depois do fim do prazo. Rendimentos existem e também fazem parte do que deve ser devolvido, com atualização monetária.",
    tabela: () => [["Saldo parado há 18 meses", "15% do repassado"], ["Rendimentos no período", "registrados e não devolvidos"], ["Movimentação depois do prazo", "nenhuma"]],
  },
  {
    id: "c36-defesa", caso: 36, location: "diretoria", titulo: "Defesa do ex-gestor municipal", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: "O ex-gestor alega que a administração mudou, que os arquivos se perderam na troca de equipe e que parte do gasto sem comprovante foi, sim, executada. Anexa 9 notas que estavam em outra pasta. A defesa não prova tudo, mas tampouco pode ser ignorada.",
    tabela: () => [["Notas apresentadas na defesa", "9 notas (cerca de 5% do repassado)"], ["Pede prazo para localizar o restante", "30 dias"], ["Reconhece o saldo em conta", "sim, e propõe devolver"]],
  },
];

/* ═════════════════════════ Achados ═════════════════════════ */

const ACHADOS: FindingDef[] = [
  {
    id: "f31-desenho", caso: 31, a: "c31-diagnostico", b: "c31-minuta", titulo: "Um programa sem alvo, sem linha de base e sem meta", autoPorConhecimento: ["medir-antes", "gargalo"],
    texto: "O diagnóstico mostra que a necessidade está concentrada no Norte e no Nordeste (mortalidade materna de 92 e 78 por 100 mil, contra 39 no Sul). A minuta não diz para quem é o programa nem o que ele deve mudar. Sem população-alvo, linha de base e meta, nunca se saberá se funcionou.",
  },
  {
    id: "f31-alvo", caso: 31, a: "c31-diagnostico", b: "c31-oficio", titulo: "A lista segue a base eleitoral, não a necessidade", autoPorConhecimento: ["conflito-interesses", "medir-antes"],
    texto: "Nove dos doze municípios indicados estão na base do senador, mas só três estão entre os mais críticos e apenas dois ficam nas regiões de maior mortalidade. O nome no programa é o menor problema: o grave é que o recurso seguiria o voto e não o diagnóstico.",
  },
  {
    id: "f32-causa", caso: 32, a: "c32-atrasos", b: "c32-criterios", titulo: "A maior parte do atraso nasce na documentação", autoPorConhecimento: ["gargalo", "medir-antes"],
    texto: "Mais da metade dos atrasos (56%) vem de documentação incompleta, e outro terço da fila de pareceres da própria Agência. Critérios claros, checklist único e calendário publicado atacam as duas causas ao mesmo tempo. Uma parcela fixa dá previsibilidade; a variável premia resultado.",
  },
  {
    id: "f32-fila", caso: 32, a: "c32-atrasos", b: "c32-pedido", titulo: "Furar a fila atrasa todo mundo", autoPorConhecimento: ["conflito-interesses", "controle-interno"],
    texto: "Liberar primeiro o município do amigo do deputado não tira o gargalo do lugar: apenas muda a ordem de quem espera. Os outros repasses ficam ainda mais atrasados, e o critério passa a ser a amizade, não a regularidade.",
  },
  {
    id: "f33-glosa", caso: 33, a: "c33-plano", b: "c33-pendencias", titulo: "A segunda parcela depende da primeira comprovada", autoPorConhecimento: ["controle-interno", "execucao-despesa"],
    texto: "O plano de trabalho condiciona a parcela 2 à prestação de contas da parcela 1, e 38% da parcela 1 está sem comprovante adequado. Pagar a próxima parcela agora seria pagar sobre um gasto que ainda não foi explicado.",
  },
  {
    id: "f33-fisico", caso: 33, a: "c33-pendencias", b: "c33-execucao", titulo: "O objeto avança: o problema é o papel", autoPorConhecimento: ["entrega-vs-anuncio", "controle-interno"],
    texto: "A execução física (67%) quase acompanha a financeira comprovada (62%): há serviço entregue. Assim, o caminho é notificar a prefeitura com prazo para regularizar, glosar o que não se comprovar e liberar só a parte regular, sem punir de uma vez a população atendida.",
  },
  {
    id: "f34-escala", caso: 34, a: "c34-propostas", b: "c34-escala", titulo: "Cinco compras pagam mais pelo mesmo produto", autoPorConhecimento: ["compra-compartilhada", "custo-total"],
    texto: (c) => `Nas cinco propostas regionais o preço fica entre 100 e 109; na compra nacional única, perto de 82. Para uma compra anual de ${c.money(4)}, a diferença passa de ${c.money(0.7)}. Dividir um objeto só em cinco processos é fracionamento.`,
  },
  {
    id: "f34-cobertura", caso: 34, a: "c34-consumo", b: "c34-escala", titulo: "O estoque dura 20 dias; a compra leva 90", autoPorConhecimento: ["reserva-urgencia", "gargalo"],
    texto: "A cobertura atual de 18 a 31 dias é menor que os 90 dias de uma compra nacional. Sem plano, haveria falta. A solução é planejar: entregas escalonadas, fornecedor reserva e compra emergencial limitada só para cobrir o intervalo.",
  },
  {
    id: "f35-selecao", caso: 35, a: "c35-indicadores", b: "c35-relatorio", titulo: "O relatório escolheu o único número bom", autoPorConhecimento: ["transparencia", "medir-antes"],
    texto: "Dos quatro indicadores, só a adesão de municípios bateu a meta. O relatório da consultoria usa justamente esse, mais uma pesquisa de satisfação dos próprios gestores, e esconde os três que importam: exame preventivo, pré-natal e mortalidade materna.",
  },
  {
    id: "f35-causa", caso: 35, a: "c35-indicadores", b: "c35-campo", titulo: "Há um gargalo que dá para corrigir", autoPorConhecimento: ["gargalo", "medir-antes"],
    texto: "Em 26 dos 38 municípios abaixo da meta o laudo do exame demora mais de 45 dias, e em 17 falta transporte até o laboratório. Os indicadores ruins têm causa conhecida: resolvendo laudo e transporte, o programa pode recuperar parte da meta.",
  },
  {
    id: "f36-dano", caso: 36, a: "c36-convenio", b: "c36-extrato", titulo: "O dano tem duas partes: o saldo e o que falta provar", autoPorConhecimento: ["execucao-despesa", "controle-interno"],
    texto: "O saldo de 15% parado há 18 meses deve ser devolvido com correção e rendimentos. Os 14% gastos sem comprovante só viram dano se, ouvido o responsável, continuarem sem prova. Cada parte se trata de um jeito.",
  },
  {
    id: "f36-contraditorio", caso: 36, a: "c36-convenio", b: "c36-defesa", titulo: "A defesa reduz o dano, e tem o direito de ser ouvida", autoPorConhecimento: ["transparencia", "controle-interno"],
    texto: "As 9 notas anexadas diminuem o valor sem comprovação. Cobrar tudo sem examinar a defesa seria cobrar o que já foi provado; ouvir o responsável, analisar os documentos e só então fixar o débito é o que dá solidez à cobrança.",
  },
];

/* ═════════════════════════ Conversas ═════════════════════════ */

const CONVERSAS: ConversationDef[] = [
  /* ───── Caso 31 ───── */
  talk("n5-cecilia-abertura", 31, "diretoria", "cecilia", "Seu primeiro dia na Agência", [
    ["feliz", "Bem-vindo(a) à Agência Federal de Programas de Saúde! Cecília Moura, coordenadora de programas. Aqui o dinheiro anda de Brasília até o último município, ou deveria andar."],
    ["serio", "Nosso trabalho não é mais tratar paciente nem comprar para uma unidade: é desenhar programas, repassar recursos, cobrar a prestação de contas e coordenar quem executa. Três verbos: desenhar, repassar, acompanhar."],
    ["irônico", "Seu primeiro desafio já tem plateia: um programa novo de saúde da mulher. O Senador Ramiro, relator do orçamento da saúde, quer batizá-lo com o nome dele. O programa, claro, ainda não tem meta."],
  ], [
    ["Antes do nome, quero saber qual problema o programa resolve.", ["feliz", "É a pergunta certa. O painel da sala de programas tem o diagnóstico. E o Professor Bento já está por lá, de caneta na mão."], { attrs: { competencia: 1 }, rel: { cecilia: 4 } }],
    ["Um senador relator merece atenção. Como falo com ele?", ["serio", "Com educação, dados e sem prometer o que o programa ainda não pode medir. Ele está na Comissão de Saúde, de bom humor e de pressa."], { rel: { cecilia: 2 } }],
  ], { apresentacao: "3d", auto: true }),
  talk("n5-bento-linhabase", 31, "sala-programas", "bento", "Linha de base, meta e indicador", [
    ["serio", "Vim ver como a Agência desenha programas. Resumo: todo programa responde a quatro perguntas. Para quem? De onde partimos? Aonde queremos chegar? Como vamos medir?"],
    ["irônico", "Programa sem resposta é só um nome numa portaria."],
  ], [
    ["O que seria uma boa meta aqui?", ["feliz", "Algo como: reduzir a mortalidade materna nas regiões mais críticas em tantos por cento, em tantos anos, com revisão anual. Número, prazo e responsável."], { rel: { bento: 4 }, attrs: { conhecimento: 1 } }],
    ["E se o programa só distribuir recursos?", ["serio", "Distribuir é meio, não resultado. Quem só mede quanto gastou nunca descobre se alguém ficou mais saudável."], { rel: { bento: 2 } }],
  ]),
  talk("n5-ramiro-nome", 31, "comissao-congresso", "ramiro", "O nome do programa", [
    ["feliz", "Diretor(a)! Ramiro Duarte, relator do orçamento da saúde. Fiz questão de garantir a verba do novo programa. É justo que leve meu nome, não acha?"],
    ["irônico", "E já tenho uma listinha de municípios prontos para começar. Gente séria, de confiança."],
  ], [
    ["Posso discutir o nome depois; a lista depende dos indicadores.", ["serio", "Indicadores... Tudo bem, mas lembre quem aprovou o orçamento. E que a minha lista é boa."], { attrs: { competencia: 1, persuasao: 1 }, rel: { ramiro: -3 } }],
    ["Senador, vamos batizar o programa com seu nome.", ["feliz", "Era isso que eu queria ouvir. Vai ter placa em cada unidade, claro."], { rel: { ramiro: 8 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 32 ───── */
  talk("n5-teodoro-atrasos", 32, "diretoria", "teodoro", "Os repasses que não chegam", [
    ["serio", "Diretor(a), Teodoro Lima, governador. Meu estado está esperando três repasses há mais de dois meses. A conta de luz do hospital chega, o dinheiro não."],
    ["preocupado", "Não peço favor. Peço previsibilidade: saber o dia em que o dinheiro cai, para planejar a folha."],
  ], [
    ["Vamos publicar o calendário e as condições de cada repasse.", ["feliz", "Isso eu consigo defender na Assembleia. Previsível é melhor que generoso e atrasado."], { rel: { teodoro: 6 }, attrs: { confianca: 1 } }],
    ["O que mais atrasa o seu estado?", ["serio", "Documento. Cada análise pede um papel novo, e o papel certo só aparece depois do segundo ofício."], { rel: { teodoro: 3 } }],
  ]),
  talk("n5-guardiao-fluxo", 32, "diretoria", "guardiao", "O fluxo de caixa federal", [
    ["serio", "Guardião do Cofre, agora com crachá da União. Repasse atrasado por falta de dinheiro é só uma parte. A maior parte é fluxo mal planejado: tudo é liberado no fim do ano."],
    ["irritado", "Pagar sem calendário é como abrir a torneira de uma vez e depois reclamar que a caixa-d'água secou."],
  ], [
    ["Um calendário fixo ajudaria?", ["feliz", "Ajudaria. E me permitiria planejar a tesouraria. Quem sabe quando pagar, paga em dia."], { rel: { guardiao: 4 } }],
    ["Dá para acelerar sem mudar a regra?", ["irônico", "Dá para acelerar uma vez. Para acelerar sempre, é preciso mudar a regra."], { rel: { guardiao: 2 } }],
  ]),
  talk("n5-cecilia-criterios", 32, "sala-programas", "cecilia", "Fixo e variável", [
    ["serio", "A proposta é pagar uma parcela fixa, que dá previsibilidade, e uma variável ligada a resultados: cobertura vacinal, pré-natal, plano de saúde atualizado."],
    ["preocupado", "Meu receio: municípios pequenos não têm equipe para fazer o papel. Condicionar sem apoiar pune quem mais precisa. Precisamos de regra de transição e de assistência técnica."],
  ], [
    ["Vamos incluir um piso e apoio técnico para os pequenos.", ["feliz", "Era o que faltava na minuta. Com isso, o critério deixa de ser barreira e vira trilha."], { rel: { cecilia: 6 }, attrs: { competencia: 1 } }],
    ["Por que não pagar tudo igual, sem condição?", ["serio", "Porque repasse sem condição não gera informação nem responsabilidade. Paga-se, mas ninguém sabe se serviu."], { rel: { cecilia: 2 } }],
  ]),
  talk("n5-cornelio-parcela", 32, "comissao-congresso", "cornelio", "Um pedido de amigo", [
    ["feliz", "Diretor(a)! Deputado Cornélio. Só uma gentileza: a parcela do município do meu amigo prefeito, que saia primeiro. Eleição não espera."],
    ["irônico", "Depois a gente conversa sobre esse negócio de critério."],
  ], [
    ["Vou colocar o município no calendário geral.", ["serio", "Calendário geral... Entendi. Quem não é visto, não é lembrado."], { rel: { cornelio: -4 }, attrs: { competencia: 1 } }],
    ["Vou ver o que posso fazer pelo seu amigo.", ["feliz", "Sabia que o senhor era um parceiro."], { rel: { cornelio: 8 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 33 ───── */
  talk("n5-lucia-convenio", 33, "diretoria", "lucia", "A prefeita de Vila Aurora", [
    ["serio", "Diretor(a), Lúcia Andrade, agora prefeita de Vila Aurora. Meu antecessor deixou o convênio das unidades móveis com a prestação de contas pela metade. Preciso da segunda parcela para terminar as unidades."],
    ["preocupado", "Sei que o papel está atrasado. Peço prazo para organizar, não perdão."],
  ], [
    ["Posso dar prazo para regularizar e liberar o que estiver regular.", ["feliz", "É justo. Em trinta dias eu entrego o que falta, com nota e identificação."], { rel: { lucia: 6 }, attrs: { confianca: 1 } }],
    ["Preciso suspender tudo até a prestação fechar.", ["serio", "Entendo a regra. Só lembre que quem espera é a mulher que precisa da unidade móvel."], { rel: { lucia: -2 } }],
  ]),
  talk("n5-pedro-prestacao", 33, "controladoria", "pedro", "O parecer", [
    ["serio", "Pedro Salgado, auditor da Controladoria. Meu parecer é seco: de cada R$ 100 da primeira parcela, R$ 62 têm nota válida. R$ 38 não."],
    ["neutro", "Isso não prova desvio. Prova que a prestação está incompleta. O caminho é notificar, dar prazo, analisar a resposta e glosar o que não se comprovar."],
  ], [
    ["O que é glosar?", ["serio", "É não aceitar uma despesa na prestação de contas porque falta prova ou ela é irregular. O valor glosado precisa ser devolvido ou comprovado de outra forma."], { rel: { pedro: 4 }, attrs: { conhecimento: 1 } }],
    ["Dá para liberar a parcela e regularizar depois?", ["irônico", "Dá. Depois a gente descobre se o depois chegou. Em geral, não chega."], { rel: { pedro: 2 } }],
  ]),
  talk("n5-valdemar-flexibilizar", 33, "sala-programas", "valdemar", "Flexibilizar por interpretação", [
    ["feliz", "Diretor(a)! Valdemar. A segunda parcela está parada por um detalhe formal. Eu sempre digo: a norma é para ser interpretada com generosidade."],
    ["irônico", "Libera, aceita as notas como estão e deixa o resto para a próxima gestão. Ninguém lê a prestação de contas mesmo."],
  ], [
    ["O plano de trabalho condiciona a parcela. Isso é regra.", ["serio", "Regra... Regras têm exceções. Principalmente as dos outros."], { attrs: { competencia: 1 }, rel: { valdemar: -4 } }],
    ["Se ninguém lê, vamos liberar.", ["feliz", "Esse é o espírito! Eu cuido da papelada."], { rel: { valdemar: 6 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 34 ───── */
  talk("n5-roberto-estoque", 34, "almoxarifado-nacional", "roberto", "O estoque nacional", [
    ["serio", "Roberto dos Contratos, agora no Almoxarifado Nacional. Escala diferente, problema igual: o estoque de vacina dura 18 dias e a compra leva 90. A conta não fecha sem planejamento."],
    ["preocupado", "Se a gente atrasar, falta vacina em município. E falta vacina não é número, é criança sem proteção."],
  ], [
    ["Como evitar o buraco entre o estoque e o primeiro lote?", ["serio", "Compra emergencial pequena e limitada para cobrir o intervalo, e a compra grande já com entregas escalonadas e fornecedor reserva."], { rel: { roberto: 4 }, attrs: { competencia: 1 } }],
    ["Dá para comprar tudo de um fornecedor só?", ["irônico", "Dá. E, se ele atrasar, dá para esperar sentado. Concentrar é barato até o dia em que falha."], { rel: { roberto: 2 } }],
  ]),
  talk("n5-toninho-fatiar", 34, "almoxarifado-nacional", "toninho", "Cinco compras é mais rápido", [
    ["feliz", "Chefe! Toninho do Gabinete, agora no federal. Fiz cinco propostas por região. Cada uma é pequenininha e passa batido. Todas do mesmo fornecedor, de confiança."],
    ["irônico", "O fornecedor até deixou uma taxa de agilidade para quem ajudar. Eu não aceito, evidentemente. Só comento."],
  ], [
    ["É a mesma compra dividida em cinco. Isso é fracionar.", ["serio", "Fracionar é palavra feia. Eu chamo de regionalizar."], { attrs: { competencia: 1 }, rel: { toninho: -4 } }],
    ["Se o fornecedor é de confiança, vamos adiante.", ["feliz", "Sabia que o senhor é gente fina!"], { rel: { toninho: 6 }, attrs: { caraDePau: 2 } }],
  ]),
  talk("n5-rita-demanda", 34, "almoxarifado-nacional", "rita", "A demanda dos estados", [
    ["serio", "Rita Campos, agora olhando a regulação nacional. Reuni os pedidos de todos os estados: a demanda é muito previsível, ano após ano, com picos nas campanhas."],
    ["feliz", "Se a Agência comprar por escala, os estados deixam de disputar entre si e o preço cai. Mas precisa de calendário de entrega por região."],
  ], [
    ["Quanto antes os estados mandarem a demanda, melhor?", ["feliz", "Muito melhor. Quem sabe quanto vai precisar compra certo. Quem improvisa, compra caro."], { rel: { rita: 4 } }],
    ["E se algum estado pedir mais do que usa?", ["irônico", "Aí o sistema registra o consumo real. Estoque sobrando também é prejuízo: vence na prateleira."], { rel: { rita: 2 } }],
  ]),

  /* ───── Caso 35 ───── */
  talk("n5-bento-avaliacao", 35, "sala-programas", "bento", "Monitorar não é enfeitar", [
    ["serio", "Um ano de programa. Monitorar é acompanhar enquanto acontece; avaliar é perguntar se mudou o que devia mudar. As duas coisas servem a uma terceira: corrigir a rota."],
    ["irônico", "Relatório que só traz boa notícia não monitora nada: decora."],
  ], [
    ["Como corrigir sem desanimar a equipe?", ["feliz", "Mostrando a causa. Quando a equipe vê que o problema é laudo e transporte, e não incompetência, a correção vira tarefa, não castigo."], { rel: { bento: 4 }, attrs: { confianca: 1 } }],
    ["E se o resultado ficar abaixo da meta?", ["serio", "Publique, explique e ajuste. Meta revista com motivo é gestão; meta escondida é problema que volta."], { rel: { bento: 2 } }],
  ]),
  talk("n5-ana-indicadores", 35, "sala-programas", "ana", "O que dizem os números", [
    ["serio", "Ana, da Controladoria, acompanhando o programa. Reparou que o único indicador que bateu a meta é o mais fácil de bater? Aderir é simples. Reduzir mortalidade materna não é."],
    ["preocupado", "Se só mostrarmos a adesão, vamos parecer bem no jornal e mal na vida real."],
  ], [
    ["Vamos publicar todos os indicadores.", ["feliz", "Concordo. Indicador ruim publicado vira projeto de melhoria. Indicador ruim escondido vira manchete errada."], { rel: { ana: 4 }, attrs: { competencia: 1 } }],
    ["Dá para destacar os melhores primeiro?", ["irônico", "Dá, desde que os outros apareçam logo em seguida. Destaque não é maquiagem."], { rel: { ana: 2 } }],
  ]),
  talk("n5-juninho-relatorio", 35, "almoxarifado-nacional", "juninho", "O relatório “sob medida”", [
    ["feliz", "Primo Diretor(a)! Juninho Consultoria & Resultados. Fiz um relatório lindo do seu programa: 'sucesso absoluto', com gráfico em 3D. Ninguém vai reclamar."],
    ["irônico", "Custa um pouquinho, mas dispensa licitação porque é 'serviço técnico singular'. E ainda sobra uma taxa de gratidão para quem contratar."],
  ], [
    ["Primo, vou usar os dados da própria Agência.", ["serio", "Dados da Agência... os mesmos que mostram o contrário? Ai, ai."], { attrs: { competencia: 1 }, rel: { juninho: -4 } }],
    ["Manda a proposta que eu vejo.", ["feliz", "Já mandei! Está na pasta, ao lado do café."], { rel: { juninho: 8 }, attrs: { caraDePau: 2 } }],
  ]),
  talk("n5-ramiro-manchete", 35, "comissao-congresso", "ramiro", "A manchete do senador", [
    ["feliz", "Diretor(a)! Soube que o programa fez um ano. Já pedi à assessoria uma manchete: 'Programa Senador Ramiro bate meta de adesão'. Quatrocentos e doze municípios!"],
    ["irônico", "Sobre os outros números... a gente deixa para o fim do relatório. Ou para o ano que vem."],
  ], [
    ["Senador, vamos mostrar tudo, inclusive o que ainda não deu certo.", ["serio", "Tudo? Isso é corajoso. Ou imprudente. Vamos ver o que a imprensa faz com 'tudo'."], { attrs: { confianca: 1, persuasao: 1 }, rel: { ramiro: -4 } }],
    ["Boa ideia, adesão é uma ótima notícia.", ["feliz", "Excelente. Gosto de quem sabe escolher o enquadramento."], { rel: { ramiro: 6 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 36 ───── */
  talk("n5-pedro-tce", 36, "controladoria", "pedro", "Instaurar ou não instaurar", [
    ["serio", "O convênio de que falamos terminou há dois anos. Saldo parado, parte do gasto sem comprovante. Quando a prestação de contas é omitida ou rejeitada e o dano persiste, a lei prevê a tomada de contas especial."],
    ["neutro", "É um processo administrativo para apurar fatos, identificar responsáveis e quantificar o dano ao erário. Não é castigo: é procedimento."],
  ], [
    ["Dá para o município devolver antes?", ["feliz", "Dá. A devolução voluntária com correção e rendimentos reduz o dano. O que não se resolve assim segue para apuração."], { rel: { pedro: 4 }, attrs: { conhecimento: 1 } }],
    ["Não seria mais simples arquivar?", ["irônico", "Simples, sim. Seguro, não. Arquivar dano conhecido é deixar o problema para o próximo auditor."], { rel: { pedro: 2 } }],
  ]),
  talk("n5-iara-contraditorio", 36, "controladoria", "iara", "Contraditório e ampla defesa", [
    ["serio", "Conselheira Iara Nogueira. Antes de cobrar um centavo, a Constituição manda ouvir. Contraditório e ampla defesa valem também no processo administrativo."],
    ["preocupado", "Já vi cobrança anulada porque a defesa não foi examinada. A cobrança perde o dinheiro e a Agência perde a credibilidade."],
  ], [
    ["Vou notificar o responsável e analisar os documentos que ele trouxer.", ["feliz", "É o roteiro certo: notificar, receber a defesa, analisar, decidir com fundamentação."], { rel: { iara: 6 }, attrs: { confianca: 1 } }],
    ["E se ele não responder?", ["serio", "Aí a revelia não elimina o dever de provar o dano, mas o processo segue. O silêncio, porém, pesa contra quem silenciou."], { rel: { iara: 2 } }],
  ], { apresentacao: "3d" }),
  talk("n5-celia-encerramento", 36, "comissao-congresso", "celia", "A conta fecha", [
    ["serio", "Diretor(a), Dona Célia. Sigo acompanhando de longe: do posto do bairro até a Agência, e o que eu quero saber é simples. O dinheiro que saiu chegou? E, se não chegou, alguém explicou?"],
    ["feliz", "Vejo que a Agência está fazendo as duas coisas: repassar e cobrar a prestação de contas. Isso dá confiança."],
  ], [
    ["O que fizemos de mais importante?", ["feliz", "Medir antes, cobrar com critério e ouvir quem tem direito de ser ouvido. Parece óbvio, mas dá trabalho."], { rel: { celia: 6 }, attrs: { confianca: 1 } }],
    ["E o que falta?", ["serio", "Falta o dinheiro chegar em dia em todo lugar. Mas agora vocês sabem onde o gargalo está."], { rel: { celia: 4 } }],
  ]),
];

/* ═════════════════════════ Decisões ═════════════════════════ */

const DECISOES: DecisionDef[] = [
  /* ───────── D31 — programa de saúde da mulher ───────── */
  {
    id: "d31", caso: 31, mesa: "diretoria", titulo: "Um programa com meta, não com sobrenome", conceito: "programa-metas", basePct: 3, gestoPadrao: "assinar",
    papelAssinado: "PORTARIA DE INSTITUIÇÃO DO PROGRAMA DE SAÚDE DA MULHER — documento fictício",
    pergunta: "Há verba para um programa novo de saúde da mulher. O Senador Ramiro quer o nome dele no programa e uma lista de municípios. Como instituir?",
    opcoes: [
      opt({ id: "programa-com-metas", rotulo: "Instituir com população-alvo, linha de base, metas e indicadores", kind: "competente", resumo: "Priorizar as regiões de maior necessidade, fixar metas mensuráveis e prever avaliação anual.",
        requer: { achado: "f31-desenho", dica: "Cruze o diagnóstico regional com a minuta: ela diz para quem, quanto e até quando?" },
        custo: m(2.4), prazo: "5 meses até o primeiro ciclo", ganho: () => "Recurso onde a necessidade é maior e um programa que pode ser avaliado",
        riscos: [{ texto: "O senador pode se ofender com a perda do nome e da lista" }, { texto: "Meta exige medição e acompanhamento todos os meses" }],
        custoPct: 2.4, aplica: ["programa-metas", "medir-antes"], conquista: "n5-programa-com-meta",
        efeitos: { attrs: { competencia: 6, confianca: 3, persuasao: 1 }, pub: { qualidade: 3, acesso: 5 }, filaMin: -3, rel: { cecilia: 8, bento: 4, ramiro: -5 } },
        depois: [{ depois: 2, efeitos: { pub: { acesso: 5, qualidade: 3 }, filaMin: -4, attrs: { confianca: 3 } }, titulo: "O programa tem rumo", mensagem: "Com alvo e linha de base definidos, os primeiros municípios do Norte e do Nordeste já têm cobertura de preventivo subindo e dá para comparar com o ponto de partida.", motivo: "Você definiu para quem, de onde partir e aonde chegar.", tom: "bom" }],
        narracao: "Bento coloca a portaria na mesa e confere: população-alvo, linha de base, meta, prazo. “Quatro perguntas, quatro respostas.” Ramiro sai sem apertar a sua mão." }),
      opt({ id: "piloto-regional", rotulo: "Começar com um piloto em três regiões e definir as metas depois", kind: "prudente", resumo: "Testar o programa em escala menor antes de fixar metas nacionais.",
        custo: m(1.2), prazo: "6 meses de piloto", riscos: [{ texto: "Sem metas claras, o piloto pode não ensinar nada" }, { texto: "Adia o atendimento nas outras regiões" }],
        custoPct: 1.2, aplica: ["programa-metas"], efeitos: { attrs: { competencia: 2 }, pub: { acesso: 2 }, filaMin: -1, rel: { cecilia: 3, ramiro: -2 } },
        narracao: "Um piloto sensato, mas com a régua ainda guardada na gaveta. Cecília concorda e pede que a régua saia logo." }),
      opt({ id: "programa-do-senador", rotulo: "Batizar com o nome do senador e começar pela lista dele", kind: "comodo", resumo: "Atender o pedido do relator: nome no programa e primeiros recursos para a lista de municípios.",
        custo: m(2.4), prazo: "2 meses", riscos: [{ texto: "Só 3 dos 12 municípios estão entre os mais críticos", precisa: "c31-oficio" }, { texto: "Sem meta, o programa nunca poderá ser avaliado", precisa: "c31-minuta" }],
        custoPct: 2.4, aliado: "ramiro", conquista: "n5-programa-do-senador",
        efeitos: { attrs: { popularidade: 3, rede: 3, competencia: -2 }, rel: { ramiro: 10, cecilia: -6 }, favor: { ramiro: 6 }, dependencia: 4 },
        depois: [{ depois: 2, efeitos: { pub: { acesso: -2 }, filaMin: 3, attrs: { confianca: -3 } }, titulo: "Placa bonita, indicador parado", mensagem: "As unidades receberam a placa com o nome do senador, mas as regiões de maior mortalidade seguem sem o programa e ninguém sabe dizer o que mudou.", motivo: "O recurso seguiu a lista, não o diagnóstico.", tom: "ruim" }],
        narracao: "A cerimônia tem placa dourada e discurso comprido. O painel de indicadores permanece em silêncio." }),
      opt({ id: "programa-senador-taxa", rotulo: "Direcionar a lista de municípios e cobrar “taxa de articulação”", kind: "desvio", resumo: "Aceitar a lista do relator e receber um percentual por fora de quem for contemplado.",
        custo: m(2.6), prazo: "2 meses", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Dependência do relator do orçamento" }],
        custoPct: 2.6, desvio: DEV("Receber “taxa de articulação”", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 14, influencia: 6, evidencias: 3, rel: { ramiro: 8, cecilia: -8 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { acesso: -2 } }, titulo: "Quem recebeu o recurso?", mensagem: "A Controladoria cruzou a lista de contemplados com as doações de campanha da região. A pasta está aberta.", motivo: "Programa direcionado por favorecimento.", tom: "ruim" }],
        aliado: "ramiro", narracao: "A lista segue exatamente como o senador mandou. Pedro Salgado, na Controladoria, abre uma pasta nova e escreve o seu nome na etiqueta." }),
    ],
  },

  /* ───────── D32 — repasses atrasados ───────── */
  {
    id: "d32", caso: 32, mesa: "diretoria", titulo: "Repasse previsível, com condição", conceito: "repasse-condicionado", basePct: 4, gestoPadrao: "assinar",
    papelAssinado: "PORTARIA DE CRITÉRIOS DE REPASSE FUNDO A FUNDO — documento fictício",
    pergunta: "Os repasses a estados e municípios chegam, em média, 45 dias atrasados. Há uma proposta de critérios de desempenho e um deputado pedindo prioridade. Como organizar?",
    opcoes: [
      opt({ id: "repasse-criterios", rotulo: "Parcela fixa previsível, parcela por desempenho, checklist único e calendário público", kind: "competente", resumo: "Reduzir o atraso na origem: critérios claros, piso para municípios pequenos e apoio técnico.",
        custo: m(2.0), prazo: "4 meses para implantar", ganho: () => "Repasse em dia e previsível; resultado vira critério",
        riscos: [{ texto: "Municípios pequenos podem ter dificuldade com a documentação" }, { texto: (c) => `Sistema e apoio técnico custam cerca de ${c.money(0.5)}`, precisa: "c32-criterios" }],
        custoPct: 2.0, aplica: ["repasse-condicionado", "gargalo"], conquista: "n5-repasse-previsivel",
        efeitos: { attrs: { competencia: 6, confianca: 3, persuasao: 1 }, pub: { acesso: 4, sustentabilidade: 3 }, filaMin: -8, rel: { cecilia: 8, teodoro: 6, guardiao: 4, cornelio: -5 } },
        depois: [{ depois: 2, efeitos: { filaMin: -6, pub: { acesso: 4, qualidade: 2 }, attrs: { confianca: 3 } }, titulo: "O dinheiro chega no dia combinado", mensagem: "Com o calendário publicado e o checklist único, os estados passaram a planejar a folha e os atrasos por documentação caíram pela metade.", motivo: "O atraso foi tratado na causa, não só no sintoma.", tom: "bom" }],
        narracao: "Teodoro lê o calendário e abre o primeiro sorriso institucional da reunião. Cornélio lê o critério e fecha a cara." }),
      opt({ id: "mutirao-pareceres", rotulo: "Montar um mutirão de pareceres para zerar a fila", kind: "prudente", resumo: "Reforçar temporariamente a análise interna, sem mudar a regra.",
        custo: m(1.1), prazo: "6 semanas", riscos: [{ texto: "Ataca só 31% da causa; a documentação segue incompleta" }, { texto: "A fila volta depois do mutirão" }],
        custoPct: 1.1, efeitos: { attrs: { competencia: 2, popularidade: 2 }, pub: { acesso: 2 }, filaMin: -4, rel: { cecilia: 2 } },
        depois: [{ depois: 2, efeitos: { filaMin: 4, pub: { acesso: -1 } }, titulo: "A fila voltou", mensagem: "Sem mudar as regras nem apoiar os entes na documentação, os pareceres voltaram a empilhar.", motivo: "O mutirão reduziu a fila, não a causa dela.", tom: "neutro" }],
        narracao: "Um mês de pareceres a toque de caixa. Em março, a pilha recomeça." }),
      opt({ id: "repasse-linear", rotulo: "Pagar tudo igual e sem condição, só para sair no prazo", kind: "fraco", resumo: "Repasse linear, sem plano de saúde, sem indicador e sem prestação de contas exigida.",
        custo: m(2.6), prazo: "Imediato", riscos: [{ texto: "Sem condição, ninguém sabe se o dinheiro virou serviço" }, { texto: "Entes irregulares recebem igual aos que cumprem" }],
        custoPct: 2.6, efeitos: { attrs: { competencia: -3, popularidade: 2 }, pub: { sustentabilidade: -3, qualidade: -1 }, filaMin: -5, evidencias: 1, rel: { guardiao: -4, cecilia: -4 } },
        depois: [{ depois: 2, efeitos: { evidencias: 1, attrs: { confianca: -3 }, pub: { sustentabilidade: -2 } }, titulo: "Pagou, mas ninguém sabe o que comprou", mensagem: "Sem condicionalidade, a Controladoria não tinha o que cobrar e o dinheiro foi para a rubrica errada em vários municípios.", motivo: "Repasse linear paga sem gerar informação.", tom: "ruim" }],
        narracao: "O prazo é cumprido. O que foi feito com o dinheiro, ninguém pergunta." }),
      opt({ id: "repasse-por-pedido-taxa", rotulo: "Liberar primeiro quem pedir e cobrar “taxa de liberação”", kind: "desvio", resumo: "Furar a fila para o município do amigo do deputado e receber percentual por fora.",
        custo: m(2.4), prazo: "Imediato", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Furar a fila atrasa todos os outros", precisa: "c32-pedido" }],
        custoPct: 2.4, desvio: DEV("Receber “taxa de liberação”", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 13, influencia: 5, evidencias: 3, rel: { cornelio: 8, cecilia: -8, guardiao: -4 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, filaMin: 5 }, titulo: "A fila tem dono", mensagem: "Os estados notaram que os repasses saem na ordem do pedido político. O atraso médio piorou e a Controladoria foi avisada.", motivo: "Repasse liberado por favorecimento.", tom: "ruim" }],
        aliado: "cornelio", narracao: "O município do amigo do deputado recebe em dois dias. Os outros, em quatro meses. O bilhete a lápis agora está num arquivo." }),
    ],
  },

  /* ───────── D33 — convênio e prestação de contas ───────── */
  {
    id: "d33", caso: 33, mesa: "diretoria", titulo: "A segunda parcela e a prestação pendente", conceito: "convenio-prestacao", basePct: 3, gestoPadrao: "assinar",
    papelAssinado: "NOTIFICAÇÃO E DECISÃO SOBRE A PARCELA 2 DO CONVÊNIO — documento fictício",
    pergunta: "Vila Aurora quer a segunda parcela do convênio, mas 38% da primeira não tem comprovante. Valdemar sugere liberar e regularizar depois. O que fazer?",
    opcoes: [
      opt({ id: "notificar-e-glosar", rotulo: "Notificar com prazo, glosar o que não se comprovar e liberar só a parte regular", kind: "competente", resumo: "Dar prazo para a prefeitura regularizar, analisar a resposta e liberar a parcela proporcional ao que estiver comprovado.",
        requer: { achado: "f33-fisico", dica: "Compare a execução física com a prestação de contas: o problema é o serviço ou o papel?" },
        custo: m(1.4), prazo: "30 dias de prazo e 15 de análise", ganho: () => "Obra segue, o dinheiro é explicado e o que não tem prova volta aos cofres",
        riscos: [{ texto: "A prefeitura pode atrasar a resposta" }, { texto: "A liberação parcial adia parte das unidades" }],
        custoPct: 1.4, aplica: ["convenio-prestacao", "controle-interno"], conquista: "n5-convenio-conferido",
        efeitos: { attrs: { competencia: 6, confianca: 3 }, pub: { qualidade: 3, sustentabilidade: 3 }, filaMin: -3, rel: { pedro: 8, lucia: 4, valdemar: -5 } },
        depois: [{ depois: 2, efeitos: { pub: { acesso: 4, qualidade: 3 }, filaMin: -2, attrs: { confianca: 3 } }, titulo: "Convênio de pé e papel em dia", mensagem: "A prefeitura regularizou as notas, devolveu o glosado e recebeu a parcela proporcional. As unidades móveis começaram a rodar.", motivo: "Você cobrou a prova sem interromper a entrega.", tom: "bom" }],
        narracao: "Pedro confere a notificação, aprova o prazo e escreve na margem: “Procedimento correto.” Valdemar suspira, mas assina como testemunha." }),
      opt({ id: "suspender-tudo", rotulo: "Suspender o convênio inteiro até a prestação fechar", kind: "prudente", resumo: "Reter qualquer pagamento e paralisar a execução até regularizar toda a pendência.",
        custo: m(0.4), prazo: "Indefinido", riscos: [{ texto: "As unidades móveis param e a população espera" }, { texto: "Pune quem recebe o serviço e não só quem errou" }],
        custoPct: 0.4, efeitos: { attrs: { competencia: 2, popularidade: -2 }, pub: { acesso: -3, sustentabilidade: 1 }, rel: { pedro: 4, lucia: -3 } },
        narracao: "A regra é cumprida à risca. As duas unidades em fabricação ficam esperando no pátio da fábrica." }),
      opt({ id: "liberar-e-regularizar", rotulo: "Liberar a parcela e regularizar depois, como sugere Valdemar", kind: "comodo", resumo: "Aceitar as notas como estão e pagar a segunda parcela integral.",
        custo: m(1.9), prazo: "Imediato", riscos: [{ texto: "Paga-se sobre gasto sem comprovante", precisa: "c33-pendencias" }, { texto: "Descumpre a condição do plano de trabalho", precisa: "c33-plano" }],
        custoPct: 1.9, aliado: "valdemar", efeitos: { attrs: { popularidade: 2, rede: 2, competencia: -3 }, rel: { valdemar: 8, pedro: -8, lucia: 2 }, evidencias: 2, favor: { valdemar: 4 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, attrs: { confianca: -4 }, pub: { sustentabilidade: -3 } }, titulo: "O depois não chegou", mensagem: "A prestação de contas nunca foi regularizada. O dinheiro da segunda parcela agora também está sem comprovante.", motivo: "A condição do plano de trabalho foi ignorada.", tom: "ruim" }],
        narracao: "A parcela sai antes do café esfriar. A regularização, essa continua prometida." }),
      opt({ id: "liberar-com-taxa", rotulo: "Liberar sem exigir comprovante, em troca de uma “taxa de regularização”", kind: "desvio", resumo: "Fechar os olhos para a prestação e receber um percentual por fora.",
        custo: m(2.0), prazo: "Imediato", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Dano ao erário em convênio sem comprovação" }],
        custoPct: 2.0, desvio: DEV("Receber “taxa de regularização”", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 13, influencia: 5, evidencias: 3, rel: { valdemar: 8, pedro: -9, lucia: -4 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { sustentabilidade: -3 } }, titulo: "O convênio vai para a auditoria", mensagem: "Pedro Salgado encontrou uma parcela paga sem prestação de contas e um registro de reunião suspeito, com data e horário.", motivo: "Parcela liberada sem comprovação e com vantagem indevida.", tom: "ruim" }],
        aliado: "valdemar", narracao: "Tudo muito amigável, tudo muito rápido. O tipo de rapidez que costuma ficar registrado em ata." }),
    ],
  },

  /* ───────── D34 — compra nacional ───────── */
  {
    id: "d34", caso: 34, mesa: "diretoria", titulo: "Comprar em escala, sem faltar vacina", conceito: "compra-nacional", basePct: 5, gestoPadrao: "assinar",
    papelAssinado: "AUTORIZAÇÃO DE COMPRA NACIONAL DE VACINAS E INSUMOS — documento fictício",
    pergunta: "O estoque cobre 20 dias e uma compra nacional leva 90. Toninho sugere cinco compras regionais pequenas. Como comprar?",
    opcoes: [
      opt({ id: "compra-nacional-planejada", rotulo: "Compra nacional única, com entregas escalonadas, fornecedor reserva e compra-ponte limitada", kind: "competente", resumo: "Somar a demanda dos estados, planejar o calendário e cobrir o intervalo com uma compra emergencial pequena e justificada.",
        custo: m(3.4), prazo: "90 dias, com compra-ponte nas primeiras semanas", ganho: m(0.75),
        riscos: [{ texto: "Se o fornecedor principal falhar, o reserva precisa estar pronto", precisa: "c34-escala" }, { texto: "Exige a demanda consolidada dos estados" }],
        custoPct: 3.4, economiaPct: 16, aplica: ["compra-nacional", "compra-compartilhada", "reserva-urgencia"], conquista: "n5-compra-planejada",
        efeitos: { attrs: { competencia: 6, confianca: 2, persuasao: 1 }, pub: { sustentabilidade: 3, qualidade: 3 }, estoqueDias: 6, rel: { roberto: 8, rita: 6, toninho: -5 } },
        depois: [{ depois: 2, efeitos: { estoqueDias: 5, caixaPct: 0.5, pub: { qualidade: 2, acesso: 3 } }, titulo: "Vacina em dia, preço menor", mensagem: "Os lotes chegaram em quatro entregas, o fornecedor reserva cobriu um atraso e a economia de escala já aparece no caixa.", motivo: "A escala veio com planejamento e plano de contingência.", tom: "bom" }],
        narracao: "Roberto confere as quatro datas de entrega e Rita carimba a demanda consolidada. Pela primeira vez, a conta fecha antes do estoque acabar." }),
      opt({ id: "compra-ponte-e-planejar", rotulo: "Compra emergencial só para cobrir o intervalo e planejar a compra anual depois", kind: "prudente", resumo: "Evitar a falta agora e deixar a compra nacional para o próximo ciclo.",
        custo: m(2.6), prazo: "3 semanas de compra-ponte", riscos: [{ texto: "Preço maior que o da compra em escala" }, { texto: "Adia a economia para o ano seguinte" }],
        custoPct: 2.6, economiaPct: 5, aplica: ["reserva-urgencia"], efeitos: { attrs: { competencia: 3 }, pub: { sustentabilidade: 1 }, estoqueDias: 3, rel: { roberto: 4 } },
        narracao: "A falta é evitada. O planejamento ganha uma nova data, escrita a lápis." }),
      opt({ id: "fatiar-cinco-compras", rotulo: "Fazer cinco compras regionais pequenas do mesmo fornecedor", kind: "fraco", resumo: "Dividir a compra por região para correr mais rápido e ficar abaixo dos limites.",
        custo: m(4.3), prazo: "4 semanas", riscos: [{ texto: "Fracionamento: a soma é uma compra só", precisa: "c34-propostas" }, { texto: "Preço até 9% maior que o inicial e 30% maior que o da escala" }],
        custoPct: 4.3, aliado: "toninho", efeitos: { attrs: { rede: 2, competencia: -3 }, evidencias: 2, estoqueDias: 2, rel: { toninho: 6, roberto: -6, rita: -4 }, pub: { sustentabilidade: -3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, estoqueDias: -3, attrs: { confianca: -3 } }, titulo: "Cinco notas, uma conta", mensagem: "A Controladoria somou os cinco processos e achou o fracionamento. Uma das regiões ficou sem vacina por duas semanas.", motivo: "Compra picada, preço alto e entrega desencontrada.", tom: "ruim" }],
        narracao: "Toninho já tem os cinco processos prontos, nenhum cita os outros quatro." }),
      opt({ id: "fatiar-com-comissao", rotulo: "Fatiar a compra e combinar “taxa de agilidade” com o fornecedor", kind: "desvio", resumo: "Dividir a compra e receber um percentual por fora do fornecedor líder.",
        custo: m(4.5), prazo: "4 semanas", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Fracionamento mais favorecimento: dois problemas em um" }],
        custoPct: 4.5, desvio: DEV("Receber “taxa de agilidade” do fornecedor", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 14, influencia: 6, evidencias: 3, rel: { toninho: 8, roberto: -8, rita: -6 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { qualidade: -3 }, estoqueDias: -2 }, titulo: "Lote errado, preço alto", mensagem: "Parte das vacinas chegou com validade curta e a nota veio acima da média. Roberto guardou todos os comprovantes.", motivo: "Compra sem comparação e com favorecimento.", tom: "ruim" }],
        aliado: "toninho", narracao: "O fornecedor escreve um cartão simpático de agradecimento. A Controladoria escreve uma pasta inteira." }),
    ],
  },

  /* ───────── D35 — monitoramento e avaliação ───────── */
  {
    id: "d35", caso: 35, mesa: "diretoria", titulo: "Corrigir a rota ou enfeitar o relatório", conceito: "monitoramento-avaliacao", basePct: 2.5, gestoPadrao: "assinar",
    papelAssinado: "RELATÓRIO DE MONITORAMENTO E PLANO DE CORREÇÃO DO PROGRAMA — documento fictício",
    pergunta: "Depois de um ano, só a adesão bateu a meta; os indicadores de resultado ficaram abaixo. O relator quer manchete de sucesso e Juninho oferece um relatório “sob medida”. O que fazer?",
    opcoes: [
      opt({ id: "avaliar-e-corrigir", rotulo: "Publicar todos os indicadores e corrigir a rota: laudo, transporte e metas revistas", kind: "competente", resumo: "Mostrar o que bateu e o que não bateu, atacar o gargalo do laudo e do transporte e rever metas com justificativa.",
        requer: { achado: "f35-causa", dica: "Cruze os indicadores abaixo da meta com o relatório de campo: onde está o gargalo?" },
        custo: m(1.8), prazo: "6 meses para o plano de correção", ganho: () => "Programa que aprende com os números e recupera parte da meta",
        riscos: [{ texto: "A manchete do relator fica menos bonita" }, { texto: "Corrigir exige recurso e acompanhamento" }],
        custoPct: 1.8, aplica: ["monitoramento-avaliacao", "transparencia", "gargalo"], conquista: "n5-rota-corrigida",
        efeitos: { attrs: { competencia: 6, confianca: 4, persuasao: 1 }, pub: { qualidade: 4, acesso: 4 }, filaMin: -4, rel: { bento: 8, ana: 6, ramiro: -5, juninho: -4 } },
        depois: [{ depois: 2, efeitos: { pub: { acesso: 4, qualidade: 3 }, filaMin: -4, attrs: { confianca: 3 } }, titulo: "O laudo agora chega a tempo", mensagem: "Com transporte para o laboratório e laudo em prazo menor, o exame preventivo subiu nos municípios atrasados. A meta foi revista com justificativa pública.", motivo: "Você corrigiu a causa em vez de esconder o número.", tom: "bom" }],
        narracao: "Bento projeta a tabela inteira, sem cortes. “Isto é monitorar”, diz. Ramiro lê a terceira linha e pede um copo d'água." }),
      opt({ id: "esperar-mais-um-ciclo", rotulo: "Esperar mais um ciclo para ver se os números melhoram sozinhos", kind: "prudente", resumo: "Manter o programa como está e reavaliar no ano seguinte.",
        custo: m(0.3), prazo: "12 meses", riscos: [{ texto: "O gargalo segue sem solução" }, { texto: "Mais um ano de resultado abaixo da meta" }],
        custoPct: 0.3, efeitos: { attrs: { competencia: -1, popularidade: 1 }, pub: { acesso: -1 }, filaMin: 1, rel: { bento: -2, ana: -2 } },
        narracao: "O programa segue como está, e o painel segue vermelho. Ana anota a data da próxima revisão." }),
      opt({ id: "so-adesao", rotulo: "Divulgar só a adesão e os depoimentos favoráveis", kind: "comodo", resumo: "Atender o relator: apresentar o indicador que bateu a meta e deixar o resto nos anexos.",
        custo: m(0.2), prazo: "Imediato", riscos: [{ texto: "A omissão aparece quando alguém lê os anexos", precisa: "c35-indicadores" }, { texto: "Sem diagnóstico, o gargalo nunca é resolvido" }],
        custoPct: 0.2, aliado: "ramiro", efeitos: { attrs: { popularidade: 4, rede: 2, competencia: -2 }, rel: { ramiro: 8, bento: -6, ana: -6 }, favor: { ramiro: 4 } },
        ajustes: [{ se: (s) => s.personal.evidencias > 0 || s.personal.desviado > 0, efeitos: { attrs: { confianca: -6 } }, nota: "Os registros mostram o que o relatório escondeu: a confiança caiu." }],
        depois: [{ depois: 2, efeitos: { attrs: { confianca: -4 }, pub: { acesso: -2 }, filaMin: 3 }, titulo: "A manchete não aguentou o anexo", mensagem: "Um jornalista leu os anexos e cruzou os números. A manchete virou nota de rodapé e o gargalo continuou lá.", motivo: "Mostrou-se só o número que agrada.", tom: "ruim" }],
        narracao: "A manchete sai radiante. Nos anexos, três indicadores aguardam, pacientes, quem os leia." }),
      opt({ id: "avaliacao-amiga", rotulo: "Contratar a “avaliação” do Primo Juninho e dividir a taxa de gratidão", kind: "desvio", resumo: "Aceitar o relatório favorável sem licitação e receber um percentual por fora.",
        custo: m(1.6), prazo: "2 semanas", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Contratação sem licitação e sem independência", precisa: "c35-relatorio" }],
        custoPct: 1.6, desvio: DEV("Dividir a “taxa de gratidão”", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 12, influencia: 5, evidencias: 3, rel: { juninho: 10, bento: -8, ana: -8, ramiro: 4 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, attrs: { confianca: -4 } }, titulo: "Serviço singular, pasta comum", mensagem: "A auditoria questionou por que um serviço “singular” era um relatório com gráfico de pizza. O pagamento ficou retido.", motivo: "Contratação sem licitação para produzir um relatório conveniente.", tom: "ruim" }],
        aliado: "juninho", narracao: "O relatório chega em tempo recorde, encadernado em espiral dourada. A nota fiscal também chega — e ninguém consegue explicar de onde saiu." }),
    ],
  },

  /* ───────── D36 — tomada de contas especial (encerramento) ───────── */
  {
    id: "d36", caso: 36, mesa: "diretoria", titulo: "Fechar a conta do convênio", conceito: "tomada-contas-especial", basePct: 0, gestoPadrao: "parecer",
    papelAssinado: "DECISÃO SOBRE A TOMADA DE CONTAS ESPECIAL — documento fictício",
    pergunta: "Um convênio antigo terminou com saldo parado e parte do gasto sem comprovante. O ex-gestor mandou defesa. Como encerrar?",
    opcoes: [
      opt({ id: "tce-com-contraditorio", rotulo: "Instaurar a tomada de contas especial, ouvir a defesa e cobrar o que ficar apurado", kind: "competente", gesto: "parecer", resumo: "Cobrar o saldo com correção, analisar as notas da defesa e quantificar o dano só do que continuar sem prova.",
        custo: m(0.3), prazo: "Alguns meses de procedimento", ganho: () => "Dano apurado com segurança e recursos recuperados",
        riscos: [{ texto: "Procedimento demorado" }, { texto: "A defesa pode reduzir o valor cobrado", precisa: "c36-defesa" }],
        custoPct: 0.3, aplica: ["tomada-contas-especial", "controle-interno", "transparencia"],
        efeitos: { attrs: { competencia: 5, confianca: 8, conhecimento: 2 }, pub: { sustentabilidade: 4, qualidade: 2 }, filaMin: -2, caixaPct: 0.5, rel: { pedro: 8, iara: 8, celia: 6 } },
        depois: [{ depois: 1, efeitos: { caixaPct: 0.4, attrs: { confianca: 3 } }, titulo: "O saldo voltou ao cofre", mensagem: "O saldo foi devolvido com correção, as notas da defesa foram aceitas e o restante entrou na apuração com direito de resposta.", motivo: "Cobrança fundamentada, com defesa examinada.", tom: "bom" }],
        narracao: "Iara folheia o processo até o fim e assina embaixo: “Contraditório respeitado.” Célia, na plateia, anota tudo e agradece." }),
      opt({ id: "devolucao-amigavel", rotulo: "Aceitar a devolução do saldo e instaurar o processo só se ela não ocorrer", kind: "prudente", gesto: "parecer", resumo: "Receber o saldo com correção e deixar a apuração dos 14% sem comprovante para depois.",
        custo: m(0.1), prazo: "30 dias", riscos: [{ texto: "Deixa sem apuração o gasto sem comprovante" }],
        custoPct: 0.1, aplica: ["tomada-contas-especial"], efeitos: { attrs: { competencia: 2, confianca: 3 }, pub: { sustentabilidade: 2 }, caixaPct: 0.3, rel: { pedro: 2, iara: 1 } },
        narracao: "O saldo volta ao cofre. A pasta dos 14% sem comprovante volta para a gaveta." }),
      opt({ id: "arquivar-processo", rotulo: "Arquivar o processo e deixar para o próximo diretor", kind: "comodo", gesto: "assinar", resumo: "Empurrar a apuração e considerar o caso encerrado sem cobrança.",
        custo: () => "R$ 0", prazo: "Imediato", riscos: [{ texto: "O dano ao erário permanece conhecido e sem apuração", precisa: "c36-convenio" }],
        custoPct: 0, efeitos: { attrs: { confianca: -6, competencia: -3 }, pub: { sustentabilidade: -3 }, evidencias: 1, rel: { pedro: -6, iara: -4, celia: -4 } },
        ajustes: [{ se: (s) => s.personal.evidencias > 0 || s.personal.desviado > 0, efeitos: { attrs: { confianca: -4 } }, nota: "Os registros anteriores deixam claro que o arquivamento não foi acaso." }],
        narracao: "O processo é arquivado. O dano, não. Pedro comenta, baixinho: “Isso volta.”" }),
      opt({ id: "cobrar-sem-ouvir", rotulo: "Cobrar o valor integral sem examinar a defesa", kind: "fraco", gesto: "assinar", resumo: "Notificar o débito total, ignorando as notas apresentadas pelo ex-gestor.",
        custo: m(0.2), prazo: "Imediato", riscos: [{ texto: "Sem contraditório, a cobrança pode ser anulada" }, { texto: "Cobra o que já foi comprovado" }],
        custoPct: 0.2, efeitos: { attrs: { competencia: -3, confianca: -4 }, pub: { sustentabilidade: -1 }, evidencias: 1, rel: { iara: -8, pedro: -4 } },
        depois: [{ depois: 1, efeitos: { evidencias: 1, attrs: { confianca: -3 } }, titulo: "A cobrança caiu", mensagem: "A cobrança foi anulada por falta de exame da defesa, e o ex-gestor ganhou tempo e uma boa história.", motivo: "Sem contraditório, a cobrança não se sustenta.", tom: "ruim" }],
        narracao: "A notificação sai pesada e rápida. O recurso do ex-gestor chega ainda mais rápido." }),
    ],
  },
];

/* ═════════════════════════ Casos ═════════════════════════ */

const CASOS: CaseDef[] = [
  { id: "caso31", caso: 31, titulo: "Um programa com meta, não com sobrenome", episodio: "Episódio 1", location: "diretoria", pistas: ["c31-diagnostico", "c31-minuta", "c31-oficio"], conversas: ["n5-cecilia-abertura", "n5-bento-linhabase", "n5-ramiro-nome"], decisao: "d31",
    chamada: "Você virou Diretor(a) da Agência Federal de Programas de Saúde. O primeiro programa em sua mesa é de saúde da mulher: tem verba, tem nome de senador e não tem uma única meta.",
    objetivo: "Compare o diagnóstico regional com a minuta e com o ofício do relator antes de instituir o programa.", dica: "Dica do Professor Bento: programa se desenha com quatro perguntas: para quem, de onde partimos, aonde chegar e como medir." },
  { id: "caso32", caso: 32, titulo: "Repasse previsível, com condição", episodio: "Episódio 2", location: "diretoria", pistas: ["c32-atrasos", "c32-criterios", "c32-pedido"], conversas: ["n5-teodoro-atrasos", "n5-guardiao-fluxo", "n5-cecilia-criterios", "n5-cornelio-parcela"], decisao: "d32",
    chamada: "Os repasses a estados e municípios chegam, em média, 45 dias atrasados. Há uma proposta de critérios por desempenho e um deputado com pressa.",
    objetivo: "Descubra por que os repasses atrasam e como organizar critérios sem punir quem tem menos estrutura.", dica: "Dica do Professor Bento: previsibilidade é metade do repasse. A outra metade é saber o que o dinheiro entregou." },
  { id: "caso33", caso: 33, titulo: "A segunda parcela e a prestação pendente", episodio: "Episódio 3", location: "diretoria", pistas: ["c33-plano", "c33-pendencias", "c33-execucao"], conversas: ["n5-lucia-convenio", "n5-pedro-prestacao", "n5-valdemar-flexibilizar"], decisao: "d33",
    chamada: "Vila Aurora quer a segunda parcela do convênio, mas a prestação de contas da primeira está pela metade. A obra anda; o papel, não.",
    objetivo: "Compare o plano de trabalho, o parecer da prestação e a execução física antes de liberar a parcela.", dica: "Dica do Professor Bento: convênio se fecha com prova. Notificar, dar prazo e glosar o que não se comprova protege o serviço e o dinheiro." },
  { id: "caso34", caso: 34, titulo: "Comprar em escala, sem faltar vacina", episodio: "Episódio 4", location: "diretoria", pistas: ["c34-consumo", "c34-propostas", "c34-escala"], conversas: ["n5-roberto-estoque", "n5-toninho-fatiar", "n5-rita-demanda"], decisao: "d34",
    chamada: "O estoque nacional de vacinas cobre cerca de 20 dias e uma compra grande leva 90. Toninho tem cinco propostas pequenas, do mesmo fornecedor, já prontas.",
    objetivo: "Compare a demanda, as cinco propostas e a simulação de compra nacional antes de autorizar.", dica: "Dica do Professor Bento: escala dá preço, planejamento dá segurança. Sem os dois, ou se paga caro ou falta vacina." },
  { id: "caso35", caso: 35, titulo: "Corrigir a rota ou enfeitar o relatório", episodio: "Episódio 5", location: "diretoria", pistas: ["c35-indicadores", "c35-relatorio", "c35-campo"], conversas: ["n5-bento-avaliacao", "n5-ana-indicadores", "n5-juninho-relatorio", "n5-ramiro-manchete"], decisao: "d35",
    chamada: "O programa de saúde da mulher fez um ano. Só a adesão bateu a meta. O relator quer manchete de sucesso e o Primo Juninho já preparou o relatório.",
    objetivo: "Compare os indicadores, o relatório da consultoria e o relatório de campo para decidir entre corrigir e esconder.", dica: "Dica do Professor Bento: monitorar é olhar enquanto acontece; avaliar é perguntar se mudou; e a resposta serve para corrigir a rota." },
  { id: "caso36", caso: 36, titulo: "Fechar a conta do convênio", episodio: "Episódio 6", location: "diretoria", pistas: ["c36-convenio", "c36-extrato", "c36-defesa"], conversas: ["n5-pedro-tce", "n5-iara-contraditorio", "n5-celia-encerramento"], decisao: "d36",
    chamada: "Um convênio antigo terminou com saldo parado e gasto sem comprovante. É hora de decidir como encerrar a conta, e o ex-gestor mandou a defesa.",
    objetivo: "Separe o saldo devolvível do gasto sem prova e examine a defesa antes de decidir.", dica: "Dica do Professor Bento: apurar dano ao erário exige procedimento, contraditório e fundamentação. Cobrar sem ouvir é arriscar perder tudo." },
];

/* ═════════════════════════ Conceitos ═════════════════════════ */

const CONCEITOS: Partial<Record<ConceptId, Concept>> = {
  "programa-metas": {
    id: "programa-metas", titulo: "Programa bom tem alvo, meta e linha de base", tema: "Desenho de programas", dificuldade: 2,
    texto: "Um programa público precisa dizer para quem é (população-alvo), de onde parte (linha de base), aonde quer chegar (metas) e como vai medir (indicadores). Sem isso, não há como saber se funcionou, e o recurso tende a seguir quem pede em vez de seguir a necessidade.",
    aplicacao: "Na vida real: antes de apoiar um projeto na sua comunidade, pergunte qual problema ele resolve, qual é o número hoje e qual número se espera daqui a um ano.",
    fonte: { rotulo: "Constituição Federal, art. 165 (plano plurianual com diretrizes, objetivos e metas)", url: CF, classificacao: "oficial" },
  },
  "repasse-condicionado": {
    id: "repasse-condicionado", titulo: "Repasse previsível, com condição e com resultado", tema: "Financiamento e repasses", dificuldade: 2,
    texto: "No repasse fundo a fundo, a União transfere recursos de saúde direto aos fundos de estados e municípios, com condições como plano de saúde e relatório de gestão. Misturar uma parcela fixa, que dá previsibilidade, com uma parcela por desempenho ajuda a premiar resultado sem tirar a segurança de quem tem menos estrutura. Atraso costuma ter causa, e a causa pode ser a documentação.",
    aplicacao: "Na vida real: se uma associação depende de verba que atrasa, peça o calendário de pagamento e a lista exata de documentos exigidos, para que o papel não seja a causa do atraso.",
    fonte: { rotulo: "Lei 8.142/1990 (transferências intergovernamentais de recursos da saúde)", url: L8142, classificacao: "oficial" },
  },
  "convenio-prestacao": {
    id: "convenio-prestacao", titulo: "Convênio se fecha com prestação de contas", tema: "Convênios e prestação de contas", dificuldade: 2,
    texto: "O convênio ou termo de execução tem plano de trabalho: o que será feito, quando e quanto será pago em cada parcela. Quem recebe dinheiro público presta contas, e o repasse seguinte pode depender de comprovar o anterior. Despesa sem prova é glosada, ou seja, não é aceita e precisa ser devolvida ou comprovada.",
    aplicacao: "Na vida real: quem recebe verba para um evento ou reforma guarda notas e fotos e confere com o plano de trabalho. Prestar contas de forma organizada protege quem gastou direito.",
    fonte: { rotulo: "Lei de Responsabilidade Fiscal (LC 101/2000), art. 25 — transferências voluntárias; Constituição, art. 70", url: LRF, classificacao: "oficial" },
  },
  "compra-nacional": {
    id: "compra-nacional", titulo: "Comprar em escala exige planejar o abastecimento", tema: "Compras de medicamentos e vacinas", dificuldade: 3,
    texto: "A compra centralizada de vacinas e medicamentos junta a demanda de todos e consegue preço melhor. Mas exige planejamento: calendário de entregas, mais de um fornecedor habilitado e estoque de segurança até o primeiro lote. Dividir a mesma compra em partes para fugir da regra é fracionamento, e depender de um só fornecedor aumenta o risco de desabastecimento.",
    aplicacao: "Na vida real: se vários vizinhos ou associações precisam do mesmo material, comprem juntos e combinem datas de entrega, em vez de cada um comprar picado e mais caro.",
    fonte: { rotulo: "Lei 14.133/2021 (planejamento das compras e registro de preços)", url: L14133, classificacao: "oficial" },
  },
  "monitoramento-avaliacao": {
    id: "monitoramento-avaliacao", titulo: "Monitorar e avaliar para corrigir a rota", tema: "Monitoramento e avaliação", dificuldade: 3,
    texto: "Monitorar é acompanhar indicadores enquanto o programa acontece; avaliar é perguntar se ele mudou o que devia mudar. Um indicador ruim é pista para corrigir a rota, desde que seja publicado e investigado. Mostrar só o número que agrada impede o aprendizado e reduz a confiança quando a verdade aparece.",
    aplicacao: "Na vida real: ao acompanhar uma obra ou serviço da sua cidade, peça os indicadores completos, não só os favoráveis, e pergunte o que será feito para melhorar os que ficaram para trás.",
    fonte: { rotulo: "Constituição Federal, art. 74, I (controle interno avalia o cumprimento das metas do plano plurianual)", url: CF, classificacao: "oficial" },
  },
  "tomada-contas-especial": {
    id: "tomada-contas-especial", titulo: "Dano ao erário se apura com procedimento e defesa", tema: "Apuração de dano e devolução", dificuldade: 3,
    texto: "A tomada de contas especial é um processo administrativo para apurar fatos, identificar responsáveis e quantificar o dano quando recursos públicos não são comprovados ou são mal usados. Ela garante contraditório e ampla defesa, aceita a devolução do que for devido, com correção, e só então segue para o controle externo, se necessário.",
    aplicacao: "Na vida real: quando alguém prestou contas de forma incompleta, ouvir a pessoa e examinar os documentos antes de cobrar protege o dinheiro e também a justiça da cobrança.",
    fonte: { rotulo: "Lei 8.443/1992 (Lei Orgânica do TCU), tomada de contas especial; Constituição, art. 5º, LV", url: L8443, classificacao: "oficial" },
  },
};

/* ═════════════════════════ Conquistas ═════════════════════════ */

const CONQUISTAS: AchievementDef[] = [
  { id: "n5-programa-com-meta", nome: "Programa com Meta e Linha de Base", descricao: "Instituiu um programa com população-alvo, linha de base, metas e indicadores.", trilha: "gestao", icone: "🎯" },
  { id: "n5-repasse-previsivel", nome: "Repasse que Chega no Dia", descricao: "Organizou o repasse com calendário, critérios claros e parcela por desempenho.", trilha: "gestao", icone: "📅" },
  { id: "n5-convenio-conferido", nome: "Convênio Conferido", descricao: "Notificou, deu prazo e glosou o que não se comprovou, sem parar a entrega.", trilha: "gestao", icone: "🧾" },
  { id: "n5-compra-planejada", nome: "Compra Nacional Sem Falta", descricao: "Comprou em escala, com entregas escalonadas e plano de contingência.", trilha: "gestao", icone: "💉" },
  { id: "n5-rota-corrigida", nome: "Rota Corrigida", descricao: "Publicou os indicadores ruins e corrigiu o gargalo em vez de esconder.", trilha: "gestao", icone: "🧭" },
  { id: "n5-programa-do-senador", nome: "O Programa com Nome de Senador", descricao: "Batizou um programa sem meta com o nome do relator do orçamento.", trilha: "satira", icone: "🪧" },
];

export const N5: LevelContent = {
  locais: LOCAIS,
  pistas: PISTAS,
  achados: ACHADOS,
  conversas: CONVERSAS,
  negociacoes: [],
  decisoes: DECISOES,
  casos: CASOS,
  conceitos: CONCEITOS,
  conquistas: CONQUISTAS,
};
