/** Explicações curtas e em linguagem simples para cada item do "De cada R$ 100" (botão "O que é isso?"). */
export interface Explanation { title: string; text: string }

const FUNCTION: Record<string, string> = {
  "01": "Gastos do Poder Legislativo: Câmara, Senado, assembleias e câmaras de vereadores, incluindo salários e funcionamento.",
  "02": "Gastos com os tribunais e a Justiça: salários de juízes e servidores e o funcionamento dos fóruns e tribunais.",
  "03": "Gastos com Ministério Público, Defensoria Pública e Advocacia Pública, que defendem a lei e quem não pode pagar advogado.",
  "04": "O custo de manter a máquina pública funcionando: planejamento, finanças, tecnologia, compras e atendimento interno.",
  "05": "Gastos com as Forças Armadas (Exército, Marinha e Aeronáutica): pessoal, equipamentos e manutenção.",
  "06": "Gastos com polícias, bombeiros, presídios e ações de segurança pública.",
  "07": "Gastos com embaixadas, consulados e a participação do país em organismos internacionais.",
  "08": "Programas para quem precisa de proteção: Bolsa Família, BPC para idosos e pessoas com deficiência e serviços dos CRAS.",
  "09": "Pagamento de aposentadorias e pensões do INSS e dos servidores públicos.",
  "10": "Hospitais, postos de saúde, vacinas, remédios e o SUS em geral.",
  "11": "Programas de emprego, seguro-desemprego, abono salarial e qualificação profissional.",
  "12": "Escolas, universidades, merenda, material escolar e salários de professores.",
  "13": "Museus, bibliotecas, patrimônio histórico e incentivo a atividades culturais.",
  "14": "Defesa de direitos: proteção a crianças, mulheres, povos indígenas e outros grupos, e acesso à Justiça.",
  "15": "Obras e serviços da cidade: ruas, iluminação, praças e transporte urbano.",
  "16": "Moradia popular, financiamento da casa própria e urbanização de áreas carentes.",
  "17": "Água tratada, esgoto e coleta de lixo.",
  "18": "Proteção da natureza: fiscalização ambiental, florestas, parques e recursos hídricos.",
  "19": "Pesquisa científica, universidades de pesquisa e desenvolvimento de novas tecnologias.",
  "20": "Apoio ao campo: crédito rural, defesa agropecuária, pesquisa agrícola e extensão rural.",
  "21": "Reforma agrária: assentamentos e regularização de terras.",
  "22": "Apoio à indústria: incentivos, normas técnicas e propriedade industrial.",
  "23": "Apoio ao comércio, serviços e turismo.",
  "24": "Correios, telecomunicações e internet.",
  "25": "Produção e distribuição de energia, combustíveis e eletrificação rural.",
  "26": "Estradas, ferrovias, portos, aeroportos e transporte público.",
  "27": "Esportes, estádios, programas esportivos e de lazer.",
  "28": "Gastos que não são de uma área específica, principalmente o pagamento de juros e amortização da dívida pública e as transferências obrigatórias para estados e municípios.",
};
const NATURE: Record<string, string> = {
  "3.1": "Salários, aposentadorias de servidores e encargos de quem trabalha para o governo.",
  "3.2": "O que o governo paga de “aluguel” pelo dinheiro que pegou emprestado (juros da dívida pública).",
  "3.3": "Despesas do dia a dia: contas de luz e água, material, serviços contratados, benefícios sociais e outros custos de funcionamento.",
  "4.4": "Obras, compra de equipamentos e outros gastos que criam ou melhoram bens públicos, como hospitais, escolas e estradas.",
  "4.5": "Compra de imóveis, participação em empresas e concessão de empréstimos: o governo troca dinheiro por um bem ou direito.",
  "4.6": "Pagamento do valor principal da dívida, que reduz o que o governo deve (sem contar os juros).",
};
const ORIGIN: Record<string, string> = {
  "1.1": "Dinheiro que vem de impostos (como Imposto de Renda, IPI e IOF), taxas por serviços e contribuições de melhoria pagas por quem se beneficia de obras.",
  "1.2": "Arrecadação com destino específico, como a contribuição previdenciária (INSS), Cofins, PIS e CSLL, usada para financiar a Previdência, a saúde e a assistência social.",
  "1.3": "Rendimentos do patrimônio do governo: aluguéis, dividendos de empresas estatais, juros de aplicações e royalties.",
  "1.4": "Receita da produção agrícola e pecuária de órgãos públicos, como a venda de produtos de fazendas de pesquisa.",
  "1.5": "Receita da produção industrial de órgãos públicos.",
  "1.6": "Dinheiro recebido pela venda de serviços do governo, como taxas de transporte, armazenagem e outros serviços prestados.",
  "1.7": "Dinheiro que um governo recebe de outro para gastar no dia a dia, por exemplo a União repassando para estados e municípios.",
  "1.9": "Receitas correntes que não se encaixam nas outras categorias, como multas, indenizações e devoluções.",
  "2.1": "Dinheiro que o governo toma emprestado (principalmente ao emitir títulos da dívida). Não é arrecadação de impostos: é dívida que precisará ser paga depois, com juros.",
  "2.2": "Dinheiro obtido com a venda de bens públicos, como imóveis, veículos e participações em empresas.",
  "2.3": "Retorno de empréstimos que o governo havia concedido, por exemplo parcelas pagas por estados ou bancos públicos.",
  "2.4": "Dinheiro recebido de outro governo ou instituição para investimentos, como obras e equipamentos.",
  "2.5": "Outras receitas de capital que não se encaixam nas demais categorias.",
  "2.9": "Outras receitas de capital: entradas pontuais de dinheiro que não vêm de impostos nem de empréstimos, como a venda de ativos e devoluções de recursos.",
};
const TAX: Array<[RegExp, string]> = [
  [/IMPOSTO.*RENDA|\bIR\b|IRPF|IRPJ|IRRF/, "Imposto de Renda: cobrado sobre o que pessoas e empresas ganham, inclusive o retido no salário."],
  [/COFINS/, "Cofins: contribuição paga pelas empresas sobre o faturamento, que ajuda a financiar a Seguridade Social."],
  [/\bPIS|PASEP/, "PIS/Pasep: contribuição das empresas que financia o seguro-desemprego e o abono salarial."],
  [/CSLL|LUCRO/, "CSLL: contribuição das empresas sobre o lucro, destinada à Seguridade Social."],
  [/\bIPI\b|PRODUTOS INDUSTRIALIZADOS/, "IPI: imposto cobrado sobre produtos industrializados, pago pelas fábricas."],
  [/\bIOF\b|OPERACOES FINANCEIRAS/, "IOF: imposto sobre operações financeiras, como empréstimos, câmbio e seguros."],
  [/IMPORTA/, "Imposto de Importação: cobrado sobre produtos que entram no país vindos de fora."],
  [/PREVIDENC|INSS/, "Contribuições para a Previdência Social, que pagam aposentadorias e pensões."],
];
const OTHER = "Junta todos os itens menores que não cabem na lista, para o gráfico ficar fácil de ler. Somando tudo, os valores fecham em R$ 100.";

function norm(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); }

export function explainItem(lens: string, item: { code: string; label: string }): Explanation {
  const title = item.label;
  if (item.code === "OTHER") return { title, text: OTHER };
  const byLens = lens === "function" ? FUNCTION[item.code] : lens === "nature" ? NATURE[item.code] : lens === "origin" ? ORIGIN[item.code] : undefined;
  if (byLens) return { title, text: byLens };
  if (lens === "tax") {
    const hay = norm(`${item.code} ${item.label}`);
    const hit = TAX.find(([re]) => re.test(hay));
    if (hit) return { title, text: hit[1] };
  }
  const generic = lens === "function" ? "Área de governo em que o dinheiro foi aplicado."
    : lens === "nature" ? "Tipo de gasto: com o que o dinheiro foi usado."
    : lens === "origin" ? "Tipo de receita: de onde o dinheiro veio."
    : "Tributo federal arrecadado pela Receita Federal.";
  return { title, text: `${generic} O valor é o total registrado pelo governo no ano, conforme a fonte oficial indicada abaixo do gráfico.` };
}
