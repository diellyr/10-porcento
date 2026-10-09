import type { LocationId } from "../engine/types";
import type { LocationDef } from "./types";

/**
 * Locais investigáveis da UPA. Os retângulos dos pontos interativos usam o viewBox 1200×675 das cenas.
 * Cada ponto só fica ativo no(s) caso(s) em que `entradas` o referencia (o objeto continua no cenário, mas não destacado).
 */
export interface HotspotEntry { casos: number[]; ref: string; rotulo: string }
export interface HotspotLayout {
  id: string;
  kind: "pista" | "pessoa" | "porta" | "mesa";
  x: number; y: number; w: number; h: number;
  icone: string;
  entradas: HotspotEntry[];
}
export interface LocationLayout extends Omit<LocationDef, "hotspots"> { hotspots: HotspotLayout[] }

const door = (id: string, x: number, y: number, w: number, h: number, to: LocationId, rotulo: string): HotspotLayout => ({
  id, kind: "porta", x, y, w, h, icone: "🚪", entradas: [{ casos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], ref: to, rotulo }],
});

export const LOCATIONS: Record<LocationId, LocationLayout> = {
  recepcao: {
    id: "recepcao", nome: "Recepção e Triagem", curto: "Recepção", mapa: { x: 40, y: 330, w: 330, h: 240 },
    descricao: "A fila começa aqui. Senhas, cadeiras cheias e um quadro que insiste em marcar o tempo de espera.",
    hotspots: [
      door("p-patio", 24, 150, 170, 340, "patio", "Ir ao pátio"),
      { id: "celia", kind: "pessoa", x: 250, y: 210, w: 190, h: 260, icone: "💬", entradas: [
        { casos: [1], ref: "abertura", rotulo: "Dona Célia e a família na fila" },
        { casos: [2], ref: "celia-fila", rotulo: "Falar com Dona Célia" },
        { casos: [9], ref: "celia-crise", rotulo: "Falar com Dona Célia" },
      ] },
      { id: "pc-balcao", kind: "pista", x: 470, y: 370, w: 140, h: 100, icone: "💻", entradas: [{ casos: [2], ref: "c2-espera", rotulo: "Relatório de espera (computador do balcão)" }] },
      { id: "quadro", kind: "pista", x: 690, y: 100, w: 250, h: 130, icone: "📺", entradas: [
        { casos: [4], ref: "c4-pediatria", rotulo: "Painel de atendimentos" },
        { casos: [9], ref: "c9-boletim", rotulo: "Boletim de atendimentos" },
      ] },
      door("p-enfermagem", 1010, 170, 160, 330, "enfermagem", "Ir à enfermagem"),
    ],
  },
  farmacia: {
    id: "farmacia", nome: "Farmácia e Estoque", curto: "Farmácia", mapa: { x: 40, y: 40, w: 280, h: 250 },
    descricao: "Prateleiras de caixas, etiquetas coloridas e uma planilha que ninguém atualiza desde a gestão passada.",
    hotspots: [
      { id: "estante", kind: "pista", x: 90, y: 120, w: 360, h: 370, icone: "📦", entradas: [{ casos: [1], ref: "c1-validade", rotulo: "Prateleiras: validade dos lotes" }] },
      { id: "pc-consumo", kind: "pista", x: 520, y: 360, w: 150, h: 110, icone: "💻", entradas: [{ casos: [1], ref: "c1-consumo", rotulo: "Planilha de consumo" }] },
      { id: "mural", kind: "pista", x: 530, y: 110, w: 220, h: 140, icone: "📌", entradas: [{ casos: [1], ref: "c1-pedido", rotulo: "Mural de pedidos" }] },
      { id: "caixas", kind: "pista", x: 850, y: 330, w: 220, h: 170, icone: "📦", entradas: [{ casos: [6], ref: "c6-recebimento", rotulo: "Caixas recebidas hoje" }] },
      { id: "mesa-conf", kind: "pista", x: 700, y: 380, w: 130, h: 90, icone: "🧾", entradas: [{ casos: [6], ref: "c6-nota", rotulo: "Nota fiscal e empenho" }] },
      { id: "roberto", kind: "pessoa", x: 700, y: 251, w: 130, h: 220, icone: "💬", entradas: [{ casos: [6], ref: "roberto-entrega", rotulo: "Falar com Roberto dos Contratos" }] },
      door("p-enf2", 20, 160, 130, 330, "enfermagem", "Ir à enfermagem"),
      door("p-adm2", 1060, 160, 120, 330, "administracao", "Ir à administração"),
    ],
  },
  enfermagem: {
    id: "enfermagem", nome: "Posto de Enfermagem", curto: "Enfermagem", mapa: { x: 350, y: 40, w: 290, h: 250 },
    descricao: "Macas, monitores antigos e o quadro de escala com mais riscos do que nomes.",
    hotspots: [
      { id: "joana", kind: "pessoa", x: 540, y: 179, w: 170, h: 290, icone: "💬", entradas: [
        { casos: [1], ref: "joana-estoque", rotulo: "Falar com Joana" },
        { casos: [9], ref: "joana-crise", rotulo: "Falar com Joana" },
      ] },
      { id: "escala", kind: "pista", x: 110, y: 100, w: 270, h: 190, icone: "🗓️", entradas: [{ casos: [2], ref: "c2-escala", rotulo: "Quadro de escala de plantão" }] },
      { id: "monitor", kind: "pista", x: 800, y: 290, w: 230, h: 220, icone: "🩺", entradas: [{ casos: [3], ref: "c3-manut", rotulo: "Monitores parados: ficha de manutenção" }] },
      { id: "leitos", kind: "pista", x: 410, y: 90, w: 220, h: 120, icone: "🛏️", entradas: [{ casos: [9], ref: "c9-leitos", rotulo: "Quadro de leitos" }] },
      door("p-rec2", 20, 170, 130, 320, "recepcao", "Ir à recepção"),
      door("p-far2", 1060, 170, 120, 320, "farmacia", "Ir à farmácia"),
    ],
  },
  administracao: {
    id: "administracao", nome: "Gabinete da Administração", curto: "Gabinete", mapa: { x: 670, y: 40, w: 290, h: 250 },
    descricao: "Sua mesa, sua caneta e uma pilha de papéis que se reproduz durante a noite.",
    hotspots: [
      { id: "mesa", kind: "mesa", x: 430, y: 380, w: 340, h: 130, icone: "🖋️", entradas: [{ casos: [1, 2, 3, 5, 6, 7, 8, 9], ref: "decisao", rotulo: "Mesa de trabalho: decidir" }] },
      { id: "toninho", kind: "pessoa", x: 120, y: 179, w: 170, h: 290, icone: "💬", entradas: [
        { casos: [1], ref: "toninho-estoque", rotulo: "Falar com Toninho" },
        { casos: [8], ref: "toninho-favor", rotulo: "Falar com Toninho" },
      ] },
      { id: "juninho", kind: "pessoa", x: 910, y: 200, w: 170, h: 270, icone: "💬", entradas: [{ casos: [2], ref: "juninho-consultoria", rotulo: "Falar com o Primo Juninho" }] },
      { id: "ana", kind: "pessoa", x: 840, y: 179, w: 170, h: 290, icone: "💬", entradas: [{ casos: [7], ref: "ana-auditoria", rotulo: "Falar com Ana da Controladoria" }] },
      { id: "roberto-adm", kind: "pessoa", x: 300, y: 200, w: 140, h: 270, icone: "💬", entradas: [{ casos: [3], ref: "roberto-contratos", rotulo: "Falar com Roberto dos Contratos" }] },
      { id: "recado", kind: "pista", x: 400, y: 100, w: 150, h: 130, icone: "📌", entradas: [
        { casos: [1], ref: "c1-oferta", rotulo: "Recado colado na parede" },
        { casos: [5], ref: "c5-convite", rotulo: "Convite de inauguração" },
      ] },
      { id: "memo", kind: "pista", x: 590, y: 90, w: 230, h: 160, icone: "📄", entradas: [{ casos: [4], ref: "c4-memo", rotulo: "Memorando da Secretaria" }] },
      { id: "pc-adm", kind: "pista", x: 560, y: 300, w: 120, h: 90, icone: "💻", entradas: [{ casos: [2], ref: "c2-proposta", rotulo: "E-mail: proposta de consultoria" }] },
      { id: "pasta", kind: "pista", x: 730, y: 320, w: 110, h: 90, icone: "🗂️", entradas: [
        { casos: [3], ref: "c3-propostas", rotulo: "Pasta: três propostas de monitores" },
        { casos: [8], ref: "c8-proposta", rotulo: "Pasta: proposta de manutenção predial" },
      ] },
      door("p-far3", 20, 170, 130, 330, "farmacia", "Ir à farmácia"),
      door("p-cofre", 1070, 170, 110, 330, "cofre", "Ir ao cofre"),
    ],
  },
  cofre: {
    id: "cofre", nome: "Tesouraria e Cofre", curto: "Cofre", mapa: { x: 720, y: 330, w: 240, h: 200 },
    descricao: "Um cofre antigo, um livro-caixa aberto e o Guardião do Cofre, que olha para você como quem confere troco.",
    hotspots: [
      { id: "guardiao", kind: "pessoa", x: 450, y: 159, w: 230, h: 310, icone: "💬", entradas: [
        { casos: [4], ref: "guardiao-corte", rotulo: "Falar com o Guardião do Cofre" },
        { casos: [10], ref: "guardiao-final", rotulo: "Falar com o Guardião do Cofre" },
      ] },
      { id: "livro", kind: "pista", x: 190, y: 370, w: 210, h: 110, icone: "📒", entradas: [
        { casos: [4], ref: "c4-livro", rotulo: "Livro-caixa do trimestre" },
        { casos: [10], ref: "c10-indicadores", rotulo: "Relatório de indicadores" },
      ] },
      { id: "cofre-porta", kind: "pista", x: 800, y: 170, w: 280, h: 320, icone: "🔐", entradas: [{ casos: [7], ref: "c7-registros", rotulo: "Arquivo: registros do trimestre" }] },
      { id: "mesa-cofre", kind: "mesa", x: 430, y: 430, w: 270, h: 70, icone: "🖋️", entradas: [{ casos: [4, 10], ref: "decisao", rotulo: "Balcão do cofre: decidir" }] },
      { id: "bento", kind: "pessoa", x: 120, y: 220, w: 130, h: 250, icone: "💬", entradas: [{ casos: [10], ref: "bento-final", rotulo: "Falar com o Professor Bento" }] },
      door("p-adm4", 20, 160, 100, 340, "administracao", "Ir ao gabinete"),
    ],
  },
  patio: {
    id: "patio", nome: "Pátio e Obra da Observação", curto: "Pátio", mapa: { x: 420, y: 330, w: 270, h: 240 },
    descricao: "Ambulâncias, uma sala de observação em obra e uma faixa já pendurada com a palavra INAUGURAÇÃO.",
    hotspots: [
      { id: "obra", kind: "pista", x: 90, y: 200, w: 360, h: 280, icone: "🏗️", entradas: [{ casos: [5], ref: "c5-cronograma", rotulo: "Obra da sala de observação" }] },
      { id: "placa", kind: "pista", x: 470, y: 270, w: 110, h: 170, icone: "🪧", entradas: [{ casos: [5], ref: "c5-medicao", rotulo: "Placa e boletim de medição" }] },
      { id: "cornelio", kind: "pessoa", x: 690, y: 210, w: 150, h: 260, icone: "💬", entradas: [{ casos: [5], ref: "cornelio-inauguracao", rotulo: "Falar com o Deputado Cornélio" }] },
      door("p-rec3", 1050, 150, 130, 340, "recepcao", "Entrar na recepção"),
    ],
  },
};

export const LOCATION_LIST = Object.values(LOCATIONS);
