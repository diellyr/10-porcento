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
