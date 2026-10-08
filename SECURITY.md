# Segurança

| Tema | Como é tratado |
|---|---|
| Autenticação | Supabase Auth (e-mail/senha). O servidor valida a sessão com `auth.getUser()` (nunca confia só no cookie/JWT decodificado). Middleware renova a sessão e redireciona `/admin` sem login. |
| Autorização | Papel **vem do banco** (`profiles.role`), verificado em `requireAdmin()` em **toda** rota `/api/admin` e no layout `/admin`. Contas novas nascem `user`; promoção só por admin (ou `scripts/grant-admin.mjs` com service_role). O último admin não pode ser removido. Testes: `tests/unit/api-permissions.test.ts`. |
| RLS | Habilitado em todas as tabelas; leitura pública só de dados públicos; resto só admin; escrita só `service_role`. Testado em Postgres (`tests/db`). |
| Credenciais das fontes | Nunca no frontend. Salvas **cifradas** (AES-256-GCM, chave `CREDENTIALS_ENCRYPTION_KEY` fora do banco); a UI recebe só a máscara (`••••4K8J`); logs e auditoria nunca contêm o valor; URLs de log têm parâmetros sensíveis redigidos. Variáveis de ambiente servem de padrão. Perdeu a chave de cifra ⇒ recadastre as credenciais. |
| Service role | Apenas em código de servidor (`repositories/supabase/client.ts`); jamais `NEXT_PUBLIC_`. |
| Entrada | Zod em todas as entradas (consultas, admin, NL); consultas ao banco parametrizadas (PostgREST/RPC) — sem SQL montado por string; `LIKE` com escape; busca em linguagem natural **não executa SQL**: gera um `QuerySpec` validado. |
| SSRF | Cadastro: `base_url` e URLs de dataset aceitam só `https` e hosts públicos. **Em tempo de requisição** o cliente HTTP resolve o DNS e recusa qualquer endereço privado/loopback/link-local/CGNAT (v4 e v6), cobre rebinding simples e segue redirecionamentos manualmente (máx. 3), revalidando cada destino e removendo credenciais ao trocar de origem. ⚠ Resta uma janela entre resolver e conectar (TOCTOU): complemente com *egress filtering* na infraestrutura. |
| CSRF | Cookies `SameSite` + checagem de `Origin` nas mutações admin. |
| Abuso | Rate limit por IP (público e admin), limite por fonte (janela deslizante + contagem no banco), orçamento por consulta, paginação com tetos, limite de 12 anos por consulta, limite de 40 MB em downloads. Com `UPSTASH_REDIS_REST_URL/TOKEN` o limite é **global** (Redis, janela por chave); se o Redis falhar, cai para memória (fail-open, com aviso) para não derrubar o site. |
| Erros | Cidadão vê mensagens humanas (“A fonte oficial está temporariamente indisponível…”); detalhe técnico só em rotas admin. |
| Cabeçalhos / CSP | `Content-Security-Policy` (default-src 'self'; sem `object-src`; `frame-ancestors 'none'`; `connect-src` só a própria origem + Supabase), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS em produção (`src/lib/security-headers.ts`, testado). ⚠ `script-src` inclui `'unsafe-inline'` porque o Next.js injeta scripts inline na hidratação; um nonce por requisição exigiria renderizar todas as páginas dinamicamente. Origens externas de script continuam bloqueadas. |
| MFA | Administradores precisam de TOTP (Supabase Auth, AAL2): **obrigatório por padrão em produção** (`ADMIN_REQUIRE_MFA=0` desliga de propósito). Rotas `/api/admin` respondem 403 `MFA_REQUIRED`; o layout `/admin` redireciona para `/login/mfa` (cadastro do autenticador e verificação). Requer habilitar MFA no projeto Supabase. Testado com sessão simulada (AAL1/AAL2). |
| LGPD | Só dados agregados por município/ente; benefícios nunca expõem pessoas; parsers descartam campos pessoais. Contratos/fornecedores: **só pessoa jurídica** — CPF é recusado na entrada e registros de pessoa física são descartados no parser, antes de persistir; CPF/CNPJ mascarados nos logs de requisição. |
| Auditoria | `admin_audit_log`: API habilitada/desabilitada, token alterado/removido, configuração alterada, cache limpo, atualização forçada, papel alterado. |
| Dados fictícios | `BRASIL_FISCAL_DEV_FIXTURES` é ignorado/bloqueado com `NODE_ENV=production`; banner permanente quando ativo. |
| Cron | `/api/cron/health` exige `CRON_SECRET` (comparação em tempo constante). Agendado em `vercel.json` (diário, `0 6 * * *` UTC = 03:00 em Brasília): a Vercel envia sozinha `Authorization: Bearer $CRON_SECRET` quando a variável existe no projeto. O cron só passa a rodar **depois do deploy na Vercel com `CRON_SECRET` definida**. Alternativa fora da Vercel: `pg_cron` + `pg_net` chamando a URL pública com o mesmo cabeçalho. Sem polling contínuo. |

## Rotação da chave de cifra

1. `openssl rand -base64 32` → nova chave. 2. Defina `CREDENTIALS_ENCRYPTION_KEY=<nova>` e `CREDENTIALS_ENCRYPTION_KEY_PREVIOUS=<antiga>` (leitura tenta as duas; escrita usa a nova). 3. `node --env-file=.env.local scripts/rotate-credentials-key.mjs` re-cifra todas as credenciais (e audita). 4. Remova a `_PREVIOUS`.

## CI e dependências

`.github/workflows/ci.yml`: tipos, testes (incl. migrations em Postgres/PGlite), build, varredura de segredos e `npm audit --omit=dev --audit-level=high`. Dependabot semanal. `package.json` fixa `postcss >= 8.5.23` (override) para corrigir advisories do PostCSS embutido no Next; hoje `npm audit --omit=dev` retorna 0 vulnerabilidades.

## Advisors do Supabase (projeto real)

Segurança: sem ERROR/WARN do app; restam INFO/WARN intencionais ou alheios (`source_credentials` sem policy — só `service_role`; `is_admin` executável por `authenticated` — usada pelas policies; `rls_auto_enable` — não é do app). Performance: índices de FK criados (migração 0008) e policy de `profiles` unificada com `(select auth.uid())`; **pendente**: remover a policy redundante `profiles_select_admin` (`drop policy if exists profiles_select_admin on public.profiles;`) — a ferramenta usada para aplicar migrations travou nesse `DROP`; rode no SQL Editor. Índices “não usados” são normais em banco novo.

## Pendências antes de produção

Teste com Supabase e APIs governamentais reais; habilitar MFA no projeto Supabase; definir `CRON_SECRET`, `CREDENTIALS_ENCRYPTION_KEY` e (opcional) Upstash; egress filtering; nonce de CSP se quiser eliminar `'unsafe-inline'`.
