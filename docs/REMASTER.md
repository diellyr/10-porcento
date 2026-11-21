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
| 3 Identidade visual | paleta/tokens e materiais padrão no pipeline; aplicação na interface | em andamento |
| 4 Objetos e personagens | maleta, pilhas de dinheiro, moedas, troféu, coroa e trono; figurinos por nível | próximo |
| 5 Cenários por nível | ostentação crescente por nível (gabinetes, palácio, sala do trono) | — |
| 6 Animações | explosão de moedas no desvio, efeito de Poder/Trambicagem, transição de nível, cinemática do Imperador | — |
| 7 Interface | HUD com medidores de Poder/Trambicagem/Patrimônio no padrão novo | — |
| 8 Otimização | medir tamanho, carga e quadros; compressão e LOD | — |
| 9 Testes | unitários, e2e, capturas antes/depois | contínuo |

## Registro por fase

### Fases 1 e 2 (0.8.0)
- **Arquivos**: `tools/blender/{comum,cofre,construir}.py`, `public/jogo/3d/blender/cofre.glb`, `src/game/ui/three/blender.ts`, `src/game/ui/three/world.ts` (sala do Cofre + `setSala`/`tick`), `src/game/ui/three/World3D.tsx`, `tools/capturas/capturar.mjs`.
- **Asset**: `cofre.glb` — ~15 mil triângulos, 8 materiais PBR, animação de abertura (volante gira 2 voltas, porta abre 110° com rebote, 3 s). Luz dourada interna acende conforme a porta abre.
- **Comportamento**: ao entrar na sala Tesouraria e Cofre, o cofre se abre; ao sair, fecha. Com "reduzir movimento", salta direto para o estado final.
- **Testes**: prévias Cycles (fechado/aberto), capturas reais do jogo (Alta e Média), typecheck, testes unitários e e2e.
