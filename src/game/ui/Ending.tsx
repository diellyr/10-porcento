"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { audio } from "../audio/AudioManager";
import type { ConvNode, ConversationDef } from "../content/types";
import { brl, brlShort } from "../engine/money";
import { buildReport, INICIO } from "../engine/report";
import { worldView } from "../engine/scoring";
import type { GameState } from "../engine/types";
import { LocationScene } from "./art/Scenes";
import { Dialogue } from "./Dialogue";
import { ClassChip, FictionBadge, Meter } from "./atoms";
import { ReportView } from "./ReportView";
import { ResultCard } from "./ResultCard";
import { useGame } from "./store";

const n = (who: ConvNode["who"], emo: ConvNode["emo"], text: string, next?: string): ConvNode => ({ who, emo, text, next });

function endingConv(s: GameState): ConversationDef | null {
  const e = s.ending!;
  const dev = s.decisions.filter((d) => d.deliberado);
  const base = { caso: 99, location: "recepcao" as const, titulo: "Encerramento", negociacao: undefined };
  if (e.id === "reconhecimento") return { ...base, id: "fim-reconhecimento", who: "celia", apresentacao: "3d", start: "e1", nodes: {
    e1: n("celia", "feliz", `Voltei à Upa só para ver. A fila que passava de noventa minutos hoje está em ${Math.round(s.pub.filaMin)} minutos.`, "e2"),
    e2: n("celia", "feliz", "A Rosângela e o Davi conseguiram a bombinha no mesmo dia. Ele dormiu a noite inteira, pela primeira vez em meses.", "e3"),
    e3: n("celia", "serio", "A Joana me mostrou a equipe preparada e um estoque que sabe o que falta antes de acabar. Isso não depende de você estar aqui.", "e4"),
    e4: n("celia", "feliz", `${s.player.nome}, sua passagem pela administração terminou. O serviço que você ajudou a melhorar continua.`, e.promocao.elegivel ? "e5" : undefined),
    e5: n("celia", "irônico", "A Secretaria quer conversar com você sobre um cargo maior. Esse convite pertence à carreira completa, que ainda está em desenvolvimento. Providencie água."),
  } };
  if (e.id === "responsabilizacao") return { ...base, id: "fim-responsabilizacao", who: "ana", apresentacao: "3d", start: "r1", nodes: {
    r1: n("ana", "neutro", "A auditoria consolidou os registros do ciclo. Cada decisão está no arquivo, com valor, data e identificador.", "r2"),
    r2: n("ana", "serio", `Foram ${dev.length} evento(s) com valores retirados da execução, somando ${brlShort(s.personal.desviado)} (valor simulado). Os serviços pagaram a conta: qualidade em ${Math.round(s.pub.qualidade)} e acesso em ${Math.round(s.pub.acesso)}.`, "r3"),
    r3: n("guardiao", "irônico", "O livro não esquece. E os amigos repentinos, curiosamente, desapareceram junto com o saldo.", "r4"),
    r4: n("ana", "neutro", `Houve investigação, oportunidade de defesa e julgamento fictício. O desfecho desta campanha, informado desde o início, é a responsabilização: perda do cargo e de ${brlShort(e.bensPerdidos)} em bens.`, "r5"),
    r5: n("ana", "neutro", e.reparado ? `A restituição de ${brlShort(s.personal.restituido)} foi registrada como novo evento. Ela não apaga os desvios, mas altera o epílogo: a apuração reconheceu a colaboração.` : "Nenhuma restituição foi registrada. Ela teria alterado o epílogo, sem apagar os desvios.", "r6"),
    r6: n("ana", "serio", "Isto é uma regra da ficção, não uma previsão sobre casos reais. Você pode rever cada decisão e jogar de novo com outro caminho."),
  } };
  if (e.id === "gestao-insuficiente") return { ...base, id: "fim-insuficiente", who: "bento", apresentacao: "2d", start: "b1", nodes: {
    b1: n("bento", "neutro", "Você não desviou nada — isso conta. Mas os resultados ficaram abaixo do mínimo da campanha.", "b2"),
    b2: n("bento", "feliz", "Gestão insuficiente não é crime: é um convite para revisar. Abra o Caderno, veja onde o conceito foi aprendido mas não aplicado, e tente de novo.", "b3"),
    b3: n("bento", "neutro", "E lembre: gastar mais pode ser o certo, desde que haja prova da necessidade."),
  } };
  return null;
}

export function Ending({ onExit }: { onExit: () => void }) {
  const { state: st, close } = useGame();
  const s = st!;
  const e = s.ending!;
  const conv = useMemo(() => endingConv(s), [s]);
  const [fase, setFase] = useState<"cena" | "resultado">(conv ? "cena" : "resultado");
  const [aba, setAba] = useState<"resumo" | "relatorio" | "cartao">("resumo");
  useEffect(() => { audio.music(e.id === "reconhecimento" ? "final" : "tenso"); if (fase === "resultado") audio.sfx(e.id === "reconhecimento" ? "level" : "alert"); }, [e.id, fase]);
  const report = useMemo(() => buildReport(s), [s]);
  const inicial = useMemo(() => worldView({ ...s, pub: { ...s.pub, ...INICIO, filaMin: INICIO.filaMin, caixa: 0, estoqueDias: INICIO.estoqueDias }, personal: { ...s.personal, patrimonio: 18000 }, decisions: [], caso: 1 }), [s]);
  const final = useMemo(() => worldView(s), [s]);

  if (fase === "cena" && conv) return <Dialogue conv={conv} s={s} onFinish={() => setFase("resultado")} onExit={() => setFase("resultado")} />;
  const bom = e.id === "reconhecimento";
  return (
    <div className="mx-auto max-w-5xl space-y-3 p-2 sm:p-4">
      <header className="g-card g-pop p-4 text-center sm:p-6" style={{ borderColor: bom ? "var(--g-green)" : e.id === "responsabilizacao" ? "var(--g-red)" : "var(--g-yellow)" }}>
        <p className="text-sm font-extrabold uppercase tracking-widest text-[color:var(--g-ink3)]">Encerramento local da campanha da UPA</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-5xl">{bom ? "🏆" : e.id === "responsabilizacao" ? "⚖️" : e.id === "balanco-parcial" ? "🚩" : "🔁"} {e.titulo}</h1>
        <ul className="mx-auto mt-3 max-w-2xl text-left text-[color:var(--g-ink2)]">{e.motivos.map((m, i) => <li key={i} className="mt-1">• {m}</li>)}</ul>
        <p className="mx-auto mt-3 max-w-2xl rounded-2xl bg-[#eef2fe] p-3 text-sm"><b>Atenção:</b> este é o encerramento <i>local</i> (uma UPA). Os finais nacionais — Imperador Supremo e Presidência — pertencem à carreira completa, ainda em desenvolvimento.</p>
      </header>
      <div role="tablist" className="flex flex-wrap justify-center gap-2">
        {([["resumo", "📊 Resultado"], ["relatorio", "📄 Relatório e plano"], ["cartao", "🖼️ Card de resultado"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={aba === k} className={`g-btn ${aba === k ? "" : "ghost"}`} onClick={() => setAba(k)}>{l}</button>)}
      </div>
      {aba === "resumo" && (
        <>
          <section className="grid gap-3 md:grid-cols-2" aria-label="Antes e depois da UPA">
            {[["Antes", inicial, INICIO.filaMin], ["Depois", final, s.pub.filaMin]].map(([t, w, f]) => (
              <figure key={t as string} className="g-card overflow-hidden"><div className="aspect-video"><LocationScene location="recepcao" world={w as ReturnType<typeof worldView>} caso={1} pessoas={{}} falando={null} filaMin={f as number} /></div><figcaption className="p-2 text-center font-bold">{t as string}: espera de {Math.round(f as number)} min · estoque {t === "Antes" ? INICIO.estoqueDias : Math.round(s.pub.estoqueDias)} dias</figcaption></figure>
            ))}
          </section>
          <section className="grid gap-3 md:grid-cols-2">
            <div className="g-card p-4"><h2 className="text-xl font-bold">🏥 Serviços e população</h2><div className="mt-2 grid grid-cols-2 gap-3">{report.servicos.map((x) => <Meter key={x.rotulo} icon="" label={x.rotulo} value={x.fim} max={x.unidade === " min" ? 150 : x.unidade === " dias" ? 20 : 100} unit={x.unidade} good={x.melhor === "maior" ? "up" : "down"} delta={x.fim - x.inicio} />)}</div></div>
            <div className="g-card p-4"><h2 className="text-xl font-bold">🧑‍💼 Você</h2><FictionBadge className="mt-1" />
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm"><div><dt className="font-bold">Pontuação de Poder</dt><dd className="text-2xl font-extrabold">{e.poder.toFixed(0)}</dd></div><div><dt className="font-bold">Índice de legado</dt><dd className="text-2xl font-extrabold">{e.legado.toFixed(0)}</dd></div>
                <div><dt className="font-bold">Índice de Trambicagem</dt><dd className="text-2xl font-extrabold">{e.trambicagem.toFixed(2).replace(".", ",")}%</dd></div><div><dt className="font-bold">Patrimônio final (fictício)</dt><dd className="text-2xl font-extrabold">{brlShort(e.patrimonioFinal)}</dd></div></dl>
              {e.bensPerdidos > 0 && <p className="mt-2 text-sm">Bruto antes da responsabilização: {brl(s.personal.patrimonio)} · bens perdidos: {brl(e.bensPerdidos)}. Riqueza antes da punição não é sucesso.</p>}
              <h3 className="mt-3 font-bold">Promoção</h3><p className="text-sm">{e.promocao.elegivel ? "Critérios atendidos: convite para Secretário(a) Municipal (nível 2) — carreira completa." : "Critérios não atendidos nesta campanha."}</p>
              <ul className="mt-1 text-sm">{e.promocao.criterios.map((c) => <li key={c.rotulo}>{c.ok ? "✔" : "✖"} {c.rotulo}: {c.detalhe}</li>)}</ul></div>
          </section>
          <section className="g-card p-4"><h2 className="text-xl font-bold">🏅 Conquistas</h2><p className="mt-1 text-sm">{s.achievements.length ? s.achievements.join(" · ") : "Nenhuma desta vez."}</p></section>
        </>
      )}
      {aba === "relatorio" && <ReportView report={report} />}
      {aba === "cartao" && <ResultCard s={s} />}
      <footer className="flex flex-wrap justify-center gap-2 pb-6">
        <button className="g-btn orange" onClick={() => { close(); onExit(); }}>🏠 Menu principal</button>
        <Link href="/brasil-fiscal" className="g-btn ghost" target="_blank">📊 Brasil Fiscal ↗</Link>
        <span className="w-full text-center text-xs text-[color:var(--g-ink3)]">Jogue outra trajetória no mesmo cenário (<ClassChip c="estimativa" curto /> e dados congelados {s.scenario.hash}) para comparar decisões.</span>
      </footer>
    </div>
  );
}
