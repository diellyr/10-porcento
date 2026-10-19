import { z } from "zod";
import { LOCATION_IDS } from "./types";

const id = z.string().min(1).max(80);
const loc = z.enum(LOCATION_IDS);

/** Formato das ações aceitas pela API. A validação de REGRAS (valores, ordem, limites) é do motor — aqui só a forma. */
export const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), playerName: z.string().max(40), avatar: z.string().regex(/^av[1-9]$/), scenario: z.any(), seed: z.number().int().min(0).max(2 ** 32), gameId: id }),
  z.object({ type: z.literal("quiz.answer"), questionId: id, optionId: id }),
  z.object({ type: z.literal("go"), location: loc }),
  z.object({ type: z.literal("inspect"), clueId: id }),
  z.object({ type: z.literal("talk"), conversationId: id, choices: z.array(id).max(30) }),
  z.object({ type: z.literal("confront"), a: id, b: id }),
  z.object({ type: z.literal("argue"), negotiationId: id, text: z.string().max(800) }),
  z.object({ type: z.literal("decide"), decisionId: id, optionId: id, deviationPct: z.number().min(0).max(10).optional(), confirmDeviation: z.boolean().optional() }),
  z.object({ type: z.literal("advance") }),
  z.object({ type: z.literal("repair"), valor: z.number().positive().max(1e9) }),
  z.object({ type: z.literal("favorite"), entryId: id }),
  z.object({ type: z.literal("promote") }),
  z.object({ type: z.literal("replay") }),
  z.object({ type: z.literal("abandon") }),
]);
export const ActionLogSchema = z.array(z.object({ id, action: ActionSchema })).min(1).max(400);
