-- Brasil Fiscal :: 0001 — extensões, tipos enumerados e funções utilitárias
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.source_type   as enum ('REST_API', 'CSV', 'JSON', 'XML', 'DATASET_DOWNLOAD');
create type public.auth_type     as enum ('NONE', 'API_KEY_HEADER', 'API_KEY_QUERY', 'BEARER_TOKEN');
create type public.source_status as enum ('UNKNOWN', 'ONLINE', 'DEGRADED', 'OFFLINE', 'DISABLED', 'NOT_CONFIGURED');
create type public.user_role     as enum ('user', 'admin');

create type public.entity_type as enum (
  'COUNTRY', 'STATE', 'MUNICIPALITY', 'AGENCY', 'PUBLIC_ENTITY',
  'FUNCTION', 'SUBFUNCTION', 'PROGRAM', 'ACTION',
  'SUPPLIER', 'TAX', 'BENEFIT', 'CONTRACT', 'BID', 'TRANSFER'
);

-- Conceitos contábeis distintos NUNCA compartilham a mesma métrica.
create type public.fiscal_metric as enum (
  'REVENUE_FORECAST',      -- receita prevista (orçamento)
  'REVENUE_REALIZED',      -- receita arrecadada/realizada
  'EXPENSE_BUDGETED',      -- dotação/orçamento de despesa
  'EXPENSE_COMMITTED',     -- despesa empenhada
  'EXPENSE_LIQUIDATED',    -- despesa liquidada
  'EXPENSE_PAID',          -- despesa paga
  'TRANSFER',              -- transferência
  'DEBT',                  -- dívida
  'BENEFIT_VALUE',         -- valor de benefício social
  'BENEFICIARIES',         -- quantidade de beneficiários
  'CONTRACT_VALUE',        -- valor contratado
  'FISCAL_INDICATOR'       -- indicador fiscal (ex.: resultado primário)
);

create type public.period_type as enum ('YEAR', 'SEMESTER', 'QUARTER', 'BIMESTER', 'MONTH');

-- unaccent não é IMMUTABLE; este wrapper permite uso em colunas geradas e índices.
create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
