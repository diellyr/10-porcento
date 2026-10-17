"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { audio } from "../audio/AudioManager";
import type { ConvNode, ConversationDef } from "../content/types";
import { LEVELS, levelOf } from "../content/levels";
import { NIVEL_MAX } from "../content/niveis";
import { brl, brlShort } from "../engine/money";
import { buildReport } from "../engine/report";
import { worldView } from "../engine/scoring";
import type { GameState } from "../engine/types";
import { LocationScene } from "./art/Scenes";
import { Dialogue } from "./Dialogue";
import { ClassChip, FictionBadge, Meter } from "./atoms";
import { ReportView } from "./ReportView";
import { ResultCard } from "./ResultCard";
import { useGame } from "./store";

const n = (who: ConvNode["who"], emo: ConvNode["emo"], text: string, next?: string): ConvNode => ({ who, emo, text, next });

const GUIA_NIVEL: Record<number, ConvNode["who"]> = { 3: "sonia", 4: "iara", 5: "pedro", 6: "augusto", 7: "augusto" };

/** Encerramento dos níveis 3–7: cena curta com o personagem de referência do nível. */
function endingConvNx(s: GameState): ConversationDef | null {
  const e = s.ending!; const L = levelOf(s); const who = GUIA_NIVEL[L.nivel] ?? "bento";
  const dev = s.decisions.filter((d) => d.deliberado);
  const base = { caso: 99, location: L.inicial, titulo: "Encerramento", negociacao: undefined, apresentacao: "3d" as const, start: "e1" };
  if (e.id === "presidencia") return { ...base, id: "fim-presidencia", who: "celia", nodes: {
    e1: n("celia", "feliz", `Quarenta anos de conselho de saúde e nunca tinha visto isto: uma gestão que mostra o que deu certo e o que não deu. ${s.player.nome}, a fila nacional está em ${Math.round(s.pub.filaMin)} dias.`, "e2"),
    e2: n("augusto", "serio", "O mandato foi cumprido com prioridade, fonte de recursos e prestação de contas. Nenhuma decisão boa apagou o que veio antes — e nenhuma falha foi escondida.", "e3"),
    e3: n("bento", "feliz", "O Caderno de Gestão tem agora um capítulo por nível. A pergunta que fica: qual dessas ideias você levaria para a vida real?"),
  } };
  if (e.id === "imperador") return { ...base, id: "fim-imperador", who: "estevao", nodes: {
    e1: n("estevao", "feliz", `Vossa Majestade ${s.player.nome}! A coroa é pesada, mas o recibo é leve — de um lado só.`, "e2"),
    e2: n("ana", "serio", `Interrompo a cerimônia. Há ${dev.length} evento(s) de desvio no arquivo, somando ${brlShort(s.personal.desviado)} (valor simulado). Cada um com data, valor e identificador.`, "e3"),
    e3: n("guardiao", "irônico", "O livro não esquece. Os amigos, sim — desapareceram junto com o saldo.", "e4"),
    e4: n("ana", "neutro", `A coroação aparente termina aqui: responsabilização, perda do cargo e de ${brlShort(e.bensPerdidos)} em bens. É uma regra da ficção, informada desde o início — não uma previsão sobre casos reais.`),
  } };
  if (e.id === "responsabilizacao") return { ...base, id: `fim-resp-${L.nivel}`, who: "ana", nodes: {
    r1: n("ana", "neutro", `Auditoria do ciclo: ${dev.length} evento(s) com valores retirados, somando ${brlShort(s.personal.desviado)} (simulado). Os serviços pagaram a conta.`, "r2"),
    r2: n("ana", "serio", (e.promocao.viaRede ? "Há quem queira levá-lo(a) adiante por conexões — mas o arquivo vai junto, e a responsabilização só foi adiada." : "O desfecho desta campanha, informado desde o início, é a responsabilização. Você pode rever cada decisão e jogar de novo com outro caminho.")),
  }, start: "r1" };
  if (e.id === "reconhecimento") return { ...base, id: `fim-reconhecimento-${L.nivel}`, who, nodes: {
    e1: n(who, "feliz", `Balanço do ciclo (${L.cargo}): qualidade ${Math.round(s.pub.qualidade)}, acesso ${Math.round(s.pub.acesso)}, confiança ${Math.round(s.attrs.confianca)}. Decisões com dados, registro e prestação de contas.`, "e2"),
    e2: n(who, "irônico", L.proximo ? `Há um convite para ${L.proximo}. Providencie água.` : "Providencie água."),
  } };
  return { ...base, id: `fim-insuficiente-${L.nivel}`, who: "bento", nodes: {
    b1: n("bento", "neutro", "Você não desviou nada — isso conta. Mas os resultados ficaram abaixo do mínimo. Abra o Caderno, veja onde o conceito foi aprendido mas não aplicado, e tente de novo.", "b2"),
    b2: n("bento", "feliz", e.motivos.slice(-1)[0] ?? "Gastar mais pode ser o certo, desde que haja prova da necessidade."),
  }, start: "b1" };
}

function endingConv(s: GameState): ConversationDef | null {
  const e = s.ending!;
  if ((s.nivel ?? 1) >= 3) return endingConvNx(s);
  const dev = s.decisions.filter((d) => d.deliberado);
  const base = { caso: 99, location: levelOf(s).inicial, titulo: "Encerramento", negociacao: undefined };
  if (e.id === "reconhecimento" && (s.nivel ?? 1) >= 2) return { ...base, id: "fim-reconhecimento-2", who: "lucia", apresentacao: "3d", start: "e1", nodes: {
    e1: n("lucia", "feliz", `A espera por consulta com especialista caiu para ${Math.round(s.pub.filaMin)} dias. A população viu isso — e a Câmara também.`, "e2"),
    e2: n("lucia", "serio", "Você decidiu com dados, pediu o dinheiro pelo caminho legal e prestou contas sem esconder falhas. É raro e é o que sustenta uma gestão.", "e3"),
    e3: n("celia", "feliz", "Eu estava na primeira fila da audiência. Saí com o caderno cheio — e com menos desconfiança.", "e4"),
    e4: n("lucia", "irônico", `${s.player.nome}, há cargos regionais e estaduais de olho em quem consegue isso com a casa em ordem. Esse convite pertence ao próximo nível da carreira, ainda em desenvolvimento. Providencie água.`),
  } };
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
  const { state: st, close, dispatch } = useGame();
  const s = st!;
  const e = s.ending!;
  const conv = useMemo(() => endingConv(s), [s]);
  const [fase, setFase] = useState<"cena" | "resultado">(conv ? "cena" : "resultado");
  const [aba, setAba] = useState<"resumo" | "relatorio" | "cartao">("resumo");
  useEffect(() => { audio.music(e.id === "reconhecimento" ? "final" : "tenso"); if (fase === "resultado") audio.sfx(e.id === "reconhecimento" ? "level" : "alert"); }, [e.id, fase]);
  const report = useMemo(() => buildReport(s), [s]);
  const L = levelOf(s);
  const ini = L.inicio;
  const inicial = useMemo(() => worldView({ ...s, pub: { ...s.pub, qualidade: ini.qualidade, acesso: ini.acesso, equipe: ini.equipe, sustentabilidade: ini.sustentabilidade, filaMin: ini.filaMin, caixa: 0, estoqueDias: ini.estoqueDias }, personal: { ...s.personal, patrimonio: 18000 }, decisions: [], caso: L.primeiro }), [s, ini, L.primeiro]);
  const final = useMemo(() => worldView(s), [s]);

  if (fase === "cena" && conv) return <Dialogue conv={conv} s={s} onFinish={() => setFase("resultado")} onExit={() => setFase("resultado")} />;
  const bom = e.id === "reconhecimento" || e.id === "presidencia";
  return (
    <div className="mx-auto max-w-5xl space-y-3 p-2 sm:p-4">
      <header className="g-card g-pop p-4 text-center sm:p-6" style={{ borderColor: bom ? "var(--g-green)" : e.id === "responsabilizacao" ? "var(--g-red)" : "var(--g-yellow)" }}>
        <p className="text-sm font-extrabold uppercase tracking-widest text-[color:var(--g-ink3)]">Encerramento local · {L.cargo}</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-5xl">{bom ? "🏆" : e.id === "imperador" ? "👑" : e.id === "responsabilizacao" ? "⚖️" : e.id === "balanco-parcial" ? "🚩" : "🔁"} {e.titulo}</h1>
        <ul className="mx-auto mt-3 max-w-2xl text-left text-[color:var(--g-ink2)]">{e.motivos.map((m, i) => <li key={i} className="mt-1">• {m}</li>)}</ul>
        <p className="mx-auto mt-3 max-w-2xl rounded-2xl bg-[#eef2fe] p-3 text-sm"><b>Atenção:</b> {s.nivel >= 7 ? "este é o desfecho da carreira. Tudo é simulação: eleição, cargos, valores e finais são regras do jogo, não previsão sobre pessoas ou instituições reais." : `este é o encerramento do nível ${s.nivel} de 7. Os finais nacionais — Imperador Supremo e Presidência — vêm no fim da carreira.`}</p>
      </header>
      <div role="tablist" className="flex flex-wrap justify-center gap-2">
        {([["resumo", "📊 Resultado"], ["relatorio", "📄 Relatório e plano"], ["cartao", "🖼️ Card de resultado"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={aba === k} className={`g-btn ${aba === k ? "" : "ghost"}`} onClick={() => setAba(k)}>{l}</button>)}
      </div>
      {aba === "resumo" && (
        <>
          <section className="grid gap-3 md:grid-cols-2" aria-label="Antes e depois">
            {[["Antes", inicial, ini.filaMin], ["Depois", final, s.pub.filaMin]].map(([t, w, f]) => (
              <figure key={t as string} className="g-card overflow-hidden"><div className="aspect-video"><LocationScene location={L.inicial} world={w as ReturnType<typeof worldView>} caso={L.primeiro} pessoas={{}} falando={null} filaMin={f as number} /></div><figcaption className="p-2 text-center font-bold">{t as string}: {L.rotulos.fila.nome.toLowerCase()} de {Math.round(f as number)}{L.rotulos.fila.un} · {L.nivel === 1 ? "estoque" : "insumos"} {t === "Antes" ? ini.estoqueDias : Math.round(s.pub.estoqueDias)} dias</figcaption></figure>
            ))}
          </section>
          <section className="grid gap-3 md:grid-cols-2">
            <div className="g-card p-4"><h2 className="text-xl font-bold">🏥 Serviços e população</h2><div className="mt-2 grid grid-cols-2 gap-3">{report.servicos.map((x) => <Meter key={x.rotulo} icon="" label={x.rotulo} value={x.fim} max={x.unidade === " min" ? 150 : x.unidade === " dias" ? 20 : 100} unit={x.unidade} good={x.melhor === "maior" ? "up" : "down"} delta={x.fim - x.inicio} />)}</div></div>
            <div className="g-card p-4"><h2 className="text-xl font-bold">🧑‍💼 Você</h2><FictionBadge className="mt-1" />
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm"><div><dt className="font-bold">Pontuação de Poder</dt><dd className="text-2xl font-extrabold">{e.poder.toFixed(0)}</dd></div><div><dt className="font-bold">Índice de legado</dt><dd className="text-2xl font-extrabold">{e.legado.toFixed(0)}</dd></div>
                <div><dt className="font-bold">Índice de Trambicagem</dt><dd className="text-2xl font-extrabold">{e.trambicagem.toFixed(2).replace(".", ",")}%</dd></div><div><dt className="font-bold">Patrimônio final (fictício)</dt><dd className="text-2xl font-extrabold">{brlShort(e.patrimonioFinal)}</dd></div></dl>
              {e.bensPerdidos > 0 && <p className="mt-2 text-sm">Bruto antes da responsabilização: {brl(s.personal.patrimonio)} · bens perdidos: {brl(e.bensPerdidos)}. Riqueza antes da punição não é sucesso.</p>}
              <h3 className="mt-3 font-bold">Promoção</h3><p className="text-sm">{s.nivel >= 7 ? "Você chegou ao topo da carreira: o que vale agora é o legado e o relatório." : e.promocao.elegivel || e.promocao.viaRede ? (s.nivel < NIVEL_MAX ? `Critérios atendidos: convite para ${LEVELS[s.nivel + 1]!.cargo} (nível ${s.nivel + 1}).` : `Critérios atendidos: o convite para ${L.proximo ?? "o próximo cargo"} (nível ${s.nivel + 1}) chega quando o próximo nível for publicado — em breve.`) : "Critérios não atendidos nesta campanha."}</p>
              <ul className="mt-1 text-sm">{e.promocao.criterios.map((c) => <li key={c.rotulo}>{c.ok ? "✔" : "✖"} {c.rotulo}: {c.detalhe}</li>)}</ul></div>
          </section>
          <section className="g-card p-4"><h2 className="text-xl font-bold">🏅 Conquistas</h2><p className="mt-1 text-sm">{s.achievements.length ? s.achievements.join(" · ") : "Nenhuma desta vez."}</p></section>
        </>
      )}
      {aba === "relatorio" && <ReportView report={report} />}
      {aba === "cartao" && <ResultCard s={s} />}
      <footer className="flex flex-wrap justify-center gap-2 pb-6">
        {((e.id === "reconhecimento" && e.promocao.elegivel) || (e.id === "responsabilizacao" && e.promocao.viaRede)) && s.nivel < NIVEL_MAX && <button className="g-btn green xl" onClick={() => { audio.sfx("level"); dispatch({ type: "promote" }); }}>{e.id === "reconhecimento" ? "🏛️ Assumir como" : "🕸️ Subir pelas conexões:"} {LEVELS[s.nivel + 1]!.cargo}</button>}
        <button className="g-btn orange" onClick={() => { close(); onExit(); }}>🏠 Menu principal</button>
        <Link href="/brasil-fiscal" className="g-btn ghost" target="_blank">📊 Brasil Fiscal ↗</Link>
        <span className="w-full text-center text-xs text-[color:var(--g-ink3)]">Jogue outra trajetória no mesmo cenário (<ClassChip c="estimativa" curto /> e dados congelados {s.scenario.hash}) para comparar decisões.</span>
      </footer>
    </div>
  );
}
