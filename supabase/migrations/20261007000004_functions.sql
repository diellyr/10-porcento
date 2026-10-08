-- Brasil Fiscal :: 0004 — funções de persistência, busca e administração

-- Upsert idempotente de fatos com deduplicação (fact_key) e versionamento (data_versions).
-- Linhas cuja chave natural já existe com o MESMO valor não geram escrita.
create or replace function public.upsert_fiscal_facts(p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_total int := coalesce(jsonb_array_length(p_rows), 0);
  v_resolved int; v_distinct int;
  v_inserted int := 0; v_updated int := 0;
begin
  if v_total = 0 then
    return jsonb_build_object('received', 0, 'inserted', 0, 'updated', 0, 'unchanged', 0, 'rejected', 0);
  end if;
  if v_total > 5000 then
    raise exception 'batch too large (% rows, max 5000)', v_total;
  end if;

  -- entidades relacionadas (órgão, fornecedor, programa...) são criadas sob demanda
  insert into entities (entity_type, code, name, source_id)
  select distinct on (x.related_type, x.related_code) x.related_type, x.related_code,
         coalesce(nullif(x.related_name, ''), x.related_code), x.source_id
  from jsonb_to_recordset(p_rows) as x(related_type entity_type, related_code text, related_name text, source_id uuid)
  where x.related_type is not null and x.related_code is not null
  on conflict (entity_type, code) do nothing;

  -- Uma única instrução com CTEs (sem tabelas temporárias): segura para várias chamadas na mesma transação.
  with inc_all as (
    select e.id as entity_id, r.id as related_id, x.*
    from jsonb_to_recordset(p_rows) as x(
      entity_type entity_type, entity_code text, related_type entity_type, related_code text,
      metric fiscal_metric, category_type text, category_code text, category_label text,
      period_type period_type, period_year smallint, period_number smallint,
      value numeric, unit text, source_id uuid, source_dataset text, source_record_id text,
      source_url text, source_updated_at timestamptz)
    join entities e on e.entity_type = x.entity_type and e.code = x.entity_code
    left join entities r on r.entity_type = x.related_type and r.code = x.related_code
  ), inc as (
    select distinct on (k.fact_key) k.fact_key, a.*
    from inc_all a
    cross join lateral (select md5(concat_ws('|', a.entity_id, coalesce(a.related_id::text, ''), a.metric,
        coalesce(a.category_type, ''), coalesce(a.category_code, ''), a.source_id, coalesce(a.period_type, 'YEAR'),
        a.period_year, coalesce(a.period_number, 0), coalesce(a.source_dataset, ''),
        coalesce(a.source_record_id, ''))) as fact_key) k
  ), ver as (
    insert into data_versions (fact_id, previous_value, new_value, valid_from, source_id)
    select f.id, f.value, i.value, f.fetched_at, i.source_id
    from fiscal_facts f join inc i on i.fact_key = f.fact_key
    where f.value is distinct from i.value
    returning 1
  ), upd as (
    update fiscal_facts f
       set value = i.value, version = f.version + 1, source_updated_at = i.source_updated_at,
           source_url = coalesce(i.source_url, f.source_url), fetched_at = now(), updated_at = now()
      from inc i
     where f.fact_key = i.fact_key and f.value is distinct from i.value
    returning 1
  ), ins as (
    insert into fiscal_facts (fact_key, entity_id, related_entity_id, metric, category_type, category_code, category_label,
        period_type, period_year, period_number, value, unit, source_id, source_dataset, source_record_id, source_url,
        source_updated_at)
    select i.fact_key, i.entity_id, i.related_id, i.metric, i.category_type, i.category_code, i.category_label,
           coalesce(i.period_type, 'YEAR'), i.period_year, coalesce(i.period_number, 0), i.value, coalesce(i.unit, 'BRL'),
           i.source_id, i.source_dataset, i.source_record_id, i.source_url, i.source_updated_at
    from inc i
    on conflict (fact_key) do nothing
    returning 1
  )
  select (select count(*) from inc_all), (select count(*) from inc), (select count(*) from upd), (select count(*) from ins)
    into v_resolved, v_distinct, v_updated, v_inserted;

  return jsonb_build_object('received', v_total, 'inserted', v_inserted, 'updated', v_updated,
    'unchanged', v_distinct - v_inserted - v_updated,
    'rejected', v_total - v_resolved, 'duplicates_in_batch', v_resolved - v_distinct);
end $$;

-- Busca de entes por nome (sem acento, parcial, tolerante), priorizando prefixo e população.
create or replace function public.search_entities(p_query text, p_types public.entity_type[] default null, p_limit int default 10)
returns table (id uuid, entity_type public.entity_type, code text, name text, uf char(2), population integer, rank real)
language sql stable set search_path = public as $$
  with q as (
    select lower(public.f_unaccent(trim(p_query))) as t,
           regexp_replace(lower(public.f_unaccent(trim(p_query))), '([\\%_])', '\\\1', 'g') as esc
  )
  select e.id, e.entity_type, e.code, e.name, e.uf, e.population,
         (case when e.search_name = q.t then 3 when e.search_name like q.esc || '%' then 2 else 1 end
          + extensions.similarity(e.search_name, q.t))::real as rank
  from entities e, q
  where length(q.t) >= 2
    and (p_types is null or e.entity_type = any (p_types))
    and e.entity_type in ('STATE', 'MUNICIPALITY', 'AGENCY', 'PROGRAM', 'SUPPLIER')
    and e.search_name like '%' || q.esc || '%'
  order by rank desc, e.population desc nulls last, e.name
  limit least(greatest(p_limit, 1), 25)
$$;

create or replace function public.touch_cached_query(p_hash text)
returns void language sql security definer set search_path = public as $$
  update cached_queries set hit_count = hit_count + 1, last_hit_at = now() where query_hash = p_hash
$$;

-- Uso do banco para o indicador de capacidade (plano Free = 500 MB).
create or replace function public.admin_db_usage(p_limit_bytes bigint default 524288000)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'limit_bytes', p_limit_bytes,
    'percent', round(100.0 * pg_database_size(current_database()) / p_limit_bytes, 1),
    'facts', (select reltuples::bigint from pg_class where oid = 'public.fiscal_facts'::regclass),
    'entities', (select reltuples::bigint from pg_class where oid = 'public.entities'::regclass),
    'logs', (select reltuples::bigint from pg_class where oid = 'public.api_request_logs'::regclass))
$$;

create or replace function public.admin_dashboard_stats(p_since timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'queries',         (select count(*) from api_request_logs where started_at >= p_since and not is_test and query_type is not null),
    'cache_hits',      (select count(*) from api_request_logs where started_at >= p_since and cache_hit and not is_test),
    'cache_misses',    (select count(*) from api_request_logs where started_at >= p_since and not cache_hit and not is_test and query_type = 'router'),
    'external_calls',  (select count(*) from api_request_logs where started_at >= p_since and not cache_hit and not is_test and query_type is distinct from 'router'),
    'api_errors',      (select count(*) from api_request_logs where started_at >= p_since and not success and not cache_hit),
    'avg_response_ms', (select round(avg(duration_ms)) from api_request_logs where started_at >= p_since and not cache_hit and not is_test and duration_ms is not null),
    'facts_total',     (select count(*) from fiscal_facts),
    'entities_total',  (select count(*) from entities),
    'top_sources', coalesce((select jsonb_agg(t) from (
        select s.name, count(*) as calls from api_request_logs l join data_sources s on s.id = l.source_id
        where l.started_at >= p_since and not l.is_test group by s.name order by calls desc limit 5) t), '[]'::jsonb),
    'top_municipalities', coalesce((select jsonb_agg(t) from (
        select e.name, e.uf, sum(c.hit_count + 1) as queries from cached_queries c
        join entities e on e.entity_type = 'MUNICIPALITY' and e.code = c.normalized_query->>'entity_code'
        where c.normalized_query->>'entity_type' = 'MUNICIPALITY' group by e.name, e.uf order by queries desc limit 5) t), '[]'::jsonb),
    'top_indicators', coalesce((select jsonb_agg(t) from (
        select normalized_query->>'metric' as metric, sum(hit_count + 1) as queries from cached_queries
        group by 1 order by queries desc limit 5) t), '[]'::jsonb)
  )
$$;

create or replace function public.purge_old_logs(p_days int default 30)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from api_request_logs where started_at < now() - make_interval(days => p_days);
  get diagnostics n = row_count;
  delete from cached_queries where expires_at < now() - interval '7 days';
  delete from data_coverage where expires_at < now() - interval '30 days' and status = 'EMPTY';
  return n;
end $$;

revoke all on function public.upsert_fiscal_facts(jsonb) from public, anon, authenticated;
revoke all on function public.touch_cached_query(text) from public, anon, authenticated;
revoke all on function public.admin_db_usage(bigint) from public, anon, authenticated;
revoke all on function public.admin_dashboard_stats(timestamptz) from public, anon, authenticated;
revoke all on function public.purge_old_logs(int) from public, anon, authenticated;
grant execute on function public.upsert_fiscal_facts(jsonb) to service_role;
grant execute on function public.touch_cached_query(text) to service_role;
grant execute on function public.admin_db_usage(bigint) to service_role;
grant execute on function public.admin_dashboard_stats(timestamptz) to service_role;
grant execute on function public.purge_old_logs(int) to service_role;
grant execute on function public.search_entities(text, public.entity_type[], int) to anon, authenticated, service_role;
