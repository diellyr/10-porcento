-- Brasil Fiscal :: 0010 — importação de CSV por fonte (dados importados têm prioridade sobre a API)
-- Ideia: o CSV grava fatos e marca a COBERTURA (dataset × ente × ano × período) como OK com validade longa.
-- O Query Router já consulta a cobertura antes de chamar qualquer API; logo, o que veio do CSV é servido primeiro e a
-- API só é usada para o que o CSV não cobre.

create table public.data_imports (
  id               uuid primary key default gen_random_uuid(),
  source_id        uuid not null references public.data_sources(id) on delete cascade,
  dataset          text not null,
  filename         text not null,
  status           text not null default 'RUNNING' check (status in ('RUNNING', 'DONE', 'FAILED', 'ROLLED_BACK')),
  rows_total       int not null default 0,
  rows_saved       int not null default 0,
  rows_rejected    int not null default 0,
  units            int not null default 0,
  reject_reasons   jsonb not null default '[]'::jsonb,
  created_by       uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at       timestamptz not null default now(),
  finished_at      timestamptz
);
create index idx_imports_source on public.data_imports (source_id, created_at desc);
create index idx_imports_created_by on public.data_imports (created_by);

alter table public.data_imports enable row level security;
create policy imports_admin_read on public.data_imports for select to authenticated using (public.is_admin());

-- Cobertura criada por uma importação (permite desfazer: apagar a cobertura devolve a unidade para a API).
alter table public.data_coverage add column import_id uuid references public.data_imports(id) on delete set null;
create index idx_coverage_import on public.data_coverage (import_id) where import_id is not null;

-- Desfazer uma importação apaga os fatos cujo source_record_id começa com 'csv:<id>:'.
create index idx_facts_csv_record on public.fiscal_facts (source_record_id text_pattern_ops) where source_record_id like 'csv:%';

-- Grava um lote já validado e marca a cobertura das unidades presentes (as unidades nunca são divididas entre lotes).
-- Os fatos entram pelo mesmo caminho dos adaptadores (upsert_fiscal_facts): deduplicação e versionamento continuam valendo.
create or replace function public.import_fiscal_facts(p_rows jsonb, p_import uuid, p_dataset text, p_expires timestamptz)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_res jsonb;
  v_units int := 0;
begin
  v_res := public.upsert_fiscal_facts(p_rows);

  insert into data_coverage (entity_id, source_id, dataset, period_year, period_number, status, record_count, fetched_at, expires_at, import_id)
  select e.id, x.source_id, p_dataset, x.period_year, coalesce(x.period_number, 0), 'OK', count(*)::int, now(), p_expires, p_import
  from jsonb_to_recordset(p_rows) as x(entity_type entity_type, entity_code text, source_id uuid, period_year smallint, period_number smallint)
  join entities e on e.entity_type = x.entity_type and e.code = x.entity_code
  group by e.id, x.source_id, x.period_year, coalesce(x.period_number, 0)
  on conflict (entity_id, source_id, dataset, period_year, period_number)
  do update set status = 'OK', record_count = excluded.record_count, fetched_at = now(), expires_at = excluded.expires_at, import_id = excluded.import_id;
  get diagnostics v_units = row_count;

  return v_res || jsonb_build_object('units', v_units);
end $$;

revoke all on function public.import_fiscal_facts(jsonb, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.import_fiscal_facts(jsonb, uuid, text, timestamptz) to service_role;
