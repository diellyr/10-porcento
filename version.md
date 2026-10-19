# Versão do Brasil Fiscal e do MEUS 10%

**Versão atual: 0.6.1**

A versão segue [SemVer](https://semver.org/lang/pt-BR/) (`MAIOR.MENOR.CORREÇÃO`) e aparece ao lado do nome da ferramenta
(cabeçalho do site, painel admin, tela de login e, no jogo, ao lado do título MEUS 10% no menu e na página inicial). A fonte única do número é o campo `version` do `package.json`; este
arquivo guarda o histórico, e um teste (`tests/unit/version.test.ts`) falha se os dois divergirem.

## Aviso de atualização para quem usa o site

Toda vez que uma versão nova entra no ar, quem estiver com o site (ou o aplicativo instalado) aberto vê o aviso **“Nova versão
disponível — Atualizar agora / Depois”**. O navegador compara a versão embutida no código que ele carregou com a que o servidor
informa em `/api/version`, ao abrir, ao voltar para a aba e a cada 10 minutos. **Por isso, toda publicação precisa subir o
número da versão** (passo 1 abaixo): sem mudar o número, ninguém é avisado.

## Como lançar uma nova versão
1. `npm version <patch|minor|major> --no-git-tag-version` (atualiza `package.json` e `package-lock.json`).
2. Em `version.md`, troque o número em **Versão atual** e adicione a entrada nova no topo do histórico, com a data.
3. Commit e merge na `main`: a Cloudflare publica automaticamente.

- **CORREÇÃO** (0.2.1): conserto sem mudar o que o usuário vê.
- **MENOR** (0.3.0): funcionalidade nova compatível.
- **MAIOR** (1.0.0): mudança incompatível ou marco de produção.

## Histórico

### 0.6.1 — 2026-10-19
- **MEUS 10%**: botão **"Jogar esta fase de novo"** na tela final de qualquer fase — recomeça a fase do início (as anteriores ficam) para tentar outro caminho, com bons ou maus resultados. Funciona também em partidas com conta (o servidor reproduz o mesmo recomeço).
- Nova identidade visual do menu e da página inicial.

### 0.6.0 — 2026-10-19
- **MEUS 10%**: carreira completa em 7 níveis (48 casos): Administrador de UPA → Secretário Municipal → Articulador Regional → Secretário Estadual → Diretor de Órgão Federal → Ministro → Presidência (eleição simulada), com finais "Presidente" e "Imperador Supremo".
- Botão **"Ir para a próxima fase"** em destaque no topo da tela final; lista o que falta quando a promoção não é liberada. Subida pelas conexões na trajetória de desvio.
- Mapas 2D e salas 3D low-poly para todos os níveis; 15 personagens novos; relatório com plano de melhoria por nível.
- Correção: partidas salvas antes dos níveis (sem o campo de nível) agora são migradas ao carregar — o botão da próxima fase aparece e a tela final mostra o nível certo.
- Login: "Entrar com outra conta" (admin e jogo), com sugestão `ti@local`; tela de erro própria do jogo.
- A versão passa a aparecer ao lado do nome **MEUS 10%**.

### 0.5.0 — 2026-10-09
- **MEUS 10%**: novo jogo (aventura investigativa satírica de gestão pública) sobre a base do Brasil Fiscal. Página inicial `/` agora é a do jogo; o Brasil Fiscal passa a ficar em `/brasil-fiscal` (todas as páginas de dados seguem iguais).
- Campanha da UPA (10 casos), motor de regras testado, cenários 2D, busto 3D e cena 3D de braço/mão/caneta (provisórios), Caderno de Gestão, relatório, perfis (`/entrar`, `/perfil`), API `/api/game/*` e migration `0011` (estrutura do jogo no Supabase). Detalhes em `docs/DECISOES_JOGO.md`, `docs/ASSETS_PENDENTES.md` e `docs/SUPABASE_JOGO.md`.

### 0.4.8 — 2026-10-08
- Página inicial: cada card do “Brasil em números” é clicável e leva ao menu correto — Arrecadação → De onde vem, Despesas → Para onde vai, Resultado → Explorar dados, Dívida → Dívida. (Nas páginas de estado e município os cards continuam sem link, porque esses menus ainda abrem no Brasil.)

### 0.4.7 — 2026-10-08
- Porcentagem em todos os gráficos: “De cada R$ 100” (parte do total em %), evolução por ano (variação % em relação ao ano anterior, no gráfico e abaixo dele), principais fornecedores/órgãos em Contratos (% do total, com barra) e Rankings (% da lista). O detalhamento por área já mostrava %.

### 0.4.6 — 2026-10-08
- “Para onde vai / De onde vem” no celular: nome, valor e “R$ por 100” não se sobrepõem mais (o nome ocupa a linha de cima; valores e o botão “O que é isso?” ficam abaixo).

### 0.4.5 — 2026-10-08
- “De cada R$ 100”: cada item ganhou o botão amarelo **“O que é isso?”**, que abre uma janela com explicação curta em linguagem simples (áreas de governo, tipos de gasto, origens de receita e tributos).
- Receita “2.9 Outras receitas de capital” agora aparece com nome em vez do código.

### 0.4.4 — 2026-10-08
- Tesouro Nacional: `category_type` do dataset `tesouro.divida_publica` corrigido para `DEBT_FEDERAL` (a importação era rejeitada com “categoria DEBT fora do dataset”).
- Ao salvar a configuração de uma fonte de arquivo, `metric`/`category_type`/dataset/colunas/escala são validados contra o catálogo, com mensagem indicando o campo e os valores permitidos; os modelos do painel agora vêm do catálogo.
- Logs da fonte: importação rejeitada após download HTTP 200 aparece como `import … (rejeitada)` preservando o status HTTP real.

### 0.4.3 — 2026-10-08
- **Aviso de atualização**: quando há versão nova, o site e o aplicativo instalado mostram “Nova versão disponível” com os botões “Atualizar agora” e “Depois”. Novo endpoint `GET /api/version`.

### 0.4.2 — 2026-10-08
- **Corrigido** o parser da despesa por função do SICONFI (DCA Anexo I-E): a API devolve `cod_conta = "TotalDespesas"` e a função/subfunção no campo `conta` (`"01 - Legislativa"`, `"01.031 - Ação Legislativa"`); antes todas as linhas eram descartadas (“nenhuma reconhecida pelo parser”).
- Empenhado, liquidado e pago preservados; totalizadores, cabeçalhos de bloco, “Demais Subfunções” e o bloco intraorçamentário ficam de fora para não haver dupla contagem; chaves de registro únicas por função/subfunção.

### 0.4.1 — 2026-10-08
- **Corrigido** `transparencia.despesas_orgao` (Portal da Transparência): a chamada enviava só `ano` e `pagina` e recebia HTTP 400. Agora lista os órgãos em `/orgaos-siafi` (paginado, sem repetição) e consulta cada um com `orgao=<SIAFI>`, preservando a paginação das despesas e sem duplicar registros.
- Quando a fonte não entrega todos os órgãos de uma vez (limite de requisições), o resultado é **parcial**: o que veio é salvo, a unidade não é marcada como coberta e a resposta avisa; as chamadas seguintes continuam de onde pararam. Nunca é apresentado como total nacional.
- Seleção opcional de órgãos (`config.despesasOrgaos`) e filtro configurável (`orgao` / `orgaoSuperior`).

### 0.4.0 — 2026-10-08
- **Importar CSV por fonte** (painel admin → Fontes de Dados → Importar CSV): modelo de CSV por conjunto de dados, mapeamento de colunas, codificação/separador/decimal, conferência por linha, progresso e histórico com **Desfazer**.
- **CSV primeiro, API depois**: a cobertura das unidades importadas passa a valer por 10 anos, então o Query Router serve o CSV e só chama a API para o que o arquivo não cobre. A importação substitui os dados da mesma unidade (sem dupla contagem) e a origem aparece como “(CSV)”.
- Banco: migration 0010 (`data_imports`, `data_coverage.import_id`, função `import_fiscal_facts`), já aplicada.

### 0.3.3 — 2026-10-08
- **Novo logotipo**: símbolo em verde, amarelo e azul-marinho (cabeçalho, login, painel admin, favicon e ícones do aplicativo instalável).
- Cabeçalho: o menu completo aparece a partir de telas largas (1280 px); abaixo disso usa o botão de menu, e o nome “Brasil Fiscal” não quebra mais em duas linhas.

### 0.3.2 — 2026-10-08
- Painel admin → Configurações: **Configurações pendentes** agora lista as **fontes de dados** sem chave de API (Portal da Transparência, dados.gov.br) ou sem endereço dos arquivos CSV (Receita Federal, Tesouro Nacional), com o botão do site onde a chave é criada e o atalho para cadastrá-la em Fontes de Dados.
- As variáveis do ambiente (Cloudflare) passam para uma seção recolhida, que só abre sozinha se faltar alguma obrigatória.

### 0.3.1 — 2026-10-08
- Painel admin → Configurações: seção **Configurações pendentes** no topo, com “Como obter” e botão para o site onde cada chave é criada (Supabase, Portal da Transparência, dados.gov.br, Upstash) e onde salvar na Cloudflare; as já definidas ficam em **Configuradas**.
- A validação do `CREDENTIALS_ENCRYPTION_KEY` e do `CRON_SECRET` passa a seguir as regras reais do app, e o painel avisa quando o MFA está desativado.

### 0.3.0 — 2026-10-07
- **PWA**: o Brasil Fiscal pode ser instalado na tela inicial (Android, iPhone/iPad e computador), com manifesto, ícones (incluindo ícone adaptável) e atalhos (Para onde vai, Municípios, Rankings).
- Service worker seguro: dados fiscais, APIs e áreas de login/admin nunca vêm de cache; só arquivos estáticos com hash e ícones são guardados. Sem rede, aparece uma página offline explicando o motivo e um aviso “Sem conexão”.
- Botão “Instalar aplicativo” no rodapé (e instrução para iPhone). CSP com `worker-src` e `manifest-src` restritos à própria origem.

### 0.2.7 — 2026-10-07
- Menu **Admin** no cabeçalho do site (desktop e celular), levando ao painel `/admin`.
- Conta administradora provisória criada no banco; guia explica como entrar sem MFA com `ADMIN_REQUIRE_MFA=0` e como trocar a senha.

### 0.2.6 — 2026-10-07
- Diagnóstico do SICONFI: quando a resposta chega mas nenhuma linha é reconhecida (despesa por função, natureza ou dívida), o erro passa a incluir um resumo das colunas e rótulos recebidos (sem valores), visível em `/admin/logs` e `/admin/saude`. A dívida (RGF) deixa de ser salva como “sem dados” nesse caso.

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
