const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const num = new Intl.NumberFormat("pt-BR");

export const formatBRL = (v: number, cents = false) => (cents ? brlCents : brl).format(v);
export const formatNumber = (v: number) => num.format(v);

/** R$ 1,2 bi / R$ 340 mi / R$ 12 mil — leitura rápida sem perder a ordem de grandeza. */
export function formatBRLCompact(v: number): string {
  const a = Math.abs(v);
  const s = v < 0 ? "-" : "";
  const f = (x: number, unit: string) => `${s}R$ ${(Math.round(x * 10) / 10).toLocaleString("pt-BR")} ${unit}`;
  if (a >= 1e12) return f(a / 1e12, a / 1e12 >= 2 ? "trilhões" : "trilhão");
  if (a >= 1e9) return f(a / 1e9, a / 1e9 >= 2 ? "bi" : "bi");
  if (a >= 1e6) return f(a / 1e6, "mi");
  if (a >= 1e3) return f(a / 1e3, "mil");
  return `${s}R$ ${Math.round(a).toLocaleString("pt-BR")}`;
}

/** Datas só-dia ("2024-03-01") são formatadas pelas partes, sem fuso (senão voltam um dia em Brasília). */
export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};
export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—";

/** Percentual com vírgula e sinal opcional: 42,2% · +5,3% */
export function formatPercent(v: number, o: { signed?: boolean; digits?: number } = {}): string {
  const d = o.digits ?? 1;
  const s = o.signed && v > 0 ? "+" : "";
  return `${s}${v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
}
/** Variação percentual entre dois valores (null se a base for 0 ou ausente). */
export function pctChange(prev: number | null | undefined, cur: number | null | undefined): number | null {
  if (prev == null || cur == null || prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
