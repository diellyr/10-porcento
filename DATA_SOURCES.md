# Fontes de dados

Todas são cadastradas automaticamente em `data_sources` na primeira execução (`ensureSources`, idempotente — não sobrescreve edições do admin) e administráveis em **/admin/fontes**.

> **Status de verificação:** os adaptadores foram escritos a partir da documentação pública e **validados com fixtures sintéticas** (`tests/fixtures`). O ambiente de desenvolvimento não tinha acesso de rede aos domínios `*.gov.br`, então **nenhuma chamada real foi feita**. Antes de publicar, rode o checklist no final deste arquivo. Detalhes de formato que dependem de confirmação estão marcados com ⚠.

## SICONFI — `siconfi`

| | |
|---|---|
| Responsável | Tesouro Nacional (STN) |
| URL | `https://apidatalake.tesouro.gov.br/ords/siconfi/tt` |
| Documentação | https://apidatalake.tesouro.gov.br/docs/siconfi/ |
| Autenticação | nenhuma |
| Limites | sem limite publicado; padrão do app: 60 req/min, TTL 24 h (×7 para anos fechados há > 1 ano) |
| Dados | `entes` (cadastro, população); DCA — Anexo I-C (receitas), I-D (despesas por natureza), I-E (despesas por função/subfunção); RGF — Anexo 02 (dívida consolidada e líquida) |
| Periodicidade | DCA anual (ano fechado, divulgado no ano seguinte); RGF quadrimestral/semestral |
| Paginação | `offset`/`limit` (5.000) até `hasMore=false` (máx. 30 páginas) |
| Implementação | ✅ `entes`, DCA I-C/I-D/I-E, RGF-02 (⚠ códigos de conta/colunas e `co_poder`/`in_periodicidade` do RGF a confirmar com resposta real) · ⏳ RREO, MSC, extrato de entregas |

Regras do parser (tolerante, nunca chuta): coluna ambígua ⇒ ignora; código de conta desconhecido ⇒ ignora e conta em `skipped`; **todas** as linhas recebidas e nenhuma reconhecida ⇒ erro explícito (`BAD_RESPONSE`).

### DCA Anexo I-E (despesa por função) — formato real e como validar

A API devolve, para cada coluna (`Despesas Empenhadas/Liquidadas/Pagas`, mais `Inscrição de Restos a Pagar …`, ignoradas), `cod_conta = "TotalDespesas"` em
todas as linhas e a função/subfunção **no campo `conta`**: `"01 - Legislativa"` → FUNCTION `01`; `"01.031 - Ação Legislativa"` → SUBFUNCTION `01.031`
(se `cod_conta` identificar a função — formato antigo — ele tem prioridade). Regras anti-dupla-contagem do parser (`parseDcaDespesasFuncao`):
* **Totalizadores** (`Despesas Exceto Intraorçamentárias`, `Despesas Intraorçamentárias`, `Total …`) nunca viram fato; os cabeçalhos de bloco só indicam em que bloco estamos.
* **Bloco intraorçamentário** fica de fora (somá-lo ao bloco “exceto intra” duplicaria o consolidado).
* **`Demais Subfunções`** é resíduo sem código próprio, já contido na função: descartado.
* Uma linha por (coluna, função/subfunção): repetição mantém a primeira.

⚠ Validação com a API real: o fixture `tests/fixtures/siconfi-ie-real.ts` tem **só as 2 primeiras linhas de cada coluna copiadas da API** (do erro exibido no painel); o restante completa o layout. Para validar de verdade, salve uma resposta completa (`curl "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca?an_exercicio=2024&no_anexo=DCA-Anexo%20I-E&id_ente=3541406" > ie.json`, com `jq '.items'` se quiser) e rode o parser sobre ela; compare os totais por função com o demonstrativo oficial.

## Portal da Transparência — `portal-transparencia`

| | |
|---|---|
| Responsável | Controladoria-Geral da União (CGU) |
| URL | `https://api.portaldatransparencia.gov.br/api-de-dados` |
| Documentação | https://api.portaldatransparencia.gov.br/swagger-ui/index.html |
| Autenticação | chave de API, header `chave-api-dados` (cadastro gratuito por e-mail) |
| Limites | oficial: 400 req/min (700 de 0h–6h); endpoints restritos 180 req/min; excesso suspende a chave por 8 h. App: **90 req/min** (conservador) |
| Dados | despesas por órgão (empenhado/liquidado/pago); Bolsa Família e BPC por município/mês (**agregados**, sem dado pessoal); **contratos por fornecedor (CNPJ) e por órgão+ano**; cadastro de órgãos (`orgaos-siafi`) |
| Periodicidade | despesas: contínua; benefícios: mensal |
| Implementação | ✅ `despesas/por-orgao`, `novo-bolsa-familia-por-municipio`, `bpc-por-municipio` (⚠ nome do endpoint do Bolsa Família é configurável: `config.bolsaFamiliaPath`) · ✅ contratos (`contratos/cpf-cnpj?cpfCnpj=`, `contratos?dataInicial&dataFinal&codigoOrgao`; ⚠ nomes de campos e restrições de intervalo de datas a confirmar; caminhos configuráveis em `config.contractsPath` / `config.contractsBySupplierPath`) · ⏳ licitações, servidores, viagens, cartões, emendas, convênios |

Respeita rate limit (janela deslizante + contagem no banco entre instâncias), paginação (`pagina` até vazia), token (nunca logado), erros tipados, até 2 novas tentativas com backoff (e `Retry-After`) apenas em 429/502/503/504/rede.

### Despesas por órgão (como funciona)

`/despesas/por-orgao` **exige o órgão** (código SIAFI em `orgao` ou `orgaoSuperior`); só com `ano` e `pagina` a API responde HTTP 400.
Por isso a unidade *União × ano* é montada assim — sem fixar um órgão e chamá-lo de total nacional:

1. Obtém a lista oficial paginada de órgãos em `/orgaos-siafi` (até página vazia; códigos repetidos entre páginas são descartados).
2. Consulta **cada órgão**: `/despesas/por-orgao?ano=AAAA&orgao=CODIGO&pagina=N`, paginando até página vazia. O código é validado (só dígitos).
3. Um conjunto de fatos por órgão (empenhado/liquidado/pago); o mesmo órgão nunca soma duas vezes.
4. Com ~300 órgãos e o limite de requisições, a unidade pode levar mais de uma chamada. Se o orçamento da chamada (`despesasRequestsPerCall`, padrão 80) ou o limite da fonte (HTTP 429) acabar antes, o adaptador devolve **parcial**: os órgãos já consultados são salvos, a unidade **não** ganha cobertura completa e a resposta sai como parcial (“Estamos buscando os dados…”); as chamadas seguintes continuam de onde pararam (progresso em memória, validade de 30 min) e só ao concluir todos os órgãos a unidade é marcada como coberta.

Configuração opcional da fonte (`config`, sem segredos): `despesasOrgaos: ["36000", "26000"]` restringe a uma **seleção** de órgãos (os fatos ficam rotulados “órgãos selecionados”, não é total nacional); `despesasOrgaoParam: "orgaoSuperior"` troca o filtro; `despesasRequestsPerCall` ajusta o orçamento.

### Contratos e fornecedores (como funciona)

* Busca por **CNPJ** (validado pelos dígitos verificadores) ou por **órgão + ano**. Pagina a fonte até página vazia (teto de 40 páginas; acima disso a resposta avisa que pode haver mais registros).
* Persistência estruturada: `entities` (CONTRACT com atributos — número, objeto, vigência, valor inicial/final, modalidade —, SUPPLIER, AGENCY) e um fato `CONTRACT_VALUE` por contrato (entidade = contrato, `related_entity_id` = fornecedor, categoria = órgão). Valores revisados pela fonte entram em `data_versions`.
* Valor exibido: **valor final** (inclui aditivos) quando a fonte informa; senão o inicial. Os dois ficam guardados.
* Mesmas garantias do Query Router: cache por consulta normalizada (`cached_queries`, tipo `contracts`), TTL da fonte, fonte desativada/offline ⇒ dados salvos com aviso, sem chave ⇒ “não configurada”, rate limit, logs.
* **LGPD:** só pessoa jurídica. CPF digitado é recusado (400); registros cujo fornecedor é pessoa física (ou CNPJ inválido) são descartados **no parser**, antes de qualquer persistência. CPF/CNPJ são mascarados nas URLs registradas em `api_request_logs`.
* Busca por nome: acha fornecedores e órgãos **já consultados** (progressivo); o cadastro de órgãos do SIAFI é carregado uma vez, sob demanda.

## Receita Federal — `receita-federal`

| | |
|---|---|
| Responsável | Receita Federal do Brasil |
| URL base / docs | `https://www.gov.br/receitafederal` · https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos |
| Autenticação | nenhuma |
| Tipo | `DATASET_DOWNLOAD` (CSV) |
| Dados | arrecadação por tributo (União e UF) |
| Implementação | ✅ motor genérico de CSV (delimitador, latin1/UTF-8, agregação por tributo, filtro de ano/UF, limite de 40 MB, escala) · ⚠ **nenhuma URL de arquivo vem embutida**: URLs e nomes de colunas dos arquivos oficiais mudam e não são contrato estável. Configure em *Configurar → datasets* (exemplo no painel). Sem configuração a fonte responde “não configurada” — nunca inventa. |

## Tesouro Nacional — `tesouro-nacional`

Tesouro Transparente (CKAN) em `https://www.tesourotransparente.gov.br` (health: `/ckan/api/3/action/package_list`). Mesmo motor de CSV; datasets `tesouro.divida_publica` e `tesouro.resultado_fiscal` aguardam configuração (muitas séries do Tesouro são XLSX — conversão/CSV pendente). Implementação: ✅ motor/health · ⏳ datasets padrão.

**Configuração do dataset `tesouro.divida_publica`** (Configurar → configuração avançada). `metric` e `category_type` precisam ser exatamente os valores do catálogo (`src/server/core/datasets.ts`); o painel recusa outros ao salvar, informando o campo e os valores permitidos:

```json
{ "datasets": { "tesouro.divida_publica": {
  "url": "https://…/arquivo.csv", "delimiter": ";", "encoding": "utf-8",
  "columns": { "year": "Ano", "category_code": "Titulo", "value": "Valor" },
  "metric": "DEBT", "category_type": "DEBT_FEDERAL", "unit": "BRL", "scale": 0.01
} } }
```

Se o download der HTTP 200 mas a importação for rejeitada pelo validador (ex.: `categoria DEBT fora do dataset`), o log da fonte mostra uma entrada `import … (rejeitada)` com o **status HTTP real (200)** e o motivo.

## dados.gov.br — `dados-gov-br`

Catálogo (descoberta de datasets), `https://dados.gov.br/dados/api/publico`, autenticação por token (header configurável, padrão `chave-api-dados-abertos` ⚠). Implementação: ✅ busca de catálogo (`/api/v1/catalog`) · ⏳ promoção de datasets descobertos a fontes.

## IBGE Localidades — `ibge-localidades` (auxiliar)

Cadastro oficial de estados/municípios. Fallback do cadastro quando o SICONFI falha (sem população).

## Importação de CSV (qualquer fonte com conjuntos de dados)

Em `/admin/fontes/<fonte>` → **Importar CSV**. O arquivo vira os mesmos fatos que o adaptador produziria (`source_record_id =
csv:<importação>:<linha>`, `source_dataset = "<dataset> (CSV)"`) e a **cobertura** (`data_coverage`) das unidades importadas
(ente × ano × período) é gravada como `OK` por 10 anos. Como o Query Router consulta a cobertura **antes** de qualquer API, o CSV
tem prioridade; a API só atende o que o CSV não cobre. A importação substitui os fatos da mesma fonte/unidade/dataset
(sem dupla contagem) e pode ser desfeita (`data_imports`, apaga fatos e cobertura da importação). Campos canônicos:
`ente_tipo, ente_codigo, ano, periodo, metrica, categoria_tipo, categoria_codigo, categoria_rotulo, valor`; o mapeamento
de colunas, a codificação, o separador e o decimal são escolhidos na tela. Validação por conjunto de dados (`DATASETS`).

## Checklist de primeira validação (com rede e credenciais)

1. *Admin → Saúde das APIs → Testar todas*: confira status/latência de cada fonte.
2. Pesquise um município: o cadastro deve carregar (≥ 5.000 municípios).
3. Abra o município: confira nos logs (*Admin → Logs*) as chamadas `dca` e se `records_received` > 0. Em caso de “nenhuma linha reconhecida”, compare uma resposta real com `parseDcaReceitas/parseDcaDespesasFuncao/parseDcaDespesasNatureza/parseRgfDivida` em `src/server/sources/siconfi.ts` e ajuste (os testes em `tests/unit/siconfi.test.ts` mostram o formato esperado).
4. Compare 2–3 números com o Siconfi/Painel de Dados Fiscais oficiais.
5. Configure a chave do Portal da Transparência e teste a conexão; abra *Benefícios*.
6. Configure um CSV da Receita/Tesouro e valide a agregação.

## Adicionando uma fonte

**Pelo painel** (*Admin → Fontes de Dados → + Adicionar fonte*): informe nome, identificador, provedor, tipo, URL base (https, host público), autenticação, prioridade, limite, TTL e o **adaptador** (o “parser”):

* **Arquivo CSV genérico** — concorre nos datasets de arquivo (`receita.arrecadacao`, `tesouro.divida_publica`, `tesouro.resultado_fiscal`); depois configure URL e colunas em *Configurar → datasets*.
* **Mesmo formato de uma fonte existente** — um espelho/alternativa (outra URL) que entra no fallback do Query Router pela prioridade.
* Opcional: caminho de teste de conexão (`config.healthPath`). A credencial, se houver, é cadastrada depois na página da fonte. Tudo é auditado (`source.added`); fontes criadas aparecem com a marca “personalizada”.

**Formato realmente novo** exige código:

1. Crie o adaptador (`IGovernmentSource`) em `src/server/sources/` e registre em `sources/index.ts`; declare os datasets que atende (`core/datasets.ts`).
2. A fonte é cadastrada sozinha no registry; ajuste prioridade/TTL/limites pelo painel. Várias fontes para o mesmo dataset ⇒ fallback por prioridade.
3. Escreva testes com fixtures (veja `tests/unit/siconfi.test.ts`).
