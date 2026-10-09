-- MEUS 10% :: 0011 — estrutura do jogo (perfis, partidas, eventos, caderno, conquistas, relatórios, limites de uso)
-- Princípios: o navegador NUNCA altera partidas. Toda escrita passa pelo servidor (service_role), que revalida cada ação com o
-- motor de regras. Jogadores só LEEM o que é seu (RLS). Credenciais privilegiadas ficam fora do navegador.

create table public.game_profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null check (char_length(display_name) between 2 and 28),
  avatar         text not null default 'av1' check (avatar ~ '^av[1-9]$'),
  pseudonym      text check (pseudonym is null or char_length(pseudonym) between 2 and 24),
  share_results  boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Versão congelada dos dados de referência de um cenário (compartilhada entre partidas comparáveis).
create table public.game_scenarios (
  hash        text primary key,
  scenario_id text not null,
  kind        text not null check (kind in ('ficticio','referenciado')),
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

create table public.game_saves (
  id               uuid primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  scenario_hash    text not null references public.game_scenarios(hash),
  rules_version    text not null,
  content_version  text not null,
  version          integer not null default 0 check (version >= 0),
  phase            text not null,
  caso             integer not null default 1,
  ending_id        text,
  state            jsonb not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index game_saves_user_idx on public.game_saves (user_id, updated_at desc);
create index game_saves_scenario_idx on public.game_saves (scenario_hash);

-- Histórico de ações: cada decisão tem identificador único; reenviar a mesma ação não repete efeitos.
create table public.game_events (
  id         bigint generated always as identity primary key,
  save_id    uuid not null references public.game_saves(id) on delete cascade,
  action_id  text not null,
  seq        integer not null,
  action     jsonb not null,
  created_at timestamptz not null default now(),
  unique (save_id, action_id),
  unique (save_id, seq)
);

create table public.game_notebook_entries (
  save_id    uuid not null references public.game_saves(id) on delete cascade,
  entry_id   text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  tema       text not null,
  conceito   text not null,
  favorito   boolean not null default false,
  entry      jsonb not null,
  created_at timestamptz not null default now(),
  primary key (save_id, entry_id)
);
create index game_notebook_user_idx on public.game_notebook_entries (user_id, tema);

create table public.game_achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  save_id        uuid references public.game_saves(id) on delete set null,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.game_reports (
  save_id    uuid primary key references public.game_saves(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  report     jsonb not null,
  created_at timestamptz not null default now()
);

-- Limites de uso (voz sob demanda e IA): contador atômico por usuário/dia/tipo.
create table public.game_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default (now() at time zone 'utc')::date,
  kind    text not null check (kind in ('tts','ai')),
  calls   integer not null default 0,
  chars   integer not null default 0,
  primary key (user_id, day, kind)
);

create trigger game_profiles_updated before update on public.game_profiles for each row execute function public.set_updated_at();

/* ───────── RLS ───────── */
alter table public.game_profiles           enable row level security;
alter table public.game_scenarios          enable row level security;
alter table public.game_saves              enable row level security;
alter table public.game_events             enable row level security;
alter table public.game_notebook_entries   enable row level security;
alter table public.game_achievements       enable row level security;
alter table public.game_reports            enable row level security;
alter table public.game_usage              enable row level security;

create policy game_profiles_own   on public.game_profiles         for select to authenticated using (user_id = (select auth.uid()));
create policy game_saves_own      on public.game_saves            for select to authenticated using (user_id = (select auth.uid()));
create policy game_events_own     on public.game_events           for select to authenticated using (exists (select 1 from public.game_saves s where s.id = save_id and s.user_id = (select auth.uid())));
create policy game_notebook_own   on public.game_notebook_entries for select to authenticated using (user_id = (select auth.uid()));
create policy game_ach_own        on public.game_achievements     for select to authenticated using (user_id = (select auth.uid()));
create policy game_reports_own    on public.game_reports          for select to authenticated using (user_id = (select auth.uid()));
create policy game_usage_own      on public.game_usage            for select to authenticated using (user_id = (select auth.uid()));
-- cenários congelados são dados de referência (sem informação pessoal) e legíveis por quem joga
create policy game_scenarios_read on public.game_scenarios        for select to authenticated using (true);

-- Defesa em profundidade: nada de escrita pelos papéis do cliente; anon não lê nada do jogo.
revoke all on public.game_profiles, public.game_scenarios, public.game_saves, public.game_events, public.game_notebook_entries, public.game_achievements, public.game_reports, public.game_usage from anon, authenticated;
grant select on public.game_profiles, public.game_scenarios, public.game_saves, public.game_events, public.game_notebook_entries, public.game_achievements, public.game_reports, public.game_usage to authenticated;

/* ───────── funções (somente servidor) ───────── */

-- Reflete o estado validado nas tabelas derivadas (caderno e conquistas).
create or replace function public.game_sync_derived(p_user uuid, p_save uuid, p_state jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.game_achievements (user_id, achievement_id, save_id)
    select p_user, a, p_save from jsonb_array_elements_text(coalesce(p_state->'achievements', '[]'::jsonb)) a
    on conflict (user_id, achievement_id) do nothing;
  insert into public.game_notebook_entries (save_id, entry_id, user_id, tema, conceito, favorito, entry)
    select p_save, e->>'id', p_user, e->>'tema', e->>'conceito', coalesce((e->>'favorito')::boolean, false), e
    from jsonb_array_elements(coalesce(p_state->'notebook', '[]'::jsonb)) e
    on conflict (save_id, entry_id) do update set favorito = excluded.favorito, entry = excluded.entry;
end $$;

-- Cria a partida (e o cenário congelado) com o histórico de ações já validado pelo servidor.
create or replace function public.game_create_save(p_user uuid, p_save uuid, p_scenario jsonb, p_state jsonb, p_actions jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_hash text := p_scenario->>'hash'; v_n int;
begin
  insert into public.game_scenarios (hash, scenario_id, kind, data) values (v_hash, p_scenario->>'id', p_scenario->>'kind', p_scenario) on conflict (hash) do nothing;
  insert into public.game_saves (id, user_id, scenario_hash, rules_version, content_version, version, phase, caso, ending_id, state)
    values (p_save, p_user, v_hash, p_state->>'rulesVersion', p_state->>'contentVersion', (p_state->>'version')::int, p_state->>'phase', (p_state->>'caso')::int, p_state->'ending'->>'id', p_state);
  insert into public.game_events (save_id, action_id, seq, action)
    select p_save, a->>'id', (t.ord)::int, a->'action' from jsonb_array_elements(p_actions) with ordinality as t(a, ord);
  get diagnostics v_n = row_count;
  perform public.game_sync_derived(p_user, p_save, p_state);
  return jsonb_build_object('version', (p_state->>'version')::int, 'events', v_n);
end $$;

-- Aplica UMA ação: atômica, idempotente por action_id e com controle de versão (concorrência otimista).
create or replace function public.game_commit_action(p_user uuid, p_save uuid, p_expected int, p_action_id text, p_action jsonb, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.game_saves;
begin
  select * into v_row from public.game_saves where id = p_save and user_id = p_user for update;
  if not found then raise exception 'save_not_found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.game_events where save_id = p_save and action_id = p_action_id) then
    return jsonb_build_object('duplicate', true, 'version', v_row.version);
  end if;
  if v_row.version <> p_expected then raise exception 'version_conflict' using errcode = 'P0001'; end if;
  insert into public.game_events (save_id, action_id, seq, action) values (p_save, p_action_id, v_row.version + 1, p_action);
  update public.game_saves set state = p_state, version = v_row.version + 1, phase = p_state->>'phase', caso = (p_state->>'caso')::int,
    ending_id = p_state->'ending'->>'id', updated_at = now() where id = p_save;
  perform public.game_sync_derived(p_user, p_save, p_state);
  return jsonb_build_object('duplicate', false, 'version', v_row.version + 1);
end $$;

-- Contador de uso com teto diário (voz neural e IA): devolve false quando o limite acabou.
create or replace function public.game_usage_take(p_user uuid, p_kind text, p_chars int, p_max_calls int, p_max_chars int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_calls int; v_chars int;
begin
  insert into public.game_usage (user_id, kind) values (p_user, p_kind) on conflict do nothing;
  select calls, chars into v_calls, v_chars from public.game_usage where user_id = p_user and kind = p_kind and day = (now() at time zone 'utc')::date for update;
  if v_calls + 1 > p_max_calls or v_chars + p_chars > p_max_chars then return false; end if;
  update public.game_usage set calls = calls + 1, chars = chars + p_chars where user_id = p_user and kind = p_kind and day = (now() at time zone 'utc')::date;
  return true;
end $$;

revoke all on function public.game_sync_derived(uuid, uuid, jsonb), public.game_create_save(uuid, uuid, jsonb, jsonb, jsonb),
  public.game_commit_action(uuid, uuid, int, text, jsonb, jsonb), public.game_usage_take(uuid, text, int, int, int) from public, anon, authenticated;
grant execute on function public.game_sync_derived(uuid, uuid, jsonb), public.game_create_save(uuid, uuid, jsonb, jsonb, jsonb),
  public.game_commit_action(uuid, uuid, int, text, jsonb, jsonb), public.game_usage_take(uuid, text, int, int, int) to service_role;

-- Cache de voz neural: bucket privado (somente servidor). Ignorado onde o Storage não existe (ex.: testes locais).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('game-audio', 'game-audio', false) on conflict (id) do nothing;
  end if;
end $$;
