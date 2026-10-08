# Versão do Brasil Fiscal

**Versão atual: 0.2.5**

A versão segue [SemVer](https://semver.org/lang/pt-BR/) (`MAIOR.MENOR.CORREÇÃO`) e aparece ao lado do nome da ferramenta
(cabeçalho do site, painel admin e tela de login). A fonte única do número é o campo `version` do `package.json`; este
arquivo guarda o histórico, e um teste (`tests/unit/version.test.ts`) falha se os dois divergirem.

## Como lançar uma nova versão
1. `npm version <patch|minor|major> --no-git-tag-version` (atualiza `package.json` e `package-lock.json`).
2. Em `version.md`, troque o número em **Versão atual** e adicione a entrada nova no topo do histórico, com a data.
3. Commit e merge na `main`: a Cloudflare publica automaticamente.

- **CORREÇÃO** (0.2.1): conserto sem mudar o que o usuário vê.
- **MENOR** (0.3.0): funcionalidade nova compatível.
- **MAIOR** (1.0.0): mudança incompatível ou marco de produção.

## Histórico

### 0.2.5 — 2026-10-07
- `npm run cf:release` compila o site se ainda não houver build, então não falha quando colocado no campo errado da Cloudflare.
- Guia: nomes dos menus em português (Configurações, Compilação, Variáveis e segredos de compilação), aviso para não confundir
  os campos de compilação e implantação e a seção de variáveis de execução.

### 0.2.4 — 2026-10-07
- Os segredos passam a ser cadastrados em um único lugar (variáveis de build da Cloudflare) e o deploy os envia ao Worker (`npm run cf:release` → `scripts/sync-secrets.mjs`), eliminando a dependência da tela de variáveis de execução.
- Guia (passos 5.2, 5.3 e 6) atualizado.

### 0.2.3 — 2026-10-07
- `/api/health` passa a mostrar a versão em execução e uma lista `invalid` com variáveis definidas em formato errado (ex.: o comando `openssl` colado como valor).
- `CREDENTIALS_ENCRYPTION_KEY` agora aceita também um texto aleatório de 32+ caracteres (além de 32 bytes em base64), facilitando gerar pelo gerenciador de senhas; chaves no formato antigo continuam válidas.
- Guia: esclarece que o valor é o texto gerado (não o comando) e que salvar a variável exige uma implantação.

### 0.2.2 — 2026-10-07
- As chaves públicas do Supabase passam a vir do `wrangler.jsonc`, reduzindo as variáveis a cadastrar manualmente no Worker para 4 (3 secretas + `NEXT_PUBLIC_SITE_URL`).
- A verificação diária deixa de depender de `NEXT_PUBLIC_SITE_URL` (a chamada é em processo).
- Guia: explica a diferença entre variáveis de *build* e de *execução* e como interpretar o `/api/health`.

### 0.2.1 — 2026-10-07
- Novo diagnóstico público `GET /api/health`: mostra quais variáveis estão definidas (nunca os valores) e se o banco responde.
- Corrigido o aviso “Configuração necessária”, que aparecia para qualquer erro cuja mensagem citasse “supabase”; agora só aparece quando as variáveis do servidor realmente faltam, e os demais erros vão para os logs.

### 0.2.0 — 2026-10-07
- Publicação na Cloudflare Workers (OpenNext) com verificação diária por Cron Trigger; GitHub como origem do deploy.
- Guia de implantação passo a passo (GitHub + Cloudflare + Supabase) e modelo de variáveis.
- Número da versão exibido ao lado do nome da ferramenta; `version.md` criado.
- Removido o empacotamento Docker/Caddy e a configuração de Vercel.

### 0.1.0 — 2026-10-07
- Primeira versão completa: consulta sob demanda com cache e persistência progressiva, Source Registry, painel admin
  (ativar/desativar fontes, testar, credenciais cifradas, logs, saúde, cache, auditoria), Query Router com fallback.
- Adaptadores SICONFI, Portal da Transparência, IBGE, dados.gov.br e CSV genérico.
- Telas públicas: Home, R$ 100, Estados, Municípios, Receitas, Despesas, Dívida, Benefícios, Contratos, Rankings,
  Explorador, Glossário e pergunta em linguagem natural.
- Segurança: RLS, CSP/HSTS, MFA, anti-SSRF, rate limit, LGPD (só CNPJ). Acessibilidade WCAG AA verificada com axe.
