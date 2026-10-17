"use client";
import { useRef, useState } from "react";
import { AdminTitle, Stat } from "@/components/admin/ui";
import { SourceCard } from "@/components/admin/source-card";
import { Button, Card, Notice, Skeleton } from "@/components/ui/primitives";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { useAdminData } from "@/lib/use-admin";
import { CAPITAIS } from "@/game/content/capitais";
import { formatNumber } from "@/lib/format";
import type { SourceView } from "@/server/services/source-admin";

interface Personagem { id: string; nome: string; papel: string; genero: string; direcao: string; voiceId: string; efetivo: { id: string | null; origem: "painel" | "ambiente" | "padrao" }; padrao: string | null }
interface Overview {
  integrations: SourceView[]; model: string;
  voices: { personagens: Personagem[]; falas: number; caracteres: number };
  banco: Record<"perfis" | "partidas" | "eventos" | "cenarios" | "fatos" | "entes", number | null>;
  ambiente: { supabaseUrl: boolean; serviceRole: boolean; chaveCredenciais: boolean };
}

/** O que cada integração precisa do administrador e onde conseguir (o que não dá para pré-configurar). */
const PENDENCIA: Record<string, { quem: string; como: string; link: string }> = {
  "portal-transparencia": { quem: "Chave de API do Portal da Transparência", como: "Cadastro gratuito com e-mail (pode pedir conta gov.br/CPF do responsável). A chave chega por e-mail.", link: "https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email" },
  "dados-gov-br": { quem: "Token do dados.gov.br", como: "Entre com a conta gov.br em dados.gov.br → Minha conta → Token de acesso.", link: "https://dados.gov.br/" },
  "elevenlabs-voz": { quem: "Chave de API do ElevenLabs", como: "elevenlabs.io → Settings → API Keys (crie uma chave com permissão de Text to Speech).", link: "https://elevenlabs.io/app/settings/api-keys" },
  "anthropic-ia": { quem: "Chave de API da Anthropic (opcional)", como: "console.anthropic.com → API Keys. Sem ela, o Guardião responde com falas escritas.", link: "https://console.anthropic.com/settings/keys" },
};

const fmt = (n: number | null) => (n === null ? "—" : formatNumber(n));
const errOf = (e: unknown) => (e instanceof AdminApiError ? e : new AdminApiError(String(e)));

export default function Page() {
  const { data, error, loading, reload } = useAdminData<Overview>("/api/admin/jogo");
  const [list, setList] = useState<SourceView[] | null>(null);
  const items = list ?? data?.integrations ?? [];
  const setOne = (s: SourceView) => setList(items.map((x) => (x.slug === s.slug ? s : x)));
  const pendentes = items.filter((s) => s.requiresAuth && !s.credential.configured);

  return (
    <>
      <AdminTitle title="Jogo · MEUS 10%"><Button variant="secondary" onClick={() => { setList(null); reload(); }}>Atualizar</Button></AdminTitle>
      {error && <Notice tone="bad">{error.message}{error.technical && <span className="mt-1 block font-mono text-xs">{error.technical}</span>}</Notice>}
      {loading && !data && <Skeleton className="h-80" />}
      {data && (
        <div className="space-y-8">
          <section aria-labelledby="h-status" className="space-y-3">
            <h2 id="h-status" className="text-lg font-semibold">Banco e ambiente</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <Stat label="Perfis de jogador" value={fmt(data.banco.perfis)} />
              <Stat label="Partidas" value={fmt(data.banco.partidas)} />
              <Stat label="Ações registradas" value={fmt(data.banco.eventos)} />
              <Stat label="Cenários congelados" value={fmt(data.banco.cenarios)} />
              <Stat label="Fatos fiscais" value={fmt(data.banco.fatos)} hint="dados oficiais salvos" />
              <Stat label="Entes cadastrados" value={fmt(data.banco.entes)} />
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {([["Supabase (URL pública)", data.ambiente.supabaseUrl], ["Chave de serviço do Supabase", data.ambiente.serviceRole], ["Chave de criptografia das credenciais", data.ambiente.chaveCredenciais]] as const).map(([l, ok]) => (
                <span key={l} className={`rounded-full px-3 py-1 font-medium ${ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>{ok ? "✓" : "✕"} {l}</span>
              ))}
            </div>
          </section>

          <section aria-labelledby="h-apis" className="space-y-4">
            <h2 id="h-apis" className="text-lg font-semibold">APIs do jogo</h2>
            <p className="max-w-3xl text-sm text-ink-2">Já vêm cadastradas com endereço, limites e cache ajustados. Use <strong>Testar conexão</strong> para conferir e <strong>Configurar</strong> para editar endereço, limites, prioridade e a credencial (guardada cifrada; nunca é exibida de novo).</p>
            {pendentes.length > 0 && (
              <Notice tone="warn">
                <strong>Pendente com você ({pendentes.length}):</strong>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {pendentes.map((s) => { const p = PENDENCIA[s.slug]; return <li key={s.slug}>{p ? <><strong>{p.quem}.</strong> {p.como} <a className="underline" href={p.link} target="_blank" rel="noopener noreferrer">Abrir ↗</a></> : <>{s.name}: credencial não configurada.</>} <span className="text-ink-3">Depois, cole em <em>Configurar</em> da fonte.</span></li>; })}
                </ul>
              </Notice>
            )}
            <div className="space-y-4">{items.map((s) => <SourceCard key={s.slug} source={s} onChange={setOne} />)}</div>
          </section>

          <Preload onDone={reload} />
          <Voices data={data} onSaved={reload} />
        </div>
      )}
    </>
  );
}

/* ───────────── pré-carga dos dados oficiais ───────────── */
type Row = { code: string; nome: string; uf: string; state: "espera" | "rodando" | "ok" | "sem" | "falha"; msg?: string };

function Preload({ onDone }: { onDone: () => void }) {
  const [rows, setRows] = useState<Row[]>(CAPITAIS.map((c) => ({ ...c, state: "espera" })));
  const [run, setRun] = useState(false);
  const stop = useRef(false);
  const patch = (code: string, p: Partial<Row>) => setRows((r) => r.map((x) => (x.code === code ? { ...x, ...p } : x)));

  const start = async () => {
    stop.current = false; setRun(true);
    const todo = rows.filter((r) => r.state !== "ok").map((r) => r.code);
    let ok = 0, semDado = 0, falhas = 0;
    for (const code of todo) {
      if (stop.current) break;
      patch(code, { state: "rodando", msg: undefined });
      try {
        const r = await adminFetch<{ healthSpending: number | null; year: number | null; freshness: string; notice: string | null }>("/api/admin/jogo/preload", { method: "POST", body: { code } });
        if (r.healthSpending === null) { semDado++; patch(code, { state: "sem", msg: r.notice ?? `sem dado (${r.freshness})` }); }
        else { ok++; patch(code, { state: "ok", msg: `saúde ${r.year}: R$ ${formatNumber(r.healthSpending)}` }); }
      } catch (e) { falhas++; patch(code, { state: "falha", msg: errOf(e).message }); }
    }
    await adminFetch("/api/admin/jogo/preload", { method: "POST", body: { code: "0000000", final: true, resumo: { ok, semDado, falhas } } }).catch(() => undefined);
    setRun(false); onDone();
  };
  const feitas = rows.filter((r) => r.state === "ok").length;
  return (
    <section aria-labelledby="h-pre" className="space-y-3">
      <h2 id="h-pre" className="text-lg font-semibold">Dados oficiais das capitais</h2>
      <p className="max-w-3xl text-sm text-ink-2">Consulta o Siconfi (Tesouro Nacional) para cada capital, grava os fatos no banco com a origem e congela o cenário do jogo. Ausência de dado nunca vira zero: a capital aparece como “sem dado”.</p>
      <div className="flex flex-wrap items-center gap-3">
        {!run ? <Button onClick={() => void start()}>{feitas ? "Continuar pré-carga" : "Pré-carregar as 27 capitais"}</Button> : <Button variant="secondary" onClick={() => { stop.current = true; }}>Parar</Button>}
        <span className="tabular text-sm text-ink-2" role="status">{feitas} de {rows.length} com dado oficial</span>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm"><caption className="sr-only">Situação da pré-carga por capital</caption>
          <thead className="bg-surface-2 text-left text-xs text-ink-3"><tr><th className="px-3 py-2">UF</th><th className="px-3 py-2">Capital</th><th className="px-3 py-2">Situação</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.code} className="border-t border-line"><td className="px-3 py-1.5 font-medium">{r.uf}</td><td className="px-3 py-1.5">{r.nome}</td>
              <td className={`px-3 py-1.5 ${r.state === "ok" ? "text-ok" : r.state === "falha" ? "text-bad" : r.state === "sem" ? "text-warn" : "text-ink-3"}`}>{{ espera: "Aguardando", rodando: "Consultando…", ok: "✓ ", sem: "⚠ ", falha: "✕ " }[r.state]}{r.msg}</td></tr>
          ))}</tbody>
        </table>
      </Card>
    </section>
  );
}

/* ───────────── vozes ───────────── */
function Voices({ data, onSaved }: { data: Overview; onSaved: () => void }) {
  const eleven = data.integrations.find((s) => s.slug === "elevenlabs-voz");
  const [ids, setIds] = useState<Record<string, string>>(() => Object.fromEntries(data.voices.personagens.map((p) => [p.id, p.voiceId])));
  const [model, setModel] = useState(data.model);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [prog, setProg] = useState<{ n: number; total: number; geradas: number; emCache: number; falhas: number; ultimo?: string } | null>(null);
  const stop = useRef(false);
  const ready = !!eleven?.credential.configured;

  const save = async () => {
    setBusy("save"); setMsg(null);
    try { await adminFetch("/api/admin/jogo/voices", { method: "PUT", body: { voices: ids, model } }); setMsg({ tone: "ok", text: "Vozes salvas. IDs vazios usam a voz sugerida." }); onSaved(); }
    catch (e) { const x = errOf(e); setMsg({ tone: "bad", text: x.message + (x.technical ? ` — ${x.technical}` : "") }); }
    setBusy(null);
  };
  const play = async (personagem: string) => {
    setBusy(`t-${personagem}`); setMsg(null);
    try {
      const r = await fetch("/api/admin/jogo/voices/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personagem, voiceId: ids[personagem] || undefined }) });
      if (!r.ok) { const j = await r.json().catch(() => null); throw new AdminApiError(j?.error?.message ?? "Falha ao gerar a amostra", j?.error?.technical); }
      const url = URL.createObjectURL(await r.blob()); const a = new Audio(url); a.onended = () => URL.revokeObjectURL(url); await a.play();
    } catch (e) { const x = errOf(e); setMsg({ tone: "bad", text: x.message + (x.technical ? ` — ${x.technical}` : "") }); }
    setBusy(null);
  };
  const generateAll = async () => {
    stop.current = false; setMsg(null);
    const { lines } = await adminFetch<{ lines: Array<{ id: string; nome: string }> }>("/api/admin/jogo/voices/lines");
    const p = { n: 0, total: lines.length, geradas: 0, emCache: 0, falhas: 0, ultimo: undefined as string | undefined };
    setProg({ ...p });
    for (const l of lines) {
      if (stop.current) break;
      try { const r = await adminFetch<{ status: string }>("/api/admin/jogo/voices/generate", { method: "POST", body: { id: l.id } }); if (r.status === "gerado") p.geradas++; else p.emCache++; }
      catch (e) { p.falhas++; p.ultimo = `${l.nome}: ${errOf(e).message}`; if (p.falhas >= 3 && p.geradas + p.emCache === 0) { stop.current = true; } }
      p.n++; setProg({ ...p });
    }
    await adminFetch("/api/admin/jogo/voices/generate", { method: "POST", body: { id: "-", final: true, resumo: { geradas: p.geradas, emCache: p.emCache, falhas: p.falhas } } }).catch(() => undefined);
    setBusy(null);
  };

  return (
    <section aria-labelledby="h-voz" className="space-y-3">
      <h2 id="h-voz" className="text-lg font-semibold">Vozes dos personagens</h2>
      <p className="max-w-3xl text-sm text-ink-2">Cada personagem tem uma voz sugerida (vozes prontas do ElevenLabs). Troque colando o ID de outra voz da sua conta. O modelo <code>{model}</code> fala português. As falas geradas ficam em cache e o jogo as usa sem gastar cota.</p>
      {!ready && <Notice tone="warn"><strong>Pendente:</strong> cadastre a chave do ElevenLabs no cartão “ElevenLabs — vozes do jogo” acima para testar e gerar.</Notice>}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm"><caption className="sr-only">Voz de cada personagem</caption>
          <thead className="bg-surface-2 text-left text-xs text-ink-3"><tr><th className="px-3 py-2">Personagem</th><th className="px-3 py-2">ID da voz (vazio = sugerida)</th><th className="px-3 py-2">Em uso</th><th className="px-3 py-2"><span className="sr-only">Ação</span></th></tr></thead>
          <tbody>{data.voices.personagens.map((p) => (
            <tr key={p.id} className="border-t border-line align-top">
              <td className="px-3 py-2"><strong>{p.nome}</strong><span className="block text-xs text-ink-3">{p.papel}</span><span className="block max-w-xs text-xs text-ink-3">{p.direcao}</span></td>
              <td className="px-3 py-2"><label className="sr-only" htmlFor={`v-${p.id}`}>ID da voz de {p.nome}</label>
                <input id={`v-${p.id}`} value={ids[p.id] ?? ""} onChange={(e) => setIds({ ...ids, [p.id]: e.target.value })} placeholder={p.padrao ?? "ID da voz"} className="h-10 w-64 max-w-full rounded-lg border border-line bg-surface px-3 font-mono text-xs" spellCheck={false} autoComplete="off" /></td>
              <td className="px-3 py-2 text-xs text-ink-2">{p.efetivo.origem === "painel" ? "painel" : p.efetivo.origem === "ambiente" ? "variável de ambiente" : "sugerida"}</td>
              <td className="px-3 py-2"><Button variant="secondary" disabled={!ready || busy === `t-${p.id}`} onClick={() => void play(p.id)}>{busy === `t-${p.id}` ? "Gerando…" : "▶ Testar"}</Button></td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">Modelo<input value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 block h-10 w-60 rounded-lg border border-line bg-surface px-3 font-mono text-xs" spellCheck={false} /></label>
        <Button disabled={busy === "save"} onClick={() => void save()}>{busy === "save" ? "Salvando…" : "Salvar vozes"}</Button>
      </div>
      <div className="rounded-xl border border-line p-4">
        <h3 className="font-semibold">Gerar todas as falas fixas</h3>
        <p className="mt-1 text-sm text-ink-2">{data.voices.falas} falas · ≈ {formatNumber(data.voices.caracteres)} caracteres de cota do ElevenLabs (só as que ainda não estão em cache). Salve as vozes antes.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {prog && busy === "gen" ? <Button variant="secondary" onClick={() => { stop.current = true; }}>Parar</Button> : <Button disabled={!ready} onClick={() => { setBusy("gen"); void generateAll(); }}>Gerar vozes do jogo</Button>}
          {prog && <span role="status" className="tabular text-sm">{prog.n}/{prog.total} · {prog.geradas} novas · {prog.emCache} já prontas · {prog.falhas} falhas</span>}
        </div>
        {prog?.ultimo && <p className="mt-2 break-words font-mono text-xs text-bad">{prog.ultimo}</p>}
      </div>
    </section>
  );
}
