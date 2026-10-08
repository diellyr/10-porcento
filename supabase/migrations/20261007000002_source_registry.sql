-- Brasil Fiscal :: 0002 — Source Registry, credenciais, logs, auditoria, perfis
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

-- cria perfil automaticamente (sempre 'user'; promoção a admin só via service_role)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
$$;

create table public.data_sources (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text not null unique,
  description            text,
  provider               text not null,
  category               text not null,
  source_type            public.source_type not null,
  base_url               text not null,
  documentation_url      text,
  auth_type              public.auth_type not null default 'NONE',
  requires_auth          boolean not null default false,
  enabled                boolean not null default true,
  priority               int not null default 100,        -- menor = preferida
  rate_limit_per_minute  int not null default 60 check (rate_limit_per_minute > 0),
  cache_ttl_minutes      int not null default 1440 check (cache_ttl_minutes >= 0),
  status                 public.source_status not null default 'UNKNOWN',
  parser_version         text not null default '1',
  adapter_key            text not null,                   -- qual adaptador de código atende a fonte
  config                 jsonb not null default '{}'::jsonb,  -- headers extras, parâmetros (sem segredos)
  last_success_at        timestamptz,
  last_failure_at        timestamptz,
  last_sync_at           timestamptz,
  last_request_at        timestamptz,
  last_latency_ms        int,
  last_http_status       int,
  last_error             text,
  disabled_at            timestamptz,
  disabled_by            uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger trg_data_sources_updated before update on public.data_sources
  for each row execute function public.set_updated_at();

-- Credenciais cifradas pela aplicação (AES-256-GCM). Só service_role lê/escreve.
create table public.source_credentials (
  source_id         uuid primary key references public.data_sources(id) on delete cascade,
  secret_ciphertext text not null,
  last4             text not null,
  updated_by        uuid references auth.users(id) on delete set null,
  updated_at        timestamptz not null default now()
);

create table public.api_request_logs (
  id               bigint generated always as identity primary key,
  source_id        uuid references public.data_sources(id) on delete set null,
  query_type       text,
  endpoint         text not null,
  request_method   text not null default 'GET',
  parameters_hash  text,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  duration_ms      int,
  http_status      int,
  records_received int not null default 0,
  records_saved    int not null default 0,
  cache_hit        boolean not null default false,
  success          boolean not null default true,
  error_type       text,
  error_message    text,
  is_test          boolean not null default false
);
create index idx_api_logs_source_started on public.api_request_logs (source_id, started_at desc);
create index idx_api_logs_started on public.api_request_logs (started_at desc);

create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,
  action      text not null,
  target_type text,
  target_id   text,
  details     jsonb not null default '{}'::jsonb,   -- nunca contém segredos
  created_at  timestamptz not null default now()
);
create index idx_audit_created on public.admin_audit_log (created_at desc);
