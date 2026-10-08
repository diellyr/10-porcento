import { z } from "zod";
import { container } from "@/server/container";
import { handle } from "@/server/http-api";
import { answerQuestion } from "@/server/services/ask";

const Body = z.object({ question: z.string().min(3).max(300) });

export async function POST(req: Request) {
  return handle(req, { rate: { bucket: "ask", limit: 20 } }, async () => {
    const { question } = Body.parse(await req.json().catch(() => ({})));
    const { router, data, rankings } = container();
    return answerQuestion(question, { data, engine: router, now: new Date(), ranking: rankings });
  });
}
