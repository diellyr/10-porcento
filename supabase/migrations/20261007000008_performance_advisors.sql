-- Brasil Fiscal :: 0008 — correções de performance apontadas pelos advisors do Supabase

-- Índices de cobertura das chaves estrangeiras (acelera deletes em cascata e joins por fonte/usuário).
create index if not exists idx_audit_actor        on public.admin_audit_log (actor_id);
create index if not exists idx_cached_source      on public.cached_queries (source_id);
create index if not exists idx_coverage_source    on public.data_coverage (source_id);
create index if not exists idx_sources_disabled_by on public.data_sources (disabled_by);
create index if not exists idx_versions_source    on public.data_versions (source_id);
create index if not exists idx_entities_source    on public.entities (source_id);
create index if not exists idx_facts_source       on public.fiscal_facts (source_id);
create index if not exists idx_credentials_updated_by on public.source_credentials (updated_by);

-- Uma única policy de SELECT em profiles, com auth.uid()/is_admin() avaliados uma vez por consulta (initplan).
alter policy profiles_select_own on public.profiles
  using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists profiles_select_admin on public.profiles;
