#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/grant-admin.mjs usuario@exemplo.com
// Promove um usuário JÁ CADASTRADO no Supabase Auth a administrador (primeira instalação).
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email) { console.error("Informe o e-mail: node scripts/grant-admin.mjs usuario@exemplo.com"); process.exit(1); }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await db.from("profiles").update({ role: "admin" }).eq("email", email).select("id,email,role");
if (error) { console.error("Erro:", error.message); process.exit(1); }
if (!data?.length) { console.error(`Nenhum perfil com o e-mail ${email}. Crie o usuário antes (Supabase → Authentication → Users).`); process.exit(1); }
await db.from("admin_audit_log").insert({ actor_email: "script:grant-admin", action: "user.role_changed", target_type: "user", target_id: data[0].id, details: { to: "admin" } });
console.log(`✓ ${data[0].email} agora é administrador.`);
