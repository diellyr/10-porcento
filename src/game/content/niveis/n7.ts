import type { AchievementDef, CaseDef, ClueDef, Concept, DecisionDef, FindingDef } from "../types";
import { DEV, m, opt as optBase, type O } from "../cases-n2";
import type { OptionDef } from "../types";
import { talk } from "../conversations-n2";
import type { ConceptId } from "../../engine/types";
import type { LevelContent, LocSpec } from "./tipos";

/**
 * Nível 7 — Topo do poder nacional (casos 43–48): plano de governo, debate, financiamento de campanha,
 * ELEIÇÃO INTEIRAMENTE SIMULADA, posse e prestação de contas final. Tudo é ficção: pessoas, órgãos, números e a apuração.
 * Valores em % do orçamento (estimado) da Presidência no cenário.
 */

/** `opt` do Nível 2 + campos exclusivos deste nível (conquista ligada à opção e pontos de campanha da eleição simulada). */
const opt = (o: O & { conquista?: string; votos?: number }): OptionDef => ({ ...optBase(o), conquista: o.conquista, votos: o.votos });

const SIM = { rotulo: "Documento do cenário (valores simulados)", classificacao: "simulado" as const };
const EST = { rotulo: "Parâmetro do cenário (estimativa didática)", classificacao: "estimativa" as const };
const CF_URL = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm";
const L9504 = "https://www.planalto.gov.br/ccivil_03/leis/l9504.htm";
const LAI = "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm";
const LRF = "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm";

/* ───────────────────────── Locais ───────────────────────── */

const locais: LocSpec[] = [
  {
    id: "comite-campanha", nome: "Comitê de Campanha", curto: "Comitê", tema: "reuniao", mesa: true,
    descricao: "Paredes de santinho, café frio e um telão com o relógio da eleição. É aqui que o plano vira slogan — e onde o Barão aparece com sacolas.",
    pessoas: [
      { id: "vivian", char: "vivian", falas: [[43, "n7-vivian-abertura", "Vivian Prates: o comitê"], [44, "n7-vivian-roteiro", "Vivian: o roteiro do debate"], [46, "n7-vivian-estrategia", "Vivian: a última semana"]] },
      { id: "estevao", char: "estevao", falas: [[45, "n7-estevao-oferta", "Barão Estevão: a oferta"], [46, "n7-estevao-caixa2", "Barão Estevão: o convite final"]] },
      { id: "valdemar", char: "valdemar", falas: [[45, "n7-valdemar-recibo", "Doutor Valdemar: o recibo"]] },
    ],
    itens: [
      { id: "pasta-plano", icone: "🗂️", onde: "mesa", pistas: [[43, "c43-promessas", "Rascunho do plano"]] },
      { id: "quadro", icone: "🧠", onde: "parede", pistas: [[44, "c44-roteiro", "Roteiro da Vivian"]] },
      { id: "caderno-contas", icone: "🧾", onde: "mesa", pistas: [[45, "c45-limites", "Regras de arrecadação e gastos"]] },
      { id: "bilhete", icone: "📝", onde: "mesa", pistas: [[45, "c45-oferta", "Bilhete do Barão"], [46, "c46-agenda", "Propostas de estratégia final"]] },
    ],
    portas: ["estudio-debate", "praca-comicio", "palacio-presidencial", "sala-situacao-nacional"],
  },
  {
    id: "estudio-debate", nome: "Estúdio do Debate", curto: "Estúdio", tema: "plenario",
    descricao: "Dois púlpitos, um cronômetro enorme e um mediador que não se comove. Aqui, enrolar custa 90 segundos por resposta.",
    pessoas: [{ id: "claudio", char: "claudio", falas: [[44, "n7-claudio-regras", "Cláudio Veiga: as regras do debate"]] }],
    itens: [
      { id: "pauta", icone: "📑", onde: "mesa", pistas: [[44, "c44-pauta", "Pauta do debate"]] },
      { id: "telao", icone: "📺", onde: "parede", pistas: [[46, "c46-rejeicao", "Pesquisa de rejeição"]] },
    ],
    portas: ["comite-campanha", "praca-comicio"],
  },
  {
    id: "praca-comicio", nome: "Praça do Comício", curto: "Praça", tema: "obra",
    descricao: "Palco, caixas de som e bandeiras. O povo vem pelo show e fica pela conversa — se houver conversa.",
    pessoas: [{ id: "celia", char: "celia", falas: [[46, "n7-celia-praca", "Dona Célia: a voz da praça"]] }],
    itens: [
      { id: "planilha-palco", icone: "🧮", onde: "mesa", pistas: [[45, "c45-gastos", "Planilha de gastos do palco"]] },
      { id: "faixa", icone: "📈", onde: "parede", pistas: [[46, "c46-pesquisa", "Pesquisa de intenção de voto"]] },
    ],
    portas: ["comite-campanha", "estudio-debate", "palacio-presidencial"],
  },
  {
    id: "palacio-presidencial", nome: "Palácio Presidencial", curto: "Palácio", tema: "gabinete",
    descricao: "Tapetes que abafam passos e quadros de quem já esteve nessa cadeira. A cadeira é grande; o orçamento, menos.",
    pessoas: [
      { id: "augusto", char: "augusto", falas: [[47, "n7-augusto-transicao", "Presidente Augusto: a passagem da faixa"], [48, "n7-augusto-despedida", "Presidente Augusto: a despedida"]] },
      { id: "helena", char: "helena", falas: [[43, "n7-helena-fonte", "Ministra Helena: a fonte de recursos"], [47, "n7-helena-limites", "Ministra Helena: os limites"]] },
      { id: "goncalo", char: "goncalo", falas: [[47, "n7-goncalo-base", "Gonçalo: o pacote da base"]] },
    ],
    itens: [
      { id: "pasta-fiscal", icone: "💼", onde: "mesa", pistas: [[43, "c43-espaco", "Parecer do espaço fiscal"], [47, "c47-limites", "Cartilha dos limites do cargo"]] },
      { id: "caixa-pedidos", icone: "✉️", onde: "mesa", pistas: [[47, "c47-pedidos", "Os nove pedidos"]] },
      { id: "quadro-esplanada", icone: "🏛️", onde: "parede", pistas: [[48, "c48-pacote", "Pacote de inaugurações"]] },
    ],
    portas: ["comite-campanha", "sala-situacao-nacional", "praca-comicio"],
  },
  {
    id: "sala-situacao-nacional", nome: "Sala de Situação Nacional", curto: "Sala de Situação", tema: "dados",
    descricao: "Um mapa do país em tela cheia, números que piscam e a única sala do prédio onde ninguém faz discurso.",
    pessoas: [
      { id: "bento", char: "bento", falas: [[43, "n7-bento-metas", "Professor Bento: plano é meta"], [48, "n7-bento-legado", "Professor Bento: o legado"]] },
      { id: "ana", char: "ana", falas: [[44, "n7-ana-checagem", "Ana da Controladoria: a checagem"], [45, "n7-ana-prestacao", "Ana: a prestação de contas"]] },
      { id: "guardiao", char: "guardiao", falas: [[48, "n7-guardiao-contas", "Guardião do Cofre: a última conta"]] },
    ],
    itens: [
      { id: "painel-fila", icone: "📺", onde: "parede", pistas: [[43, "c43-fila", "Painel da fila nacional"], [44, "c44-dados", "Meta e resultado da fila"], [48, "c48-balanco", "Balanço do mandato"]] },
      { id: "orcamento", icone: "💻", onde: "mesa", pistas: [[47, "c47-execucao", "Execução dos programas"]] },
      { id: "minuta", icone: "📄", onde: "mesa", pistas: [[48, "c48-relatorio", "Minuta do relatório final"]] },
    ],
    portas: ["comite-campanha", "palacio-presidencial"],
  },
];

/* ───────────────────────── Pistas ───────────────────────── */

const pistas: ClueDef[] = [
  /* ───── Caso 43 — plano de governo ───── */
  {
    id: "c43-promessas", caso: 43, location: "comite-campanha", titulo: "Rascunho do plano: “Brasil Feliz Já!”", tipo: "documento", confiabilidade: "incompleta", icone: "🗂️", fonte: SIM,
    texto: "A equipe de marketing listou doze promessas, uma mais bonita que a outra. O rascunho não traz metas, prazos nem de onde sai o dinheiro. Ao lado, uma anotação da Vivian: “o povo não lê tabela”.",
    tabela: (c) => [["Zerar a fila de especialistas em 100 dias", c.money(6)], ["Construir 100 hospitais novos", c.money(9)], ["Dobrar o salário de toda a equipe de saúde", c.money(7.5)], ["Remédio de graça para todo mundo", c.money(4)], ["Soma das quatro maiores promessas", c.money(26.5)], ["Fonte de recursos informada", "nenhuma"]],
  },
  {
    id: "c43-espaco", caso: 43, location: "palacio-presidencial", titulo: "Parecer da Fazenda: espaço fiscal", tipo: "documento", confiabilidade: "confirmada", icone: "💼", fonte: EST,
    texto: (c) => `A Ministra Helena fez a conta: depois de pagar o que já está comprometido, sobra por ano cerca de ${c.money(5)} para novas prioridades. Aumentar despesa permanente exige apontar a fonte (a Lei de Responsabilidade Fiscal pede isso). Promessa sem fonte não é plano — é desejo com cartaz.`,
    tabela: (c) => [["Espaço fiscal anual para novas prioridades", c.money(5)], ["Soma das quatro maiores promessas", c.money(26.5)], ["Diferença sem fonte", c.money(21.5)]],
  },
  {
    id: "c43-fila", caso: 43, location: "sala-situacao-nacional", titulo: "Painel da fila nacional de espera", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "A espera média por especialista no país é de 90 dias. Três gargalos concentram cerca de 60% do tempo perdido: poucos horários de especialista, exames que voltam sem laudo e pacientes que a atenção básica poderia resolver.",
    tabela: () => [["Espera média nacional", "90 dias"], ["Oftalmologia", "150 dias"], ["Ortopedia", "140 dias"], ["Cardiologia", "120 dias"], ["Três gargalos principais", "≈ 60% do tempo perdido"]],
  },

  /* ───── Caso 44 — debate ───── */
  {
    id: "c44-pauta", caso: 44, location: "estudio-debate", titulo: "Pauta do debate", tipo: "documento", confiabilidade: "confirmada", icone: "📑", fonte: SIM,
    texto: "Quatro blocos, 90 segundos por resposta e direito de resposta de 30. No bloco da saúde, o mediador avisa que fará “a pergunta que ninguém quer responder”: a meta da fila nacional que o governo anterior (o seu ministério) prometeu e não cumpriu.",
    tabela: () => [["Bloco 1 — saúde", "fila nacional e financiamento"], ["Bloco 2 — economia", "contas públicas"], ["Tempo por resposta", "90 s"], ["Direito de resposta", "30 s"]],
  },
  {
    id: "c44-dados", caso: 44, location: "sala-situacao-nacional", titulo: "Meta e resultado da fila nacional", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "O painel mostra a meta de espera por especialista, o que foi alcançado e o que funcionou no caminho. Os números são favoráveis em parte — e, em parte, não.",
    tabela: () => [["Meta de espera (prometida)", "60 dias"], ["Resultado alcançado", "90 dias"], ["Mutirões de especialidades", "−12 dias"], ["Telessaúde na atenção básica", "−6 dias"], ["Hospitais prometidos, entregues", "2 de 10"]],
  },
  {
    id: "c44-roteiro", caso: 44, location: "comite-campanha", titulo: "Roteiro de debate da Vivian", tipo: "opiniao", confiabilidade: "opiniao", icone: "🗂️", fonte: SIM,
    texto: "“Regras de ouro: 1) nunca diga ‘não sei’; 2) atacou primeiro, ganhou; 3) a fila é herança maldita; 4) se apertarem, sorria e repita o slogan.” A Vivian jura que funciona. Ela não anexou nenhum número.",
  },

  /* ───── Caso 45 — financiamento de campanha ───── */
  {
    id: "c45-limites", caso: 45, location: "comite-campanha", titulo: "Regras de arrecadação e gastos (resumo didático)", tipo: "documento", confiabilidade: "confirmada", icone: "🧾",
    fonte: { rotulo: "Lei 9.504/1997 (Lei das Eleições) — resumo didático", classificacao: "oficial", url: L9504 },
    texto: () => `Resumo didático: toda doação e todo gasto de campanha precisa ser registrado, com recibo e nota, e entra na prestação de contas à Justiça Eleitoral. Há limites de doação e teto de gastos. O que a campanha arrecadou de forma declarada até agora e o que ela precisa na reta final:`,
    tabela: (c) => [["Doações declaradas de pessoas físicas", c.money(0.5)], ["Recursos do fundo de campanha (simulado)", c.money(0.9)], ["Gastos previstos até a eleição", c.money(2.0)], ["Falta para fechar a conta", c.money(0.6)]],
  },
  {
    id: "c45-oferta", caso: 45, location: "comite-campanha", titulo: "Bilhete do Barão Estevão", tipo: "opiniao", confiabilidade: "opiniao", icone: "📝", fonte: SIM,
    texto: "“Meu caro, cubro a diferença: dinheiro vivo, em duas parcelas, entregue por um motorista de confiança. Recibo? Só de uma parte; o resto fica entre amigos. Depois a gente conversa sobre o que um amigo da democracia merece.” Assinado com um carimbo de coroa.",
  },
  {
    id: "c45-gastos", caso: 45, location: "praca-comicio", titulo: "Planilha de gastos do palco e do som", tipo: "dado", confiabilidade: "confirmada", icone: "🧮", fonte: SIM,
    texto: (c) => `A produção contratou palco gigante, três telões e dez ônibus para o comício final: ${c.money(2.6)} no total. Só ${c.money(2.0)} cabem no orçamento declarado. A diferença de ${c.money(0.6)} está “a combinar” com fornecedores que aceitam pagamento em espécie, sem nota.`,
    tabela: (c) => [["Palco, som e telões", c.money(1.4)], ["Ônibus e alimentação", c.money(0.9)], ["Material gráfico", c.money(0.3)], ["Total contratado", c.money(2.6)], ["Previsto no orçamento declarado", c.money(2.0)], ["Diferença “a combinar”", c.money(0.6)]],
  },

  /* ───── Caso 46 — estratégia final ───── */
  {
    id: "c46-pesquisa", caso: 46, location: "praca-comicio", titulo: "Pesquisa de intenção de voto (simulada)", tipo: "dado", confiabilidade: "confirmada", icone: "📈", fonte: SIM,
    texto: "A pesquisa do cenário mostra empate técnico a uma semana da eleição. Pesquisa é retrato do momento, não previsão: o voto dos indecisos ainda se move, e a margem de erro conta.",
    tabela: () => [["Você", "44%"], ["Adversário principal", "41%"], ["Indecisos e brancos", "15%"], ["Margem de erro", "±2 pontos"]],
  },
  {
    id: "c46-rejeicao", caso: 46, location: "estudio-debate", titulo: "Pesquisa de rejeição: o que afasta o eleitor", tipo: "dado", confiabilidade: "confirmada", icone: "📑", fonte: SIM,
    texto: "Entre os indecisos, a pesquisa qualitativa perguntou por que alguém não votaria em um candidato. As respostas pesam contra marketing vazio e contra briga.",
    tabela: () => [["“Prometem e não explicam como”", "31%"], ["“Só sabem atacar os outros”", "27%"], ["“Não mostram de onde vem o dinheiro”", "22%"], ["“Parece tudo combinado por fora”", "12%"], ["Outros motivos", "8%"]],
  },
  {
    id: "c46-agenda", caso: 46, location: "comite-campanha", titulo: "Propostas de estratégia para a reta final", tipo: "documento", confiabilidade: "incompleta", icone: "📝", fonte: SIM,
    texto: (c) => `A equipe trouxe cinco caminhos, com custo estimado (${c.money(0.7)} a ${c.money(1.5)}): agenda de bairros com plano e contas abertas; campanha tradicional; marketing de impacto; ofensiva contra os adversários; e reforço de caixa por fora com o Barão. Cada um prevê efeitos diferentes sobre o voto — e sobre a rejeição.`,
  },

  /* ───── Caso 47 — posse e prioridades ───── */
  {
    id: "c47-pedidos", caso: 47, location: "palacio-presidencial", titulo: "Os nove pedidos do primeiro dia", tipo: "opiniao", confiabilidade: "incompleta", icone: "✉️", fonte: SIM,
    texto: (c) => `Ministros, governadores e a base trouxeram nove pedidos “urgentes”: obras, reajustes e programas novos. Somados, custam ${c.money(14)} por ano. O orçamento aprovado deixa ${c.money(6)} de folga. Gonçalo propõe “atender um pouquinho de cada”.`,
    tabela: (c) => [["Mutirão de especialidades (ampliar)", c.money(1.5)], ["Telessaúde na atenção básica", c.money(1.0)], ["Reposição de equipes em regiões carentes", c.money(2.0)], ["Hospitais novos (6 obras)", c.money(5.5)], ["Reajuste geral sem contrapartida", c.money(3.0)], ["Outros quatro pedidos", c.money(1.0)]],
  },
  {
    id: "c47-limites", caso: 47, location: "palacio-presidencial", titulo: "Cartilha: o que o cargo pode e o que depende do Congresso", tipo: "documento", confiabilidade: "confirmada", icone: "💼",
    fonte: { rotulo: "Constituição Federal (orçamento e competências do Presidente) e LRF — resumo didático", classificacao: "oficial", url: CF_URL },
    texto: "Resumo didático: o Presidente propõe o orçamento e executa o que o Congresso aprova. Despesa nova e permanente exige fonte e autorização; crédito extraordinário é para imprevisível e urgente, não para pressa política; decreto não cria despesa por conta própria. Governar dentro dos limites é parte da força do cargo.",
  },
  {
    id: "c47-execucao", caso: 47, location: "sala-situacao-nacional", titulo: "Execução e retorno dos programas", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: SIM,
    texto: "Três programas que já existem têm dinheiro parado por falta de execução, e são os que mais encurtam a fila. Inaugurar obra nova leva anos para aliviar alguém.",
    tabela: () => [["Mutirão de especialidades — executado", "41% · −12 dias de fila"], ["Telessaúde — executado", "38% · −6 dias"], ["Reposição de equipes — executado", "55% · −5 dias"], ["Hospitais novos — executado", "12% · efeito só em 4 anos"], ["Reajuste geral", "pedido novo · 0 dia de fila"]],
  },

  /* ───── Caso 48 — legado e prestação de contas ───── */
  {
    id: "c48-balanco", caso: 48, location: "sala-situacao-nacional", titulo: "Balanço do mandato", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "O painel resume o mandato: o que a meta previa e o que foi entregue. Os números mostram avanços reais e metas não cumpridas — as duas coisas são verdade ao mesmo tempo.",
    tabela: () => [["Meta da fila nacional", "60 dias"], ["Cobertura da atenção básica", "meta cumprida"], ["Telessaúde nas regiões carentes", "meta cumprida"], ["Hospitais novos", "meta parcial"], ["Reposição de equipes", "meta parcial"], ["Reajuste com fonte definida", "não cumprida"]],
    dinamico: (c) => { const s = c.state; return s ? `Hoje: fila nacional ${s.pub.filaMin.toFixed(0)} dias · qualidade ${s.pub.qualidade.toFixed(0)}/100 · acesso ${s.pub.acesso.toFixed(0)}/100 · confiança ${s.attrs.confianca.toFixed(0)}/100.` : ""; },
  },
  {
    id: "c48-relatorio", caso: 48, location: "sala-situacao-nacional", titulo: "Minuta do relatório final de gestão", tipo: "documento", confiabilidade: "confirmada", icone: "📄",
    fonte: { rotulo: "Constituição Federal (prestação de contas) — resumo didático", classificacao: "oficial", url: CF_URL },
    texto: "A Ana preparou a minuta: o que foi prometido, o que foi entregue, o que ficou pelo caminho e por quê, com o plano de continuidade para quem vier depois e os dados em formato aberto. A Constituição prevê que o Presidente preste contas ao Congresso; aqui, a minuta vai além e fala com o cidadão.",
    tabela: () => [["Metas cumpridas", "3"], ["Metas parciais", "2"], ["Metas não cumpridas", "2"], ["Plano de continuidade", "incluído"], ["Dados em formato aberto", "incluídos"]],
  },
  {
    id: "c48-pacote", caso: 48, location: "palacio-presidencial", titulo: "Pacote de inaugurações da Vivian", tipo: "opiniao", confiabilidade: "incompleta", icone: "🏛️", fonte: SIM,
    texto: (c) => `Para o último trimestre, a Vivian montou uma turnê de fitas e placas: 14 inaugurações em 40 dias, mais um anúncio de reajuste de ${c.money(3)} sem fonte definida. Nas notas de rodapé: 9 das 14 obras estão com cerca de 70% de execução, sem equipe nem equipamento.`,
    tabela: () => [["Inaugurações previstas", "14"], ["Obras prontas e funcionando", "5"], ["Obras ≈ 70% sem equipe/equipamento", "9"]],
  },
];

/* ───────────────────────── Achados ───────────────────────── */

const achados: FindingDef[] = [
  {
    id: "f43-fonte", caso: 43, a: "c43-promessas", b: "c43-espaco", titulo: "Promessa sem fonte não é plano", autoPorConhecimento: ["regra-fiscal", "prioridade-nacional"],
    texto: (c) => `As quatro maiores promessas somam ${c.money(26.5)}; o espaço fiscal é de ${c.money(5)} por ano. Um plano de verdade escolhe poucas prioridades, dá metas e prazos e diz de onde vem o recurso.`,
  },
  {
    id: "f43-gargalo", caso: 43, a: "c43-fila", b: "c43-promessas", titulo: "Doze promessas, três gargalos", autoPorConhecimento: ["gargalo", "medir-antes"],
    texto: "Três gargalos respondem por cerca de 60% do tempo perdido na fila. As doze promessas espalham o dinheiro em tudo; o dado mostra onde um esforço focado muda mais a vida de quem espera.",
  },
  {
    id: "f44-limite", caso: 44, a: "c44-dados", b: "c44-roteiro", titulo: "O roteiro nega o que os dados mostram", autoPorConhecimento: ["transparencia", "monitoramento-avaliacao"],
    texto: "A meta era 60 dias e a fila está em 90; ainda assim, os mutirões e a telessaúde tiraram 18 dias. O roteiro manda negar e culpar os outros. Admitir o limite e mostrar o que funcionou, em três números, tende a convencer mais — e fica de pé na checagem.",
  },
  {
    id: "f45-caixa2", caso: 45, a: "c45-oferta", b: "c45-gastos", titulo: "A diferença que o Barão cobriria é caixa 2", autoPorConhecimento: ["transparencia", "conflito-interesses"],
    texto: (c) => `Os gastos reais passam do orçamento declarado em ${c.money(0.6)}. É exatamente a “diferença” que o Barão cobriria em dinheiro sem recibo: doação sem registro, o clássico caixa 2. Quem paga por fora costuma cobrar depois.`,
  },
  {
    id: "f45-enxugar", caso: 45, a: "c45-limites", b: "c45-gastos", titulo: "Dá para fechar a conta dentro das regras", autoPorConhecimento: ["custo-total"],
    texto: (c) => `Trocando o palco gigante por um palco médio e cortando metade dos ônibus, a diferença cai de ${c.money(0.6)} para cerca de ${c.money(0.2)}, que cabem em doações declaradas de última hora. Campanha enxuta e com nota fiscal é possível.`,
  },
  {
    id: "f46-eleitor", caso: 46, a: "c46-pesquisa", b: "c46-rejeicao", titulo: "Os indecisos premiam plano e contas abertas", autoPorConhecimento: ["plano-de-governo", "debate-publico"],
    texto: "O empate é decidido por 15% de indecisos. Para eles, o que mais pesa contra um candidato é prometer sem explicar (31%), atacar os outros (27%) e esconder a fonte do dinheiro (22%). Plano claro e transparência valem mais que ataque e slogan.",
  },
  {
    id: "f47-prioridades", caso: 47, a: "c47-pedidos", b: "c47-execucao", titulo: "Executar o que já existe rende mais que inaugurar", autoPorConhecimento: ["prioridade-nacional", "programa-metas"],
    texto: (c) => `Os nove pedidos custam ${c.money(14)}, mais que o dobro da folga de ${c.money(6)}. Os três programas que já existem (mutirão, telessaúde e reposição de equipes) têm dinheiro parado e tiram 23 dias da fila. Acelerar a execução rende mais, e mais cedo, do que hospital novo.`,
  },
  {
    id: "f47-limites", caso: 47, a: "c47-pedidos", b: "c47-limites", titulo: "A maioria dos pedidos esbarra nos limites do cargo", autoPorConhecimento: ["regra-fiscal", "contingenciamento"],
    texto: "Reajuste geral e obras novas criam despesa permanente que exige fonte e aprovação do Congresso. Governar por decreto ou por crédito extraordinário para driblar isso não aumenta o poder: derruba a decisão depois.",
  },
  {
    id: "f48-maquiagem", caso: 48, a: "c48-pacote", b: "c48-relatorio", titulo: "Nove placas, nenhum atendimento", autoPorConhecimento: ["entrega-vs-anuncio", "transparencia"],
    texto: "Das 14 inaugurações, 9 são de obras sem equipe nem equipamento: servem para a foto, não para o paciente. O relatório honesto mostra o que de fato foi entregue, o que falhou e o que continua.",
  },
  {
    id: "f48-continuidade", caso: 48, a: "c48-balanco", b: "c48-relatorio", titulo: "Meta não cumprida vira plano de transição", autoPorConhecimento: ["monitoramento-avaliacao"],
    texto: "O balanço tem três metas cumpridas, duas parciais e duas não cumpridas. Divulgar as duas últimas, com a lição e o plano de continuidade, é o que permite ao sucessor — e ao cidadão — cobrar e dar sequência.",
  },
];

/* ───────────────────────── Conversas ───────────────────────── */

const conversas = [
  /* ───── Caso 43 ───── */
  talk("n7-vivian-abertura", 43, "comite-campanha", "vivian", "O comitê abre as portas", [
    ["feliz", "Candidato(a)! Vivian Prates, coordenação da campanha. A população pediu sua candidatura em abaixo-assinado — foi o único abaixo-assinado do país sem erro de grafia."],
    ["serio", "Você chegou aqui depois de cuidar de UPA, secretaria, consórcio, estado e ministério. Agora o cargo é a Presidência, e a eleição, nesta ficção, é inteiramente simulada. O primeiro passo é o plano de governo."],
    ["irônico", "Eu quero três frases, uma cor e um jingle. A Ministra Helena vai querer uma planilha. Adivinha quem vai ter que ceder?"],
  ], [
    ["Plano primeiro, jingle depois.", ["feliz", "Odeio admitir, mas o jingle fica melhor quando a letra tem assunto. Vai lá, olhe o rascunho e depois fale com a Helena."], { attrs: { competencia: 1 }, rel: { vivian: 3 } }],
    ["Quero as doze promessas, todas.", ["feliz", "Essa é a minha candidata! Digo, o meu candidato! Digo… o(a) nosso(a)."], { rel: { vivian: 5 }, attrs: { caraDePau: 1 } }],
  ], { apresentacao: "3d", auto: true }),
  talk("n7-helena-fonte", 43, "palacio-presidencial", "helena", "A pergunta da fonte", [
    ["serio", "Li o rascunho. Doze promessas e zero fontes. A palavra “prioridade”, na minha repartição, só vem acompanhada de um número e de uma origem."],
    ["preocupado", "Sobram cerca de cinco por cento do orçamento por ano para o que é novo. As quatro maiores promessas custam mais de cinco vezes isso."],
  ], [
    ["Quais são as prioridades que cabem?", ["serio", "Escolha poucas, defina a meta e o prazo, e eu te ajudo a achar a fonte: execução de programas parados, revisão de gastos, calendário de entrega."], { rel: { helena: 5 }, attrs: { competencia: 1 } }],
    ["E se prometermos e depois a gente vê?", ["irritado", "Depois a gente vê vira, em dois anos, “por que não fez?”. Eu não assino conta que não sei de onde sai."], { rel: { helena: -4 } }],
  ]),
  talk("n7-bento-metas", 43, "sala-situacao-nacional", "bento", "Plano é meta", [
    ["feliz", "Que bom te ver de terno novo. Vim só confirmar uma coisa que você já sabe: plano de governo é um contrato com o eleitor. Se não dá para cobrar depois, é folheto."],
    ["serio", "Prioridades, metas com prazo, indicador para medir e fonte do recurso. Quatro itens. Todo o resto é decoração."],
  ], [
    ["Como escolher as prioridades?", ["serio", "Pelo painel da fila: três gargalos respondem por 60% da espera. Comece por onde a vida de mais gente melhora mais depressa."], { rel: { bento: 4 }, attrs: { conhecimento: 1 } }],
    ["O eleitor não liga para indicador.", ["irônico", "Liga para a fila. O indicador é só o nome técnico da fila. Explique em português."], { rel: { bento: 2 } }],
  ]),

  /* ───── Caso 44 ───── */
  talk("n7-claudio-regras", 44, "estudio-debate", "claudio", "As regras do debate", [
    ["neutro", "Cláudio Veiga. Mediador. Noventa segundos por resposta, trinta para direito de resposta. Não tenho candidato favorito; tenho cronômetro."],
    ["serio", "Vou fazer uma pergunta sobre a fila nacional e a meta que o seu ministério não cumpriu. Aviso agora para ninguém dizer que foi emboscada. Foi só uma pergunta."],
  ], [
    ["Pode perguntar. Responderei com números.", ["neutro", "Isso me poupa de interromper. Mas se o número vier errado, o telespectador vai querer saber."], { attrs: { confianca: 1 }, rel: { claudio: 4 } }],
    ["Prefiro falar do futuro, não do passado.", ["irônico", "O futuro é ótimo, mas o passado está na pauta. Eu insisto com educação. Depois, sem."], { rel: { claudio: -2 } }],
  ], { apresentacao: "3d" }),
  talk("n7-vivian-roteiro", 44, "comite-campanha", "vivian", "O roteiro de ouro", [
    ["feliz", "Treinei você para três perguntas: fila, dinheiro e herança. Em todas, a resposta é sorrir, atacar e culpar quem veio antes."],
    ["irônico", "Dizer “a meta não foi cumprida” em rede nacional? Isso não está no manual, e eu escrevi o manual."],
  ], [
    ["E se os números me contradisserem?", ["serio", "Aí a imprensa checa e vira manchete. Tá bom, tá bom. Eu odeio quando você tem razão."], { rel: { vivian: 1 }, attrs: { competencia: 1 } }],
    ["Vou seguir seu roteiro à risca.", ["feliz", "Perfeito! Sorrir, atacar, culpar. Nunca falha. Exceto quando falha."], { rel: { vivian: 5 }, attrs: { caraDePau: 1 } }],
  ]),
  talk("n7-ana-checagem", 44, "sala-situacao-nacional", "ana", "A checagem dos números", [
    ["serio", "Conferi os números do debate. A meta era 60 dias e estamos em 90. O mutirão tirou 12 e a telessaúde, 6. Dos dez hospitais prometidos, dois foram entregues."],
    ["preocupado", "Se você disser que cumpriu a meta, a checagem sai antes de o programa acabar. Se admitir e explicar, tem uma chance de ser ouvido."],
  ], [
    ["Dá para dizer isso em 90 segundos?", ["feliz", "Dá: meta, resultado, o que funcionou e o que muda. Três números e uma frase. Eu treino com você."], { rel: { ana: 5 }, attrs: { competencia: 1 } }],
    ["Prefiro não citar o número dos hospitais.", ["serio", "Se o mediador citar, você perde dos dois lados. É melhor chegar primeiro com a verdade."], { rel: { ana: -1 } }],
  ]),

  /* ───── Caso 45 ───── */
  talk("n7-estevao-oferta", 45, "comite-campanha", "estevao", "O apoio generoso do Barão", [
    ["feliz", "Meu caro(a) candidato(a)! Barão Estevão, amigo da democracia, de dez ou doze partidos e de nenhuma fiscalização. Vim ajudar."],
    ["irônico", "Soube que a conta do comício não fecha. Eu fecho. Dinheiro vivo, motorista de confiança, recibo só de um lado. O lado do recibo, o senhor(a) escolhe."],
    ["feliz", "Em troca, nada. Digo, quase nada. Uma audiência aqui, um contrato ali, no futuro. Amizade, não é?"],
  ], [
    ["Agradeço, mas não aceito dinheiro sem recibo.", ["serio", "Que pena. Vai ficar sem palco. Os amigos da democracia choram, mas entendem. Alguns."], { attrs: { confianca: 2 }, rel: { estevao: -8 } }],
    ["Interessante. Quanto seria?", ["feliz", "Sabia que éramos parecidos. Seiscentos por cento da sua necessidade, em duas parcelas. Eu ponho a coroa na mesa."], { rel: { estevao: 6 }, attrs: { caraDePau: 2 } }],
  ], { apresentacao: "3d" }),
  talk("n7-valdemar-recibo", 45, "comite-campanha", "valdemar", "O vocabulário da campanha", [
    ["serio", "Posso traduzir? “Doação estimável em dinheiro com recibo eleitoral” é quando alguém te dá algo e escreve que deu. “Recursos de origem não identificada” é quando alguém te dá algo e escreve que não deu."],
    ["irônico", "A segunda categoria, na prática, tem outro nome, que não cabe em santinho: caixa 2."],
  ], [
    ["E a consequência de aceitar?", ["serio", "Contas desaprovadas, processos e uma campanha inteira cujo resultado pode ser questionado. Na vida real, quem fiscaliza é a Justiça Eleitoral; aqui, é a ficção quem lembra."], { attrs: { conhecimento: 1 }, rel: { valdemar: 3 } }],
    ["Dá para dar um jeito de “arredondar”?", ["irônico", "Dá. Dá muito. E dá em investigação. Não recomendo."], { rel: { valdemar: -2 } }],
  ]),
  talk("n7-ana-prestacao", 45, "sala-situacao-nacional", "ana", "A prestação de contas da campanha", [
    ["serio", "Toda campanha presta contas: quem doou, quanto, quem recebeu pagamento e por quê. Se o número não bate com a nota, a conta é desaprovada."],
    ["feliz", "A boa notícia: dá para enxugar o comício e fechar com doações declaradas. A má: ninguém vai usar o palco gigante."],
  ], [
    ["Prefiro um palco menor e uma conta limpa.", ["feliz", "Palco menor, microfone melhor, plateia igual. Pode apostar que ninguém sente falta do telão."], { rel: { ana: 6 }, attrs: { confianca: 1 } }],
    ["E se a gente deixar a prestação para depois da eleição?", ["serio", "Aí a gente chega no dia da eleição com uma pergunta aberta e um dossiê esperando. Não é uma boa ideia."], { rel: { ana: -2 } }],
  ]),

  /* ───── Caso 46 ───── */
  talk("n7-celia-praca", 46, "praca-comicio", "celia", "A voz da praça", [
    ["feliz", "Olha quem está aqui! Eu te conheci quando você ainda cuidava da UPA. Hoje o povo me pede para perguntar se é verdade que o senhor(a) é de confiança."],
    ["serio", "A gente já viu muita gente bonita no palanque. O que a gente quer é saber se o plano é de verdade e se o dinheiro é limpo."],
  ], [
    ["Vou mostrar o plano e as contas, de bairro em bairro.", ["feliz", "Isso eu levo para a associação inteira. Mostrar a conta é o melhor jingle que tem."], { attrs: { confianca: 2, popularidade: 1 }, rel: { celia: 6 } }],
    ["Vou fazer o maior comício da história.", ["irônico", "Comício é ótimo. Mas eu pergunto: depois do show, o que muda na fila?"], { rel: { celia: -1 } }],
  ]),
  talk("n7-vivian-estrategia", 46, "comite-campanha", "vivian", "A última semana", [
    ["serio", "Sete dias. Empate técnico. Eu tenho cinco estratégias na mesa e uma coragem: dizer qual eu escolheria. Mas é você quem assina."],
    ["irônico", "Minha preferida é a que tem dança no jingle. Eu sei, eu sei: o eleitor também lê pesquisa. A de rejeição está na pasta do estúdio."],
  ], [
    ["Vou olhar a pesquisa de rejeição antes de decidir.", ["feliz", "Boa. E o que a pesquisa diz é incômodo: o povo não aguenta mais promessa sem explicação."], { attrs: { competencia: 1 }, rel: { vivian: 3 } }],
    ["Vamos de ataque. Eles merecem.", ["feliz", "Ah, eu adoro quando você fala assim. Eu só não adoro quando a pesquisa discorda."], { rel: { vivian: 4 }, attrs: { caraDePau: 1 } }],
  ]),
  talk("n7-estevao-caixa2", 46, "comite-campanha", "estevao", "O convite final", [
    ["feliz", "Meu caro(a)! Reta final. Um reforço de caixa muda tudo: impulsionamento, cabos eleitorais, uma carreata de arrasar."],
    ["irônico", "Seis pontos de voto, garantidos. Recibo? Aquele de sempre: só de um lado. Depois que o senhor(a) vencer, ninguém vai perguntar de onde veio."],
  ], [
    ["Minha resposta continua sendo não.", ["serio", "Então eu rezo para que a pesquisa o(a) trate bem. Eu rezo muito pouco, para ser sincero."], { attrs: { confianca: 2 }, rel: { estevao: -6 } }],
    ["Preciso de um empurrão. Aceito.", ["feliz", "Pronto! Os motoristas já estão chegando. Pode chamar de ‘doação voluntária de amigo’."], { rel: { estevao: 6 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 47 ───── */
  talk("n7-augusto-transicao", 47, "palacio-presidencial", "augusto", "A passagem da faixa", [
    ["feliz", "Parabéns, Presidente. Sentou-se na cadeira mais desconfortável do país. É de couro, mas os assuntos são de lixa."],
    ["serio", "Recebo o senhor(a) com três conselhos: o orçamento é do Congresso, a execução é sua, e o povo percebe a diferença entre anúncio e entrega antes do que você pensa."],
    ["irônico", "Há nove pedidos na sua mesa. Todos “urgentes”. Quando tudo é urgente, nada é prioridade."],
  ], [
    ["Vou escolher poucas prioridades e dar metas.", ["feliz", "Faça isso e a coalizão vai reclamar na primeira semana e ajudar na primeira votação importante. Conheço o ciclo."], { attrs: { competencia: 1 }, rel: { augusto: 5 } }],
    ["Vou atender todo mundo um pouquinho.", ["irônico", "Muita gente contente, ninguém entregue. É a política do cobertor curto, e eu usei por três anos."], { rel: { augusto: -2 } }],
  ], { apresentacao: "3d" }),
  talk("n7-goncalo-base", 47, "palacio-presidencial", "goncalo", "O pacote da base", [
    ["feliz", "Presidente! Gonçalo Bastos, tamo junto. Tenho um pacote: um pouquinho de cada pedido, e a base vota tudo que o senhor(a) mandar."],
    ["irônico", "Algumas obras, alguns cargos, um ajuste aqui, uma contribuição amiga ali. Nada de mais. Só o jeito de sempre."],
  ], [
    ["Prefiro negociar prioridade por prioridade, abertamente.", ["serio", "Mais lento, mais barulhento. A base se acostuma, mas reclama primeiro."], { attrs: { confianca: 1, persuasao: 1 }, rel: { goncalo: -3 } }],
    ["Pacote fechado, então.", ["feliz", "Sabia que o senhor(a) entendia de política! Tamo junto!"], { rel: { goncalo: 6 }, attrs: { rede: 1 } }],
  ]),
  talk("n7-helena-limites", 47, "palacio-presidencial", "helena", "Os limites do cargo", [
    ["serio", "Presidente, a regra é simples: quem cria despesa permanente aponta a fonte. Decreto não cria despesa por conta própria, e crédito extraordinário é para imprevisível e urgente, não para pressa."],
    ["preocupado", "Se o senhor(a) tentar governar por atalho, o Congresso derruba e o Tribunal de Contas anota. Se governar dentro da regra, todo mundo reclama de manhã e vota à tarde."],
  ], [
    ["Entendi. Vou negociar o orçamento com o Congresso.", ["feliz", "Ótimo. Eu levo as planilhas e a paciência. A paciência, empresto."], { rel: { helena: 5 }, attrs: { competencia: 1 } }],
    ["E se eu usar uma medida provisória?", ["serio", "Se for urgente e relevante, tudo bem. Se for só conveniente, é um convite a litígio."], { rel: { helena: 1 } }],
  ]),

  /* ───── Caso 48 ───── */
  talk("n7-bento-legado", 48, "sala-situacao-nacional", "bento", "O que fica", [
    ["feliz", "Chegamos ao fim da carreira. Do estoque da UPA ao painel nacional, você aprendeu que gestão pública é feita de um número, um critério e uma assinatura."],
    ["serio", "O último desafio é a prestação de contas. Não é um discurso; é um documento. E é o que o sucessor vai ler, e o cidadão também."],
  ], [
    ["O que um bom relatório precisa ter?", ["serio", "Meta, resultado, o que falhou, por que falhou e o que continua. E dados abertos, para qualquer um conferir."], { rel: { bento: 5 }, attrs: { conhecimento: 1 } }],
    ["Posso deixar para o próximo governo.", ["irônico", "Pode. Mas aí o próximo governo vai contar a história por você, e ele nunca é gentil."], { rel: { bento: -2 } }],
  ], { apresentacao: "3d" }),
  talk("n7-guardiao-contas", 48, "sala-situacao-nacional", "guardiao", "A última conta", [
    ["serio", "Presidente. Eu guardei o cofre de uma UPA, de uma secretaria, de um consórcio e agora do país. A chave só mudou de tamanho."],
    ["irônico", "Se o relatório sair com todas as metas verdes, eu assino embaixo. Se tiver uma vermelha explicada, eu assino em cima, com caneta melhor."],
  ], [
    ["Vou mostrar as metas verdes e as vermelhas.", ["feliz", "Pela primeira vez em muito tempo, eu abro um cofre e sorrio."], { rel: { guardiao: 6 }, attrs: { confianca: 1 } }],
    ["Vou mostrar só o que for bom.", ["irônico", "As planilhas não mentem, Presidente. Só os discursos que as citam."], { rel: { guardiao: -3 } }],
  ]),
  talk("n7-augusto-despedida", 48, "palacio-presidencial", "augusto", "A despedida", [
    ["serio", "Eu deixei a cadeira com contas abertas e algumas promessas penduradas. O senhor(a) está para deixar a sua. Faça melhor do que eu: deixe a janela aberta para quem vem depois."],
    ["feliz", "A Vivian trouxe uma turnê de inaugurações. É bonita. Mas placa não atende ninguém."],
  ], [
    ["Prefiro entregar o relatório completo.", ["feliz", "É a melhor herança que um governante pode deixar: dados que qualquer um pode conferir."], { rel: { augusto: 5 }, attrs: { competencia: 1 } }],
    ["Uma turnê vai bem para a minha imagem.", ["irônico", "Vai. Por seis meses. Depois a imagem desce com o hospital que não abriu."], { rel: { augusto: -2 } }],
  ]),
];

/* ───────────────────────── Decisões ───────────────────────── */

const decisoes: DecisionDef[] = [
  /* ───────── D43 — plano de governo ───────── */
  {
    id: "d43", caso: 43, mesa: "comite-campanha", titulo: "O plano de governo", conceito: "plano-de-governo", basePct: 3, gestoPadrao: "assinar",
    papelAssinado: "PLANO DE GOVERNO — registro da candidatura (ficção) — documento fictício",
    pergunta: "O plano de governo é o seu primeiro compromisso público. Há doze promessas bonitas, pouco espaço fiscal e um painel que mostra onde o país mais espera. Que plano você registra?",
    opcoes: [
      opt({ id: "plano-metas-fonte", rotulo: "Registrar um plano com 3 prioridades, metas com prazo e fonte de recursos", kind: "competente", resumo: "Poucas prioridades, indicadores públicos e a origem do dinheiro de cada uma.",
        requer: { achado: "f43-fonte", dica: "Compare a soma das promessas com o espaço fiscal informado pela Fazenda." },
        custo: m(0.6), prazo: "3 semanas até o registro", ganho: () => "Um compromisso que o eleitor consegue cobrar",
        riscos: [{ texto: "Menos promessas significa menos manchete" }, { texto: "A Vivian vai reclamar do jingle" }],
        custoPct: 0.6, aplica: ["plano-de-governo", "planejamento-necessidade", "custo-total"], conquista: "n7-plano-com-fonte",
        efeitos: { attrs: { competencia: 5, confianca: 4, persuasao: 1, popularidade: 1 }, pub: { sustentabilidade: 3, acesso: 1 }, filaMin: -3, rel: { helena: 8, bento: 5, vivian: -2 } },
        depois: [{ depois: 2, efeitos: { attrs: { confianca: 3, popularidade: 2 }, pub: { qualidade: 2, acesso: 2 }, filaMin: -3, caixaPct: 0.3 }, titulo: "O plano virou cobrança", mensagem: "Governadores e prefeitos começaram a usar as suas três metas como referência, e a fila começou a mexer antes mesmo da eleição.", motivo: "Metas claras e financiadas orientam quem executa.", tom: "bom" }],
        narracao: "Vivian lê as três prioridades e suspira: “É… dá para fazer um jingle de três versos.” Helena rubrica sem dizer uma palavra, o que é o maior elogio possível." }),
      opt({ id: "plano-enxuto", rotulo: "Registrar um plano curto de diretrizes, com metas só para o primeiro ano", kind: "prudente", resumo: "Lista de intenções objetivas, sem detalhar a fonte de cada uma.",
        custo: m(0.4), prazo: "2 semanas", riscos: [{ texto: "Metas só no primeiro ano deixam o restante em aberto" }, { texto: "Fonte de recursos continua vaga" }],
        custoPct: 0.4, aplica: ["plano-de-governo"], efeitos: { attrs: { competencia: 2, confianca: 1, popularidade: 1 }, pub: { sustentabilidade: 1 }, rel: { helena: 2 } },
        narracao: "O plano sai curto, correto e sem graça. Ninguém comemora; ninguém contesta." }),
      opt({ id: "doze-promessas", rotulo: "Registrar as doze promessas e deixar a Vivian cuidar do slogan", kind: "comodo", resumo: "Prometer tudo para todos e resolver depois.",
        custo: m(0.3), prazo: "Imediato", riscos: [{ texto: "As quatro maiores promessas somam mais que o espaço fiscal", precisa: "c43-espaco" }, { texto: "A conta chega depois da posse" }],
        custoPct: 0.3, aliado: "vivian", efeitos: { attrs: { popularidade: 5, persuasao: 2, competencia: -2 }, rel: { vivian: 8, helena: -6 } },
        depois: [{ depois: 2, efeitos: { attrs: { confianca: -4, popularidade: -2 }, pub: { sustentabilidade: -3 }, caixaPct: -0.3 }, titulo: "A conta das promessas", mensagem: "Economistas e jornalistas somaram as promessas: 26,5% do orçamento, sem fonte. As manchetes ficaram menos simpáticas.", motivo: "Promessa sem fonte vira cobrança sem resposta.", tom: "ruim" }],
        narracao: "O slogan é lindo: “Brasil Feliz Já!”. A planilha está em outro andar, onde ninguém vai." }),
      opt({ id: "adiar-plano", rotulo: "Adiar o plano: “o povo já me conhece”", kind: "fraco", resumo: "Registrar a candidatura sem apresentar propostas detalhadas.",
        custo: m(0.1), prazo: "Imediato", riscos: [{ texto: "Sem plano, o debate vai cobrar com pergunta" }],
        custoPct: 0.1, efeitos: { attrs: { competencia: -2, popularidade: -2, confianca: -2 }, rel: { bento: -4, helena: -3 } },
        narracao: "A frase “o povo já me conhece” entra em três memes antes do almoço." }),
      opt({ id: "plano-do-barao", rotulo: "Incluir no plano as obras da construtora do Barão e cobrar “consultoria”", kind: "desvio", resumo: "Escrever o plano para encaixar contratos de um amigo e receber um percentual por fora.",
        custo: m(1.8), prazo: "3 semanas", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "O plano passa a servir a um fornecedor, não ao eleitor" }],
        custoPct: 1.8, aliado: "estevao", desvio: DEV("Cobrar “consultoria” para incluir as obras do Barão", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 12, influencia: 6, evidencias: 2, rel: { estevao: 8, helena: -6, bento: -4 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { sustentabilidade: -3 } }, titulo: "O plano com endereço certo", mensagem: "Jornalistas notaram que as obras do plano coincidem com os contratos de uma única empreiteira.", motivo: "Plano desenhado para favorecer um fornecedor.", tom: "ruim" }],
        narracao: "O Barão aprova o capítulo de infraestrutura com um sorriso que mostra dentes demais." }),
    ],
  },

  /* ───────── D44 — debate ───────── */
  {
    id: "d44", caso: 44, mesa: "comite-campanha", titulo: "A pergunta da fila", conceito: "debate-publico", basePct: 0, gestoPadrao: "esclarecer",
    papelAssinado: "ESTRATÉGIA DE RESPOSTA NO DEBATE — documento fictício",
    pergunta: "O mediador vai perguntar por que a fila nacional ficou em 90 dias se a meta era 60. Como você responde diante do país?",
    opcoes: [
      opt({ id: "debate-numeros", rotulo: "Reconhecer que a meta não foi cumprida e mostrar o que funcionou e o que muda", kind: "competente", resumo: "Três números e uma promessa realista: meta, resultado e próximo passo.",
        custo: m(0.3), prazo: "Preparar em uma semana", ganho: () => "Credibilidade: o eleitor ouve quem admite o limite",
        riscos: [{ texto: "Admitir o limite dá munição ao adversário" }, { texto: "Exige ensaio para caber em 90 segundos" }],
        custoPct: 0.3, aplica: ["debate-publico", "transparencia"], conquista: "n7-debate-com-dados",
        efeitos: { attrs: { confianca: 6, competencia: 4, persuasao: 3, popularidade: 2 }, pub: { acesso: 1 }, filaMin: -2, rel: { claudio: 8, ana: 5, vivian: -4 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: 3, popularidade: 3 }, pub: { qualidade: 1 } }, titulo: "O trecho que viralizou (do bom)", mensagem: "O corte do seu “a meta era 60, estamos em 90 e eis o que muda” foi compartilhado milhões de vezes — inclusive por quem não votaria em você.", motivo: "Dados e franqueza geram confiança.", tom: "bom" }],
        narracao: "Cláudio ergue as sobrancelhas, um centímetro, e anota algo. No bloco seguinte, ele elogia a precisão — ou o que, para ele, equivale a um aplauso." }),
      opt({ id: "debate-tecnico", rotulo: "Responder tecnicamente, falando só das metas futuras", kind: "prudente", resumo: "Evitar o número do passado e falar dos próximos passos.",
        custo: m(0.2), prazo: "Preparar em uma semana", riscos: [{ texto: "O mediador pode insistir na pergunta" }],
        custoPct: 0.2, aplica: ["debate-publico"], efeitos: { attrs: { competencia: 2, confianca: 1 }, rel: { claudio: 1 } },
        narracao: "A resposta é correta, precisa e dura 88 segundos. Ninguém se lembra dela no dia seguinte." }),
      opt({ id: "debate-culpar", rotulo: "Culpar o governo anterior e mudar de assunto", kind: "comodo", resumo: "Seguir o roteiro da Vivian: atacar primeiro e sorrir.",
        custo: m(0.1), prazo: "Imediato", riscos: [{ texto: "A checagem de dados vai desmentir", precisa: "c44-dados" }],
        custoPct: 0.1, aliado: "vivian", efeitos: { attrs: { popularidade: 3, persuasao: 2, confianca: -3, competencia: -1 }, rel: { vivian: 6, claudio: -4, ana: -4 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: -4, popularidade: -1 } }, titulo: "A checagem chegou antes do jantar", mensagem: "Agências de checagem mostraram que o seu ministério ocupava a cadeira quando a meta foi definida. O clipe virou piada.", motivo: "A culpa terceirizada não resistiu aos dados.", tom: "ruim" }],
        narracao: "A plateia aplaude. A internet não." }),
      opt({ id: "debate-fugir", rotulo: "Ignorar a pergunta e repetir o slogan", kind: "fraco", resumo: "Repetir “Brasil Feliz Já!” até acabar o tempo.",
        custo: m(0.1), prazo: "Imediato", riscos: [{ texto: "O mediador marca a fuga ao vivo" }],
        custoPct: 0.1, efeitos: { attrs: { confianca: -4, persuasao: -2, popularidade: -1 }, rel: { claudio: -8, ana: -3 } },
        narracao: "Cláudio repete a pergunta duas vezes. Na terceira, o cronômetro faz o resto." }),
    ],
  },

  /* ───────── D45 — financiamento de campanha ───────── */
  {
    id: "d45", caso: 45, mesa: "comite-campanha", titulo: "O recibo de um lado só", conceito: "financiamento-campanha", basePct: 3, gestoPadrao: "recusar",
    papelAssinado: "DECISÃO SOBRE O FINANCIAMENTO DA CAMPANHA — documento fictício",
    pergunta: "A conta do comício não fecha, e o Barão Estevão oferece cobrir a diferença em dinheiro, com recibo só de um lado. O que você decide?",
    opcoes: [
      opt({ id: "campanha-limpa", rotulo: "Recusar o dinheiro sem recibo, enxugar o comício e prestar contas de tudo", kind: "competente", resumo: "Fechar a conta dentro das regras: doações declaradas, palco menor e prestação de contas aberta.",
        requer: { achado: "f45-caixa2", dica: "Compare o bilhete do Barão com a planilha de gastos do palco." },
        custo: m(0.8), prazo: "1 semana", ganho: () => "Campanha com contas que qualquer um pode conferir",
        riscos: [{ texto: "Comício menor, menos imagem" }, { texto: "O Barão deixa de ser amigo" }],
        custoPct: 0.8, aplica: ["financiamento-campanha", "transparencia", "controle-interno", "conflito-interesses"], conquista: "n7-recibo-dos-dois-lados",
        efeitos: { attrs: { confianca: 5, competencia: 4, persuasao: 1, popularidade: 1 }, pub: { sustentabilidade: 2 }, rel: { ana: 8, valdemar: 4, estevao: -10, vivian: -2 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: 4, popularidade: 2 }, pub: { sustentabilidade: 1 }, caixaPct: 0.2 }, titulo: "Contas publicadas e conferidas", mensagem: "A prestação parcial da sua campanha foi publicada com doadores, valores e fornecedores. Quem foi conferir encontrou notas onde esperava buracos.", motivo: "Transparência desde o primeiro recibo.", tom: "bom" }],
        narracao: "Ana risca a linha “diferença a combinar” com um sorriso. O Barão deixa a sala com a coroa sob o braço." }),
      opt({ id: "so-declaradas", rotulo: "Aceitar só doações declaradas e reduzir a campanha ao mínimo", kind: "prudente", resumo: "Cortar o comício final e ficar com o que já foi arrecadado.",
        custo: m(0.4), prazo: "Imediato", riscos: [{ texto: "Campanha apagada na reta final" }, { texto: "Menos visibilidade" }],
        custoPct: 0.4, aplica: ["financiamento-campanha"], efeitos: { attrs: { competencia: 2, confianca: 2, popularidade: -2 }, rel: { ana: 3, estevao: -4, vivian: -4 } },
        narracao: "O comício vira uma reunião de bairro. Os que foram gostaram; os que não foram, nem souberam." }),
      opt({ id: "nao-olhar", rotulo: "Deixar a Vivian cuidar do dinheiro e não perguntar de onde vem", kind: "comodo", resumo: "Fingir que não sabe de onde vem o dinheiro.",
        custo: m(0.3), prazo: "Imediato", riscos: [{ texto: "Quem não pergunta é, ao menos, responsável por não perguntar", precisa: "c45-oferta" }],
        custoPct: 0.3, aliado: "vivian", efeitos: { attrs: { popularidade: 3, confianca: -3, competencia: -2 }, evidencias: 1, rel: { vivian: 6, ana: -6 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: -4 }, pub: { sustentabilidade: -3 } }, titulo: "A origem apareceu", mensagem: "Jornalistas notaram pagamentos em espécie a fornecedores do comício. Você disse que “não sabia”. A pergunta virou manchete.", motivo: "Desconhecer a origem não afasta a responsabilidade.", tom: "ruim" }],
        narracao: "O comício acontece com palco gigante e uma pergunta pequena que ninguém quer fazer." }),
      opt({ id: "contas-depois", rotulo: "Deixar a prestação de contas para depois da eleição", kind: "fraco", resumo: "Adiar a transparência até o resultado sair.",
        custo: m(0.1), prazo: "Imediato", riscos: [{ texto: "O eleitor vota sem saber quem financia a campanha" }],
        custoPct: 0.1, efeitos: { attrs: { confianca: -3, competencia: -2, popularidade: -1 }, rel: { ana: -5, valdemar: -2 } },
        narracao: "“Depois eu publico” vira a frase que o adversário mais repete." }),
      opt({ id: "caixa-paralelo", rotulo: "Aceitar o caixa paralelo do Barão", kind: "desvio", resumo: "Receber o dinheiro sem recibo e ficar com uma parte.",
        custo: m(1.4), prazo: "2 dias", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Caixa 2 compromete a eleição e cria dívida com o Barão" }],
        custoPct: 1.4, aliado: "estevao", conquista: "n7-recibo-de-um-lado-so",
        desvio: DEV("Aceitar o caixa paralelo do Barão", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 14, influencia: 6, evidencias: 3, rel: { estevao: 10, ana: -8, valdemar: -4 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 1, efeitos: { evidencias: 2, attrs: { confianca: -3 } }, titulo: "Um motorista falou demais", mensagem: "O motorista das sacolas comentou o roteiro com um barman. O barman comentou com um repórter.", motivo: "Dinheiro sem recibo deixa rastro de gente.", tom: "ruim" }],
        narracao: "As sacolas chegam em duas parcelas. O Barão ri; o recibo, não aparece." }),
    ],
  },

  /* ───────── D46 — estratégia final / eleição ───────── */
  {
    id: "d46", caso: 46, mesa: "comite-campanha", titulo: "A estratégia da reta final", conceito: "eleicao-limites", basePct: 3, gestoPadrao: "assinar", eleicao: true,
    papelAssinado: "ESTRATÉGIA FINAL DE CAMPANHA — eleição simulada — documento fictício",
    pergunta: "A pesquisa mostra empate técnico a uma semana da votação. A apuração desta ficção depende de como você chega até aqui — e do que decide agora. Que estratégia final você adota?",
    opcoes: [
      opt({ id: "reta-plano", rotulo: "Agenda de bairros com plano, metas e contas abertas", kind: "competente", resumo: "Sabatinas, painel de transparência da campanha e foco nos gargalos do plano.",
        custo: m(1.0), prazo: "7 dias", ganho: () => "Confiança dos indecisos, que pesam mais que o ataque",
        riscos: [{ texto: "Menos espetáculo na TV" }, { texto: "Exige disciplina de agenda" }],
        custoPct: 1.0, votos: 3, aplica: ["eleicao-limites", "plano-de-governo", "debate-publico", "financiamento-campanha"], conquista: "n7-eleicao-limpa",
        efeitos: { attrs: { confianca: 4, popularidade: 3, persuasao: 2 }, pub: { acesso: 1 }, rel: { celia: 6, vivian: -2, claudio: 3 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: 2, popularidade: 2 }, pub: { sustentabilidade: 1 } }, titulo: "A eleição foi ganha na conversa", mensagem: "Quem chegou indeciso na última semana citou o plano e a prestação de contas aberta como motivo do voto.", motivo: "Plano e transparência convenceram os indecisos.", tom: "bom" }],
        narracao: "Dona Célia assina a lista de presença em sete bairros. Vivian filma tudo, resmungando que não tem coreografia." }),
      opt({ id: "reta-tradicional", rotulo: "Campanha tradicional: comícios, carreatas e horário eleitoral", kind: "prudente", resumo: "Repetir o que sempre se faz, sem riscos novos.",
        custo: m(1.2), prazo: "7 dias", riscos: [{ texto: "Difícil se destacar em um empate técnico" }],
        custoPct: 1.2, votos: 1, aplica: ["eleicao-limites"], efeitos: { attrs: { popularidade: 3, persuasao: 1 }, rel: { vivian: 3 } },
        narracao: "As carreatas saem. Os santinhos voltam. O resultado depende do resto." }),
      opt({ id: "reta-vazia", rotulo: "Marketing vazio: jingle, dancinha e slogan, sem proposta", kind: "comodo", resumo: "Apostar em emoção e repetição.",
        custo: m(0.9), prazo: "5 dias", riscos: [{ texto: "31% dos indecisos rejeitam promessa sem explicação", precisa: "c46-rejeicao" }],
        custoPct: 0.9, votos: -2, aliado: "vivian", efeitos: { attrs: { popularidade: 3, persuasao: 1, confianca: -2 }, rel: { vivian: 6, celia: -3 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: -3 } }, titulo: "O jingle grudou, o plano não", mensagem: "O jingle é o mais cantado do país. Quando perguntam o que ele propõe, a resposta é outro refrão.", motivo: "Marketing sem conteúdo não convence o indeciso.", tom: "ruim" }],
        narracao: "A dancinha tem cinco milhões de visualizações. O eleitor sabe a coreografia; não sabe a proposta." }),
      opt({ id: "reta-ataque", rotulo: "Atacar os adversários com o dossiê da Vivian", kind: "fraco", resumo: "Gastar a última semana em acusações e contra-acusações.",
        custo: m(0.7), prazo: "5 dias", riscos: [{ texto: "27% dos indecisos rejeitam quem só sabe atacar", precisa: "c46-rejeicao" }],
        custoPct: 0.7, votos: -4, aliado: "vivian", efeitos: { attrs: { popularidade: 1, confianca: -5, persuasao: -1 }, rel: { vivian: 4, celia: -5, claudio: -3 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: -3, popularidade: -2 } }, titulo: "A guerra de dossiês", mensagem: "Os adversários responderam em dobro. O eleitor cansou dos dois lados.", motivo: "Ataque gera ataque e afasta o indeciso.", tom: "ruim" }],
        narracao: "O dossiê vaza no domingo. A resposta chega na segunda. O país assiste de pipoca na mão." }),
      opt({ id: "reta-caixa2", rotulo: "Usar o caixa 2 do Barão para impulsionamento e cabos eleitorais", kind: "desvio", resumo: "Reforçar a reta final com dinheiro sem recibo e ficar com uma parte.",
        custo: m(1.6), prazo: "3 dias", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Vitória sob suspeita e dívida com o Barão" }],
        custoPct: 1.6, votos: 6, aliado: "estevao", desvio: DEV("Usar e desviar parte do caixa 2 do Barão", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 14, influencia: 7, evidencias: 3, rel: { estevao: 10, celia: -6, ana: -6 }, attrs: { rede: 4, caraDePau: 3 } },
        depois: [{ depois: 1, efeitos: { evidencias: 2, attrs: { confianca: -4 } }, titulo: "A vitória que veio com recibo de um lado", mensagem: "A apuração foi concluída — e as sacolas apareceram no noticiário no mesmo dia.", motivo: "Dinheiro por fora compra voto no curto prazo e dívida no longo.", tom: "ruim" }],
        narracao: "Os cabos eleitorais aparecem de uniforme novo. O Barão aparece de coroa nova." }),
    ],
  },

  /* ───────── D47 — posse e prioridades ───────── */
  {
    id: "d47", caso: 47, mesa: "comite-campanha", titulo: "A faixa e a conta", conceito: "posse-prioridades", basePct: 4, gestoPadrao: "assinar",
    papelAssinado: "MENSAGEM PRESIDENCIAL — PRIORIDADES DO PRIMEIRO ANO — documento fictício",
    pergunta: "Você tomou posse. Nove pedidos “urgentes” custam mais que o dobro da folga do orçamento, e o Congresso decide parte do que você quer. Como definir e sustentar as prioridades?",
    opcoes: [
      opt({ id: "tres-prioridades", rotulo: "Escolher 3 prioridades com metas, acelerar os programas existentes e negociar o orçamento abertamente", kind: "competente", resumo: "Mutirão, telessaúde e reposição de equipes, com metas públicas e diálogo no Congresso.",
        requer: { achado: "f47-prioridades", dica: "Compare os nove pedidos com a execução e o retorno dos programas existentes." },
        custo: m(2.2), prazo: "6 meses para os primeiros resultados", ganho: m(0.5), economiaPct: 5,
        riscos: [{ texto: "Seis pedidos ficam para depois e os autores reclamam" }, { texto: "Depende da aprovação do orçamento no Congresso" }],
        custoPct: 2.2, aplica: ["posse-prioridades", "planejamento-necessidade", "custo-total"], conquista: "n7-prioridade-com-limite",
        efeitos: { attrs: { competencia: 6, confianca: 3, persuasao: 2 }, pub: { acesso: 5, qualidade: 3, sustentabilidade: 2, equipe: 2 }, filaMin: -10, rel: { augusto: 6, helena: 6, goncalo: -3 } },
        depois: [
          { depois: 1, efeitos: { filaMin: -8, pub: { acesso: 4, qualidade: 2 }, caixaPct: 0.5 }, titulo: "A fila começou a encurtar", mensagem: "O mutirão e a telessaúde, agora com dinheiro executado, tiraram semanas da espera média nacional.", motivo: "Você sustentou poucas prioridades dentro dos limites.", tom: "bom" },
          { depois: 2, efeitos: { attrs: { confianca: 3, popularidade: 2 }, pub: { equipe: 2 } }, titulo: "A base aprendeu a negociar à luz do dia", mensagem: "O orçamento passou no Congresso com emendas discutidas em reunião aberta. Reclamar, reclamaram; derrubar, ninguém derrubou.", motivo: "Negociação aberta dentro das regras ganha estabilidade.", tom: "bom" },
        ],
        narracao: "Augusto, no corredor, resume em uma frase: “Três coisas bem feitas, senhor(a) Presidente: é o que a maioria dos governos nunca tentou.”" }),
      opt({ id: "so-o-que-cabe", rotulo: "Atender só o que cabe no orçamento atual e adiar o restante", kind: "prudente", resumo: "Cortar o que não tem folga e esperar o próximo ciclo.",
        custo: m(1.0), prazo: "Imediato", riscos: [{ texto: "Parte dos programas eficazes fica sem ritmo" }, { texto: "A base se ressente" }],
        custoPct: 1.0, aplica: ["custo-total"], efeitos: { attrs: { competencia: 2, confianca: 1 }, pub: { sustentabilidade: 2, acesso: 2 }, filaMin: -3, rel: { goncalo: -4, helena: 3 } },
        narracao: "Helena ergue o polegar. Gonçalo ergue as sobrancelhas." }),
      opt({ id: "pacote-goncalo", rotulo: "Aceitar o pacote do Gonçalo: um pouco para cada pedido", kind: "comodo", resumo: "Fatiar o orçamento para todo mundo e aprovar tudo rápido.",
        custo: m(3.0), prazo: "1 mês", riscos: [{ texto: "Os nove pedidos custam mais que o dobro da folga", precisa: "c47-pedidos" }, { texto: "Nenhuma prioridade chega ao fim" }],
        custoPct: 3.0, aliado: "goncalo", efeitos: { attrs: { popularidade: 3, rede: 4, competencia: -2 }, rel: { goncalo: 8, helena: -6 } },
        depois: [{ depois: 1, efeitos: { pub: { sustentabilidade: -5, acesso: -2 }, caixaPct: -0.6, attrs: { confianca: -3 } }, titulo: "A conta do pacote", mensagem: "Sem fonte para a maior parte do pacote, a Fazenda congelou despesas no meio do ano. Algumas obras pararam na metade.", motivo: "Atender todos fatiou o dinheiro e travou as entregas.", tom: "ruim" }],
        narracao: "A base aplaude de pé. A planilha da Helena chora em silêncio." }),
      opt({ id: "governar-decreto", rotulo: "Governar por decreto e medida provisória para driblar o Congresso", kind: "fraco", resumo: "Tentar impor as prioridades sem negociar o orçamento.",
        custo: m(0.8), prazo: "Imediato", riscos: [{ texto: "Decreto não cria despesa nova por conta própria", precisa: "c47-limites" }, { texto: "O Congresso e os tribunais podem derrubar" }],
        custoPct: 0.8, efeitos: { attrs: { popularidade: 2, confianca: -3, competencia: -2 }, rel: { helena: -5, goncalo: -4, augusto: -3 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: -4 }, pub: { acesso: -2 } }, titulo: "O decreto que não pegou", mensagem: "O Congresso derrubou parte dos decretos e o restante ficou em disputa jurídica. As prioridades pararam no meio do caminho.", motivo: "Atalho institucional não substitui negociação e fonte.", tom: "ruim" }],
        narracao: "As assinaturas saem rápido. As derrubadas, também." }),
      opt({ id: "obras-contribuicao", rotulo: "Liberar obras para a base em troca de “contribuição” por fora", kind: "desvio", resumo: "Distribuir obras como moeda de apoio e receber um percentual por fora.",
        custo: m(3.2), prazo: "1 mês", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Obras escolhidas por apoio, não por necessidade" }],
        custoPct: 3.2, aliado: "goncalo", desvio: DEV("Receber “contribuição” pelo pacote de obras da base", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 14, influencia: 7, evidencias: 3, rel: { goncalo: 10, helena: -8, augusto: -4 }, attrs: { rede: 5, caraDePau: 3 } },
        depois: [{ depois: 1, efeitos: { evidencias: 2, pub: { qualidade: -3, sustentabilidade: -3 } }, titulo: "Obra com dono", mensagem: "As obras liberadas pararam em cidades escolhidas por apoio, não por demanda. A Controladoria abriu uma pasta.", motivo: "Obra distribuída como moeda política.", tom: "ruim" }],
        narracao: "A base vota tudo. A pasta na Controladoria cresce em silêncio." }),
    ],
  },

  /* ───────── D48 — legado e prestação de contas ───────── */
  {
    id: "d48", caso: 48, mesa: "comite-campanha", titulo: "A última prestação de contas", conceito: "legado-prestacao", basePct: 0, gestoPadrao: "parecer",
    papelAssinado: "RELATÓRIO FINAL DE GESTÃO E PLANO DE TRANSIÇÃO — documento fictício",
    pergunta: "É o último desafio da carreira. A Vivian tem uma turnê de inaugurações; a Ana tem o relatório com metas cumpridas e não cumpridas. Que legado você deixa e como presta contas?",
    opcoes: [
      opt({ id: "relatorio-completo", rotulo: "Publicar o relatório completo: acertos, metas não cumpridas e plano de transição, em dados abertos", kind: "competente", resumo: "Prestar contas às duas vozes: Congresso e cidadão, com dados que qualquer um confere.",
        custo: m(1.2), prazo: "6 semanas", ganho: () => "Legado que continua e sucessor que sabe onde pegar",
        riscos: [{ texto: "Metas não cumpridas viram manchete" }, { texto: "Exige coragem política" }],
        custoPct: 1.2, aplica: ["legado-prestacao", "transparencia", "entrega-vs-anuncio"], conquista: "n7-prestacao-final",
        efeitos: { attrs: { confianca: 6, competencia: 4, persuasao: 2 }, pub: { qualidade: 4, acesso: 3, sustentabilidade: 4 }, filaMin: -8, rel: { ana: 8, guardiao: 6, bento: 6, augusto: 4, vivian: -3 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: 3, popularidade: 2 }, pub: { qualidade: 2, acesso: 2 } }, titulo: "O sucessor começou do ponto certo", mensagem: "Sem herdar dúvidas, a equipe de transição retomou as três prioridades onde você parou, com os dados na mão.", motivo: "Prestar contas completas protege o que foi construído.", tom: "bom" }],
        narracao: "Bento fecha a pasta, olha para você e diz só: “Pronto. Agora sim.”" }),
      opt({ id: "relatorio-restrito", rotulo: "Entregar o relatório ao Congresso e ao sucessor, sem divulgação ampla", kind: "prudente", resumo: "Cumprir o dever formal, sem a exposição pública.",
        custo: m(0.6), prazo: "3 semanas", riscos: [{ texto: "O cidadão não confere o que foi feito" }],
        custoPct: 0.6, aplica: ["legado-prestacao"], efeitos: { attrs: { competencia: 2, confianca: 1 }, pub: { qualidade: 1, sustentabilidade: 1 }, rel: { ana: 2 } },
        narracao: "Os documentos chegam por protocolo, e ficam por protocolo." }),
      opt({ id: "turne-inauguracoes", rotulo: "Fazer a turnê de inaugurações da Vivian", kind: "comodo", resumo: "Inaugurar 14 obras em 40 dias, algumas ainda inacabadas.",
        custo: m(2.5), prazo: "40 dias", riscos: [{ texto: "9 das 14 obras não funcionam", precisa: "c48-pacote" }, { texto: "Anúncio de reajuste sem fonte" }],
        custoPct: 2.5, aliado: "vivian", efeitos: { attrs: { popularidade: 5, confianca: -2, competencia: -2 }, rel: { vivian: 8, ana: -6, guardiao: -4 } },
        depois: [{ depois: 1, efeitos: { pub: { qualidade: -3, sustentabilidade: -4 }, caixaPct: -0.8, attrs: { confianca: -3 } }, titulo: "Placas sem hospital", mensagem: "Quem foi atrás do hospital inaugurado encontrou uma placa e um corredor vazio. A imprensa visitou todos os nove.", motivo: "Inauguração não é entrega.", tom: "ruim" }],
        narracao: "Catorze fitas cortadas, nove corredores vazios. A tesoura, ao menos, funcionou." }),
      opt({ id: "nao-prestar", rotulo: "Não prestar contas: “a história me julgará”", kind: "fraco", resumo: "Deixar a avaliação para os historiadores.",
        custo: m(0.0), prazo: "Imediato", riscos: [{ texto: "Quem vier depois conta a história por você" }],
        custoPct: 0, efeitos: { attrs: { confianca: -4, popularidade: -2, competencia: -2 }, rel: { ana: -6, bento: -5, guardiao: -4 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: -3 }, pub: { sustentabilidade: -2 } }, titulo: "A história chegou antes", mensagem: "O sucessor publicou a própria versão do balanço. Nela, o seu mandato é só a herança que ele recebeu.", motivo: "Quem não presta contas deixa a narrativa para os outros.", tom: "ruim" }],
        narracao: "A frase é solene. A planilha, ausente." }),
    ],
  },
];

/* ───────────────────────── Casos ───────────────────────── */

const casos: CaseDef[] = [
  { id: "caso43", caso: 43, titulo: "O plano que cabe no palanque", episodio: "Episódio 1", location: "comite-campanha", pistas: ["c43-promessas", "c43-espaco", "c43-fila"], conversas: ["n7-vivian-abertura", "n7-helena-fonte", "n7-bento-metas"], decisao: "d43",
    chamada: "A população pediu a sua candidatura. A Vivian quer doze promessas e um jingle; a Ministra Helena quer uma fonte para cada uma. O plano de governo é o seu primeiro compromisso público.",
    objetivo: "Compare as promessas com o espaço fiscal e com o painel da fila antes de registrar o plano.", dica: "Dica do Professor Bento: plano é prioridade, meta e fonte de recursos. Promessa sem fonte é desejo com cartaz." },
  { id: "caso44", caso: 44, titulo: "A pergunta da fila", episodio: "Episódio 2", location: "estudio-debate", pistas: ["c44-pauta", "c44-dados", "c44-roteiro"], conversas: ["n7-claudio-regras", "n7-vivian-roteiro", "n7-ana-checagem"], decisao: "d44",
    chamada: "Debate ao vivo. O mediador avisou que fará a pergunta que ninguém quer responder: por que a fila nacional não chegou à meta?",
    objetivo: "Cruze a meta e o resultado com o roteiro da Vivian e prepare a resposta.", dica: "Dica do Professor Bento: em debate, dado e franqueza valem mais que slogan. Admitir o limite e mostrar o que muda é o que o eleitor lembra." },
  { id: "caso45", caso: 45, titulo: "O recibo de um lado só", episodio: "Episódio 3", location: "comite-campanha", pistas: ["c45-limites", "c45-oferta", "c45-gastos"], conversas: ["n7-estevao-oferta", "n7-valdemar-recibo", "n7-ana-prestacao"], decisao: "d45",
    chamada: "O comício final custa mais do que a campanha declarou. O Barão Estevão, grande amigo da democracia, oferece cobrir a diferença em dinheiro vivo. O recibo, ele garante, é só de um lado.",
    objetivo: "Compare o bilhete do Barão com os gastos do palco e com as regras de prestação de contas.", dica: "Dica do Professor Bento: dinheiro sem recibo é dívida sem prazo. Doação e gasto de campanha devem ser declarados." },
  { id: "caso46", caso: 46, titulo: "A última semana", episodio: "Episódio 4", location: "praca-comicio", pistas: ["c46-pesquisa", "c46-rejeicao", "c46-agenda"], conversas: ["n7-celia-praca", "n7-vivian-estrategia", "n7-estevao-caixa2"], decisao: "d46",
    chamada: "Empate técnico a sete dias da votação. A estratégia final que você assinar decide a reta final — e a apuração, que aqui é inteiramente simulada, vai olhar para tudo o que você construiu até agora.",
    objetivo: "Leia a pesquisa e a rejeição dos indecisos antes de escolher a estratégia final.", dica: "Dica do Professor Bento: em empate técnico, o indeciso decide. E ele pesa mais plano claro e contas abertas do que ataque e slogan." },
  { id: "caso47", caso: 47, titulo: "A faixa e a conta", episodio: "Episódio 5", location: "palacio-presidencial", pistas: ["c47-pedidos", "c47-limites", "c47-execucao"], conversas: ["n7-augusto-transicao", "n7-goncalo-base", "n7-helena-limites"], decisao: "d47",
    chamada: "Você tomou posse. Em cima da mesa, nove pedidos urgentes que custam mais que o dobro da folga do orçamento, um líder do governo com um pacote pronto e uma Ministra com uma calculadora.",
    objetivo: "Compare os pedidos com a execução dos programas e com os limites do cargo.", dica: "Dica do Professor Bento: Presidente propõe, Congresso dispõe. Poucas prioridades, metas públicas e negociação aberta valem mais que muitos pedidos atendidos pela metade." },
  { id: "caso48", caso: 48, titulo: "A última prestação de contas", episodio: "Episódio 6", location: "sala-situacao-nacional", pistas: ["c48-balanco", "c48-relatorio", "c48-pacote"], conversas: ["n7-bento-legado", "n7-guardiao-contas", "n7-augusto-despedida"], decisao: "d48",
    chamada: "Fim do mandato e fim da carreira. A Vivian tem uma turnê de inaugurações; a Ana, um relatório com metas cumpridas e não cumpridas. O legado é o que continua depois que você sai.",
    objetivo: "Compare o balanço do mandato, a minuta do relatório e o pacote de inaugurações.", dica: "Dica do Professor Bento: prestar contas é mostrar o que foi feito, o que faltou e o que continua. Placa não atende ninguém." },
];

/* ───────────────────────── Conceitos e conquistas ───────────────────────── */

const conceitos: Partial<Record<ConceptId, Concept>> = {
  "plano-de-governo": {
    id: "plano-de-governo", titulo: "Plano de governo é prioridade, meta e fonte", tema: "Planejamento e compromisso público", dificuldade: 3,
    texto: "Um plano de governo de verdade escolhe poucas prioridades, define metas com prazo e indicador e mostra de onde vem o dinheiro. O orçamento público (PPA, LDO e LOA) é o instrumento que dá a fonte; promessa sem fonte não é plano, é desejo.",
    aplicacao: "Na vida real: ao ler o plano de um candidato, procure três coisas — o que será feito, até quando e com que recurso. Se faltar uma delas, faça a pergunta.",
    fonte: { rotulo: "Constituição Federal, art. 165 (PPA, LDO e LOA) e Lei 9.504/1997", url: CF_URL, classificacao: "oficial" },
  },
  "debate-publico": {
    id: "debate-publico", titulo: "No debate, responda com dados e admita limites", tema: "Comunicação e transparência", dificuldade: 3,
    texto: "Em debate público, quem responde com números e admite o que não deu certo ganha credibilidade; quem foge da pergunta perde. O acesso à informação pública permite que qualquer pessoa confira os dados citados.",
    aplicacao: "Na vida real: ao ouvir um candidato, compare o número que ele cita com a fonte (portais de transparência, relatórios oficiais). A checagem é sua.",
    fonte: { rotulo: "Lei de Acesso à Informação (Lei 12.527/2011)", url: LAI, classificacao: "oficial" },
  },
  "financiamento-campanha": {
    id: "financiamento-campanha", titulo: "Campanha limpa tem recibo dos dois lados", tema: "Financiamento e transparência eleitoral", dificuldade: 3,
    texto: "Doações e gastos de campanha precisam ser registrados, com limites e prestação de contas à Justiça Eleitoral. Dinheiro sem recibo (caixa 2) esconde quem financia o candidato e cria dívida: quem paga por fora costuma cobrar depois.",
    aplicacao: "Na vida real: consulte as prestações de contas dos candidatos nos portais da Justiça Eleitoral e compare doadores com decisões depois da eleição.",
    fonte: { rotulo: "Lei 9.504/1997 (Lei das Eleições) — arrecadação, gastos e prestação de contas", url: L9504, classificacao: "oficial" },
  },
  "eleicao-limites": {
    id: "eleicao-limites", titulo: "Eleição se ganha com confiança, não com atalho", tema: "Eleições e limites da disputa", dificuldade: 3,
    texto: "O voto é decidido por confiança, plano e coerência ao longo do caminho. O uso do poder econômico para influir na disputa é vedado: a Constituição protege a normalidade e a legitimidade das eleições. Nesta ficção, a apuração é inteiramente simulada.",
    aplicacao: "Na vida real: desconfie de campanhas que gastam muito e explicam pouco; confira a origem do dinheiro e o que o candidato fez antes de pedir o seu voto.",
    fonte: { rotulo: "Constituição Federal, art. 14 (soberania popular e proteção contra o abuso do poder econômico)", url: CF_URL, classificacao: "oficial" },
  },
  "posse-prioridades": {
    id: "posse-prioridades", titulo: "Prioridade sustentada, dentro dos limites do cargo", tema: "Governo e limites institucionais", dificuldade: 3,
    texto: "Quem governa propõe o orçamento e executa o que o Congresso aprova. Despesa permanente exige fonte, e crédito extraordinário é para o imprevisível e urgente. Poucas prioridades com metas e execução acelerada rendem mais que atender todos os pedidos pela metade.",
    aplicacao: "Na vida real: acompanhe quanto do orçamento prometido foi de fato executado; é aí que se vê a prioridade.",
    fonte: { rotulo: "Constituição Federal (competências do Presidente e orçamento) e LRF (LC 101/2000)", url: LRF, classificacao: "oficial" },
  },
  "legado-prestacao": {
    id: "legado-prestacao", titulo: "Legado é o que continua e o que foi prestado em contas", tema: "Prestação de contas e transição", dificuldade: 3,
    texto: "Prestar contas é mostrar metas cumpridas e não cumpridas, as razões, os dados abertos e o plano de continuidade. Inaugurar sem entregar serviço funcionando não é legado. A Constituição prevê a prestação de contas de quem administra recursos públicos.",
    aplicacao: "Na vida real: ao fim de qualquer gestão, peça o balanço: o que foi prometido, o que foi entregue e o que ficou pendente.",
    fonte: { rotulo: "Constituição Federal, arts. 70 e 84 (prestação de contas)", url: CF_URL, classificacao: "oficial" },
  },
};

const conquistas: AchievementDef[] = [
  { id: "n7-plano-com-fonte", nome: "Plano com Fonte", descricao: "Registrou um plano de governo com prioridades, metas e fonte de recursos.", trilha: "gestao", icone: "📋" },
  { id: "n7-debate-com-dados", nome: "Debate com Dados", descricao: "Respondeu à pergunta mais difícil com números e admitiu o limite.", trilha: "gestao", icone: "🎙️" },
  { id: "n7-recibo-dos-dois-lados", nome: "Recibo dos Dois Lados", descricao: "Recusou o caixa paralelo e fechou a campanha dentro das regras.", trilha: "gestao", icone: "🧾" },
  { id: "n7-eleicao-limpa", nome: "Eleição Sem Atalho", descricao: "Chegou à reta final com plano claro e contas abertas.", trilha: "gestao", icone: "🗳️" },
  { id: "n7-prestacao-final", nome: "Prestação Final", descricao: "Encerrou a carreira com relatório completo, metas não cumpridas incluídas.", trilha: "gestao", icone: "📚" },
  { id: "n7-recibo-de-um-lado-so", nome: "Recibo de um Lado Só", descricao: "Aceitou o caixa paralelo do Barão (e a coroa que vem junto).", trilha: "satira", icone: "👑" },
];

export const N7: LevelContent = { locais, pistas, achados, conversas, negociacoes: [], decisoes, casos, conceitos, conquistas };
