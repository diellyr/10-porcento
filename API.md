# Brasil Fiscal API

Base: `/api/v1` (pública, somente leitura) e `/api/admin` (administradores). JSON. Erros: `{"error":{"code","message"[, "technical"]}}` — `message` é sempre texto seguro para o cidadão; `technical` só em rotas admin.

Limites por IP (em memória, por instância): `search` 120/min, `entities` 120/min, `query` 60/min, `overview` 60/min, `per-100` 60/min, `ask` 20/min, `catalog` 10/min.  Respostas completas: `Cache-Control: public, s-maxage=300`; degradadas (`stale/partial/unavailable`): `no-store`.

## Pública

### `GET /api/v1/search?q=Praia Grande - SP`
`{results:[{type,code,name,uf,population}]}` — estados e municípios (padrão); aceita “Cidade - UF”.

### `GET /api/v1/entities?type=STATE|MUNICIPALITY&uf=SP&limit=100&after=<code>` · `GET /api/v1/entities/{type}/{code}`
Listagem paginada por cursor (`next`) e detalhe + `breadcrumb`.

### `GET /api/v1/query`
Parâmetros: `kind` (`series|breakdown`), `entity_type` (`COUNTRY|STATE|MUNICIPALITY`), `entity_code` (IBGE; Brasil = `1`), `metric`, `category_type?`, `category_code?`, `category_prefix?`, `year_from`, `year_to` (máx. 12 anos), `include_points=0?`.

```json
{
  "spec": { "...": "consulta normalizada" },
  "entity": { "name": "Praia Grande", "uf": "SP" },
  "points": [{ "year": 2024, "categoryType": "FUNCTION", "categoryCode": "10", "categoryLabel": "Saúde", "value": 123.45, "unit": "BRL", "metric": "EXPENSE_LIQUIDATED" }],
  "totals": [{ "year": 2024, "value": 999.0 }],
  "freshness": "fresh | cached | stale | partial | unavailable",
  "notice": "texto para o cidadão ou null",
  "provenance": [{ "sourceName": "SICONFI", "provider": "Tesouro Nacional", "dataset": "DCA-Anexo I-E", "periodLabel": "2024", "fetchedAt": "…", "sourceUpdatedAt": null, "url": null, "documentationUrl": "…" }],
  "generatedAt": "…"
}
```
Paginação: o número de pontos é naturalmente limitado (≤ 5.000 por consulta, ≤ 12 anos).

### `GET /api/v1/overview?entity_type&entity_code&year` → quatro indicadores (Arrecadação, Despesas, Resultado, Dívida) com conceito, ano realmente usado, aviso e proveniência.
### `GET /api/v1/per-100?side=expense|revenue&lens=function|nature|origin|tax&entity_type&entity_code&year&metric?` → composição “de cada R$ 100”.
### `POST /api/v1/ask {question}` → Intent JSON + respostas com fonte, ranking (`ranking{text,note,items,covered,total,complete}`) para perguntas “quais municípios/estados mais…”, ou `needs_clarification/unsupported`.
### `GET /api/v1/rankings?entity_type=STATE|MUNICIPALITY&metric=…&year=…&order=…`
Ranking sobre dados **já salvos**. `metric`: `REVENUE_REALIZED|EXPENSE_COMMITTED|EXPENSE_LIQUIDATED|EXPENSE_PAID`; `category_type`/`category_code` (padrão: partição total — função para despesa, receitas de nível 1 para receita); `uf` (municípios); `order`: `value_desc|value_asc|change_desc|change_asc` (variação exige `compare_year` < `year`); `per_capita`; `limit` ≤ 50. Resposta: `items[{code,name,uf,population,value,previous,changePct}]`, **`covered`** (entes com dado) × **`total`** (no cadastro), `complete`, `fillable`, `note`. Nunca apresenta ranking parcial como completo. Limite 60 req/min.

### `GET /api/v1/contracts?cnpj=… | agency=…&year=…&limit=25&cursor=…`
Contratos públicos com empresas. `cnpj` (14 dígitos, com ou sem máscara) **ou** `agency` (código SIAFI) + `year`. CPF ⇒ `400` (LGPD). `limit` ≤ 100; `cursor` = `next` da resposta anterior (paginação por id). Resposta: `items[]` (número, objeto, fornecedor, órgão, vigência, valor inicial/final/exibido), `next`, `summary` (só na 1ª página: total, por ano, principais órgãos ou fornecedores), `freshness`, `notice`, `truncated`, `provenance`. Limite 30 req/min por IP.

### `GET /api/v1/search?q=…&types=places|all`
`all` inclui fornecedores e órgãos já conhecidos; um CNPJ válido digitado vira resultado direto.

### `GET /api/v1/catalog?q=` → busca no catálogo dados.gov.br (exige a fonte habilitada e configurada).

## Administração (`/api/admin`, sessão + papel `admin`; mutações exigem same-origin)

| Método e rota | Ação |
|---|---|
| `GET /sources` · `GET /sources/{slug}` | lista (com `adapters[]` disponíveis)/detalhe (credencial **mascarada**) |
| `POST /sources` | adicionar fonte (adaptador existente; https/host público; sem segredos na config) |
| `PATCH /sources/{slug}` | prioridade, TTL, limite, base URL (https/público), config JSON (sem segredos) |
| `POST /sources/{slug}/toggle {enabled}` | ativa/desativa (não apaga dados) |
| `POST /sources/{slug}/test` | testar conexão (HTTP, tempo, status) |
| `PUT/DELETE /sources/{slug}/credential` | grava (cifrada) / remove; o valor nunca retorna |
| `POST /sources/{slug}/refresh` | invalida cache da fonte e refaz as consultas mais usadas |
| `POST /sources/{slug}/clear-cache` · `POST /cache/clear` | limpa cache (dados permanecem) |
| `GET /sources/{slug}/logs?limit&before&errors=1` | logs paginados por cursor |
| `GET /health` · `POST /health/test` | saúde / testar todas |
| `GET /dashboard` · `GET /data` · `GET /cache` · `GET /audit` · `GET/PATCH /users` · `GET /settings` | painéis |

`GET /api/cron/health` (`Authorization: Bearer $CRON_SECRET`): testa fontes ativas e poda logs.

## Contrato estável

Frontend e integrações dependem **apenas** destes endpoints e dos DTOs em `src/lib/dto.ts`. Mudanças de implementação (Redis, ClickHouse, workers) não devem alterá-los.
