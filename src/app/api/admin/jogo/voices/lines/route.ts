import { adminHandle } from "@/server/http-api";
import { staticVoiceLines } from "@/server/game/voice-lines";

export async function GET(req: Request) {
  return adminHandle(req, async () => ({ lines: staticVoiceLines().map((l) => ({ id: l.id, personagem: l.personagem, nome: l.nome, chars: l.texto.length })) }));
}
