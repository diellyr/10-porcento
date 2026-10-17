import type { CharId, Emotion } from "../engine/types";
import type { ConvChoice, ConvNode, ConversationDef, NegotiationDef, Txt } from "./types";

const n = (who: CharId, emo: Emotion, text: Txt, next?: string, extra: Partial<ConvNode> = {}): ConvNode => ({ who, emo, text, next, ...extra });
const ch = (id: string, label: string, next: string, fx?: ConvChoice["fx"], revela?: string[]): ConvChoice => ({ id, label, next, fx, revela });

import { CONVERSATIONS_N2, NEGOTIATIONS_N2 } from "./conversations-n2";

export const CONVERSATIONS_N1: ConversationDef[] = [
  /* ───── Caso 1 ───── */
  {
    id: "abertura", caso: 1, location: "recepcao", who: "celia", titulo: "A fila e a bombinha", apresentacao: "3d", auto: true, start: "a1",
    nodes: {
      a1: n("celia", "serio", "Bom dia, administrador(a). Eu sou a Célia, do conselho de saúde do bairro. Estou aqui desde as cinco da manhã.", "a2"),
      a2: n("celia", "triste", "Esta é a Rosângela e o Davi, de seis anos. A bombinha de asma dele acabou ontem. A farmácia disse que “não tem previsão”.", "a3"),
      a3: n("celia", "serio", "Não vim brigar. Vim ver se alguém aqui sabe QUANTO tem e QUANTO falta. Você sabe?", undefined, {
        choices: [
          ch("sincero", "Ainda não. Mas vou descobrir hoje.", "a4a", { rel: { celia: 6 }, attrs: { confianca: 2 } }),
          ch("promessa", "Vamos resolver, dona Célia. Pode confiar.", "a4b", { attrs: { popularidade: 2, caraDePau: 2 } }),
          ch("empurra", "Isso é com a farmácia. Acabei de chegar.", "a4c", { rel: { celia: -6 }, attrs: { confianca: -2 } }),
        ],
      }),
      a4a: n("celia", "feliz", "Pelo menos você não fingiu. Procure a Joana, na enfermagem, e o pessoal da farmácia. E olhe o que vence — aqui sempre vence alguma coisa."),
      a4b: n("celia", "irônico", "Já ouvi “pode confiar” de oito administradores. Todos foram embora; o estoque ficou. Vá ver com os próprios olhos."),
      a4c: n("celia", "irritado", "Acabou de chegar... e a fila chegou antes de você, meu filho. Vá ver com os próprios olhos."),
    },
  },
  {
    id: "joana-estoque", caso: 1, location: "enfermagem", who: "joana", titulo: "O que a enfermagem enxerga", apresentacao: "2d", start: "j1",
    nodes: {
      j1: n("joana", "preocupado", "Vou ser direta: semana passada pegamos salbutamol emprestado da UPA vizinha por mensagem de celular. De novo.", "j2"),
      j2: n("joana", "serio", "A gente trabalha no improviso. Falta uma coisa, sobra outra, e ninguém sabe o que tem antes de acabar.", undefined, {
        choices: [
          ch("critico", "Qual é o item mais crítico agora?", "j3a", { rel: { joana: 4 } }),
          ch("quem", "Quem decide as compras?", "j3b", { rel: { joana: 2 } }),
        ],
      }),
      j3a: n("joana", "serio", "Salbutamol e ondansetrona. O resto você vê na farmácia — a planilha é mais confiável que meu humor hoje.", "j4"),
      j3b: n("joana", "irônico", "No papel, você. Na prática, o Toninho do gabinete “dá um jeito”. Pergunte a ele — e pergunte com cuidado.", "j4"),
      j4: n("joana", "serio", "Se for reorganizar, me avise antes. Minha equipe aguenta mudança, só não aguenta surpresa."),
    },
  },
  {
    id: "toninho-estoque", caso: 1, location: "administracao", who: "toninho", titulo: "O atalho do Toninho", apresentacao: "2d", start: "t1",
    nodes: {
      t1: n("toninho", "feliz", "Chefe! Já ouvi falar de você. Bem-vindo! Aqui tudo se resolve com um telefonema.", "t2"),
      t2: n("toninho", "feliz", "Estoque? Sempre foi assim, relaxa. Falta um, sobra outro, é a vida. Eu conheço uma empresa que entrega em 48 horas: a Aurora. Sem burocracia!", undefined, {
        choices: [
          ch("cotacao", "Sem burocracia como? Tem cotação?", "t3a", { rel: { toninho: -3 }, attrs: { competencia: 1 } }),
          ch("contato", "Me passe o contato. Preciso resolver rápido.", "t3b", { rel: { toninho: 6 }, attrs: { caraDePau: 2 } }),
          ch("numeros", "Obrigado. Vou olhar os números antes.", "t3c", { attrs: { competencia: 1 } }),
        ],
      }),
      t3a: n("toninho", "irônico", "Cotação... Chefe, a burocracia é o motivo de a vacina chegar tarde! Mas tá, eu mando o orçamento. Mais ou menos.", "t4"),
      t3b: n("toninho", "feliz", "Esse é o espírito! A Aurora cobra uma “taxa de agilidade”, sabe como é. Por fora, discreto. Entre nós.", "t4"),
      t3c: n("toninho", "irônico", "Números! Aqui? Boa sorte, chefe.", "t4"),
      t4: n("toninho", "feliz", "Qualquer coisa, me chama. Sempre me acha por aqui... ou no café."),
    },
  },

  /* ───── Caso 2 ───── */
  {
    id: "celia-fila", caso: 2, location: "recepcao", who: "celia", titulo: "A fila da madrugada", apresentacao: "2d", start: "c1",
    nodes: {
      c1: n("celia", "serio", "Voltei. A fila da madrugada é a pior. Minha vizinha esperou quase quatro horas com o filho com febre.", "c2"),
      c2: n("celia", "irônico", "O povo reclama que falta médico. Eu acho que tem médico; o que falta é alguém arrumando a bagunça.", undefined, {
        choices: [
          ch("quando", "Quando a fila é pior?", "c3a", { rel: { celia: 3 } }),
          ch("contratar", "Vou contratar mais gente.", "c3b", { attrs: { popularidade: 1 } }),
        ],
      }),
      c3a: n("celia", "serio", "De madrugada, das três às cinco. Depois do almoço quase não tem ninguém na sala.", "c4"),
      c3b: n("celia", "irônico", "Mais gente num lugar mal arrumado só dá mais gente na bagunça. Mas tá.", "c4"),
      c4: n("celia", "feliz", "Resolve isso e eu mesma conto na comunidade."),
    },
  },
  {
    id: "juninho-consultoria", caso: 2, location: "administracao", who: "juninho", titulo: "“Hospital 4.0”", apresentacao: "2d", start: "j1",
    nodes: {
      j1: n("juninho", "feliz", "Primão! Montei um deck, tem até gráfico em 3D! “Hospital 4.0”: disrupção, sinergia, fila zero!", "j2"),
      j2: n("juninho", "feliz", "É coisa de profissional, tá? Diagnóstico em 60 dias. Pra família, faço preço de amigo.", undefined, {
        choices: [
          ch("medir", "O que exatamente será medido? Tem entrega parcial?", "j3a", { rel: { juninho: -3 }, attrs: { competencia: 1 } }),
          ch("topo", "Parece ótimo, Juninho!", "j3b", { rel: { juninho: 8 }, attrs: { caraDePau: 2 } }),
          ch("comparar", "Deixe o material comigo. Vou comparar com outras opções.", "j3c", { attrs: { competencia: 1 } }),
        ],
      }),
      j3a: n("juninho", "surpreso", "Medido? Tudo! Quer dizer... a metodologia é proprietária. Mas o deck é lindo.", "j4"),
      j3b: n("juninho", "feliz", "Eu sabia! Família é tudo! Vou preparar o contrato — só preciso de um CNPJ. Qualquer um.", "j4"),
      j3c: n("juninho", "triste", "Comparar? Primo, “outras opções” não têm deck em 3D.", "j4"),
      j4: n("juninho", "feliz", "Fecha comigo que eu entrego até o carnaval!"),
    },
  },

  /* ───── Caso 3 ───── */
  {
    id: "roberto-contratos", caso: 3, location: "administracao", who: "roberto", titulo: "Conferir antes de assinar", apresentacao: "2d", start: "r1",
    nodes: {
      r1: n("roberto", "neutro", "Bom dia. Roberto, dos Contratos. Trouxe as três propostas e um conselho: vamos conferir antes de assinar.", "r2"),
      r2: n("roberto", "serio", "Preço de aquisição é só o primeiro boleto. Tem manutenção, peça, treinamento, insumo. Eu chamo de “custo de vida” do equipamento.", undefined, {
        choices: [
          ch("calcular", "Como se calcula isso?", "r3a", { rel: { roberto: 5 } }),
          ch("barato", "Pegue a mais barata e pronto.", "r3b", { rel: { roberto: -3 } }),
        ],
      }),
      r3a: n("roberto", "feliz", "Soma tudo em cinco anos: compra, manutenção e insumos. Compare com a ficha de manutenção da enfermagem, que tem o histórico real.", "r4"),
      r3b: n("roberto", "preocupado", "Se for essa a decisão, eu registro que avisei. Eu sempre registro.", "r4"),
      r4: n("roberto", "neutro", "A decisão é sua. A nota fiscal vem depois."),
    },
  },

  /* ───── Caso 4 ───── */
  {
    id: "guardiao-corte", caso: 4, location: "cofre", who: "guardiao", titulo: "O Guardião e o corte linear", apresentacao: "3d", start: "g1", negociacao: "neg-corte",
    nodes: {
      g1: n("guardiao", "irônico", "Ah, o novo administrador. Veio buscar dinheiro, imagino. Todo mundo vem. Ninguém vem devolver.", "g2"),
      g2: n("guardiao", "irônico", "A Secretaria mandou um corte linear de dez por cento. Eu chamo de “régua de alfaiate cego”: corta tudo parelho, inclusive o braço.", "g3"),
      g3: n("guardiao", "serio", "Mas ordens são ordens. A não ser que alguém me convença de uma alternativa. Com números, de preferência.", undefined, {
        choices: [
          ch("atinge", "Quero entender o que o corte atinge.", "g4a", { rel: { guardiao: 2 } }, ["c4-pediatria"]),
          ch("alternativa", "Quero propor uma alternativa.", "g4b", { attrs: { persuasao: 1 } }),
        ],
      }),
      g4a: n("guardiao", "serio", "A pediatria noturna, para começar. E outras coisas que você nem sabe que existem. Dê uma olhada no painel da recepção.", "g5"),
      g4b: n("guardiao", "irônico", "Uma alternativa. Que raro. Pode falar — mas lembre-se de que eu escuto os números, não o tom de voz.", "g5"),
      g5: n("guardiao", "serio", "Quando estiver pronto, convença-me. Uma resposta de texto livre vale mais que três suspiros."),
    },
  },

  /* ───── Caso 5 ───── */
  {
    id: "cornelio-inauguracao", caso: 5, location: "patio", who: "cornelio", titulo: "A faixa de inauguração", apresentacao: "2d", start: "c1",
    nodes: {
      c1: n("cornelio", "feliz", "Meu povo! Que prazer! A sala nova ficou LINDA, não é? Sábado a gente inaugura. Vem imprensa, vem rádio, vem todo mundo!", "c2"),
      c2: n("cornelio", "feliz", "Eu sei que falta um detalhezinho ou outro, mas o povo quer ver obra pronta! Faixa pendurada, discurso preparado.", undefined, {
        choices: [
          ch("cronograma", "Qual é o “detalhezinho”? Preciso ver o cronograma.", "c3a", { rel: { cornelio: -3 }, attrs: { competencia: 1 } }),
          ch("pronto", "Pode deixar, deputado. Sábado fica pronto.", "c3b", { rel: { cornelio: 8 }, attrs: { caraDePau: 3, popularidade: 2 } }),
          ch("parcial", "E se inaugurarmos só a parte pronta?", "c3c", { attrs: { persuasao: 2 } }),
        ],
      }),
      c3a: n("cornelio", "irônico", "Cronograma... Esse povo da gestão e suas planilhas. O cronograma, meu caro, é a vontade do povo.", "c4"),
      c3b: n("cornelio", "feliz", "Assim se fala! Eu sabia que você ia longe.", "c4"),
      c3c: n("cornelio", "neutro", "Parte? Hum. Metade não rende foto boa... mas rende voto honesto. Vou pensar.", "c4"),
      c4: n("cornelio", "feliz", "Me liga na sexta. E leve um sorriso!"),
    },
  },

  /* ───── Caso 6 ───── */
  {
    id: "roberto-entrega", caso: 6, location: "farmacia", who: "roberto", titulo: "A carga chegou", apresentacao: "2d", start: "r1",
    nodes: {
      r1: n("roberto", "neutro", "A carga chegou. O motorista quer assinatura e ir embora; o fornecedor já ligou três vezes pedindo o pagamento.", "r2"),
      r2: n("roberto", "serio", "Minha função é conferir. A sua é decidir o que fazer com o que eu conferi.", undefined, {
        choices: [
          ch("conferir", "Faça a conferência completa.", "r3a", { rel: { roberto: 5 }, attrs: { competencia: 1 } }),
          ch("atestar", "Ateste logo, o fornecedor está esperando.", "r3b", { rel: { roberto: -4 } }),
        ],
      }),
      r3a: n("roberto", "serio", "Já fiz. Está na contagem, na mesa. Tem diferença — e tem lote com validade curta.", "r4"),
      r3b: n("roberto", "preocupado", "Se eu atestar sem conferir, vira problema na Controladoria. Mas a decisão é sua.", "r4"),
      r4: n("roberto", "neutro", "Empenho e liquidação não são a mesma coisa, ok? Liquidar é confirmar a entrega."),
    },
  },

  /* ───── Caso 7 ───── */
  {
    id: "ana-auditoria", caso: 7, location: "administracao", who: "ana", titulo: "A Controladoria bate à porta", apresentacao: "3d", start: "a1",
    nodes: {
      a1: n("ana", "neutro", "Bom dia. Sou a Ana, da Controladoria. É uma conferência de rotina do trimestre: comparo o que está registrado com os documentos.", "a2"),
      a2: n("ana", "serio", "Não estou aqui para acusar ninguém. Auditoria consulta o que já existe. Se estiver tudo registrado e consistente, ela termina rápido.", "a3"),
      a3: n("ana", "neutro", "Posso acompanhá-lo na conferência, começar sozinha, ou aguardar sua equipe organizar algo. A decisão é sua.", undefined, {
        choices: [
          ch("disposicao", "Estou à disposição. Vamos ao arquivo do cofre.", "a4", { attrs: { confianca: 1 } }, ["c7-registros"]),
          ch("ok", "Sem problemas, Ana.", "a4"),
        ],
      }),
      a4: n("ana", "neutro", "Obrigada. Uma observação: o registro não se reescreve. Só se acrescenta."),
    },
  },

  /* ───── Caso 8 ───── */
  {
    id: "toninho-favor", caso: 8, location: "administracao", who: "toninho", titulo: "O favor do deputado", apresentacao: "2d", start: "t1",
    nodes: {
      t1: n("toninho", "feliz", "Chefe! Boas notícias. O deputado indicou uma empresa excelente para a manutenção do prédio: a Zelo & Cia. É só assinar.", "t2"),
      t2: n("toninho", "feliz", "A dona é prima do deputado — mas isso não é problema, é família! Em troca, ele garante apoio na sua promoção.", undefined, {
        choices: [
          ch("cotar", "Mande uma proposta formal. Vou pedir cotação também.", "t3a", { rel: { toninho: -5, cornelio: -3 }, attrs: { competencia: 1 } }),
          ch("fechar", "Beleza. Pode fechar com eles.", "t3b", { rel: { toninho: 6 }, favor: { cornelio: 6 } }),
          ch("recusar", "Não posso aceitar assim, mas agradeço.", "t3c", { rel: { toninho: -2 }, attrs: { confianca: 1 } }),
        ],
      }),
      t3a: n("toninho", "surpreso", "Cotação? Chefe... tá, mando tudo por escrito. Depois não diz que não avisei da pressa.", "t4"),
      t3b: n("toninho", "feliz", "Agora sim! O deputado vai adorar — e vai lembrar disso depois.", "t4"),
      t3c: n("toninho", "irônico", "Agradece o quê, se vai recusar? Enfim. Você é cabeça-dura, mas é transparente.", "t4"),
      t4: n("toninho", "feliz", "O deputado vai ligar. Avisa a caneta."),
    },
  },

  /* ───── Caso 9 ───── */
  {
    id: "joana-crise", caso: 9, location: "enfermagem", who: "joana", titulo: "Inverno na porta", apresentacao: "2d", start: "j1",
    nodes: {
      j1: n("joana", "preocupado", "Estamos no limite. Os atendimentos subiram 65%, a observação está cheia e o salbutamol... depende do que fizemos antes.", "j2"),
      j2: n("joana", "serio", "Preciso de uma decisão hoje: mais plantões e reposição urgente, ou segurar o orçamento e atender só os casos mais graves.", undefined, {
        choices: [
          ch("custo", "Quanto isso custa em acesso e qualidade?", "j3a", { rel: { joana: 3 } }),
          ch("remanejar", "Posso remanejar insumos de outras UPAs?", "j3b", { attrs: { competencia: 1 } }),
        ],
      }),
      j3a: n("joana", "serio", "Se reduzir, as famílias vão ao pronto-socorro a 14 km. Quem tem carro vai; quem não tem, espera.", "j4"),
      j3b: n("joana", "serio", "Pode, se você tiver quem te atenda ao telefone. Rede boa ajuda nessas horas.", "j4"),
      j4: n("joana", "feliz", "Conte comigo e com a equipe. Só não nos peça milagre sem plantão."),
    },
  },
  {
    id: "celia-crise", caso: 9, location: "recepcao", who: "celia", titulo: "A comunidade na fila", apresentacao: "2d", start: "c1",
    nodes: {
      c1: n("celia", "preocupado", "Tem muita criança tosse-tosse lá fora. O Davi está bem, graças ao que se conseguiu. Mas tem mãe sem saber a quem recorrer.", undefined, {
        choices: [ch("precisa", "O que a comunidade precisa agora?", "c2", { rel: { celia: 4 } })],
      }),
      c2: n("celia", "serio", "Informação e atendimento. Avise o que tem, o que falta e quanto tempo demora. A gente ajuda a espalhar."),
    },
  },

  /* ───── Caso 10 ───── */
  {
    id: "guardiao-final", caso: 10, location: "cofre", who: "guardiao", titulo: "Prestação de contas", apresentacao: "3d", start: "g1",
    nodes: {
      g1: n("guardiao", "irônico", "Fim do ciclo. Hora de prestar contas: aquele momento em que todo administrador descobre que o papel aceita tudo, menos a verdade mal contada.", "g2"),
      g2: n("guardiao", "serio", (c) => {
        const s = c.state;
        if (s && s.personal.desviado > 0) return "Seus registros trazem movimentos que eu, como Guardião, preciso anotar. Não me peça para esquecer: o livro não esquece.";
        return "Seus números fecham. É raro. Quase me emociono.";
      }, "g3"),
      g3: n("guardiao", "neutro", "Escolha como prestar contas. O livro aceita qualquer caneta, mas as pessoas leem o que está escrito."),
    },
  },
  {
    id: "bento-final", caso: 10, location: "cofre", who: "bento", titulo: "Uma pergunta do Professor Bento", apresentacao: "2d", start: "b1",
    nodes: {
      b1: n("bento", "feliz", "Olá! Sou o Bento, professor de gestão pública. Fiquei acompanhando seu caderno. Posso fazer uma pergunta?", "b2"),
      b2: n("bento", "neutro", "Se a UPA tem 94 minutos de espera média, o que é mais útil saber primeiro: a média ou o horário do pico?", undefined, {
        choices: [
          ch("pico", "O horário do pico.", "b3a", { attrs: { competencia: 1 } }),
          ch("media", "A média.", "b3b"),
        ],
      }),
      b3a: n("bento", "feliz", "Isso! A média esconde. Quem mede por horário acha o gargalo.", "b4"),
      b3b: n("bento", "neutro", "É um começo. Mas lembre das 3h da manhã, com 226 minutos: a média escondeu isso.", "b4"),
      b4: n("bento", "feliz", "Anote no caderno e use no próximo cenário. Aplicar é o que vale."),
    },
  },
];

export const CONVERSATIONS: ConversationDef[] = [...CONVERSATIONS_N1, ...CONVERSATIONS_N2];
export const CONV_BY_ID = Object.fromEntries(CONVERSATIONS.map((c) => [c.id, c])) as Record<string, ConversationDef>;

export const NEGOTIATIONS_N1: NegotiationDef[] = [
  {
    id: "neg-corte",
    pedido: "Convença o Guardião de que há uma alternativa melhor que o corte linear. Use o que descobriu no dossiê: o Guardião escuta os números.",
    criterios: [
      { id: "dados", rotulo: "Usou dados do dossiê", dica: "Cite um número ou fato: perdas por validade, pico da madrugada, pediatria noturna.", palavras: [["validade", "vencid", "perda", "pediatri", "madrugada", "226", "18%", "94", "fila", "espera"]] },
      { id: "alternativa", rotulo: "Propôs uma alternativa concreta", dica: "Diga o que fazer no lugar do corte parelho: onde cortar e onde manter.", palavras: [["alternativa", "em vez", "proponho", "propor", "reorganiz", "direcionad", "remanej", "no lugar"]] },
      { id: "risco", rotulo: "Reconheceu o risco ao atendimento", dica: "Fale do acesso e da qualidade que o corte parelho colocaria em risco.", palavras: [["acesso", "atendimento", "qualidade", "fecha", "fechar", "risco", "famílias", "criança", "pacient"]] },
      { id: "prazo", rotulo: "Falou de prazo ou de verificação", dica: "Diga quando e como o resultado será conferido.", palavras: [["prazo", "dias", "semana", "mês", "meses", "trimestre", "confer", "indicador", "acompanh"]] },
    ],
    respostas: {
      fraca: "Hum. Argumento fraco: bonito, mas sem número. Eu escuto os números, não o tom de voz. Dá para aprovar uma versão menor.",
      media: "Razoável. Tem pé e cabeça, mas falta um pedaço. Aprovo parte da proposta — traga o resto no trimestre.",
      forte: "Interessante. Dados, alternativa, risco e verificação — essa combinação me assusta de tão rara. Aprovado, com um olhar de lupa sobre você.",
    },
  },
];
export const NEGOTIATIONS: NegotiationDef[] = [...NEGOTIATIONS_N1, ...NEGOTIATIONS_N2];
export const NEG_BY_ID = Object.fromEntries(NEGOTIATIONS.map((x) => [x.id, x])) as Record<string, NegotiationDef>;
