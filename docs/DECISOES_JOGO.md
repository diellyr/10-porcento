# MEUS 10% — decisões de projeto e regras (para revisão)

## Arquitetura
- `src/game/engine/` — motor **puro** (sem React/Three/áudio/Supabase): `rules.ts` (única porta de mudança de estado: `apply(estado, idDaAção, ação)`), `scoring.ts`, `endings.ts`, `report.ts`, `negotiation.ts`, `schema.ts` (forma das ações). O mesmo código roda no navegador (modo convidado) e no servidor (validação).
- `src/game/content/` — dados da campanha: personagens, locais/pontos interativos, pistas, achados, conversas, decisões, conceitos, quiz.
- `src/game/ui/` — apresentação 2D/3D, HUD, painéis. A cena/animação **nunca** calcula dinheiro: lê o estado.
- `src/server/game/` + `src/app/api/game/*` — persistência e validação no servidor (repositório Supabase com funções SQL atômicas; repositório em memória para dev/testes).
- `supabase/migrations/20261008000011_game_meus10.sql` — estrutura do banco.

## Garantias testadas (`tests/unit/game-engine.test.ts`, `tests/db/game.test.ts`, `tests/e2e/jogo.spec.ts`)
- Cada ação tem id único; **reenviar não repete efeitos** (idempotência no motor e `unique(save_id, action_id)` no banco; controle de versão otimista).
- Desvio exige `confirmDeviation: true` e percentual entre 0,5% e 10% em passos de 0,5%; outras opções rejeitam percentual. Cancelar/voltar/hover não registra nada.
- Texto livre (negociação) só pontua a **rubrica visível**; tentativas de "ignorar regras"/"sou administrador do sistema" valem zero e não alteram saldos, teto ou histórico.
- Economia legítima nunca entra na conta pessoal; corte que reduz acesso **não conta** como economia; uma UPA não tem opção de aumentar imposto/cobrar atendimento.
- O estado do servidor é reconstruído **reexecutando o histórico de ações** com o motor; cenário forjado é recusado.
- O relatório é derivado do histórico (valores e decisões batem).

## Balanceamento (regras propostas — sujeitas a teste com jogadores)
- Pontuação de Poder: pesos do documento (30/20/15/15/10/5/5). Índice de Trambicagem = Σ desviado ÷ Σ base elegível (todas as decisões com base), teto 10%.
- Índice de legado: 35% qualidade e acesso · 25% gestão de recursos · 20% confiança · 20% conhecimento aplicado.
- Final "reconhecimento": sem desvio deliberado, legado ≥ 60, qualidade ≥ 60, acesso ≥ 55, confiança ≥ 50, 10 decisões. Caso contrário "gestão insuficiente" (não é prisão). Qualquer desvio deliberado → "responsabilização" (a reparação muda o epílogo, não o final).
- Simulação automatizada (120 partidas aleatórias + estratégias): competente sem erros ≈ 100% reconhecimento; 1 erro ≈ 90%; 2 erros ≈ 80%; 3 erros ≈ 22%; só escolhas cômodas → gestão insuficiente; qualquer desvio → responsabilização.
- Caixa sem fundos: a despesa vira **obrigação** (restos a pagar) e reduz a sustentabilidade fiscal — não "cria dinheiro".

## Convenções que o jogador vê
- Toda informação financeira traz o rótulo: dado oficial / estimativa didática / resultado simulado; saldos pessoal e público nunca se misturam e têm a marca "SIMULAÇÃO FICTÍCIA DO JOGO".
- Vínculo familiar/político isolado **não** é tratado como crime; opções "fracas" (sem cotação) geram apontamentos administrativos, não prisão.
