import { deriveKey } from "../crypto";

export interface SettingItem {
  key: string;
  set: boolean;
  required: boolean;
  note: string;
  /** como obter o valor (texto curto) */
  howTo: string;
  /** site onde a chave/credencial é criada (quando existe) */
  url?: string;
  urlLabel?: string;
}

/** Projeto Supabase a partir da URL pública (https://<ref>.supabase.co). */
const supabaseRef = (url?: string) => { try { return url ? new URL(url).hostname.split(".")[0] : undefined; } catch { return undefined; } };

/**
 * Estado das configurações do ambiente: só "definida/não definida" + onde criar cada chave. Valores NUNCA são devolvidos.
 * Função pura (recebe o ambiente) para poder ser testada.
 */
export function buildSettings(env: Record<string, string | undefined>): SettingItem[] {
  const set = (k: string) => !!env[k]?.trim();
  const ref = supabaseRef(env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKeys = ref ? `https://supabase.com/dashboard/project/${ref}/settings/api-keys` : "https://supabase.com/dashboard";
  const cron = env.CRON_SECRET?.trim() ?? "";
  return [
    { key: "NEXT_PUBLIC_SUPABASE_URL", set: set("NEXT_PUBLIC_SUPABASE_URL"), required: true, note: "URL do projeto Supabase", howTo: "Supabase → Project Settings → API → Project URL.", url: supabaseKeys, urlLabel: "Abrir chaves do Supabase" },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", set: set("NEXT_PUBLIC_SUPABASE_ANON_KEY"), required: true, note: "chave pública (Auth)", howTo: "Supabase → Project Settings → API Keys → chave publishable/anon.", url: supabaseKeys, urlLabel: "Abrir chaves do Supabase" },
    { key: "SUPABASE_SERVICE_ROLE_KEY", set: set("SUPABASE_SERVICE_ROLE_KEY"), required: true, note: "somente servidor; ignora as proteções do banco", howTo: "Supabase → Project Settings → API Keys → service_role → Reveal.", url: supabaseKeys, urlLabel: "Abrir chaves do Supabase" },
    { key: "CREDENTIALS_ENCRYPTION_KEY", set: deriveKey(env.CREDENTIALS_ENCRYPTION_KEY) !== null, required: true, note: "32 bytes em base64 ou texto aleatório de 32+ caracteres — cifra as credenciais salvas pelo painel", howTo: "Gere no gerenciador de senhas (40+ caracteres, sem espaços) ou com `openssl rand -base64 32`. Guarde um backup: sem ela as credenciais salvas ficam ilegíveis." },
    { key: "CRON_SECRET", set: cron.length >= 32 && !/\s/.test(cron), required: true, note: "protege /api/cron/health (mínimo 32 caracteres)", howTo: "Gere no gerenciador de senhas (40+ caracteres) ou com `openssl rand -hex 32`." },
    { key: "NEXT_PUBLIC_SITE_URL", set: set("NEXT_PUBLIC_SITE_URL"), required: true, note: "endereço público do site (sitemap, links)", howTo: "https:// + o endereço do site, sem barra no final." },
    { key: "PORTAL_TRANSPARENCIA_API_KEY", set: set("PORTAL_TRANSPARENCIA_API_KEY"), required: false, note: "opcional: credencial padrão (o painel Fontes de Dados tem precedência). Necessária para despesas, benefícios e contratos", howTo: "Informe o e-mail no site do Portal da Transparência; a chave chega por e-mail.", url: "https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email", urlLabel: "Criar chave do Portal da Transparência" },
    { key: "DADOS_GOV_BR_TOKEN", set: set("DADOS_GOV_BR_TOKEN"), required: false, note: "opcional: credencial padrão para o dados.gov.br", howTo: "Entre no dados.gov.br → seu perfil → Token de acesso.", url: "https://dados.gov.br", urlLabel: "Criar token no dados.gov.br" },
    { key: "UPSTASH_REDIS_REST_URL", set: set("UPSTASH_REDIS_REST_URL"), required: false, note: "opcional: limite de requisições compartilhado entre instâncias (par com o token abaixo)", howTo: "Crie um banco Redis gratuito e copie a REST URL.", url: "https://console.upstash.com", urlLabel: "Criar banco no Upstash" },
    { key: "UPSTASH_REDIS_REST_TOKEN", set: set("UPSTASH_REDIS_REST_TOKEN"), required: false, note: "opcional: token do banco Upstash", howTo: "No mesmo banco, copie o REST Token.", url: "https://console.upstash.com", urlLabel: "Criar banco no Upstash" },
  ];
}

/* ───────────── fontes de dados com chave/arquivo pendente ───────────── */

export interface PendingSource {
  slug: string;
  name: string;
  /** "key": falta chave/token da API · "csv": falta informar o endereço dos arquivos CSV */
  kind: "key" | "csv";
  howTo: string;
  /** site onde a chave é criada / onde os arquivos são publicados */
  createUrl: string;
  createLabel: string;
  /** tela do painel onde o valor é cadastrado */
  manageUrl: string;
}

interface SourceLike {
  slug: string; name: string; enabled: boolean; requiresAuth: boolean; sourceType: string;
  documentationUrl: string | null; datasetsConfigured: number | null; credential: { configured: boolean };
}

const SETUP: Record<string, { howTo: string; createUrl: string; createLabel: string }> = {
  "portal-transparencia": {
    howTo: "Informe seu e-mail no site do Portal da Transparência; a chave chega por e-mail. Depois cole em Fontes de Dados → Portal da Transparência → Credencial. Necessária para despesas, benefícios e contratos.",
    createUrl: "https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email", createLabel: "Criar chave do Portal da Transparência",
  },
  "dados-gov-br": {
    howTo: "Entre no dados.gov.br, abra seu perfil e gere o Token de acesso. Depois cole em Fontes de Dados → dados.gov.br → Credencial.",
    createUrl: "https://dados.gov.br", createLabel: "Criar token no dados.gov.br",
  },
  "receita-federal": {
    howTo: "Escolha o conjunto de dados nos Dados Abertos da Receita, copie o endereço https do arquivo CSV e cadastre-o em Fontes de Dados → Receita Federal.",
    createUrl: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos", createLabel: "Abrir Dados Abertos da Receita",
  },
  "tesouro-nacional": {
    howTo: "Encontre o conjunto de dados no Tesouro Transparente, copie o endereço https do arquivo CSV e cadastre-o em Fontes de Dados → Tesouro Nacional.",
    createUrl: "https://www.tesourotransparente.gov.br/", createLabel: "Abrir Tesouro Transparente",
  },
};

/** Fontes ativas que ainda precisam de chave de API ou do endereço dos arquivos. Função pura (testável). */
export function pendingSources(sources: SourceLike[]): PendingSource[] {
  const out: PendingSource[] = [];
  for (const s of sources) {
    if (!s.enabled) continue;
    const needsKey = s.requiresAuth && !s.credential.configured;
    const needsCsv = s.sourceType === "DATASET_DOWNLOAD" && (s.datasetsConfigured ?? 0) === 0;
    if (!needsKey && !needsCsv) continue;
    const info = SETUP[s.slug];
    out.push({
      slug: s.slug, name: s.name, kind: needsKey ? "key" : "csv",
      howTo: info?.howTo ?? (needsKey ? "Gere a chave no site do provedor e cadastre em Fontes de Dados." : "Informe o endereço https dos arquivos em Fontes de Dados."),
      createUrl: info?.createUrl ?? s.documentationUrl ?? "https://dados.gov.br",
      createLabel: info?.createLabel ?? "Abrir site do provedor",
      manageUrl: `/admin/fontes/${s.slug}`,
    });
  }
  // chaves de API primeiro (desbloqueiam mais dados), depois os arquivos CSV
  return out.sort((a, b) => Number(b.kind === "key") - Number(a.kind === "key"));
}
