-- Brasil Fiscal :: 0005 — Row Level Security
-- Princípio: dados públicos legíveis por todos; todo o resto só para administradores;
-- escritas apenas via service_role (servidor), que ignora RLS.
alter table public.profiles            enable row level security;
alter table public.data_sources        enable row level security;
alter table public.source_credentials  enable row level security;   -- sem policies: ninguém além de service_role
alter table public.api_request_logs    enable row level security;
alter table public.admin_audit_log     enable row level security;
alter table public.entities            enable row level security;
alter table public.fiscal_facts        enable row level security;
alter table public.data_versions       enable row level security;
alter table public.data_coverage       enable row level security;
alter table public.cached_queries      enable row level security;

create policy profiles_select_own   on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_select_admin on public.profiles for select to authenticated using (public.is_admin());

create policy entities_public_read on public.entities     for select to anon, authenticated using (true);
create policy facts_public_read    on public.fiscal_facts for select to anon, authenticated using (true);

create policy sources_admin_read   on public.data_sources     for select to authenticated using (public.is_admin());
create policy logs_admin_read      on public.api_request_logs for select to authenticated using (public.is_admin());
create policy audit_admin_read     on public.admin_audit_log  for select to authenticated using (public.is_admin());
create policy versions_admin_read  on public.data_versions    for select to authenticated using (public.is_admin());
create policy coverage_admin_read  on public.data_coverage    for select to authenticated using (public.is_admin());
create policy cache_admin_read     on public.cached_queries   for select to authenticated using (public.is_admin());

-- Visão pública mínima das fontes (rastreabilidade na UI): sem URL de API, config ou credenciais.
create view public.public_sources as
  select id, name, slug, provider, documentation_url, category from public.data_sources;
grant select on public.public_sources to anon, authenticated;

-- Defesa em profundidade: nenhuma escrita direta por papéis do cliente.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.source_credentials from anon, authenticated;
