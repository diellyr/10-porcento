-- Brasil Fiscal :: 0003 — entidades, fatos fiscais, versionamento, cobertura e cache
create table public.entities (
  id          uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  code        text not null,                      -- IBGE (UF 2 díg., município 7 díg.), CNPJ, código SIAFI, etc.
  name        text not null,
  search_name text generated always as (lower(public.f_unaccent(name))) stored,
  parent_id   uuid references public.entities(id) on delete set null,
  uf          char(2),
  esfera      text check (esfera in ('U', 'E', 'M', 'D')),   -- União, Estado, Município, Distrito Federal
  cnpj        text,
  population  integer,
  attributes  jsonb not null default '{}'::jsonb,
  source_id   uuid references public.data_sources(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (entity_type, code)
);
create trigger trg_entities_updated before update on public.entities
  for each row execute function public.set_updated_at();
create index idx_entities_search_trgm on public.entities using gin (search_name extensions.gin_trgm_ops)
  where entity_type in ('STATE', 'MUNICIPALITY', 'AGENCY', 'PROGRAM', 'SUPPLIER');
create index idx_entities_parent on public.entities (parent_id);
create index idx_entities_type_uf on public.entities (entity_type, uf);

-- Fato fiscal: um número, de um conceito contábil, de um ente, em um período, com origem.
create table public.fiscal_facts (
  id                 bigint generated always as identity primary key,
  fact_key           text not null unique,        -- hash da chave natural (deduplicação)
  entity_id          uuid not null references public.entities(id) on delete cascade,
  related_entity_id  uuid references public.entities(id) on delete set null,   -- órgão, fornecedor, programa...
  metric             public.fiscal_metric not null,
  category_type      text,                        -- FUNCTION | SUBFUNCTION | TAX | REVENUE_SOURCE | ...
  category_code      text,
  category_label     text,
  period_type        public.period_type not null default 'YEAR',
  period_year        smallint not null,
  period_number      smallint not null default 0, -- 0 = ano inteiro; 1..n = trimestre/bimestre/mês
  value              numeric(20,2) not null,
  unit               text not null default 'BRL' check (unit in ('BRL', 'COUNT', 'PERCENT')),
  source_id          uuid not null references public.data_sources(id),
  source_dataset     text,                        -- ex.: "DCA-Anexo I-E"
  source_record_id   text,
  source_url         text,
  source_updated_at  timestamptz,
  fetched_at         timestamptz not null default now(),
  version            int not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- índices derivados dos padrões de consulta reais (ver DATABASE.md)
create index idx_facts_entity_period   on public.fiscal_facts (entity_id, period_year, metric);
create index idx_facts_metric_year     on public.fiscal_facts (metric, period_year);
create index idx_facts_category_year   on public.fiscal_facts (category_type, category_code, period_year);
create index idx_facts_related_year    on public.fiscal_facts (related_entity_id, period_year) where related_entity_id is not null;

create table public.data_versions (
  id                bigint generated always as identity primary key,
  fact_id           bigint not null references public.fiscal_facts(id) on delete cascade,
  previous_value    numeric(20,2) not null,
  new_value         numeric(20,2) not null,
  valid_from        timestamptz not null,
  valid_until       timestamptz not null default now(),
  detected_at       timestamptz not null default now(),
  source_id         uuid references public.data_sources(id) on delete set null
);
create index idx_versions_fact on public.data_versions (fact_id, detected_at desc);

-- Cobertura: quais (ente × dataset × período) já foram buscados e até quando valem.
-- Permite reaproveitar dados entre consultas diferentes e fazer cache negativo (EMPTY).
create table public.data_coverage (
  id            bigint generated always as identity primary key,
  entity_id     uuid not null references public.entities(id) on delete cascade,
  source_id     uuid not null references public.data_sources(id) on delete cascade,
  dataset       text not null,
  period_year   smallint not null,
  period_number smallint not null default 0,
  status        text not null default 'OK' check (status in ('OK', 'EMPTY')),
  record_count  int not null default 0,
  fetched_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  unique (entity_id, source_id, dataset, period_year, period_number)
);
create index idx_coverage_expires on public.data_coverage (expires_at);

create table public.cached_queries (
  id               bigint generated always as identity primary key,
  query_hash       text not null unique,
  query_type       text not null,
  normalized_query jsonb not null,
  result_reference jsonb not null default '{}'::jsonb,   -- ponteiro p/ fatos estruturados, nunca o payload
  source_id        uuid references public.data_sources(id) on delete set null,
  record_count     int not null default 0,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null,
  hit_count        int not null default 0,
  last_hit_at      timestamptz
);
create index idx_cached_queries_expires on public.cached_queries (expires_at);
create index idx_cached_queries_type_hits on public.cached_queries (query_type, hit_count desc);
