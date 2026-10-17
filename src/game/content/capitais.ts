/** As 27 capitais (código IBGE de 7 dígitos), usadas para pré-carregar os dados oficiais do cenário. */
export const CAPITAIS: ReadonlyArray<{ uf: string; nome: string; code: string }> = [
  ["AC", "Rio Branco", "1200401"], ["AL", "Maceió", "2704302"], ["AP", "Macapá", "1600303"], ["AM", "Manaus", "1302603"], ["BA", "Salvador", "2927408"],
  ["CE", "Fortaleza", "2304400"], ["DF", "Brasília", "5300108"], ["ES", "Vitória", "3205309"], ["GO", "Goiânia", "5208707"], ["MA", "São Luís", "2111300"],
  ["MT", "Cuiabá", "5103403"], ["MS", "Campo Grande", "5002704"], ["MG", "Belo Horizonte", "3106200"], ["PA", "Belém", "1501402"], ["PB", "João Pessoa", "2507507"],
  ["PR", "Curitiba", "4106902"], ["PE", "Recife", "2611606"], ["PI", "Teresina", "2211001"], ["RJ", "Rio de Janeiro", "3304557"], ["RN", "Natal", "2408102"],
  ["RS", "Porto Alegre", "4314902"], ["RO", "Porto Velho", "1100205"], ["RR", "Boa Vista", "1400100"], ["SC", "Florianópolis", "4205407"], ["SP", "São Paulo", "3550308"],
  ["SE", "Aracaju", "2800308"], ["TO", "Palmas", "1721000"],
].map(([uf, nome, code]) => ({ uf: uf!, nome: nome!, code: code! }));
