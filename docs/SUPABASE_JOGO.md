# MEUS 10% — conectar ao Supabase (quando for a hora)

O jogo funciona **sem** Supabase (convidado: salva no aparelho). Para perfis, salvamento na conta e validação no servidor:

1. **Projeto Supabase** com as variáveis já usadas pelo Brasil Fiscal: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (esta última só no servidor).
2. **Aplicar as migrations** em ordem (a nova é `supabase/migrations/20261008000011_game_meus10.sql`; ela depende das anteriores: usa `public.set_updated_at()` e `auth.users`). Com a CLI: `supabase link` + `supabase db push`. **Não altere o banco sem migration.**
3. Em **Authentication → Providers → Email**: habilite e-mail/senha. Se a confirmação de e-mail estiver ligada (padrão), o jogador confirma pelo link; em **URL Configuration** inclua `https://SEU-DOMINIO/entrar` em *Redirect URLs* (usado em confirmação e recuperação de senha).
4. Criou o perfil de jogador? Ele ganha `profiles.role = 'user'` (sem acesso ao `/admin`). Administradores continuam sendo promovidos por `scripts/grant-admin.mjs`.
5. (Opcional) **Storage**: a migration cria o bucket privado `game-audio` (cache da voz neural) quando o Storage existe.
6. (Opcional) voz neural e IA: `ELEVENLABS_API_KEY`, `TTS_VOICE_<PERSONAGEM>`, `ANTHROPIC_API_KEY` (ver `docs/ASSETS_PENDENTES.md`).
7. Rode `npm test` (inclui `tests/db/game.test.ts`, que aplica todas as migrations em um Postgres de teste).

Tabelas: `game_profiles`, `game_scenarios`, `game_saves`, `game_events`, `game_notebook_entries`, `game_achievements`, `game_reports`, `game_usage`. RLS ativo: o jogador **só lê o que é seu**; toda escrita passa pelo servidor com `service_role` (funções `game_create_save`, `game_commit_action`, `game_usage_take`).
