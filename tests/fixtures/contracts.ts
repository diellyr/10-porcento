/** FIXTURES SINTÉTICAS — formato inspirado na API do Portal da Transparência; nomes/valores inventados. */
export const CNPJ_A = "11222333000181";
export const CNPJ_B = "00000000000191";

export const contractRows = [
  { id: 101, numero: "01/2024", objeto: "Serviços de TI (sintético)", dataInicioVigencia: "15/03/2024", dataFimVigencia: "14/03/2025", valorInicialCompra: "100.000,00", valorFinalCompra: "150.000,00",
    fornecedor: { cnpjFormatado: "11.222.333/0001-81", razaoSocialReceita: "EMPRESA ALFA LTDA" }, unidadeGestora: { orgaoVinculado: { codigoSIAFI: "36000", nome: "Ministério da Saúde" } }, modalidadeCompra: { descricao: "Pregão" } },
  { id: 102, numero: "02/2023", objeto: "Limpeza (sintético)", dataInicioVigencia: "2023-01-10T00:00:00", dataFimVigencia: "2023-12-31", valorInicialCompra: 80000,
    fornecedor: { cnpjFormatado: "11.222.333/0001-81", nome: "ALFA" }, unidadeGestora: { orgaoVinculado: { codigoSIAFI: "26000", nome: "Ministério da Educação" } } },
  // pessoa física: deve ser descartada por inteiro (LGPD)
  { id: 103, numero: "03/2024", objeto: "Consultoria", dataInicioVigencia: "01/02/2024", valorInicialCompra: 5000,
    fornecedor: { cpfFormatado: "123.456.789-09", cnpjFormatado: "123.456.789-09", nome: "FULANO DE TAL" }, unidadeGestora: { orgaoVinculado: { codigoSIAFI: "36000", nome: "Ministério da Saúde" } } },
  // CNPJ inválido, sem valor, sem data, duplicado
  { id: 104, numero: "04/2024", dataInicioVigencia: "01/02/2024", valorInicialCompra: 1, fornecedor: { cnpjFormatado: "11.222.333/0001-82", nome: "INVALIDA" } },
  { id: 105, numero: "05/2024", dataInicioVigencia: "01/02/2024", fornecedor: { cnpjFormatado: "11.222.333/0001-81", nome: "SEM VALOR" } },
  { id: 106, numero: "06/2024", valorInicialCompra: 10, fornecedor: { cnpjFormatado: "11.222.333/0001-81", nome: "SEM DATA" } },
  { id: 101, numero: "01/2024", dataInicioVigencia: "15/03/2024", valorInicialCompra: 999, fornecedor: { cnpjFormatado: "11.222.333/0001-81", nome: "DUPLICADO" } },
];
