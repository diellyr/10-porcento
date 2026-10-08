import { r2 } from "./money";
import { aplicadosTotal, economiaTotal, legado, powerScore, qualidadeAcesso, trambicagem } from "./scoring";
import type { EndingResult, GameState } from "./types";

/** Limiares do final local (regras propostas, sujeitas a balanceamento — ver DECISOES.md). */
export const LIMIARES = { legado: 60, qualidade: 60, acesso: 55, confianca: 50, decisoes: 10 };

export function promocao(s: GameState) {
  const poder = powerScore(s.attrs);
  const criterios = [
    { rotulo: "Pontuação de Poder", ok: poder >= 50, detalhe: `${poder.toFixed(0)} de 50 necessários` },
    { rotulo: "Qualidade e acesso", ok: qualidadeAcesso(s) >= 62, detalhe: `${qualidadeAcesso(s).toFixed(0)} de 62 necessários` },
    { rotulo: "Confiança pública", ok: s.attrs.confianca >= 55, detalhe: `${s.attrs.confianca.toFixed(0)} de 55 necessários` },
    { rotulo: "Conhecimento aplicado", ok: aplicadosTotal(s) >= 4, detalhe: `${aplicadosTotal(s)} de 4 aplicações` },
    { rotulo: "Sem desvios deliberados registrados", ok: s.personal.desviado === 0, detalhe: s.personal.desviado === 0 ? "nenhum desvio no histórico" : "há desvio registrado — o histórico não se apaga" },
  ];
  return { elegivel: criterios.every((c) => c.ok), criterios };
}

export function buildEnding(s: GameState, force?: EndingResult["id"]): EndingResult {
  const poder = powerScore(s.attrs);
  const leg = legado(s);
  const tr = trambicagem(s);
  const reparado = s.repairs.length > 0;
  const motivos: string[] = [];
  let id: EndingResult["id"];
  if (force === "balanco-parcial") {
    id = "balanco-parcial";
    motivos.push("A partida foi encerrada antes do fim da campanha: este é um balanço parcial, sem troféu de campanha concluída.");
    if (s.personal.desviado > 0) motivos.push("Os desvios já registrados permanecem no histórico e nas consequências.");
  } else if (s.personal.desviado > 0) {
    id = "responsabilizacao";
    motivos.push(`Foram registrados ${s.decisions.filter((d) => d.deliberado).length} desvio(s) deliberado(s) no histórico (convenção da ficção, informada desde o início).`);
    motivos.push(reparado ? "A restituição voluntária foi registrada como novo evento e modifica o epílogo, sem apagar os desvios." : "Nenhuma restituição foi registrada.");
  } else if (leg >= LIMIARES.legado && s.pub.qualidade >= LIMIARES.qualidade && s.pub.acesso >= LIMIARES.acesso && s.attrs.confianca >= LIMIARES.confianca && s.decisions.length >= LIMIARES.decisoes) {
    id = "reconhecimento";
    motivos.push("Sem desvios deliberados registrados, com serviços, acesso e confiança acima dos mínimos e conhecimento aplicado.");
  } else {
    id = "gestao-insuficiente";
    motivos.push("Não houve desvio deliberado — mas os resultados ficaram abaixo dos mínimos da campanha. Gestão insuficiente não é crime: é um convite para revisar e tentar de novo.");
    if (leg < LIMIARES.legado) motivos.push(`Índice de legado ${leg.toFixed(0)} (mínimo ${LIMIARES.legado}).`);
    if (s.pub.qualidade < LIMIARES.qualidade) motivos.push(`Qualidade dos serviços ${s.pub.qualidade.toFixed(0)} (mínimo ${LIMIARES.qualidade}).`);
    if (s.pub.acesso < LIMIARES.acesso) motivos.push(`Acesso ${s.pub.acesso.toFixed(0)} (mínimo ${LIMIARES.acesso}).`);
    if (s.attrs.confianca < LIMIARES.confianca) motivos.push(`Confiança pública ${s.attrs.confianca.toFixed(0)} (mínimo ${LIMIARES.confianca}).`);
  }
  const titulos: Record<EndingResult["id"], string> = {
    reconhecimento: "Reconhecimento da comunidade", responsabilizacao: "Responsabilização", "gestao-insuficiente": "Gestão insuficiente: revisão e nova tentativa", "balanco-parcial": "Balanço parcial",
  };
  return { id, titulo: titulos[id], reparado, motivos, poder, trambicagem: tr, legado: r2(leg), promocao: promocao(s) };
}

export { economiaTotal };
