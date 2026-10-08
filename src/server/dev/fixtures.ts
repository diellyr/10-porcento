/**
 * MODO DE DESENVOLVIMENTO COM FIXTURES (BRASIL_FISCAL_DEV_FIXTURES=1).
 * Executa o pipeline REAL (Query Router, adaptadores, parsers, validação, persistência) contra respostas SINTÉTICAS
 * de "fontes" simuladas. Nenhum número aqui é oficial. Bloqueado em produção; a UI exibe um aviso permanente.
 */
import { UF_NAMES, CODE_BY_UF } from "../core/geo";
import { QueryRouter } from "../router/query-router";
import { SourceRuntime } from "../router/runtime";
import { ContractService } from "../services/contracts";
import { RankingService } from "../services/rankings";
import { SourceAdminService } from "../services/source-admin";
import { fakeFetch } from "./fake-fetch";
import { memoryStack } from "./memory";
import { hashOf } from "../core/normalize";
import { EXPENSE_GROUPS, FUNCTIONS } from "../core/catalog-info";

export const DEV_FIXTURES_ENABLED = () => process.env.BRASIL_FISCAL_DEV_FIXTURES === "1" && process.env.NODE_ENV !== "production";

const REAL_CITIES = [
  { code: 3541406, name: "Praia Grande", uf: "SP", pop: 330000 }, { code: 3548500, name: "Santos", uf: "SP", pop: 420000 },
  { code: 3550308, name: "São Paulo", uf: "SP", pop: 11400000 }, { code: 3304557, name: "Rio de Janeiro", uf: "RJ", pop: 6200000 },
];

function seeded(key: string): number {
  return parseInt(hashOf(key).slice(0, 8), 16) / 0xffffffff; // 0..1 determinístico
}

function entesPayload() {
  const states = Object.entries(CODE_BY_UF).map(([uf, code]) => ({ cod_ibge: Number(code), ente: `Estado de ${UF_NAMES[uf]}`, uf, esfera: "Estado", populacao: Math.round(1e6 + seeded(code) * 4e7) }));
  const cities = [
    ...REAL_CITIES.map((c) => ({ cod_ibge: c.code, ente: `Município de ${c.name}`, uf: c.uf, esfera: "Município", populacao: c.pop })),
    ...Array.from({ length: 5570 }, (_, i) => ({ cod_ibge: 1100000 + i, ente: `Município de Cidade Fictícia ${i + 1}`, uf: "XX", esfera: "Município", populacao: 5000 + (i % 90000) })),
  ];
  return { items: [{ cod_ibge: 1, ente: "União", uf: "BR", esfera: "União", populacao: 203000000 }, ...states, ...cities], hasMore: false };
}

function scaleFor(id: number, year: number) {
  const pop = id === 1 ? 2e8 : id < 100 ? 2e7 : (REAL_CITIES.find((c) => c.code === id)?.pop ?? 40000);
  return pop * 4200 * (0.78 + (year - 2015) * 0.045) * (0.9 + seeded(`${id}`) * 0.2);
}

function dcaPayload(anexo: string, id: number, year: number) {
  const total = scaleFor(id, year);
  const items: Array<Record<string, unknown>> = [];
  const add = (cod_conta: string, conta: string, col: string, v: number, rotulo = "Despesas (Exceto Intraorçamentárias)") => items.push({ exercicio: year, cod_ibge: id, anexo, rotulo, coluna: col, cod_conta, conta, valor: Math.round(v * 100) / 100 });
  if (anexo.endsWith("I-C")) {
    const origins: Array<[string, string, number]> = [["1.1", "Impostos, Taxas e Contribuições de Melhoria", 0.34], ["1.2", "Contribuições", 0.14], ["1.3", "Receita Patrimonial", 0.02], ["1.7", "Transferências Correntes", 0.3], ["1.9", "Outras Receitas Correntes", 0.03], ["2.1", "Operações de Crédito", 0.03], ["2.4", "Transferências de Capital", 0.04]];
    let corr = 0, cap = 0;
    for (const [k, label, share] of origins) {
      const v = total * share * (0.9 + seeded(`${id}${k}${year}`) * 0.2);
      add(`${k}.0.0.00.0.0`, label, "Receitas Brutas Realizadas", v, "Receitas Orçamentárias");
      add(`${k}.0.0.00.0.0`, label, "Previsão Inicial da Receita Orçada", v * 0.95, "Receitas Orçamentárias");
      if (k.startsWith("1")) corr += v; else cap += v;
    }
    add("1.0.0.0.00.0.0", "Receitas Correntes", "Receitas Brutas Realizadas", corr, "Receitas Orçamentárias");
    add("2.0.0.0.00.0.0", "Receitas de Capital", "Receitas Brutas Realizadas", cap, "Receitas Orçamentárias");
  } else if (anexo.endsWith("I-E")) {
    const w = Object.keys(FUNCTIONS).map((k) => [k, k === "10" ? 0.22 : k === "12" ? 0.2 : k === "09" ? 0.16 : k === "28" ? 0.1 : k === "04" ? 0.08 : k === "06" ? 0.05 : k === "08" ? 0.04 : 0.15 / 20] as const);
    for (const [fn, share] of w) {
      const liq = total * share * (0.9 + seeded(`${id}${fn}${year}`) * 0.2);
      for (const [col, f] of [["Despesas Empenhadas", 1.03], ["Despesas Liquidadas", 1], ["Despesas Pagas", 0.97]] as const) add(`FU${fn}`, `${fn} - ${FUNCTIONS[fn]}`, col, liq * f);
      if (fn === "10") { add("10.301", "10.301 - Atenção Básica", "Despesas Liquidadas", liq * 0.4); add("10.302", "10.302 - Assistência Hospitalar e Ambulatorial", "Despesas Liquidadas", liq * 0.45); add("10.305", "10.305 - Vigilância Epidemiológica", "Despesas Liquidadas", liq * 0.05); }
      if (fn === "12") { add("12.361", "12.361 - Ensino Fundamental", "Despesas Liquidadas", liq * 0.6); add("12.365", "12.365 - Educação Infantil", "Despesas Liquidadas", liq * 0.25); }
    }
  } else if (anexo.endsWith("I-D")) {
    const g: Array<[string, number]> = [["3.1", 0.42], ["3.2", 0.04], ["3.3", 0.4], ["4.4", 0.08], ["4.6", 0.06]];
    for (const [k, share] of g) { const liq = total * share * (0.9 + seeded(`${id}${k}${year}`) * 0.2); for (const [col, f] of [["Despesas Empenhadas", 1.03], ["Despesas Liquidadas", 1], ["Despesas Pagas", 0.97]] as const) add(`${k}.00.00.00.00`, `${k} - ${EXPENSE_GROUPS[k]}`, col, liq * f); }
  }
  return { items, hasMore: false };
}

export function buildDevContainer() {
  if (process.env.NODE_ENV === "production") throw new Error("BRASIL_FISCAL_DEV_FIXTURES não pode ser usado em produção.");
  const stack = memoryStack();
  const ff = fakeFetch([
    { match: /apidatalake.*\/entes/, body: entesPayload() },
    { match: /apidatalake.*\/dca\?/, body: (u: string) => { const p = new URL(u).searchParams; return dcaPayload(p.get("no_anexo")!, Number(p.get("id_ente")), Number(p.get("an_exercicio"))); } },
    { match: /apidatalake.*\/rgf\?/, body: (u: string) => { const p = new URL(u).searchParams; const id = Number(p.get("id_ente")); const dc = scaleFor(id, Number(p.get("an_exercicio"))) * 0.35; return { hasMore: false, items: [{ rotulo: "DÍVIDA CONSOLIDADA - DC (I)", coluna: "Até o 3º Quadrimestre", cod_conta: "DC", valor: dc }, { rotulo: "DÍVIDA CONSOLIDADA LÍQUIDA - DCL (III) = (I - II)", coluna: "Até o 3º Quadrimestre", cod_conta: "DCL", valor: dc * 0.8 }] }; } },
    { match: /api\.portaldatransparencia.*(bolsa|bpc)/, body: (u: string) => { const p = new URL(u).searchParams; if (p.get("pagina") !== "1") return []; const n = 2000 + Math.round(seeded(`${p.get("codigoIbge")}${p.get("mesAno")}`) * 8000); return [{ id: 1, valor: n * 650, quantidadeBeneficiados: n }]; } },
    { match: /api\.portaldatransparencia.*orgaos-siafi/, body: (u: string) => (new URL(u).searchParams.get("pagina") === "1" ? [{ codigo: "36000", descricao: "Ministério da Saúde (sintético)" }, { codigo: "26000", descricao: "Ministério da Educação (sintético)" }] : []) },
    { match: /api\.portaldatransparencia.*contratos/, body: (u: string) => { const p = new URL(u).searchParams; if (p.get("pagina") !== "1") return []; const ano = p.get("dataInicial")?.slice(-4) ?? "2024"; return [1, 2, 3].map((n) => ({ id: 9000 + n + Number(ano), numero: `${n}/${ano}`, objeto: `Contrato sintético ${n} (dados de teste)`, dataInicioVigencia: `01/0${n}/${ano}`, dataFimVigencia: `31/12/${ano}`, valorInicialCompra: 100000 * n, valorFinalCompra: 120000 * n, fornecedor: { cnpjFormatado: "11.222.333/0001-81", razaoSocialReceita: "EMPRESA SINTÉTICA LTDA" }, unidadeGestora: { orgaoVinculado: { codigoSIAFI: p.get("codigoOrgao") ?? "36000", nome: "Ministério da Saúde (sintético)" } } })); } },
    { match: /dados\.gov\.br/, body: [] },
    { match: /servicodados\.ibge\.gov\.br/, body: [] },
    { match: /tesourotransparente|receitafederal/, text: "ok" },
  ]);
  const runtime = new SourceRuntime({ registry: stack.registry, fetchImpl: ff.impl, sleep: async () => undefined });
  const router = new QueryRouter({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime });
  const admin = new SourceAdminService(stack.registry, runtime, stack.cache, router);
  const contracts = new ContractService({ data: stack.data, cache: stack.cache, registry: stack.registry, runtime, catalog: router.catalog, ensureRegistry: () => router.ensureRegistry() });
  const ready = router.ensureRegistry().then(async () => {
    const pt = await stack.registry.getBySlug("portal-transparencia");
    if (pt) await stack.registry.setCredential(pt.id, "dev-fixture-key-0000");
  });
  const origEnsure = router.ensureRegistry.bind(router);
  router.ensureRegistry = async () => { await origEnsure(); await ready; };
  return { db: { rpc: async () => ({ data: 0, error: null }) } as never, ...stack, runtime, router, admin, contracts, rankings: new RankingService(stack.data) };
}
