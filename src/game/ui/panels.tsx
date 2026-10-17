"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { audio } from "../audio/AudioManager";
import { InstallShortcut } from "./Install";
import { CASE_BY_NUM } from "../content/cases";
import { levelOf } from "../content/levels";
import { CHARACTERS } from "../content/characters";
import { CLUES, CLUE_BY_ID, FINDING_BY_ID, FINDINGS } from "../content/clues";
import { ACHIEVEMENTS, CONCEPTS } from "../content/concepts";
import { LOCATIONS } from "../content/locations";
import { brl, brlShort } from "../engine/money";
import { makeCtx, txt } from "../engine/rules";
import type { LocationId } from "../engine/types";
import { Portrait } from "./art/Portrait";
import { UpaMap, type MapPin } from "./art/UpaMap";
import { activeHotspots } from "./GameScene";
import { ClassChip, FictionBadge, Meter, Modal } from "./atoms";
import { useGame } from "./store";
import { qualidadeFinal } from "./three/support";

const CONF = { confirmada: ["Confirmada", "of"], incompleta: ["Incompleta", "es"], opiniao: ["Opinião de personagem", "si"] } as const;

export function DossierPanel({ onClose }: { onClose: () => void }) {
  const { state: s, dispatch } = useGame();
  const st = s!;
  const ctx = makeCtx(st.scenario, st, st.player.nome);
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [aba, setAba] = useState<"pistas" | "achados">("pistas");
  const found = CLUES.filter((c) => st.clues[c.id]).sort((a, b) => b.caso - a.caso);
  const atual = found.filter((c) => c.caso === st.caso);
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[1]!, id] : [...p, id]));
  const confrontar = () => {
    const r = dispatch({ type: "confront", a: sel[0]!, b: sel[1]! });
    if (!r.ok) { setMsg(r.error ?? "Erro"); audio.sfx("error"); return; }
    const f = r.note ? FINDING_BY_ID[r.note] : null;
    if (f) { audio.sfx("success"); setMsg(`Novo achado: ${f.titulo}`); setAba("achados"); } else { audio.sfx("click"); setMsg(r.note ?? "Nada de novo."); }
  };
  const achados = FINDINGS.filter((f) => st.findings[f.id]);
  return (
    <Modal title="Dossiê do caso" onClose={onClose} wide>
      <div role="tablist" className="mb-3 flex gap-2">
        {(["pistas", "achados"] as const).map((a) => <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className={`g-btn sm ${aba === a ? "" : "ghost"}`}>{a === "pistas" ? `Pistas (${found.length})` : `Achados (${achados.length})`}</button>)}
      </div>
      {aba === "pistas" ? (
        <>
          <p className="mb-3 text-sm text-[color:var(--g-ink2)]">Algumas pistas são incompletas ou opiniões. Para <b>confrontar</b>, marque duas pistas do caso atual e compare: um achado pode aparecer.</p>
          {found.length === 0 && <p className="rounded-2xl bg-[#fff3d6] p-4">Nenhuma pista ainda. Explore os locais e toque nos pontos com 🔍.</p>}
          <ul className="grid gap-3">
            {found.map((c) => {
              const [lab, css] = CONF[c.confiabilidade];
              const podeSel = c.caso === st.caso;
              return (
                <li key={c.id} className="g-card p-3" style={sel.includes(c.id) ? { borderColor: "var(--g-blue)", boxShadow: "0 0 0 3px #b7ccff" } : undefined}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span aria-hidden className="text-xl">{c.icone}</span><h3 className="text-lg font-bold">{c.titulo}</h3>
                    <span className={`g-chip ${css}`}>{lab}</span><span className="g-chip">Caso {c.caso} · {LOCATIONS[c.location].curto}</span>
                    {podeSel && <button type="button" className={`g-btn sm ml-auto ${sel.includes(c.id) ? "" : "ghost"}`} aria-pressed={sel.includes(c.id)} onClick={() => toggle(c.id)}>{sel.includes(c.id) ? "✓ Marcada" : "Marcar para confrontar"}</button>}
                  </div>
                  <p className="mt-2">{txt(c.texto, ctx)}</p>
                  {c.dinamico && <p className="mt-2 rounded-xl bg-[#eef2fe] p-2 text-sm font-semibold">{c.dinamico(ctx)}</p>}
                  {c.tabela && <dl className="mt-2 grid gap-1 rounded-xl bg-[#fffaf0] p-2 text-sm sm:grid-cols-2">{c.tabela(ctx).map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-dashed border-[color:var(--g-line)] py-0.5"><dt className="font-bold">{k}</dt><dd className="text-right tabular-nums">{v}</dd></div>)}</dl>}
                  <p className="mt-2 flex items-center gap-2 text-xs text-[color:var(--g-ink3)]"><ClassChip c={c.fonte.classificacao} /> {c.fonte.rotulo}{c.fonte.url && <a href={c.fonte.url} target="_blank" rel="noreferrer">ver fonte ↗</a>}</p>
                </li>
              );
            })}
          </ul>
          {atual.length >= 2 && (
            <div className="sticky bottom-0 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-[color:var(--g-line)] bg-white p-3">
              <p className="flex-1 text-sm font-semibold">{sel.length === 2 ? `Confrontar: ${CLUE_BY_ID[sel[0]!]!.titulo} × ${CLUE_BY_ID[sel[1]!]!.titulo}` : `Marque 2 pistas do caso atual (${sel.length}/2)`}</p>
              <button type="button" className="g-btn orange" disabled={sel.length !== 2} onClick={confrontar}>⚖️ Confrontar</button>
            </div>
          )}
        </>
      ) : (
        <ul className="grid gap-3">
          {achados.length === 0 && <li className="rounded-2xl bg-[#fff3d6] p-4">Ainda não há achados. Confronte pistas que se completam (por exemplo, consumo × validade).</li>}
          {achados.map((f) => (
            <li key={f.id} className="g-card p-3"><div className="flex flex-wrap items-center gap-2"><span aria-hidden>💡</span><h3 className="text-lg font-bold">{f.titulo}</h3><span className="g-chip">{st.findings[f.id]!.via === "conhecimento" ? "reconhecido pelo seu conhecimento aplicado" : "descoberto por confronto"}</span></div><p className="mt-2">{txt(f.texto, ctx)}</p></li>
          ))}
        </ul>
      )}
      {msg && <p role="status" className="mt-2 rounded-xl bg-[#e8f0ff] p-3 text-sm font-bold">{msg}</p>}
    </Modal>
  );
}

export function AgendaPanel({ onClose }: { onClose: () => void }) {
  const { state: st } = useGame();
  const s = st!;
  return (
    <Modal title="Agenda de contatos" onClose={onClose} wide>
      <p className="mb-3 text-sm text-[color:var(--g-ink2)]">Proximidade, confiança e compromissos são coisas diferentes: uma rede enorme pode ser frágil. Nenhum contato é “só bom” ou “só mau”.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {Object.values(CHARACTERS).filter((c) => c.id !== "voce").map((c) => {
          const r = s.rel[c.id];
          const conhecido = !!r?.conhecido && c.naUpa;
          return (
            <li key={c.id} className="g-card flex gap-3 p-3" >
              <div className="size-20 shrink-0 overflow-hidden rounded-2xl" style={{ background: `linear-gradient(#fff, ${c.cor}33)` }}>{conhecido ? <Portrait look={c.look} enquadramento="rosto" title={c.nome} className="h-full w-full" /> : <div className="grid h-full place-items-center text-3xl" aria-hidden>❔</div>}</div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold leading-tight">{conhecido ? c.nome : c.naUpa ? "Contato ainda não conhecido" : c.nome}</h3>
                <p className="text-xs text-[color:var(--g-ink3)]">{c.naUpa ? (conhecido ? c.papel : "Converse nos locais para conhecer") : "Disponível na carreira completa"}</p>
                {conhecido && (<><p className="mt-1 text-sm">{c.interesse}</p><div className="mt-2 grid grid-cols-2 gap-2"><Meter icon="🤝" label="Confiança" value={r!.confianca} compact /><Meter icon="📜" label="Favor devido" value={Math.max(0, r!.favor)} good="down" compact /></div></>)}
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

export function NotebookPanel({ onClose }: { onClose: () => void }) {
  const { state: st, dispatch } = useGame();
  const s = st!;
  const [q, setQ] = useState(""); const [fav, setFav] = useState(false);
  const list = useMemo(() => s.notebook.filter((e) => (!fav || e.favorito) && (q.trim() === "" || `${e.tema} ${e.conceitoTitulo} ${e.problema} ${e.decisao} ${e.conceitoTexto}`.toLowerCase().includes(q.toLowerCase()))), [s.notebook, q, fav]);
  const temas = [...new Set(s.notebook.map((e) => e.tema))];
  return (
    <Modal title="Caderno de Gestão" onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="min-w-48 flex-1"><span className="sr-only">Pesquisar por tema</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por tema, conceito ou decisão…" className="h-12 w-full rounded-2xl border-2 border-[color:var(--g-line)] bg-white px-4" /></label>
        <button type="button" aria-pressed={fav} className={`g-btn sm ${fav ? "yellow" : "ghost"}`} onClick={() => setFav((v) => !v)}>★ Favoritos</button>
      </div>
      {temas.length > 0 && <p className="mb-3 flex flex-wrap gap-1.5 text-xs">{temas.map((t) => <button key={t} type="button" className="g-chip cursor-pointer" onClick={() => setQ(t)}>{t}</button>)}</p>}
      {s.notebook.length === 0 && <p className="rounded-2xl bg-[#fff3d6] p-4">O caderno guarda um cartão por decisão: problema, escolha, resultado, conceito aprendido e uma aplicação fora do jogo.</p>}
      <ul className="grid gap-3">
        {list.map((e) => {
          const ap = s.knowledge[e.conceito]?.aplicadoEm.length ?? 0;
          return (
            <li key={e.id} className="g-card p-3">
              <div className="flex flex-wrap items-center gap-2"><span className="g-chip">Caso {e.caso}</span><span className="g-chip">{e.tema}</span><span className="g-chip" title="Nível de dificuldade">{"●".repeat(e.dificuldade)}{"○".repeat(3 - e.dificuldade)}</span>{ap > 0 && <span className="g-chip of">aplicado {ap}×</span>}
                <button type="button" onClick={() => dispatch({ type: "favorite", entryId: e.id })} className="g-btn ghost sm ml-auto" aria-pressed={e.favorito} aria-label={e.favorito ? "Remover dos favoritos" : "Marcar como favorito"}>{e.favorito ? "★" : "☆"}</button></div>
              <h3 className="mt-2 text-lg font-bold">{e.conceitoTitulo}</h3>
              <dl className="mt-1 grid gap-1.5 text-sm">
                <div><dt className="inline font-extrabold">Problema: </dt><dd className="inline">{e.problema}</dd></div>
                <div><dt className="inline font-extrabold">Sua decisão: </dt><dd className="inline">{e.decisao}</dd></div>
                <div><dt className="inline font-extrabold">Resultado: </dt><dd className="inline">{e.resultado}</dd></div>
                <div className="rounded-xl bg-[#eef2fe] p-2"><dt className="inline font-extrabold">Conceito aprendido: </dt><dd className="inline">{e.conceitoTexto}</dd></div>
                <div><dt className="inline font-extrabold">Na vida real: </dt><dd className="inline">{e.aplicacao}</dd></div>
              </dl>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--g-ink3)]"><ClassChip c={e.fonte.classificacao} /> {e.fonte.rotulo}{e.fonte.url && <a href={e.fonte.url} target="_blank" rel="noreferrer">ver fonte ↗</a>} · conteúdo v{e.versao}</p>
            </li>
          );
        })}
      </ul>
      {s.notebook.length > 0 && list.length === 0 && <p className="mt-3 text-sm">Nada encontrado para essa pesquisa.</p>}
      <p className="mt-4 text-xs text-[color:var(--g-ink3)]">Conceitos: {Object.values(CONCEPTS).length} · aprendidos: {Object.keys(s.knowledge).length}. Repetir a mesma resposta não gera experiência: o conhecimento conta quando você o <b>aplica</b> em uma situação nova.</p>
    </Modal>
  );
}

export function LedgerPanel({ onClose }: { onClose: () => void }) {
  const { state: st } = useGame();
  const s = st!;
  const pessoal = s.ledger.filter((l) => l.escopo === "pessoal").slice().reverse();
  const publico = s.ledger.filter((l) => l.escopo === "publico").slice().reverse();
  const Row = ({ l }: { l: (typeof s.ledger)[number] }) => (
    <li className="flex items-start justify-between gap-3 border-b border-dashed border-[color:var(--g-line)] py-2 text-sm"><span><span className="g-chip mr-1.5">caso {l.caso}</span>{l.rotulo}{l.decisionId && <span className="ml-1 text-xs text-[color:var(--g-ink3)]">[evento {l.decisionId}]</span>}</span><b className={`shrink-0 tabular-nums ${l.valor < 0 ? "text-[color:var(--g-red-d)]" : "text-[color:var(--g-green-d)]"}`}>{l.valor < 0 ? "−" : "+"}{brl(Math.abs(l.valor))}</b></li>
  );
  return (
    <Modal title="Contas: pessoal × pública" onClose={onClose} wide>
      <FictionBadge className="mb-3" />
      <p className="mb-3 text-sm text-[color:var(--g-ink2)]">Os dois saldos <b>nunca se misturam</b>. Economia legítima aparece só no painel público: não vira depósito na conta pessoal.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="g-card p-3" aria-label="Minha conta fictícia">
          <h3 className="text-lg font-bold">🧑‍💼 Minha conta fictícia</h3>
          <p className="text-3xl font-extrabold tabular-nums" style={{ fontFamily: "var(--g-display)" }}>{brl(s.personal.patrimonio)}</p>
          <p className="text-xs text-[color:var(--g-ink3)]">Remuneração legítima: {brl(s.personal.remuneracao)} · Ilícito fictício: {brl(s.personal.desviado)} · Restituído: {brl(s.personal.restituido)}</p>
          <ul className="mt-2 max-h-72 overflow-y-auto">{pessoal.length ? pessoal.map((l) => <Row key={l.id} l={l} />) : <li className="py-2 text-sm text-[color:var(--g-ink3)]">Sem movimentações ainda.</li>}</ul>
        </section>
        <section className="g-card p-3" aria-label="Conta pública da UPA">
          <h3 className="text-lg font-bold">🏥 Conta pública da UPA</h3>
          <p className={`text-3xl font-extrabold tabular-nums ${s.pub.caixa < 0 ? "text-[color:var(--g-red-d)]" : ""}`} style={{ fontFamily: "var(--g-display)" }}>{brl(s.pub.caixa)}</p>
          <p className="text-xs text-[color:var(--g-ink3)]">Caixa do ciclo (estimativa didática) · orçamento anual estimado {brlShort(s.scenario.orcamentoAnual)}</p>
          <ul className="mt-2 max-h-72 overflow-y-auto">{publico.length ? publico.map((l) => <Row key={l.id} l={l} />) : <li className="py-2 text-sm text-[color:var(--g-ink3)]">Sem movimentações ainda.</li>}</ul>
        </section>
      </div>
    </Modal>
  );
}

export function DataPanel({ onClose }: { onClose: () => void }) {
  const { state: st } = useGame();
  const sc = st!.scenario; const ref = sc.reference;
  return (
    <Modal title="Ver os dados reais" onClose={onClose} wide>
      <div className="grid gap-3">
        <section className="g-card p-3"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">Cenário desta partida</h3><span className="g-chip">{sc.kind === "ficticio" ? "unidade fictícia" : "referenciado em município real"}</span></div>
          <p className="mt-1">{sc.unidade} · {sc.municipio.nome}{sc.municipio.uf ? ` – ${sc.municipio.uf}` : ""}</p>
          <p className="mt-1 text-xs text-[color:var(--g-ink3)]">Dados congelados em {new Date(sc.congeladoEm).toLocaleString("pt-BR")} · identificador {sc.hash} · a partida não consulta a fonte a cada clique.</p></section>
        <section className="g-card p-3"><div className="flex flex-wrap items-center gap-2"><ClassChip c={sc.orcamentoClassificacao} /><h3 className="text-lg font-bold">Orçamento anual da UPA: {brl(sc.orcamentoAnual)}</h3></div><p className="mt-1 text-sm">{sc.orcamentoNota}</p></section>
        <section className="g-card p-3">
          <div className="flex flex-wrap items-center gap-2"><ClassChip c="oficial" /><h3 className="text-lg font-bold">Referência oficial</h3></div>
          {ref?.healthSpending ? (
            <>
              <p className="mt-1">Despesa liquidada com Saúde (função 10), {ref.year}: <b>{brl(ref.healthSpending)}</b></p>
              <p className="text-sm text-[color:var(--g-ink2)]">{ref.source}. {ref.notice}</p>
              <ul className="mt-2 text-sm">{ref.provenance.map((p, i) => <li key={i}>• {p.source}{p.dataset ? ` · ${p.dataset}` : ""}{p.period ? ` · ${p.period}` : ""}{p.collectedAt ? ` · coletado em ${new Date(p.collectedAt).toLocaleDateString("pt-BR")}` : ""}{p.url && <> · <a href={p.url} target="_blank" rel="noreferrer">fonte ↗</a></>}</li>)}</ul>
              {ref.link && <Link href={ref.link} target="_blank" className="g-btn sm mt-3">Abrir no Brasil Fiscal ↗</Link>}
            </>
          ) : (
            <p className="mt-1 text-sm">Este cenário é <b>fictício</b>: nenhum valor oficial foi usado e a ausência de dado não foi convertida em zero. Para uma partida referenciada em um município real, escolha “Município real” em Nova partida. <Link href="/brasil-fiscal" target="_blank">Conhecer o Brasil Fiscal ↗</Link></p>
          )}
        </section>
        <p className="text-xs text-[color:var(--g-ink3)]">Personagens, empresas e atos de desvio são fictícios e não se associam a pessoas, CNPJs ou órgãos reais. Um gasto elevado, isoladamente, não prova desperdício ou corrupção.</p>
      </div>
    </Modal>
  );
}

export function AchievementsPanel({ onClose }: { onClose: () => void }) {
  const { state: st } = useGame();
  const got = new Set(st!.achievements);
  return (
    <Modal title="Conquistas" onClose={onClose} wide>
      <p className="mb-3 text-sm text-[color:var(--g-ink2)]">Títulos de riqueza ilícita são sátira: não concedem bônus de gestão nem entram em ranking de sucesso.</p>
      <ul className="grid gap-2 sm:grid-cols-2">{ACHIEVEMENTS.map((a) => <li key={a.id} className="g-card flex items-center gap-3 p-3"><span className="text-3xl" aria-hidden>{got.has(a.id) ? a.icone : "🔒"}</span><div><h3 className="font-bold leading-tight">{a.nome}{got.has(a.id) ? "" : " (bloqueada)"} <span className="g-chip">{a.trilha === "gestao" ? "gestão" : "sátira"}</span></h3><p className="text-sm text-[color:var(--g-ink2)]">{a.descricao}</p></div></li>)}</ul>
    </Modal>
  );
}

export function MapPanel({ onClose, onGo }: { onClose: () => void; onGo: (l: LocationId) => void }) {
  const { state: st } = useGame();
  const s = st!;
  const pins = useMemo(() => {
    const out = {} as Record<LocationId, MapPin>;
    const caso = CASE_BY_NUM[Math.min(s.caso, levelOf(s).ultimo)]!;
    for (const k of Object.keys(LOCATIONS) as LocationId[]) {
      const hs = LOCATIONS[k].hotspots.filter((h) => h.kind === "pista" || h.kind === "pessoa").filter((h) => h.entradas.some((e) => e.casos.includes(s.caso) && !(s.clues[e.ref] || s.talked[e.ref])));
      out[k] = { novo: s.casoAberto ? hs.length : 0, objetivo: s.casoAberto && caso.location === k };
    }
    return out;
  }, [s]);
  return (
    <Modal title={`Mapa — ${s.scenario.unidade.split(" (")[0]}`} onClose={onClose} wide>
      <p className="mb-3 text-sm text-[color:var(--g-ink2)]">Toque num local para ir até lá. O número laranja mostra pistas e pessoas ainda não vistas neste caso.</p>
      <UpaMap atual={s.location} locais={levelOf(s).locais} pins={pins} nome={s.scenario.unidade} onSelect={(l) => { audio.sfx("whoosh"); onGo(l); onClose(); }} />
      <ul className="sr-only">{levelOf(s).locais.map((k) => <li key={k}>{LOCATIONS[k].nome}: {pins[k].novo} novidades</li>)}</ul>
    </Modal>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings: c, setSettings, session } = useGame();
  const [q, setQ] = useState<string>("");
  const Slider = ({ k, label }: { k: "voz" | "musica" | "efeitos"; label: string }) => (
    <label className="block text-sm font-bold">{label}: {Math.round(c[k] * 100)}%<input type="range" min={0} max={1} step={0.05} value={c[k]} onChange={(e) => setSettings({ [k]: Number(e.target.value) })} className="mt-1 w-full accent-[color:var(--g-blue)]" /></label>
  );
  const Toggle = ({ k, label, desc }: { k: "mudo" | "reduzirMovimento" | "altoContraste" | "textoGrande"; label: string; desc?: string }) => (
    <label className="flex items-start gap-3 rounded-2xl border-2 border-[color:var(--g-line)] bg-white p-3"><input type="checkbox" checked={c[k]} onChange={(e) => setSettings({ [k]: e.target.checked })} className="mt-1 size-6 accent-[color:var(--g-blue)]" /><span><b>{label}</b>{desc && <span className="block text-sm text-[color:var(--g-ink3)]">{desc}</span>}</span></label>
  );
  return (
    <Modal title="Configurações" onClose={onClose} wide footer={<button className="g-btn orange" onClick={onClose}>Pronto</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="grid gap-3"><h3 className="text-lg font-bold">🔊 Áudio</h3>
          <Toggle k="mudo" label="Desligar todo o áudio" desc="Voz, música e efeitos. O jogo funciona igual, com legendas." />
          <Slider k="voz" label="Volume das vozes" /><Slider k="musica" label="Volume da música" /><Slider k="efeitos" label="Volume dos efeitos" />
          <button type="button" className="g-btn sm ghost" onClick={() => { audio.unlock(); audio.sfx("confirm"); void audio.speak({ id: "teste", texto: "Teste de voz: a Upa recebeu cento e trinta mil reais para o estoque.", voz: CHARACTERS.joana.voz, personagem: "joana" }).then((h) => setQ(h.fonte === "nenhuma" ? "Sem voz disponível neste navegador: o jogo segue com legendas." : h.provisoria ? "Tocando a voz provisória do navegador. A voz natural final depende de arquivos gravados ou do serviço de voz." : "Tocando voz natural.")); }}>▶ Testar voz</button>
          {q && <p role="status" className="text-sm font-semibold">{q}</p>}
          <p className="text-xs text-[color:var(--g-ink3)]">Serviço de voz neural: {session.tts ? "ativo neste servidor" : "não configurado (pendente) — usando a voz do navegador como provisória"}.</p>
        </section>
        <section className="grid content-start gap-3"><h3 className="text-lg font-bold">📲 Aplicativo</h3>
          <div><InstallShortcut className="g-btn sm" label="📲 Criar atalho na tela inicial" /></div>
          <h3 className="text-lg font-bold">🎮 Imagem e acessibilidade</h3>
          <Toggle k="reduzirMovimento" label="Reduzir movimento" desc="Desliga paralaxe, flutuações e animações longas. Cenas 3D ficam estáticas." />
          <Toggle k="altoContraste" label="Alto contraste" /><Toggle k="textoGrande" label="Texto maior" />
          <label className="block text-sm font-bold">Qualidade das cenas 3D
            <select value={c.qualidade3d} onChange={(e) => setSettings({ qualidade3d: e.target.value as typeof c.qualidade3d })} className="mt-1 h-12 w-full rounded-2xl border-2 border-[color:var(--g-line)] bg-white px-3 font-normal">
              <option value="auto">Automática (recomendado)</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa (celulares simples)</option><option value="2d">Desligar 3D (versão 2D equivalente)</option>
            </select>
            <span className="text-xs font-normal text-[color:var(--g-ink3)]">Agora: {typeof window !== "undefined" ? qualidadeFinal(c.qualidade3d) : "—"}. Se o aparelho não suportar 3D, as mesmas escolhas e resultados aparecem em 2D.</span>
          </label>
        </section>
      </div>
    </Modal>
  );
}
