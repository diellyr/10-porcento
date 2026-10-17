"use client";
import { decisoesDoNivel, levelOf } from "../content/levels";
import { useMemo, useRef } from "react";
import { avatarLook } from "../content/characters";
import { brlShort } from "../engine/money";
import type { GameState } from "../engine/types";
import { Portrait } from "./art/Portrait";

/** Card de resultado compartilhável (voluntário): conta uma história curta e traz a marca de ficção. Nada é publicado automaticamente. */
export function ResultCard({ s }: { s: GameState }) {
  const e = s.ending!;
  const ref = useRef<HTMLDivElement>(null);
  const linhas = useMemo(() => {
    const d = decisoesDoNivel(s, levelOf(s).nivel);
    const pri = d.find((x) => x.economia > 0);
    if (e.id === "reconhecimento") return [`${levelOf(s).rotulos.fila.nome} de ${levelOf(s).inicio.filaMin}${levelOf(s).rotulos.fila.un} → ${Math.round(s.pub.filaMin)}${levelOf(s).rotulos.fila.un}`, pri ? `Economia verificada: ${brlShort(d.reduce((a, b) => a + b.economia, 0))} mantendo o atendimento` : "Serviço recuperado", `Conhecimentos aplicados: ${Object.values(s.knowledge).reduce((a, k) => a + k.aplicadoEm.length, 0)}`];
    if (e.id === "responsabilizacao") return [`Ilícito fictício: ${brlShort(s.personal.desviado)}`, `Bens perdidos: ${brlShort(e.bensPerdidos)}`, "Responsabilização — não é card de vitória"];
    return [`Legado ${e.legado.toFixed(0)} · Poder ${e.poder.toFixed(0)}`, "Revisão e nova tentativa"];
  }, [s, e]);
  const baixar = async () => {
    const el = ref.current!.querySelector("svg")!;
    const svg = new XMLSerializer().serializeToString(el);
    const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; c.getContext("2d")!.drawImage(img, 0, 0, 1080, 1350); const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "meus10-resultado.png"; a.click(); };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  const bom = e.id === "reconhecimento";
  return (
    <div className="grid gap-3 md:grid-cols-[360px_1fr]" ref={ref}>
      <svg viewBox="0 0 1080 1350" className="w-full rounded-3xl shadow-xl" role="img" aria-label={`Card de resultado: ${e.titulo}`}>
        <rect width="1080" height="1350" fill={bom ? "#e9f8ef" : e.id === "responsabilizacao" ? "#fdeceb" : "#fff3d6"} />
        <rect x="30" y="30" width="1020" height="1290" rx="40" fill="#fffdf8" stroke={bom ? "#2fa66a" : e.id === "responsabilizacao" ? "#e5484d" : "#ffc933"} strokeWidth="10" />
        <text x="540" y="140" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="700" fontSize="96" fill="#1b2340">MEUS 10%</text>
        <text x="540" y="200" textAnchor="middle" fontFamily="Nunito Variable, sans-serif" fontSize="34" fill="#46507a">{s.scenario.unidade.split(" (")[0]}</text>
        <svg x="340" y="240" width="400" height="400" viewBox="34 28 132 140"><Portrait look={avatarLook(s.player.avatar)} enquadramento="rosto" emocao={bom ? "feliz" : e.id === "responsabilizacao" ? "triste" : "neutro"} x={34} y={28} width={132} height={140} /></svg>
        <text x="540" y="720" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="700" fontSize="62" fill="#1b2340">{s.player.nome}</text>
        <text x="540" y="800" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="700" fontSize="52" fill={bom ? "#1d7447" : e.id === "responsabilizacao" ? "#a52a2f" : "#8a5a00"}>{e.titulo}</text>
        {linhas.map((l, i) => <text key={i} x="540" y={900 + i * 70} textAnchor="middle" fontFamily="Nunito Variable, sans-serif" fontWeight="800" fontSize="42" fill="#1b2340">{l}</text>)}
        <rect x="120" y="1180" width="840" height="84" rx="22" fill="#f1ecff" /><text x="540" y="1236" textAnchor="middle" fontFamily="Nunito Variable, sans-serif" fontWeight="800" fontSize="32" fill="#4a3a9a">🎭 SIMULAÇÃO FICTÍCIA · o orçamento inspira, as decisões mudam o final</text>
      </svg>
      <div className="g-card p-4"><h2 className="text-xl font-bold">🖼️ Card de resultado</h2><p className="mt-1 text-sm text-[color:var(--g-ink2)]">Você escolhe se quer baixar ou compartilhar — o jogo não publica nada em suas redes. {bom ? "Um card que conta a história: a escolha, o efeito e o resultado." : "Este card mostra a responsabilização e a marca de ficção; não é um card de vitória."}</p>
        <div className="mt-3 flex flex-wrap gap-2"><button className="g-btn" onClick={() => void baixar()}>⬇ Baixar imagem</button>{typeof navigator !== "undefined" && "share" in navigator && <button className="g-btn ghost" onClick={() => void navigator.share({ title: "MEUS 10%", text: `${e.titulo} em MEUS 10%`, url: location.origin })}>↗ Compartilhar</button>}</div></div>
    </div>
  );
}
