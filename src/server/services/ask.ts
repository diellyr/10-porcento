import { EXPENSE_GROUPS, FUNCTIONS, METRIC_INFO } from "../core/catalog-info";
import type { IDataRepository, IQueryEngine } from "../core/interfaces";
import { parseQuestion } from "../intent/parser";
import { formatBRL, formatNumber } from "@/lib/format";
import { aggregatePoints, type Point } from "./views";
import type { RankingResult } from "./rankings";

const VERB: Partial<Record<string, string>> = {
  EXPENSE_LIQUIDATED: "liquidou (despesa liquidada)", EXPENSE_COMMITTED: "empenhou (despesa empenhada)", EXPENSE_PAID: "pagou (despesa paga)",
  REVENUE_REALIZED: "arrecadou", DEBT: "tinha de dívida", BENEFIT_VALUE: "recebeu em benefícios", BENEFICIARIES: "teve de beneficiários",
};

function sentence(entity: string, p: Point[], metric: string, unit: string, label: string | null): string {
  if (!p.length) return `Ainda não há dado oficial disponível para ${entity} neste período.`;
  const fmt = (v: number) => (unit === "COUNT" ? formatNumber(v) : formatBRL(v));
  const what = label ? ` — ${label}` : "";
  const parts = p.map((x) => `${x.year}: ${fmt(x.value)}`).join("; ");
  return p.length === 1
    ? `Em ${p[0]!.year}, ${entity} ${VERB[metric] ?? "registrou"} ${fmt(p[0]!.value)}${what}.`
    : `${entity}${what} (${METRIC_INFO[metric as keyof typeof METRIC_INFO]?.label ?? metric}) — ${parts}.`;
}

const ORDER_TEXT: Record<string, string> = { value_desc: "maiores valores", value_asc: "menores valores", change_desc: "maior aumento", change_asc: "maior redução" };
const METRIC_TEXT: Record<string, string> = { EXPENSE_LIQUIDATED: "despesa liquidada", EXPENSE_COMMITTED: "despesa empenhada", EXPENSE_PAID: "despesa paga", REVENUE_REALIZED: "receita arrecadada" };

export function rankingSentence(r: RankingResult): string {
  const q = r.query;
  const scope = q.entity_type === "STATE" ? "estados" : q.uf ? `municípios de ${q.uf}` : "municípios";
  const cat = q.category_code ? ` — ${FUNCTIONS[q.category_code] ?? EXPENSE_GROUPS[q.category_code] ?? q.category_code}` : "";
  const period = q.compare_year ? `${q.compare_year} → ${q.year}` : String(q.year);
  if (!r.items.length) return `Ainda não há dados salvos de ${scope} para este recorte (${METRIC_TEXT[q.metric]}${cat}, ${period}).`;
  const money = (v: number) => (q.per_capita ? `${formatBRL(v)}/hab.` : formatBRL(v));
  const lines = r.items.slice(0, 5).map((i, n) => `${n + 1}. ${i.name}${i.uf && q.entity_type === "MUNICIPALITY" ? `-${i.uf}` : ""}: ${money(i.value)}${i.changePct != null ? ` (${i.changePct >= 0 ? "+" : ""}${i.changePct.toLocaleString("pt-BR")}%)` : ""}`);
  return `Ranking de ${scope} por ${ORDER_TEXT[q.order]} — ${METRIC_TEXT[q.metric]}${cat}, ${period}${q.per_capita ? ", por habitante" : ""}:\n${lines.join("\n")}`;
}

export async function answerQuestion(question: string, deps: { data: Pick<IDataRepository, "searchEntities">; engine: IQueryEngine; now: Date; ranking?: { rank(q: unknown): Promise<RankingResult> } }) {
  const parsed = await parseQuestion(question, { data: deps.data, now: deps.now });
  if (parsed.status === "ranking") {
    if (!deps.ranking) return { status: "unsupported" as const, message: "Rankings não estão disponíveis neste ambiente.", intent: null, answers: [], ranking: null };
    const r = await deps.ranking.rank(parsed.query);
    return { status: "ok" as const, message: null, intent: null, answers: [], ranking: { text: rankingSentence(r), note: r.note, items: r.items, covered: r.covered, total: r.total, complete: r.complete, query: r.query } };
  }
  if (parsed.status !== "ok") return { status: parsed.status, message: parsed.message, intent: null, answers: [], ranking: null };
  const results = await Promise.all(parsed.specs.map((s) => deps.engine.execute(s)));
  const answers = results.map((r, i) => {
    const ent = parsed.entities[i]!;
    // quando há categoria, os pontos já são dela; sem categoria, apresentamos o total por ano quando for partição exclusiva
    let points = aggregatePoints(r.facts);
    const cat = r.spec.category_code;
    if (!cat && r.spec.category_type === "FUNCTION") points = sumByYear(points);
    const label = cat ? (FUNCTIONS[cat] ?? points[0]?.categoryLabel ?? cat) : null;
    return {
      entity: { type: ent.type, code: ent.code, name: ent.name, uf: ent.uf }, spec: r.spec, points,
      text: sentence(ent.uf ? `${ent.name}-${ent.uf}` : ent.name, points, r.spec.metric, points[0]?.unit ?? "BRL", label),
      freshness: r.freshness, notice: r.notice, provenance: r.provenance,
    };
  });
  return { status: "ok" as const, message: null, intent: parsed.intent, answers, ranking: null };
}

function sumByYear(points: Point[]): Point[] {
  const m = new Map<number, Point>();
  for (const p of points) {
    const cur = m.get(p.year);
    m.set(p.year, cur ? { ...cur, value: cur.value + p.value } : { ...p, categoryCode: null, categoryLabel: null });
  }
  return [...m.values()];
}
