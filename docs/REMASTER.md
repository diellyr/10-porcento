# MEUS 10% — Remasterização 3D

Documento vivo da remasterização. Cada fase registra o que mudou, os assets produzidos e como foi testado.

## Fase 1 — Auditoria (2026-11-21)

### Motor gráfico e arquitetura
- **Web**: Next.js 16 (App Router) + React 19 + TypeScript, publicado na Cloudflare (OpenNext). Supabase para login e saves na nuvem (opcional; o jogo funciona como convidado com save local).
- **3D**: three.js r186, cenas desenhadas em código (`src/game/ui/three/`):
  - `World3D.tsx` + `world.ts` — mundo em corte (casa de bonecas): mapa geral e salas de cada nível; câmera orbital, toque/mouse/teclado; pós-processamento (AO, bloom, profundidade de campo, correção de cor) nas qualidades Alta/Média.
  - `FaceScene.tsx` — busto do personagem nas conversas (piscar, boca falando, emoção).
  - `PenScene.tsx` — a mão com a caneta que assina as decisões.
  - `estudo/personagem.ts` — personagens procedurais de corpo inteiro (direção R2).
  - `realismo.ts` — HDRI, piso PBR, gabinete realista; `lowpoly.ts` — móveis simples (qualidade Baixa e figurantes).
- **2D equivalente**: retratos/cenários SVG (`ui/art/`) para aparelhos sem WebGL ou com 3D desligado.
- **Motor de regras puro** (`src/game/engine/`): `apply(estado, id, ação)` é a única porta de mudança de estado; o servidor reexecuta o histórico. **A cena nunca calcula dinheiro: só lê o estado.**

### Inventário de mecânicas (como estão implementadas)
| Mecânica | Onde | Estado |
|---|---|---|
| Níveis da carreira (1 UPA → 7 Presidência/Imperador) | `content/levels.ts`, `content/niveis/*`, `engine/rules.ts` (`promote`, `replay`) | completo; promoção por mérito ou "pelas conexões" |
| Poder | `engine/scoring.ts` `powerScore` (pesos 30/20/15/15/10/5/5) | completo |
| Índice de Trambicagem | `scoring.ts` `trambicagem` = Σ desviado ÷ Σ base, teto 10% | completo; aparece no HUD e no final |
| Patrimônio (fictício) | `state.personal` (`patrimonio`, `desviado`, `evidencias`) | completo; separado do caixa público |
| Guardião do Cofre | personagem `guardiao` (Tesouraria e Cofre) | completo |
| Conquistas | `content/concepts.ts` `ACHIEVEMENTS`, `state.achievements` | completo |
| Finais | `engine/endings.ts` (reconhecimento, gestão insuficiente, responsabilização, presidência, imperador) | completo |
| Eventos / casos | casos por nível, pendências e consequências (`pending`, `consequences`) | completo |
| Integração Brasil Fiscal | cenário com dados oficiais/estimativas (`content/scenario.ts`, rótulos de fonte) | completo |
| Rankings | só a preferência no perfil ("ainda não disponível") | **não existe** — não será inventado aqui |
| Loja / inventário / upgrades | — | **não existe** — fora de escopo |

### Estado dos gráficos (antes da remasterização)
- Pontos fortes: direção R2 já aplicada (personagens de corpo inteiro, HDRI, piso PBR, luz de fim de tarde); salas legíveis; boa cobertura de qualidade (Alta/Média/Baixa/2D).
- Pontos fracos: objetos ainda são caixas arredondadas geradas em código; falta "peso" visual para dinheiro, poder e patrimônio; pouca recompensa visual nas decisões e na promoção; cenários de níveis altos usam o mesmo gerador genérico; sem assets autorais modelados.

## Pipeline Blender (Fase 2)
- **Blender MCP não está conectado nesta sessão** (nenhuma ferramenta de Blender disponível). Usamos o **Blender 5.3 oficial como módulo Python** (`bpy`), que executa as mesmas operações do Blender (modelagem, modificadores, materiais Principled, keyframes, exportador glTF, render Cycles) sem janela.
- Fontes versionadas em `tools/blender/` (um script por asset + `comum.py`), saída em `public/jogo/3d/blender/*.glb`, prévias renderizadas no Cycles para conferência.
  ```
  python -m venv .venv-blender && .venv-blender/bin/pip install bpy==5.3.0
  .venv-blender/bin/python tools/blender/construir.py            # todos
  .venv-blender/bin/python tools/blender/construir.py cofre      # um asset
  ```
- No jogo: `src/game/ui/three/blender.ts` carrega cada GLB uma vez, clona por uso e dá um mixer de animação a cada clone. Assets do Blender só entram nas qualidades Alta e Média; Baixa e 2D ficam como estão.
- Capturas de QA: `node tools/capturas/capturar.mjs <pasta> <porta> <prefixo> [vistas]` (Chromium sem GPU).

## Direção de arte (Fase 3)
**"Sátira de gabinete"**: o mundo da gestão pública é crível e quente (madeira, luz de fim de tarde, gente comum); o dinheiro desviado é **exagerado, dourado e teatral** — sempre acompanhado de consequência visível (vermelho, evidência, responsabilização). O luxo é piada, não prêmio: títulos de riqueza ilícita não dão bônus (regra do jogo).

- **Paleta** (adaptada à identidade existente — azul institucional, laranja do 10%):
  - Ouro `#e8b84a` → riqueza, ostentação (só no que é patrimônio pessoal/desvio).
  - Grafite `#2c2f36` / `#1a1c21` → poder, cofres, gabinetes altos.
  - Verde `#3f8f5a` → dinheiro (notas) e patrimônio.
  - Vermelho `#c8323c` → risco, evidência, consequência.
  - Roxo `#6a4fa8` → progressão e momentos especiais (promoção, Imperador).
  - Azul `#2a5be0` e laranja `#e2701c` continuam como cores da interface e do 10%.
- **Materiais**: metal com verniz (aço grafite), ouro metálico polido, veludo vinho, papel-moeda fosco; tudo PBR para reagir ao HDRI.
- **Luz**: luz-chave quente de fim de tarde; o dinheiro tem "brilho próprio" (emissivo + bloom) — o tesouro literalmente chama atenção.
- **Escala do poder**: cada nível acrescenta ostentação ao ambiente (cofre → maletas → carros → palácio → trono), nunca escondendo os indicadores públicos que pioram.

## Plano de execução
| Fase | Entrega | Status |
|---|---|---|
| 1 Auditoria | este documento | ✅ |
| 2 Pipeline Blender + 1º asset | Cofre do Guardião (porta e volante animados), integrado na sala do Cofre | ✅ |
| 3 Identidade visual | paleta e materiais padrão no pipeline (ouro, grafite, veludo, papel-moeda, gemas) | ✅ |
| 4 Objetos | maleta, maço (instancing), moeda, troféu, coroa e trono | ✅ |
| 5 Cenários e progressão | gabinete do jogador em todos os níveis ganha ostentação pelas faixas de patrimônio | ✅ |
| 6 Animações | chuva de moedas, pulsos de Poder/Patrimônio/Trambicagem, transição de nível, coroação do Imperador | ✅ |
| 7 Interface | medidor de Trambicagem, pulsos no painel, transição de nível, vitrine 3D do patrimônio | ✅ |
| 8 Otimização | medição por quadro, sombras e LOD de cabeças, assets 34% menores | ✅ |
| 9 Testes | typecheck, 369 unitários, 38 e2e, build Cloudflare, capturas | ✅ |

## Registro por fase

### Fases 1 e 2 (0.8.0)
- **Arquivos**: `tools/blender/{comum,cofre,construir}.py`, `public/jogo/3d/blender/cofre.glb`, `src/game/ui/three/blender.ts`, `src/game/ui/three/world.ts` (sala do Cofre + `setSala`/`tick`), `src/game/ui/three/World3D.tsx`, `tools/capturas/capturar.mjs`.
- **Asset**: `cofre.glb` — ~15 mil triângulos, 8 materiais PBR, animação de abertura (volante gira 2 voltas, porta abre 110° com rebote, 3 s). Luz dourada interna acende conforme a porta abre.
- **Comportamento**: ao entrar na sala Tesouraria e Cofre, o cofre se abre; ao sair, fecha. Com "reduzir movimento", salta direto para o estado final.
- **Testes**: prévias Cycles (fechado/aberto), capturas reais do jogo (Alta e Média), typecheck, testes unitários e e2e.

### Fases 3 a 5 (0.9.0)
- **Arquivos**: `tools/blender/tesouros.py` (6 assets), `tools/blender/{comum,construir}.py`, `src/game/ui/three/blender.ts` (`assetEstatico`, `pilhaDeDinheiro` com `InstancedMesh`), `src/game/ui/three/world.ts` (`gabineteDoNivel`, ostentação por faixa), galeria `/mundo3d?patrimonio=` (só desenvolvimento).
- **Assets**: maleta.glb 140 KB (animação da tampa), maco.glb 6 KB, moeda.glb 28 KB, trofeu.glb 178 KB, coroa.glb 132 KB, trono.glb 144 KB.
- **Regra preservada**: a cena só lê `luxoNivel` (calculado pelo motor a partir do patrimônio); nada de bônus por riqueza ilícita.
- **Testes**: prévias Cycles de cada objeto (corrigidos a maleta maciça e a taça do troféu), capturas reais nos níveis 1 e 4 com patrimônio simulado, unitários e e2e do jogo.

### Fase 6 (0.10.0)
- **Arquivos**: `src/game/ui/three/ChuvaDeMoedas.tsx` (instancing + física simples), `src/game/ui/three/Coroacao.tsx` (avatar sentado + trono + coroa + sirene), `src/game/ui/TransicaoNivel.tsx`, `src/game/ui/Decision.tsx` (gatilho da chuva no `ConsequenceModal` quando o patrimônio sobe), `src/game/ui/Hud.tsx` (pulsos e medidor de Trambicagem), `src/game/ui/Play.tsx` (transição ao mudar `nivel`), `src/game/ui/Ending.tsx` (coroação no final Imperador), `src/game/game.css`; galerias `/cena3d/{moedas,coroacao,transicao}` (só desenvolvimento).
- **Regra preservada**: os efeitos só leem o estado (variação de patrimônio, `trambicagem`, `powerScore`, `nivel`, final do motor).
- **Testes**: e2e da promoção agora confere a transição; campanha com desvio passa pela chuva; capturas reais da chuva, da coroação e da transição (celular e computador).

### Fases 7 a 9 (0.11.0)
- **Arquivos**: `src/game/ui/three/VitrinePatrimonio.tsx` + `panels.tsx` (painel de contas); `World3D.tsx` (sombras ajustadas e contador por quadro `data-calls`/`data-tris`); `estudo/personagem.ts` (`medio`) e `realismo.ts`; `blender.ts` (`posicoesDaPilha`, maleta aberta); `tools/capturas/medir.mjs`; `tools/blender/{comum,cofre}.py` (export sem UV, cofre mais leve).

**Medição por quadro** (`node tools/capturas/medir.mjs`, mediana de 10 amostras, 1280×720). Chamadas de desenho e triângulos independem do aparelho; **quadros por segundo não foram medidos**: neste ambiente só há renderização por software (0–3 qps em qualquer versão), o que não representa celular nem computador real.

| Vista | Chamadas antes → depois | Triângulos antes → depois |
|---|---|---|
| Mapa, Alta | 4.729 → 2.403 | 6,46 mi → 3,11 mi |
| Cofre, Alta | 3.542 → 1.216 | 4,81 mi → 1,54 mi |
| Gabinete sem luxo, Alta | 3.300 → 1.490 | 4,16 mi → 1,57 mi |
| Gabinete luxo 3, Alta | 3.412 → 1.546 | 4,24 mi → 1,61 mi |
| Gabinete luxo 3, Média | 1.396 → 618 | 2,15 mi → 0,81 mi |
| Gabinete luxo 3, Baixa | 65 | 25 mil |

Custo dos objetos do Blender no gabinete (faixa 3 contra sem luxo): +56 chamadas, +40 mil triângulos.

**Tamanho dos modelos** (GLB, carregados sob demanda): cofre 358 KB, troféu 138 KB, trono 108 KB, maleta 106 KB, coroa 96 KB, moeda 21 KB, maço 5 KB — total 0,83 MB (antes 1,26 MB).

### Pendências
- Medir quadros por segundo em aparelhos reais (celular intermediário e notebook) e ajustar a qualidade automática se necessário.
- Compressão Draco/meshopt: o `bpy` do PyPI vem sem Draco; dá para fazer com `gltf-transform` quando a ferramenta for liberada no ambiente.
- Rankings e loja/inventário não existem no jogo; não foram criados.
- Blender MCP: quando estiver conectado, os scripts de `tools/blender/` rodam igual dentro do Blender com janela.

---

## Padrão profissional — Etapas A a C (personagem piloto) · 2026-11-23 · **aguardando aprovação**

### Etapa A — diagnóstico
- **Engine**: three.js r186 no navegador (Next.js 16). Sem motor de física: **não há movimentação livre nem colisões** — o jogador navega por salas e pontos clicáveis, com câmera orbital. Animação: `AnimationMixer` (agora com esqueleto e morph targets).
- **Personagem principal**: o jogador é o gestor, mas hoje **não tem corpo no mundo** (escolhe um avatar com aparência própria; aparece no retrato 2D, na mão da caneta e na coroação). Os personagens 3D atuais (Cornélio, Toninho etc.) são procedurais (`estudo/personagem.ts`), sem esqueleto.
- **Origem/licença dos modelos atuais**: todos gerados em código (licença do projeto), exceto o sofá GlamVelvetSofa (Wayfair, CC BY 4.0) e texturas/HDRI Poly Haven (CC0).
- **Ferramentas testadas**: Blender MCP **não conectado**; nenhum computador do usuário ligado à sessão. Blender 5.3 (`bpy`) funciona aqui, sem Draco/meshopt. Sketchfab e Mixamo exigem login (sem conta). Quaternius: download gratuito funciona (UAL, CC0); "Universal Base Characters" é pago (US$ 19,99).
- **Backup**: tag local `backup-pre-piloto-2026-11-23` (o envio de tags é bloqueado); ponto de restauração no GitHub: `main` em `fe58576`.
- **Baseline de desempenho** (gabinete, Alta, 1280×720, Chromium headless com SwiftShader — sem GPU): 1.490 chamadas, 1,57 mi triângulos por quadro; **FPS não representativo** (1 qps em renderização por software).

### Etapa B — personagem piloto "O Gestor"
- **Técnica**: manequim CC0 profissional como base (topologia e pesos), reesculpido para caricatura e refeito por *voxel remesh* (silhueta contínua de terno); pesos transferidos do manequim (*Data Transfer*); pernas afastadas durante o remesh para não fundirem; cabeça caricata modelada no Blender com 8 shape keys (piscar, sorriso, boca aberta/triste, sobrancelhas de raiva/surpresa/medo, íris dilatada); camisa, gravata, lapelas, faixa verde-amarela, botões, colarinho, medalha 10% e anel como peças sobre o terno.
- **Animações na engine**: Parado, Falando, Comemorar, Derrota, Andar, Coletar, Sentado, Susto, Interagir (transição suave entre elas).
- **Arquivos**: `tools/blender/gestor.py`, `tools/blender/piloto_gestor.py`, `tools/blender/base/` (UAL + licença), `public/jogo/3d/blender/gestor.glb`, `src/game/ui/three/blender.ts` (`personagemPiloto`), `world.ts`/`World3D.tsx` (opção `piloto`), galerias `/cena3d/gestor` e `/mundo3d?piloto=1` (só desenvolvimento; **não aparece na partida**).
- **Custo medido**: +60 chamadas e +185 mil triângulos por quadro no gabinete; GLB 3,35 MB (92 mil triângulos, 65 ossos, 9 animações).

### Etapa C — avaliação do piloto (evidências: renders Cycles e capturas no three.js)
| Item | Resultado | Evidência / motivo |
|---|---|---|
| Rigging e animação na engine | **Aprovado** | 9 animações tocando no three.js com transição; expressões por morph funcionando |
| Deformações | **Parcialmente aprovado** | pesos profissionais, pernas separadas; aba do paletó é rígida (presa à pelve) e pode atravessar as coxas em passos largos; recorte do pescoço serrilhado no close |
| Proporções | **Parcialmente aprovado** | cabeça grande e barriga caricatas coerentes; braços ainda "musculosos" do manequim; mãos sempre em punho |
| Silhueta | **Parcialmente aprovado** | reconhecível (barriga, faixa, topete), mas o terno não tem ombros estruturados nem caimento |
| Materiais | **Parcialmente aprovado** | pele, tecido, couro, ouro e cabelo distintos; terno liso, sem trama, costuras nem dobras |
| Expressividade | **Parcialmente aprovado** | 7 expressões + piscar; boca e sobrancelhas simples, sem rugas de expressão |
| Consistência com os conceitos enviados | **Reprovado** | os conceitos têm acabamento de longa-metragem (rosto esculpido, roupas com dobras, mãos expressivas); o piloto é bem mais simples |
| Desempenho | **Parcialmente aprovado** | carga extra moderada por quadro; arquivo de 3,35 MB precisa ser reduzido (morphs da cabeça inteira, animações) |

**Conclusão honesta**: o piloto é funcional e integrado, mas **não atinge o padrão dos conceitos**. Modelagem por script tem teto visível no rosto e no tecido. Etapas D–H paradas até a decisão.

### Rodada 2 do piloto — rosto (opção 1, foco no rosto) · 2026-11-23 · **aguardando aprovação**
- **Técnica nova** (`tools/blender/rosto.py`): a pele é uma superfície única — crânio, mandíbula, papada, bochechas, queixo, arco das sobrancelhas, nariz caído, lábios, orelhas de abano e pescoço fundidos por *voxel remesh* —, com órbitas e sorriso escavados por *boolean* e malha refeita e suavizada. Cores por vértice: bochechas e nariz rosados, lábios, olheiras. Pálpebra superior pesada (ar de "esperto"), pálpebra inferior, dentes de cima à mostra, língua e boca escura ao fundo. Sobrancelhas em feixes; cabelo esculpido com topete e mechas, recorte limpo da linha do cabelo e têmporas grisalhas.
- **Expressões** (9 morph targets): piscar, olhos_abertos, sorriso (levanta bochechas), boca_aberta (mandíbula), boca_triste, sobrancelha_raiva/surpresa/medo, iris_grande. No jogo, combinadas em Satisfação, Ganância, Alegria, Raiva, Surpresa, Medo e Piscar — conferidas no three.js.
- **Defeitos encontrados e corrigidos nesta rodada**: material vazio criado pelo boolean (pele saía branca); dentes à frente dos lábios; pálpebras apagadas por comparar coordenadas locais com globais (olhar arregalado); piscar abria em vez de fechar; arco da sobrancelha furando a silhueta; linha do cabelo serrilhada.

| Item do rosto | Antes (rodada 1) | Agora |
|---|---|---|
| Forma e caricatura | Reprovado (primitivas coladas) | **Parcialmente aprovado**: superfície contínua, papada, queixo e nariz caricatos; faltam vincos (bigode chinês, covinha do queixo) |
| Olhos | Parcialmente | **Aprovado**: pálpebras pesadas dão personalidade; piscar e arregalar funcionam |
| Boca | Parcialmente | **Parcialmente aprovado**: sorriso com dentes convence; dentes sem divisão, "tristeza" limitada porque a boca base é um sorriso |
| Pele e cor | Parcialmente | **Aprovado**: tons de bochecha, nariz, lábios e olheira |
| Cabelo | Parcialmente | **Parcialmente aprovado**: topete com volume e linha limpa; mechas pouco definidas, brilho plástico no navegador |
| Expressividade no motor | Parcialmente | **Aprovado**: 7 emoções distintas no three.js |
| Pendências fora do rosto | — | recorte serrilhado do terno no pescoço (aparece no close); arquivo cresceu para 5,7 MB (malha do rosto 2,9 MB) — otimização na etapa F |

### Rodada 3 do piloto — terno · 2026-11-23 · **aguardando aprovação**
- **Feito** (`tools/blender/gestor.py`): mangas e calças com seção de tecido (somem bíceps e panturrilha do manequim; calça cai reta com vinco na frente); ombreiras (ombro quadrado); dobras no cotovelo, na dobra do braço e na barra da calça; borda do pescoço arredondada e gola do paletó; lapelas largas com espessura; camisa em V contínuo; nó de gravata; abas dos bolsos; bolso do peito com lenço e a **caneta de ouro** do jogo; punhos brancos; barra do paletó com abertura curva na frente, rente ao corpo.
- **Problema encontrado e resolvido**: com voxel de 9 mm o remesh perdia pernas e tronco (testado isolando cada mudança); voltou a 12 mm, com menos simplificação para caberem as dobras.

| Item do terno | Rodada 1 | Agora |
|---|---|---|
| Silhueta | Parcialmente (macacão) | **Aprovado**: lê como terno de político (ombros, mangas e calças retas) |
| Lapelas, camisa, gravata, bolsos | Parcialmente | **Aprovado**: peças com volume; lenço e caneta de ouro reforçam a sátira |
| Dobras e costuras | Reprovado | **Parcialmente aprovado**: dobras discretas (cotovelo, barra) — pouco visíveis à distância do jogo; sem costuras |
| Barra do paletó | Parcialmente | **Parcialmente aprovado**: rígida (presa à pelve); atrás marca a cintura como um cinto largo |
| Acabamento do pescoço | Reprovado | **Parcialmente aprovado**: frente resolvida; na nuca ainda há recorte |
| Barriga caricata | Parcialmente | **Parcialmente aprovado**: menos marcada que na rodada 1 |
| Arquivo | 3,35 MB | 6,0 MB (corpo mais denso para as dobras) — otimização na etapa F |

### Rodada 4 do piloto — mãos · 2026-11-23 · **aguardando aprovação**
- **Causa do "punho sempre fechado"**: as animações da biblioteca (UAL) mantêm os dedos em punho. Não era o modelo.
- **Feito** (`tools/blender/gestor.py`, `maos_relaxadas`): em cada animação os dedos recebem uma pose entre a mão reta da pose de base e o punho original — relaxada em Parado/Sentado/Andar, aberta em Falando/Derrota/Susto, punho mantido em Comemorar/Coletar/Interagir. Mãos um pouco mais cheias e com pontas dos dedos rosadas (cor por vértice, igual ao rosto). Conferido no Blender e no three.js.

| Item das mãos | Antes | Agora |
|---|---|---|
| Pose por situação | Reprovado (sempre punho) | **Aprovado**: relaxada, gesticulando ao falar, aberta no susto |
| Forma | Parcialmente (mão de manequim) | **Parcialmente aprovado**: proporção boa, mas sem unhas nem rugas dos nós |
| Cor | Parcialmente | **Aprovado**: tom e rosado das pontas combinam com o rosto |

### Etapa F (parcial) — otimização do personagem · 2026-11-24
- **`tools/blender/otimizar_glb.py`** (sem ferramentas externas; só formatos nativos do three.js): pesos de esqueleto e cores em 8 bits, normais em 8 bits (`KHR_mesh_quantization`), índices em 16 bits; preserva os morph targets esparsos. Aplicado automaticamente a todos os GLB do pipeline.
- **`tools/blender/teste-glb.mjs`**: carrega cada GLB com o `GLTFLoader` do three.js no Node (pegou um erro real: a primeira versão do otimizador quebrava os morph targets esparsos e o personagem sumia no navegador).
- Geometria reduzida onde não aparece (esferas dos olhos, dentes, cabelo, pele do rosto, corpo e mãos) e todas as peças sem expressão unidas numa malha (chamadas por material, não por peça).

| Medida | Antes | Depois |
|---|---|---|
| gestor.glb | 6.071 KB | 3.348 KB (−45%) · gzip 1,5 MB |
| Demais GLB do Blender | 942 KB | 630 KB (−33%) |
| Custo no gabinete (Alta) | +74 chamadas, +188 mil triângulos | +36 chamadas, +188 mil triângulos |

Qualidade conferida depois da redução: renders do rosto e do corpo e capturas no three.js (expressões, animações, mãos).

### Etapa D — cenário piloto: Recepção e Triagem (nível 1) · 2026-11-24 · **aguardando aprovação**
- **`tools/blender/upa_recepcao.py`** → `upa_recepcao.glb` (841 KB): balcão em L (tampo, frisos, "RECEPÇÃO" e cruz da UPA, acrílico com fresta, monitor aceso no ponto "computador", teclado, campainha, fichas, carimbo, caneca e a plaquinha "ATENDIMENTO (SE DER TEMPO)"); longarinas com viga e pés nas posições exatas dos pacientes sentados; totem "RETIRE SUA SENHA"; pedestais com fita vermelha e "FILA ÚNICA"; bebedouro com "EM MANUTENÇÃO"; ventilador de parede; letreiro "UPA 24h"; mural de cortiça; barra de azulejos com rejunte; rachaduras; placa de bronze "INAUGURADA EM 2016 · 2018 · 2022 (E SEGUE EM OBRAS)".
- **Preservado**: posições dos pontos de jogo (Célia, computador do balcão, painel de espera, portas), painel dinâmico "ESPERA MÉDIA", pacientes e degradação. Só nas qualidades Alta/Média; Baixa e 2D como antes.

| Item | Resultado |
|---|---|
| Arquitetura e composição | **Parcialmente aprovado**: azulejos, rachaduras e balcão dão leitura de UPA; piso e paredes superiores ainda são os procedurais |
| Objetos detalhados e sátira legível | **Aprovado**: fila, senha, bebedouro, placa das inaugurações e "se der tempo" |
| Legibilidade e jogabilidade | **Aprovado**: pontos clicáveis e circulação livres; pacientes alinhados às longarinas |
| Textos pequenos | **Parcialmente aprovado**: "RECEPÇÃO", "FILA ÚNICA" e a placa ficam pequenos na câmera do jogo |
| Consistência com o protagonista | **Parcialmente aprovado**: figurantes e Célia ainda são os modelos procedurais da direção R2, não o padrão do piloto |
