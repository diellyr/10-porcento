-- Brasil Fiscal :: 0009 — rankings sobre dados JÁ SALVOS, com cobertura explícita
-- Só considera entes que têm fato salvo para o recorte; devolve também quantos entes foram considerados (covered)
-- e quantos existem no cadastro (total), para a interface nunca apresentar um ranking parcial como se fosse completo.
create or replace function public.rank_entities(
  p_entity_type public.entity_type,
  p_metric      public.fiscal_metric,
  p_category_type text,
  p_category_code text,
  p_year        int,
  p_compare_year int default null,
  p_uf          text default null,
  p_order       text default 'value_desc',   -- value_desc | value_asc | change_desc | change_asc
  p_per_capita  boolean default false,
  p_limit       int default 10)
returns table (code text, name text, uf char(2), population integer, value numeric, previous numeric, change_pct numeric, covered bigint, total bigint)
language sql stable set search_path = public as $$
  with agg as (
    select e.code, e.name, e.uf, e.population,
           sum(f.value) filter (where f.period_year = p_year) as v,
           sum(f.value) filter (where f.period_year = p_compare_year) as pv
    from entities e
    join fiscal_facts f on f.entity_id = e.id
    where e.entity_type = p_entity_type
      and (p_uf is null or e.uf = p_uf)
      and f.metric = p_metric
      and f.category_type is not distinct from p_category_type
      and (
        (p_category_code is not null and f.category_code = p_category_code)
        or (p_category_code is null and (p_category_type is distinct from 'REVENUE_SOURCE' or f.category_code ~ '^[12]\.0\.0\.0'))
      )
      and f.period_year in (p_year, coalesce(p_compare_year, p_year))
    group by e.code, e.name, e.uf, e.population
  ), scaled as (
    select code, name, uf, population,
           case when p_per_capita then v / nullif(population, 0) else v end as value,
           case when p_per_capita then pv / nullif(population, 0) else pv end as previous
    from agg
    where v is not null and (p_compare_year is null or pv is not null)
      and (not p_per_capita or coalesce(population, 0) > 0)
  ), ranked as (
    select s.*, case when previous is not null and previous <> 0 then round((value - previous) / abs(previous) * 100, 2) end as change_pct,
           count(*) over () as covered
    from scaled s
    where p_order not like 'change%' or (previous is not null and previous <> 0)
  )
  select r.code, r.name, r.uf, r.population, round(r.value, 2), round(r.previous, 2), r.change_pct,
         (select count(*) from ranked)::bigint,
         (select count(*) from entities e2 where e2.entity_type = p_entity_type and (p_uf is null or e2.uf = p_uf))::bigint
  from ranked r
  order by
    case when p_order = 'value_asc' then r.value end asc nulls last,
    case when p_order = 'value_desc' then r.value end desc nulls last,
    case when p_order = 'change_asc' then r.change_pct end asc nulls last,
    case when p_order = 'change_desc' then r.change_pct end desc nulls last,
    r.name
  limit least(greatest(p_limit, 1), 50)
$$;

grant execute on function public.rank_entities(public.entity_type, public.fiscal_metric, text, text, int, int, text, text, boolean, int) to anon, authenticated, service_role;
