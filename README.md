# Brasil Fiscal

Plataforma web para qualquer brasileiro entender **quanto o Brasil arrecada e gasta** — União, estados e municípios — com dados oficiais, **fonte sempre visível** e linguagem simples. Politicamente neutra: apresenta dados, evolução e comparações, sem interpretação partidária.

> **Simples para o usuário, rigoroso com os dados.** Nenhum valor perde sua origem; nenhum número é inventado.

## Arquitetura em uma frase

**Consulta sob demanda + cache inteligente + persistência progressiva**: o frontend fala só com a *Brasil Fiscal API*; o *Query Router* responde do Supabase quando há dado válido e, senão, consulta a fonte oficial, normaliza, valida, salva e responde. Detalhes em [ARCHITECTURE.md](ARCHITECTURE.md).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Recharts · Supabase (PostgreSQL, Auth, RLS) · Vitest (+ PGlite para testar as migrations).

> Quer colocar no ar? Siga o **[guia de implantação para iniciantes](docs/GUIA_IMPLANTACAO.md)**.

## Rodando

```bash
npm install
cp .env.example .env.local        # preencha (veja abaixo)
# aplique as migrations em supabase/migrations/ (Supabase CLI: `supabase link` + `supabase db push`)
npm run dev
```

1. Crie um projeto Supabase e preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Gere `CREDENTIALS_ENCRYPTION_KEY` (`openssl rand -base64 32`) e `CRON_SECRET` (`openssl rand -hex 32`).
3. Aplique as migrations (`supabase/migrations/*.sql`, em ordem). **Nunca altere o banco sem migration.**
4. Crie um usuário em *Supabase → Authentication → Users* e promova-o a administrador:
   `node --env-file=.env.local scripts/grant-admin.mjs voce@exemplo.com`
5. Acesse `/login` → `/admin/fontes`. Na primeira execução as 6 fontes são cadastradas automaticamente em `data_sources`.
6. Para o Portal da Transparência, cadastre a chave em *Admin → Fontes de Dados → Configurar* (ou `PORTAL_TRANSPARENCIA_API_KEY`).

Pesquise “Praia Grande” na home: o cadastro de entes (União, 27 UFs, 5.570 municípios) é carregado do SICONFI (fallback IBGE) na primeira busca; os números aparecem conforme as consultas acontecem e ficam salvos.

### Modo desenvolvimento com fixtures (opcional)

`BRASIL_FISCAL_DEV_FIXTURES=1 npm run dev` roda o **pipeline real** contra respostas **sintéticas**, em memória, sem Supabase. Um banner permanente avisa “dados sintéticos — não oficiais”. É bloqueado quando `NODE_ENV=production`. Serve para desenvolver UI e demonstrar o fluxo; **nunca** para publicar.

## Cron diário

`GET /api/cron/health` (testa as fontes ativas e poda logs/cache antigos) roda todo dia às 06:00 UTC (03:00 BRT) por um Cron Trigger da Cloudflare, configurado em `wrangler.jsonc`; ele envia `Authorization: Bearer $CRON_SECRET`. **Só passa a rodar depois do deploy na Cloudflare com `CRON_SECRET` definido** — veja o [guia de implantação](docs/GUIA_IMPLANTACAO.md).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run cf:build` / `cf:preview` / `cf:deploy` | build para Cloudflare Workers (OpenNext), pré-visualização local (`wrangler dev`, variáveis em `.dev.vars`) e deploy manual |
| `npm run lint` | verificação de tipos (`tsc --noEmit`) |
| `npm test` | testes unitários + migrations em Postgres (PGlite) |
| `npm run test:db` | só as migrations/RLS/funções SQL |
| `npm run test:e2e` | Playwright: acessibilidade (axe, WCAG 2.1 A/AA em 15 páginas) e fluxos principais, contra o app em modo dev com fixtures (local: `PW_CHROMIUM_PATH=/caminho/chromium`; no CI instala o navegador) |

## Estado da implementação (honesto)

**Implementado e testado automaticamente:** modelo PostgreSQL + migrations + RLS (validados em Postgres real via PGlite); Source Registry; painel admin (ativar/desativar, testar, credenciais cifradas, TTL/prioridade/limite, logs, saúde, cache, dados, usuários, auditoria, uso do banco); Query Router (cache, cobertura por unidade, fallback, fonte offline/desativada, orçamento por consulta); versionamento e deduplicação; adaptador SICONFI (DCA I-C/I-D/I-E, RGF-02, entes), Portal da Transparência (despesas por órgão, Bolsa Família, BPC), IBGE (cadastro), dados.gov.br (catálogo), adaptador genérico de CSV (Receita/Tesouro); **contratos e fornecedores** (busca por CNPJ ou órgão+ano, resumo, paginação, LGPD); "+ Adicionar fonte" pelo painel (espelhos/alternativas e CSV genérico, com fallback por prioridade); mapa de navegação dos 27 estados; telas Home, R$100 (gasto/arrecadação), Estados, Municípios, Receitas, Despesas (drill-down), Dívida, Benefícios, Contratos, Explorador, Glossário, Pergunte; busca em linguagem natural (parser → JSON → validador → QuerySpec, sem SQL).

**Ainda NÃO verificado contra serviços reais** (o ambiente de desenvolvimento não alcançava `*.gov.br` nem um Supabase): (a) os adaptadores foram escritos a partir da documentação pública e testados com **fixtures sintéticas**; nomes de colunas/códigos de conta reais do SICONFI e do Portal da Transparência podem exigir ajuste de parser (parsers são tolerantes, descartam o que não entendem e **falham de forma explícita** — “N linhas recebidas, nenhuma reconhecida” — em vez de chutar); (b) as consultas PostgREST dos repositórios Supabase não foram executadas contra um Supabase real (as funções SQL foram). Veja [DATA_SOURCES.md](DATA_SOURCES.md) para o status de cada integração e o checklist de primeira validação.

**Não implementado nesta versão:** licitações, servidores, viagens, cartões, emendas, convênios, programa/ação/pagamento no drill-down, mapa colorido por indicador (hoje é só de navegação), `Transferências` como métrica própria, rankings entre municípios na busca em linguagem natural.

## Validação no Supabase real (parte 2, em andamento)

Projeto `Projeto_brasil_fiscal_db` (sa-east-1): migrations 0001–0003, 0005–0007 aplicadas, mais `upsert_fiscal_facts` reescrita sem tabelas temporárias. Validado em Postgres 17 real: upsert/versionamento/deduplicação, órgão relacionado, busca, estatísticas e uso do banco; RLS ativo em todas as tabelas; advisors de segurança sem ERROR (restam itens intencionais: `source_credentials` sem policy, `is_admin` executável por `authenticated`, e `rls_auto_enable`, que não é do app).
**Poda de logs:** feita pelo app (`/api/cron/health` → `analytics.purgeOld`, via cliente Supabase), pois a ferramenta usada para aplicar migrations recusa funções com `DELETE`. A função SQL `purge_old_logs` do repositório é opcional e **não** está aplicada no banco real; `purgeable_counts()` (somente leitura) está. **Pendente:** chamadas reais às APIs do governo e teste das consultas PostgREST dos repositórios (exigem rede e chaves).

## Item 11 — endurecimento (feito)

CSP + HSTS e demais cabeçalhos; rate limit global opcional via Redis (Upstash); **MFA TOTP obrigatório para admins em produção** (`/login/mfa`); anti-SSRF em tempo de requisição (DNS + redirecionamentos); rotação da chave de cifra (script + chave `_PREVIOUS`); CI (GitHub Actions) e Dependabot; dependências sem vulnerabilidades conhecidas; índices de FK e policy unificada no Supabase real. Detalhes e limitações em [SECURITY.md](SECURITY.md).

## Rankings

`/rankings` e perguntas como “Quais municípios de SP mais aumentaram despesas?”: ordenação por valor ou variação, per capita, filtro por UF/área, sempre com a **cobertura** (“considera 12 de 645 municípios com dado salvo”). Para estados há “Completar dados dos 27 estados”.

## Não feito por exigir formato real das fontes (não vou adivinhar)

Licitações, RREO/MSC e detalhamento por programa/ação/pagamento dependem de respostas reais das APIs (campos e restrições que não consegui confirmar sem rede). O padrão para implementá-los é o mesmo de contratos: adaptador + parser tolerante + testes com fixtures, depois validação com a API real.

## Documentação

**[Versão e histórico](version.md)** · **[Guia de implantação passo a passo](docs/GUIA_IMPLANTACAO.md)** · [ARCHITECTURE.md](ARCHITECTURE.md) · [DATABASE.md](DATABASE.md) (ERD, tabelas, índices, RLS) · [DATA_SOURCES.md](DATA_SOURCES.md) · [API.md](API.md) · [SECURITY.md](SECURITY.md)
