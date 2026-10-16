import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sem cache incremental persistente: todas as páginas dinâmicas consultam o banco (Supabase), que já é o cache do produto.
// O script "build" do projeto roda o OpenNext (o painel da Cloudflare faz `npm run build` + `wrangler deploy`); o OpenNext chama o build do Next abaixo.
export default { ...defineCloudflareConfig(), buildCommand: "npm run build:next" };
