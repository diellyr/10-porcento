-- Brasil Fiscal :: 0006 — visão administrativa dos dados armazenados
create or replace function public.admin_data_overview()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'by_source_metric', coalesce((select jsonb_agg(t) from (
        select s.slug as source, f.metric::text as metric, count(*) as facts,
               min(f.period_year) as year_min, max(f.period_year) as year_max, max(f.fetched_at) as last_fetched
        from fiscal_facts f join data_sources s on s.id = f.source_id
        group by s.slug, f.metric order by s.slug, f.metric) t), '[]'::jsonb),
    'entities_by_type', coalesce((select jsonb_agg(t) from (
        select entity_type::text as type, count(*) as total from entities group by entity_type order by total desc) t), '[]'::jsonb),
    'recent_versions', coalesce((select jsonb_agg(t) from (
        select v.detected_at, v.previous_value, v.new_value, f.metric::text as metric, f.category_code, f.period_year, e.name as entity
        from data_versions v join fiscal_facts f on f.id = v.fact_id join entities e on e.id = f.entity_id
        order by v.detected_at desc limit 20) t), '[]'::jsonb),
    'coverage_total', (select count(*) from data_coverage),
    'coverage_expired', (select count(*) from data_coverage where expires_at < now())
  )
$$;
revoke all on function public.admin_data_overview() from public, anon, authenticated;
grant execute on function public.admin_data_overview() to service_role;
