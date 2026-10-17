import type { CharId, Emotion, LocationId } from "../engine/types";
import type { ConvChoice, ConvNode, ConversationDef, NegotiationDef } from "./types";

type Line = [Emotion, string];
type Pick = [label: string, reply: Line, fx?: ConvChoice["fx"]];

/** Conversa curta: falas de abertura, uma pergunta com opções e uma resposta para cada uma. */
function talk(id: string, caso: number, location: LocationId, who: CharId, titulo: string, intro: Line[], picks: Pick[], extra: Partial<ConversationDef> = {}): ConversationDef {
  const nodes: Record<string, ConvNode> = {};
  intro.forEach(([emo, text], i) => {
    const last = i === intro.length - 1;
    nodes[`i${i}`] = { who, emo, text, next: last ? undefined : `i${i + 1}`, choices: last && picks.length ? picks.map((p, k) => ({ id: `p${k}`, label: p[0], next: `r${k}`, fx: p[2] })) : undefined };
  });
  picks.forEach((p, k) => { nodes[`r${k}`] = { who, emo: p[1][0], text: p[1][1] }; });
  return { id, caso, location, who, titulo, apresentacao: "2d", start: "i0", nodes, ...extra };
}

export const CONVERSATIONS_N2: ConversationDef[] = [
  /* ───── Caso 11 ───── */
  talk("marlene-abertura", 11, "secretaria", "marlene", "Seu primeiro dia no gabinete", [
    ["feliz", "Bom dia, Secretário(a)! Marlene, Relações Institucionais. A Prefeita confia em você — e metade da Câmara quer um bom dia seu."],
    ["serio", "O município tem uma UPA que resolve o que não devia, UBS desiguais e um mapa de cobertura que ninguém lê. Seu primeiro desafio: onde abrir a próxima UBS."],
    ["irônico", "Todo mundo vai querer um bairro. Os dados querem outro. Você escuta quem?"],
  ], [
    ["Os dados primeiro. Depois escuto todo mundo.", ["feliz", "Boa resposta. Rita e Edu têm os mapas. O Vereador Nelson já ligou duas vezes — a segunda foi mais insistente."], { attrs: { competencia: 1 }, rel: { marlene: 4 } }],
    ["Me conte o que os políticos querem.", ["irônico", "Querem fotografia, fita e placa. Não é pecado — só que não é critério."], { rel: { marlene: 2 } }],
  ], { apresentacao: "3d", auto: true }),
  talk("rita-cobertura", 11, "planejamento", "rita", "O mapa de cobertura", [
    ["serio", "Sou a Rita, da Regulação. Montei este mapa: cobertura de atenção básica por bairro e origem dos atendimentos leves na UPA."],
    ["preocupado", "Vila Nova e Morro do Sol quase não têm cobertura e lotam a UPA com o que a UBS resolveria. O resto da cidade está bem coberto."],
  ], [
    ["Qual a diferença de uma UBS nova ali?", ["serio", "Menos gente na UPA, vínculo com a equipe, pré-natal e hipertensão acompanhados. A UPA vira UPA de novo."], { rel: { rita: 4 } }],
    ["E o pedido do vereador?", ["irônico", "O bairro dele tem 86% de cobertura. Não é errado querer; é só que não é onde falta."], { rel: { rita: 2 } }],
  ]),
  talk("edu-territorio", 11, "ubs", "edu", "O território visto da UBS", [
    ["serio", "Edu Matos, gerente da UBS Esperança. Moro aqui há 20 anos. Metade dos meus pacientes mora a 40 minutos do posto."],
    ["triste", "A gente cadastra, mas não dá conta. Gente de Vila Nova pega ônibus duas vezes para fazer um curativo."],
  ], [
    ["O que mudaria com uma UBS lá?", ["feliz", "Pressão controlada, vacina em dia, menos gente na UPA. Eu preferiria até uma estrutura menor, mas perto."], { rel: { edu: 4 } }],
    ["Vocês têm dados disso?", ["serio", "Tenho o painel de cadastro e as faltas. Está na mesa da frente — olha lá."], { rel: { edu: 2 } }],
  ]),
  talk("nelson-pedido", 11, "camara", "nelson", "O pedido do Vereador", [
    ["feliz", "Secretário(a)! Nelson Tavares, vereador do Jardim das Flores. Preciso de uma UBS no meu bairro. A comunidade merece."],
    ["irônico", "Eu votei o orçamento da Saúde. Gostaria que se lembrassem disso na hora de escolher."],
  ], [
    ["Vou olhar os dados de todos os bairros.", ["serio", "Dados são importantes. Só não se esqueça de quem vota o seu orçamento."], { rel: { nelson: -2 }, attrs: { competencia: 1 } }],
    ["Vou considerar seu pedido com carinho.", ["feliz", "Era isso que eu queria ouvir. Estamos alinhados."], { rel: { nelson: 6 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 12 ───── */
  talk("cornelio-emenda", 12, "camara", "cornelio", "A emenda do tomógrafo", [
    ["feliz", "Secretário(a)! Consegui um tomógrafo para a cidade. Zero custo para vocês. Vai haver uma cerimônia, claro."],
    ["irônico", "Por favor, não me venha com “planilha”. É um presente."],
  ], [
    ["Agradeço. Preciso do plano de operação antes.", ["serio", "Plano... Tudo bem, mas não demore. A emenda tem prazo e o município ao lado também quer."], { attrs: { competencia: 1 }, rel: { cornelio: -2 } }],
    ["Perfeito. Marque a cerimônia.", ["feliz", "Sabia que podia contar com você. Vai ser um sucesso."], { rel: { cornelio: 6 }, attrs: { popularidade: 1 } }],
  ]),
  talk("rita-custeio", 12, "planejamento", "rita", "O custo de manter", [
    ["serio", "Fiz a conta: o aparelho é de graça, o funcionamento não. Sala blindada, técnico, manutenção e contrato de peças."],
    ["preocupado", "Sem isso, o tomógrafo fica na caixa. Com isso, deixamos de comprar parte dos exames. A decisão é entre as duas contas."],
  ], [
    ["Dá para economizar com exames próprios?", ["feliz", "Dá, se operar bem. Hoje pagamos por exame; com o aparelho, pagamos por funcionamento."], { rel: { rita: 4 } }],
    ["Isso assusta o parlamentar?", ["irônico", "Se assusta, é porque a emenda era só a foto."], { rel: { rita: 2 } }],
  ]),

  /* ───── Caso 13 ───── */
  talk("valdemar-fracionar", 13, "secretaria", "valdemar", "Cinco notas, um problema só", [
    ["feliz", "Secretário(a)! Valdemar, do jurídico-administrativo. Já deixei cinco dispensas prontas — é só assinar. Rápido e sem licitação."],
    ["irônico", "Cada uma abaixo do limite, tudo certinho. Ninguém nota."],
  ], [
    ["Cinco para a mesma necessidade? Isso é fracionar.", ["serio", "Fracionar é palavra feia. Eu chamo de “parcelar”."], { attrs: { competencia: 1 }, rel: { valdemar: -4 } }],
    ["Se está tudo certinho, vamos adiante.", ["feliz", "Esse é o espírito! Eu cuido do resto."], { rel: { valdemar: 6 }, attrs: { caraDePau: 2 } }],
  ]),
  talk("roberto-ata", 13, "secretaria", "roberto", "A ata que ninguém lembrou", [
    ["serio", "Secretário(a), Roberto dos Contratos. Há uma ata de registro de preços vigente que cobre quase tudo que a rede precisa."],
    ["feliz", "Preço menor que o das dispensas e sem nova licitação. Só precisa conferir as quantidades."],
  ], [
    ["Cobre o consumo anual?", ["serio", "Cobre. Está no e-mail da Central de Compras. Eu conferi duas vezes."], { rel: { roberto: 4 } }],
    ["Por que ninguém sugeriu isso?", ["irônico", "Porque dispensa é mais rápida de assinar — e mais difícil de explicar depois."], { rel: { roberto: 2 } }],
  ]),
  talk("edu-insumos", 13, "ubs", "edu", "O que a rede consome", [
    ["serio", "Edu aqui. Os pedidos de insumos das UBS somam algo bem previsível durante o ano. Dá para planejar tudo de uma vez."],
    ["preocupado", "Compra picada gera falta de um mês e sobra de outro. A gente já sofreu isso."],
  ], [
    ["Quanto a rede usa por ano?", ["feliz", "Está na planilha de consumo. Uso e validade batem — se comprar de uma vez, não vence."], { rel: { edu: 4 } }],
    ["Alguém pediu para picotar?", ["irônico", "Não a gente. A gente só pede o que precisa."], { rel: { edu: 2 } }],
  ]),

  /* ───── Caso 14 ───── */
  talk("rita-regulacao", 14, "planejamento", "rita", "A fila de cardiologia", [
    ["serio", "São 1.800 na fila. Se aplicarmos o protocolo, cerca de 700 resolvem na UBS com apoio de um especialista à distância."],
    ["preocupado", "E 120 casos de alto risco esperam mais de 300 dias. Esses são os que me tiram o sono."],
  ], [
    ["Dá para publicar o critério?", ["feliz", "Dá. E publicar ajuda: o cidadão passa a acompanhar a própria posição."], { rel: { rita: 4 }, attrs: { confianca: 1 } }],
    ["Não vai gerar reclamação?", ["irônico", "Vai. Mas reclamação com critério é melhor que reclamação sem critério."], { rel: { rita: 2 } }],
  ]),
  talk("nelson-fila", 14, "camara", "nelson", "A lista do vereador", [
    ["feliz", "Secretário(a), tenho uma lista de eleitores com problemas no coração. Dá para encaixar? São pessoas de bem."],
    ["irônico", "Não estou pedindo privilégio. Só que olhem primeiro quem eu estou indicando."],
  ], [
    ["Vou passar para a Regulação avaliar pelo risco.", ["serio", "Pelo risco? Tudo bem... mas lembre quem apresentou."], { attrs: { competencia: 1 }, rel: { nelson: -4 } }],
    ["Eu encaixo. Pode deixar.", ["feliz", "Eu sabia! O senhor é diferente dos outros."], { rel: { nelson: 8 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 15 ───── */
  talk("lucia-pessoal", 15, "prefeitura", "lucia", "O limite da folha", [
    ["serio", "Secretário(a), a Saúde é quem mais gasta com pessoal. Estamos perto do limite prudencial da Lei de Responsabilidade Fiscal."],
    ["preocupado", "Se estourar, não posso nomear ninguém, nem repor. Preciso de uma solução que não esconda a conta."],
  ], [
    ["Vou repor o que a lei permite e reorganizar escalas.", ["feliz", "Era o que eu esperava ouvir. Traga a planilha."], { rel: { lucia: 6 }, attrs: { confianca: 1 } }],
    ["E se contratarmos por cooperativa?", ["irônico", "Cooperativa com horário fixo e chefia nossa é vínculo. Não passa pelo olhar do Tribunal."], { rel: { lucia: -2 } }],
  ]),
  talk("valdemar-cooperativa", 15, "secretaria", "valdemar", "A cooperativa de plantonistas", [
    ["feliz", "Doutor(a), resolvi sua falta de gente. A Coopersaúde manda 40 pessoas em duas semanas. Sem concurso, sem folha."],
    ["irônico", "A despesa vai para outra rubrica. Ninguém precisa saber."],
  ], [
    ["Isso não tira a despesa do limite.", ["serio", "Do limite, não. Do olhar de quem não for ler com atenção."], { attrs: { competencia: 1 }, rel: { valdemar: -4 } }],
    ["Se resolve rápido, fechamos.", ["feliz", "Sabia que você era prático."], { rel: { valdemar: 6 }, attrs: { caraDePau: 2 } }],
  ]),

  /* ───── Caso 16 ───── */
  talk("guardiao-saldos", 16, "prefeitura", "guardiao", "Os saldos parados", [
    ["serio", "Sou o Guardião da Tesouraria. Há saldos em obras paradas que a Saúde poderia usar. Mas dotação não se mexe por gosto."],
    ["serio", "Quero saber a fonte, o valor e a base legal. Sem isso, não toco."],
  ], [
    ["Preciso de crédito adicional por lei.", ["feliz", "Então estamos de acordo. Traga o projeto e eu confirmo a fonte."], { rel: { guardiao: 4 } }],
    ["Dá para remanejar por decreto?", ["irritado", "Até o limite autorizado. O resto, só com lei."], { rel: { guardiao: -2 } }],
  ]),
  talk("lucia-credito", 16, "prefeitura", "lucia", "Convencer a Prefeita", [
    ["serio", "Se a Câmara aprovar um crédito, eu sanciono. Mas preciso de argumentos que o Legislativo entenda."],
    ["serio", "Convença-me: por que isso não é pedalada?"],
  ], [
    ["Vou apresentar fonte, valor e necessidade.", ["feliz", "Vamos ao argumento, então."], { rel: { lucia: 4 } }],
  ], { negociacao: "neg-credito", apresentacao: "3d" }),

  /* ───── Caso 17 ───── */
  talk("rita-surto", 17, "planejamento", "rita", "O boletim da dengue", [
    ["preocupado", "Os casos triplicaram em duas semanas. Os leitos de observação já estão no limite."],
    ["serio", "Temos uma reserva para contingências. Dá para agir hoje — mas qualquer contrato precisa de justificativa e preço pesquisado."],
  ], [
    ["Qual é a prioridade?", ["serio", "Insumos de diagnóstico, controle de vetores e reforço de plantão. Nessa ordem."], { rel: { rita: 4 } }],
    ["Dá para pular a cotação?", ["irônico", "Dá para fazer rápida, não para pular. Pular custa mais depois."], { rel: { rita: 2 } }],
  ]),
  talk("edu-dengue", 17, "ubs", "edu", "O que a UBS vê", [
    ["preocupado", "Estamos recebendo gente com febre desde a madrugada. Falta soro e teste rápido."],
    ["serio", "Se vier ajuda, que venha com nota e com data. A comunidade anda desconfiada."],
  ], [
    ["Vou contratar com transparência.", ["feliz", "Era isso. Se publicar, eu mostro no mural da UBS."], { rel: { edu: 6 }, attrs: { confianca: 1 } }],
    ["Preciso de rapidez, o resto a gente acerta.", ["serio", "Rapidez eu entendo. Só cuidado com o “resto”."], { rel: { edu: -2 } }],
  ]),
  talk("lucia-surto", 17, "prefeitura", "lucia", "A decisão do decreto", [
    ["serio", "Posso decretar emergência. Mas, se eu assinar sem pesquisa de preço, o Tribunal assina o que sobrar."],
    ["preocupado", "Preciso de agilidade e de recibo. O que o senhor propõe?"],
  ], [
    ["Cotação rápida e publicação em 24h.", ["feliz", "Combinado. Eu assino o decreto hoje."], { rel: { lucia: 6 } }],
    ["Contrato direto, sem divulgação.", ["irritado", "Sem divulgação eu não assino."], { rel: { lucia: -6 } }],
  ]),

  /* ───── Caso 18 ───── */
  talk("celia-audiencia", 18, "camara", "celia", "A plateia", [
    ["serio", "Secretário(a), a população vai estar aqui. Eu vou estar na primeira fila, com o caderno."],
    ["triste", "Já ouvi muitos relatórios bonitos. Gostaria de ouvir um verdadeiro."],
  ], [
    ["Vou contar o que deu certo e o que não deu.", ["feliz", "Então vamos nos entender."], { rel: { celia: 6 }, attrs: { confianca: 1 } }],
    ["Vou destacar as conquistas.", ["irônico", "As conquistas a gente vê. É das falhas que a gente quer saber."], { rel: { celia: -2 } }],
  ]),
  talk("bento-audiencia", 18, "camara", "bento", "Uma pergunta do Professor Bento", [
    ["serio", "Eu acompanhei sua gestão pelos dados. Uma pergunta: qual decisão, olhando para trás, você faria diferente?"],
  ], [
    ["Uma em que não medi antes de decidir.", ["feliz", "Essa é a resposta de quem aprende. Isso é gestão."], { attrs: { confianca: 2 }, rel: { bento: 4 } }],
    ["Nenhuma. Foram todas boas.", ["irônico", "Nenhuma? Então ou você é perfeito, ou ainda não olhou direito."], { rel: { bento: -2 } }],
  ]),
];

export const NEGOTIATIONS_N2: NegotiationDef[] = [
  {
    id: "neg-credito",
    pedido: "Convença a Prefeita de que o crédito adicional é o caminho correto. Use o que descobriu no dossiê: necessidade, saldos e limite do decreto.",
    criterios: [
      { id: "fonte", rotulo: "Indicou a fonte dos recursos", dica: "Diga de onde vem o dinheiro: saldos de obras paradas, superávit ou excesso de arrecadação.", palavras: [["saldo", "obra", "fonte", "superávit", "excesso", "arrecada"]] },
      { id: "lei", rotulo: "Citou a necessidade de lei ou autorização", dica: "Explique que a movimentação exige autorização legislativa.", palavras: [["lei", "câmara", "autoriza", "projeto", "legislativ", "loa"]] },
      { id: "necessidade", rotulo: "Explicou a necessidade", dica: "Diga o que o recurso vai pagar e por que o orçamento atual não basta.", palavras: [["necessidade", "custeio", "falta", "insuficiente", "serviço", "atendimento", "pessoal", "medicamento", "exame"]] },
      { id: "controle", rotulo: "Falou de controle ou prazo", dica: "Mencione como o uso será acompanhado e quando.", palavras: [["prazo", "controle", "acompanh", "relatório", "transparên", "publica", "trimestre", "mês", "meses"]] },
    ],
    respostas: {
      fraca: "Não me convenceu. Falta fonte, falta lei, falta número. Posso apoiar uma versão pequena.",
      media: "Está no caminho. Falta amarrar um ponto ou outro. Apoio o essencial e o resto vem depois.",
      forte: "Fonte, lei, necessidade e controle. Isso eu consigo defender na Câmara sem corar. Apoiado.",
    },
  },
];
