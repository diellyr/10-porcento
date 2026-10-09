"use client";
import { brl } from "../engine/money";
import type { Report } from "../engine/report";
import { ClassChip } from "./atoms";

function toMarkdown(r: Report): string {
  const L: string[] = [`# ${r.titulo}`, "", `Jogador: ${r.resumo.jogador} · ${r.resumo.cargo} · ${r.resumo.unidade}`, `Final: ${r.resumo.final} · Poder ${r.resumo.poder.toFixed(0)} · Legado ${r.resumo.legado.toFixed(0)} · Trambicagem ${r.resumo.trambicagem.toFixed(2)}%`, `Regras ${r.geradoDe.regras} · conteúdo ${r.geradoDe.conteudo} · cenário ${r.geradoDe.cenarioHash}`, "", "## Decisões"];
  for (const d of r.decisoes) L.push(`- Caso ${d.caso} — ${d.titulo}: **${d.escolha}** (${d.tipo}). Base ${brl(d.base)}; custo ${brl(d.custo)}; economia ${brl(d.economia)}; desvio ${d.desvioPct}% = ${brl(d.desvioValor)}. ${d.resultado}`);
  L.push("", "## Financeiro (campos separados)", `- Desviado (fictício): ${brl(r.financeiro.desviado)}`, `- Restituído: ${brl(r.financeiro.restituido)}`, `- Economias verificadas: ${brl(r.financeiro.economiasVerificadas)}`, `- Receitas: ${brl(r.financeiro.receitas)}`, `- Custos: ${brl(r.financeiro.custos)}`, `- Cortes de atendimento (não são economia): ${brl(r.financeiro.cortesDeAtendimento)}`, `- Obrigações sem caixa: ${brl(r.financeiro.obrigacoes)}`);
  L.push("", "## Serviços", ...r.servicos.map((x) => `- ${x.rotulo}: ${Math.round(x.inicio)}${x.unidade} → ${Math.round(x.fim)}${x.unidade}`));
  L.push("", r.caminho.tipo === "desvio" ? "## Desvios, alternativas e controles" : "## Práticas úteis e condições", ...r.caminho.itens.map((i) => `- **${i.titulo}** ${i.texto}`));
  L.push("", "## Conhecimentos", ...r.conhecimentos.map((c) => `- ${c.titulo}${c.aplicado ? " (aplicado)" : ""}${c.revisar ? " — revisar" : ""}`));
  L.push("", "## Plano de melhoria", ...r.plano.map((p) => `${p.prioridade}. [${p.status}] ${p.problema} → ${p.medida} Responsável: ${p.responsavel}. Prazo: ${p.prazo}. Custo: ${p.custo}. Indicador: ${p.indicador}. Fonte: ${p.fonte.rotulo} (${p.fonte.classificacao}).`));
  L.push("", "## Classificação dos dados", ...r.classificacao.map((c) => `- ${c.classe.toUpperCase()}: ${c.rotulo} — ${c.nota}`), "", r.limites);
  return L.join("\n");
}
function download(name: string, mime: string, body: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

export function ReportView({ report: r }: { report: Report }) {
  const f = r.financeiro;
  return (
    <article className="g-card space-y-5 p-4 sm:p-6" aria-label="Relatório final" id="relatorio">
      <header className="flex flex-wrap items-center gap-2 print:hidden">
        <h2 className="text-2xl font-bold">📄 {r.titulo}</h2>
        <span className="ml-auto flex gap-2"><button className="g-btn sm ghost" onClick={() => window.print()}>🖨️ Imprimir / PDF</button><button className="g-btn sm ghost" onClick={() => download("meus10-relatorio.md", "text/markdown", toMarkdown(r))}>⬇ Markdown</button><button className="g-btn sm ghost" onClick={() => download("meus10-relatorio.json", "application/json", JSON.stringify(r, null, 2))}>⬇ JSON</button></span>
      </header>
      <p className="text-sm text-[color:var(--g-ink3)]">{r.resumo.jogador} · {r.resumo.cargo} · {r.resumo.unidade} · final: <b>{r.resumo.final}</b> · regras {r.geradoDe.regras} · conteúdo {r.geradoDe.conteudo} · cenário {r.geradoDe.cenarioHash}</p>

      <section><h3 className="text-xl font-bold">1. Decisões e valores envolvidos</h3>
        <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b-2 border-[color:var(--g-line)]"><th className="py-1 pr-2">Caso</th><th>Decisão</th><th>Tipo</th><th className="text-right">Base elegível</th><th className="text-right">Desvio</th><th>Resultado</th></tr></thead>
          <tbody>{r.decisoes.map((d) => <tr key={d.caso} className="border-b border-dashed border-[color:var(--g-line)] align-top"><td className="py-1.5 pr-2 font-bold">{d.caso}</td><td><b>{d.titulo}</b><br />{d.escolha}</td><td>{d.tipo}</td><td className="text-right tabular-nums">{brl(d.base)}</td><td className="text-right tabular-nums">{d.desvioPct ? `${d.desvioPct}% = ${brl(d.desvioValor)}` : "—"}</td><td className="max-w-xs">{d.resultado}{d.consequencias.map((c, i) => <span key={i} className="mt-1 block text-xs text-[color:var(--g-ink3)]">↳ {c}</span>)}</td></tr>)}</tbody></table></div></section>

      <section><h3 className="text-xl font-bold">2. Valores (campos separados)</h3>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
          {[["Recursos desviados (fictício)", f.desviado], ["Restituído (novo evento)", f.restituido], ["Economias verificadas no modelo", f.economiasVerificadas], ["Entradas de receita", f.receitas], ["Custos de implantação e compras", f.custos], ["Cortes de atendimento (não são economia)", f.cortesDeAtendimento], ["Obrigações sem caixa", f.obrigacoes], ["Patrimônio bruto", f.patrimonioBruto], ["Bens perdidos / patrimônio final", f.patrimonioFinal]].map(([k, v]) => <div key={k as string} className="rounded-2xl bg-[#fffaf0] p-2"><dt className="font-bold">{k as string}</dt><dd className="tabular-nums">{brl(v as number)}{k === "Bens perdidos / patrimônio final" && <span className="block text-xs">perdidos: {brl(f.bensPerdidos)}</span>}</dd></div>)}
        </dl></section>

      <section><h3 className="text-xl font-bold">3. Serviços: início e fim</h3>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{r.servicos.map((x) => <li key={x.rotulo}>{x.rotulo}: {Math.round(x.inicio)}{x.unidade} → <b>{Math.round(x.fim)}{x.unidade}</b></li>)}</ul></section>

      <section><h3 className="text-xl font-bold">{r.caminho.tipo === "desvio" ? "4. Desvios, alternativa de gestão e controles" : "4. Práticas úteis e condições de funcionamento"}</h3>
        <ul className="mt-2 grid gap-2 text-sm">{r.caminho.itens.length ? r.caminho.itens.map((i, k) => <li key={k} className="rounded-2xl bg-[#fffaf0] p-2"><b>{i.titulo}</b><br />{i.texto}</li>) : <li>Nenhum item.</li>}</ul></section>

      <section><h3 className="text-xl font-bold">5. Conhecimentos</h3>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">{r.conhecimentos.map((c) => <li key={c.id} className={`g-chip ${c.aplicado ? "of" : c.revisar ? "es" : ""}`}>{c.titulo}{c.aplicado ? " · aplicado" : c.revisar ? " · revisar" : ""}</li>)}</ul></section>

      <section><h3 className="text-xl font-bold">6. Meu plano para melhorar a gestão</h3>
        <p className="mt-1 text-sm text-[color:var(--g-ink3)]">Proposta educativa a partir da sua partida — não é diagnóstico da gestão pública real.</p>
        <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead><tr className="border-b-2 border-[color:var(--g-line)]"><th className="py-1 pr-2">#</th><th>Problema → medida</th><th>Responsável</th><th>Prazo</th><th>Custo</th><th>Indicador</th><th>Fonte</th></tr></thead>
          <tbody>{r.plano.map((p) => <tr key={p.prioridade} className="border-b border-dashed border-[color:var(--g-line)] align-top"><td className="py-1.5 pr-2 font-bold">{p.prioridade}</td><td><span className="g-chip mb-1">{p.status === "feito" ? "feito na partida" : p.status === "recomendado" ? "recomendado" : "hipótese a testar"}</span><br /><b>{p.problema}</b><br />{p.medida}</td><td>{p.responsavel}</td><td>{p.prazo}</td><td>{p.custo}</td><td>{p.indicador}</td><td><ClassChip c={p.fonte.classificacao} curto />{p.fonte.url ? <a href={p.fonte.url} target="_blank" rel="noreferrer" className="block">{p.fonte.rotulo} ↗</a> : <span className="block text-xs">{p.fonte.rotulo}</span>}</td></tr>)}</tbody></table></div></section>

      <section><h3 className="text-xl font-bold">7. O que é dado oficial, estimativa e simulação</h3>
        <ul className="mt-2 grid gap-2 text-sm">{r.classificacao.map((c) => <li key={c.rotulo} className="flex flex-wrap items-start gap-2"><ClassChip c={c.classe} /><span><b>{c.rotulo}.</b> {c.nota}</span></li>)}</ul>
        <p className="mt-3 rounded-2xl bg-[#fff3d6] p-3 text-sm">{r.limites}</p></section>
    </article>
  );
}
