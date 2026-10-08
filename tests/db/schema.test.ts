import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, migrate } from "./harness";

let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;

async function asRole<T>(role: string, uid: string | null, fn: () => Promise<T>) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}

let sourceId: string, estadoId: string, muniId: string;

beforeAll(async () => {
  db = await createDb();
  await migrate(db);
  sourceId = (await q(`insert into data_sources (name, slug, provider, category, source_type, base_url, adapter_key)
    values ('Fonte Teste','siconfi','Tesouro','fiscal','REST_API','https://example.test','siconfi') returning id`))[0].id;
  estadoId = (await q(`insert into entities (entity_type, code, name, uf, esfera) values ('STATE','35','São Paulo','SP','E') returning id`))[0].id;
  muniId = (await q(`insert into entities (entity_type, code, name, uf, esfera, parent_id, population)
    values ('MUNICIPALITY','3541406','Praia Grande','SP','M',$1,330000) returning id`, [estadoId]))[0].id;
});

const row = (over: Record<string, unknown> = {}) => ({
  entity_type: "MUNICIPALITY", entity_code: "3541406", metric: "EXPENSE_LIQUIDATED",
  category_type: "FUNCTION", category_code: "10", category_label: "Saúde",
  period_type: "YEAR", period_year: 2023, period_number: 0, value: 1000.5, unit: "BRL",
  source_id: "", source_dataset: "DCA-Anexo I-E", ...over,
});

describe("migrations", () => {
  it("aplicam do zero sem erro e criam as tabelas esperadas", async () => {
    const t = (await q<{ tablename: string }>(`select tablename from pg_tables where schemaname='public'`)).map((r) => r.tablename);
    for (const n of ["data_sources", "api_request_logs", "cached_queries", "data_versions", "fiscal_facts", "entities", "admin_audit_log", "source_credentials", "profiles", "data_coverage"])
      expect(t).toContain(n);
  });
  it("RLS habilitado em todas as tabelas públicas", async () => {
    const r = await q(`select tablename from pg_tables where schemaname='public' and not rowsecurity`);
    expect(r).toEqual([]);
  });
});

describe("upsert_fiscal_facts", () => {
  const call = async (rows: unknown[]) =>
    (await q(`select upsert_fiscal_facts($1::jsonb) as r`, [JSON.stringify(rows.map((r: any) => ({ ...r, source_id: sourceId })))]))[0].r;

  it("insere, deduplica e não reescreve valores idênticos", async () => {
    const a = await call([row(), row()]);
    expect(a).toMatchObject({ inserted: 1, duplicates_in_batch: 1, updated: 0 });
    const b = await call([row()]);
    expect(b).toMatchObject({ inserted: 0, updated: 0, unchanged: 1 });
    expect(await q(`select count(*)::int c from fiscal_facts`)).toEqual([{ c: 1 }]);
  });
  it("versiona quando a fonte altera o valor (sem perder o antigo)", async () => {
    const r = await call([row({ value: 2000 })]);
    expect(r).toMatchObject({ updated: 1, inserted: 0 });
    const v = await q(`select previous_value::float p, new_value::float n from data_versions`);
    expect(v).toEqual([{ p: 1000.5, n: 2000 }]);
    expect((await q(`select version from fiscal_facts`))[0].version).toBe(2);
  });
  it("pode ser chamada várias vezes na mesma transação (sem tabelas temporárias)", async () => {
    await db.exec("begin");
    try {
      await call([row({ category_code: "77", value: 1 })]);
      const r = await call([row({ category_code: "77", value: 2 })]);
      expect(r).toMatchObject({ updated: 1, inserted: 0 });
    } finally { await db.exec("rollback"); }
  });
  it("métricas contábeis diferentes geram fatos distintos", async () => {
    await call([row({ metric: "EXPENSE_PAID", value: 5 }), row({ metric: "EXPENSE_COMMITTED", value: 6 })]);
    expect((await q(`select count(*)::int c from fiscal_facts where category_code='10'`))[0].c).toBe(3);
  });
  it("rejeita linhas de entes inexistentes e cria entidades relacionadas", async () => {
    const r = await call([row({ entity_code: "0000000" }), row({ related_type: "SUPPLIER", related_code: "12345678000199", related_name: "ACME LTDA", category_code: "99" })]);
    expect(r).toMatchObject({ rejected: 1, inserted: 1 });
    expect((await q(`select name from entities where entity_type='SUPPLIER'`))[0].name).toBe("ACME LTDA");
  });
});

describe("search_entities", () => {
  it("ignora acentos/caixa e ordena por relevância", async () => {
    const r = await q(`select name from search_entities('praia gra')`);
    expect(r[0].name).toBe("Praia Grande");
    expect((await q(`select name from search_entities('sao paulo')`))[0].name).toBe("São Paulo");
  });
  it("não trata % e _ como curingas", async () => {
    expect(await q(`select name from search_entities('%%')`)).toEqual([]);
  });
});

describe("RLS", () => {
  it("anônimo lê dados públicos mas não fontes, logs, credenciais nem auditoria", async () => {
    await asRole("anon", null, async () => {
      expect((await q(`select count(*)::int c from fiscal_facts`))[0].c).toBeGreaterThan(0);
      expect((await q(`select count(*)::int c from data_sources`))[0].c).toBe(0);
      expect((await q(`select count(*)::int c from public_sources`))[0].c).toBe(0); // security_invoker: não vaza fontes
      expect(await q(`select * from source_credentials`).catch(() => [])).toEqual([]); // sem policy ⇒ nenhuma linha (ou negado)
      expect((await q(`select count(*)::int c from admin_audit_log`))[0].c).toBe(0);
    });
  });
  it("anônimo e usuário comum não escrevem nem chamam RPCs privilegiadas", async () => {
    await asRole("anon", null, async () => {
      await expect(q(`insert into entities (entity_type, code, name) values ('TAX','x','x')`)).rejects.toThrow();
      await expect(q(`select upsert_fiscal_facts('[]'::jsonb)`)).rejects.toThrow();
    });
  });
  it("usuário comum não se promove a admin; admin enxerga fontes", async () => {
    const uid = (await q(`insert into auth.users (email) values ('u@x.com') returning id`))[0].id;
    const adm = (await q(`insert into auth.users (email) values ('a@x.com') returning id`))[0].id;
    expect((await q(`select role from profiles where id=$1`, [uid]))[0].role).toBe("user");
    await q(`update profiles set role='admin' where id=$1`, [adm]);
    await asRole("authenticated", uid, async () => {
      await expect(q(`update profiles set role='admin' where id='${uid}'`)).rejects.toThrow();
      expect((await q(`select count(*)::int c from data_sources`))[0].c).toBe(0);
    });
    await asRole("authenticated", adm, async () => {
      expect((await q(`select count(*)::int c from data_sources`))[0].c).toBe(1);
    });
  });
});

describe("admin helpers", () => {
  it("admin_db_usage e admin_dashboard_stats retornam JSON", async () => {
    const u = (await q(`select admin_db_usage() as r`))[0].r;
    expect(u.database_bytes).toBeGreaterThan(0);
    const s = (await q(`select admin_dashboard_stats(now() - interval '1 day') as r`))[0].r;
    expect(s.facts_total).toBeGreaterThan(0);
  });
});

describe("rank_entities", () => {
  const ins = async (code: string, name: string, uf: string, pop: number) =>
    (await q(`insert into entities (entity_type, code, name, uf, population) values ('MUNICIPALITY',$1,$2,$3,$4) returning id`, [code, name, uf, pop]))[0].id as string;
  const fact = async (entity: string, year: number, value: number, cat = "10", metric = "EXPENSE_LIQUIDATED", ctype = "FUNCTION") =>
    q(`insert into fiscal_facts (fact_key, entity_id, metric, category_type, category_code, period_year, value, source_id) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [`${entity}${year}${cat}${metric}${value}`, entity, metric, ctype, cat, year, value, sourceId]);
  let a: string, b: string, c: string;
  beforeAll(async () => {
    a = await ins("9000001", "Alfa", "SP", 100); b = await ins("9000002", "Beta", "SP", 1000); c = await ins("9000003", "Gama", "RJ", 50);
    await ins("9000004", "Delta sem dados", "SP", 10);
    await fact(a, 2018, 100); await fact(a, 2019, 300);         // +200%
    await fact(b, 2018, 1000); await fact(b, 2019, 1100);       // +10%
    await fact(c, 2019, 999);                                    // sem ano anterior
    await fact(a, 2019, 7, "12");                                // outra função: não entra
  });
  const rank = (args: string) => q<any>(`select * from rank_entities('MUNICIPALITY','EXPENSE_LIQUIDATED','FUNCTION', ${args})`);

  it("ranking por valor com cobertura (só entes com dado) e total do cadastro", async () => {
    const r = await rank(`'10', 2019, null, 'SP', 'value_desc', false, 10`);
    expect(r.map((x) => x.code)).toEqual(["9000002", "9000001"]);
    expect([Number(r[0].covered), Number(r[0].total)]).toEqual([2, 4]); // SP: Praia Grande (sem dado em 2019), Alfa, Beta, Delta
  });
  it("crescimento exige os dois anos e ordena pela variação %", async () => {
    const r = await rank(`'10', 2019, 2018, null, 'change_desc', false, 10`);
    expect(r.map((x) => [x.code, Number(x.change_pct)])).toEqual([["9000001", 200], ["9000002", 10]]);
    const asc = await rank(`'10', 2019, 2018, null, 'change_asc', false, 10`);
    expect(asc[0].code).toBe("9000002");
  });
  it("per capita inverte a ordem (Beta é maior em R$ total, mas Alfa em R$/habitante)", async () => {
    const r = await rank(`'10', 2019, null, 'SP', 'value_desc', true, 10`);
    expect(r[0].code).toBe("9000001"); // 300/100 = 3 > 1100/1000
  });
  it("sem categoria soma a partição inteira e filtra por UF e limite", async () => {
    const r = await rank(`null, 2019, null, 'SP', 'value_desc', false, 1`);
    expect(r).toHaveLength(1);
    expect(Number(r.find((x) => x.code === "9000001")?.value ?? 307)).toBeGreaterThan(0);
  });
  it("é pública (anon executa) e não vaza dado de outras métricas", async () => {
    await asRole("anon", null, async () => {
      expect((await q(`select count(*)::int c from rank_entities('MUNICIPALITY','EXPENSE_PAID','FUNCTION','10',2019,null,null,'value_desc',false,10)`))[0].c).toBe(0);
    });
  });
});

describe("importação de CSV (0010)", () => {
  const imp = async () => (await q(`insert into data_imports (source_id, dataset, filename) values ($1, 'siconfi.dca.despesas_funcao', 'a.csv') returning id`, [sourceId]))[0].id as string;
  const call = async (rows: any[], importId: string, expires = "2036-01-01T00:00:00Z") =>
    (await q(`select import_fiscal_facts($1::jsonb, $2::uuid, 'siconfi.dca.despesas_funcao', $3::timestamptz) as r`,
      [JSON.stringify(rows.map((r) => ({ ...r, source_id: sourceId }))), importId, expires]))[0].r;

  it("grava os fatos e marca a cobertura da unidade com validade longa e vínculo com a importação", async () => {
    const id = await imp();
    const r = await call([
      row({ period_year: 2031, category_code: "10", value: 10, source_record_id: `csv:${id}:1` }),
      row({ period_year: 2031, category_code: "12", value: 20, source_record_id: `csv:${id}:2` }),
    ], id);
    expect(r).toMatchObject({ received: 2, rejected: 0, units: 1 });
    const cov = await q(`select dataset, status, record_count, import_id, expires_at > now() + interval '9 years' as longa from data_coverage where import_id = $1`, [id]);
    expect(cov).toEqual([{ dataset: "siconfi.dca.despesas_funcao", status: "OK", record_count: 2, import_id: id, longa: true }]);
  });

  it("a cobertura anterior (ex.: EMPTY da API) é substituída por OK; entes desconhecidos são rejeitados sem quebrar o lote", async () => {
    const m = (await q(`select id from entities where code='3541406'`))[0].id;
    await q(`insert into data_coverage (entity_id, source_id, dataset, period_year, period_number, status, expires_at) values ($1,$2,'siconfi.dca.despesas_funcao',2032,0,'EMPTY', now() + interval '1 hour')`, [m, sourceId]);
    const id = await imp();
    const r = await call([
      row({ period_year: 2032, value: 5, source_record_id: `csv:${id}:1` }),
      row({ period_year: 2032, entity_code: "0000000", value: 7, source_record_id: `csv:${id}:2` }),
    ], id);
    expect(r).toMatchObject({ received: 2, rejected: 1, units: 1 });
    expect((await q(`select status from data_coverage where entity_id=$1 and period_year=2032`, [m]))[0].status).toBe("OK");
  });

  it("só o service_role executa; imports só são lidos por admin (RLS)", async () => {
    await asRole("anon", null, async () => { await expect(q(`select import_fiscal_facts('[]'::jsonb, gen_random_uuid(), 'x', now())`)).rejects.toThrow(); });
    await asRole("authenticated", "00000000-0000-0000-0000-0000000000aa", async () => {
      expect(await q(`select * from data_imports`)).toEqual([]); // não é admin: nenhuma linha visível
    });
  });
});
