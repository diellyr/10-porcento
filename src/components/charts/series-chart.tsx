"use client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL, formatBRLCompact, formatNumber } from "@/lib/format";

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
  const useBars = kind === "bar" || (kind === "auto" && years.length <= 3);
  const common = { data: rows, margin: { top: 8, right: 12, bottom: 0, left: 0 } };
  // Recharts 2 só reconhece filhos diretos (um Fragment esconde os eixos): usamos array com keys.
  const axes = [
      <CartesianGrid key="g" stroke="var(--color-line)" vertical={false} />,
      <XAxis key="x" dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-3)", fontSize: 12 }} />,
      <YAxis key="y" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={64} tick={{ fill: "var(--color-ink-3)", fontSize: 12 }} />,
      <Tooltip key="t" formatter={fmtTip} contentStyle={{ borderRadius: 12, border: "1px solid var(--color-line)", fontSize: 13 }} />,
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
      <table className="sr-only">
        <caption>Dados do gráfico</caption>
        <thead><tr><th>Ano</th>{series.map((s) => <th key={s.name}>{s.name}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.year}><td>{r.year}</td>{series.map((s) => <td key={s.name}>{fmtTip((r as Record<string, unknown>)[s.name])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
