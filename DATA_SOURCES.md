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

## dados.gov.br — `dados-gov-br`

Catálogo (descoberta de datasets), `https://dados.gov.br/dados/api/publico`, autenticação por token (header configurável, padrão `chave-api-dados-abertos` ⚠). Implementação: ✅ busca de catálogo (`/api/v1/catalog`) · ⏳ promoção de datasets descobertos a fontes.

## IBGE Localidades — `ibge-localidades` (auxiliar)

Cadastro oficial de estados/municípios. Fallback do cadastro quando o SICONFI falha (sem população).

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
