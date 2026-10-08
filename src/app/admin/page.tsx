"use client";
import { AdminTitle, Stat } from "@/components/admin/ui";
import { Button, Card, Notice, Skeleton } from "@/components/ui/primitives";
import { useAdminData } from "@/lib/use-admin";
import { formatNumber } from "@/lib/format";
import { METRIC_INFO } from "@/server/core/catalog-info";
import type { DbUsageLevel } from "@/lib/db-usage";

interface Dash {
  hours: number;
  stats: { queries: number; cache_hits: number; cache_misses: number; external_calls: number; api_errors: number; avg_response_ms: number | null; facts_total: number; entities_total: number;
    top_sources: Array<{ name: string; calls: number }>; top_municipalities: Array<{ name: string; uf: string; queries: number }>; top_indicators: Array<{ metric: string; queries: number }> };
  database: { databaseBytes: number; limitBytes: number; percent: number; level: DbUsageLevel; facts: number; entities: number; logs: number };
}

const LEVEL: Record<DbUsageLevel, { label: string; color: string; tip: string }> = {
  normal: { label: "Normal", color: "var(--color-ok)", tip: "Abaixo de 60% do limite." },
  atencao: { label: "Atenção", color: "var(--color-warn)", tip: "Entre 60% e 75%: planeje podar logs/dados antigos." },
  alerta: { label: "Alerta", color: "#c2410c", tip: "Entre 75% e 85%: aja agora (limpar logs, revisar persistência ou subir de plano)." },
  critico: { label: "Crítico", color: "var(--color-bad)", tip: "Acima de 85%: risco de bloqueio por falta de espaço." },
};

export default function Page() {
  const { data, error, loading, reload } = useAdminData<Dash>("/api/admin/dashboard");
  const s = data?.stats;
  const db = data?.database;
  const mb = (b: number) => (b / 1024 / 1024).toFixed(0);
  const hit = s && s.cache_hits + s.cache_misses > 0 ? Math.round((s.cache_hits / (s.cache_hits + s.cache_misses)) * 100) : null;
  return (
    <>
      <AdminTitle title="Dashboard"><Button variant="secondary" onClick={reload}>Atualizar</Button></AdminTitle>
      {error && <Notice tone="bad">{error.message}{error.technical && <span className="mt-1 block font-mono text-xs">{error.technical}</span>}</Notice>}
      {loading && !data && <Skeleton className="h-80" />}
      {s && db && (
        <div className="space-y-6">
          <p className="text-sm text-ink-3">Últimas {data!.hours} horas.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Consultas" value={formatNumber(s.queries)} />
            <Stat label="Cache hits" value={formatNumber(s.cache_hits)} hint={hit !== null ? `${hit}% das consultas` : undefined} />
            <Stat label="Cache misses" value={formatNumber(s.cache_misses)} />
            <Stat label="Chamadas externas" value={formatNumber(s.external_calls)} />
            <Stat label="Erros de API" value={formatNumber(s.api_errors)} tone={s.api_errors > 0 ? "bad" : undefined} />
            <Stat label="Tempo médio de resposta (fonte)" value={s.avg_response_ms != null ? `${formatNumber(Number(s.avg_response_ms))} ms` : "—"} />
            <Stat label="Registros armazenados (fatos)" value={formatNumber(s.facts_total)} />
            <Stat label="Entes cadastrados" value={formatNumber(s.entities_total)} />
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">Uso do banco de dados</h2>
              <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: LEVEL[db.level].color }}>{LEVEL[db.level].label}</span>
            </div>
            <p className="tabular mt-3 text-3xl font-bold">{mb(db.databaseBytes)} MB <span className="text-lg font-normal text-ink-3">/ {mb(db.limitBytes)} MB</span></p>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={db.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Uso do banco">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(db.percent, 100)}%`, background: LEVEL[db.level].color }} />
            </div>
            <p className="mt-2 text-sm text-ink-2">{db.percent}% · {LEVEL[db.level].tip}</p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5"><h2 className="mb-3 font-semibold">Top fontes consultadas</h2><ol className="space-y-2 text-sm">{s.top_sources.map((t) => <li key={t.name} className="flex justify-between"><span>{t.name}</span><span className="tabular text-ink-3">{t.calls}</span></li>)}{!s.top_sources.length && <li className="text-ink-3">Sem dados ainda.</li>}</ol></Card>
            <Card className="p-5"><h2 className="mb-3 font-semibold">Top municípios pesquisados</h2><ol className="space-y-2 text-sm">{s.top_municipalities.map((t) => <li key={t.name + t.uf} className="flex justify-between"><span>{t.name} - {t.uf}</span><span className="tabular text-ink-3">{t.queries}</span></li>)}{!s.top_municipalities.length && <li className="text-ink-3">Sem dados ainda.</li>}</ol></Card>
            <Card className="p-5"><h2 className="mb-3 font-semibold">Top indicadores</h2><ol className="space-y-2 text-sm">{s.top_indicators.map((t) => <li key={t.metric} className="flex justify-between"><span>{METRIC_INFO[t.metric as keyof typeof METRIC_INFO]?.label ?? t.metric}</span><span className="tabular text-ink-3">{t.queries}</span></li>)}{!s.top_indicators.length && <li className="text-ink-3">Sem dados ainda.</li>}</ol></Card>
          </div>
        </div>
      )}
    </>
  );
}
