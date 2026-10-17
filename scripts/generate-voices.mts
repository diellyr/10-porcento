/**
 * Gera as vozes do jogo como ARQUIVOS (public/audio/vozes/<conversa>.<fala>.mp3 + manifest.json) com o ElevenLabs.
 * Vantagem: voz fixa, sem custo nem limite em tempo de jogo, e funciona mesmo se o serviço de voz ficar fora do ar.
 *
 * Uso (no seu computador, na raiz do projeto):
 *   ELEVENLABS_API_KEY=... TTS_VOICE_JOANA=... TTS_VOICE_CELIA=... (um por personagem)  npm run game:voices
 *   npm run game:voices -- --dry            só lista o que seria gerado (não precisa de chave)
 *   npm run game:voices -- --only guardiao-corte,abertura
 *   npm run game:voices -- --force          regenera mesmo o que já existe
 * Só entram falas com texto FIXO. Falas com valores calculados na hora ficam na voz sob demanda (/api/game/tts).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CHARACTERS } from "../src/game/content/characters";
import { CONVERSATIONS } from "../src/game/content/conversations";
import { speechText } from "../src/game/audio/speech";

const args = process.argv.slice(2);
const dry = args.includes("--dry"), force = args.includes("--force");
const onlyArg = args.find((a, i) => args[i - 1] === "--only");
const only = onlyArg ? new Set(onlyArg.split(",")) : null;
const dir = resolve(import.meta.dirname, "../public/audio/vozes");
const manifestPath = join(dir, "manifest.json");
mkdirSync(dir, { recursive: true });
type Manifest = { arquivos: string[]; hashes?: Record<string, string> };
const manifest: Manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { arquivos: [] };
manifest.hashes ??= {};

interface Job { file: string; who: string; voiceId: string | undefined; envVar: string; text: string; hash: string }
const jobs: Job[] = [];
let dinamicas = 0;
for (const conv of CONVERSATIONS) {
  if (only && !only.has(conv.id)) continue;
  for (const [key, node] of Object.entries(conv.nodes)) {
    if (node.who === "voce") continue;
    if (typeof node.text !== "string") { dinamicas++; continue; }
    const ch = CHARACTERS[node.who];
    const text = speechText(node.text);
    const voiceId = process.env[ch.voz.envVar];
    jobs.push({ file: `${conv.id}.${key}.mp3`, who: ch.nome, voiceId, envVar: ch.voz.envVar, text, hash: createHash("sha256").update(`${voiceId ?? ch.voz.envVar}|${text}`).digest("hex").slice(0, 16) });
  }
}
const pendentes = jobs.filter((j) => force || !existsSync(join(dir, j.file)) || manifest.hashes![j.file] !== j.hash);
const porPersonagem = new Map<string, number>();
for (const j of pendentes) porPersonagem.set(j.who, (porPersonagem.get(j.who) ?? 0) + 1);
console.log(`${jobs.length} falas fixas (${dinamicas} dinâmicas ficam na voz sob demanda); ${pendentes.length} a gerar.`);
for (const [who, n] of porPersonagem) console.log(`  ${who}: ${n}`);
const chars = pendentes.reduce((s, j) => s + j.text.length, 0);
console.log(`  ≈ ${chars} caracteres (a maioria dos planos do ElevenLabs conta por caractere).`);
if (dry) process.exit(0);

const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error("Defina ELEVENLABS_API_KEY."); process.exit(1); }
const faltando = [...new Set(pendentes.filter((j) => !j.voiceId).map((j) => j.envVar))];
if (faltando.length) { console.error(`Defina o ID da voz de cada personagem: ${faltando.join(", ")}`); process.exit(1); }

let feitos = 0;
for (const j of pendentes) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${j.voiceId}?output_format=mp3_44100_64`, {
    method: "POST", headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: j.text, model_id: process.env.TTS_MODEL ?? "eleven_multilingual_v2", language_code: "pt", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 } }),
  });
  if (!r.ok) { console.error(`✘ ${j.file} (${j.who}): HTTP ${r.status} ${(await r.text()).slice(0, 160)}`); continue; }
  writeFileSync(join(dir, j.file), Buffer.from(await r.arrayBuffer()));
  if (!manifest.arquivos.includes(j.file)) manifest.arquivos.push(j.file);
  manifest.hashes![j.file] = j.hash;
  feitos++;
  writeFileSync(manifestPath, JSON.stringify({ arquivos: manifest.arquivos.sort(), hashes: manifest.hashes }, null, 2) + "\n");
  console.log(`✔ ${j.file} (${j.who})`);
}
console.log(`Concluído: ${feitos} de ${pendentes.length}. Faça commit de public/audio/vozes/ e publique.`);
process.exit(feitos === pendentes.length ? 0 : 2);
