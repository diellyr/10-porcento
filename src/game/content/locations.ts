import type { LocationId } from "../engine/types";
import type { LocationDef } from "./types";
import { buildLocation } from "./niveis/layout";
import { NIVEIS } from "./niveis";

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

const LOCATIONS_N1: Record<"recepcao" | "farmacia" | "enfermagem" | "administracao" | "cofre" | "patio", LocationLayout> = {
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

const T = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const dr = (id: string, x: number, y: number, w: number, h: number, to: LocationId, rotulo: string): HotspotLayout => ({ id, kind: "porta", x, y, w, h, icone: "🚪", entradas: [{ casos: T(11, 18), ref: to, rotulo }] });
const pes = (id: string, x: number, entradas: HotspotEntry[], y = 200, w = 170, h = 280): HotspotLayout => ({ id, kind: "pessoa", x, y, w, h, icone: "💬", entradas });
const pis = (id: string, x: number, y: number, w: number, h: number, icone: string, entradas: HotspotEntry[]): HotspotLayout => ({ id, kind: "pista", x, y, w, h, icone, entradas });
const E = (casos: number[], ref: string, rotulo: string): HotspotEntry => ({ casos, ref, rotulo });

/** Nível 2 — Secretaria Municipal de Saúde: cinco locais da cidade. Os ids dos pontos começam com "n2-" (âncoras 3D e cenas 2D usam os mesmos). */
const LOCATIONS_N2: Record<"secretaria" | "planejamento" | "prefeitura" | "camara" | "ubs", LocationLayout> = {
  secretaria: {
    id: "secretaria", nome: "Gabinete da Secretaria Municipal de Saúde", curto: "Secretaria", mapa: { x: 380, y: 230, w: 240, h: 170 },
    descricao: "Sua mesa nova, uma pilha de ofícios e um telefone que toca mais do que o de uma UPA.",
    hotspots: [
      { id: "n2-mesa", kind: "mesa", x: 430, y: 390, w: 340, h: 130, icone: "🖋️", entradas: [E(T(11, 18), "decisao", "Mesa da Secretaria: decidir")] },
      pes("n2-marlene", 120, [E([11], "marlene-abertura", "Falar com Marlene (Relações Institucionais)")]),
      pes("n2-valdemar", 880, [E([13], "valdemar-fracionar", "Falar com o Doutor Valdemar"), E([15], "valdemar-cooperativa", "Falar com o Doutor Valdemar")]),
      pes("n2-roberto", 300, [E([13], "roberto-ata", "Falar com Roberto dos Contratos")], 210, 140, 270),
      pis("n2-pc", 560, 300, 130, 90, "💻", [E([13], "c13-ata", "E-mail da Central de Compras: ata de registro de preços"), E([15], "c15-folha", "Painel de despesa com pessoal"), E([16], "c16-execucao", "Relatório de execução do trimestre")]),
      pis("n2-pasta", 740, 320, 110, 90, "🗂️", [E([12], "c12-emenda", "Pasta: ofício da emenda parlamentar"), E([13], "c13-dispensas", "Pasta: plano de dispensas do Valdemar"), E([17], "c17-ofertas", "Pasta: propostas “emergenciais”"), E([18], "c18-indicadores", "Relatório de indicadores do quadrimestre")]),
      pis("n2-recado", 450, 100, 190, 130, "📌", [E([14], "c14-pedido", "Bilhete: lista de “indicados” do vereador")]),
      dr("n2-d-plan", 20, 160, 120, 330, "planejamento", "Ir ao Planejamento e Regulação"), dr("n2-d-pref", 1070, 160, 110, 330, "prefeitura", "Ir à Prefeitura"),
      dr("n2-d-cam", 160, 90, 140, 100, "camara", "Ir à Câmara Municipal"), dr("n2-d-ubs", 880, 90, 140, 100, "ubs", "Ir à UBS Esperança"),
    ],
  },
  planejamento: {
    id: "planejamento", nome: "Sala de Situação, Planejamento e Regulação", curto: "Planejamento", mapa: { x: 60, y: 60, w: 260, h: 200 },
    descricao: "Mapas na parede, painéis de filas e uma cafeteira que trabalha em três turnos.",
    hotspots: [
      pes("n2-rita", 520, [E([11], "rita-cobertura", "Falar com Rita (Regulação)"), E([12], "rita-custeio", "Falar com Rita (Regulação)"), E([14], "rita-regulacao", "Falar com Rita (Regulação)"), E([17], "rita-surto", "Falar com Rita (Regulação)")]),
      pis("n2-painel-mapa", 80, 110, 360, 250, "🗺️", [E([11], "c11-cobertura", "Mapa de cobertura da Atenção Primária"), E([17], "c17-boletim", "Mapa de casos de dengue por bairro")]),
      pis("n2-painel-fila", 740, 110, 330, 220, "📺", [E([12], "c12-exames", "Painel de exames de imagem contratados"), E([14], "c14-fila", "Painel da fila por especialidade")]),
      pis("n2-mesa-dados", 300, 380, 220, 120, "💻", [E([12], "c12-custeio", "Estimativa de custeio do equipamento"), E([13], "c13-consumo", "Consumo mensal de insumos da rede"), E([14], "c14-protocolo", "Protocolo de classificação de risco"), E([15], "c15-vagas", "Quadro de vagas abertas e aposentadorias")]),
      pis("n2-quadro-metas", 880, 330, 220, 150, "📋", [E([16], "c16-loa", "Quadro da LOA: dotação por rubrica"), E([18], "c18-metas", "Metas da Programação Anual de Saúde")]),
      dr("n2-d-sec-p", 20, 170, 120, 320, "secretaria", "Ir ao gabinete da Secretaria"), dr("n2-d-ubs-p", 1060, 170, 120, 320, "ubs", "Ir à UBS Esperança"),
    ],
  },
  prefeitura: {
    id: "prefeitura", nome: "Gabinete da Prefeita", curto: "Prefeitura", mapa: { x: 680, y: 60, w: 260, h: 200 },
    descricao: "Bandeiras, um retrato oficial e uma agenda cheia de inaugurações.",
    hotspots: [
      pes("n2-lucia", 440, [E([15], "lucia-pessoal", "Falar com a Prefeita Lúcia"), E([16], "lucia-credito", "Falar com a Prefeita Lúcia"), E([17], "lucia-surto", "Falar com a Prefeita Lúcia")], 170, 190, 300),
      pes("n2-guardiao", 120, [E([16], "guardiao-saldos", "Falar com o Guardião (Tesouraria municipal)")]),
      pis("n2-mesa-pref", 700, 340, 240, 130, "🗂️", [E([15], "c15-proposta", "Pasta: proposta de “cooperativa de saúde”"), E([16], "c16-saldos", "Saldos de dotações de obras paradas"), E([17], "c17-reserva", "Reserva de contingência do município")]),
      dr("n2-d-sec-r", 20, 160, 120, 330, "secretaria", "Ir ao gabinete da Secretaria"), dr("n2-d-cam-r", 1070, 160, 110, 330, "camara", "Ir à Câmara Municipal"),
    ],
  },
  camara: {
    id: "camara", nome: "Câmara Municipal — Comissão de Saúde", curto: "Câmara", mapa: { x: 680, y: 360, w: 260, h: 200 },
    descricao: "Bancadas de madeira, microfones e muita gente interessada em saber quem vai ao microfone.",
    hotspots: [
      pes("n2-nelson", 420, [E([11], "nelson-pedido", "Falar com o Vereador Nelson"), E([14], "nelson-fila", "Falar com o Vereador Nelson")]),
      pes("n2-cornelio", 120, [E([12], "cornelio-emenda", "Falar com o Deputado Cornélio")]),
      pes("n2-celia", 880, [E([18], "celia-audiencia", "Falar com Dona Célia (Conselho de Saúde)")]),
      pes("n2-bento", 680, [E([18], "bento-audiencia", "Falar com o Professor Bento")], 210, 150, 270),
      pis("n2-mesa-cam", 500, 380, 220, 110, "📄", [E([11], "c11-pedido", "Ofício do Vereador Nelson"), E([18], "c18-convite", "Convocação da audiência pública quadrimestral")]),
      dr("n2-d-pref-c", 20, 160, 120, 330, "prefeitura", "Ir à Prefeitura"), dr("n2-d-sec-c", 1070, 160, 110, 330, "secretaria", "Ir ao gabinete da Secretaria"),
    ],
  },
  ubs: {
    id: "ubs", nome: "UBS Esperança (bairro Vila Nova)", curto: "UBS", mapa: { x: 60, y: 360, w: 260, h: 200 },
    descricao: "Sala de espera cheia, agentes comunitários com pranchetas e uma geladeira de vacinas que ninguém desliga.",
    hotspots: [
      pes("n2-edu", 520, [E([11], "edu-territorio", "Falar com Edu (gerente da UBS)"), E([13], "edu-insumos", "Falar com Edu (gerente da UBS)"), E([17], "edu-dengue", "Falar com Edu (gerente da UBS)")]),
      pis("n2-balcao", 780, 330, 260, 150, "🗂️", [E([11], "c11-demanda", "Registro de atendimentos por bairro de origem")]),
      dr("n2-d-sec-u", 20, 170, 120, 320, "secretaria", "Ir ao gabinete da Secretaria"), dr("n2-d-plan-u", 1060, 170, 120, 320, "planejamento", "Ir ao Planejamento e Regulação"),
    ],
  },
};

/** Níveis 3 a 7: layout gerado a partir das specs de cada nível. */
const LOCATIONS_NX = (() => {
  const nomes: Record<string, string> = {};
  for (const c of Object.values(NIVEIS)) for (const l of c.locais) nomes[l.id] = l.nome;
  const out: Record<string, LocationLayout> = {};
  for (const [n, c] of Object.entries(NIVEIS)) c.locais.forEach((l, i) => { out[l.id] = buildLocation(l, i, Number(n), nomes); });
  return out;
})();

export const LOCATIONS = { ...LOCATIONS_N1, ...LOCATIONS_N2, ...LOCATIONS_NX } as Record<LocationId, LocationLayout>;
export const LOCATION_LIST = Object.values(LOCATIONS);
