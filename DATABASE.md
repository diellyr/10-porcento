# Banco de dados (PostgreSQL / Supabase)

Migrations em `supabase/migrations/` (ordem numérica). Testadas do zero em Postgres via PGlite (`tests/db`): estrutura, deduplicação, versionamento, busca, RLS e RPCs. **Nunca altere o banco manualmente.**

## ERD

```mermaid
erDiagram
  data_sources ||--o| source_credentials : "1:0..1"
  data_sources ||--o{ api_request_logs : registra
  data_sources ||--o{ fiscal_facts : origem
  data_sources ||--o{ data_coverage : cobre
  data_sources ||--o{ cached_queries : alimenta
  entities ||--o{ fiscal_facts : "entity_id (ente)"
  entities ||--o{ fiscal_facts : "related_entity_id (órgão, fornecedor…)"
  entities ||--o{ data_coverage : ""
  entities ||--o{ entities : parent_id
  fiscal_facts ||--o{ data_versions : "revisões"
  auth_users ||--|| profiles : ""
  auth_users ||--o{ admin_audit_log : actor

  data_sources { uuid id PK; text slug UK; enum source_type; enum auth_type; bool enabled; int priority; int rate_limit_per_minute; int cache_ttl_minutes; enum status; text adapter_key; jsonb config }
  source_credentials { uuid source_id PK; text secret_ciphertext; text last4 }
  entities { uuid id PK; enum entity_type; text code; text name; text search_name; uuid parent_id; char uf; text esfera; int population }
  fiscal_facts { bigint id PK; text fact_key UK; uuid entity_id FK; uuid related_entity_id FK; enum metric; text category_type; text category_code; enum period_type; smallint period_year; smallint period_number; numeric value; text unit; uuid source_id FK; text source_dataset; timestamptz source_updated_at; timestamptz fetched_at; int version }
  data_versions { bigint id PK; bigint fact_id FK; numeric previous_value; numeric new_value; timestamptz valid_from; timestamptz valid_until; timestamptz detected_at }
  data_coverage { bigint id PK; uuid entity_id FK; uuid source_id FK; text dataset; smallint period_year; smallint period_number; text status; timestamptz expires_at }
  cached_queries { bigint id PK; text query_hash UK; text query_type; jsonb normalized_query; jsonb result_reference; timestamptz expires_at; int hit_count }
  api_request_logs { bigint id PK; uuid source_id FK; text endpoint; int duration_ms; int http_status; bool cache_hit; bool success; text error_type }
  admin_audit_log { bigint id PK; uuid actor_id; text action; text target_id; jsonb details }
  profiles { uuid id PK; text email; enum role }
```

## Tabelas

| Tabela | Finalidade |
|---|---|
| `data_sources` | Source Registry (nome, provedor, tipo REST/CSV/JSON/XML/DATASET_DOWNLOAD, auth, `enabled`, `priority`, rate limit, TTL, `status`, `adapter_key`, `config` sem segredos, últimos sucesso/falha/sync/latência/erro, quem/quando desativou). |
| `source_credentials` | Segredo cifrado (AES-256-GCM, chave fora do banco) + últimos 4 caracteres. Sem policies: só `service_role`. |
| `entities` | Modelo único para Brasil, Estado, Município, Órgão, Função, Subfunção, Programa, Ação, Fornecedor, Tributo, Benefício, Contrato, Licitação, Transferência (`entity_type` + `code` único; IBGE para estados/municípios). `search_name` gerado (sem acento) com índice trigram. |
| `fiscal_facts` | Fato: ente × métrica × categoria × período → valor, com `source_id`, `source_dataset`, `source_record_id`, `source_updated_at`, `fetched_at`, `version`. `fact_key` (hash da chave natural) é único ⇒ deduplicação. |
| `data_versions` | Histórico quando a fonte revisa um valor (anterior, novo, `valid_from/until`, `detected_at`). |
| `data_coverage` | (ente, fonte, dataset, ano, período) já buscados, validade e `OK/EMPTY` (cache negativo). |
| `cached_queries` | Atalho por hash da consulta normalizada; guarda **ponteiro**, não payload. |
| `api_request_logs` | Chamadas externas e consultas do router (ver ARCHITECTURE). |
| `admin_audit_log` | API habilitada/desabilitada, token alterado/removido, configuração alterada, cache limpo, atualização forçada, papel alterado, cadastro de entes. Nunca contém segredos. |
| `profiles` | Papel (`user`/`admin`); criado por trigger em `auth.users` sempre como `user`. |

Funções: `upsert_fiscal_facts(jsonb)` (set-based; cria órgãos/fornecedores relacionados; versiona; não reescreve iguais; lote ≤ 5000), `search_entities`, `touch_cached_query`, `admin_db_usage`, `admin_dashboard_stats`, `admin_data_overview`, `is_admin`, **`rank_entities`** (rankings por valor/variação/per capita sobre dados salvos, com cobertura `covered/total`; pública, `security invoker`) e `purgeable_counts` (somente leitura). A poda de logs/cache é feita pelo app (`/api/cron/health`). Migrations 0007 (hardening), 0008 (índices de FK + policy de `profiles`) e 0009 (rankings).

## Índices (derivados dos padrões de consulta reais)

Todas as leituras de fatos do app são “um ente, uma métrica, intervalo de anos (+ categoria)” ou “categoria × ano”:

* `fiscal_facts (entity_id, period_year, metric)` — cobre `municipality_id+year` e `state_id+year` (o ente é `entity_id`), a consulta dominante.
* `fiscal_facts (metric, period_year)` — `metric+year`.
* `fiscal_facts (category_type, category_code, period_year)` — `category+year`.
* `fiscal_facts (related_entity_id, period_year) WHERE related_entity_id IS NOT NULL` — `agency_id+year` (parcial: só órgãos/fornecedores).
* `entities` GIN trigram (parcial, só tipos pesquisáveis), `(entity_type, uf)`, `(parent_id)`; `unique (entity_type, code)`.
* `api_request_logs (source_id, started_at desc)` e `(started_at desc)`; `cached_queries (expires_at)`, `(query_type, hit_count desc)`; `data_coverage (expires_at)` + unique da unidade.

Reavalie com `EXPLAIN` quando houver volume real; não adicione índices sem padrão de consulta.

## RLS

RLS habilitado em **todas** as tabelas. Leitura pública apenas de `entities` e `fiscal_facts` (dados públicos) e da view `public_sources` (sem URL de API/config). Fontes, logs, auditoria, versões, cobertura e cache: só administradores (`is_admin()`). `source_credentials`: ninguém além de `service_role`. Escritas: apenas `service_role` (servidor); `INSERT/UPDATE/DELETE` revogados de `anon`/`authenticated`. RPCs sensíveis: `EXECUTE` só para `service_role`. Testado em `tests/db/schema.test.ts`.

> Ao criar tabelas novas, habilite RLS e revogue privilégios padrão de `anon/authenticated` na própria migration.

## Controle de crescimento

Deduplicação por `fact_key`; unidade acima de 4.000 linhas é agregada (níveis superiores/maiores valores); receitas persistem até o nível 3 da natureza; `purge_old_logs` (logs > 30 dias, cache expirado > 7 dias). Monitore em *Admin → Dashboard*.
