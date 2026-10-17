import { CHARACTERS } from "@/game/content/characters";
import { CONVERSATIONS } from "@/game/content/conversations";
import { speechText } from "@/game/audio/speech";

export interface VoiceLine { id: string; personagem: string; nome: string; texto: string }

/** Falas de texto FIXO (as com valores calculados na hora ficam na voz sob demanda). O texto já está normalizado para a fala. */
export function staticVoiceLines(): VoiceLine[] {
  const out: VoiceLine[] = [];
  for (const conv of CONVERSATIONS) {
    for (const [key, node] of Object.entries(conv.nodes)) {
      if (node.who === "voce" || typeof node.text !== "string") continue;
      out.push({ id: `${conv.id}.${key}`, personagem: node.who, nome: CHARACTERS[node.who].nome, texto: speechText(node.text) });
    }
  }
  return out;
}
