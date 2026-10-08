import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase/migrations");

/** Cria um Postgres em memória com o mínimo do ambiente Supabase (roles + schema auth) e aplica TODAS as migrations. */
export async function createDb() {
  const db = new PGlite({ extensions: { pg_trgm, unaccent } });
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema if not exists extensions;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    grant usage on schema extensions to anon, authenticated, service_role;
  `);
  return db;
}

export async function migrate(db: PGlite) {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    await db.exec(readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"));
  }
  // equivalente aos default privileges do Supabase
  await db.exec(`
    grant usage on schema extensions to anon, authenticated, service_role;
    grant select on all tables in schema public to anon, authenticated;
    grant all on all tables in schema public to service_role;
    grant execute on all functions in schema extensions to anon, authenticated, service_role;
  `);
}
