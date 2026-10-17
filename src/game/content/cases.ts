import type { GameState } from "../engine/types";
import type { CaseDef, DecisionDef, OptionDef } from "./types";
import { CASES_N2, DECISIONS_N2 } from "./cases-n2";
import { NIVEIS_LISTA } from "./niveis";

const DEV = (rotulo: string, explicacao: string): OptionDef["desvio"] => ({ rotulo, explicacao });
const hasFlag = (s: GameState) => s.decisions.some((d) => ["atestar-sem-conferir", "consultoria-primo", "aceitar-indicacao", "inflar", "mais-barato"].includes(d.optionId));

/** Opções de MEUS 10% — UPA. Todos os valores são % do orçamento anual (estimado) da UPA no cenário. */
export const DECISIONS_N1: DecisionDef[] = [
  /* ───────── D1 — estoque ───────── */
  {
    id: "d1", caso: 1, mesa: "administracao", titulo: "O estoque que vence antes do paciente", conceito: "medir-antes", basePct: 6, gestoPadrao: "assinar",
    papelAssinado: "AUTORIZAÇÃO DE REORGANIZAÇÃO DO ESTOQUE — documento fictício",
    pergunta: "Faltam remédios essenciais enquanto outros vencem na prateleira. Como você organiza a farmácia?",
    opcoes: [
      {
        id: "reorganizar", rotulo: "Reorganizar o estoque (primeiro a vencer, primeiro a sair)", kind: "competente", gesto: "assinar",
        resumo: "Medir consumo, remanejar o que vence para outra unidade e passar a pedir pelo consumo real.",
        previsao: { custo: (c) => `${c.money(1.2)} (sistema, etiquetas e horas da equipe)`, prazo: "2 semanas até estabilizar", ganho: (c) => `Evita perdas de cerca de ${c.money(0.52)} por trimestre`, riscos: [{ texto: "Mais trabalho para a equipe nas primeiras semanas" }, { texto: "Toninho vai reclamar que “sempre foi assim”" }, { texto: (c) => `Há ${c.money(0.52)} em lotes vencendo — a reorganização consegue salvar parte`, precisa: "f-vencimento" }] },
        custoPct: 1.2, economiaPct: 9,
        efeitos: { attrs: { competencia: 5, persuasao: 1 }, pub: { qualidade: 2, equipe: -3 }, estoqueDias: 3, rel: { toninho: -6, joana: 8 } },
        depois: [{ depois: 2, efeitos: { estoqueDias: 5, pub: { equipe: 5, qualidade: 4 }, attrs: { confianca: 3 } }, titulo: "Remédio sem improviso", mensagem: "A farmácia passou a pedir pelo consumo. O salbutamol deixou de acabar de surpresa e a equipe parou de procurar remédio por mensagem.", motivo: "Você mediu consumo e validade antes de comprar.", tom: "bom" }],
        narracao: "Joana sorri pela primeira vez no dia: “Sabe o que falta antes de acabar. Eu nunca tinha visto isso.” Toninho resmunga que o tempo é dinheiro.",
      },
      {
        id: "manter-rotina", rotulo: "Manter a rotina e pedir reposição urgente", kind: "comodo", gesto: "assinar",
        resumo: "Seguir como sempre: pedir o que acabou e esperar o fornecedor.",
        previsao: { custo: (c) => `${c.money(0.4)} (pedido urgente)`, prazo: "Imediato no papel; entrega incerta", riscos: [{ texto: "Os lotes que vencem continuam vencendo" }, { texto: "O pedido continua sem data de entrega", precisa: "c1-pedido" }] },
        custoPct: 0.4, efeitos: { estoqueDias: 1, rel: { toninho: 4 }, attrs: { popularidade: 1 } },
        depois: [{ depois: 2, efeitos: { estoqueDias: -4, pub: { qualidade: -4, equipe: -3 } }, titulo: "Faltou de novo", mensagem: "O pedido urgente não chegou no prazo e três itens voltaram a acabar. A equipe voltou a pedir emprestado à UPA vizinha.", motivo: "Nada mudou na forma de comprar: o problema se repetiu.", tom: "ruim" }],
        narracao: "Todo mundo respirou aliviado: nada mudou. Toninho levanta a xícara de café em brinde.",
      },
      {
        id: "aurora", rotulo: "Aceitar a oferta da Aurora Hospitalar (compra emergencial sem cotação)", kind: "desvio", gesto: "assinar",
        resumo: "Fechar uma compra emergencial com a empresa fictícia e receber a “taxa de agilidade” por fora.",
        previsao: { custo: (c) => `${c.money(3)} de compra emergencial`, prazo: "48 horas", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento", riscos: [{ texto: "Ato de desvio: ficará registrado no histórico" }, { texto: "Mais evidências e dependência do Toninho" }, { texto: "Compra sem cotação pode trazer itens de baixa rotação" }] },
        custoPct: 3.0, desvio: DEV("Receber “taxa de agilidade” da Aurora", "Você escolhe quanto pedir por fora (até 10% da base deste evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { estoqueDias: 4, dependencia: 14, influencia: 6, evidencias: 2, rel: { toninho: 8, joana: -4 }, attrs: { rede: 4, caraDePau: 3, popularidade: 2 } },
        depois: [{ depois: 2, efeitos: { estoqueDias: -3, pub: { qualidade: -5 }, evidencias: 2 }, titulo: "Os itens errados chegaram", mensagem: "A compra emergencial trouxe lotes de pouca rotação e preços acima da média. O estoque dos itens críticos voltou a cair.", motivo: "Compra sem cotação e sem medir o consumo.", tom: "ruim" }],
        aliado: "toninho", narracao: "O estoque chegou rápido. O dinheiro também — só que de outro tipo. Toninho agradece: “Agora você é dos nossos”. A frase não soa como elogio.",
      },
    ],
  },

  /* ───────── D2 — fila ───────── */
  {
    id: "d2", caso: 2, mesa: "administracao", titulo: "A fila da madrugada", conceito: "gargalo", basePct: 4, gestoPadrao: "assinar",
    papelAssinado: "ORDEM DE SERVIÇO — REORGANIZAÇÃO DO ATENDIMENTO — documento fictício",
    pergunta: "A espera média é de 94 minutos, mas às 3h da manhã passa de 3 horas. O que você faz?",
    opcoes: [
      {
        id: "remanejar-equipe", rotulo: "Remanejar técnicos do horário ocioso para o pico", kind: "competente", gesto: "assinar",
        resumo: "Mover parte da equipe das 11h–15h (ociosa) para a madrugada (pico), sem contratar ninguém.",
        requer: { achado: "f-pico", dica: "Cruze o relatório de espera com a escala de plantão para descobrir onde está o gargalo." },
        previsao: { custo: (c) => `${c.money(0.4)} (ajuste de escala e adicional noturno)`, prazo: "1 semana", ganho: () => "Espera da madrugada cai bastante sem contratar", riscos: [{ texto: "Parte da equipe vai reclamar de trocar de turno" }, { texto: "Exige acompanhar o indicador por hora nas primeiras semanas" }] },
        custoPct: 0.4, aplica: ["medir-antes"],
        efeitos: { attrs: { competencia: 6, persuasao: 1 }, pub: { acesso: 7, equipe: 2 }, filaMin: -30, rel: { joana: 8 } },
        depois: [{ depois: 2, efeitos: { filaMin: -12, pub: { acesso: 4, equipe: 3 } }, titulo: "Madrugada mais leve", mensagem: "A espera do pico caiu pela metade e a equipe do dia comentou que “o horário do almoço era mesmo um desperdício”.", motivo: "Você moveu recursos para onde a demanda estava.", tom: "bom" }],
        narracao: "Joana arruma a escala em dez minutos: “Era isso? Era só isso?”. Dona Célia ouve de longe e anota alguma coisa no caderno dela.",
      },
      {
        id: "escala-risco", rotulo: "Implantar classificação de risco e nova escala", kind: "competente", gesto: "assinar",
        resumo: "Treinar a equipe para classificar por gravidade e rever a escala com um consultor interno.",
        previsao: { custo: (c) => `${c.money(2)} (treinamento e adaptação do fluxo)`, prazo: "4 semanas", ganho: () => "Atende primeiro quem mais precisa", riscos: [{ texto: "Demora mais para mostrar resultado" }, { texto: "Custa mais do que remanejar" }] },
        custoPct: 2.0,
        efeitos: { attrs: { competencia: 4 }, pub: { acesso: 5, equipe: -2 }, filaMin: -16, rel: { joana: 4 } },
        depois: [{ depois: 2, efeitos: { filaMin: -10, pub: { acesso: 4, equipe: 3 } }, titulo: "Quem precisa mais é atendido primeiro", mensagem: "A classificação de risco passou a funcionar: casos graves não esperam mais em pé.", motivo: "O fluxo foi reorganizado por gravidade.", tom: "bom" }],
        narracao: "A equipe ganha cartões coloridos e um treinamento. A fila ainda existe, mas agora tem lógica.",
      },
      {
        id: "consultoria-primo", rotulo: "Contratar a consultoria “Hospital 4.0” do Primo Juninho", kind: "fraco", gesto: "assinar",
        resumo: "Fechar o diagnóstico de 60 dias, sem cotação e sem entrega parcial.",
        previsao: { custo: (c) => `${c.money(3)}`, prazo: "60 dias até o diagnóstico", riscos: [{ texto: "Sem cotação com outros fornecedores" }, { texto: "Não explica o que será medido", precisa: "c2-proposta" }, { texto: "Não resolve a fila nas próximas semanas" }] },
        custoPct: 3.0, aliado: "juninho",
        efeitos: { attrs: { rede: 3, competencia: -2 }, rel: { juninho: 10 }, favor: { juninho: 6 } },
        depois: [{ depois: 2, efeitos: { pub: { equipe: -2 }, attrs: { confianca: -3 } }, titulo: "O relatório chegou", mensagem: "O diagnóstico concluiu que “a fila poderia ser menor com mais pessoas e tecnologia”. Nada sobre a escala, nada sobre os horários.", motivo: "A contratação não partiu de uma necessidade medida nem de comparação.", tom: "ruim" }],
        narracao: "Juninho abraça você e já pede o CNPJ de um parente para emitir a nota. Não há crime ainda — mas há pressa demais.",
      },
      {
        id: "hora-extra", rotulo: "Pedir horas extras à equipe, sem mudar o plano", kind: "comodo", gesto: "assinar",
        resumo: "Dobrar a equipe de madrugada com horas extras por algumas semanas.",
        previsao: { custo: (c) => `${c.money(1.4)}`, prazo: "Imediato", riscos: [{ texto: "Cansaço acumulado e queda de qualidade" }, { texto: "Custa todo mês e some quando parar de pagar" }] },
        custoPct: 1.4, efeitos: { pub: { acesso: 3 }, filaMin: -10, attrs: { popularidade: 2 } },
        depois: [{ depois: 1, efeitos: { pub: { equipe: -8, qualidade: -2, acesso: -3 } }, titulo: "Equipe esgotada", mensagem: "Duas técnicas pediram atestado e a qualidade do atendimento caiu. Horas extras sem reorganização viram atalho para o cansaço.", motivo: "O problema era a distribuição das horas, não só a quantidade.", tom: "ruim" }],
        narracao: "A fila encolhe nas primeiras noites. Joana avisa: “Isso aguenta duas semanas. Talvez três.”",
      },
    ],
  },

  /* ───────── D3 — contrato barato ───────── */
  {
    id: "d3", caso: 3, mesa: "administracao", titulo: "O contrato parece barato", conceito: "custo-total", basePct: 5, gestoPadrao: "assinar",
    papelAssinado: "AUTORIZAÇÃO DE AQUISIÇÃO DE MONITORES — documento fictício",
    pergunta: "É preciso comprar 20 monitores multiparâmetros. Três propostas chegaram. Qual você autoriza?",
    opcoes: [
      {
        id: "manutencao-inclusa", rotulo: "Proposta B — VitalCare (manutenção e treinamento incluídos)", kind: "competente", gesto: "assinar",
        resumo: "Preço de compra mais alto, com assistência e treinamento por 5 anos.",
        previsao: { custo: (c) => `${c.money(4.3)} de aquisição`, prazo: "Entrega em 30 dias", riscos: [{ texto: "Parece mais cara no dia da compra" }, { texto: (c) => `Em 5 anos, custa menos que A (${c.money(4.9)}) e C (${c.money(5.3)})`, precisa: "f-tco" }], ganho: () => "Equipamento funcionando, sem parar por falta de peça" },
        custoPct: 4.3, aplica: ["gargalo"],
        efeitos: { attrs: { competencia: 5 }, pub: { qualidade: 6, acesso: 2 }, rel: { roberto: 6 } },
        depois: [{ depois: 3, efeitos: { pub: { qualidade: 3, sustentabilidade: 4 } }, titulo: "Nenhum monitor parado", mensagem: "Quando um sensor falhou, a assistência trocou em dois dias. O equipamento antigo ficaria 40 dias parado.", motivo: "O contrato considerou manutenção, não só o preço de compra.", tom: "bom" }],
        narracao: "Roberto confere as cláusulas, assina como fiscal e sorri de canto: “Pelo menos você leu o final do contrato”.",
      },
      {
        id: "mais-barato", rotulo: "Proposta A — MedTec (menor preço de compra)", kind: "comodo", gesto: "assinar",
        resumo: "A mais barata no dia da compra; assistência sob demanda.",
        previsao: { custo: (c) => `${c.money(3.1)} de aquisição`, prazo: "Entrega em 20 dias", riscos: [{ texto: "Assistência técnica só sob demanda" }, { texto: (c) => `Em 5 anos custa cerca de ${c.money(4.9)}`, precisa: "f-tco" }] },
        custoPct: 3.1, efeitos: { pub: { qualidade: 4 }, rel: { roberto: -2 } },
        depois: [{ depois: 3, efeitos: { caixaPct: -1.8, pub: { qualidade: -6, sustentabilidade: -6 } }, titulo: "Monitores parados esperando peça", mensagem: "Quatro monitores pararam e cada conserto custou caro e demorou semanas. A economia da compra virou despesa de manutenção.", motivo: "O preço de compra escondia o custo de manter o equipamento funcionando.", tom: "ruim" }],
        narracao: "A compra passa no pregão em dez minutos. Quem ficou mais feliz foi a planilha — o monitor fala depois.",
      },
      {
        id: "insumo-exclusivo", rotulo: "Proposta C — EcoMonitor (menor preço, insumos exclusivos)", kind: "fraco", gesto: "assinar",
        resumo: "Barata na compra, mas só aceita sensores e cabos do próprio fabricante.",
        previsao: { custo: (c) => `${c.money(2.7)} de aquisição`, prazo: "Entrega em 15 dias", riscos: [{ texto: "Dependência de um único fornecedor de insumos", precisa: "c3-propostas" }, { texto: (c) => `Em 5 anos custa cerca de ${c.money(5.3)}`, precisa: "f-tco" }] },
        custoPct: 2.7, efeitos: { pub: { qualidade: 4 }, attrs: { competencia: -1 } },
        depois: [{ depois: 2, efeitos: { caixaPct: -2.6, pub: { sustentabilidade: -8 } }, titulo: "Insumo exclusivo, preço exclusivo", mensagem: "Os sensores exclusivos custam o triplo dos comuns e só um fornecedor vende. O contrato barato prendeu a UPA.", motivo: "A proposta não considerava o custo dos insumos ao longo do uso.", tom: "ruim" }],
        narracao: "O representante da EcoMonitor entrega uma caneta de brinde. O preço dos sensores ele esquece de mencionar.",
      },
      {
        id: "favorecer-a", rotulo: "Escolher a MedTec e combinar uma “comissão” por fora", kind: "desvio", gesto: "assinar",
        resumo: "Direcionar o contrato e receber um valor combinado, fictício, por fora.",
        previsao: { custo: (c) => `${c.money(3.1)} de aquisição`, prazo: "20 dias", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento", riscos: [{ texto: "Ato de desvio: ficará registrado" }, { texto: "A MedTec tem assistência fraca: o problema aparece depois" }] },
        custoPct: 3.1, desvio: DEV("Combinar “comissão” com a MedTec", "Você escolhe a comissão (até 10% da base do evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { pub: { qualidade: 3 }, dependencia: 12, evidencias: 2, influencia: 4, rel: { roberto: -8 } },
        depois: [{ depois: 3, efeitos: { caixaPct: -1.8, pub: { qualidade: -6 }, evidencias: 2 }, titulo: "Equipamentos parados e perguntas", mensagem: "Quando os monitores pararam, a Controladoria perguntou por que um contrato tão frágil foi escolhido. Roberto guardou a ata.", motivo: "A escolha não passou por comparação e deixou rastro.", tom: "ruim" }],
        narracao: "A assinatura sai limpa; o resto fica sujo. Roberto fecha a pasta devagar, sem comentar. Ele nunca esquece.",
      },
    ],
  },

  /* ───────── D4 — corte linear ───────── */
  {
    id: "d4", caso: 4, mesa: "cofre", titulo: "Uma economia que fecha portas", conceito: "corte-linear", basePct: 8, gestoPadrao: "assinar",
    papelAssinado: "PARECER SOBRE O MEMORANDO DE CORTE LINEAR — documento fictício",
    pergunta: "A Secretaria mandou cortar 10% dos custeios de todo mundo. Como você responde?",
    opcoes: [
      {
        id: "economia-direcionada", rotulo: "Propor economia dirigida ao desperdício comprovado", kind: "competente", gesto: "parecer",
        resumo: "Cortar onde há perda (validade vencida, compras duplicadas) e manter o atendimento intacto.",
        previsao: { custo: (c) => `${c.money(0.6)} de implantação`, prazo: "Resultado em um trimestre", ganho: (c) => `Economia verificada de até ${c.money(0.64)}, preservando o acesso`, riscos: [{ texto: "A Secretaria pode não gostar de resposta fora do padrão" }, { texto: (c) => `Há ${c.money(0.52)} de perdas por validade no livro-caixa`, precisa: "c4-livro" }, { texto: "O resultado depende de quão bem você convenceu o Guardião" }] },
        custoPct: 0.6, economiaPct: 8, escalaPorNegociacao: "neg-corte", aplica: ["medir-antes"],
        efeitos: { attrs: { competencia: 5, persuasao: 2, rede: -2 }, pub: { acesso: 1, sustentabilidade: 4 }, rel: { guardiao: 6, celia: 4 } },
        depois: [{ depois: 2, efeitos: { pub: { sustentabilidade: 4, qualidade: 2 } }, titulo: "Economia sem fechar portas", mensagem: "A UPA economizou onde havia perda e manteve a pediatria noturna aberta. O Guardião registrou a economia com uma frase: “Verificada”.", motivo: "A economia veio de reduzir desperdício, não de reduzir atendimento.", tom: "bom" }],
        narracao: "O Guardião carimba o parecer com um suspiro. Dona Célia saberá disso antes do fim do dia.",
      },
      {
        id: "investir-gargalo", rotulo: "Manter a pediatria e investir no gargalo da fila", kind: "competente", gesto: "parecer",
        resumo: "Defender, com dados, que gastar um pouco mais onde há necessidade comprovada rende mais que cortar.",
        requer: { achado: "f-pico", dica: "Só dá para defender esse gasto com prova de necessidade: cruze a espera por horário com a escala." },
        previsao: { custo: (c) => `${c.money(1.5)} (mais plantões onde há pico)`, prazo: "3 semanas", ganho: () => "Mais acesso e menos espera", riscos: [{ texto: "Gasta mais agora e piora a sustentabilidade fiscal" }, { texto: "Exige que o Guardião aceite a evidência" }] },
        custoPct: 1.5, aplica: ["gargalo", "medir-antes"],
        efeitos: { attrs: { confianca: 4, competencia: 4 }, pub: { acesso: 4, qualidade: 3, sustentabilidade: -3 }, rel: { celia: 10, guardiao: -2 } },
        depois: [{ depois: 2, efeitos: { filaMin: -10, pub: { acesso: 3 } }, titulo: "Gastar mais foi a decisão certa", mensagem: "A pediatria noturna ficou aberta e o pico da madrugada foi atendido. O custo extra foi compensado em atendimentos que não migraram para o pronto-socorro.", motivo: "O gasto se apoiou em uma necessidade comprovada.", tom: "bom" }],
        narracao: "O Guardião ergue a sobrancelha: “Gastar mais com prova. Perigoso... e convincente.”",
      },
      {
        id: "recusar-corte", rotulo: "Recusar o corte, sem apresentar alternativa", kind: "prudente", gesto: "recusar",
        resumo: "Manter tudo como está e devolver o memorando à Secretaria.",
        previsao: { custo: () => "R$ 0", prazo: "Imediato", riscos: [{ texto: "A pressão fiscal continua e a Secretaria fica irritada" }, { texto: "Preserva o acesso, mas não resolve o desperdício" }] },
        custoPct: 0, efeitos: { rel: { celia: 5 }, attrs: { rede: -6, confianca: 2 }, pub: { sustentabilidade: -6 } },
        depois: [{ depois: 2, efeitos: { pub: { sustentabilidade: -4 } }, titulo: "O problema fiscal continua", mensagem: "Sem alternativa, a Secretaria bloqueou parte do orçamento do trimestre seguinte. O atendimento foi preservado, o desperdício também.", motivo: "Recusar sem propor deixa o problema aberto.", tom: "ruim" }],
        narracao: "O memorando volta para a Secretaria sem uma linha de proposta. Dona Célia aprova; a Secretaria, nem tanto.",
      },
      {
        id: "corte-linear", rotulo: "Aplicar o corte linear de 10%", kind: "comodo", gesto: "assinar",
        resumo: "Cortar parelho, inclusive a pediatria noturna, para cumprir a ordem.",
        previsao: { custo: (c) => `Reduz ${c.money(0.8)} do custeio — mas é redução de atendimento, não eficiência`, prazo: "Imediato", riscos: [{ texto: "Fecha a pediatria noturna", precisa: "c4-pediatria" }, { texto: "O menor gasto não conta como economia: o acesso cai" }] },
        custoPct: -0.8, economiaPct: 10, cortaAcesso: true,
        efeitos: { pub: { acesso: -9, qualidade: -6, equipe: -5, sustentabilidade: 5 }, rel: { celia: -12 }, attrs: { rede: 4, confianca: -3 } },
        depois: [{ depois: 2, efeitos: { pub: { acesso: -4 }, attrs: { confianca: -8, popularidade: -4 } }, titulo: "A pediatria noturna fechou", mensagem: "Famílias passaram a atravessar 14 km de madrugada. Dona Célia apareceu na porta do gabinete com o abaixo-assinado do bairro.", motivo: "O corte reduziu atendimento, não desperdício.", tom: "ruim" }],
        narracao: "O gasto cai, o acesso também. Dona Célia lê o comunicado na recepção e dobra o papel bem devagar.",
      },
    ],
  },

  /* ───────── D5 — obra ───────── */
  {
    id: "d5", caso: 5, mesa: "administracao", titulo: "O anúncio chegou antes da obra", conceito: "entrega-vs-anuncio", basePct: 5, gestoPadrao: "parecer",
    papelAssinado: "PARECER SOBRE A INAUGURAÇÃO E A MEDIÇÃO DA OBRA — documento fictício",
    pergunta: "A faixa de inauguração já está pendurada, mas a obra tem 62% executados. O que você decide?",
    opcoes: [
      {
        id: "corrigir-cronograma", rotulo: "Corrigir o cronograma e inaugurar só quando entregar", kind: "competente", gesto: "parecer",
        resumo: "Cancelar a inauguração de sábado, anunciar a data real e pagar só o que foi executado.",
        previsao: { custo: (c) => `${c.money(1)} (retoque e comunicação)`, prazo: "4 semanas", ganho: () => "Obra entregue funcionando", riscos: [{ texto: "Perde o aplauso de sábado e irrita o Deputado Cornélio" }, { texto: "Popularidade cai agora, confiança sobe depois" }] },
        custoPct: 1.0, aplica: ["custo-total"],
        efeitos: { attrs: { competencia: 4, confianca: 5, popularidade: -6 }, rel: { cornelio: -10 } },
        depois: [{ depois: 2, efeitos: { pub: { acesso: 5, qualidade: 5 }, attrs: { popularidade: 8, confianca: 4 } }, titulo: "A sala nova abriu — de verdade", mensagem: "A inauguração foi remarcada e a sala abriu com oxigênio canalizado. A faixa nova dizia: “Agora sim”.", motivo: "Você entregou antes de anunciar.", tom: "bom" }],
        narracao: "Cornélio fecha a cara; Dona Célia, que conversa com a equipe da obra, aplaude baixinho.",
      },
      {
        id: "inauguracao-parcial", rotulo: "Inaugurar só a ala pronta e explicar o que falta", kind: "prudente", gesto: "parecer",
        resumo: "Abrir a parte utilizável, informando a data e o que ainda será concluído.",
        previsao: { custo: (c) => `${c.money(0.6)}`, prazo: "Sábado, com nova data para o restante", riscos: [{ texto: "Demanda explicar com clareza o que falta, sem prometer demais" }, { texto: "Exige confiar no cronograma físico", precisa: "c5-cronograma" }] },
        custoPct: 0.6, efeitos: { attrs: { popularidade: 2, confianca: 3, persuasao: 2 }, rel: { cornelio: -2 } },
        depois: [{ depois: 2, efeitos: { pub: { acesso: 4, qualidade: 3 }, attrs: { confianca: 3 } }, titulo: "A obra foi concluída no prazo avisado", mensagem: "A segunda etapa terminou na data divulgada. Ninguém foi surpreendido.", motivo: "Você disse a verdade sobre o que estava pronto.", tom: "bom" }],
        narracao: "Você corta uma fita menor e conta a história inteira. Menos foto, mais credibilidade.",
      },
      {
        id: "inflar", rotulo: "Inaugurar tudo como “concluído” com o deputado", kind: "fraco", gesto: "assinar",
        resumo: "Manter a cerimônia de sábado como se a obra estivesse pronta.",
        previsao: { custo: (c) => `${c.money(0.3)}`, prazo: "Sábado", ganho: () => "Aplauso imediato", riscos: [{ texto: "Propaganda não conta como obra entregue" }, { texto: "A sala sem oxigênio pode ser interditada" }] },
        custoPct: 0.3, efeitos: { attrs: { popularidade: 10, rede: 4, caraDePau: 3 }, rel: { cornelio: 10 } },
        depois: [{ depois: 2, efeitos: { pub: { qualidade: -3, acesso: -3 }, attrs: { confianca: -10, popularidade: -8 } }, titulo: "Sala interditada na semana seguinte", mensagem: "A vigilância sanitária interditou a sala sem gases medicinais. As fotos da inauguração viraram prova do contrário.", motivo: "O anúncio veio antes da entrega.", tom: "ruim" }],
        narracao: "A fita foi cortada, os aplausos foram sinceros e o oxigênio continua sendo uma ideia.",
      },
      {
        id: "medicao-inflada", rotulo: "Atestar medição de 100% e liberar o saldo (com “retorno” da empreiteira)", kind: "desvio", gesto: "assinar",
        resumo: "Liberar o pagamento total sem conferir o cronograma e receber um valor por fora.",
        previsao: { custo: (c) => `${c.money(5)} de saldo pago`, prazo: "Imediato", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento", riscos: [{ texto: "Ato de desvio: fica registrado" }, { texto: "Paga por serviço que ainda não existe" }] },
        custoPct: 5.0, desvio: DEV("Receber “retorno” da empreiteira", "Você escolhe o valor (até 10% da base do evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { attrs: { popularidade: 6 }, dependencia: 10, evidencias: 3, influencia: 5, rel: { cornelio: 8 } },
        depois: [{ depois: 2, efeitos: { pub: { qualidade: -3, acesso: -3 }, attrs: { confianca: -10, popularidade: -8 }, evidencias: 2 }, titulo: "Sala interditada e medição questionada", mensagem: "A obra foi interditada e a medição de 100% não bate com nenhuma foto. O boletim ficou arquivado.", motivo: "A liquidação não conferiu a entrega.", tom: "ruim" }],
        aliado: "cornelio", narracao: "A caneta corre. A medição aparece completa no papel e incompleta na parede.",
      },
    ],
  },

  /* ───────── D6 — entrega ───────── */
  {
    id: "d6", caso: 6, mesa: "administracao", titulo: "A entrega conferida", conceito: "execucao-despesa", basePct: 6, gestoPadrao: "assinar",
    papelAssinado: "ATESTO DE RECEBIMENTO E LIQUIDAÇÃO DA DESPESA — documento fictício",
    pergunta: "A carga chegou e o fornecedor pressiona pelo pagamento. O que você faz com a liquidação?",
    opcoes: [
      {
        id: "conferir-liquidar-parcial", rotulo: "Conferir e liquidar só o que foi recebido", kind: "competente", gesto: "assinar",
        resumo: "Registrar o recebimento parcial, liquidar o que chegou e cobrar a diferença.",
        previsao: { custo: (c) => `${c.money(4.5)} liquidados (o recebido)`, prazo: "2 dias", ganho: (c) => `Evita pagar cerca de ${c.money(0.7)} por mercadoria que não chegou`, riscos: [{ texto: "O fornecedor vai reclamar do prazo" }, { texto: "Os lotes de validade curta ainda ocupam espaço", precisa: "c6-recebimento" }] },
        custoPct: 4.5, economiaPct: 4, aplica: ["custo-total"],
        efeitos: { attrs: { competencia: 5 }, pub: { qualidade: 2 }, estoqueDias: 4, rel: { roberto: 8 } },
        narracao: "Roberto carimba o recebimento parcial com visível satisfação. O fornecedor liga de novo, mas agora com mais educação.",
      },
      {
        id: "devolver-lote", rotulo: "Devolver o lote de validade curta e acionar a garantia", kind: "competente", gesto: "recusar",
        resumo: "Recusar o que vence logo, liquidar apenas o que serve e exigir reposição.",
        requer: { achado: "f-divergencia", dica: "Cruze a nota fiscal com a contagem da carga para descobrir a divergência." },
        previsao: { custo: (c) => `${c.money(4)} liquidados (apenas o que serve)`, prazo: "1 semana para a reposição", ganho: (c) => `Evita pagar cerca de ${c.money(1)} por itens que não chegaram ou não servem`, riscos: [{ texto: "Exige acompanhar a reposição do fornecedor" }] },
        custoPct: 4.0, economiaPct: 7, aplica: ["custo-total", "medir-antes"],
        efeitos: { attrs: { competencia: 6, persuasao: 1 }, pub: { qualidade: 3 }, estoqueDias: 5, rel: { roberto: 10 } },
        depois: [{ depois: 3, efeitos: { estoqueDias: 3, attrs: { confianca: 2 } }, titulo: "Reposição com validade longa", mensagem: "O fornecedor repôs as caixas faltantes com validade de 14 meses. O estoque ficou maior e mais seguro.", motivo: "Você exigiu a entrega conforme o contrato antes de liquidar.", tom: "bom" }],
        narracao: "O fornecedor protesta; a garantia resolve. Roberto escreve no relatório: “Entrega conferida”. Em negrito.",
      },
      {
        id: "atestar-sem-conferir", rotulo: "Atestar tudo sem conferir para não indispor o fornecedor", kind: "fraco", gesto: "assinar",
        resumo: "Assinar a nota inteira e liberar o pagamento de uma vez.",
        previsao: { custo: (c) => `${c.money(5.5)} liquidados (a nota inteira)`, prazo: "Imediato", riscos: [{ texto: "Pagar por mercadoria que não chegou" }, { texto: "A Controladoria pode perguntar onde estão as caixas", precisa: "c6-nota" }] },
        custoPct: 5.5, efeitos: { pub: { qualidade: 1 }, estoqueDias: 2, attrs: { competencia: -4 }, rel: { roberto: -8 } },
        depois: [{ depois: 1, efeitos: { attrs: { confianca: -4 }, pub: { sustentabilidade: -3 } }, titulo: "Onde estão as 150 caixas?", mensagem: "O atesto sem conferência virou apontamento administrativo. Não é crime: é falha de controle, e custou dinheiro.", motivo: "Liquidar é confirmar a entrega — e a entrega não foi confirmada.", tom: "ruim" }],
        narracao: "O fornecedor agradece com um sorriso largo. Roberto tira os óculos e limpa a lente devagar.",
      },
      {
        id: "receber-mimo", rotulo: "Aceitar uma “compensação” do fornecedor para fechar os olhos", kind: "desvio", gesto: "assinar",
        resumo: "Atestar a carga inteira e aceitar um valor por fora para esquecer a diferença.",
        previsao: { custo: (c) => `${c.money(5.5)} liquidados`, prazo: "Imediato", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento", riscos: [{ texto: "Ato de desvio: fica registrado" }, { texto: "Roberto sabe o que foi contado" }] },
        custoPct: 5.5, desvio: DEV("Receber “compensação” do fornecedor", "Você escolhe o valor (até 10% da base do evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { estoqueDias: 1, dependencia: 12, evidencias: 3, influencia: 4, rel: { roberto: -10 } },
        depois: [{ depois: 1, efeitos: { evidencias: 2, pub: { qualidade: -3 } }, titulo: "A diferença virou pergunta", mensagem: "A diferença de 150 caixas estava registrada na contagem. Agora é um documento a ser explicado.", motivo: "A contagem do recebimento permanece nos registros.", tom: "ruim" }],
        aliado: "roberto", narracao: "O envelope é discreto. A contagem do Roberto também.",
      },
    ],
  },

  /* ───────── D7 — auditoria ───────── */
  {
    id: "d7", caso: 7, mesa: "administracao", titulo: "Auditoria surpresa", conceito: "controle-interno", basePct: 0, gestoPadrao: "parecer",
    papelAssinado: "TERMO DE ACOMPANHAMENTO DA CONFERÊNCIA — documento fictício",
    pergunta: "Ana, da Controladoria, vai conferir os registros. Como você recebe a auditoria?",
    opcoes: [
      {
        id: "abrir-tudo", rotulo: "Abrir todos os registros e acompanhar a conferência", kind: "competente", gesto: "parecer",
        resumo: "Colocar a documentação à disposição e responder às perguntas da Ana.",
        previsao: { custo: () => "R$ 0", prazo: "1 dia", riscos: [{ texto: "A auditoria consulta o que já está registrado — para quem tem os papéis em dia, termina rápido" }, { texto: "Não altera nenhum registro: só mostra o que existe" }] },
        custoPct: 0, efeitos: { attrs: { confianca: 2 }, rel: { ana: 6 } },
        narracao: "Ana abre o arquivo, compara e anota. Seu único trabalho foi estar presente.",
      },
      {
        id: "pedir-prazo", rotulo: "Pedir 48 horas para organizar documentos pendentes", kind: "prudente", gesto: "esclarecer",
        resumo: "Solicitar prazo formal para juntar notas e atas que estão com a equipe.",
        previsao: { custo: () => "R$ 0", prazo: "48 horas", riscos: [{ texto: "O prazo não altera nenhum registro existente" }, { texto: "Passa uma impressão de desorganização" }] },
        custoPct: 0, efeitos: { attrs: { confianca: -1 }, rel: { ana: 2 } },
        narracao: "Ana anota o pedido e concede o prazo. O registro, claro, continua o mesmo.",
      },
      {
        id: "delegar", rotulo: "Deixar a equipe receber a Ana, sem acompanhar", kind: "fraco", gesto: "assinar",
        resumo: "Não participar da conferência e confiar que a equipe resolve.",
        previsao: { custo: () => "R$ 0", prazo: "1 dia", riscos: [{ texto: "Ninguém sabe explicar as decisões que você tomou" }, { texto: "Passa a ideia de pouco caso com o controle" }] },
        custoPct: 0, efeitos: { attrs: { competencia: -3, confianca: -3 }, rel: { ana: -3 } },
        narracao: "A equipe responde o que sabe — o que é menos do que seria necessário. Ana registra as lacunas com calma.",
      },
    ],
  },

  /* ───────── D8 — favor ───────── */
  {
    id: "d8", caso: 8, mesa: "administracao", titulo: "O favor do aliado", conceito: "conflito-interesses", basePct: 3, gestoPadrao: "esclarecer",
    papelAssinado: "OFÍCIO — PEDIDO DE ESCLARECIMENTOS E COTAÇÃO — documento fictício",
    pergunta: "O gabinete do deputado indica uma empresa para a manutenção predial, em troca de apoio. O que você faz?",
    opcoes: [
      {
        id: "cotar-esclarecer", rotulo: "Pedir esclarecimentos por escrito e abrir cotação com 3 fornecedores", kind: "competente", gesto: "esclarecer",
        resumo: "Registrar o pedido, comparar propostas e decidir pelo melhor custo.",
        previsao: { custo: (c) => `${c.money(0.3)} (processo de cotação)`, prazo: "2 semanas", ganho: (c) => `Economia esperada de cerca de ${c.money(0.36)} por concorrência`, riscos: [{ texto: "Irrita Toninho e o Deputado Cornélio" }, { texto: "Pode perder apoio político em curto prazo" }] },
        custoPct: 0.3, economiaPct: 12, aplica: ["custo-total"],
        efeitos: { attrs: { competencia: 4, confianca: 5, rede: -2 }, rel: { toninho: -4, cornelio: -5 } },
        depois: [{ depois: 1, efeitos: { pub: { sustentabilidade: 3 } }, titulo: "Três propostas, uma 12% mais barata", mensagem: "A cotação trouxe uma proposta melhor e a Zelo & Cia, com preço competitivo, também entrou — e ganhou ou perdeu pelo mérito.", motivo: "A decisão passou a depender de comparação, não de indicação.", tom: "bom" }],
        narracao: "O ofício sai pesado de formalidade. Toninho lê, faz uma careta e diz: “Isso vai dar fofoca”. Vai.",
      },
      {
        id: "recusar-cordial", rotulo: "Recusar cordialmente, mantendo o fornecedor atual", kind: "prudente", gesto: "recusar",
        resumo: "Agradecer a indicação e dizer que não será possível.",
        previsao: { custo: () => "R$ 0", prazo: "Imediato", riscos: [{ texto: "Não compara preços: o contrato atual continua como está" }, { texto: "Reduz o apoio político" }] },
        custoPct: 0, efeitos: { attrs: { confianca: 3, rede: -3 }, rel: { cornelio: -6, toninho: -2 } },
        narracao: "Você recusa com educação. Do outro lado, o telefone fica em silêncio por um longo tempo.",
      },
      {
        id: "aceitar-indicacao", rotulo: "Aceitar a indicação para manter a paz", kind: "fraco", gesto: "assinar",
        resumo: "Contratar a Zelo & Cia sem cotação, em troca do apoio prometido.",
        previsao: { custo: (c) => `${c.money(3.3)} por ano`, prazo: "Imediato", riscos: [{ texto: "Sem comparação, o preço pode estar acima do mercado", precisa: "c8-proposta" }, { texto: "O deputado vai cobrar a contrapartida" }] },
        custoPct: 3.3, aliado: "cornelio",
        efeitos: { attrs: { rede: 6, competencia: -3, confianca: -2 }, favor: { cornelio: 8 }, dependencia: 8, rel: { cornelio: 8, toninho: 5 } },
        depois: [{ depois: 2, efeitos: { pub: { equipe: -2 }, attrs: { confianca: -3 }, dependencia: 4 }, titulo: "O deputado cobrou", mensagem: "Cornélio ligou pedindo uma vaga para um conhecido e prioridade numa fila de exames. A conta de um favor sempre chega.", motivo: "Aceitar sem comparar criou uma dívida de gratidão.", tom: "ruim" }],
        narracao: "Toninho abre um sorriso. O deputado também. O preço da manutenção, ninguém conferiu.",
      },
      {
        id: "comissao", rotulo: "Aceitar e pedir uma “comissão” à empresa", kind: "desvio", gesto: "assinar",
        resumo: "Fechar a contratação e combinar um valor por fora com a empresa.",
        previsao: { custo: (c) => `${c.money(3.3)} por ano`, prazo: "Imediato", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento", riscos: [{ texto: "Ato de desvio: fica registrado" }, { texto: "Você passa a depender do deputado" }] },
        custoPct: 3.3, desvio: DEV("Combinar “comissão” com a Zelo & Cia", "Você escolhe o valor (até 10% da base do evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { attrs: { rede: 5 }, dependencia: 10, evidencias: 3, influencia: 5, rel: { cornelio: 10 } },
        depois: [{ depois: 2, efeitos: { evidencias: 2, attrs: { confianca: -3 } }, titulo: "O deputado também quer a parte dele", mensagem: "Cornélio ficou sabendo da comissão e passou a tratar você como sócio. Ele nunca se esquece dos sócios.", motivo: "Um desvio cria um aliado que cobra.", tom: "ruim" }],
        aliado: "cornelio", narracao: "A caneta assina duas vezes: uma no papel, outra no acordo. Só o primeiro é para constar.",
      },
    ],
  },

  /* ───────── D9 — inverno ───────── */
  {
    id: "d9", caso: 9, mesa: "administracao", titulo: "Inverno na porta", conceito: "reserva-urgencia", basePct: 7, gestoPadrao: "assinar",
    papelAssinado: "AUTORIZAÇÃO DE REFORÇO EMERGENCIAL — documento fictício",
    pergunta: "Os atendimentos subiram 65%. O que você faz com o orçamento restante?",
    opcoes: [
      {
        id: "reforco-emergencial", rotulo: "Autorizar reforço emergencial, com cotação rápida", kind: "competente", gesto: "assinar",
        resumo: "Plantões extras e compra emergencial de insumos, com três cotações em 24 horas.",
        previsao: { custo: (c) => `${c.money(3.4)} (pode subir se o estoque estiver baixo)`, prazo: "3 dias", ganho: () => "Mantém o atendimento na crise", riscos: [{ texto: "Pesa no caixa e na sustentabilidade fiscal" }, { texto: "Gastar mais pode ser o certo — mas só com cotação e registro" }] },
        custoPct: 3.4, aplica: ["medir-antes"],
        efeitos: { attrs: { confianca: 5, competencia: 4 }, pub: { acesso: 8, qualidade: 6, equipe: -2, sustentabilidade: -6 }, rel: { joana: 8, celia: 8 } },
        ajustes: [
          { se: (s) => s.pub.estoqueDias < 8, efeitos: { pub: { qualidade: -4, acesso: -3 } }, custoPctExtra: 1.2, nota: "O estoque baixo encareceu a compra emergencial e atrasou a reposição." },
          { se: (s) => s.pub.estoqueDias >= 12, efeitos: { pub: { qualidade: 3 } }, nota: "O estoque organizado absorveu parte da demanda sem compra extra." },
        ],
        narracao: "Joana distribui a escala em minutos; Dona Célia ajuda a avisar o bairro. A crise não acaba, mas deixa de ser surpresa.",
      },
      {
        id: "remanejar-rede", rotulo: "Pedir apoio de leitos e insumos às UPAs vizinhas", kind: "prudente", gesto: "esclarecer",
        resumo: "Acionar a rede de contatos para dividir a demanda e emprestar insumos.",
        requer: { attr: { key: "rede", min: 30 }, dica: "Pedir apoio exige uma rede de contatos de pelo menos 30 pontos." },
        previsao: { custo: (c) => `${c.money(0.8)} (transporte e remanejamento)`, prazo: "2 dias", riscos: [{ texto: "Gasta capital político" }, { texto: "Depende de a UPA vizinha ter folga" }] },
        custoPct: 0.8, efeitos: { pub: { acesso: 5, qualidade: 3 }, attrs: { rede: -3, competencia: 3 }, rel: { joana: 4 } },
        ajustes: [{ se: (s) => s.pub.estoqueDias < 8, efeitos: { pub: { qualidade: -2 } }, nota: "Pouco estoque limitou o que a UPA vizinha pôde emprestar." }],
        narracao: "Três telefonemas depois, duas ambulâncias chegam com cilindros e uma caixa de nebulizadores.",
      },
      {
        id: "manter-orcamento", rotulo: "Manter o orçamento e reduzir atendimentos de baixa complexidade", kind: "fraco", gesto: "recusar",
        resumo: "Atender só os casos graves e orientar os demais a procurar outra unidade.",
        previsao: { custo: () => "R$ 0", prazo: "Imediato", riscos: [{ texto: "Quem não tem como ir a 14 km fica sem atendimento" }, { texto: "A economia vem de atender menos — não é eficiência" }] },
        custoPct: 0, cortaAcesso: true, efeitos: { pub: { acesso: -10, qualidade: -6, sustentabilidade: 4 }, attrs: { confianca: -8, popularidade: -5 }, rel: { celia: -10, joana: -8 } },
        narracao: "O caixa fica intacto e a recepção vira palco de discussão. Joana não diz uma palavra, o que é pior.",
      },
      {
        id: "compra-dispensa", rotulo: "Comprar por dispensa de licitação e receber uma “taxa de agilidade”", kind: "desvio", gesto: "assinar",
        resumo: "Usar a urgência como pretexto para uma compra sem comparação e com valor por fora.",
        previsao: { custo: (c) => `${c.money(3.4)}`, prazo: "24 horas", ganho: () => "Ganho pessoal ilícito (fictício): até 10% da base do evento", riscos: [{ texto: "Ato de desvio: fica registrado" }, { texto: "Aproveitar a crise para desviar agrava o dano" }] },
        custoPct: 3.4, desvio: DEV("Receber “taxa de agilidade” na compra emergencial", "Você escolhe o valor (até 10% da base do evento). É um ato de desvio fictício e fica registrado."),
        efeitos: { pub: { acesso: 5, qualidade: 2 }, dependencia: 10, evidencias: 4, influencia: 4, rel: { joana: -8, celia: -6 } },
        narracao: "A compra sai em 24 horas. Parte do dinheiro sai com ela, em uma direção que não consta no processo.",
      },
    ],
  },

  /* ───────── D10 — prestação de contas ───────── */
  {
    id: "d10", caso: 10, mesa: "cofre", titulo: "Prestação de contas", conceito: "transparencia", basePct: 0, gestoPadrao: "parecer",
    papelAssinado: "PARECER FINAL — PRESTAÇÃO DE CONTAS DO CICLO — documento fictício",
    pergunta: "O ciclo terminou. Como você presta contas à população e à Secretaria?",
    opcoes: [
      {
        id: "prestacao-completa", rotulo: "Publicar prestação de contas completa: resultados, falhas e plano de correção", kind: "competente", gesto: "parecer",
        resumo: "Divulgar indicadores, decisões e problemas — inclusive os desfavoráveis.",
        previsao: { custo: () => "R$ 0", prazo: "Imediato", riscos: [{ texto: "Mostra falhas e pode gerar críticas" }, { texto: "Aumenta a confiança de quem acompanha" }] },
        custoPct: 0, aplica: ["controle-interno"], efeitos: { attrs: { confianca: 8, competencia: 3, popularidade: -1 }, rel: { guardiao: 6, ana: 4 } },
        narracao: "O Guardião lê o relatório de ponta a ponta. Ao final, apenas diz: “Honesto”. É o maior elogio possível.",
      },
      {
        id: "resumo-positivo", rotulo: "Publicar só o resumo positivo", kind: "comodo", gesto: "parecer",
        resumo: "Divulgar as melhores notícias e deixar o resto para depois.",
        previsao: { custo: () => "R$ 0", prazo: "Imediato", riscos: [{ texto: "Se houver problemas nos registros, a confiança cai quando a verdade aparece" }] },
        custoPct: 0, efeitos: { attrs: { popularidade: 6 } },
        ajustes: [{ se: (s) => s.personal.desviado > 0 || s.personal.evidencias > 0 || hasFlag(s), efeitos: { attrs: { confianca: -8 } }, nota: "Os registros mostram o que o resumo omitiu: a confiança caiu." }],
        narracao: "O informativo é lindo, otimista e incompleto. Quem leu os anexos percebeu a diferença.",
      },
      {
        id: "adiar-publicacao", rotulo: "Adiar a publicação até as coisas se acalmarem", kind: "fraco", gesto: "assinar",
        resumo: "Segurar o relatório para publicar em momento mais conveniente.",
        previsao: { custo: () => "R$ 0", prazo: "Indefinido", riscos: [{ texto: "Transparência atrasada vira desconfiança" }] },
        custoPct: 0, efeitos: { attrs: { confianca: -6, competencia: -3 }, rel: { guardiao: -4 } },
        narracao: "O relatório fica na gaveta. O Guardião observa a gaveta como quem observa um suspeito.",
      },
    ],
  },
];

export const DECISIONS: DecisionDef[] = [...DECISIONS_N1, ...DECISIONS_N2, ...NIVEIS_LISTA.flatMap((n) => n.decisoes)];
export const DECISION_BY_ID = Object.fromEntries(DECISIONS.map((d) => [d.id, d])) as Record<string, DecisionDef>;

export const CASES_N1: CaseDef[] = [
  { id: "caso1", caso: 1, titulo: "O estoque que vence antes do paciente", episodio: "Episódio 1", location: "recepcao", pistas: ["c1-consumo", "c1-validade", "c1-pedido", "c1-oferta"], conversas: ["abertura", "joana-estoque", "toninho-estoque"], decisao: "d1",
    chamada: "Dona Célia está na fila com uma família: a bombinha de asma do Davi acabou, e a UPA diz que “não tem previsão”. Descubra o que há de verdade no estoque antes de decidir.",
    objetivo: "Descubra por que faltam remédios (farmácia, enfermagem e gabinete).", dica: "Dica do Professor Bento: cruze duas pistas — o que se consome com o que vence. Os números contam o que as opiniões escondem." },
  { id: "caso2", caso: 2, titulo: "A fila da madrugada", episodio: "Episódio 2", location: "recepcao", pistas: ["c2-espera", "c2-escala", "c2-proposta"], conversas: ["celia-fila", "juninho-consultoria"], decisao: "d2",
    chamada: "A espera média é de 94 minutos. Mas a média não conta toda a história, e o Primo Juninho já apareceu com um PowerPoint.",
    objetivo: "Descubra onde a fila trava: relatório de espera, escala e proposta do primo.", dica: "Dica do Professor Bento: duas colunas diferentes (espera e escala) podem revelar um padrão que nenhuma delas mostra sozinha. Tente confrontá-las no dossiê." },
  { id: "caso3", caso: 3, titulo: "O contrato parece barato", episodio: "Episódio 3", location: "administracao", pistas: ["c3-propostas", "c3-manut"], conversas: ["roberto-contratos"], decisao: "d3",
    chamada: "Os monitores velhos estão parando. Três empresas mandaram proposta — e uma delas é muito mais barata que as outras.",
    objetivo: "Compare as propostas com o histórico real dos monitores.", dica: "Dica do Professor Bento: preço de compra é só uma parte. Confronte as propostas com a ficha de manutenção e some tudo em cinco anos." },
  { id: "caso4", caso: 4, titulo: "Uma economia que fecha portas", episodio: "Episódio 4", location: "administracao", pistas: ["c4-memo", "c4-pediatria", "c4-livro"], conversas: ["guardiao-corte"], decisao: "d4",
    chamada: "A Secretaria mandou cortar 10% de tudo, igualzinho, em todas as unidades. O Guardião do Cofre só libera uma alternativa se for muito bem explicada.",
    objetivo: "Entenda o que o corte atinge e convença o Guardião de uma alternativa.", dica: "Dica do Professor Bento: economia verdadeira entrega o mesmo serviço gastando menos. Reduzir atendimento só reduz gasto." },
  { id: "caso5", caso: 5, titulo: "O anúncio chegou antes da obra", episodio: "Episódio 5", location: "patio", pistas: ["c5-cronograma", "c5-medicao", "c5-convite"], conversas: ["cornelio-inauguracao"], decisao: "d5",
    chamada: "A faixa de inauguração está pendurada, a imprensa foi chamada e a sala de observação ainda não tem oxigênio canalizado.",
    objetivo: "Compare o que foi construído com o que está sendo cobrado.", dica: "Dica do Professor Bento: cronograma físico (o que existe) e medição financeira (o que se cobra) precisam bater antes de pagar." },
  { id: "caso6", caso: 6, titulo: "A entrega conferida", episodio: "Episódio 6", location: "farmacia", pistas: ["c6-nota", "c6-recebimento"], conversas: ["roberto-entrega"], decisao: "d6",
    chamada: "A carga de reposição chegou. O fornecedor quer pagamento hoje, e Roberto tem uma contagem que não bate com a nota.",
    objetivo: "Compare a nota fiscal com a contagem do recebimento.", dica: "Dica do Professor Bento: empenho reserva, liquidação confirma a entrega e pagamento quita. Liquide só depois de conferir." },
  { id: "caso7", caso: 7, titulo: "Auditoria surpresa", episodio: "Episódio 7", location: "administracao", pistas: ["c7-registros"], conversas: ["ana-auditoria"], decisao: "d7",
    chamada: "Ana, da Controladoria, chegou sem avisar para conferir os registros do trimestre. O que ela vai encontrar é o que você já registrou.",
    objetivo: "Receba a Controladoria e veja o que o arquivo mostra.", dica: "Dica do Professor Bento: auditoria compara registros com documentos. Ela não inventa nada — e nada se apaga." },
  { id: "caso8", caso: 8, titulo: "O favor do aliado", episodio: "Episódio 8", location: "administracao", pistas: ["c8-proposta"], conversas: ["toninho-favor"], decisao: "d8",
    chamada: "O gabinete do deputado indicou uma empresa para a manutenção do prédio, com a promessa de apoio na sua promoção.",
    objetivo: "Decida o que fazer com a indicação do deputado.", dica: "Dica do Professor Bento: indicação não é crime. Decidir sem comparar é o risco. Registre por escrito e compare." },
  { id: "caso9", caso: 9, titulo: "Inverno na porta", episodio: "Episódio 9", location: "enfermagem", pistas: ["c9-boletim", "c9-leitos"], conversas: ["joana-crise", "celia-crise"], decisao: "d9",
    chamada: "Os atendimentos por síndrome respiratória subiram 65% em 10 dias. O quanto de estoque e de leitos você preparou antes vai pesar agora.",
    objetivo: "Veja o estoque e os leitos e escolha como atravessar a crise.", dica: "Dica do Professor Bento: numa crise comprovada, gastar mais pode ser a melhor escolha — mas com cotação, registro e justificativa." },
  { id: "caso10", caso: 10, titulo: "Prestação de contas", episodio: "Episódio 10", location: "cofre", pistas: ["c10-indicadores"], conversas: ["guardiao-final", "bento-final"], decisao: "d10",
    chamada: "O ciclo terminou. É hora de contar à população e à Secretaria o que aconteceu — inclusive o que não deu certo.",
    objetivo: "Veja os indicadores e escolha como prestar contas.", dica: "Dica do Professor Bento: prestar contas é mostrar resultado, falha e plano de correção. Um relatório que só agrada, não informa." },
];
export const CASES: CaseDef[] = [...CASES_N1, ...CASES_N2, ...NIVEIS_LISTA.flatMap((n) => n.casos)];
export const CASE_BY_NUM = Object.fromEntries(CASES.map((c) => [c.caso, c])) as Record<number, CaseDef>;
/** Total de casos da carreira construída até aqui (use `casosDoNivel` para o total de um nível). */
export const TOTAL_CASES = CASES.length;
