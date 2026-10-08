import { AppError } from "../core/errors";
import { DATASETS } from "../core/datasets";
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
const memo = new Map<string, { at: number; text: string; status: number }>();
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
      let httpStatus: number;
      const hit = memo.get(cfg.url);
      if (hit && ctx.now.getTime() - hit.at < 120_000) { text = hit.text; httpStatus = hit.status; }
      else {
        const res = await ctx.http.request({ url: cfg.url, label: `${ctx.source.slug} ${unit.dataset}`, encoding: cfg.encoding ?? "utf-8", maxBytes: MAX_BYTES });
        if (res.status >= 500) throw new AppError("SOURCE_UNAVAILABLE", `${ctx.source.name}: HTTP ${res.status}`, res.status);
        if (res.status >= 400) throw new AppError("BAD_RESPONSE", `${ctx.source.name}: HTTP ${res.status} ao baixar ${cfg.url}`, res.status);
        text = res.text; httpStatus = res.status;
        memo.set(cfg.url, { at: ctx.now.getTime(), text, status: res.status });
        if (memo.size > 3) memo.delete(memo.keys().next().value!);
      }
      // A partir daqui o download já deu certo (HTTP 2xx): falhas de leitura carregam o status real, não "sem status".
      const rows = csvToObjects(text, cfg.delimiter ?? ";");
      if (rows.length === 0) throw new AppError("BAD_RESPONSE", `${ctx.source.name}: arquivo vazio ou ilegível (HTTP ${httpStatus})`, httpStatus);
      const first = rows[0]!;
      for (const col of [cfg.columns.year, cfg.columns.category_code, cfg.columns.value, cfg.columns.uf].filter(Boolean) as string[]) {
        if (!(col in first)) throw new AppError("BAD_RESPONSE", `${ctx.source.name}: coluna "${col}" não existe no arquivo (colunas: ${Object.keys(first).join(", ")})`, httpStatus);
      }
      const { facts, skipped } = aggregateRows(rows, cfg, unit);
      return { facts, recordsReceived: rows.length, skipped, endpoint: cfg.url, httpStatus };
    },
  };
}

/**
 * Valida `config.datasets` contra o catálogo (`DATASETS`) ANTES de salvar: dataset conhecido e atendido pelo adaptador,
 * `metric` e `category_type` entre os valores aceitos pelo dataset, colunas e `scale` coerentes.
 * Uma configuração que o validador do Query Router rejeitaria depois (ex.: category_type "DEBT") não chega a ser gravada.
 */
export function validateFileDatasetsConfig(config: unknown, allowed: readonly string[]): void {
  const datasets = (config as { datasets?: unknown } | null)?.datasets;
  if (datasets === undefined) return;
  if (!datasets || typeof datasets !== "object" || Array.isArray(datasets)) throw new AppError("VALIDATION", 'config.datasets deve ser um objeto: { "<dataset>": { … } }');
  for (const [id, raw] of Object.entries(datasets as Record<string, unknown>)) {
    const at = `config.datasets["${id}"]`;
    const def = DATASETS[id];
    if (!def || !allowed.includes(id)) throw new AppError("VALIDATION", `${at}: dataset inválido. Valores permitidos para esta fonte: ${allowed.join(", ")}`);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AppError("VALIDATION", `${at} deve ser um objeto`);
    const c = raw as Record<string, unknown>;
    if (typeof c.url !== "string" || !c.url) throw new AppError("VALIDATION", `${at}.url é obrigatório (https://…)`);
    if (typeof c.metric !== "string" || !(def.metrics as string[]).includes(c.metric)) {
      throw new AppError("VALIDATION", `${at}.metric ${JSON.stringify(c.metric ?? null)} inválido para ${id}. Valores permitidos: ${def.metrics.join(", ")}`);
    }
    if (typeof c.category_type !== "string" || !def.categoryTypes.includes(c.category_type)) {
      throw new AppError("VALIDATION", `${at}.category_type ${JSON.stringify(c.category_type ?? null)} inválido para ${id}. Valores permitidos: ${def.categoryTypes.join(", ")}`);
    }
    const cols = c.columns as Record<string, unknown> | undefined;
    for (const k of ["year", "category_code", "value"]) {
      if (!cols || typeof cols[k] !== "string" || !cols[k]) throw new AppError("VALIDATION", `${at}.columns.${k} é obrigatório (nome da coluna no arquivo)`);
    }
    if (def.entityTypes.includes("STATE") && def.entityTypes.length > 1 && cols && cols.uf !== undefined && typeof cols.uf !== "string") throw new AppError("VALIDATION", `${at}.columns.uf deve ser texto`);
    if (c.scale !== undefined && (typeof c.scale !== "number" || !Number.isFinite(c.scale) || c.scale <= 0)) throw new AppError("VALIDATION", `${at}.scale deve ser um número maior que zero`);
    if (c.unit !== undefined && !["BRL", "COUNT", "PERCENT"].includes(String(c.unit))) throw new AppError("VALIDATION", `${at}.unit inválido. Valores permitidos: BRL, COUNT, PERCENT`);
  }
}

/** Modelo de configuração de um dataset, gerado do catálogo — nunca divergente do que o validador aceita. */
export function fileDatasetExample(datasetId: string): Record<string, unknown> {
  const def = DATASETS[datasetId];
  const states = !!def?.entityTypes.includes("STATE");
  return {
    datasets: {
      [datasetId]: {
        url: "https://…/arquivo.csv", delimiter: ";", encoding: "latin1",
        columns: { year: "Ano", ...(states ? { uf: "UF" } : {}), category_code: "Codigo", category_label: "Descricao", value: "Valor" },
        metric: def?.metrics[0] ?? "", category_type: def?.categoryTypes[0] ?? "", unit: "BRL", scale: 1,
      },
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
