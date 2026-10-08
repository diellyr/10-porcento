import { AppError } from "../core/errors";
import { UF_BY_CODE } from "../core/geo";
import type { FetchContext, FetchResult, FetchUnit, IGovernmentSource } from "../core/interfaces";
import { normalizeText, parseNumber } from "../core/normalize";
import type { FactInput, FiscalMetric, SourceDefinition } from "../core/types";
import { csvToObjects } from "./csv";
import { healthUrl, pingSource } from "./http";

/**
 * Adaptador genérico para fontes baseadas em arquivo (CSV): Receita Federal e Tesouro Transparente.
 *
 * As URLs e os nomes de colunas dos arquivos oficiais mudam com frequência e não são contrato estável,
 * por isso NÃO são embutidos no código: ficam em `data_sources.config.datasets` e são editáveis no painel
 * (Configurar). Sem configuração, o dataset retorna SOURCE_NOT_CONFIGURED — nunca inventamos números.
 */
export interface FileDatasetConfig {
  url: string;
  format?: "csv";
  delimiter?: string;
  encoding?: "utf-8" | "latin1";
  /** nomes das colunas no arquivo */
  columns: {
    year: string;
    uf?: string;                // sigla da UF — exigida para entes STATE
    category_code: string;
    category_label?: string;
    value: string;
  };
  metric: FiscalMetric;
  category_type: string;
  unit?: "BRL" | "COUNT" | "PERCENT";
  /** multiplicador (ex.: 1000 se o arquivo estiver em R$ mil) */
  scale?: number;
  source_page_url?: string;
}

const MAX_BYTES = 40_000_000;
const memo = new Map<string, { at: number; text: string }>();
export function clearDownloadMemo() { memo.clear(); }

function yearOf(v: string): number | null {
  const m = v.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

export function aggregateRows(rows: Array<Record<string, string>>, cfg: FileDatasetConfig, unit: FetchUnit): { facts: FactInput[]; skipped: number } {
  const c = cfg.columns;
  const uf = unit.entity.type === "STATE" ? UF_BY_CODE[unit.entity.code] : null;
  if (unit.entity.type === "STATE" && !uf) throw new AppError("VALIDATION", `UF desconhecida para o código ${unit.entity.code}`);
  if (unit.entity.type === "STATE" && !c.uf) throw new AppError("SOURCE_NOT_CONFIGURED", "dataset sem coluna de UF configurada");
  const sums = new Map<string, { label: string; value: number }>();
  let skipped = 0;
  for (const r of rows) {
    if (yearOf(r[c.year] ?? "") !== unit.year) continue;
    if (uf && c.uf && (r[c.uf] ?? "").trim().toUpperCase() !== uf) continue;
    const value = parseNumber(r[c.value]);
    const code = (r[c.category_code] ?? "").trim();
    if (value === null || !code) { skipped++; continue; }
    const key = normalizeText(code);
    const cur = sums.get(key) ?? { label: (c.category_label ? r[c.category_label] : code)?.trim() || code, value: 0 };
    cur.value += value * (cfg.scale ?? 1);
    sums.set(key, cur);
  }
  const facts: FactInput[] = [...sums.entries()].map(([key, v]) => ({
    entity_type: unit.entity.type, entity_code: unit.entity.code, metric: cfg.metric,
    category_type: cfg.category_type, category_code: key.toUpperCase().replace(/\s+/g, "_").slice(0, 40), category_label: v.label,
    period_type: "YEAR", period_year: unit.year, period_number: 0, value: Math.round(v.value * 100) / 100, unit: cfg.unit ?? "BRL",
    source_dataset: unit.dataset, source_url: cfg.source_page_url ?? cfg.url,
  }));
  return { facts, skipped };
}

export function makeFileAdapter(def: SourceDefinition, adapterKey: string, datasets: readonly string[]): IGovernmentSource {
  return {
    definition: def,
    adapterKey,
    datasets,
    async testConnection(ctx) {
      return pingSource(ctx.http, healthUrl(ctx.source, def.healthPath));
    },
    async fetchUnit(unit: FetchUnit, ctx: FetchContext): Promise<FetchResult> {
      const cfg = (ctx.source.config as { datasets?: Record<string, FileDatasetConfig> }).datasets?.[unit.dataset];
      if (!cfg?.url) throw new AppError("SOURCE_NOT_CONFIGURED", `${ctx.source.name}: dataset ${unit.dataset} sem URL configurada (Configurar → datasets)`);
      let text: string;
      const hit = memo.get(cfg.url);
      if (hit && ctx.now.getTime() - hit.at < 120_000) text = hit.text;
      else {
        const res = await ctx.http.request({ url: cfg.url, label: `${ctx.source.slug} ${unit.dataset}`, encoding: cfg.encoding ?? "utf-8", maxBytes: MAX_BYTES });
        if (res.status >= 500) throw new AppError("SOURCE_UNAVAILABLE", `${ctx.source.name}: HTTP ${res.status}`, res.status);
        if (res.status >= 400) throw new AppError("BAD_RESPONSE", `${ctx.source.name}: HTTP ${res.status} ao baixar ${cfg.url}`, res.status);
        text = res.text;
        memo.set(cfg.url, { at: ctx.now.getTime(), text });
        if (memo.size > 3) memo.delete(memo.keys().next().value!);
      }
      const rows = csvToObjects(text, cfg.delimiter ?? ";");
      if (rows.length === 0) throw new AppError("BAD_RESPONSE", `${ctx.source.name}: arquivo vazio ou ilegível`);
      const first = rows[0]!;
      for (const col of [cfg.columns.year, cfg.columns.category_code, cfg.columns.value, cfg.columns.uf].filter(Boolean) as string[]) {
        if (!(col in first)) throw new AppError("BAD_RESPONSE", `${ctx.source.name}: coluna "${col}" não existe no arquivo (colunas: ${Object.keys(first).join(", ")})`);
      }
      const { facts, skipped } = aggregateRows(rows, cfg, unit);
      return { facts, recordsReceived: rows.length, skipped, endpoint: cfg.url };
    },
  };
}

export const RECEITA_DEFINITION: SourceDefinition = {
  slug: "receita-federal",
  name: "Receita Federal",
  description: "Dados abertos da Receita Federal: arrecadação por tributo, estado e município, atividade econômica e natureza jurídica.",
  provider: "Receita Federal do Brasil",
  category: "arrecadacao",
  sourceType: "DATASET_DOWNLOAD",
  baseUrl: "https://www.gov.br/receitafederal",
  documentationUrl: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos",
  authType: "NONE",
  requiresAuth: false,
  priority: 30,
  rateLimitPerMinute: 10,
  cacheTtlMinutes: 10080,
  healthPath: "/pt-br/acesso-a-informacao/dados-abertos",
  config: { datasets: {} },
};

export const TESOURO_DEFINITION: SourceDefinition = {
  slug: "tesouro-nacional",
  name: "Tesouro Nacional",
  description: "Tesouro Transparente (CKAN): dívida pública federal, resultado do Tesouro, séries históricas e indicadores fiscais.",
  provider: "Secretaria do Tesouro Nacional",
  category: "fiscal",
  sourceType: "DATASET_DOWNLOAD",
  baseUrl: "https://www.tesourotransparente.gov.br",
  documentationUrl: "https://www.tesourotransparente.gov.br/ckan/api/3/action/help_show?name=package_show",
  authType: "NONE",
  requiresAuth: false,
  priority: 40,
  rateLimitPerMinute: 20,
  cacheTtlMinutes: 10080,
  healthPath: "/ckan/api/3/action/package_list?limit=1",
  config: { datasets: {} },
};

/** Modelo para fontes de arquivo adicionadas pelo painel: concorre (por prioridade) nos datasets de arquivo já existentes. */
export const FILE_DATASETS = ["receita.arrecadacao", "tesouro.divida_publica", "tesouro.resultado_fiscal"] as const;
export const fileTemplateAdapter: IGovernmentSource = {
  ...makeFileAdapter({ ...RECEITA_DEFINITION, slug: "file-template", name: "Fonte de arquivo (modelo)", config: { datasets: {} } }, "file", FILE_DATASETS),
  template: true,
};

export const receitaAdapter = makeFileAdapter(RECEITA_DEFINITION, "receita", ["receita.arrecadacao"]);
export const tesouroAdapter = makeFileAdapter(TESOURO_DEFINITION, "tesouro", ["tesouro.divida_publica", "tesouro.resultado_fiscal"]);
