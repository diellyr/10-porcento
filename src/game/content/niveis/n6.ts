import type { AchievementDef, CaseDef, ClueDef, ConversationDef, DecisionDef, FindingDef, OptionDef } from "../types";
import { DEV, m, opt as optBase, type O } from "../cases-n2";
import { talk } from "../conversations-n2";
import type { LevelContent, LocSpec } from "./tipos";

/**
 * Nível 6 — Ministro(a) de Estado da Saúde (casos 37–42).
 * Cenário simulado: Ministério fictício, orçamento estimado. Indicador "fila" = fila nacional de espera por especialista, em DIAS.
 * Todos os valores são proporcionais ao orçamento do cenário; personagens, empresas e números são fictícios.
 */

const SIM = { rotulo: "Documento do cenário (valores simulados)", classificacao: "simulado" as const };
const EST = { rotulo: "Parâmetro do cenário (estimativa didática)", classificacao: "estimativa" as const };

const LRF = "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm";
const LC141 = "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp141.htm";
const L8080 = "https://www.planalto.gov.br/ccivil_03/leis/l8080.htm";
const CF88 = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm";

/** `opt` do Nível 2 não repassa a conquista; acrescentamos aqui. */
const opt = (o: O & { conquista?: string }): OptionDef => ({ ...optBase(o), conquista: o.conquista });

/* ═════════════════════════════ LOCAIS ═════════════════════════════ */

const LOCAIS: LocSpec[] = [
  {
    id: "gabinete-ministro", nome: "Gabinete do Ministro", curto: "Gabinete", tema: "gabinete", mesa: true,
    descricao: "Sua mesa, as pastas do dia e uma agenda que já começou sem você. Daqui saem as portarias do Ministério.",
    pessoas: [
      { id: "augusto", char: "augusto", falas: [[37, "n6-augusto-abertura", "Presidente Augusto: boas-vindas"]] },
      { id: "bento", char: "bento", falas: [[37, "n6-bento-regra", "Professor Bento: a regra fiscal"]] },
      { id: "valdemar", char: "valdemar", falas: [[38, "n6-valdemar-linear", "Dr. Valdemar: o corte “justo”"]] },
      { id: "marlene", char: "marlene", falas: [[42, "n6-marlene-coalizao", "Marlene: a coalizão"]] },
    ],
    itens: [
      { id: "estante", icone: "📚", onde: "parede", pistas: [[40, "c40-primaria", "Estudo da atenção primária"]] },
      { id: "pasta-dia", icone: "🗂️", onde: "mesa", pistas: [[37, "c37-pisos", "Pasta: piso da saúde e obrigatórias"], [38, "c38-programas", "Pasta: despesas discricionárias"]] },
      { id: "caderno", icone: "📒", onde: "mesa", pistas: [[41, "c41-ofertas", "Ofertas de fornecedores"], [42, "c42-orcamento", "Parecer jurídico e técnico"]] },
    ],
    portas: ["sala-crise", "casa-governo", "plenario", "fazenda"],
  },
  {
    id: "sala-crise", nome: "Sala de Situação de Crise", curto: "Sala de Crise", tema: "hospital",
    descricao: "Painéis, mapas e café frio. É aqui que chegam os boletins, o estoque estratégico e as más notícias, em ordem alfabética.",
    pessoas: [
      { id: "cecilia", char: "cecilia", falas: [[38, "n6-cecilia-essenciais", "Cecília: o que não pode parar"], [40, "n6-cecilia-oncologia", "Cecília: a fila de oncologia"], [41, "n6-cecilia-surto", "Cecília: o surto"]] },
      { id: "teodoro", char: "teodoro", falas: [[41, "n6-teodoro-estados", "Governador Teodoro: os estados"]] },
      { id: "celia", char: "celia", falas: [[41, "n6-celia-comunicacao", "Dona Célia: o que dizer ao povo"]] },
      { id: "pedro", char: "pedro", falas: [[39, "n6-pedro-rastro", "Pedro: rastrear as emendas"]] },
    ],
    itens: [
      { id: "painel-surto", icone: "📺", onde: "parede", pistas: [[40, "c40-oncologia", "Painel: fila de oncologia"], [41, "c41-boletim", "Boletim do surto"]] },
      { id: "painel-estoque", icone: "📦", onde: "parede", pistas: [[41, "c41-estoque", "Painel do estoque estratégico"]] },
      { id: "mesa-dados", icone: "💻", onde: "mesa", pistas: [[39, "c39-criterios", "Matriz técnica de priorização"]] },
    ],
    portas: ["gabinete-ministro", "casa-governo", "fazenda"],
  },
  {
    id: "casa-governo", nome: "Casa do Governo", curto: "Casa do Governo", tema: "reuniao",
    descricao: "O gabinete presidencial: sofá para conversa difícil, bandeira atrás da cadeira e um relógio que todo mundo finge não olhar.",
    pessoas: [
      { id: "augusto", char: "augusto", falas: [[40, "n6-augusto-prioridades", "Presidente Augusto: duas prioridades"]] },
      { id: "goncalo", char: "goncalo", falas: [[39, "n6-goncalo-porteira", "Dep. Gonçalo: o pacote"], [42, "n6-goncalo-votos", "Dep. Gonçalo: os votos"]] },
    ],
    itens: [
      { id: "mural", icone: "📌", onde: "parede", pistas: [[38, "c38-oficio", "Mural: ofício de corte uniforme"]] },
      { id: "oficios", icone: "📄", onde: "mesa", pistas: [[39, "c39-lista", "Lista do líder: o pacote de emendas"], [42, "c42-pedido", "Bilhete do líder: o preço dos votos"]] },
    ],
    portas: ["gabinete-ministro", "sala-crise", "plenario"],
  },
  {
    id: "plenario", nome: "Plenário do Congresso", curto: "Plenário", tema: "plenario",
    descricao: "O painel de votação pisca, os microfones esperam e todo mundo quer falar primeiro. A saúde passa por aqui uma vez por ano, com orçamento.",
    pessoas: [
      { id: "ramiro", char: "ramiro", falas: [[42, "n6-ramiro-orcamento", "Senador Ramiro: o relatório"]] },
      { id: "cornelio", char: "cornelio", falas: [[39, "n6-cornelio-emendas", "Dep. Cornélio: a visão do Congresso"]] },
    ],
    itens: [
      { id: "painel-votacao", icone: "🗳️", onde: "parede", pistas: [[42, "c42-placar", "Painel de votação do orçamento"]] },
      { id: "relatorios", icone: "📋", onde: "mesa", pistas: [[39, "c39-rastro", "Relatório de execução das emendas"]] },
    ],
    portas: ["gabinete-ministro", "casa-governo", "fazenda"],
  },
  {
    id: "fazenda", nome: "Ministério da Fazenda — Sala de Metas Fiscais", curto: "Fazenda", tema: "dados",
    descricao: "Planilhas, gráficos de meta e uma calculadora de mesa que nunca é desligada. Aqui, cada real tem dono e prazo.",
    pessoas: [
      { id: "helena", char: "helena", falas: [[37, "n6-helena-meta", "Ministra Helena: a meta do ano"], [38, "n6-helena-bloqueio", "Ministra Helena: o bloqueio"], [40, "n6-helena-fonte", "Ministra Helena: de onde vem o dinheiro"]] },
    ],
    itens: [
      { id: "painel-meta", icone: "📊", onde: "parede", pistas: [[37, "c37-meta", "Painel da meta fiscal"], [40, "c40-espaco", "Quadro do espaço fiscal"]] },
      { id: "quadro-decretos", icone: "📑", onde: "parede", pistas: [[38, "c38-decreto", "Minuta do decreto de bloqueio"]] },
      { id: "pasta-cortes", icone: "🗂️", onde: "mesa", pistas: [[37, "c37-corte", "Pasta: sugestão de corte linear"]] },
    ],
    portas: ["gabinete-ministro", "sala-crise", "plenario"],
  },
];

/* ═════════════════════════════ PISTAS ═════════════════════════════ */

const PISTAS: ClueDef[] = [
  /* ───── Caso 37 — meta fiscal e saúde ───── */
  {
    id: "c37-meta", caso: 37, location: "fazenda", titulo: "Painel da meta fiscal do ano", tipo: "dado", confiabilidade: "confirmada", icone: "📊", fonte: SIM,
    texto: "A meta de resultado primário é um alvo anual para o governo inteiro. A projeção está acima do limite, e a Fazenda reparte o esforço entre os ministérios. Números simulados, só para o jogo.",
    tabela: () => [["Meta do ano", "déficit de até 0,25% do PIB"], ["Projeção atual", "déficit de 0,45% do PIB"], ["Distância até a meta", "0,20% do PIB"], ["Parte atribuída ao Ministério da Saúde", "3,0% do orçamento do Ministério"]],
  },
  {
    id: "c37-pisos", caso: 37, location: "gabinete-ministro", titulo: "Pasta: piso da saúde e despesas obrigatórias", tipo: "documento", confiabilidade: "confirmada", icone: "🗂️", fonte: EST,
    texto: "O piso de aplicação em saúde é um mínimo constitucional, não um teto: gastar menos do que ele é descumprir a regra, não economizar. No cenário, o Ministério está apenas um pouco acima do mínimo.",
    tabela: () => [["Orçamento do Ministério", "100%"], ["Piso de aplicação em saúde (a cumprir)", "99,0%"], ["Folga acima do piso", "1,0%"]],
  },
  {
    id: "c37-corte", caso: 37, location: "fazenda", titulo: "Pasta: sugestão da equipe econômica", tipo: "opiniao", confiabilidade: "opiniao", icone: "🗂️", fonte: SIM,
    texto: "Bilhete da equipe da Fazenda: “Corte linear de 3% na Saúde, como em todos os ministérios. É justo: ninguém sai privilegiado.” O bilhete não menciona o piso nem diz o que seria cortado.",
    tabela: () => [["Corte linear de 3%", "reduz 3,0% do orçamento"], ["Efeito sobre o piso", "ficaria 2,0% abaixo do mínimo"]],
  },

  /* ───── Caso 38 — bloqueio de 15% ───── */
  {
    id: "c38-decreto", caso: 38, location: "fazenda", titulo: "Minuta do decreto de programação orçamentária", tipo: "documento", confiabilidade: "confirmada", icone: "📑", fonte: SIM,
    texto: "A receita do bimestre veio abaixo do previsto e o decreto bloqueia 15% das despesas discricionárias de cada ministério. As obrigatórias (pessoal, benefícios e piso) não entram na conta do bloqueio.",
    tabela: () => [["Despesas obrigatórias (pessoal, benefícios, piso)", "78% do orçamento"], ["Despesas discricionárias", "22% do orçamento"], ["Bloqueio de 15% das discricionárias", "3,3% do orçamento"]],
  },
  {
    id: "c38-programas", caso: 38, location: "gabinete-ministro", titulo: "Pasta: despesas discricionárias do Ministério", tipo: "dado", confiabilidade: "confirmada", icone: "🗂️", fonte: SIM,
    texto: "A Cecília marcou com caneta verde o que não pode parar (vacinas e programas de fila) e com laranja o que pode esperar. O Ministério decide onde aplicar o bloqueio dentro do total.",
    tabela: () => [["Vacinas e insumos estratégicos (essencial)", "7,0%"], ["Programas de redução de fila (essencial)", "5,0%"], ["Obras novas e reformas", "4,0%"], ["Equipamentos novos", "3,5%"], ["Eventos, propaganda e diárias", "1,5%"], ["Estudos e consultorias", "1,0%"]],
  },
  {
    id: "c38-oficio", caso: 38, location: "casa-governo", titulo: "Ofício da Casa do Governo: corte uniforme", tipo: "opiniao", confiabilidade: "opiniao", icone: "📄", fonte: SIM,
    texto: "“Pede-se a todos os ministérios que apliquem o bloqueio de forma uniforme, para evitar acusações de privilégio.” O ofício trata de aparência. Não fala em vacina, em fila nem no que cada programa entrega.",
  },

  /* ───── Caso 39 — pacote de emendas ───── */
  {
    id: "c39-lista", caso: 39, location: "casa-governo", titulo: "Lista do líder: o pacote de emendas", tipo: "documento", confiabilidade: "incompleta", icone: "📄", fonte: SIM,
    texto: "O Deputado Gonçalo entregou a lista com a frase “é só liberar, o município sabe o que faz”. Boa parte das emendas não tem projeto, equipe nem custeio, o que o pessoal chama de “porteira fechada”.",
    tabela: (c) => [["Emendas no pacote", "38"], ["Com projeto, equipe e custeio definidos", `14 (${c.money(0.9)})`], ["Sem projeto nem destino definido", `24 (${c.money(1.7)})`], ["Municípios atendidos", "22 (5 com cobertura crítica, 17 com cobertura boa)"]],
  },
  {
    id: "c39-criterios", caso: 39, location: "sala-crise", titulo: "Matriz técnica de priorização", tipo: "dado", confiabilidade: "confirmada", icone: "💻", fonte: EST,
    texto: "A matriz pontua cada município por necessidade (cobertura e indicadores), capacidade de operar (equipe e custeio) e histórico de execução. Dá para ver onde o recurso faria mais diferença.",
    tabela: () => [["Municípios críticos no país (pela matriz)", "16"], ["Críticos que estão no pacote", "5"], ["Críticos fora do pacote", "11"], ["Emendas do pacote em município de cobertura boa", "17"]],
  },
  {
    id: "c39-rastro", caso: 39, location: "plenario", titulo: "Relatório de execução das emendas do ano anterior", tipo: "dado", confiabilidade: "confirmada", icone: "📋", fonte: SIM,
    texto: "O relatório cruza as emendas do ano passado com a prestação de contas e o uso final do recurso. Emenda com projeto deixa rastro; emenda sem destino some na curva.",
    tabela: () => [["Emendas com projeto: destino rastreável", "88%"], ["Emendas “porteira fechada”: destino rastreável", "22%"], ["Prestação de contas publicada no prazo", "41%"], ["Obras ou aquisições paradas ou sem uso", "17%"]],
  },

  /* ───── Caso 40 — duas prioridades ───── */
  {
    id: "c40-oncologia", caso: 40, location: "sala-crise", titulo: "Painel da fila de oncologia", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "Pela Lei 12.732/2012, o tratamento do câncer deve começar em até 60 dias após o diagnóstico. O painel mostra quem já passou disso e o custo estimado de cada caminho.",
    tabela: (c) => [["Pacientes diagnosticados esperando o início do tratamento", "4.200"], ["Acima de 60 dias", "1.900 (45%)"], ["Custo para tratar os acima de 60 dias em 12 meses", c.money(1.6)], ["Custo para zerar toda a fila de uma vez", c.money(3.0)]],
  },
  {
    id: "c40-primaria", caso: 40, location: "gabinete-ministro", titulo: "Estudo: expansão da atenção primária", tipo: "documento", confiabilidade: "incompleta", icone: "📒", fonte: EST,
    texto: "Mais equipes de saúde da família significam diagnóstico mais cedo e menos internações evitáveis. O efeito sobre a fila de especialista aparece em 2 a 3 anos, e o estudo diz isso com franqueza.",
    tabela: (c) => [["Pessoas sem equipe de saúde da família", "8 milhões"], ["Expansão completa (4 anos)", c.money(6.0)], ["Fase 1 (primeiro ano)", c.money(1.6)], ["Efeito esperado na fila (estimativa)", "começa a cair em 2–3 anos"]],
  },
  {
    id: "c40-espaco", caso: 40, location: "fazenda", titulo: "Quadro do espaço fiscal para novas prioridades", tipo: "dado", confiabilidade: "confirmada", icone: "📊", fonte: SIM,
    texto: (c) => `A Fazenda confirma o teto do que o Ministério pode assumir de novo neste ano, sem estourar a meta: ${c.money(3.4)}. Mais que isso só cortando algo que já existe.`,
  },

  /* ───── Caso 41 — surto nacional ───── */
  {
    id: "c41-boletim", caso: 41, location: "sala-crise", titulo: "Boletim do surto (vírus Zéfiro-9, fictício)", tipo: "dado", confiabilidade: "confirmada", icone: "📺", fonte: SIM,
    texto: "A Sala de Situação acompanha a transmissão estado a estado. O número que mais assusta não é o total: é o ritmo de crescimento.",
    tabela: () => [["Estados com transmissão sustentada", "9 de 27 (eram 4 há uma semana)"], ["Casos confirmados", "18.400, dobrando a cada 6 dias"], ["Ocupação nacional de UTI", "78%"], ["Letalidade observada (estimativa)", "1,8%"]],
  },
  {
    id: "c41-estoque", caso: 41, location: "sala-crise", titulo: "Painel do estoque estratégico", tipo: "dado", confiabilidade: "confirmada", icone: "📦", fonte: SIM,
    texto: "Os 25 dias de cobertura do estoque valem para o consumo normal. No ritmo do surto, a conta é outra, e os estados não têm o mesmo estoque.",
    tabela: () => [["Cobertura no ritmo normal", "25 dias"], ["Cobertura no ritmo do surto", "9 dias"], ["Estados com menos de 5 dias", "3"], ["Estados com mais de 30 dias (sobra para remanejar)", "6"]],
  },
  {
    id: "c41-ofertas", caso: 41, location: "gabinete-ministro", titulo: "Ofertas de reposição (antivirais, EPI e testes)", tipo: "documento", confiabilidade: "incompleta", icone: "📒", fonte: SIM,
    texto: "Três caminhos para repor o estoque chegaram à mesa. O preço-base 1,00 é o da ata nacional vigente. A Biovale Distribuidora (fictícia) escreveu: “entrega em 48 horas, sem cotação, pagamento em 24 horas”.",
    tabela: () => [["Ata nacional vigente (entrega em 7 dias)", "1,00"], ["Organismo internacional de compras (10 dias)", "1,12"], ["Biovale, dispensa emergencial (48 horas)", "2,80"]],
  },

  /* ───── Caso 42 — votação da coalizão ───── */
  {
    id: "c42-placar", caso: 42, location: "plenario", titulo: "Painel de votação do orçamento", tipo: "dado", confiabilidade: "confirmada", icone: "🗳️", fonte: SIM,
    texto: "Faltam votos para aprovar o orçamento da Saúde. A articulação também mediu quem está disposto a votar a favor se as regras forem claras e iguais para todos.",
    tabela: () => [["Votos garantidos do governo", "241"], ["Votos necessários", "257"], ["Faltam", "16"], ["Parlamentares do centro dispostos a votar com regras claras", "22"]],
  },
  {
    id: "c42-pedido", caso: 42, location: "casa-governo", titulo: "Bilhete do líder: o preço dos votos", tipo: "opiniao", confiabilidade: "opiniao", icone: "📄", fonte: SIM,
    texto: "O Deputado Gonçalo resume em um bilhete: “Para fechar os 16 votos: a direção do Hospital Federal de Referência para um indicado do bloco, 40% das emendas do bloco em porteira fechada e os critérios de habilitação em revisão.” Nenhuma linha fala de saúde.",
  },
  {
    id: "c42-orcamento", caso: 42, location: "gabinete-ministro", titulo: "Parecer jurídico e técnico", tipo: "documento", confiabilidade: "confirmada", icone: "📒", fonte: SIM,
    texto: "A consultoria lembra que os cargos de direção de hospital federal pedem perfil técnico, que critério de emenda é regra publicada (mudar exige ato público e motivado) e que vantagem indevida em troca de ato pode caracterizar improbidade (Lei 8.429/1992). Também separa o que o orçamento tem de mérito.",
    tabela: () => [["Direção do hospital federal", "perfil técnico exigido"], ["Critérios de emenda", "normas publicadas, sem barganha"], ["Pontos do orçamento da Saúde com apoio por mérito", "metas de fila, vacinas e atenção primária"]],
  },
];

/* ═════════════════════════════ ACHADOS ═════════════════════════════ */

const ACHADOS: FindingDef[] = [
  { id: "f37-folga", caso: 37, a: "c37-pisos", b: "c37-corte", titulo: "O corte pedido é maior que a folga", autoPorConhecimento: ["regra-fiscal", "custo-total"],
    texto: "A folga acima do piso é de 1,0% do orçamento. O corte linear de 3% deixaria o Ministério 2,0% abaixo do mínimo constitucional. A Saúde pode entregar 1% sem violar o piso e propor à Fazenda fechar o resto pelo lado da receita." },
  { id: "f37-distancia", caso: 37, a: "c37-meta", b: "c37-pisos", titulo: "A meta é do governo todo, o piso é da Saúde", autoPorConhecimento: ["regra-fiscal"],
    texto: "A distância até a meta fiscal (0,20% do PIB) é um problema do governo inteiro, e a parte atribuída à Saúde (3,0%) não cabe na folga de 1,0%. A regra fiscal pede esforço, não que se descumpra outra regra." },

  { id: "f38-essenciais", caso: 38, a: "c38-decreto", b: "c38-programas", titulo: "Dá para bloquear sem tocar em vacina nem fila", autoPorConhecimento: ["contingenciamento", "corte-linear"],
    texto: "O bloqueio de 3,3% do orçamento equivale a 33% das despesas que não são essenciais (obras novas, equipamentos, eventos e estudos somam 10%). O corte linear de 15% pegaria também vacinas (1,05%) e programas de fila (0,75%)." },
  { id: "f38-aparencia", caso: 38, a: "c38-oficio", b: "c38-programas", titulo: "Uniforme na aparência, desigual no efeito", autoPorConhecimento: ["corte-linear"],
    texto: "Cortar igual parece justo, mas não é igual no efeito: 15% de vacina é falta de vacina, e 15% de evento é menos coquetel. O ofício olha a aparência e ignora o que cada programa entrega." },

  { id: "f39-criterio", caso: 39, a: "c39-lista", b: "c39-criterios", titulo: "O pacote não chega aonde falta", autoPorConhecimento: ["emenda-custeio", "transparencia"],
    texto: "24 das 38 emendas não têm projeto, e só 5 dos 16 municípios críticos estão no pacote (17 emendas vão para municípios de cobertura boa). Reorientando as emendas sem projeto, a mesma lista cobre os críticos sem tirar quem já tem plano." },
  { id: "f39-rastro", caso: 39, a: "c39-lista", b: "c39-rastro", titulo: "Porteira fechada não deixa rastro", autoPorConhecimento: ["transparencia"],
    texto: "Emendas com projeto têm destino rastreável em 88% dos casos. As de porteira fechada, em 22%. Sem rastro, a prestação de contas vira promessa." },

  { id: "f40-fonte", caso: 40, a: "c40-oncologia", b: "c40-espaco", titulo: "Zerar tudo de uma vez consome quase todo o espaço", autoPorConhecimento: ["planejamento-necessidade", "custo-total"],
    texto: (c) => `Zerar a fila de oncologia inteira custa ${c.money(3.0)} e o espaço fiscal é ${c.money(3.4)}: sobra quase nada para o resto. Tratar só os que passaram de 60 dias custa ${c.money(1.6)}, metade, e já cumpre a lei.` },
  { id: "f40-escala", caso: 40, a: "c40-primaria", b: "c40-oncologia", titulo: "As duas prioridades cabem, se forem faseadas", autoPorConhecimento: ["fila-regulada", "planejamento-necessidade"],
    texto: (c) => `Tratar os casos acima de 60 dias (${c.money(1.6)}) e começar a fase 1 da atenção primária (${c.money(1.6)}) somam ${c.money(3.2)}, dentro do espaço de ${c.money(3.4)}. A primária evita que a fila de especialista volte a crescer.` },

  { id: "f41-estoque", caso: 41, a: "c41-boletim", b: "c41-estoque", titulo: "O estoque dura 9 dias, não 25", autoPorConhecimento: ["reserva-urgencia", "emergencia-transparencia"],
    texto: "No ritmo do surto, a cobertura cai de 25 para 9 dias. Três estados têm menos de 5 dias, e seis têm mais de 30: remanejar já ganha tempo para comprar bem." },
  { id: "f41-preco", caso: 41, a: "c41-ofertas", b: "c41-estoque", titulo: "Comprar bem chega a tempo, e a pressa custa 2,8 vezes", autoPorConhecimento: ["emergencia-transparencia", "compra-compartilhada"],
    texto: "Com o remanejamento, os 9 dias de cobertura seguram a espera de 7 a 10 dias da ata e do organismo internacional. A dispensa sem cotação entrega em 48 horas, mas por 2,8 vezes o preço-base." },

  { id: "f42-limite", caso: 42, a: "c42-pedido", b: "c42-orcamento", titulo: "O pedido troca voto por decisão técnica", autoPorConhecimento: ["coalizao-limites", "conflito-interesses"],
    texto: "A direção do hospital e os critérios de emenda não são moeda: o parecer lembra que exigem perfil técnico e normas públicas. Votos comprados com isso saem caros e deixam rastro." },
  { id: "f42-placar", caso: 42, a: "c42-placar", b: "c42-pedido", titulo: "Há outro caminho para os 16 votos", autoPorConhecimento: ["coalizao-limites", "transparencia"],
    texto: "Faltam 16 votos e 22 parlamentares do centro apoiam o orçamento se as regras forem claras e iguais para todos. Negociar às claras fecha a conta sem pagar o preço do bilhete." },
];

/* ═════════════════════════════ CONVERSAS ═════════════════════════════ */

const CONVERSAS: ConversationDef[] = [
  /* ───── Caso 37 ───── */
  talk("n6-augusto-abertura", 37, "gabinete-ministro", "augusto", "O Presidente em pessoa", [
    ["feliz", "Ministro(a)! Augusto Prado. Resolvi vir pessoalmente: ministro novo merece presidente em pé, de gravata torta e tudo."],
    ["serio", "O país tem uma fila de 95 dias para especialista, estoque estratégico para 25 e um orçamento apertado. Em seis semanas, a Fazenda quer meta, o Congresso quer emenda e vírus não pede licença."],
    ["irônico", "Você vai ouvir a palavra “prioridade” umas quarenta vezes por dia. Quase todas querem dizer “a minha”."],
  ], [
    ["Vou decidir com dados e dizer não quando precisar.", ["feliz", "É o que eu precisava ouvir. Só aviso: “não” custa mais caro que “sim” no curto prazo."], { attrs: { competencia: 1 }, rel: { augusto: 4 } }],
    ["O que o senhor espera do Ministério?", ["serio", "Que a saúde não vire moeda de troca nem a primeira vítima da planilha. O resto a gente negocia."], { rel: { augusto: 2 } }],
  ], { apresentacao: "3d", auto: true }),
  talk("n6-bento-regra", 37, "gabinete-ministro", "bento", "Regra fiscal sem cortar o essencial", [
    ["serio", "Ministro(a), a regra fiscal é como o cinto: aperta, mas não deve cortar a circulação. Há metas, limites e pisos, e todos valem ao mesmo tempo."],
    ["irônico", "Quem diz que a única forma de cumprir a meta é cortar a Saúde provavelmente leu só uma das regras."],
  ], [
    ["O piso da saúde também é regra?", ["serio", "É constitucional. Ficar abaixo dele não é economia, é descumprimento, e quem paga é o paciente."], { attrs: { competencia: 1 }, rel: { bento: 4 } }],
    ["Como eu respondo à Fazenda?", ["feliz", "Com números e alternativas. Mostre o que dá para entregar, de onde, e proponha o resto pelo lado da receita."], { rel: { bento: 3 } }],
  ]),
  talk("n6-helena-meta", 37, "fazenda", "helena", "A meta do ano", [
    ["serio", "Helena Costa, Fazenda. A projeção está 0,20% do PIB acima do limite, e eu preciso de cada ministério na mesma direção."],
    ["irônico", "Saúde é sempre a mais difícil: ninguém quer cortar, mas todos querem que eu feche a conta."],
  ], [
    ["Entrego 1% dentro da folga e sugiro fechar o resto pela receita.", ["feliz", "Traga o plano com números e eu levo à equipe. Eu prefiro uma proposta a uma queixa."], { attrs: { persuasao: 2 }, rel: { helena: 6 } }],
    ["Corte linear de 3%, se for o jeito.", ["irônico", "Fácil de escrever, difícil de defender quando o Tribunal olhar o piso. Mas é você quem assina."], { rel: { helena: -2 } }],
  ]),

  /* ───── Caso 38 ───── */
  talk("n6-valdemar-linear", 38, "gabinete-ministro", "valdemar", "O corte justo", [
    ["feliz", "Ministro(a)! Valdemar. Já preparei o bloqueio: 15% em tudo, de todo mundo. É democrático."],
    ["irônico", "Ninguém reclama de um corte igual. Reclamam de um corte que escolhe."],
  ], [
    ["E a vacina também leva 15%?", ["serio", "Bom... “tudo” é “tudo”. Mas, se quiser, posso arrumar uns remanejamentos discretos."], { attrs: { competencia: 1 }, rel: { valdemar: -4 } }],
    ["Se é igual, ninguém reclama. Segue.", ["feliz", "Esse é o espírito! Eu cuido dos detalhes."], { rel: { valdemar: 6 }, attrs: { caraDePau: 2 } }],
  ]),
  talk("n6-cecilia-essenciais", 38, "sala-crise", "cecilia", "O que não pode parar", [
    ["serio", "Cecília, programas federais. Marquei em verde o que não pode parar: vacinas e programas de fila. O resto tem como esperar."],
    ["preocupado", "Se a vacina atrasa um bimestre, a conta chega em forma de internação. Se uma obra atrasa, chega em forma de reclamação."],
  ], [
    ["Dá para atingir 3,3% só no que pode esperar?", ["feliz", "Dá: obras novas, equipamentos, eventos e estudos somam 10%. Basta um terço disso."], { rel: { cecilia: 4 } }],
    ["Algum risco nesse caminho?", ["serio", "Obra parada gera custo de retomada e tem prefeito reclamando. Mas é um risco que dá para explicar."], { rel: { cecilia: 2 } }],
  ]),
  talk("n6-helena-bloqueio", 38, "fazenda", "helena", "O decreto de bloqueio", [
    ["serio", "O decreto manda bloquear 15% das discricionárias, mas o ministério escolhe onde. A lei pede que a limitação preserve o que é obrigatório e o essencial."],
    ["serio", "Se você preservar vacina e fila, eu acompanho. Se bloquear tudo igual, eu também acompanho, só que sem defender depois."],
  ], [
    ["Vou apresentar a lista do que bloqueio e do que protejo.", ["feliz", "Perfeito. E reavaliamos a cada bimestre: se a receita voltar, o dinheiro volta."], { attrs: { persuasao: 1 }, rel: { helena: 5 } }],
    ["Pode bloquear igual em tudo.", ["irônico", "Anotado. Quando faltar vacina, eu lembro que foi uniforme."], { rel: { helena: -2 } }],
  ]),

  /* ───── Caso 39 ───── */
  talk("n6-goncalo-porteira", 39, "casa-governo", "goncalo", "O pacote do líder", [
    ["feliz", "Ministro(a)! Gonçalo Bastos, líder do governo. Tenho 38 emendas para liberar. É só assinar: o município sabe o que faz."],
    ["irônico", "Para que critério técnico, se a base já decidiu? Critério é coisa de quem não vota."],
  ], [
    ["Libero as que têm projeto e discutimos critérios para as outras.", ["serio", "Critérios... Tudo bem, mas me mostre que a lista não vai sumir."], { attrs: { competencia: 1 }, rel: { goncalo: -3 } }],
    ["Libero tudo, porteira fechada.", ["feliz", "É por isso que o governo ainda tem maioria."], { rel: { goncalo: 8 }, attrs: { caraDePau: 2 } }],
  ]),
  talk("n6-pedro-rastro", 39, "sala-crise", "pedro", "O rastro das emendas", [
    ["serio", "Pedro Salgado, Controladoria. Cruzei as emendas do ano passado com o uso final do dinheiro."],
    ["preocupado", "Emenda com projeto, quase sempre eu acho o destino. Porteira fechada, só uma em cada cinco. O resto é nevoeiro."],
  ], [
    ["Dá para exigir um plano de aplicação?", ["feliz", "Dá, e publicar a lista. Quem não puder mostrar o destino não deveria receber."], { rel: { pedro: 4 } }],
    ["Isso não atrapalha os parlamentares?", ["irônico", "Atrapalha quem não quer ser rastreado. Os outros agradecem."], { rel: { pedro: 2 } }],
  ]),
  talk("n6-cornelio-emendas", 39, "plenario", "cornelio", "A visão do Congresso", [
    ["feliz", "Ministro(a)! Cornélio. Emenda é direito do parlamentar e dever do Executivo. Mas confesso: ver pacote sem projeto me deixa nervoso."],
    ["serio", "Na minha base, o que funcionou foi emenda com plano. A outra virou foto de inauguração."],
  ], [
    ["Concordo: critérios técnicos e destino público.", ["feliz", "Então o senhor tem meu apoio. Explique isso ao Gonçalo com jeito."], { rel: { cornelio: 4 }, attrs: { persuasao: 1 } }],
    ["Emenda é prioridade do parlamentar, ponto.", ["irônico", "É, mas prioridade sem rastro é outra coisa."], { rel: { cornelio: -1 } }],
  ]),

  /* ───── Caso 40 ───── */
  talk("n6-cecilia-oncologia", 40, "sala-crise", "cecilia", "A fila de oncologia", [
    ["serio", "São 4.200 pacientes esperando, 1.900 além dos 60 dias que a lei prevê. Esses são os casos em que cada semana conta."],
    ["preocupado", "Zerar tudo é caro e leva tempo. Atacar os atrasados dá para fazer já, com contratos e regulação."],
  ], [
    ["E a atenção primária?", ["serio", "É o que evita a fila de amanhã: diagnóstico precoce, menos casos avançados. Só que o efeito demora de 2 a 3 anos."], { rel: { cecilia: 4 } }],
    ["Qual a prioridade se só puder uma?", ["irônico", "Quem espera há mais de 60 dias. Mas, se só fizermos isso, a fila volta."], { rel: { cecilia: 2 } }],
  ]),
  talk("n6-helena-fonte", 40, "fazenda", "helena", "De onde vem o dinheiro", [
    ["serio", "O espaço fiscal para novas prioridades é de 3,4% do seu orçamento. Passou disso, me diga o que sai."],
    ["irônico", "Todo mundo adora anunciar prioridade. Pouca gente gosta de anunciar a fonte."],
  ], [
    ["Faseio as duas dentro dos 3,4%.", ["feliz", "É o que quero ouvir: prioridade com fonte e prazo."], { attrs: { competencia: 1 }, rel: { helena: 5 } }],
    ["Anuncio as duas, a senhora acha o dinheiro.", ["irritado", "Eu acho, mas nas suas outras despesas."], { rel: { helena: -5 } }],
  ]),
  talk("n6-augusto-prioridades", 40, "casa-governo", "augusto", "Duas prioridades, um orçamento", [
    ["serio", "Ministro(a), a oncologia dá manchete, a atenção primária dá resultado. Eu preciso das duas e só tenho um orçamento."],
    ["irônico", "O pessoal do marketing quer zerar a fila de uma vez. O pessoal de planejamento quer esperar três anos. Alguém precisa ser adulto na sala."],
  ], [
    ["Trato os atrasados já e começo a primária em fases.", ["feliz", "Isso eu consigo defender na imprensa e no Tribunal. Pode tocar."], { rel: { augusto: 6 }, attrs: { competencia: 1 } }],
    ["Concentro tudo na oncologia, que rende mais imagem.", ["irônico", "Rende mesmo. Mas a fila volta em dois anos, e aí a conta é minha."], { rel: { augusto: -2 } }],
  ], { apresentacao: "3d" }),

  /* ───── Caso 41 ───── */
  talk("n6-cecilia-surto", 41, "sala-crise", "cecilia", "O estoque diante do surto", [
    ["preocupado", "O surto dobra a cada 6 dias. No ritmo atual o estoque que parecia para 25 dias dura 9."],
    ["serio", "Três estados estão com menos de cinco dias e seis têm sobra. Remanejar é o primeiro passo, e é rápido."],
  ], [
    ["Compramos pela ata e pelo organismo internacional?", ["feliz", "Sim, entregam em 7 a 10 dias, com preço registrado. Com o remanejamento, a conta fecha."], { rel: { cecilia: 4 } }],
    ["E se a Biovale entregar em 48 horas?", ["irônico", "Entrega, a 2,8 vezes o preço. A pressa é cara, e sem cotação é pior."], { rel: { cecilia: 2 } }],
  ]),
  talk("n6-teodoro-estados", 41, "sala-crise", "teodoro", "Os estados no meio da crise", [
    ["serio", "Governador Teodoro. O meu estado está com menos de cinco dias de estoque. Quero saber quem coordena e com que regra."],
    ["preocupado", "Se cada estado compra por conta própria, vira leilão e o mais fraco perde."],
  ], [
    ["Coordenação nacional com remanejamento entre estados.", ["feliz", "Então estamos juntos. Mande o fluxo por escrito e eu abro os números do meu estado."], { rel: { teodoro: 6 } }],
    ["Cada estado compra o que precisa.", ["irritado", "Isso é largar a coordenação. Vai virar uma corrida."], { rel: { teodoro: -4 } }],
  ]),
  talk("n6-celia-comunicacao", 41, "sala-crise", "celia", "O que dizer ao povo", [
    ["serio", "Dona Célia, pelo Conselho. As pessoas estão com medo e as redes sociais já estão com números inventados."],
    ["triste", "Quem diz “está tudo sob controle” e depois falta remédio perde a confiança por muito tempo."],
  ], [
    ["Vou publicar o boletim todo dia, com o que sabemos e o que não sabemos.", ["feliz", "É isso. Verdade, mesmo incompleta, pesa mais que tranquilidade fabricada."], { attrs: { confianca: 1 }, rel: { celia: 6 } }],
    ["Vou dizer que está sob controle para evitar pânico.", ["irônico", "Pânico é pouco perto do que vem depois de uma mentira descoberta."], { rel: { celia: -3 } }],
  ]),

  /* ───── Caso 42 ───── */
  talk("n6-goncalo-votos", 42, "casa-governo", "goncalo", "O preço dos votos", [
    ["feliz", "Ministro(a), faltam 16 votos e eu tenho o caminho: a direção do Hospital Federal, as emendas sem burocracia e a revisão daqueles critérios chatos."],
    ["irônico", "É assim que coalizão funciona. Quem acha que é diferente nunca contou votos."],
  ], [
    ["Coalizão se faz com regra clara, não com troca de cargo.", ["serio", "Bonito de dizer. Vamos ver se aprova o orçamento com discurso."], { attrs: { competencia: 1, persuasao: 1 }, rel: { goncalo: -4 } }],
    ["Fechado, mas fica entre nós.", ["feliz", "Sempre soube que o senhor era do ramo."], { rel: { goncalo: 8 }, attrs: { caraDePau: 2 } }],
  ], { apresentacao: "3d" }),
  talk("n6-ramiro-orcamento", 42, "plenario", "ramiro", "O relatório do orçamento", [
    ["serio", "Senador Ramiro, relator. Posso apoiar o orçamento da Saúde, desde que saiba o que cada real entrega."],
    ["irônico", "Eu votaria com gosto num orçamento com metas de fila, vacina e atenção primária. Não consigo votar com gosto num orçamento sem nome."],
  ], [
    ["Trago as metas e os critérios por escrito.", ["feliz", "Então posso defender isso no plenário. Traga para o dia seguinte."], { rel: { ramiro: 6 } }],
    ["Preciso só do seu voto, sem muitas perguntas.", ["irônico", "Sem pergunta é voto em branco. E voto em branco não vale."], { rel: { ramiro: -3 } }],
  ]),
  talk("n6-marlene-coalizao", 42, "gabinete-ministro", "marlene", "A conta política", [
    ["serio", "Marlene, Relações Institucionais. Eu fiz a contagem: faltam 16, e 22 do centro votam com regras claras."],
    ["irônico", "Eu sempre dizia que coalizão era arte. Hoje acho que é mais contabilidade, só que com café."],
  ], [
    ["Vamos abrir as regras e os critérios para todos.", ["feliz", "É o caminho mais longo e o único em que você dorme tranquilo."], { rel: { marlene: 4 }, attrs: { confianca: 1 } }],
    ["Dá para fechar mais rápido com o pacote do Gonçalo?", ["serio", "Fecha. E depois você passa o mandato explicando o pacote."], { rel: { marlene: -2 } }],
  ]),
];

/* ═════════════════════════════ DECISÕES ═════════════════════════════ */

const DECISOES: DecisionDef[] = [
  /* ───────── D37 — meta fiscal apertada ───────── */
  {
    id: "d37", caso: 37, mesa: "gabinete-ministro", titulo: "A meta fiscal e a saúde", conceito: "regra-fiscal", basePct: 0, gestoPadrao: "assinar",
    papelAssinado: "PROPOSTA DE CONTRIBUIÇÃO À META FISCAL — documento fictício",
    pergunta: "A Fazenda pede 3% de esforço ao Ministério, e a folga acima do piso é de apenas 1%. Como contribuir para a meta sem descumprir o piso da saúde?",
    opcoes: [
      opt({ id: "meta-com-piso", rotulo: "Entregar 1% dentro da folga e propor à Fazenda fechar o resto pela receita", kind: "competente", resumo: "Eficiência em compras e glosas, adiamento seletivo e proposta de receita, com o piso preservado.",
        requer: { achado: "f37-folga", dica: "Compare o piso e a folga do Ministério com o corte linear que a Fazenda sugeriu." },
        custo: m(0.4), prazo: "6 semanas para o plano", ganho: m(0.6),
        riscos: [{ texto: "A Fazenda pode achar pouco" }, { texto: "Exige acompanhar a execução todo mês" }],
        custoPct: 0.4, aplica: ["regra-fiscal", "credito-adicional", "custo-total"], conquista: "n6-meta-com-piso",
        efeitos: { attrs: { competencia: 6, confianca: 2, persuasao: 2 }, pub: { sustentabilidade: 4, qualidade: 2 }, caixaPct: 0.6, rel: { helena: 6, augusto: 4 } },
        depois: [{ depois: 2, efeitos: { pub: { sustentabilidade: 3, acesso: 2 }, caixaPct: 0.4, attrs: { confianca: 2 } }, titulo: "Meta no trilho, piso preservado", mensagem: "A Fazenda aceitou a proposta, e a meta andou sem que o Ministério ficasse abaixo do piso.", motivo: "O esforço veio onde era possível, e o resto foi para quem pode resolvê-lo.", tom: "bom" }],
        narracao: "Helena lê o plano duas vezes e escreve na margem: “Isto eu consigo defender.” Bento apenas assente." }),
      opt({ id: "pedir-prazo", rotulo: "Pedir um bimestre para apresentar o plano completo", kind: "prudente", resumo: "Ganhar tempo para calcular com cuidado, sem aceitar nem recusar nada agora.",
        custo: m(0.1), prazo: "2 meses", riscos: [{ texto: "A meta continua pressionando" }, { texto: "Passa a ideia de hesitação" }],
        custoPct: 0.1, efeitos: { attrs: { competencia: 2 }, pub: { sustentabilidade: 1 }, rel: { helena: -2 } },
        narracao: "A Fazenda concede o prazo e anota a data. A calculadora de mesa continua ligada." }),
      opt({ id: "corte-linear-3", rotulo: "Aceitar o corte linear de 3% na Saúde", kind: "comodo", resumo: "Cumprir a determinação sem discutir o piso nem o que seria cortado.", cortaAcesso: true,
        custo: m(0.1), prazo: "Imediato", riscos: [{ texto: "Deixa o Ministério abaixo do piso", precisa: "c37-pisos" }, { texto: "Reduz o atendimento" }],
        custoPct: 0.1, aliado: "helena", efeitos: { attrs: { competencia: -2, popularidade: -2 }, pub: { acesso: -4, qualidade: -3, equipe: -2, sustentabilidade: 2 }, caixaPct: 0.8, filaMin: 5, rel: { helena: 4, cecilia: -6 } },
        depois: [{ depois: 2, efeitos: { attrs: { confianca: -4 }, pub: { acesso: -2, qualidade: -2 }, filaMin: 3 }, titulo: "Abaixo do piso", mensagem: "O Tribunal e o Conselho notaram que o Ministério ficou abaixo do mínimo constitucional, e a fila anda mais devagar.", motivo: "O corte linear ignorou o piso.", tom: "ruim" }],
        narracao: "A Fazenda agradece a colaboração. A fila para especialista aumenta, discretamente." }),
      opt({ id: "restos-a-pagar", rotulo: "Empurrar despesas para o ano seguinte e cumprir a meta no papel", kind: "fraco", resumo: "Adiar pagamentos já devidos para o próximo exercício, de modo que a conta do ano pareça melhor.",
        custo: m(0.1), prazo: "Imediato", riscos: [{ texto: "A dívida só muda de ano" }, { texto: "Esconder a conta é pedalada fiscal" }],
        custoPct: 0.1, efeitos: { attrs: { competencia: -3, caraDePau: 2 }, pub: { sustentabilidade: -3 }, caixaPct: 0.6, evidencias: 1, rel: { helena: -2, pedro: -4 } },
        depois: [{ depois: 2, efeitos: { pub: { sustentabilidade: -4 }, caixaPct: -0.6, attrs: { confianca: -4 }, evidencias: 1 }, titulo: "A conta chegou", mensagem: "As despesas adiadas voltaram, com juros e com perguntas do controle sobre a manobra.", motivo: "Adiar não é economizar.", tom: "ruim" }],
        narracao: "A planilha fecha e o problema muda de endereço. Pedro anota a data." }),
    ],
  },

  /* ───────── D38 — bloqueio de 15% ───────── */
  {
    id: "d38", caso: 38, mesa: "gabinete-ministro", titulo: "Bloqueio de 15% das despesas discricionárias", conceito: "contingenciamento", basePct: 3, gestoPadrao: "assinar",
    papelAssinado: "PORTARIA — APLICAÇÃO DO BLOQUEIO ORÇAMENTÁRIO — documento fictício",
    pergunta: "A receita ficou abaixo do previsto e o decreto exige bloquear 15% das despesas discricionárias. Onde aplicar o bloqueio?",
    opcoes: [
      opt({ id: "bloqueio-seletivo", rotulo: "Bloquear 3,3% em obras novas, equipamentos, eventos e estudos, protegendo vacinas e fila", kind: "competente", resumo: "Aplicar o bloqueio no que pode esperar e reavaliar a cada bimestre.",
        custo: m(0.3), prazo: "3 semanas", ganho: m(0.7),
        riscos: [{ texto: "Obras e compras novas atrasam" }, { texto: "Prefeitos e fornecedores vão reclamar" }],
        custoPct: 0.3, aplica: ["contingenciamento", "corte-linear", "execucao-despesa"], conquista: "n6-bloqueio-seletivo",
        efeitos: { attrs: { competencia: 6, confianca: 3, persuasao: 1 }, pub: { qualidade: 3, acesso: 3, sustentabilidade: 3 }, caixaPct: 0.7, filaMin: -3, rel: { cecilia: 6, helena: 3, valdemar: -3 } },
        depois: [{ depois: 2, efeitos: { pub: { acesso: 4 }, filaMin: -4, attrs: { confianca: 2 } }, titulo: "Vacina em dia, fila andando", mensagem: "Com vacinas e programas de fila protegidos, o atendimento seguiu mesmo com o bloqueio.", motivo: "O corte atingiu o que podia esperar.", tom: "bom" }],
        narracao: "Cecília risca a lista e sublinha duas vezes “vacinas”. Valdemar suspira, com a calculadora na mão." }),
      opt({ id: "bloqueio-etapas", rotulo: "Bloquear 2% agora e o restante só se a receita não vier", kind: "prudente", resumo: "Bloqueio em etapas, reavaliado a cada bimestre.",
        custo: m(0.2), prazo: "2 meses", riscos: [{ texto: "Pode ter de cortar mais depressa depois" }, { texto: "A Fazenda pode cobrar o restante" }],
        custoPct: 0.2, efeitos: { attrs: { competencia: 3 }, pub: { sustentabilidade: 2 }, caixaPct: 0.4, rel: { helena: -1 } },
        narracao: "O bloqueio começa pela metade, com um recado: “vamos ver como a receita se comporta”." }),
      opt({ id: "corte-linear-15", rotulo: "Aplicar 15% igual em todas as despesas discricionárias", kind: "comodo", resumo: "Cortar uniformemente, vacinas e fila inclusas, para não parecer que escolheu.", cortaAcesso: true,
        custo: m(0.1), prazo: "Imediato", riscos: [{ texto: "Corta vacinas e programas de fila", precisa: "c38-programas" }, { texto: "Parece justo, mas atinge o essencial" }],
        custoPct: 0.1, aliado: "valdemar", efeitos: { attrs: { competencia: -2, popularidade: -2 }, pub: { acesso: -5, qualidade: -3 }, estoqueDias: -4, filaMin: 6, caixaPct: 0.8, rel: { valdemar: 6, cecilia: -8 } },
        depois: [{ depois: 2, efeitos: { estoqueDias: -3, filaMin: 4, attrs: { confianca: -4 }, pub: { acesso: -2 } }, titulo: "Vacina atrasada", mensagem: "O corte igual atingiu vacinas e programas de fila, e algumas campanhas atrasaram.", motivo: "Cortar igual não é cortar com critério.", tom: "ruim" }],
        narracao: "O corte é igual para todo mundo, inclusive para a vacina. O Valdemar sorri." }),
      opt({ id: "desbloqueio-sob-medida", rotulo: "Cortar igual e “desbloquear” verba só para o fornecedor que pagar uma taxa", kind: "desvio", resumo: "Escolher quem recebe o desbloqueio em troca de um percentual por fora.",
        custo: m(0.6), prazo: "2 semanas", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "O desbloqueio vira favor, não critério" }],
        custoPct: 0.6, aliado: "valdemar", desvio: DEV("Cobrar “taxa de desbloqueio” do fornecedor", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 13, influencia: 5, evidencias: 3, rel: { valdemar: 8, cecilia: -8 }, attrs: { rede: 4, caraDePau: 3 }, pub: { acesso: -3 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { qualidade: -3 } }, titulo: "A fila do desbloqueio", mensagem: "Quem não pagou ficou sem verba, e quem pagou entregou menos. A Controladoria abriu uma pasta.", motivo: "Desbloqueio por favor, não por critério.", tom: "ruim" }],
        narracao: "O desbloqueio sai rápido para quem tinha o contato certo. A pasta da Controladoria sai um pouco depois." }),
    ],
  },

  /* ───────── D39 — pacote de emendas ───────── */
  {
    id: "d39", caso: 39, mesa: "gabinete-ministro", titulo: "O pacote de emendas do líder", conceito: "emenda-transparente", basePct: 3, gestoPadrao: "assinar",
    papelAssinado: "PORTARIA — CRITÉRIOS E EXECUÇÃO DE EMENDAS PARLAMENTARES — documento fictício",
    pergunta: "O líder do governo quer liberar 38 emendas “porteira fechada”. Só 14 têm projeto e custeio. Como executar?",
    opcoes: [
      opt({ id: "emenda-criterio", rotulo: "Executar com critérios técnicos: projeto, custeio e rastreio, e publicar a lista", kind: "competente", resumo: "Aceitar o pacote com critérios, reorientando as emendas sem projeto para onde a necessidade é maior.",
        requer: { achado: "f39-criterio", dica: "Compare a lista do líder com a matriz técnica de necessidade e capacidade." },
        custo: m(0.9), prazo: "6 semanas", ganho: () => "Recurso chega a quem precisa e deixa rastro",
        riscos: [{ texto: "O líder do governo vai reclamar" }, { texto: "Exige prazo para completar os projetos" }],
        custoPct: 0.9, aplica: ["emenda-transparente", "emenda-custeio", "transparencia"], conquista: "n6-emenda-com-criterio",
        efeitos: { attrs: { competencia: 6, confianca: 3, persuasao: 3 }, pub: { acesso: 5, qualidade: 2, sustentabilidade: 2 }, filaMin: -4, rel: { goncalo: -2, pedro: 6, cecilia: 4 } },
        depois: [{ depois: 2, efeitos: { pub: { acesso: 4, qualidade: 3 }, filaMin: -5, attrs: { confianca: 3 } }, titulo: "Emendas que viraram serviço", mensagem: "As emendas com projeto e custeio saíram do papel e a lista pública deixou claro onde o dinheiro foi parar.", motivo: "Critério técnico e rastro desde o começo.", tom: "bom" }],
        narracao: "Pedro carimba a lista pública. Gonçalo lê os critérios, fecha a pasta e murmura que “está aprendendo a contar de novo”." }),
      opt({ id: "so-com-projeto", rotulo: "Executar só as 14 emendas com projeto e devolver as outras para completar", kind: "prudente", resumo: "Liberar o que está pronto e pedir que o restante volte com projeto.",
        custo: m(0.6), prazo: "4 semanas", riscos: [{ texto: "Os recursos das outras 24 ficam parados por um tempo" }, { texto: "O líder pode se sentir desautorizado" }],
        custoPct: 0.6, efeitos: { attrs: { competencia: 3, confianca: 1 }, pub: { acesso: 2 }, rel: { goncalo: -5, pedro: 3 } },
        depois: [{ depois: 2, efeitos: { pub: { acesso: 2 }, attrs: { confianca: 1 } }, titulo: "Parte voltou com projeto", mensagem: "Algumas das emendas devolvidas retornaram com plano e foram executadas.", motivo: "Quem tinha projeto conseguiu o recurso.", tom: "neutro" }],
        narracao: "A pasta fica pela metade. A metade que sai tem nome, endereço e cronograma." }),
      opt({ id: "porteira-fechada", rotulo: "Liberar tudo em porteira fechada para manter o líder satisfeito", kind: "comodo", resumo: "Transferir os recursos sem projeto, destino nem prestação de contas definidos.",
        custo: m(1.7), prazo: "Imediato", riscos: [{ texto: "Só 22% das emendas desse tipo têm destino rastreável", precisa: "c39-rastro" }, { texto: "Recursos podem ficar sem uso" }],
        custoPct: 1.7, aliado: "goncalo", conquista: "n6-porteira-fechada",
        efeitos: { attrs: { popularidade: 3, rede: 4, competencia: -3 }, pub: { sustentabilidade: -3 }, rel: { goncalo: 10 }, favor: { goncalo: 6 }, dependencia: 4 },
        depois: [{ depois: 2, efeitos: { pub: { acesso: -2, qualidade: -2 }, attrs: { confianca: -4 } }, titulo: "Recurso sem destino", mensagem: "Parte do dinheiro foi parar em obras sem equipe e compras sem uso, e ninguém consegue dizer onde exatamente.", motivo: "Sem critério, não há rastro.", tom: "ruim" }],
        narracao: "Gonçalo sai sorrindo com a pasta debaixo do braço. A lista de destinos fica em branco." }),
      opt({ id: "taxa-de-liberacao", rotulo: "Liberar o pacote e cobrar uma “taxa de liberação” por emenda", kind: "desvio", resumo: "Liberar as emendas em troca de um percentual por fora.",
        custo: m(1.7), prazo: "2 semanas", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Dependência do líder e dos prefeitos" }],
        custoPct: 1.7, aliado: "goncalo", desvio: DEV("Cobrar “taxa de liberação” por emenda", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 13, influencia: 6, evidencias: 3, rel: { goncalo: 8, pedro: -8 }, attrs: { rede: 4, caraDePau: 3 }, pub: { sustentabilidade: -2 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { acesso: -2 }, attrs: { confianca: -3 } }, titulo: "O pedágio das emendas", mensagem: "Dois prefeitos relataram a cobrança. A Controladoria cruzou os repasses com os depósitos.", motivo: "Emenda liberada com pedágio.", tom: "ruim" }],
        narracao: "Os repasses saem rápido. Os depósitos também deixam um caminho." }),
    ],
  },

  /* ───────── D40 — duas prioridades ───────── */
  {
    id: "d40", caso: 40, mesa: "gabinete-ministro", titulo: "Oncologia ou atenção primária", conceito: "prioridade-nacional", basePct: 4, gestoPadrao: "assinar",
    papelAssinado: "PORTARIA — PRIORIDADES NACIONAIS DE SAÚDE — documento fictício",
    pergunta: "O espaço fiscal comporta uma prioridade grande ou duas menores. Zerar a fila de oncologia ou expandir a atenção primária?",
    opcoes: [
      opt({ id: "priorizar-faseado", rotulo: "Tratar os pacientes acima de 60 dias e começar a atenção primária em fases, com metas públicas", kind: "competente", resumo: "Atacar o que a lei já exige agora e investir no que evita a fila de amanhã, tudo dentro do espaço fiscal.",
        custo: m(3.2), prazo: "12 meses, em fases", ganho: () => "Fila encurta agora e a primária reduz a próxima",
        riscos: [{ texto: "Nenhuma das duas é resolvida de uma vez" }, { texto: "Exige acompanhar metas trimestrais" }],
        custoPct: 3.2, aplica: ["prioridade-nacional", "fila-regulada", "planejamento-necessidade"], conquista: "n6-duas-prioridades",
        efeitos: { attrs: { competencia: 6, confianca: 2, persuasao: 2 }, pub: { acesso: 4, qualidade: 3, sustentabilidade: 1 }, filaMin: -9, rel: { helena: 4, augusto: 6, cecilia: 6 } },
        depois: [{ depois: 2, efeitos: { filaMin: -8, pub: { acesso: 4 }, attrs: { confianca: 3 } }, titulo: "A fila encurtou e não voltou", mensagem: "Os casos atrasados foram tratados e as novas equipes de saúde da família começaram a detectar mais cedo.", motivo: "Prioridade com fonte, fases e meta.", tom: "bom" }],
        narracao: "Cecília e Helena concordam, pela primeira vez, sobre o mesmo gráfico. Augusto anota: “fases, fonte e meta”." }),
      opt({ id: "so-oncologia", rotulo: "Concentrar tudo em zerar a fila de oncologia", kind: "prudente", resumo: "Uma única prioridade, forte e visível, usando quase todo o espaço fiscal.",
        custo: m(3.0), prazo: "12 meses", riscos: [{ texto: "Sem atenção primária, a fila volta a crescer" }, { texto: "Consome quase todo o espaço fiscal", precisa: "c40-espaco" }],
        custoPct: 3.0, efeitos: { attrs: { competencia: 3, popularidade: 3 }, pub: { acesso: 3, qualidade: 2 }, filaMin: -6, rel: { cecilia: 3, augusto: 2 } },
        depois: [{ depois: 2, efeitos: { filaMin: 4, pub: { acesso: -2 } }, titulo: "A fila voltou a crescer", mensagem: "Sem investir na detecção precoce, os casos novos reabasteceram a fila que acabara de ser zerada.", motivo: "Resolveu o estoque da fila, não o fluxo.", tom: "neutro" }],
        narracao: "A manchete é ótima. O gráfico do próximo ano, nem tanto." }),
      opt({ id: "anunciar-as-duas", rotulo: "Anunciar as duas prioridades e deixar a Fazenda achar o dinheiro", kind: "fraco", resumo: "Prometer tudo sem apontar a fonte de recursos.",
        custo: m(0.4), prazo: "Imediato no anúncio", riscos: [{ texto: "A promessa passa do espaço fiscal", precisa: "c40-espaco" }, { texto: "Frustra quem esperava" }],
        custoPct: 0.4, efeitos: { attrs: { popularidade: 4, competencia: -3 }, pub: { sustentabilidade: -4 }, rel: { helena: -5, augusto: -2 } },
        depois: [{ depois: 2, efeitos: { attrs: { confianca: -5 }, pub: { sustentabilidade: -3 }, filaMin: 3 }, titulo: "A promessa sem caixa", mensagem: "A Fazenda negou o dinheiro, e o anúncio virou cobrança nas redes e no Congresso.", motivo: "Prioridade sem fonte não sai do papel.", tom: "ruim" }],
        narracao: "O anúncio é lindo. O repasse, que ninguém combinou, não aparece." }),
      opt({ id: "mutirao-unico", rotulo: "Contratar um “mutirão” único com a Clínica Horizonte e receber uma comissão", kind: "desvio", resumo: "Fechar um contrato grande com uma clínica amiga em troca de um percentual por fora.",
        custo: m(3.4), prazo: "2 meses", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Contrato único, sem cotação nem metas" }],
        custoPct: 3.4, aliado: "valdemar", desvio: DEV("Receber comissão do mutirão", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 14, influencia: 6, evidencias: 3, rel: { valdemar: 8, cecilia: -8 }, attrs: { rede: 4, caraDePau: 3 }, pub: { acesso: 2 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { qualidade: -3, sustentabilidade: -3 } }, titulo: "O mutirão caro", mensagem: "O preço por paciente foi o dobro da média e o atendimento só cobriu metade do prometido. A Controladoria pediu os contratos.", motivo: "Contrato único, sem cotação e com favorecimento.", tom: "ruim" }],
        narracao: "O mutirão atende bastante gente, por um preço que ninguém consegue explicar." }),
    ],
  },

  /* ───────── D41 — surto nacional ───────── */
  {
    id: "d41", caso: 41, mesa: "gabinete-ministro", titulo: "Surto nacional: estoque, estados e verdade", conceito: "crise-sanitaria-nacional", basePct: 4, gestoPadrao: "assinar",
    papelAssinado: "PORTARIA — RESPOSTA A EMERGÊNCIA EM SAÚDE PÚBLICA — documento fictício",
    pergunta: "O vírus Zéfiro-9 (fictício) dobra a cada 6 dias e o estoque estratégico cobre só 9. Como responder?",
    opcoes: [
      opt({ id: "resposta-coordenada", rotulo: "Remanejar entre estados, repor pela ata e pelo organismo internacional e comunicar todo dia", kind: "competente", resumo: "Coordenar com os estados, comprar com cotação e publicar o boletim diário com o que se sabe e o que não se sabe.",
        requer: { achado: "f41-estoque", dica: "Cruze o boletim do surto com o painel do estoque estratégico." },
        custo: m(2.4), prazo: "48 horas para o remanejamento, 10 dias para a reposição", ganho: () => "Estoque para a crise e confiança preservada",
        riscos: [{ texto: "Exige coordenação constante com 27 estados" }, { texto: "A comunicação honesta inclui o que ainda se ignora" }],
        custoPct: 2.4, aplica: ["crise-sanitaria-nacional", "emergencia-transparencia", "reserva-urgencia"], conquista: "n6-crise-com-recibo",
        efeitos: { attrs: { competencia: 6, confianca: 4, persuasao: 2 }, pub: { qualidade: 4, acesso: 3, sustentabilidade: 1 }, estoqueDias: 10, rel: { cecilia: 6, teodoro: 6, celia: 6, augusto: 4 } },
        depois: [{ depois: 2, efeitos: { estoqueDias: 6, pub: { acesso: 4, qualidade: 3 }, attrs: { confianca: 3 } }, titulo: "O país atravessou o pico", mensagem: "O estoque foi remanejado antes da falta e as compras chegaram no prazo, com preços conferidos e boletins diários.", motivo: "Coordenação, cotação e verdade.", tom: "bom" }],
        narracao: "Cecília conduz o remanejamento, Teodoro abre os números do estado e Célia lê o primeiro boletim. Ninguém dorme muito, mas todos sabem por quê." }),
      opt({ id: "remanejar-e-esperar", rotulo: "Remanejar entre estados e comprar aos poucos, sem decretar emergência nem ampliar a comunicação", kind: "prudente", resumo: "Resposta discreta e gradual, sem alarme público.",
        custo: m(1.5), prazo: "10 dias", riscos: [{ texto: "Pode ficar aquém se o surto acelerar" }, { texto: "Pouca informação ao público" }],
        custoPct: 1.5, efeitos: { attrs: { competencia: 3, confianca: -1 }, pub: { qualidade: 1 }, estoqueDias: 5, rel: { cecilia: 2, celia: -2 } },
        depois: [{ depois: 2, efeitos: { attrs: { confianca: -2 }, estoqueDias: -2 }, titulo: "Faltou clareza", mensagem: "O estoque deu conta, mas a falta de informação gerou boatos e corrida às farmácias.", motivo: "A resposta foi boa, a comunicação foi tímida.", tom: "neutro" }],
        narracao: "Os estados recebem o estoque e pouco mais. A informação ao público é cuidadosa até demais." }),
      opt({ id: "tudo-sob-controle", rotulo: "Anunciar que está tudo sob controle e esperar", kind: "fraco", resumo: "Evitar pânico dizendo que o estoque é suficiente.",
        custo: m(0.3), prazo: "Imediato no anúncio", riscos: [{ texto: "O estoque dura 9 dias, não 25", precisa: "c41-estoque" }, { texto: "A verdade chega antes do comunicado" }],
        custoPct: 0.3, efeitos: { attrs: { popularidade: 3, competencia: -3 }, rel: { celia: -6, teodoro: -6, cecilia: -4 } },
        depois: [{ depois: 2, efeitos: { estoqueDias: -6, pub: { acesso: -4 }, attrs: { confianca: -6 } }, titulo: "A realidade chegou antes do comunicado", mensagem: "Faltaram insumos em três estados, e a frase “sob controle” virou meme no mesmo dia.", motivo: "Tranquilidade fabricada não enche estoque.", tom: "ruim" }],
        narracao: "O comunicado é calmo. O estoque, que não sabia disso, continua acabando." }),
      opt({ id: "dispensa-biovale", rotulo: "Comprar tudo da Biovale, sem cotação, e combinar uma “taxa de urgência”", kind: "desvio", resumo: "Fechar a compra emergencial com a empresa que entrega em 48 horas, recebendo um percentual por fora.",
        custo: m(3.6), prazo: "48 horas", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento",
        riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "Preço 2,8 vezes maior que o da ata", precisa: "c41-ofertas" }],
        custoPct: 3.6, aliado: "valdemar", desvio: DEV("Receber “taxa de urgência” da Biovale", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { dependencia: 14, influencia: 5, evidencias: 3, rel: { valdemar: 8, cecilia: -8, pedro: -6 }, attrs: { rede: 4, caraDePau: 3 }, estoqueDias: 8 },
        depois: [{ depois: 2, efeitos: { evidencias: 2, pub: { sustentabilidade: -4 }, attrs: { confianca: -4 } }, titulo: "A conta da urgência", mensagem: "Os insumos chegaram rápido, mas o preço foi 2,8 vezes o da ata e a empresa tinha lote vencendo. Pedro quer ver os papéis.", motivo: "Urgência usada como desculpa para pular a cotação.", tom: "ruim" }],
        narracao: "O estoque chega em dois dias, com uma nota que ninguém quer ler." }),
    ],
  },

  /* ───────── D42 — votação da coalizão ───────── */
  {
    id: "d42", caso: 42, mesa: "gabinete-ministro", titulo: "O orçamento e a coalizão", conceito: "coalizao-limites", basePct: 0, gestoPadrao: "parecer",
    papelAssinado: "OFÍCIO AO CONGRESSO — ORÇAMENTO DA SAÚDE E CRITÉRIOS PÚBLICOS — documento fictício",
    pergunta: "Faltam 16 votos para aprovar o orçamento da Saúde. O líder oferece fechar a conta em troca de cargo e de emendas sem critério. O que você faz?",
    opcoes: [
      opt({ id: "negociar-as-claras", rotulo: "Negociar às claras: metas e critérios públicos para todos, votos pelo mérito", kind: "competente", gesto: "parecer", resumo: "Apresentar o orçamento da Saúde com metas, critérios de emenda e prazos iguais para toda a base e para o centro.",
        requer: { achado: "f42-placar", dica: "Confronte o placar de votos com o bilhete do líder e veja o outro caminho." },
        custo: m(0.2), prazo: "3 semanas de articulação", ganho: () => "Orçamento aprovado sem dívida política",
        riscos: [{ texto: "Pode demorar mais que o toma lá dá cá" }, { texto: "O líder do governo pode ficar contrariado" }],
        custoPct: 0.2, aplica: ["coalizao-limites", "conflito-interesses", "transparencia"], conquista: "n6-voto-sem-troca",
        efeitos: { attrs: { competencia: 5, confianca: 4, persuasao: 4, rede: 2 }, pub: { sustentabilidade: 2, acesso: 2 }, rel: { goncalo: 2, ramiro: 6, augusto: 8, marlene: 4 } },
        narracao: "Ramiro lê as metas, Marlene conta os votos do centro e o orçamento passa. Gonçalo cumprimenta, meio sem jeito: “Foi no braço limpo.”" }),
      opt({ id: "adiar-votacao", rotulo: "Adiar a votação para ganhar tempo de montar a maioria", kind: "prudente", gesto: "parecer", resumo: "Pedir mais uma semana e tentar construir a maioria sem fechar o pacote.",
        custo: m(0.1), prazo: "1 a 2 semanas", riscos: [{ texto: "Os programas ficam sem orçamento aprovado por mais tempo" }, { texto: "O líder usa o atraso para pressionar" }],
        custoPct: 0.1, efeitos: { attrs: { competencia: 1, confianca: -1 }, pub: { sustentabilidade: -2, acesso: -1 }, rel: { goncalo: -1, augusto: -2 } },
        narracao: "A votação fica para a semana seguinte. Os 16 votos continuam faltando, e o relógio, tiquetaqueando." }),
      opt({ id: "toma-la-da-ca", rotulo: "Fechar o pacote do líder: cargo, emendas sem critério e critérios em revisão", kind: "comodo", resumo: "Trocar apoio por cargo técnico e emenda sem critério.",
        custo: m(0.8), prazo: "2 dias", riscos: [{ texto: "Vende decisões técnicas por voto", precisa: "c42-pedido" }, { texto: "A fatura política não prescreve" }],
        custoPct: 0.8, aliado: "goncalo", conquista: "n6-toma-la-da-ca",
        efeitos: { attrs: { popularidade: 4, rede: 5, competencia: -3, confianca: -4 }, rel: { goncalo: 10, ramiro: -4, marlene: -4 }, favor: { goncalo: 8 }, dependencia: 5 },
        narracao: "O orçamento passa com os votos certos e a fatura combinada. Marlene anota o número e não comenta." }),
      opt({ id: "entregar-ao-lider", rotulo: "Entregar a negociação ao líder, sem acompanhar", kind: "fraco", resumo: "Delegar a articulação inteira, sem saber o que será prometido.",
        custo: m(0.3), prazo: "Imediato", riscos: [{ texto: "Promessas feitas em seu nome", precisa: "c42-pedido" }, { texto: "Perde o controle do que foi combinado" }],
        custoPct: 0.3, aliado: "goncalo", efeitos: { attrs: { competencia: -3, confianca: -4, rede: 2 }, rel: { goncalo: 6, marlene: -3 }, favor: { goncalo: 4 }, dependencia: 3 },
        narracao: "O orçamento passa e o ministro descobre depois, pela imprensa, o que foi prometido." }),
    ],
  },
];

/* ═════════════════════════════ CASOS ═════════════════════════════ */

const CASOS: CaseDef[] = [
  { id: "caso37", caso: 37, titulo: "A meta fiscal e a saúde", episodio: "Episódio 1", location: "gabinete-ministro", pistas: ["c37-meta", "c37-pisos", "c37-corte"], conversas: ["n6-augusto-abertura", "n6-bento-regra", "n6-helena-meta"], decisao: "d37",
    chamada: "Você virou Ministro(a) de Estado da Saúde. A Fazenda precisa fechar a meta fiscal e já olhou para o seu orçamento.",
    objetivo: "Compare a meta, o piso e a sugestão de corte antes de responder à Fazenda.", dica: "Dica do Professor Bento: cumprir a regra fiscal não é descumprir o piso. O esforço vem do que é possível, e o resto se negocia." },
  { id: "caso38", caso: 38, titulo: "Bloqueio de 15%", episodio: "Episódio 2", location: "gabinete-ministro", pistas: ["c38-decreto", "c38-programas", "c38-oficio"], conversas: ["n6-valdemar-linear", "n6-cecilia-essenciais", "n6-helena-bloqueio"], decisao: "d38",
    chamada: "A receita veio abaixo do previsto e o decreto bloqueia 15% das despesas discricionárias. Cortar igual em tudo parece o mais simples.",
    objetivo: "Separe o que é obrigatório e essencial do que pode esperar.", dica: "Dica do Professor Bento: bloqueio é priorização. Cortar igual em tudo atinge o essencial na mesma proporção que o supérfluo." },
  { id: "caso39", caso: 39, titulo: "O pacote de emendas", episodio: "Episódio 3", location: "gabinete-ministro", pistas: ["c39-lista", "c39-criterios", "c39-rastro"], conversas: ["n6-goncalo-porteira", "n6-pedro-rastro", "n6-cornelio-emendas"], decisao: "d39",
    chamada: "O líder do governo chegou com 38 emendas para liberar, “porteira fechada”. O dinheiro é público, e a pressa é política.",
    objetivo: "Compare a lista do líder com a necessidade dos municípios e o rastro do ano passado.", dica: "Dica do Professor Bento: emenda boa tem projeto, custeio e destino público. O resto é cheque em branco." },
  { id: "caso40", caso: 40, titulo: "Oncologia ou atenção primária", episodio: "Episódio 4", location: "gabinete-ministro", pistas: ["c40-oncologia", "c40-primaria", "c40-espaco"], conversas: ["n6-cecilia-oncologia", "n6-helena-fonte", "n6-augusto-prioridades"], decisao: "d40",
    chamada: "Duas prioridades disputam um só orçamento: zerar a fila de oncologia ou expandir a atenção primária. Todo mundo quer as duas.",
    objetivo: "Compare custos, prazos e o espaço fiscal antes de escolher.", dica: "Dica do Professor Bento: prioridade sem fonte de recursos é desejo. Com fases e metas, vira política." },
  { id: "caso41", caso: 41, titulo: "Surto nacional", episodio: "Episódio 5", location: "gabinete-ministro", pistas: ["c41-boletim", "c41-estoque", "c41-ofertas"], conversas: ["n6-cecilia-surto", "n6-teodoro-estados", "n6-celia-comunicacao"], decisao: "d41",
    chamada: "O vírus Zéfiro-9 (fictício) está em nove estados e dobra a cada 6 dias. O estoque estratégico não foi feito para isso.",
    objetivo: "Veja o ritmo do surto, o estoque real e as ofertas antes de agir.", dica: "Dica do Professor Bento: em crise, coordene, compre com cotação e conte a verdade. Quem esconde o problema perde a confiança." },
  { id: "caso42", caso: 42, titulo: "O orçamento e a coalizão", episodio: "Episódio 6", location: "gabinete-ministro", pistas: ["c42-placar", "c42-pedido", "c42-orcamento"], conversas: ["n6-goncalo-votos", "n6-ramiro-orcamento", "n6-marlene-coalizao"], decisao: "d42",
    chamada: "Faltam 16 votos para aprovar o orçamento da Saúde. O líder tem uma solução e uma conta que não aparece no placar.",
    objetivo: "Compare o placar, o pedido do líder e o parecer antes de negociar.", dica: "Dica do Professor Bento: coalizão se faz com regras iguais para todos. Decisão técnica não se vende por voto." },
];

/* ═════════════════════════════ CONCEITOS E CONQUISTAS ═════════════════════════════ */

const CONCEITOS: LevelContent["conceitos"] = {
  "regra-fiscal": {
    id: "regra-fiscal", titulo: "Cumprir a meta sem descumprir outra regra", tema: "Regra fiscal", dificuldade: 2,
    texto: "A Lei de Responsabilidade Fiscal pede planejamento e equilíbrio das contas, e a meta do ano orienta o esforço do governo. Mas a meta convive com outras regras, como o piso de aplicação em saúde. Cumprir uma regra descumprindo outra não é economia: é só trocar o problema de lugar.",
    aplicacao: "Na vida real: ao apertar o orçamento de casa ou da associação, comece pelo que é obrigatório e essencial, depois negocie o resto. Anote a conta, sem inventar números.",
    fonte: { rotulo: "Lei de Responsabilidade Fiscal — LC 101/2000", url: LRF, classificacao: "oficial" },
  },
  contingenciamento: {
    id: "contingenciamento", titulo: "Bloqueio de despesa é priorização", tema: "Orçamento e execução", dificuldade: 2,
    texto: "Quando a receita fica abaixo do previsto, a LRF prevê limitar o empenho e a movimentação financeira (art. 9º), preservando as despesas obrigatórias. O que é discricionário pode ser bloqueado, e cabe ao gestor escolher o quê, com critério. Cortar igual em tudo costuma atingir o essencial.",
    aplicacao: "Na vida real: se a renda cai, separe o que é obrigatório (aluguel, remédio, escola) do que pode esperar, e proteja o primeiro grupo antes de cortar proporcionalmente.",
    fonte: { rotulo: "Lei de Responsabilidade Fiscal — LC 101/2000 (art. 9º)", url: LRF, classificacao: "oficial" },
  },
  "emenda-transparente": {
    id: "emenda-transparente", titulo: "Emenda com critério, projeto e rastro", tema: "Emendas parlamentares", dificuldade: 3,
    texto: "A Constituição prevê emendas ao orçamento, inclusive as individuais, com parte obrigatória para a saúde. Para que o dinheiro vire serviço, é preciso critério técnico (necessidade e capacidade de operar), projeto, custeio e destino público. Sem isso, o recurso perde o rastro.",
    aplicacao: "Na vida real: quando alguém oferece dinheiro ou doação, pergunte para quê, quem vai executar, como se presta contas e quem pode conferir.",
    fonte: { rotulo: "Constituição Federal (art. 166) — emendas ao orçamento", url: CF88, classificacao: "oficial" },
  },
  "prioridade-nacional": {
    id: "prioridade-nacional", titulo: "Prioridade tem evidência, fases e fonte", tema: "Planejamento nacional", dificuldade: 3,
    texto: "Quando duas prioridades disputam o mesmo orçamento, comparam-se custo, prazo, efeito e a fonte dos recursos. Muitas vezes a melhor saída é fasear: resolver o que a lei e a urgência exigem agora e investir no que evita o problema de amanhã. Anunciar sem fonte é só desejo.",
    aplicacao: "Na vida real: ao escolher entre duas metas (reformar a casa ou reservar para emergência), calcule custo, prazo e de onde sai o dinheiro, e divida em etapas.",
    fonte: { rotulo: "LC 141/2012 — planejamento e aplicação em saúde", url: LC141, classificacao: "oficial" },
  },
  "crise-sanitaria-nacional": {
    id: "crise-sanitaria-nacional", titulo: "Crise sanitária: coordene, reponha e conte a verdade", tema: "Emergência em saúde", dificuldade: 3,
    texto: "Numa emergência de saúde pública de importância nacional (como prevê o Decreto 7.616/2011), a União coordena estados e municípios, remaneja estoque, repõe insumos com cotação e informa a população com honestidade. Urgência autoriza rapidez, não opacidade nem preço sem comparação.",
    aplicacao: "Na vida real: em qualquer emergência (enchente, queda de energia), veja o estoque real, divida o que sobra, compare preços rapidamente e diga às pessoas o que se sabe e o que não se sabe.",
    fonte: { rotulo: "Lei 8.080/1990 — SUS e coordenação federativa", url: L8080, classificacao: "oficial" },
  },
  "coalizao-limites": {
    id: "coalizao-limites", titulo: "Coalizão com limites: decisão técnica não se vende por voto", tema: "Articulação institucional", dificuldade: 3,
    texto: "Governar exige apoio, e negociar faz parte. Mas a Constituição (art. 37) exige impessoalidade e moralidade: cargos técnicos têm perfil e critérios de política pública são regras públicas. Troque apoio por transparência e metas, não por decisões técnicas.",
    aplicacao: "Na vida real: ao pedir apoio numa associação ou condomínio, ofereça regras claras e resultados para todos, e desconfie de quem cobra um favor pessoal em troca do voto.",
    fonte: { rotulo: "Constituição Federal (art. 37) — princípios da administração pública", url: CF88, classificacao: "oficial" },
  },
};

const CONQUISTAS: AchievementDef[] = [
  { id: "n6-meta-com-piso", nome: "Meta Com Piso", descricao: "Contribuiu com a meta fiscal sem deixar a Saúde abaixo do piso.", trilha: "gestao", icone: "📐" },
  { id: "n6-bloqueio-seletivo", nome: "Bloqueio Que Poupa o Essencial", descricao: "Aplicou o bloqueio no que podia esperar, protegendo vacinas e fila.", trilha: "gestao", icone: "🛡️" },
  { id: "n6-emenda-com-criterio", nome: "Emenda Com Critério", descricao: "Executou o pacote de emendas com projeto, custeio e lista pública.", trilha: "gestao", icone: "📋" },
  { id: "n6-duas-prioridades", nome: "Duas Prioridades, Uma Fonte", descricao: "Faseou as prioridades dentro do espaço fiscal, com metas públicas.", trilha: "gestao", icone: "⚖️" },
  { id: "n6-crise-com-recibo", nome: "Crise Com Recibo", descricao: "Coordenou os estados, comprou com cotação e contou a verdade na crise.", trilha: "gestao", icone: "📡" },
  { id: "n6-voto-sem-troca", nome: "Voto Sem Troca", descricao: "Aprovou o orçamento da Saúde sem trocar decisão técnica por voto.", trilha: "gestao", icone: "🗳️" },
  { id: "n6-porteira-fechada", nome: "Porteira Fechada", descricao: "Liberou emendas sem projeto, destino nem prestação de contas.", trilha: "satira", icone: "🚪" },
  { id: "n6-toma-la-da-ca", nome: "Toma Lá, Dá Cá", descricao: "Fechou a coalizão trocando cargo e emenda por voto.", trilha: "satira", icone: "🤝" },
];

export const N6: LevelContent = {
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
