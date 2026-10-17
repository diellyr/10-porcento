# MEUS 10% — assets, vozes e integrações pendentes

Este arquivo separa **o que está concluído**, **o que está preparado** e **o que é provisório/pendente**. Nada abaixo deve ser apresentado como acabamento final.

## Rostos e personagens 3D
| Item | Estado | O que falta |
|---|---|---|
| Busto 3D dos 9 personagens da UPA | **Provisório (procedural)** — geometria esculpida por funções, olhos com textura, pálpebras, sobrancelhas, boca com lábios/dentes/língua, cabelo em cascas, óculos, roupa. Piscadas, olhar com microsacadas, expressões e boca dirigida pelo nível da voz. | Modelos esculpidos e riggados (blendshapes ARKit/visemas), texturas de pele, cabelo em cartões, roupas modeladas. Hoje o cabelo tem aparência de "capacete" e o rosto de manequim estilizado. |
| Braço, mão e caneta 3D | **Provisório (procedural)** — palma, 5 dedos articulados (nós, unhas), antebraço, punho e manga, caneta com pena, aro e clipe; pegada por cinemática inversa (CCD) contra a caneta; sombras e colisão com a mesa tratadas pela altura da ponta. | Mão modelada/riggada de produção, topologia de dedos com deformação (skinning), texturas e materiais de pele, caneta modelada. Falta acabamento anatômico fino (dobras, tendões, proporções por avatar). |
| Retratos 2D (SVG) | Concluído como arte original paramétrica (mesma "ficha de identidade" do 3D). | Ilustração final de estúdio, mais poses/expressões. |
| Cenários 2D | Concluído em SVG em camadas com paralaxe e estados do mundo. | Ilustração final de estúdio, mais variações e props. |

## Voz e áudio
| Item | Estado | O que falta |
|---|---|---|
| Voz natural (pt-BR) | **Pendente**. O jogo tenta, nesta ordem: arquivo gravado (`public/audio/vozes/<conversa>.<nó>.mp3` listado em `manifest.json`) → voz neural sob demanda (`/api/game/tts`, ElevenLabs, com cache em Storage e limite diário) → voz do navegador (**provisória**, sinalizada na interface) → apenas legenda. | Definir o fornecedor/gravar: `ELEVENLABS_API_KEY` e um ID de voz por personagem em `TTS_VOICE_JOANA`, `TTS_VOICE_CELIA`, `TTS_VOICE_GUARDIAO`, `TTS_VOICE_TONINHO`, `TTS_VOICE_JUNINHO`, `TTS_VOICE_ROBERTO`, `TTS_VOICE_ANA`, `TTS_VOICE_BENTO`, `TTS_VOICE_CORNELIO`. **Nenhum ID de voz foi inventado.** |
| Perfis de voz | Definidos como direção de atuação em `src/game/content/characters.ts`. | Teste de audição e ajuste com a voz final. |
| Normalização de fala | Concluído (`src/game/audio/speech.ts`, testado): valores em R$, percentuais, horas, siglas. | Revisão com locutor. |
| Efeitos e trilha | Concluído, **sintetizados** em tempo real (nenhum arquivo de terceiros). | Trilha composta e mixada por profissional (opcional). |

## IA
- Resposta do Guardião redigida por IA (`/api/game/guardiao`): **preparada**, requer `ANTHROPIC_API_KEY`. Sem chave, usa respostas escritas. A IA **nunca** altera pontos, saldos, teto, histórico, promoção ou final: a rubrica é calculada pelo motor.

## Dados
- Cenário referenciado em município real: **concluído e testado com fixtures sintéticas**; com Supabase real e fontes reais, depende da validação já descrita em `DATA_SOURCES.md` (parsers do Siconfi/Portal da Transparência). O total de saúde do município é **dado oficial** de referência, **nunca** o orçamento de uma UPA.
- Orçamento da UPA: sempre **estimativa didática** (6% do gasto municipal de saúde, faixa R$ 8–60 mi; padrão fictício R$ 24 mi).

## Escopo da campanha
- Concluído: campanha curta da UPA (10 casos), quiz, dossiê/confronto, negociação com o Guardião, decisões com confirmação, desvio fictício até 10% por evento, restituição, consequências posteriores, Caderno, relatório, card de resultado, perfil, salvamento local e na conta.
- **Não implementado** (fases 2–5 do documento): sete níveis além da UPA, mapa do Brasil jogável, eleição simulada, Imperador Supremo, Presidência, garagem/imóveis/amigos repentinos, avatar evolutivo, foto/caricatura, rankings e desafios entre amigos, vídeos, monetização.

## Mapa 3D da UPA (low-poly)
- **Feito:** casa de bonecas em corte com seis salas, paredes que baixam ao girar, fila/estoque/TV de espera dinâmicos, figurantes com vida (respiração, quem fala se mexe), luxo e degradação visíveis, câmera de conversa, iluminação por clima. Peças fixas e cada boneco são fundidos com cor por vértice (≈100–200 chamadas de desenho por quadro, antes ≈1100).
- **Pendente:** medir fps em celular real (o navegador de teste usa renderização por CPU); modelos `.glb` artísticos e animação de andar para os bonecos; interiores dos níveis 2–7.
