import { describe, expect, it } from "vitest";
import { CASES, DECISION_BY_ID } from "@/game/content/cases";
import { CLUES, CLUE_BY_ID, FINDINGS } from "@/game/content/clues";
import { CONCEPTS } from "@/game/content/concepts";
import { CHARACTERS } from "@/game/content/characters";
import { CONVERSATIONS } from "@/game/content/conversations";
import { LEVELS } from "@/game/content/levels";
import { LOCATIONS } from "@/game/content/locations";
import { NIVEIS } from "@/game/content/niveis";
import { fictionalScenario, levelScenario } from "@/game/content/scenario";
import type { ConvNode } from "@/game/content/types";
import { apply, migrarEstado, optionLock } from "@/game/engine/rules";
import type { Action, GameState } from "@/game/engine/types";

/** Testes dos níveis 3 a 7 (conteúdo e trajetórias). Níveis ainda sem conteúdo são ignorados. */
const scenario = fictionalScenario("2026-10-08T00:00:00.000Z");
let k = 0;
const uid = () => `lv${++k}`;
const run = (prev: GameState | null, action: Action) => { const r = apply(prev, uid(), action); if (!r.ok) throw new Error(`${action.type}: ${r.error}`); return r.state; };

function explore(s: GameState) {
  const caso = CASES.find((c) => c.caso === s.caso)!;
  for (const cid of caso.pistas) { const c = CLUES.find((x) => x.id === cid)!; s = run(s, { type: "go", location: c.location }); s = run(s, { type: "inspect", clueId: cid }); }
  for (const vid of caso.conversas) {
    const cv = CONVERSATIONS.find((x) => x.id === vid)!;
    s = run(s, { type: "go", location: cv.location });
    const choices: string[] = []; let key: string | undefined = cv.start;
    while (key) { const node: ConvNode = cv.nodes[key]!; if (node.choices?.length) { choices.push(node.choices[0]!.id); key = node.choices[0]!.next; } else key = node.next; }
    s = run(s, { type: "talk", conversationId: vid, choices });
  }
  for (let i = 0; i < caso.pistas.length; i++) for (let j = i + 1; j < caso.pistas.length; j++) s = run(s, { type: "confront", a: caso.pistas[i]!, b: caso.pistas[j]! });
  return s;
}
type Pick = (d: string, s: GameState) => { optionId: string; pct?: number };
const best: Pick = (d, s) => { const o = DECISION_BY_ID[d]!.opcoes.filter((x) => !optionLock(s, x)).sort((a, b) => (a.kind === "competente" ? 0 : 1) - (b.kind === "competente" ? 0 : 1))[0]!; return { optionId: o.id }; };
const desvia: Pick = (d, s) => { const o = DECISION_BY_ID[d]!.opcoes.filter((x) => !optionLock(s, x)).find((x) => x.kind === "desvio") ?? DECISION_BY_ID[d]!.opcoes.find((x) => !optionLock(s, x))!; return { optionId: o.id, pct: o.desvio ? 6.5 : undefined }; };
function playLevel(s0: GameState, pick: Pick, n: number) {
  let s = s0;
  for (const caso of CASES.filter((c) => c.caso >= LEVELS[n]!.primeiro && c.caso <= LEVELS[n]!.ultimo)) {
    s = explore(s);
    const p = pick(caso.decisao, s);
    s = run(s, { type: "go", location: DECISION_BY_ID[caso.decisao]!.mesa });
    s = run(s, { type: "decide", decisionId: caso.decisao, optionId: p.optionId, ...(p.pct ? { deviationPct: p.pct, confirmDeviation: true } : {}) });
    s = run(s, { type: "advance" });
  }
  return s;
}
/** carreira íntegra até o INÍCIO do nível n (promoções por mérito); se algum nível anterior ainda não tem conteúdo, o início do nível é montado a partir do fim do nível 2 */
function ateNivel(n: number) {
  let s = run(null, { type: "start", playerName: "Teste", avatar: "av1", scenario, seed: 7, gameId: "gl" });
  ["q1", "q2", "q3"].forEach((q, i) => { s = run(s, { type: "quiz.answer", questionId: q, optionId: ["analisar", "dados", "provar"][i]! }); });
  const real = [3, 4, 5, 6, 7].filter((l) => l < n).every((l) => NIVEIS[l]!.casos.length > 0);
  for (let l = 1; l < (real ? n : 3); l++) { s = playLevel(s, best, l); s = run(s, { type: "promote" }); }
  if (!real && n > 2) {
    const N = LEVELS[n]!; const sc = levelScenario(s.scenario, n);
    s = { ...s, nivel: n, scenario: sc, phase: "jogando", ending: null, caso: N.primeiro, casoAberto: true, location: N.inicial, visited: [N.inicial], pending: [], consequences: [],
      pub: { ...s.pub, qualidade: N.inicio.qualidade, acesso: N.inicio.acesso, equipe: N.inicio.equipe, sustentabilidade: N.inicio.sustentabilidade, estoqueDias: N.inicio.estoqueDias, filaMin: N.inicio.filaMin } };
  }
  return s;
}

const niveis = [3, 4, 5, 6, 7].filter((n) => NIVEIS[n]!.casos.length > 0);

describe.each(niveis)("nível %i — conteúdo", (n) => {
  const C = NIVEIS[n]!; const L = LEVELS[n]!;
  const ids = C.locais.map((l) => l.id);
  it("tem os casos, locais e decisões do nível", () => {
    expect(C.casos.map((c) => c.caso)).toEqual(Array.from({ length: L.ultimo - L.primeiro + 1 }, (_, i) => L.primeiro + i));
    expect(ids).toEqual(L.locais);
    expect(C.decisoes.map((d) => d.caso)).toEqual(C.casos.map((c) => c.caso));
    for (const c of C.casos) { expect(c.id).toBe(`caso${c.caso}`); expect(c.decisao).toBe(`d${c.caso}`); expect(L.locais).toContain(c.location); }
    const mesas = C.locais.filter((l) => l.mesa); expect(mesas).toHaveLength(1);
    for (const d of C.decisoes) expect(d.mesa).toBe(mesas[0]!.id);
  });
  it("locais respeitam os limites do gerador de layout", () => {
    for (const l of C.locais) {
      expect(l.pessoas.length).toBeLessThanOrEqual(4); expect(l.itens.length).toBeLessThanOrEqual(4);
      expect(l.itens.filter((i) => i.onde === "parede").length).toBeLessThanOrEqual(4); expect(l.itens.filter((i) => i.onde === "mesa").length).toBeLessThanOrEqual(3);
      expect(l.portas.length).toBeLessThanOrEqual(4);
      for (const p of l.portas) expect(L.locais, `${l.id} -> ${p}`).toContain(p);
      for (const p of l.pessoas) expect(CHARACTERS[p.char], p.char).toBeTruthy();
    }
  });
  it("todo ponto interativo aponta para pista/conversa existente, do caso e do local certos", () => {
    for (const id of ids) for (const h of LOCATIONS[id].hotspots) for (const e of h.entradas) {
      if (h.kind === "porta" || h.kind === "mesa") continue;
      const clue = CLUE_BY_ID[e.ref]; const conv = CONVERSATIONS.find((c) => c.id === e.ref);
      expect(clue || conv, `${id}/${h.id} -> ${e.ref}`).toBeTruthy();
      if (clue) { expect(clue.location).toBe(id); expect(e.casos).toContain(clue.caso); }
      if (conv) { expect(conv.location).toBe(id); expect(e.casos).toContain(conv.caso); }
    }
  });
  it("cada caso tem pistas, conversas e decisão coerentes; achados ligam pistas do mesmo caso", () => {
    for (const c of C.casos) {
      expect(c.pistas.length).toBeGreaterThanOrEqual(2);
      for (const p of c.pistas) { const cl = CLUE_BY_ID[p]; expect(cl, p).toBeTruthy(); expect(cl!.caso).toBe(c.caso); }
      for (const v of c.conversas) expect(CONVERSATIONS.find((x) => x.id === v && x.caso === c.caso), v).toBeTruthy();
      // toda pista e conversa do caso está acessível por algum ponto interativo
      for (const ref of [...c.pistas, ...c.conversas]) expect(ids.some((id) => LOCATIONS[id].hotspots.some((h) => h.entradas.some((e) => e.ref === ref && e.casos.includes(c.caso)))), `sem ponto para ${ref}`).toBe(true);
    }
    for (const f of C.achados) { expect(CLUE_BY_ID[f.a]?.caso).toBe(f.caso); expect(CLUE_BY_ID[f.b]?.caso).toBe(f.caso); }
    expect(C.casos.filter((c) => c.conversas.some((v) => CONVERSATIONS.find((x) => x.id === v)?.auto)).map((c) => c.caso)).toContain(L.primeiro);
  });
  it("conversas: grafos válidos e personagens existentes", () => {
    for (const cv of C.conversas) {
      expect(cv.nodes[cv.start], cv.id).toBeTruthy();
      for (const [key, node] of Object.entries(cv.nodes)) {
        expect(CHARACTERS[node.who], `${cv.id}/${key}`).toBeTruthy();
        if (node.next) expect(cv.nodes[node.next], `${cv.id}/${key}->${node.next}`).toBeTruthy();
        for (const ch of node.choices ?? []) expect(cv.nodes[ch.next], `${cv.id}/${ch.id}->${ch.next}`).toBeTruthy();
      }
    }
  });
  it("decisões: ao menos uma competente, desvio sinalizado, conceito e achados existentes, ids únicos", () => {
    const concept = (c: string) => expect(CONCEPTS[c as keyof typeof CONCEPTS], c).toBeTruthy();
    for (const d of C.decisoes) {
      concept(d.conceito); expect(d.opcoes.some((o) => o.kind === "competente"), d.id).toBe(true);
      expect(new Set(d.opcoes.map((o) => o.id)).size).toBe(d.opcoes.length);
      expect(d.opcoes.length).toBeGreaterThanOrEqual(3);
      for (const o of d.opcoes) {
        expect(!!o.desvio, `${d.id}/${o.id}`).toBe(o.kind === "desvio");
        if (o.requer?.achado) expect(FINDINGS.find((f) => f.id === o.requer!.achado && f.caso === d.caso), `${d.id}/${o.id}`).toBeTruthy();
        for (const a of o.aplica ?? []) concept(a);
      }
    }
    for (const id of Object.keys(C.conceitos)) expect(C.conceitos[id as keyof typeof C.conceitos]!.id).toBe(id);
  });
});

describe.each(niveis)("nível %i — trajetórias", (n) => {
  it("gestão competente (com promoções por mérito) chega ao final positivo", () => {
    const s = playLevel(ateNivel(n), best, n);
    expect(s.phase).toBe("encerrada"); expect(s.nivel).toBe(n); expect(s.personal.desviado).toBe(0);
    expect(s.ending?.id).toBe(n === 7 ? "presidencia" : "reconhecimento");
    if (n === 7) expect(s.eleicao?.venceu).toBe(true);
  });
  it("desvio no nível leva à responsabilização (ou ao Imperador, no topo)", () => {
    const s = playLevel(ateNivel(n), desvia, n);
    expect(s.ending?.id).toBe(n === 7 ? "imperador" : "responsabilizacao");
    expect(s.personal.desviado).toBeGreaterThan(0);
  });
});

describe("níveis 3–7 — infraestrutura", () => {
  it("os sete níveis estão definidos e a numeração dos casos é contínua", () => {
    for (let n = 1; n <= 7; n++) expect(LEVELS[n], String(n)).toBeTruthy();
    for (let n = 2; n <= 7; n++) expect(LEVELS[n]!.primeiro).toBe(LEVELS[n - 1]!.ultimo + 1);
    for (const n of [3, 4, 5, 6, 7]) expect(LEVELS[n]!.locais).toHaveLength(5);
  });
});

describe("saves antigos", () => {
  it("estado sem nivel/historico é migrado e pode ser promovido ao fim do nível 1", () => {
    const fim = ateNivel(2); // início do nível 2 vindo de promoção; para o teste usamos o estado encerrado do nível 1
    expect(fim.nivel).toBe(2);
    let s = run(null, { type: "start", playerName: "Velho", avatar: "av1", scenario, seed: 7, gameId: "gl-old" });
    ["q1", "q2", "q3"].forEach((q, i) => { s = run(s, { type: "quiz.answer", questionId: q, optionId: ["analisar", "dados", "provar"][i]! }); });
    s = playLevel(s, best, 1);
    const velho = { ...s } as Partial<GameState>; delete velho.nivel; delete velho.historico;
    expect(migrarEstado(velho as GameState).nivel).toBe(1);
    const r = apply(velho as GameState, "promo-old", { type: "promote" });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.state.nivel).toBe(2); expect(r.state.historico).toHaveLength(1); }
  });
});

describe("jogar a fase de novo", () => {
  it("recomeça a fase encerrada com o mesmo estado inicial, preservando as fases anteriores e permitindo outro resultado", () => {
    const ini = ateNivel(2);                       // início do nível 2 (promovido por mérito)
    const fim = playLevel(ini, best, 2);
    expect(fim.phase).toBe("encerrada");
    const r = apply(fim, "rp1", { type: "replay" });
    expect(r.ok).toBe(true); if (!r.ok) return;
    const s = r.state;
    expect(s.phase).toBe("jogando"); expect(s.nivel).toBe(2); expect(s.caso).toBe(LEVELS[2]!.primeiro);
    expect(s.decisions.filter((d) => d.caso >= LEVELS[2]!.primeiro)).toHaveLength(0);
    expect(s.historico).toHaveLength(1);
    expect(s.version).toBe(fim.version + 1);
    expect(JSON.stringify({ ...s, version: 0, actionIds: 0, actions: 0 })).toBe(JSON.stringify({ ...ini, version: 0, actionIds: 0, actions: 0 }));
    // mesma ação repetida não refaz; e dá para jogar de novo com outro caminho
    expect(apply(s, "rp1", { type: "replay" }).ok).toBe(true);
    const outro = playLevel(s, desvia, 2);
    expect(outro.ending?.id).toBe("responsabilizacao");
    // e jogar de novo mais uma vez volta ao mesmo início
    const r2 = apply(outro, "rp2", { type: "replay" }); expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.state.caso).toBe(LEVELS[2]!.primeiro);
  });
  it("vale também para a fase 1 (volta ao fim do quiz) e não vale durante a partida", () => {
    let s = run(null, { type: "start", playerName: "T", avatar: "av1", scenario, seed: 7, gameId: "rp-1" });
    ["q1", "q2", "q3"].forEach((q, i) => { s = run(s, { type: "quiz.answer", questionId: q, optionId: ["analisar", "dados", "provar"][i]! }); });
    expect(apply(s, "rp-x", { type: "replay" }).ok).toBe(false);
    const fim = playLevel(s, best, 1);
    const r = apply(fim, "rp-y", { type: "replay" });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.state.phase).toBe("jogando"); expect(r.state.caso).toBe(1); expect(r.state.decisions).toHaveLength(0); }
  });
});
