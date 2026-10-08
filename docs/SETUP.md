# Passo a passo para colocar o Brasil Fiscal no ar

Projeto Supabase já criado e migrado: **Projeto_brasil_fiscal_db** (`tyhhowdudxwzowqhheng`, região sa-east-1).
URL: `https://tyhhowdudxwzowqhheng.supabase.co`

## Como este guia funciona (sem rodar nada no seu computador)
O `.env.local` **não vai para o git** (está no `.gitignore`, de propósito: segredos nunca ficam no repositório). Como você
trabalha só pelo git, os segredos ficam **na Vercel** (Environment Variables) e o app roda lá. Tudo abaixo é feito em sites.

## 1. Segredos (guardar na Vercel, nunca no git)
Você vai precisar destes 6 valores. Anote-os num gerenciador de senhas até colar na Vercel (passo 6):

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tyhhowdudxwzowqhheng.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_YlrayFVxs1tZGyAojLUfaw_FpxZehHe` (chave pública, pode ficar exposta) |
| `SUPABASE_SERVICE_ROLE_KEY` | https://supabase.com/dashboard/project/tyhhowdudxwzowqhheng/settings/api-keys → chave **service_role/secret** |
| `CREDENTIALS_ENCRYPTION_KEY` | gere 32 bytes aleatórios em base64 (ex.: https://generate-random.org/api-key-generator ou `openssl rand -base64 32` em qualquer terminal) |
| `CRON_SECRET` | qualquer texto aleatório longo (32+ caracteres) |
| `NEXT_PUBLIC_SITE_URL` | a URL final da Vercel (ex.: `https://brasil-fiscal.vercel.app`) |

**Guarde o `CREDENTIALS_ENCRYPTION_KEY`**: sem ele as credenciais já cifradas ficam ilegíveis.

## 2. Deploy primeiro (Vercel) — veja o passo 6
Faça o passo 6 antes dos passos 3 a 5: o app só funciona com as variáveis acima configuradas na Vercel.

## 3. Primeiro administrador (tudo pelo site do Supabase)
1. Supabase → **Authentication → Users → Add user** (e-mail + senha, marque *Auto Confirm*).
2. Supabase → **SQL Editor**, rodar (troque o e-mail):
```sql
update public.profiles set role = 'admin' where email = 'seu@email.com';
```
(Equivale ao `scripts/grant-admin.mjs`, que só é necessário se você tiver um terminal.)
3. Abra `https://SUA-URL/login`. Em produção o painel `/admin` exige MFA: cadastre o autenticador em `/login/mfa`.
4. Supabase → **Authentication → Sign In / Providers → Multi-Factor** → habilitar **TOTP**.

## 4. Limpeza pendente (SQL Editor do Supabase)
Supabase → **SQL Editor**, rodar:
```sql
drop policy if exists profiles_select_admin on public.profiles;
```
(A policy é redundante com `profiles_select_own` + `is_admin()`; o app funciona sem esta etapa.)

## 5. Chaves das fontes de dados
- **Portal da Transparência**: gere a chave grátis em https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email
  e cadastre em `/admin/fontes` → fonte *Portal da Transparência* → credencial.
- **dados.gov.br** (opcional): token em https://dados.gov.br (perfil → Token de acesso).
- **Receita Federal / Tesouro (CSV)**: em `/admin/fontes` → **Adicionar fonte**, informe a URL https do CSV e o mapeamento de colunas.
- Depois clique **Testar conexão** em cada fonte; falhas aparecem em `/admin/logs`.

## 5. Chaves das fontes de dados (pelo painel do app, já no ar)
- **Portal da Transparência**: gere a chave grátis em https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email
  e cadastre em `/admin/fontes` → fonte *Portal da Transparência* → credencial.
- **dados.gov.br** (opcional): token em https://dados.gov.br (perfil → Token de acesso).
- **Receita Federal / Tesouro (CSV)**: em `/admin/fontes` → **Adicionar fonte**, informe a URL https do CSV e o mapeamento de colunas.
- Depois clique **Testar conexão** em cada fonte; falhas aparecem em `/admin/logs`.

## 6. Deploy na Vercel
1. https://vercel.com/new → importe o repositório `diellyr/Projeto_brasil_fiscal`.
2. **Settings → Environment Variables** (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `CREDENTIALS_ENCRYPTION_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` (URL final).
   Não defina `BRASIL_FISCAL_DEV_FIXTURES` (é bloqueado em produção).
3. Deploy. O cron diário (`vercel.json`, 06:00 UTC → `/api/cron/health`) usa o `CRON_SECRET` automaticamente.
4. Supabase → **Authentication → URL Configuration**: Site URL = a URL da Vercel.

## 7. Conferir (use a URL da Vercel)
- `/admin/saude`: fontes ONLINE/OFFLINE. `/admin/dados`: contagem de entidades/fatos crescendo conforme as consultas.
- Home → pesquisar um município → o dado deve vir com a fonte e a data.
- Se algum adaptador falhar contra a API real, o erro aparece em `/admin/logs` (os parsers foram escritos pela
  documentação e testados só com dados sintéticos): envie a resposta de exemplo para ajuste.

## Opcional
- Rate limit distribuído: `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
- `DATABASE_LIMIT_MB` (padrão 500) para o alerta de uso do banco.
