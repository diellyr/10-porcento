import { CASE_BY_NUM, DECISION_BY_ID } from "../content/cases";
import { CLUE_BY_ID, FINDINGS } from "../content/clues";
import { CONCEPTS, QUIZ } from "../content/concepts";
import { CONV_BY_ID, NEG_BY_ID } from "../content/conversations";
import { LOCATIONS } from "../content/locations";
import { decisoesDoNivel, levelOf, LEVELS, nivelDe } from "../content/levels";
import { NIVEL_MAX } from "../content/niveis";
import { levelScenario } from "../content/scenario";
import type { ConvNode, Ctx, DecisionDef, OptionDef, Txt } from "../content/types";
import { buildEnding } from "./endings";
import { brlShort, clamp, r2 } from "./money";
import { scoreArgument } from "./negotiation";
import { aplicadosTotal, qualidadeAcesso, trambicagem } from "./scoring";
import {
  CONTENT_VERSION, MAX_DEVIATION_PCT, RULES_VERSION,
  type Action, type ActionResult, type Attrs, type CharId, type Consequence, type DecisionRecord, type Effects, type GameState, type Ledger, type LocationId, type Pending,
} from "./types";

/* ───────── contexto de texto ───────── */

export function makeCtx(scenario: GameState["scenario"], state: GameState | null, nome = "Você"): Ctx {
  const A = scenario.orcamentoAnual;
  return {
    A, unidade: scenario.unidade, municipio: scenario.municipio.nome, nome, state,
    val: (pct) => r2((A * pct) / 100),
    money: (pct) => brlShort(r2((A * pct) / 100)),
  };
}
export const txt = (t: Txt, c: Ctx) => (typeof t === "function" ? t(c) : t);

/* ───────── estado inicial ───────── */

const ID_LIMIT = 800;

function initialState(a: Extract<Action, { type: "start" }>): GameState {
  const nome = a.playerName.trim().slice(0, 28) || "Jogador(a)";
  return {
    v: 1, nivel: 1, historico: [], id: a.gameId, version: 0, rulesVersion: RULES_VERSION, contentVersion: CONTENT_VERSION, scenario: a.scenario, seed: a.seed >>> 0,
    player: { nome, avatar: a.avatar }, phase: "quiz", quizStep: 0, quizAnswers: {}, caso: 1, casoAberto: true, location: "recepcao", visited: ["recepcao"],
    attrs: { competencia: 30, rede: 20, persuasao: 25, confianca: 40, conhecimento: 8, popularidade: 35, caraDePau: 25 },
    pub: { qualidade: 50, acesso: 45, equipe: 55, sustentabilidade: 60, estoqueDias: 7, filaMin: 94, caixa: r2((a.scenario.orcamentoAnual * LEVELS[1]!.inicio.caixaPct) / 100) },
    personal: { patrimonio: 18_000, remuneracao: 0, desviado: 0, restituido: 0, baseAcumulada: 0, evidencias: 0, dependencia: 0, influencia: 5 },
    rel: {}, clues: {}, findings: {}, talked: {}, negociacoes: {}, decisions: [], ledger: [], pending: [], consequences: [], notebook: [], knowledge: {},
    achievements: [], repairs: [], ending: null, actionIds: [], actions: [], steps: 0,
  };
}

/* ───────── aplicação de efeitos ───────── */

function relOf(s: GameState, id: CharId) {
  return (s.rel[id] ??= { confianca: 50, favor: 0, conhecido: false });
}

export function applyEffects(s: GameState, fx: Effects | undefined, scale = 1) {
  if (!fx) return;
  const k = scale;
  for (const [key, v] of Object.entries(fx.attrs ?? {})) s.attrs[key as keyof Attrs] = clamp(s.attrs[key as keyof Attrs] + (v as number) * k);
  for (const [key, v] of Object.entries(fx.pub ?? {})) s.pub[key as "qualidade"] = clamp(s.pub[key as "qualidade"] + (v as number) * k);
  if (fx.estoqueDias) s.pub.estoqueDias = clamp(s.pub.estoqueDias + fx.estoqueDias * k, 0, 30);
  if (fx.filaMin) s.pub.filaMin = clamp(s.pub.filaMin + fx.filaMin * k, 18, 240);
  for (const [id, v] of Object.entries(fx.rel ?? {})) { const r = relOf(s, id as CharId); r.confianca = clamp(r.confianca + (v as number) * k); r.conhecido = true; }
  for (const [id, v] of Object.entries(fx.favor ?? {})) { const r = relOf(s, id as CharId); r.favor = clamp(r.favor + (v as number) * k, -100, 100); r.conhecido = true; }
  if (fx.evidencias) s.personal.evidencias = Math.max(0, s.personal.evidencias + fx.evidencias);
  if (fx.dependencia) s.personal.dependencia = clamp(s.personal.dependencia + fx.dependencia);
  if (fx.influencia) s.personal.influencia = clamp(s.personal.influencia + fx.influencia);
  if (fx.caixaPct) {
    const v = r2((s.scenario.orcamentoAnual * fx.caixaPct) / 100);
    s.pub.caixa = r2(s.pub.caixa + v);
    s.ledger.push({ id: `cx${s.ledger.length}`, caso: s.caso, escopo: "publico", tipo: "custo", valor: v, rotulo: "Custo adicional decorrente de decisão anterior", classificacao: "simulado" });
  }
}

function addLedger(s: GameState, actionId: string, e: Omit<Ledger, "id" | "caso" | "classificacao"> & { classificacao?: Ledger["classificacao"] }) {
  s.ledger.push({ id: `${actionId}:${s.ledger.length}`, caso: s.caso, classificacao: "simulado", ...e });
}

const unlock = (s: GameState, id: string) => { if (!s.achievements.includes(id)) s.achievements.push(id); };

/* ───────── pistas, achados e opções ───────── */

export function clueFound(s: GameState, id: string) { return !!s.clues[id]; }
export const hasFinding = (s: GameState, id: string) => !!s.findings[id];
export const conceptApplied = (s: GameState, c: string) => (s.knowledge[c]?.aplicadoEm.length ?? 0) > 0;

/** Achados reconhecidos por conhecimento aplicado (precisa das duas pistas) — "conhecimento desbloqueia análises". */
function autoFindings(s: GameState) {
  for (const f of FINDINGS) {
    if (f.caso !== s.caso || s.findings[f.id] || !f.autoPorConhecimento) continue;
    if (clueFound(s, f.a) && clueFound(s, f.b) && f.autoPorConhecimento.some((c) => conceptApplied(s, c))) s.findings[f.id] = { via: "conhecimento", at: s.steps };
  }
}

export function optionLock(s: GameState, o: OptionDef): string | null {
  const r = o.requer;
  if (!r) return null;
  if (r.achado && !hasFinding(s, r.achado)) return r.dica;
  if (r.aplicado && !conceptApplied(s, r.aplicado)) return r.dica;
  if (r.attr && s.attrs[r.attr.key] < r.attr.min) return r.dica;
  return null;
}

/** Custo efetivo (inclui ajustes por estado). Valor negativo = entrada de caixa (ex.: corte). */
export function optionCost(s: GameState, o: OptionDef): number {
  const extra = (o.ajustes ?? []).filter((a) => a.se(s)).reduce((t, a) => t + (a.custoPctExtra ?? 0), 0);
  return r2(((o.custoPct + extra) / 100) * s.scenario.orcamentoAnual);
}

/* ───────── auditoria (consulta registros existentes; nunca inventa irregularidade) ───────── */

const ADMIN_FLAGS = new Set(["atestar-sem-conferir", "consultoria-primo"]);

function auditOutcome(s: GameState, optionId: string): { tom: "bom" | "ruim" | "neutro"; titulo: string; msg: string; fx: Effects } {
  const dev = s.decisions.filter((d) => d.deliberado);
  const admin = s.decisions.filter((d) => ADMIN_FLAGS.has(d.optionId));
  const nota = optionId === "pedir-prazo" ? " O prazo concedido não alterou nenhum registro." : "";
  if (dev.length) {
    const total = dev.reduce((a, b) => a + b.desvioValor, 0);
    return { tom: "ruim", titulo: "Indícios de desvio registrados", msg: `A Controladoria encontrou ${dev.length} evento(s) com valores retirados da execução (soma simulada: ${brlShort(total)}). Os registros mostram cada decisão. A apuração foi aberta e a confiança caiu.${nota}`, fx: { attrs: { confianca: -12 }, pub: { equipe: -3 }, evidencias: 4, rel: { ana: -8 } } };
  }
  if (admin.length) {
    return { tom: "neutro", titulo: "Apontamentos administrativos", msg: `Ana registrou ${admin.length} apontamento(s) de procedimento (ex.: contratação sem cotação, atesto sem conferência). Não é irregularidade grave: é uma falha de controle que pode ser corrigida.${nota}`, fx: { attrs: { confianca: -3, competencia: -2 } } };
  }
  unlock(s, "sobrevivente-auditoria");
  return { tom: "bom", titulo: "Registros consistentes", msg: `Tudo o que estava registrado bateu com os documentos. A conferência terminou sem apontamentos.${nota}`, fx: { attrs: { confianca: 8 }, rel: { ana: 8 } } };
}

/* ───────── ação principal ───────── */

const fail = (state: GameState, error: string): ActionResult => ({ state, ok: false, error });

/** Partidas salvas antes dos níveis não têm `nivel`/`historico`: valem nível 1 sem histórico. */
export function migrarEstado<T extends GameState | null>(s: T): T {
  if (!s || (s.nivel !== undefined && s.historico !== undefined)) return s;
  return { ...s, nivel: s.nivel ?? 1, historico: s.historico ?? [] } as T;
}

export function apply(prev: GameState | null, id: string, action: Action): ActionResult {
  prev = migrarEstado(prev);
  if (!id || id.length > 80) return fail(prev as GameState, "id de ação inválido");
  if (action.type === "start") {
    if (prev) return fail(prev, "a partida já foi iniciada");
    const s0 = initialState(action);
    s0.actionIds = [id]; s0.actions = [{ id, action }]; s0.version = 1;
    return { state: s0, ok: true };
  }
  if (!prev) return fail(prev as unknown as GameState, "partida inexistente");
  if (prev.actionIds.includes(id)) return { state: prev, ok: true, duplicate: true };
  if (prev.phase === "encerrada" || prev.phase === "abandonada") {
    if (action.type !== "favorite" && !((action.type === "promote" || action.type === "replay") && prev.phase === "encerrada")) return fail(prev, "a partida já foi encerrada");
  }
  if (action.type === "replay") return replayNivel(prev, id);
  const s: GameState = structuredClone(prev);
  const res = step(s, id, action);
  if (!res.ok) return { state: prev, ok: false, error: res.error };
  s.version = prev.version + 1;
  s.actionIds = [...prev.actionIds, id].slice(-ID_LIMIT);
  s.actions = [...prev.actions, { id, action }];
  return { state: s, ok: true, note: res.note };
}

/**
 * "Jogar de novo": reconstrói, a partir do próprio registro de ações, o estado do início da fase que terminou
 * (depois da última promoção ou do quiz). Determinístico: o servidor, ao reproduzir o histórico, chega ao mesmo estado.
 */
function replayNivel(prev: GameState, id: string): ActionResult {
  if (prev.phase !== "encerrada") return fail(prev, "só é possível jogar de novo ao fim da fase");
  let corte = -1;
  prev.actions.forEach((a, i) => { if (a.action.type === "promote") corte = i; });
  if (corte < 0) prev.actions.forEach((a, i) => { if (a.action.type === "quiz.answer") corte = i; });
  if (corte < 0) return fail(prev, "não há início de fase para recomeçar");
  let st: GameState | null = null;
  for (const a of prev.actions.slice(0, corte + 1)) {
    const r: ActionResult = apply(st, a.id, a.action);
    if (!r.ok) return fail(prev, "não foi possível reconstruir o início da fase");
    st = r.state;
  }
  if (!st) return fail(prev, "não foi possível reconstruir o início da fase");
  st.version = prev.version + 1;
  st.actionIds = [...prev.actionIds, id].slice(-ID_LIMIT);
  st.actions = [...st.actions, { id, action: { type: "replay" } }];
  return { state: st, ok: true };
}

type Step = { ok: true; note?: string } | { ok: false; error: string };
const OK: Step = { ok: true };
const no = (error: string): Step => ({ ok: false, error });

function step(s: GameState, id: string, a: Exclude<Action, { type: "start" }>): Step {
  switch (a.type) {
    case "quiz.answer": {
      if (s.phase !== "quiz") return no("o quiz já foi concluído");
      const q = QUIZ[s.quizStep];
      if (!q || q.id !== a.questionId) return no("pergunta fora de ordem");
      const o = q.opcoes.find((x) => x.id === a.optionId);
      if (!o) return no("opção inexistente");
      for (const [k, v] of Object.entries(o.efeitos)) s.attrs[k as keyof Attrs] = clamp(s.attrs[k as keyof Attrs] + (v as number));
      s.quizAnswers[q.id] = o.id;
      s.quizStep++;
      if (s.quizStep >= QUIZ.length) s.phase = "jogando";
      return OK;
    }
    case "go": {
      if (s.phase !== "jogando") return no("a campanha ainda não começou");
      if (!LOCATIONS[a.location] || !levelOf(s).locais.includes(a.location)) return no("local inexistente neste nível");
      s.location = a.location;
      if (!s.visited.includes(a.location)) s.visited.push(a.location);
      return OK;
    }
    case "inspect": {
      if (s.phase !== "jogando") return no("a campanha ainda não começou");
      const c = CLUE_BY_ID[a.clueId];
      if (!c) return no("pista inexistente");
      if (c.caso !== s.caso) return no("esta pista não pertence ao caso atual");
      if (s.location !== c.location) return no("você não está no local da pista");
      if (s.clues[c.id]) return OK;
      s.clues[c.id] = { caso: s.caso, at: s.steps };
      s.steps++;
      autoFindings(s);
      return OK;
    }
    case "talk": {
      if (s.phase !== "jogando") return no("a campanha ainda não começou");
      const conv = CONV_BY_ID[a.conversationId];
      if (!conv) return no("conversa inexistente");
      if (conv.caso !== s.caso) return no("esta conversa não pertence ao caso atual");
      if (s.location !== conv.location) return no("o personagem não está aqui");
      if (s.talked[conv.id]) return OK;
      // reexecuta o caminho escolhido no grafo da conversa: o cliente não pode inventar escolhas ou efeitos
      let key: string | undefined = conv.start;
      let i = 0;
      const guard = 40;
      for (let n = 0; key && n < guard; n++) {
        const node: ConvNode | undefined = conv.nodes[key];
        if (!node) return no("nó de conversa inválido");
        applyEffects(s, node.fx);
        for (const cid of node.revela ?? []) revealClue(s, cid);
        if (node.choices?.length) {
          const pick = a.choices[i++];
          const c = node.choices.find((x) => x.id === pick);
          if (!c) return no("escolha inválida na conversa");
          applyEffects(s, c.fx);
          for (const cid of c.revela ?? []) revealClue(s, cid);
          key = c.next;
        } else key = node.next;
      }
      if (i !== a.choices.length) return no("escolhas em excesso");
      s.talked[conv.id] = { choices: a.choices, at: s.steps };
      relOf(s, conv.who).conhecido = true;
      s.steps++;
      autoFindings(s);
      return OK;
    }
    case "confront": {
      if (s.phase !== "jogando") return no("a campanha ainda não começou");
      if (!clueFound(s, a.a) || !clueFound(s, a.b) || a.a === a.b) return no("escolha duas pistas já encontradas");
      const f = FINDINGS.find((x) => x.caso === s.caso && ((x.a === a.a && x.b === a.b) || (x.a === a.b && x.b === a.a)));
      if (!f) return { ok: true, note: "Nada de novo ao comparar estas duas pistas. Tente outro par." };
      if (!s.findings[f.id]) { s.findings[f.id] = { via: "confronto", at: s.steps }; s.steps++; }
      return { ok: true, note: f.id };
    }
    case "argue": {
      if (s.phase !== "jogando") return no("a campanha ainda não começou");
      const neg = NEG_BY_ID[a.negotiationId];
      const conv = neg && Object.values(CONV_BY_ID).find((c) => c.negociacao === neg.id);
      if (!neg || !conv) return no("negociação inexistente");
      if (conv.caso !== s.caso) return no("a negociação não pertence ao caso atual");
      if (!s.talked[conv.id]) return no("converse primeiro com o personagem");
      if (s.negociacoes[neg.id]) return OK;
      const text = a.text.trim().slice(0, 700);
      if (text.length < 25) return no("escreva um argumento um pouco maior (mínimo de 25 caracteres)");
      const r = scoreArgument(neg, text);
      s.negociacoes[neg.id] = { pontos: r.pontos, criterios: r.ok };
      // persuasão: ganho pequeno e limitado; nunca altera saldos, percentuais ou histórico
      s.attrs.persuasao = clamp(s.attrs.persuasao + r.pontos);
      relOf(s, conv.who).confianca = clamp(relOf(s, conv.who).confianca + r.pontos * 2);
      if (r.pontos >= 4) unlock(s, "mestre-labia");
      s.steps++;
      return { ok: true, note: `${r.pontos}` };
    }
    case "decide":
      return decide(s, id, a);
    case "advance":
      return advance(s, id);
    case "repair": {
      if (s.phase !== "jogando") return no("a reparação só é possível durante a campanha");
      const devido = r2(s.personal.desviado - s.personal.restituido);
      const v = r2(a.valor);
      if (!(v > 0)) return no("valor inválido");
      if (devido <= 0) return no("não há valor desviado a restituir");
      if (v > devido) return no("o valor excede o que foi desviado");
      if (v > s.personal.patrimonio) return no("patrimônio fictício insuficiente");
      s.personal.patrimonio = r2(s.personal.patrimonio - v);
      s.personal.restituido = r2(s.personal.restituido + v);
      s.pub.caixa = r2(s.pub.caixa + v);
      addLedger(s, id, { escopo: "pessoal", tipo: "restituicao", valor: -v, rotulo: "Restituição voluntária de valor desviado (novo evento)" });
      addLedger(s, id, { escopo: "publico", tipo: "restituicao", valor: v, rotulo: "Valor restituído ao caixa da UPA" });
      s.repairs.push({ id, valor: v, caso: s.caso });
      s.attrs.confianca = clamp(s.attrs.confianca + Math.min(6, (v / s.personal.desviado) * 6));
      relOf(s, "guardiao").confianca = clamp(relOf(s, "guardiao").confianca + 3);
      unlock(s, "correcao-publica");
      s.steps++;
      return OK;
    }
    case "favorite": {
      const e = s.notebook.find((x) => x.id === a.entryId);
      if (!e) return no("cartão inexistente");
      e.favorito = !e.favorito;
      return OK;
    }
    case "promote": {
      if (s.phase !== "encerrada" || !s.ending) return no("a promoção só é possível ao concluir um nível");
      const n = nivelDe(s);
      if (n >= NIVEL_MAX) return no("o próximo nível ainda não está disponível");
      const porMerito = s.ending.id === "reconhecimento" && s.ending.promocao.elegivel;
      const porRede = s.ending.id === "responsabilizacao" && !!s.ending.promocao.viaRede;
      if (!porMerito && !porRede) return no("os critérios de promoção não foram cumpridos");
      const L = LEVELS[n]!, N = LEVELS[n + 1]!;
      s.historico.push({ nivel: n, cargo: L.cargo, ending: s.ending, pub: { ...s.pub }, attrs: { ...s.attrs }, decisoes: decisoesDoNivel(s, n).length });
      s.nivel = n + 1;
      s.scenario = levelScenario(s.scenario, n + 1);
      const A = s.scenario.orcamentoAnual;
      s.pub = { qualidade: N.inicio.qualidade, acesso: N.inicio.acesso, equipe: N.inicio.equipe, sustentabilidade: N.inicio.sustentabilidade, estoqueDias: N.inicio.estoqueDias, filaMin: N.inicio.filaMin, caixa: r2((A * N.inicio.caixaPct) / 100) };
      s.attrs.rede = clamp(s.attrs.rede + 6); s.attrs.popularidade = clamp(s.attrs.popularidade + 3);
      s.phase = "jogando"; s.ending = null; s.caso = N.primeiro; s.casoAberto = true; s.consequences = []; s.pending = [];
      s.location = CASE_BY_NUM[N.primeiro]!.location; s.visited = [s.location];
      unlock(s, `promovido-${n + 1}`);
      s.steps++;
      return OK;
    }
    case "replay": return no("tratado fora do passo");
    case "abandon": {
      if (s.phase !== "jogando" && s.phase !== "quiz") return no("a partida já foi encerrada");
      s.phase = "abandonada";
      s.ending = buildEnding(s, "balanco-parcial");
      return OK;
    }
  }
}

function revealClue(s: GameState, id: string) {
  const c = CLUE_BY_ID[id];
  if (c && c.caso === s.caso && !s.clues[id]) s.clues[id] = { caso: s.caso, at: s.steps };
}

/* ───────── decisão ───────── */

function decide(s: GameState, id: string, a: Extract<Action, { type: "decide" }>): Step {
  if (s.phase !== "jogando") return no("a campanha ainda não começou");
  if (!s.casoAberto) return no("a decisão deste caso já foi registrada");
  const caso = CASE_BY_NUM[s.caso];
  const dec: DecisionDef | undefined = DECISION_BY_ID[a.decisionId];
  if (!caso || !dec || dec.id !== caso.decisao) return no("decisão não corresponde ao caso atual");
  const opt = dec.opcoes.find((o) => o.id === a.optionId);
  if (!opt) return no("opção inexistente");
  const lock = optionLock(s, opt);
  if (lock) return no(`opção bloqueada: ${lock}`);

  /* Desvio exige confirmação explícita e percentual válido; qualquer outra opção NÃO aceita percentual. */
  let pct = 0;
  if (opt.desvio) {
    if (a.confirmDeviation !== true) return no("um ato de desvio exige confirmação explícita");
    const p = Number(a.deviationPct);
    if (!Number.isFinite(p) || p < 0.5 || p > MAX_DEVIATION_PCT) return no(`o percentual do desvio deve estar entre 0,5% e ${MAX_DEVIATION_PCT}%`);
    if (Math.abs(p * 2 - Math.round(p * 2)) > 1e-9) return no("o percentual deve variar em passos de 0,5%");
    pct = p;
  } else if (a.deviationPct || a.confirmDeviation) return no("esta opção não admite desvio");

  const ctx = makeCtx(s.scenario, s, s.player.nome);
  const A = s.scenario.orcamentoAnual;
  const base = r2((dec.basePct / 100) * A);
  const custo = optionCost(s, opt);

  const before = structuredClone(s);
  const notas: string[] = [];

  // 1) custo / entrada de caixa
  if (custo > 0 && custo > s.pub.caixa) {
    // sem caixa: a despesa vira obrigação futura (restos a pagar) e pesa na sustentabilidade fiscal — não "cria" dinheiro
    const falta = r2(custo - Math.max(0, s.pub.caixa));
    s.pub.sustentabilidade = clamp(s.pub.sustentabilidade - Math.ceil((falta / A) * 100 * 2.5));
    addLedger(s, id, { escopo: "publico", tipo: "obrigacao", valor: -falta, rotulo: `${dec.titulo}: obrigação assumida sem caixa suficiente (restos a pagar)`, decisionId: dec.id });
    notas.push(`Sem caixa suficiente, ${brlShort(falta)} viraram obrigação para o próximo ciclo e a sustentabilidade fiscal caiu.`);
  }
  if (custo !== 0) {
    s.pub.caixa = r2(s.pub.caixa - custo);
    addLedger(s, id, { escopo: "publico", tipo: custo < 0 ? "corte" : "custo", valor: -custo, rotulo: custo < 0 ? `${dec.titulo}: redução de custeio (reduz atendimento, não é economia de eficiência)` : `${dec.titulo}: ${opt.rotulo}`, decisionId: dec.id });
  }
  // 2) economia verificada (corte de acesso NÃO conta como eficiência)
  let economia = 0;
  if (opt.economiaPct && !opt.cortaAcesso) {
    const fator = opt.escalaPorNegociacao ? 0.5 + 0.125 * (s.negociacoes[opt.escalaPorNegociacao]?.pontos ?? 0) : 1;
    economia = r2((base * opt.economiaPct * fator) / 100);
    s.pub.caixa = r2(s.pub.caixa + economia);
    addLedger(s, id, { escopo: "publico", tipo: "economia", valor: economia, rotulo: `${dec.titulo}: economia verificada no modelo (mesmo acesso e qualidade)`, decisionId: dec.id, classificacao: "simulado" });
  }
  // 3) base elegível acumulada (denominador do Índice de Trambicagem)
  s.personal.baseAcumulada = r2(s.personal.baseAcumulada + base);
  // 4) desvio deliberado: dinheiro vai só para a conta pessoal; o serviço recebe menos
  let desvioValor = 0;
  if (opt.desvio) {
    desvioValor = r2((base * pct) / 100);
    s.personal.patrimonio = r2(s.personal.patrimonio + desvioValor);
    s.personal.desviado = r2(s.personal.desviado + desvioValor);
    s.personal.evidencias += 1 + Math.ceil(pct / 2.5);
    addLedger(s, id, { escopo: "pessoal", tipo: "desvio", valor: desvioValor, rotulo: `Ganho ilícito fictício — ${dec.titulo} (${pct}% da base, evento ${dec.id})`, decisionId: dec.id });
    addLedger(s, id, { escopo: "publico", tipo: "desvio", valor: -desvioValor, rotulo: `Recurso útil a menos neste evento (${pct}% de ${brlShort(base)})`, decisionId: dec.id });
    s.pub.qualidade = clamp(s.pub.qualidade - Math.ceil(pct * 0.9));
    s.pub.acesso = clamp(s.pub.acesso - Math.floor(pct * 0.4));
    s.pub.sustentabilidade = clamp(s.pub.sustentabilidade - Math.ceil(pct * 0.6));
    if (pct >= 9) unlock(s, "quase-10");
    if (s.personal.patrimonio >= 500_000) unlock(s, "primeiro-milhao");
  }
  // 5) efeitos imediatos e ajustes condicionados ao estado
  applyEffects(s, opt.efeitos);
  for (const aj of opt.ajustes ?? []) if (aj.se(before)) { applyEffects(s, aj.efeitos); notas.push(txt(aj.nota, ctx)); }
  if (opt.id === "aurora" || opt.id === "consultoria-primo") unlock(s, "o-primo-descobriu");

  // 6) auditoria: resultado calculado a partir dos registros
  let audit: ReturnType<typeof auditOutcome> | null = null;
  if (dec.id === "d7") { audit = auditOutcome(before, opt.id); applyEffects(s, audit.fx); }

  // 7) conhecimento: aprendido sempre; APLICADO só uma vez por situação e só em escolhas sensatas
  const aplicou: string[] = [];
  if (!s.knowledge[dec.conceito]) { s.knowledge[dec.conceito] = { aprendidoEm: s.caso, aplicadoEm: [] }; s.attrs.conhecimento = clamp(s.attrs.conhecimento + 2); }
  if (opt.kind === "competente" || opt.kind === "prudente") {
    for (const c of opt.aplica ?? []) {
      const k = s.knowledge[c];
      if (k && !k.aplicadoEm.includes(dec.id) && c !== dec.conceito) { k.aplicadoEm.push(dec.id); aplicou.push(c); s.attrs.conhecimento = clamp(s.attrs.conhecimento + 7); }
    }
  }

  // 8) consequências imediatas (com motivos observáveis) e atrasadas
  const consequences: Consequence[] = [];
  const motivo = opt.desvio
    ? `Desvio deliberado de ${pct}% sobre a base de ${brlShort(base)} (valor fictício), registrado no evento ${dec.id}.`
    : opt.kind === "competente" ? "Você decidiu com base no que investigou e preservou o serviço."
    : opt.kind === "prudente" ? "Uma escolha segura, que evita danos mas deixa parte do problema em aberto."
    : opt.kind === "comodo" ? "A escolha mais cômoda resolve o hoje e deixa uma conta para depois."
    : "A decisão não partiu de uma necessidade medida nem de comparação.";
  consequences.push({ id: `${id}:imediata`, caso: s.caso, title: audit ? audit.titulo : dec.titulo, message: [txt(opt.narracao, ctx), audit?.msg, ...notas].filter(Boolean).join(" "), reason: motivo, tom: audit ? audit.tom : opt.kind === "desvio" ? "ruim" : opt.kind === "competente" ? "bom" : opt.kind === "prudente" ? "neutro" : "ruim", delayed: false, decisionId: dec.id });
  for (const d of opt.depois ?? []) {
    const due = s.caso + d.depois;
    s.pending.push({ id: `${id}:${due}`, decisionId: dec.id, optionId: opt.id, dueCase: due, effects: d.efeitos, title: txt(d.titulo, ctx), message: txt(d.mensagem, ctx), reason: txt(d.motivo, ctx), tone: d.tom } satisfies Pending);
  }

  // 9) conquistas
  grantAchievements(s, dec, opt, economia);
  if (dec.eleicao) {
    const a = s.attrs;
    const base = 0.3 * a.confianca + 0.15 * a.popularidade + 0.2 * qualidadeAcesso(s) + 0.1 * a.persuasao + 0.1 * a.competencia + 0.05 * a.rede;
    const pct = r2(Math.max(0, Math.min(100, base + (opt.votos ?? 0) - 4)));
    s.eleicao = { pct, venceu: pct >= 50 };
  }

  // 10) caderno de gestão
  const c = CONCEPTS[dec.conceito];
  s.notebook.push({
    id: `nb-${dec.id}`, decisionId: dec.id, caso: s.caso, tema: c.tema, problema: txt(dec.pergunta, ctx), decisao: opt.rotulo,
    resultado: consequences[0]!.message, conceito: c.id, conceitoTitulo: c.titulo, conceitoTexto: c.texto, aplicacao: c.aplicacao,
    fonte: c.fonte, dificuldade: c.dificuldade, versao: CONTENT_VERSION, favorito: false,
  });

  s.decisions.push({
    id: dec.id, actionId: id, caso: s.caso, optionId: opt.id, kind: opt.kind, title: dec.titulo, optionLabel: opt.rotulo, baseElegivel: base,
    desvioPct: pct, desvioValor, custo: custo > 0 ? custo : 0, economia, receita: 0, deliberado: !!opt.desvio, gesture: opt.gesto, concept: dec.conceito,
    aplicouConceitos: aplicou as DecisionRecord["aplicouConceitos"], consequences,
  });
  s.consequences = consequences;
  s.casoAberto = false;
  s.steps++;
  return OK;
}

function grantAchievements(s: GameState, dec: DecisionDef, opt: OptionDef, economia: number) {
  if (dec.id === "d1" && opt.id === "reorganizar") unlock(s, "primeiro-desperdicio");
  if (dec.id === "d6" && (opt.id === "conferir-liquidar-parcial" || opt.id === "devolver-lote")) unlock(s, "entrega-conferida");
  if (dec.id === "d4" && opt.id === "economia-direcionada" && economia > 0) unlock(s, "economia-sem-fechar-portas");
  if (dec.id === "d8" && (opt.id === "cotar-esclarecer" || opt.id === "recusar-cordial")) unlock(s, "aliado-sem-favor");
  if (dec.id === "d10" && opt.id === "prestacao-completa") unlock(s, "prestacao-clara");
  if (opt.conquista) unlock(s, opt.conquista);
  const ok = opt.kind === "competente";
  if (dec.id === "d11") { if (opt.id === "ubs-cobertura") unlock(s, "cobertura-por-necessidade"); if (opt.id === "ubs-vereador") unlock(s, "caneta-do-vereador"); }
  if (dec.id === "d12" && opt.id === "emenda-com-plano") unlock(s, "emenda-com-plano");
  if (dec.id === "d13" && (opt.id === "aderir-ata" || opt.id === "licitar-conjunto")) unlock(s, "compra-sem-fracionar");
  if (dec.id === "d14") { if (ok) unlock(s, "fila-transparente"); if (opt.id === "pedido-vereador") unlock(s, "caneta-do-vereador"); }
  if (dec.id === "d15" && ok) unlock(s, "folha-no-limite");
  if (dec.id === "d16") { if (ok) unlock(s, "credito-legal"); if (opt.id === "remanejar-sem-lei") unlock(s, "pedalada-municipal"); }
  if (dec.id === "d17" && ok) unlock(s, "emergencia-com-recibo");
  if (dec.id === "d18" && ok) unlock(s, "contas-na-audiencia");
  if (aplicadosTotal(s) >= 3) unlock(s, "conhecimento-aplicado");
  if (s.attrs.confianca >= 75) unlock(s, "confianca-conquistada");
}

/* ───────── avanço de caso ───────── */

function advance(s: GameState, id: string): Step {
  if (s.phase !== "jogando") return no("a campanha não está em andamento");
  if (s.casoAberto) return no("registre a decisão deste caso antes de avançar");
  s.consequences = [];
  // remuneração legítima (fictícia): única entrada regular na conta pessoal
  const SALARIO = levelOf(s).salario;
  s.personal.patrimonio = r2(s.personal.patrimonio + SALARIO);
  s.personal.remuneracao = r2(s.personal.remuneracao + SALARIO);
  addLedger(s, id, { escopo: "pessoal", tipo: "remuneracao", valor: SALARIO, rotulo: "Remuneração mensal fictícia do cargo", classificacao: "simulado" });

  // pressões acumuladas: efeitos jogáveis, não só diálogo
  const press: Consequence[] = [];
  if (s.personal.dependencia >= 15) {
    applyEffects(s, { pub: { equipe: -3, qualidade: -2 } });
    press.push({ id: `${id}:dep`, caso: s.caso, title: "Aliados cobram", message: "Pedidos de aliados tomam o tempo da equipe e desviam prioridades do atendimento. Favor recebido é favor cobrado.", reason: `Dependência de aliados em ${Math.round(s.personal.dependencia)}.`, tom: "ruim", delayed: true, decisionId: "pressao" });
  }
  if (s.personal.evidencias >= 6) {
    applyEffects(s, { attrs: { confianca: -3 } });
    press.push({ id: `${id}:evid`, caso: s.caso, title: "A Controladoria pergunta", message: "Registros acumulados geram perguntas e reuniões. A confiança pública oscila a cada documento que não fecha.", reason: `Evidências acumuladas: ${s.personal.evidencias}.`, tom: "ruim", delayed: true, decisionId: "pressao" });
  }

  s.caso++;
  if (s.caso > levelOf(s).ultimo) return finish(s, press);
  // consequências atrasadas que vencem ao entrar neste caso
  const due = s.pending.filter((p) => p.dueCase <= s.caso);
  s.pending = s.pending.filter((p) => p.dueCase > s.caso);
  const out: Consequence[] = [...press];
  for (const p of due) {
    applyEffects(s, p.effects);
    const cons: Consequence = { id: p.id, caso: s.caso, title: p.title, message: p.message, reason: p.reason, tom: p.tone, delayed: true, decisionId: p.decisionId };
    out.push(cons);
    const rec = s.decisions.find((d) => d.id === p.decisionId);
    rec?.consequences.push(cons);
  }
  s.consequences = out;
  s.casoAberto = true;
  const next = CASE_BY_NUM[s.caso]!;
  s.location = next.location;
  if (!s.visited.includes(next.location)) s.visited.push(next.location);
  autoFindings(s);
  if (nivelDe(s) === 1 && s.pub.estoqueDias >= 12 && s.caso >= 9) unlock(s, "estoque-sem-surpresa");
  s.steps++;
  return OK;
}

function finish(s: GameState, press: Consequence[]): Step {
  // o que ainda estava por vencer se resolve antes do balanço
  const out: Consequence[] = [...press];
  for (const p of s.pending) {
    applyEffects(s, p.effects);
    const cons: Consequence = { id: p.id, caso: levelOf(s).ultimo, title: p.title, message: p.message, reason: p.reason, tom: p.tone, delayed: true, decisionId: p.decisionId };
    out.push(cons);
    s.decisions.find((d) => d.id === p.decisionId)?.consequences.push(cons);
  }
  s.pending = [];
  s.consequences = out;
  s.caso = levelOf(s).ultimo;
  s.casoAberto = false;
  if (s.pub.acesso >= 70 && s.pub.qualidade >= 70) unlock(s, "servico-recuperado");
  s.ending = buildEnding(s);
  s.phase = "encerrada";
  if (s.ending.id === "reconhecimento") unlock(s, "legado-continua");
  s.steps++;
  return OK;
}

export { trambicagem };
export type { LocationId };
