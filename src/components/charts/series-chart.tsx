"use client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL, formatBRLCompact, formatNumber, formatPercent, pctChange } from "@/lib/format";

export interface ChartSeries { name: string; color: string; data: Array<{ year: number; value: number }> }

/**
 * Gráfico de evolução por ano. Linhas para séries temporais; barras quando há poucos pontos.
 * Inclui tabela equivalente para leitores de tela.
 */
export default function SeriesChart({ series, unit = "BRL", kind = "auto", height = 280 }: { series: ChartSeries[]; unit?: "BRL" | "COUNT"; kind?: "auto" | "line" | "bar"; height?: number }) {
  const years = [...new Set(series.flatMap((s) => s.data.map((d) => d.year)))].sort((a, b) => a - b);
  const rows = years.map((y) => ({ year: String(y), ...Object.fromEntries(series.map((s) => [s.name, s.data.find((d) => d.year === y)?.value ?? null])) }));
  const fmtAxis = (v: number) => (unit === "COUNT" ? formatNumber(v) : formatBRLCompact(v).replace("R$ ", ""));
  const fmtTip = (v: unknown) => (typeof v === "number" ? (unit === "COUNT" ? formatNumber(v) : formatBRL(v)) : "—");
  // variação % ano a ano (só entre anos consecutivos com dado)
  const yoy = (name: string, y: number): number | null => {
    const cur = series.find((x) => x.name === name)?.data.find((d) => d.year === y)?.value;
    const prev = series.find((x) => x.name === name)?.data.find((d) => d.year === y - 1)?.value;
    return pctChange(prev, cur);
  };
  const tip = (v: unknown, name: unknown, item: { payload?: { year?: string } }) => {
    const y = Number(item?.payload?.year);
    const c = Number.isFinite(y) ? yoy(String(name), y) : null;
    return [`${fmtTip(v)}${c === null ? "" : ` (${formatPercent(c, { signed: true })} vs ${y - 1})`}`, name] as [string, string];
  };
  const useBars = kind === "bar" || (kind === "auto" && years.length <= 3);
  const common = { data: rows, margin: { top: 8, right: 12, bottom: 0, left: 0 } };
  // Recharts 2 só reconhece filhos diretos (um Fragment esconde os eixos): usamos array com keys.
  const axes = [
      <CartesianGrid key="g" stroke="var(--color-line)" vertical={false} />,
      <XAxis key="x" dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-3)", fontSize: 12 }} />,
      <YAxis key="y" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={64} tick={{ fill: "var(--color-ink-3)", fontSize: 12 }} />,
      <Tooltip key="t" formatter={tip as never} contentStyle={{ borderRadius: 12, border: "1px solid var(--color-line)", fontSize: 13 }} />,
      ...(series.length > 1 ? [<Legend key="l" wrapperStyle={{ fontSize: 13 }} />] : []),
  ];
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`Gráfico de evolução anual: ${series.map((s) => s.name).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          {useBars ? (
            <BarChart {...common}>{axes}{series.map((s) => <Bar key={s.name} dataKey={s.name} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={56} isAnimationActive={false} />)}</BarChart>
          ) : (
            <LineChart {...common}>{axes}{series.map((s) => <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />)}</LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {years.length > 1 && (
        <div className="mt-3 space-y-2" aria-label="Variação percentual de um ano para o outro">
          <p className="text-xs font-medium text-ink-3">Variação em relação ao ano anterior</p>
          {series.map((s) => (
            <div key={s.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {series.length > 1 && <span className="mr-1 inline-flex items-center gap-1 font-medium text-ink-2"><span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />{s.name}</span>}
              {years.slice(1).map((y) => {
                const c = yoy(s.name, y);
                return (
                  <span key={y} className="tabular rounded-md bg-surface-2 px-2 py-0.5 text-ink-2">
                    {y}: <strong className={c === null ? "text-ink-3" : c >= 0 ? "text-ink" : "text-ink"}>{c === null ? "—" : formatPercent(c, { signed: true })}</strong>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <div className="sr-only"><table>
        <caption>Dados do gráfico</caption>
        <thead><tr><th>Ano</th>{series.map((s) => <th key={s.name}>{s.name}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.year}><td>{r.year}</td>{series.map((s) => { const c = yoy(s.name, Number(r.year)); return <td key={s.name}>{fmtTip((r as Record<string, unknown>)[s.name])}{c === null ? "" : ` (${formatPercent(c, { signed: true })} vs ano anterior)`}</td>; })}</tr>)}</tbody>
      </table></div>
    </div>
  );
}
