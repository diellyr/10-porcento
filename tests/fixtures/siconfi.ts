/** FIXTURES SINTÉTICAS — formato inspirado na documentação do SICONFI; valores inventados, usados só em testes. */
export const dcaReceitasRows = [
  { exercicio: 2023, cod_ibge: 3541406, anexo: "DCA-Anexo I-C", rotulo: "Receitas Orçamentárias", coluna: "Receitas Brutas Realizadas", cod_conta: "1.0.0.0.00.0.0", conta: "Receitas Correntes", valor: 1000 },
  { exercicio: 2023, cod_ibge: 3541406, anexo: "DCA-Anexo I-C", rotulo: "Receitas Orçamentárias", coluna: "Receitas Brutas Realizadas", cod_conta: "1.1.0.0.00.0.0", conta: "Receita Tributária", valor: 400 },
  { exercicio: 2023, cod_ibge: 3541406, anexo: "DCA-Anexo I-C", rotulo: "Receitas Orçamentárias", coluna: "Receitas Brutas Realizadas", cod_conta: "1.1.1.2.00.0.0", conta: "Detalhe profundo (nível 4)", valor: 99 },
  { exercicio: 2023, cod_ibge: 3541406, anexo: "DCA-Anexo I-C", rotulo: "Receitas Orçamentárias", coluna: "Previsão Inicial da Receita Orçada", cod_conta: "1.0.0.0.00.0.0", conta: "Receitas Correntes", valor: 900 },
  { exercicio: 2023, cod_ibge: 3541406, anexo: "DCA-Anexo I-C", rotulo: "Deduções", coluna: "Receitas Brutas Realizadas", cod_conta: "9.0.0.0.00.0.0", conta: "Deduções", valor: -50 },
  { exercicio: 2023, cod_ibge: 3541406, anexo: "DCA-Anexo I-C", rotulo: "Receitas Orçamentárias", coluna: "Coluna Desconhecida", cod_conta: "1.0.0.0.00.0.0", conta: "Receitas Correntes", valor: 7 },
  { exercicio: 2023, cod_ibge: 3541406, anexo: "DCA-Anexo I-C", rotulo: "Receitas Orçamentárias", coluna: "Receitas Brutas Realizadas", cod_conta: "2.0.0.0.00.0.0", conta: "Receitas de Capital", valor: "não-numérico" },
];

export const dcaDespesasRows = [
  { exercicio: 2023, anexo: "DCA-Anexo I-E", rotulo: "Despesas (Exceto Intraorçamentárias)", coluna: "Despesas Empenhadas", cod_conta: "FU10", conta: "10 - Saúde", valor: 500 },
  { exercicio: 2023, anexo: "DCA-Anexo I-E", rotulo: "Despesas (Exceto Intraorçamentárias)", coluna: "Despesas Liquidadas", cod_conta: "FU10", conta: "10 - Saúde", valor: 450 },
  { exercicio: 2023, anexo: "DCA-Anexo I-E", rotulo: "Despesas (Exceto Intraorçamentárias)", coluna: "Despesas Pagas", cod_conta: "FU10", conta: "10 - Saúde", valor: 400 },
  { exercicio: 2023, anexo: "DCA-Anexo I-E", rotulo: "Despesas (Exceto Intraorçamentárias)", coluna: "Despesas Liquidadas", cod_conta: "10.301", conta: "10.301 - Atenção Básica", valor: 200 },
  { exercicio: 2023, anexo: "DCA-Anexo I-E", rotulo: "Despesas (Exceto Intraorçamentárias)", coluna: "Despesas Liquidadas", cod_conta: "FU12", conta: "12 - Educação", valor: 300 },
  { exercicio: 2023, anexo: "DCA-Anexo I-E", rotulo: "Despesas Intraorçamentárias", coluna: "Despesas Liquidadas", cod_conta: "FU10", conta: "10 - Saúde", valor: 5 },
  { exercicio: 2023, anexo: "DCA-Anexo I-E", rotulo: "Total", coluna: "Despesas Liquidadas", cod_conta: "TOTAL", conta: "Total das Despesas", valor: 750 },
  { exercicio: 2023, anexo: "DCA-Anexo I-E", rotulo: "Despesas (Exceto Intraorçamentárias)", coluna: "Inscrição de Restos a Pagar Não Processados", cod_conta: "FU10", conta: "10 - Saúde", valor: 1 },
];

export const entesRows = [
  { cod_ibge: 1, ente: "União", uf: "BR", esfera: "União", populacao: 203000000 },
  { cod_ibge: 35, ente: "Estado de São Paulo", uf: "SP", esfera: "Estado", populacao: 44000000 },
  { cod_ibge: 3541406, ente: "Município de Praia Grande", uf: "SP", esfera: "Município", populacao: 330000 },
  { cod_ibge: 3548500, ente: "Município de Santos", uf: "SP", esfera: "Município", populacao: 420000 },
];
