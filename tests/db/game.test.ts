import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, migrate } from "./harness";

let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
async function asRole<T>(role: string, uid: string | null, fn: () => Promise<T>) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
const U1 = "11111111-1111-1111-1111-111111111111", U2 = "22222222-2222-2222-2222-222222222222";
const S1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const scenario = { id: "ficticio", hash: "abc12345", kind: "ficticio" };
const state = (v: number, extra: object = {}) => ({ rulesVersion: "r1", contentVersion: "c1", version: v, phase: "jogando", caso: 1, ending: null, achievements: ["primeiro-desperdicio"], notebook: [{ id: "nb-d1", tema: "Estoque", conceito: "medir-antes", favorito: false }], ...extra });

beforeAll(async () => {
  db = await createDb(); await migrate(db);
  await db.exec(`insert into auth.users (id, email) values ('${U1}','a@x.test'),('${U2}','b@x.test')`);
});

describe("estrutura do jogo (migration 0011)", () => {
  it("RLS ativo em todas as tabelas game_*", async () => {
    const r = await q(`select tablename from pg_tables where schemaname='public' and tablename like 'game_%' and not rowsecurity`);
    expect(r).toEqual([]);
  });

  it("cria partida e histórico atomicamente, e reflete caderno e conquistas", async () => {
    const r = await q(`select public.game_create_save($1,$2,$3::jsonb,$4::jsonb,$5::jsonb) as r`, [U1, S1, JSON.stringify(scenario), JSON.stringify(state(2)), JSON.stringify([{ id: "a1", action: { type: "start" } }, { id: "a2", action: { type: "go" } }])]);
    expect(r[0].r).toMatchObject({ version: 2, events: 2 });
    expect((await q(`select count(*)::int n from game_events where save_id=$1`, [S1]))[0].n).toBe(2);
    expect((await q(`select count(*)::int n from game_notebook_entries where save_id=$1`, [S1]))[0].n).toBe(1);
    expect((await q(`select count(*)::int n from game_achievements where user_id=$1`, [U1]))[0].n).toBe(1);
  });

  it("ação repetida (mesmo action_id) não aplica de novo; versão errada é recusada", async () => {
    const a = await q(`select public.game_commit_action($1,$2,2,'a3','{"type":"go"}'::jsonb,$3::jsonb) as r`, [U1, S1, JSON.stringify(state(3))]);
    expect(a[0].r).toMatchObject({ duplicate: false, version: 3 });
    const b = await q(`select public.game_commit_action($1,$2,2,'a3','{"type":"go"}'::jsonb,$3::jsonb) as r`, [U1, S1, JSON.stringify(state(3))]);
    expect(b[0].r).toMatchObject({ duplicate: true, version: 3 });
    await expect(q(`select public.game_commit_action($1,$2,1,'a4','{}'::jsonb,$3::jsonb)`, [U1, S1, JSON.stringify(state(4))])).rejects.toThrow(/version_conflict/);
    expect((await q(`select count(*)::int n from game_events where save_id=$1`, [S1]))[0].n).toBe(3);
  });

  it("outro usuário não consegue commitar na partida alheia", async () => {
    await expect(q(`select public.game_commit_action($1,$2,3,'x1','{}'::jsonb,$3::jsonb)`, [U2, S1, JSON.stringify(state(4))])).rejects.toThrow(/save_not_found/);
  });

  it("RLS: dono lê só o que é seu; o cliente não escreve nem lê como anônimo; funções não são executáveis pelo cliente", async () => {
    expect(await asRole("authenticated", U1, () => q(`select id from game_saves`))).toHaveLength(1);
    expect(await asRole("authenticated", U2, () => q(`select id from game_saves`))).toHaveLength(0);
    expect(await asRole("authenticated", U2, () => q(`select * from game_events`))).toHaveLength(0);
    await expect(asRole("authenticated", U1, () => q(`update game_saves set state='{}'::jsonb`))).rejects.toThrow(/permission denied/);
    await expect(asRole("authenticated", U1, () => q(`insert into game_profiles (user_id, display_name) values ('${U1}','Eu')`))).rejects.toThrow(/permission denied/);
    // anônimo: sem policy, nenhuma linha (no Supabase real o privilégio também é revogado)
    expect(await asRole("anon", null, () => q(`select * from game_saves`).catch(() => []))).toHaveLength(0);
    await expect(asRole("authenticated", U1, () => q(`select public.game_commit_action('${U1}','${S1}',3,'z','{}'::jsonb,'{}'::jsonb)`))).rejects.toThrow(/permission denied/);
  });

  it("limite diário de uso (voz/IA) é atômico", async () => {
    const t = async () => (await q(`select public.game_usage_take($1,'tts',100,2,1000) as ok`, [U1]))[0].ok;
    expect(await t()).toBe(true); expect(await t()).toBe(true); expect(await t()).toBe(false);
  });

  it("perfil: nome e avatar são validados pelo banco", async () => {
    await expect(q(`insert into game_profiles (user_id, display_name) values ($1,'X')`, [U1])).rejects.toThrow();
    await expect(q(`insert into game_profiles (user_id, display_name, avatar) values ($1,'Dielly','hack')`, [U1])).rejects.toThrow();
    await q(`insert into game_profiles (user_id, display_name, avatar) values ($1,'Dielly','av3')`, [U1]);
    expect(await asRole("authenticated", U1, () => q(`select display_name from game_profiles`))).toHaveLength(1);
  });
});
