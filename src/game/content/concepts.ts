import type { ConceptId } from "../engine/types";
import type { AchievementDef, Concept, QuizQuestion } from "./types";
import { NIVEIS_LISTA } from "./niveis";

const CGU = "https://portaldatransparencia.gov.br/entenda-a-gestao-publica/execucao-despesa-publica";
const SIOPS = "https://www.gov.br/saude/pt-br/acesso-a-informacao/siops";
const LC141 = "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp141.htm";
const LRF = "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm";
const L14133 = "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm";
const L4320 = "https://www.planalto.gov.br/ccivil_03/leis/l4320.htm";
const SICONFI = "https://www.gov.br/conecta/catalogo/apis/siconfi-extratos-das-declaracoes-contabeis";

/** Cartões do Caderno de Gestão. Linguagem simples; a fonte aparece quando cabe. */
const CONCEPTS_N12 = {
  "medir-antes": {
    id: "medir-antes", titulo: "Meça antes de comprar", tema: "Estoque e planejamento", dificuldade: 1,
    texto: "Antes de pedir mais, descubra quanto se consome, quanto vence e para quantos dias o estoque dura (a 'cobertura'). Comprar sem medir gera dois problemas ao mesmo tempo: falta de um item e desperdício de outro.",
    aplicacao: "Na vida real: em casa, na empresa ou na associação do bairro, anote o consumo de um mês antes de fazer a próxima compra grande.",
    fonte: { rotulo: "Conceito didático de gestão de estoques", url: null, classificacao: "estimativa" },
  },
  gargalo: {
    id: "gargalo", titulo: "Ache o gargalo antes de gastar", tema: "Qualidade dos serviços", dificuldade: 2,
    texto: "Fila grande nem sempre quer dizer 'falta de gente'. Muitas vezes há horários sobrando e horários estourados. Mapear onde o processo trava costuma custar menos do que contratar sem critério.",
    aplicacao: "Na vida real: compare o horário de pico do serviço que você usa com a escala de quem atende. Pergunte: o recurso está no lugar certo?",
    fonte: { rotulo: "Conceito didático de gestão de processos", url: null, classificacao: "estimativa" },
  },
  "custo-total": {
    id: "custo-total", titulo: "Preço baixo não é custo baixo", tema: "Compras e contratos", dificuldade: 2,
    texto: "O custo total soma aquisição, manutenção, insumos e treinamento ao longo da vida útil. A proposta mais barata no dia da compra pode ser a mais cara em cinco anos.",
    aplicacao: "Na vida real: ao comprar um eletrodoméstico, olhe também o preço das peças e do conserto, não só a etiqueta.",
    fonte: { rotulo: "Conceito didático: custo total de propriedade", url: null, classificacao: "estimativa" },
  },
  "corte-linear": {
    id: "corte-linear", titulo: "Cortar parelho não é economizar", tema: "Eficiência", dificuldade: 2,
    texto: "Economia é entregar o mesmo serviço, com a mesma qualidade e o mesmo acesso, gastando menos. Reduzir atendimento reduz gasto, mas não é eficiência: é entrega a menos. Compare volume, qualidade e acesso antes de comemorar a economia.",
    aplicacao: "Na vida real: se a conta de luz caiu porque você ficou no escuro, não foi economia — foi privação.",
    fonte: { rotulo: "Conceito didático de eficiência no gasto público", url: null, classificacao: "estimativa" },
  },
  "entrega-vs-anuncio": {
    id: "entrega-vs-anuncio", titulo: "Anunciar não é entregar", tema: "Resultados e confiança", dificuldade: 1,
    texto: "Popularidade (aplauso) e confiança (resultado comprovado) são coisas diferentes. Uma inauguração antes da obra pronta rende aplauso hoje e desconfiança amanhã. Obra entregue é obra que funciona.",
    aplicacao: "Na vida real: peça sempre o cronograma físico (o que existe de fato) e não só o percentual financeiro (quanto já foi pago).",
    fonte: { rotulo: "Conceito didático de gestão de projetos", url: null, classificacao: "estimativa" },
  },
  "execucao-despesa": {
    id: "execucao-despesa", titulo: "Empenho, liquidação e pagamento", tema: "Execução da despesa", dificuldade: 2,
    texto: "A despesa pública passa por etapas: empenho (reserva do dinheiro), liquidação (confirma que o bem ou serviço foi realmente entregue) e pagamento. Elas são fases da MESMA despesa — não somam como se fossem dinheiro novo — e a liquidação é o momento de conferir a entrega.",
    aplicacao: "Na vida real: não pague a obra, nem na reforma da sua casa, sem conferir se o serviço foi feito.",
    fonte: { rotulo: "CGU — Portal da Transparência: Execução da despesa pública", url: CGU, classificacao: "oficial" },
  },
  "controle-interno": {
    id: "controle-interno", titulo: "Controle interno não é inimigo", tema: "Prestação de contas", dificuldade: 2,
    texto: "A controladoria compara registro com registro. Para quem tem os documentos organizados, uma auditoria é uma oportunidade de mostrar o que foi feito. Auditoria consulta o que já existe: não inventa irregularidades por azar.",
    aplicacao: "Na vida real: guarde notas, atas e comprovantes. Organização é a melhor defesa de quem trabalha direito.",
    fonte: { rotulo: "Conceito didático de controle interno", url: null, classificacao: "estimativa" },
  },
  "conflito-interesses": {
    id: "conflito-interesses", titulo: "Conflito de interesses e concorrência", tema: "Transparência", dificuldade: 3,
    texto: "Indicar um parente ou aliado não é crime por si só. O problema é decidir sem critério e sem comparar alternativas. Cotar com mais de um fornecedor, registrar por escrito e declarar o vínculo protegem a decisão — e quem decide.",
    aplicacao: "Na vida real: quando houver ligação pessoal com a contratação, declare-a e deixe outra pessoa decidir ou compare propostas abertamente.",
    fonte: { rotulo: "Conceito didático de integridade pública", url: null, classificacao: "estimativa" },
  },
  "reserva-urgencia": {
    id: "reserva-urgencia", titulo: "Às vezes gastar mais é o certo", tema: "Sustentabilidade fiscal", dificuldade: 3,
    texto: "Numa crise comprovada, manter o atendimento pode custar mais e ainda assim ser a melhor decisão. O que não pode é gastar sem critério: cotação rápida, registro e justificativa continuam valendo. Orçamento mostra limites; não decide sozinho.",
    aplicacao: "Na vida real: ter uma reserva para imprevistos evita decidir no desespero.",
    fonte: { rotulo: "Conceito didático; saúde municipal: SIOPS (Ministério da Saúde)", url: SIOPS, classificacao: "oficial" },
  },
  "planejamento-necessidade": {
    id: "planejamento-necessidade", titulo: "Planeje pela necessidade, não pelo pedido", tema: "Planejamento e prioridades", dificuldade: 2,
    texto: "Antes de escolher onde investir, cruze duas coisas: quem está sem cobertura e de onde vem a demanda (por exemplo, a origem dos atendimentos de urgência). O Plano Municipal de Saúde e a Programação Anual existem para tornar esses critérios públicos — assim, a prioridade deixa de depender de quem pede mais alto.",
    aplicacao: "Na vida real: ao priorizar algo na associação do bairro ou em casa, escreva os critérios antes de ouvir os pedidos e compare cada pedido com eles.",
    fonte: { rotulo: "Lei Complementar 141/2012 (planejamento e prestação de contas em saúde)", url: LC141, classificacao: "oficial" },
  },
  "emenda-custeio": {
    id: "emenda-custeio", titulo: "Equipamento sem custeio vira peça de museu", tema: "Investimento e custeio", dificuldade: 2,
    texto: "Uma emenda pode pagar a compra de um equipamento, mas quem o põe para funcionar é o orçamento do município: equipe, laudos, manutenção, energia e insumos, todos os anos. Antes de aceitar, some o custo de toda a vida útil e confirme se há quem opere. Um bom equipamento sem custeio fica parado.",
    aplicacao: "Na vida real: antes de aceitar uma doação grande (um carro, uma máquina), pergunte quanto custa mantê-la por cinco anos e quem vai usar.",
    fonte: { rotulo: "Conceito didático: custo total de propriedade", url: null, classificacao: "estimativa" },
  },
  "compra-compartilhada": {
    id: "compra-compartilhada", titulo: "Comprar junto é comprar melhor — sem fatiar a compra", tema: "Compras públicas", dificuldade: 2,
    texto: "A lei de licitações prevê caminhos como o registro de preços e a adesão a atas já licitadas, que podem reduzir preço e prazo quando são adequados ao que o município precisa. Dividir uma mesma compra em partes pequenas só para ficar abaixo do limite de dispensa é fracionamento: burla a regra, mesmo que cada parte pareça pequena.",
    aplicacao: "Na vida real: ao comprar para a escola ou a associação, compare com outras compras do grupo e junte pedidos iguais para negociar melhor — nunca divida para escapar de uma regra.",
    fonte: { rotulo: "Lei 14.133/2021 (nova lei de licitações e contratos)", url: L14133, classificacao: "oficial" },
  },
  "fila-regulada": {
    id: "fila-regulada", titulo: "Fila boa tem critério e é pública", tema: "Acesso e regulação", dificuldade: 2,
    texto: "Quem espera mais nem sempre precisa mais. A regulação ordena a fila por risco e tempo de espera, com protocolos claros e retorno para a UBS quando o caso não exige o especialista. Mostrar a fila (sem expor nomes) reduz o “jeitinho” e permite cobrar resultado.",
    aplicacao: "Na vida real: em qualquer fila (matrícula, consulta, benefício), pergunte qual é o critério de ordem e se ele é divulgado.",
    fonte: { rotulo: "Conceito didático: regulação do acesso no SUS", url: null, classificacao: "estimativa" },
  },
  "folha-sustentavel": {
    id: "folha-sustentavel", titulo: "A folha tem teto — e o teto vale para o disfarce também", tema: "Pessoal e responsabilidade fiscal", dificuldade: 3,
    texto: "A Lei de Responsabilidade Fiscal limita a despesa com pessoal à receita corrente líquida e cria faixas de alerta e de limite prudencial. A despesa com terceirização de mão de obra que substitui servidores também conta como pessoal. Na faixa prudencial há vedações, mas a lei ressalva a reposição de aposentadorias e falecimentos nas áreas de saúde, educação e segurança.",
    aplicacao: "Na vida real: ao ouvir “não é contratação, é prestação de serviço”, pergunte se o trabalho é o mesmo e se a conta entra no mesmo limite.",
    fonte: { rotulo: "Lei de Responsabilidade Fiscal (LC 101/2000), arts. 18, 19 e 22", url: LRF, classificacao: "oficial" },
  },
  "credito-adicional": {
    id: "credito-adicional", titulo: "Mexer no orçamento exige autorização", tema: "Orçamento e execução", dificuldade: 2,
    texto: "A lei orçamentária fixa quanto cada área pode gastar. Quando falta dotação, o caminho legal é o crédito adicional (suplementar, especial ou extraordinário), com autorização e indicação da fonte de recursos. Gastar sem dotação ou remanejar sem autorização é irregular, mesmo com boa intenção.",
    aplicacao: "Na vida real: se o orçamento da associação não prevê um gasto, leve o pedido à assembleia e indique de onde sairá o dinheiro, em vez de “dar um jeito”.",
    fonte: { rotulo: "Lei 4.320/1964 (normas gerais de direito financeiro), créditos adicionais", url: L4320, classificacao: "oficial" },
  },
  "emergencia-transparencia": {
    id: "emergencia-transparencia", titulo: "Emergência não dispensa o recibo", tema: "Crises e contratação", dificuldade: 2,
    texto: "Em surtos e calamidades, a lei permite contratação emergencial com dispensa de licitação, desde que haja justificativa, pesquisa de preço e publicidade. A urgência acelera o processo; não apaga o registro nem autoriza preço fora da realidade. Quem registra a emergência protege a decisão — e as pessoas.",
    aplicacao: "Na vida real: numa compra apressada, tire foto da nota, peça dois preços por mensagem e guarde: registrar leva minutos e evita meses de dúvida.",
    fonte: { rotulo: "Lei 14.133/2021, contratação direta por emergência", url: L14133, classificacao: "oficial" },
  },
  "audiencia-publica": {
    id: "audiencia-publica", titulo: "Prestar contas é uma audiência, não um anúncio", tema: "Prestação de contas", dificuldade: 2,
    texto: "O gestor de saúde apresenta, a cada quadrimestre, um relatório detalhado em audiência pública na Casa Legislativa, com receitas, despesas, indicadores e metas. A honestidade inclui as metas não cumpridas e o plano de correção — é isso que permite ao Conselho e à população cobrar.",
    aplicacao: "Na vida real: acompanhe a audiência de prestação de contas da saúde do seu município e pergunte pelas metas que não foram cumpridas.",
    fonte: { rotulo: "Lei Complementar 141/2012, art. 36 (prestação de contas quadrimestral)", url: LC141, classificacao: "oficial" },
  },
  transparencia: {
    id: "transparencia", titulo: "Prestar contas inclui as más notícias", tema: "Prestação de contas", dificuldade: 2,
    texto: "Uma prestação de contas honesta mostra resultados, falhas e o plano de correção. Mostrar só o que agrada reduz a confiança quando a verdade aparece. Os dados de municípios estão no Siconfi e no SIOPS.",
    aplicacao: "Na vida real: acompanhe o orçamento e a execução da sua cidade nos portais de transparência.",
    fonte: { rotulo: "Siconfi / Tesouro Nacional (catálogo de APIs)", url: SICONFI, classificacao: "oficial" },
  },
};

export const CONCEPTS = Object.assign({}, CONCEPTS_N12, ...NIVEIS_LISTA.map((n) => n.conceitos)) as Record<ConceptId, Concept>;

export const CONCEPT_LIST = Object.values(CONCEPTS);

export const QUIZ: QuizQuestion[] = [
  {
    id: "q1",
    pergunta: "Você assumiu a UPA e seu primo apareceu com uma proposta de consultoria. Como responde?",
    opcoes: [
      { id: "analisar", rotulo: "“Vamos ver se a UPA precisa disso e comparar com outras opções.”", efeitos: { competencia: 8, confianca: 3 }, eco: "Calma e método: um bom começo. O primo vai reclamar no almoço de domingo." },
      { id: "transparente", rotulo: "“Manda por escrito. Se for o caso, abrimos para todos os fornecedores.”", efeitos: { confianca: 6, persuasao: 3 }, eco: "Transparência logo no primeiro dia. A Controladoria já gostou de você." },
      { id: "favor", rotulo: "“Família é família. Pode começar semana que vem!”", efeitos: { rede: 8, caraDePau: 6 }, eco: "O primo abriu um sorriso e fez uma planilha. Ainda não tem nada de errado — mas tem muita pressa." },
      { id: "adiar", rotulo: "“Ótima ideia! Depois a gente vê isso.”", efeitos: { popularidade: 4, caraDePau: 4 }, eco: "Adiar é um estilo. A pergunta só muda de dia." },
    ],
  },
  {
    id: "q2",
    pergunta: "7h da manhã: a fila dobra a esquina e a equipe chegou cansada. Qual é a sua primeira ação?",
    opcoes: [
      { id: "conversar", rotulo: "Ouvir a equipe e perguntar o que está travando.", efeitos: { rede: 4, confianca: 5, persuasao: 2 }, eco: "Joana ergueu uma sobrancelha: ninguém perguntava isso há anos." },
      { id: "dados", rotulo: "Pedir o relatório de espera por horário.", efeitos: { competencia: 7, conhecimento: 2 }, eco: "Números primeiro. O Professor Bento aprova de longe." },
      { id: "foto", rotulo: "Tirar uma foto da fila para as redes: 'estamos trabalhando!'.", efeitos: { popularidade: 8, caraDePau: 3 }, eco: "Muitos curtiram. A fila continua do mesmo tamanho." },
      { id: "improviso", rotulo: "Improvisar: mandar todo mundo para a triagem.", efeitos: { caraDePau: 6, persuasao: 3 }, eco: "Improvisar é a sua marca. Às vezes funciona; vamos ver se é o caso." },
    ],
  },
  {
    id: "q3",
    pergunta: "O Guardião do Cofre diz que o dinheiro acabou. Você...",
    opcoes: [
      { id: "provar", rotulo: "Mostra uma conta simples de quanto falta e por quê.", efeitos: { persuasao: 8, competencia: 3 }, eco: "O Guardião resmungou 'interessante'. Isso é quase um elogio." },
      { id: "labia", rotulo: "Conta uma história comovente e uma piada.", efeitos: { persuasao: 6, caraDePau: 6 }, eco: "Rendeu um café e nenhum real. Mas rendeu um café." },
      { id: "aliados", rotulo: "Liga para um conhecido que 'resolve' tudo.", efeitos: { rede: 8, caraDePau: 2 }, eco: "Conhecidos resolvem muita coisa. E depois cobram. Veremos." },
      { id: "aceitar", rotulo: "Aceita e vai ver o que dá para fazer com o que tem.", efeitos: { competencia: 4, confianca: 4 }, eco: "Realismo. Seu orçamento agradece; sua paciência, nem tanto." },
    ],
  },
];

const ACHIEVEMENTS_N12: AchievementDef[] = [
  { id: "primeiro-desperdicio", nome: "Primeiro Desperdício Evitado", descricao: "Reorganizou o estoque e deixou de jogar remédio fora.", trilha: "gestao", icone: "📦" },
  { id: "entrega-conferida", nome: "A Entrega Conferida", descricao: "Conferiu a entrega antes de liquidar o pagamento.", trilha: "gestao", icone: "✅" },
  { id: "estoque-sem-surpresa", nome: "Estoque Sem Surpresa", descricao: "Chegou ao inverno com cobertura de estoque confortável.", trilha: "gestao", icone: "🧰" },
  { id: "servico-recuperado", nome: "Serviço Recuperado", descricao: "Levou o acesso da UPA a um patamar saudável.", trilha: "gestao", icone: "🏥" },
  { id: "economia-sem-fechar-portas", nome: "Economia Sem Fechar Portas", descricao: "Economizou sem reduzir atendimento.", trilha: "gestao", icone: "🚪" },
  { id: "prestacao-clara", nome: "Prestação de Contas Clara", descricao: "Publicou resultados e falhas, sem maquiagem.", trilha: "gestao", icone: "📒" },
  { id: "conhecimento-aplicado", nome: "Conhecimento Aplicado", descricao: "Usou o que aprendeu em três situações diferentes.", trilha: "gestao", icone: "🎓" },
  { id: "aliado-sem-favor", nome: "Aliado Sem Favor", descricao: "Recusou um favor indevido e manteve a parceria.", trilha: "gestao", icone: "🤝" },
  { id: "confianca-conquistada", nome: "Confiança Conquistada", descricao: "Chegou a 75 pontos de confiança pública.", trilha: "gestao", icone: "💙" },
  { id: "sobrevivente-auditoria", nome: "Sobrevivente da Auditoria", descricao: "Atravessou a auditoria com registros consistentes.", trilha: "gestao", icone: "🔍" },
  { id: "correcao-publica", nome: "Corrigiu o Rumo", descricao: "Admitiu e corrigiu um erro administrativo ou devolveu um valor.", trilha: "gestao", icone: "🧭" },
  { id: "legado-continua", nome: "Legado que Continua", descricao: "Encerrou a campanha com a UPA funcionando melhor.", trilha: "gestao", icone: "🌱" },
  { id: "promovido-2", nome: "Secretário(a) Municipal", descricao: "Foi promovido(a) de Administrador(a) de UPA a Secretário(a) Municipal de Saúde.", trilha: "gestao", icone: "🏛️" },
  { id: "cobertura-por-necessidade", nome: "Cobertura Onde Falta", descricao: "Abriu a unidade onde a população estava sem cobertura.", trilha: "gestao", icone: "🗺️" },
  { id: "emenda-com-plano", nome: "Emenda com Plano de Custeio", descricao: "Aceitou o equipamento só com equipe, sala e manutenção garantidas.", trilha: "gestao", icone: "🩻" },
  { id: "compra-sem-fracionar", nome: "Compra Sem Fatiar", descricao: "Comprou em conjunto ou licitou, sem fracionar para escapar da regra.", trilha: "gestao", icone: "🧾" },
  { id: "fila-transparente", nome: "Fila Transparente", descricao: "Organizou a fila por risco e publicou o critério.", trilha: "gestao", icone: "🧭" },
  { id: "folha-no-limite", nome: "Folha Dentro do Limite", descricao: "Reforçou a equipe sem estourar o limite de pessoal nem disfarçar a conta.", trilha: "gestao", icone: "👥" },
  { id: "credito-legal", nome: "Crédito pelo Caminho Legal", descricao: "Pediu o crédito adicional à Câmara em vez de remanejar por conta própria.", trilha: "gestao", icone: "📜" },
  { id: "emergencia-com-recibo", nome: "Emergência com Recibo", descricao: "Enfrentou o surto com contratação emergencial documentada e publicada.", trilha: "gestao", icone: "🦟" },
  { id: "contas-na-audiencia", nome: "Contas na Audiência", descricao: "Prestou contas com resultados, metas não cumpridas e plano de correção.", trilha: "gestao", icone: "📣" },
  { id: "caneta-do-vereador", nome: "A Caneta do Vereador", descricao: "Atendeu um pedido político sem olhar os dados.", trilha: "satira", icone: "🖊️" },
  { id: "pedalada-municipal", nome: "Pedalada Municipal", descricao: "Remanejou dinheiro sem autorização (e a Câmara percebeu).", trilha: "satira", icone: "🚲" },
  { id: "primeiro-milhao", nome: "Quase um Milhão Imaginário", descricao: "Acumulou patrimônio fictício elevado (e muitas pendências).", trilha: "satira", icone: "💸" },
  { id: "o-primo-descobriu", nome: "O Primo Descobriu", descricao: "Aceitou ajuda do Primo Juninho sem pensar duas vezes.", trilha: "satira", icone: "🍹" },
  { id: "mestre-labia", nome: "Mestre da Lábia", descricao: "Convenceu o Guardião do Cofre com um argumento afiado.", trilha: "satira", icone: "🎤" },
  { id: "quase-10", nome: "Quase 10%", descricao: "Desviou perto do teto fictício de 10% num único evento.", trilha: "satira", icone: "🔟" },
];

export const ACHIEVEMENTS: AchievementDef[] = [...ACHIEVEMENTS_N12, ...NIVEIS_LISTA.flatMap((n) => n.conquistas)];
