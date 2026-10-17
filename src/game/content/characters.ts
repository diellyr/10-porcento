import type { CharId } from "../engine/types";
import type { Character } from "./types";

/**
 * Elenco de MEUS 10%. TODOS os personagens são fictícios e originais.
 * `look` é a referência de identidade compartilhada entre o retrato 2D (SVG) e o busto 3D (Three.js):
 * mesmo tom de pele, cabelo, óculos, roupa e idade aparente nas duas versões.
 * `voz.direcao` é direção de atuação — o ID da voz no fornecedor vem de variável de ambiente (voz.envVar), nunca do código.
 */
export const CHARACTERS: Record<CharId, Character> = {
  joana: {
    id: "joana", nome: "Joana", papel: "Enfermeira-chefe da UPA", cor: "#0f9d8a", naUpa: true,
    interesse: "Quer saber o que falta ANTES de acabar. Mostra o efeito real de cada escolha.",
    voz: { direcao: "Profissional e atenta. Fala firme, frases curtas, pausa antes de dar a má notícia. Cansada, mas nunca desiste.", rate: 1.02, pitch: 1.08, envVar: "TTS_VOICE_JOANA", genero: "f" },
    look: { pele: "#b9835c", peleSombra: "#8f5d3d", cabelo: "#1f1612", cabeloEstilo: "coque", roupa: "#2bb3a3", roupa2: "#e9fbf8", roupaTipo: "jaleco", idade: 38, olhos: "#3a2418", rosto: 1 },
  },
  celia: {
    id: "celia", nome: "Dona Célia", papel: "Conselheira de saúde do bairro", cor: "#e2701c", naUpa: true,
    interesse: "Representa a comunidade e volta ao longo da carreira para cobrar resultados.",
    voz: { direcao: "Firme e humana. Voz grave e quente, ritmo calmo, humor seco. Quando cobra, baixa o tom em vez de gritar.", rate: 0.92, pitch: 0.9, envVar: "TTS_VOICE_CELIA", genero: "f" },
    look: { pele: "#7b4e37", peleSombra: "#58361f", cabelo: "#b9b6b0", cabeloEstilo: "cacheado", oculos: "redondo", roupa: "#e2701c", roupa2: "#fff3e6", roupaTipo: "blusa", idade: 67, olhos: "#2a1a10", rosto: 1.02 },
  },
  guardiao: {
    id: "guardiao", nome: "Guardião do Cofre", papel: "Tesoureiro-chefe, dono das chaves", cor: "#4b6d5c", naUpa: true,
    interesse: "Irônico, exigente e desconfiado. Só libera dinheiro para quem sabe explicar.",
    voz: { direcao: "Irônico e desconfiado. Voz seca e nasalada, pausas teatrais, eleva a sobrancelha em cada 'interessante'. Nunca grita.", rate: 0.94, pitch: 0.82, envVar: "TTS_VOICE_GUARDIAO", genero: "m" },
    look: { pele: "#e0b48f", peleSombra: "#bf8d66", cabelo: "#a7a39b", cabeloEstilo: "ralo", barba: "bigode", oculos: "meia-lua", roupa: "#4b6d5c", roupa2: "#d9e4dd", roupaTipo: "colete", idade: 58, olhos: "#4a3a2c", rosto: 1.04 },
  },
  toninho: {
    id: "toninho", nome: "Toninho do Gabinete", papel: "Assessor que conhece todo mundo", cor: "#f2b705", naUpa: true,
    interesse: "Oferece atalhos. Alguns têm compromissos embutidos.",
    voz: { direcao: "Informal e ágil. Fala rápido, cheio de 'meu chefe' e 'deixa comigo', ri antes de terminar a frase.", rate: 1.14, pitch: 1.0, envVar: "TTS_VOICE_TONINHO", genero: "m" },
    look: { pele: "#c68d64", peleSombra: "#a06b46", cabelo: "#241a14", cabeloEstilo: "curto", roupa: "#f2b705", roupa2: "#fff7d6", roupaTipo: "camisa", idade: 45, olhos: "#2b1b12", rosto: 0.98 },
  },
  juninho: {
    id: "juninho", nome: "Primo Juninho", papel: "Primo empreendedor (de ideias grandes)", cor: "#d9363e", naUpa: true,
    interesse: "Apresenta projetos e oportunidades extravagantes. Ser parente não é prova de nada — mas pede atenção.",
    voz: { direcao: "Empolgado e vendedor. Voz aguda, entusiasmo exagerado, palavras em inglês no meio da frase.", rate: 1.1, pitch: 1.18, envVar: "TTS_VOICE_JUNINHO", genero: "m" },
    look: { pele: "#ecc8a8", peleSombra: "#c99f7c", cabelo: "#d9a441", cabeloEstilo: "topete", roupa: "#d9363e", roupa2: "#ffe6e3", roupaTipo: "bomber", idade: 30, olhos: "#4d6b82", rosto: 0.96 },
  },
  roberto: {
    id: "roberto", nome: "Roberto dos Contratos", papel: "Fiscal de contratos e entregas", cor: "#2f6fb5", naUpa: true,
    interesse: "Ajuda a verificar necessidade, entrega e documentação. Metódico até demais.",
    voz: { direcao: "Metódico e paciente. Voz média, cadência de quem lê uma lista, adora dizer 'vamos conferir'.", rate: 0.98, pitch: 0.92, envVar: "TTS_VOICE_ROBERTO", genero: "m" },
    look: { pele: "#8d5b3d", peleSombra: "#68402a", cabelo: "#8e8a85", cabeloEstilo: "curto", roupa: "#2f6fb5", roupa2: "#e3eefa", roupaTipo: "camisa", idade: 52, olhos: "#2a1a10", rosto: 1.02 },
  },
  ana: {
    id: "ana", nome: "Ana da Controladoria", papel: "Auditora de controle interno", cor: "#6b5bb5", naUpa: true,
    interesse: "Confere registros. Precisa e serena: não acusa, compara documento com documento.",
    voz: { direcao: "Precisa e serena. Voz clara e baixa, sem pressa, nunca levanta o tom; cada frase termina como um ponto final.", rate: 0.96, pitch: 1.0, envVar: "TTS_VOICE_ANA", genero: "f" },
    look: { pele: "#e7c29f", peleSombra: "#c49873", cabelo: "#16120f", cabeloEstilo: "bob", roupa: "#6b5bb5", roupa2: "#ece9fa", roupaTipo: "blazer", idade: 41, olhos: "#2a1c14", rosto: 0.99 },
  },
  bento: {
    id: "bento", nome: "Professor Bento", papel: "Mentor de gestão pública", cor: "#8a5a2b", naUpa: true,
    interesse: "Explicações curtas e desafios para aplicar o que você aprendeu.",
    voz: { direcao: "Didático e caloroso. Voz rouca de professor, exemplos do dia a dia, sempre fecha com uma pergunta.", rate: 0.9, pitch: 0.85, envVar: "TTS_VOICE_BENTO", genero: "m" },
    look: { pele: "#efd0b3", peleSombra: "#caa183", cabelo: "#f0efec", cabeloEstilo: "branco", barba: "barba", oculos: "redondo", roupa: "#8a5a2b", roupa2: "#f4e6d3", roupaTipo: "suéter", idade: 62, olhos: "#4d4030", rosto: 1.03 },
  },
  cornelio: {
    id: "cornelio", nome: "Deputado Cornélio", papel: "Parlamentar da região", cor: "#1d2f5a", naUpa: true,
    interesse: "Negocia apoio político e cobra coerência entre acordos e entregas.",
    voz: { direcao: "Palanque e sorriso. Voz de rádio AM, vogais abertas, chama todo mundo de 'meu povo'. Muda de assunto com elegância.", rate: 1.0, pitch: 0.88, envVar: "TTS_VOICE_CORNELIO", genero: "m" },
    look: { pele: "#d9a981", peleSombra: "#b3835d", cabelo: "#2a2321", cabeloEstilo: "penteado", barba: "bigode", roupa: "#1d2f5a", roupa2: "#e8ecf6", roupaTipo: "terno", idade: 55, olhos: "#33241a", rosto: 1.03 },
  },
  marlene: {
    id: "marlene", nome: "Marlene das Relações Institucionais", papel: "Articuladora de apoio institucional", cor: "#b4457e", naUpa: true,
    interesse: "Reúne apoio, negocia prioridades e interpreta conflitos entre a Secretaria, a Prefeitura e a Câmara.",
    voz: { direcao: "Diplomática e calorosa, fala devagar e escolhe bem as palavras.", rate: 0.97, pitch: 1.05, envVar: "TTS_VOICE_MARLENE", genero: "f" },
    look: { pele: "#d2a07a", peleSombra: "#aa7a58", cabelo: "#3b2a22", cabeloEstilo: "liso", roupa: "#b4457e", roupa2: "#fbe6f0", roupaTipo: "blazer", idade: 48, olhos: "#2c1c12", rosto: 1 },
  },
  valdemar: {
    id: "valdemar", nome: "Doutor Valdemar", papel: "Consultor de termos difíceis", cor: "#556b2f", naUpa: true,
    interesse: "Explica situações complicadas — às vezes com palavras difíceis para justificar uma proposta ruim.",
    voz: { direcao: "Pomposo, cheio de latim, pausa longa antes do termo difícil.", rate: 0.9, pitch: 0.95, envVar: "TTS_VOICE_VALDEMAR", genero: "m" },
    look: { pele: "#e8c7a6", peleSombra: "#c49d7c", cabelo: "#bdbab4", cabeloEstilo: "careca", barba: "cavanhaque", oculos: "quadrado", roupa: "#556b2f", roupa2: "#eef2e4", roupaTipo: "terno", idade: 60, olhos: "#4a3a2c", rosto: 1.01 },
  },
  lucia: {
    id: "lucia", nome: "Prefeita Lúcia Andrade", papel: "Prefeita do município", cor: "#0f7d8c", naUpa: true,
    interesse: "Quer resultado visível antes da próxima eleição — e quer que ninguém a surpreenda com notícia ruim.",
    voz: { direcao: "Firme e calorosa, fala como quem preside reunião. Pausa curta antes de cada prazo. Sorri com a voz, mas não perde o fio.", rate: 1.0, pitch: 1.04, envVar: "TTS_VOICE_LUCIA", genero: "f" },
    look: { pele: "#c98f6b", peleSombra: "#a26a48", cabelo: "#2b1d16", cabeloEstilo: "bob", roupa: "#0f7d8c", roupa2: "#e0f4f6", roupaTipo: "blazer", idade: 52, olhos: "#2d1c12", rosto: 1 },
  },
  nelson: {
    id: "nelson", nome: "Vereador Nelson Tavares", papel: "Presidente da Comissão de Saúde da Câmara", cor: "#c4622d", naUpa: true,
    interesse: "Apresenta pedidos da sua base como se fossem urgências da cidade. Gosta de inaugurações e de ligações de agradecimento.",
    voz: { direcao: "Simpático e insistente. Fala rápido, chama todo mundo pelo primeiro nome e termina frases com 'né?'.", rate: 1.08, pitch: 0.95, envVar: "TTS_VOICE_NELSON", genero: "m" },
    look: { pele: "#e1b48c", peleSombra: "#bb8c64", cabelo: "#3a2a20", cabeloEstilo: "topete", roupa: "#c4622d", roupa2: "#fbe9d6", roupaTipo: "camisa", idade: 49, olhos: "#3a2a1c", rosto: 1.02 },
  },
  rita: {
    id: "rita", nome: "Rita Campos", papel: "Coordenadora da Central de Regulação", cor: "#6b5bb5", naUpa: true,
    interesse: "Acredita que fila organizada é fila honesta. Quer dados, protocolos e prazo — e detesta pedido de 'furar a fila'.",
    voz: { direcao: "Técnica e direta, com humor seco. Ritmo constante, números sempre no fim da frase.", rate: 1.0, pitch: 1.0, envVar: "TTS_VOICE_RITA", genero: "f" },
    look: { pele: "#a8714f", peleSombra: "#845234", cabelo: "#1a120e", cabeloEstilo: "cacheado", oculos: "quadrado", roupa: "#6b5bb5", roupa2: "#ece8fa", roupaTipo: "blusa", idade: 41, olhos: "#2a1a10", rosto: 0.99 },
  },
  edu: {
    id: "edu", nome: "Edu Matos", papel: "Gerente da UBS Esperança (enfermeiro)", cor: "#2e8a7a", naUpa: true,
    interesse: "Conhece cada rua do território. Quer saber se a Secretaria vai ouvir quem está na ponta antes de decidir.",
    voz: { direcao: "Acolhedor e cansado, voz grave e baixa. Conta casos reais com nomes trocados e termina com um 'a gente dá um jeito'.", rate: 0.97, pitch: 0.9, envVar: "TTS_VOICE_EDU", genero: "m" },
    look: { pele: "#b98562", peleSombra: "#946042", cabelo: "#1d1510", cabeloEstilo: "curto", barba: "barba", roupa: "#2e8a7a", roupa2: "#e6f7f4", roupaTipo: "jaleco", idade: 33, olhos: "#2b1b12", rosto: 1 },
  },
  voce: {
    id: "voce", nome: "Você", papel: "Administrador(a) / Secretário(a)", cor: "#1a46d4", naUpa: true,
    interesse: "Quem decide com a caneta.",
    voz: { direcao: "Sem voz: o jogador é o personagem. Falas aparecem só em legenda.", rate: 1, pitch: 1, envVar: "TTS_VOICE_VOCE", genero: "f" },
    look: { pele: "#c68d64", peleSombra: "#a06b46", cabelo: "#241a14", cabeloEstilo: "curto", roupa: "#1a46d4", roupa2: "#e9efff", roupaTipo: "camisa", idade: 34, olhos: "#2b1b12", rosto: 1 },
  },

  /* ───── níveis 3 a 7 ───── */
  heitor: {
    id: "heitor", nome: "Dr. Heitor Brandão", papel: "Diretor do Hospital Regional", cor: "#2a6fb0", naUpa: true,
    interesse: "Quer o hospital cheio de recursos e vazio de pacientes que poderiam ser atendidos na atenção básica.",
    voz: { direcao: "Grave e cansado, médico de plantão há trinta anos. Frases longas que terminam em pedido de verba.", rate: 0.96, pitch: 0.88, envVar: "TTS_VOICE_HEITOR", genero: "m" },
    look: { pele: "#d9ab87", peleSombra: "#b08560", cabelo: "#cfcfcf", cabeloEstilo: "branco", oculos: "meia-lua", roupa: "#2a6fb0", roupa2: "#e8f1fb", roupaTipo: "jaleco", idade: 61, olhos: "#3a2a1c", rosto: 1.02 },
  },
  osvaldo: {
    id: "osvaldo", nome: "Prefeito Osvaldo Reis", papel: "Prefeito do município vizinho", cor: "#a35a2a", naUpa: true,
    interesse: "Quer que o hospital fique na sua cidade e que o rateio caia na conta dos outros.",
    voz: { direcao: "Caloroso e teimoso, voz de comício. Ri alto antes de negar.", rate: 1.04, pitch: 0.92, envVar: "TTS_VOICE_OSVALDO", genero: "m" },
    look: { pele: "#a9724f", peleSombra: "#85553a", cabelo: "#2b1d16", cabeloEstilo: "topete", barba: "bigode", roupa: "#a35a2a", roupa2: "#fff3dc", roupaTipo: "camisa", idade: 55, olhos: "#2d1c12", rosto: 1 },
  },
  sonia: {
    id: "sonia", nome: "Sônia Pacheco", papel: "Secretária-executiva do Consórcio", cor: "#7a4fa8", naUpa: true,
    interesse: "Quer cada pacto assinado, cada rateio pago e cada ata no lugar.",
    voz: { direcao: "Precisa e paciente. Lê os números em voz alta, sem pressa, e repete o prazo.", rate: 1.0, pitch: 1.1, envVar: "TTS_VOICE_SONIA", genero: "f" },
    look: { pele: "#e0b48f", peleSombra: "#b98a66", cabelo: "#4a2a1a", cabeloEstilo: "liso", oculos: "quadrado", roupa: "#7a4fa8", roupa2: "#efe6f7", roupaTipo: "blazer", idade: 44, olhos: "#3a2418", rosto: 0.98 },
  },
  teodoro: {
    id: "teodoro", nome: "Governador Teodoro Lima", papel: "Governador do estado", cor: "#1d5fa8", naUpa: true,
    interesse: "Quer obras que apareçam na foto e números que apareçam no jornal — nessa ordem.",
    voz: { direcao: "Solene e articulado, voz de palanque. Faz pausa dramática antes de cada promessa.", rate: 0.98, pitch: 0.9, envVar: "TTS_VOICE_TEODORO", genero: "m" },
    look: { pele: "#c68d64", peleSombra: "#a06a46", cabelo: "#3a3a3a", cabeloEstilo: "curto", roupa: "#1d5fa8", roupa2: "#e6eefb", roupaTipo: "terno", idade: 58, olhos: "#2d1c12", rosto: 1.02 },
  },
  leandro: {
    id: "leandro", nome: "Leandro Matos", papel: "Engenheiro fiscal de obras", cor: "#d9822b", naUpa: true,
    interesse: "Quer medir o que foi construído antes de pagar o que foi cobrado.",
    voz: { direcao: "Direto e prático, voz de canteiro. Usa números e metros, não adjetivos.", rate: 1.02, pitch: 0.94, envVar: "TTS_VOICE_LEANDRO", genero: "m" },
    look: { pele: "#8d5b3d", peleSombra: "#6b4229", cabelo: "#1f1612", cabeloEstilo: "curto", roupa: "#d9822b", roupa2: "#fff0d8", roupaTipo: "colete", idade: 40, olhos: "#2a1a10", rosto: 1 },
  },
  iara: {
    id: "iara", nome: "Conselheira Iara Nogueira", papel: "Conselheira do Tribunal de Contas", cor: "#5b3a7a", naUpa: true,
    interesse: "Quer saber quem decidiu, com base em quê e quanto custou. Nessa ordem, por escrito.",
    voz: { direcao: "Serena e implacável. Voz baixa, ritmo pausado, cada pergunta soa como sentença.", rate: 0.92, pitch: 1.02, envVar: "TTS_VOICE_IARA", genero: "f" },
    look: { pele: "#b9835c", peleSombra: "#8f5d3d", cabelo: "#cfcfcf", cabeloEstilo: "bob", oculos: "redondo", roupa: "#5b3a7a", roupa2: "#ece4f5", roupaTipo: "blazer", idade: 57, olhos: "#2d1c12", rosto: 1 },
  },
  cecilia: {
    id: "cecilia", nome: "Cecília Moura", papel: "Coordenadora de programas federais", cor: "#0f8c6a", naUpa: true,
    interesse: "Quer metas que dá para medir e repasses que chegam a tempo.",
    voz: { direcao: "Organizada e animada, fala em listas. Diz 'primeiro, segundo, terceiro' sem perceber.", rate: 1.06, pitch: 1.08, envVar: "TTS_VOICE_CECILIA", genero: "f" },
    look: { pele: "#c98f6b", peleSombra: "#a26a48", cabelo: "#2b1d16", cabeloEstilo: "cacheado", roupa: "#0f8c6a", roupa2: "#e0f6ee", roupaTipo: "blusa", idade: 41, olhos: "#2d1c12", rosto: 1 },
  },
  ramiro: {
    id: "ramiro", nome: "Senador Ramiro Duarte", papel: "Senador, relator do orçamento da saúde", cor: "#8a2f2f", naUpa: true,
    interesse: "Quer que o programa tenha o nome dele e a obra tenha a cidade dele.",
    voz: { direcao: "Voz de plenário, cheia de 'Vossa Excelência'. Elogia antes de cobrar.", rate: 0.94, pitch: 0.86, envVar: "TTS_VOICE_RAMIRO", genero: "m" },
    look: { pele: "#d9ab87", peleSombra: "#b08560", cabelo: "#9a9a9a", cabeloEstilo: "penteado", roupa: "#8a2f2f", roupa2: "#f6e6e6", roupaTipo: "terno", idade: 63, olhos: "#3a2a1c", rosto: 1.03 },
  },
  pedro: {
    id: "pedro", nome: "Pedro Salgado", papel: "Auditor da Controladoria", cor: "#3a6d9e", naUpa: true,
    interesse: "Quer comparar o que foi prometido, o que foi pago e o que chegou.",
    voz: { direcao: "Seco e educado. Diz 'consta nos autos' e espera a resposta sem piscar.", rate: 1.0, pitch: 0.98, envVar: "TTS_VOICE_PEDRO", genero: "m" },
    look: { pele: "#e0b48f", peleSombra: "#b98a66", cabelo: "#2b1d16", cabeloEstilo: "curto", oculos: "quadrado", roupa: "#3a6d9e", roupa2: "#e6eef7", roupaTipo: "camisa", idade: 36, olhos: "#2d1c12", rosto: 0.98 },
  },
  augusto: {
    id: "augusto", nome: "Presidente Augusto Prado", papel: "Presidente da República (simulado)", cor: "#16784c", naUpa: true,
    interesse: "Quer saber se o ministério entrega, se a coalizão aguenta e se a conta fecha.",
    voz: { direcao: "Calmo e estratégico. Fala como quem já ouviu todas as desculpas e ainda escuta a próxima.", rate: 0.95, pitch: 0.9, envVar: "TTS_VOICE_AUGUSTO", genero: "m" },
    look: { pele: "#b9835c", peleSombra: "#8f5d3d", cabelo: "#cfcfcf", cabeloEstilo: "curto", roupa: "#16784c", roupa2: "#e4f4ec", roupaTipo: "terno", idade: 62, olhos: "#2d1c12", rosto: 1.02 },
  },
  helena: {
    id: "helena", nome: "Ministra Helena Costa", papel: "Ministra da Fazenda (simulada)", cor: "#8a6a1c", naUpa: true,
    interesse: "Quer a conta fechando e a palavra 'prioridade' sempre acompanhada de uma fonte de recursos.",
    voz: { direcao: "Seca e rápida. Corta frases pela metade quando o número já é conhecido.", rate: 1.1, pitch: 1.04, envVar: "TTS_VOICE_HELENA", genero: "f" },
    look: { pele: "#e0b48f", peleSombra: "#b98a66", cabelo: "#3a2418", cabeloEstilo: "bob", oculos: "meia-lua", roupa: "#8a6a1c", roupa2: "#f6efd8", roupaTipo: "blazer", idade: 49, olhos: "#3a2418", rosto: 1 },
  },
  goncalo: {
    id: "goncalo", nome: "Deputado Gonçalo Bastos", papel: "Líder do governo na Câmara", cor: "#c4622d", naUpa: true,
    interesse: "Quer votos para o governo e emendas para a base — em pacotes que não se separam.",
    voz: { direcao: "Fala macia e rápida, vende acordo como quem vende seguro. Termina frases com 'tamo junto'.", rate: 1.1, pitch: 0.96, envVar: "TTS_VOICE_GONCALO", genero: "m" },
    look: { pele: "#a9724f", peleSombra: "#85553a", cabelo: "#2b1d16", cabeloEstilo: "topete", roupa: "#c4622d", roupa2: "#fbe9dc", roupaTipo: "camisa", idade: 47, olhos: "#2d1c12", rosto: 1 },
  },
  vivian: {
    id: "vivian", nome: "Vivian Prates", papel: "Coordenadora de campanha", cor: "#d94a8c", naUpa: true,
    interesse: "Quer transformar a sua gestão em três frases, uma cor e um jingle.",
    voz: { direcao: "Elétrica e persuasiva. Fala em slogans, interrompe-se para testar uma versão melhor.", rate: 1.12, pitch: 1.1, envVar: "TTS_VOICE_VIVIAN", genero: "f" },
    look: { pele: "#d9ab87", peleSombra: "#b08560", cabelo: "#d94a8c", cabeloEstilo: "liso", roupa: "#d94a8c", roupa2: "#fde6f0", roupaTipo: "bomber", idade: 34, olhos: "#2a1a10", rosto: 0.98 },
  },
  claudio: {
    id: "claudio", nome: "Cláudio Veiga", papel: "Jornalista, mediador do debate", cor: "#444b5a", naUpa: true,
    interesse: "Quer a pergunta que ninguém quer responder — e o tempo certo para cada resposta.",
    voz: { direcao: "Neutro e firme, dicção de telejornal. Corta com educação quando o tempo acaba.", rate: 1.0, pitch: 0.95, envVar: "TTS_VOICE_CLAUDIO", genero: "m" },
    look: { pele: "#c68d64", peleSombra: "#a06a46", cabelo: "#2b1d16", cabeloEstilo: "curto", roupa: "#444b5a", roupa2: "#e8eaef", roupaTipo: "terno", idade: 50, olhos: "#2d1c12", rosto: 1 },
  },
  estevao: {
    id: "estevao", nome: "Barão Estevão", papel: "Empresário e “grande amigo da democracia”", cor: "#b8860b", naUpa: true,
    interesse: "Oferece apoio generoso — com recibo apenas de um lado.",
    voz: { direcao: "Untuoso e sorridente. Ri de tudo, inclusive do que não tem graça. Fala baixo ao dizer valores.", rate: 0.95, pitch: 0.9, envVar: "TTS_VOICE_ESTEVAO", genero: "m" },
    look: { pele: "#e0b48f", peleSombra: "#b98a66", cabelo: "#b8b8b8", cabeloEstilo: "ralo", barba: "cavanhaque", roupa: "#b8860b", roupa2: "#fdf2c8", roupaTipo: "terno", idade: 66, olhos: "#3a2a1c", rosto: 1.02 },
  },
};

/** Avatares prontos do jogador (mesma capacidade de jogo; só muda a aparência). */
export const AVATARS: Array<{ id: string; nome: string; look: Character["look"] }> = [
  { id: "av1", nome: "Camisa azul", look: { ...CHARACTERS.voce.look, pele: "#c68d64", peleSombra: "#a06b46", cabelo: "#241a14", cabeloEstilo: "curto", roupa: "#1a46d4" } },
  { id: "av2", nome: "Coque e jaleco", look: { ...CHARACTERS.voce.look, pele: "#8d5b3d", peleSombra: "#68402a", cabelo: "#17110d", cabeloEstilo: "coque", roupa: "#2bb3a3", roupaTipo: "jaleco" } },
  { id: "av3", nome: "Cachos", look: { ...CHARACTERS.voce.look, pele: "#6d4330", peleSombra: "#4c2d1f", cabelo: "#16100c", cabeloEstilo: "cacheado", roupa: "#e2701c", roupaTipo: "blusa" } },
  { id: "av4", nome: "Bob e blazer", look: { ...CHARACTERS.voce.look, pele: "#ecc9a8", peleSombra: "#c99f7c", cabelo: "#6b3a1f", cabeloEstilo: "bob", roupa: "#6b5bb5", roupaTipo: "blazer" } },
  { id: "av5", nome: "Barba e colete", look: { ...CHARACTERS.voce.look, pele: "#d8a67f", peleSombra: "#b3835d", cabelo: "#2a1c14", cabeloEstilo: "curto", barba: "barba", roupa: "#4b6d5c", roupaTipo: "colete" } },
  { id: "av6", nome: "Cabelo liso", look: { ...CHARACTERS.voce.look, pele: "#f0cfb1", peleSombra: "#cfa584", cabelo: "#0e0b09", cabeloEstilo: "liso", roupa: "#d9363e", roupaTipo: "blusa" } },
];

export const avatarLook = (id: string) => (AVATARS.find((a) => a.id === id) ?? AVATARS[0]!).look;
export const charName = (id: CharId) => CHARACTERS[id].nome;
