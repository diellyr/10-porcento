-- Brasil Fiscal :: 0007 — correções apontadas pelos advisors do Supabase (projeto real)

-- A view não é usada pelo app (fontes são lidas no servidor com service_role); invoker evita bypass de RLS.
alter view public.public_sources set (security_invoker = true);

-- Trigger de criação de perfil não deve ser chamável via /rest/v1/rpc.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- is_admin() é usada apenas por policies de 'authenticated'.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

alter function public.f_unaccent(text) set search_path = '';
alter function public.set_updated_at() set search_path = '';
