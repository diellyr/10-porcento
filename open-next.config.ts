import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sem cache incremental persistente: todas as páginas dinâmicas consultam o banco (Supabase), que já é o cache do produto.
export default defineCloudflareConfig();
