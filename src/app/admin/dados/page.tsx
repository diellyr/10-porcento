"use client";
import { AdminTitle } from "@/components/admin/ui";
import { Card, Notice, Skeleton } from "@/components/ui/primitives";
import { useAdminData } from "@/lib/use-admin";
import { formatBRL, formatDateTime, formatNumber } from "@/lib/format";
import { METRIC_INFO } from "@/server/core/catalog-info";

interface Overview {
  by_source_metric: Array<{ source: string; metric: string; facts: number; year_min: number; year_max: number; last_fetched: string }>;
  entities_by_type: Array<{ type: string; total: number }>;
  recent_versions: Array<{ detected_at: string; previous_value: number; new_value: number; metric: string; category_code: string | null; period_year: number; entity: string }>;
}

export default function Page() {
  const { data, error, loading } = useAdminData<Overview>("/api/admin/data");
  return (
    <>
      <AdminTitle title="Dados armazenados" />
      {error && <Notice tone="bad">{error.message}</Notice>}
      {loading && !data && <Skeleton className="h-64" />}
      {data && (
        <div className="space-y-6">
          <Card className="overflow-x-auto p-0">
            <h2 className="p-5 pb-3 font-semibold">Fatos por fonte e conceito</h2>
            <table className="w-full text-left text-sm"><thead className="bg-surface-2 text-xs text-ink-3"><tr><th className="px-5 py-2">Fonte</th><th className="px-3 py-2">Conceito</th><th className="px-3 py-2 text-right">Registros</th><th className="px-3 py-2">Anos</th><th className="px-3 py-2">Última coleta</th></tr></thead>
              <tbody>{data.by_source_metric.map((r) => <tr key={r.source + r.metric} className="border-t border-line"><td className="px-5 py-2">{r.source}</td><td className="px-3 py-2">{METRIC_INFO[r.metric as keyof typeof METRIC_INFO]?.label ?? r.metric}</td><td className="tabular px-3 py-2 text-right">{formatNumber(r.facts)}</td><td className="tabular px-3 py-2">{r.year_min}–{r.year_max}</td><td className="px-3 py-2">{formatDateTime(r.last_fetched)}</td></tr>)}{!data.by_source_metric.length && <tr><td colSpan={5} className="px-5 py-6 text-center text-ink-3">Nenhum dado persistido ainda. Os dados são salvos conforme as consultas acontecem.</td></tr>}</tbody></table>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5"><h2 className="mb-3 font-semibold">Entidades</h2><ul className="space-y-1 text-sm">{data.entities_by_type.map((e) => <li key={e.type} className="flex justify-between"><span>{e.type}</span><span className="tabular text-ink-3">{formatNumber(e.total)}</span></li>)}</ul></Card>
            <Card className="p-5"><h2 className="mb-3 font-semibold">Valores revisados pelas fontes (versionamento)</h2>
              <ul className="space-y-2 text-sm">{data.recent_versions.map((v, i) => <li key={i}><span className="font-medium">{v.entity}</span> · {METRIC_INFO[v.metric as keyof typeof METRIC_INFO]?.label ?? v.metric} {v.category_code} ({v.period_year}): <span className="tabular text-ink-3">{formatBRL(v.previous_value)} → {formatBRL(v.new_value)}</span><span className="ml-1 text-xs text-ink-3">{formatDateTime(v.detected_at)}</span></li>)}{!data.recent_versions.length && <li className="text-ink-3">Nenhuma revisão detectada.</li>}</ul>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
