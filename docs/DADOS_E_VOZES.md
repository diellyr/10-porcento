# Dados oficiais e vozes — como alimentar o jogo

Os dois passos abaixo rodam **no seu computador** (precisam de internet aberta e, no caso das vozes, de uma chave do ElevenLabs).
Nenhuma chave vai para o repositório.

## 1. Dados oficiais (Siconfi/Tesouro) das 27 capitais

O site já consulta a fonte sob demanda: cada município escolhido em "Nova partida" faz `/api/game/scenario` buscar a despesa de saúde (DCA Anexo I-E),
salvar os fatos com a origem e congelar o cenário. Para **pré-carregar** as capitais de uma vez:

```bash
npm run game:preload -- https://10-porcento.diellyr.workers.dev          # as 27 capitais
npm run game:preload -- https://10-porcento.diellyr.workers.dev SP,RJ    # só algumas UFs
```

- Espera 6 s entre capitais (limite de 12 consultas/min por IP) e repete se receber 429.
- Imprime, por capital, se veio dado oficial (valor e ano) ou "sem dado" — ausência de dado nunca vira zero.
- Pré-requisito: `SUPABASE_SERVICE_ROLE_KEY` já configurada na Cloudflare (sem ela o site não grava no banco).

## 2. Vozes naturais como arquivos

```bash
npm run game:voices -- --dry     # lista o que seria gerado (74 falas, ≈ 7 mil caracteres) — sem chave
ELEVENLABS_API_KEY=... TTS_VOICE_JOANA=... TTS_VOICE_CELIA=... TTS_VOICE_GUARDIAO=... TTS_VOICE_TONINHO=... \
TTS_VOICE_JUNINHO=... TTS_VOICE_ROBERTO=... TTS_VOICE_ANA=... TTS_VOICE_BENTO=... TTS_VOICE_CORNELIO=... npm run game:voices
```

- Gera `public/audio/vozes/<conversa>.<fala>.mp3` e atualiza `manifest.json`. Faça commit desses arquivos e publique.
- Só falas de texto fixo viram arquivo; as com valores calculados na hora seguem na voz sob demanda (`/api/game/tts`, que usa as mesmas variáveis no servidor).
- Refaz sozinho as falas cujo texto mudou. `--force` regenera tudo; `--only guardiao-corte,abertura` limita a conversas.
- Escolha as vozes no ElevenLabs seguindo a "direção de voz" de cada personagem (página `/elenco`); o ID de cada voz entra na variável `TTS_VOICE_<PERSONAGEM>`.
