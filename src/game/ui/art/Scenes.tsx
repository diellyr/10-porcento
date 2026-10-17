"use client";
import type { ReactNode } from "react";
import { CHARACTERS } from "@/game/content/characters";
import { LOCATIONS } from "@/game/content/locations";
import type { Look } from "@/game/content/types";
import type { WorldView } from "@/game/engine/scoring";
import type { CharId, Emotion, LocationId } from "@/game/engine/types";
import { Banner, Box, Chair, Desk, Extra, Finish, Monitor, PAL, Papers, PersonSpot, Plant, Room, SceneDefs, Window } from "./parts";
import { darken, lighten } from "./color";
import { LOC_INFO } from "@/game/content/niveis";
import { TEMAS } from "@/game/content/niveis/layout";

export interface SceneProps {
  world: WorldView;
  caso: number;
  /** personagens presentes por ponto interativo (id do hotspot → personagem) */
  pessoas: Record<string, CharId>;
  falando: CharId | null;
  emocoes?: Partial<Record<CharId, Emotion>>;
  filaMin: number;
  /** aparência do jogador (mão/caneta e avatar em cena) */
  jogador?: Look;
  destaque?: string | null;
}

const K = (k: LocationId, id: string) => LOCATIONS[k].hotspots.find((h) => h.id === id)!;

function People({ loc, p, y = 0 }: { loc: LocationId; p: SceneProps; y?: number }) {
  return (
    <g>
      {Object.entries(p.pessoas).map(([hid, cid]) => {
        const h = LOCATIONS[loc].hotspots.find((x) => x.id === hid);
        if (!h) return null;
        const w = Math.min(h.h * 0.82, 230);
        return <PersonSpot key={hid} x={h.x + h.w / 2 - w / 2} y={h.y + y} w={w} look={CHARACTERS[cid].look} emo={p.emocoes?.[cid] ?? "neutro"} falando={p.falando === cid} label={CHARACTERS[cid].nome} />;
      })}
    </g>
  );
}

const Door = ({ x, y, w, h, glass = false, c = "#7b5330" }: { x: number; y: number; w: number; h: number; glass?: boolean; c?: string }) => (
  <g>
    <rect x={x - 8} y={y - 8} width={w + 16} height={h + 8} rx="6" fill={darken(c, 0.25)} />
    <rect x={x} y={y} width={w} height={h} rx="4" fill={glass ? "#a9dcf5" : c} />
    {glass ? (<><rect x={x + 10} y={y + 14} width={w - 20} height={h - 30} rx="4" fill="#d9f1ff" opacity="0.85" /><path d={`M${x + 10},${y + h * 0.5} L${x + w - 10},${y + 40}`} stroke="#fff" strokeWidth="10" opacity="0.4" /><line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#6b7a8c" strokeWidth="4" /></>) : (<><rect x={x + 14} y={y + 20} width={w - 28} height={h * 0.38} rx="4" fill={lighten(c, 0.1)} opacity="0.5" /><rect x={x + 14} y={y + h * 0.5} width={w - 28} height={h * 0.38} rx="4" fill={lighten(c, 0.1)} opacity="0.5" /></>)}
    <circle cx={x + w - 14} cy={y + h * 0.55} r="5" fill="#ffd98a" />
  </g>
);

const Sign = ({ x, y, t, c = PAL.teal }: { x: number; y: number; t: string; c?: string }) => (<g><rect x={x} y={y} width={t.length * 13 + 24} height="34" rx="9" fill={c} /><text x={x + 12} y={y + 24} fontFamily="var(--g-display)" fontWeight="700" fontSize="19" fill="#fff">{t}</text></g>);

/* ───────────────────────── Recepção ───────────────────────── */
function Recepcao(p: SceneProps) {
  const id = "rc"; const w = p.world;
  const bom = w.melhoria > 0;
  const pessoas = [
    { x: 130, c: "#c9577a", s: "#a9724f" }, { x: 330, c: "#4f8f6f", s: "#d9ab87" }, { x: 480, c: "#d9a335", s: "#7a4a30" }, { x: 600, c: "#6d6fc4", s: "#c68d64" },
    { x: 760, c: "#cc5a4a", s: "#8d5b3d" }, { x: 880, c: "#4a8fb8", s: "#e0b48f" },
  ];
  return (
    <>
      <Room id={id} c={{ wall: ["#fff2d8", "#ffe2b0"], wain: bom ? "#bfe6d8" : "#e9c995", floor: ["#e7cfa0", "#c9a66c"] }}>
        <Window x={250} y={90} w={150} h={150} id={id} />
        <Window x={520} y={90} w={130} h={130} id={id} />
        <Sign x={60} y={60} t="Recepção · Triagem" c={PAL.teal} />
        {/* porta de vidro para o pátio */}
        <Door x={24} y={150} w={170} h={330} glass />
        <Door x={1010} y={170} w={160} h={310} c="#8aa6c6" />
        <Sign x={1000} y={120} t="Enfermagem →" c={PAL.blue} />
        {/* quadro de espera (TV) */}
        <g>
          <rect x="688" y="98" width="254" height="134" rx="10" fill="#1b2340" /><rect x="698" y="108" width="234" height="114" rx="6" fill="#0e1a3a" />
          <text x="815" y="140" textAnchor="middle" fontFamily="var(--g-display)" fontSize="16" fill="#8fd0ff" letterSpacing="2">ESPERA MÉDIA</text>
          <text x="815" y="196" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="52" fill={p.filaMin > 80 ? "#ff7a6b" : p.filaMin > 50 ? "#ffd85a" : "#6ff0a6"}>{Math.round(p.filaMin)} min</text>
        </g>
        {bom && (<g><Plant x={560} y={330} s={0.8} /><rect x="470" y="150" width="14" height="14" fill="#fff" opacity="0" /></g>)}
        {/* cadeiras de espera */}
        {[110, 250, 390, 530, 670, 810, 950].map((x) => <Chair key={x} x={x} y={470} c={PAL.blue} s={0.95} />)}
        {pessoas.slice(0, Math.min(6, 1 + w.filaNivel + (w.filaNivel > 2 ? 1 : 0))).map((q, i) => <Extra key={i} x={q.x} y={455} c={q.c} skin={q.s} s={0.95} />)}
        <Extra x={185} y={470} c="#e2701c" skin="#c88a62" kid s={1.1} /><Extra x={125} y={462} c="#2e8a7a" skin="#b57a52" s={1} />
      </Room>
      <People loc="recepcao" p={p} />
      <g filter={`url(#${id}-shadow)`}><rect x="215" y="420" width="260" height="62" rx="16" fill="#2a5be0" /><rect x="215" y="420" width="260" height="14" rx="7" fill="#5b82f0" /><rect x="230" y="482" width="10" height="20" fill="#4a5070" /><rect x="450" y="482" width="10" height="20" fill="#4a5070" /></g>
      <g>
        {/* balcão da recepção */}
        <g filter={`url(#${id}-shadow)`}>
          <rect x="440" y="415" width="430" height="70" rx="10" fill="#f0a14c" /><rect x="440" y="415" width="430" height="14" rx="7" fill="#ffd08a" />
          <rect x="460" y="440" width="390" height="32" rx="6" fill="#d9822e" opacity="0.7" /><text x="655" y="463" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="20" fill="#fff6e0" letterSpacing="3">TRIAGEM · SENHAS</text>
        </g>
        <Monitor x={540} y={420} s={1} screen="#d9f1ff"><rect x="-34" y="-48" width="52" height="5" fill="#2a5be0" /><rect x="-34" y="-36" width="64" height="4" fill="#9db6ee" /><rect x="-34" y="-26" width="40" height="4" fill="#9db6ee" /></Monitor>
        <g><rect x="888" y="380" width="44" height="106" rx="8" fill="#2a5be0" /><rect x="896" y="392" width="28" height="22" rx="3" fill="#fffdf8" /><circle cx="910" cy="440" r="8" fill="#ffcf44" /></g>
      </g>
      <Extra x={780} y={425} c="#e7f4ff" skin="#e3b996" s={1.05} />
      <Finish id={id} />
    </>
  );
}

/* ───────────────────────── Farmácia ───────────────────────── */
function Farmacia(p: SceneProps) {
  const id = "fa"; const w = p.world;
  const cheio = w.estoqueNivel;
  const cols = [["#e9a25a", "#7cc4a1", "#e2d089"], ["#9ab6ea", "#e88f8f", "#d6b0e8"], ["#8fd0b5", "#f2c77a", "#a9c1ee"]];
  return (
    <>
      <Room id={id} c={{ wall: ["#eefcf6", "#d6f1e6"], wain: "#9fd8c2", floor: ["#ecf5f0", "#c5d8cf"] }}>
        <Sign x={470} y={52} t="Farmácia" c={PAL.teal} />
        <Door x={20} y={160} w={130} h={320} c="#7fa6c6" /><Door x={1060} y={160} w={120} h={320} c="#c9b27a" />
        {/* estante */}
        <g filter={`url(#${id}-shadow)`}>
          <rect x="90" y="120" width="360" height="370" rx="8" fill="#e9dcc4" /><rect x="100" y="130" width="340" height="350" fill="#f7efe0" />
          {[0, 1, 2].map((r) => (
            <g key={r}>
              <rect x="100" y={216 + r * 112} width="340" height="9" fill="#b99e6b" />
              {Array.from({ length: 6 }, (_, c) => {
                const on = c < Math.max(1, Math.round((cheio + 0.6) * 1.6 + (r === 0 ? 0.4 : -0.1)));
                return on ? <Box key={c} x={110 + c * 54} y={168 + r * 112} w={46} h={48} c={cols[r]![c % 3]!} tag={p.caso === 1 && c === 4 ? "#e5484d" : undefined} /> : <rect key={c} x={110 + c * 54} y={190 + r * 112} width="46" height="26" fill="#e7dcc4" opacity="0.5" />;
              })}
            </g>
          ))}
          {cheio <= 1 && <g><rect x="290" y="146" width="140" height="28" rx="6" fill={PAL.red} /><text x="360" y="166" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="17" fill="#fff">FALTA</text></g>}
          {cheio >= 3 && <g><rect x="290" y="146" width="140" height="28" rx="6" fill={PAL.green} /><text x="360" y="166" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="17" fill="#fff">ESTOQUE OK</text></g>}
        </g>
        {/* mural */}
        <rect x="520" y="100" width="240" height="160" rx="10" fill="#c58a4a" /><rect x="530" y="110" width="220" height="140" rx="6" fill="#e8c88f" />
        {[[550, 126, "#fff", -4], [620, 136, "#ffe97a", 3], [690, 124, "#ffb4a2", -2], [570, 186, "#bfe3ff", 5], [660, 190, "#fff", -3]].map(([x, y, c, r], i) => <g key={i} transform={`rotate(${r} ${x} ${y})`}><rect x={x as number} y={y as number} width="52" height="52" fill={c as string} /><rect x={(x as number) + 8} y={(y as number) + 10} width="34" height="3" fill="#9a8e70" /><rect x={(x as number) + 8} y={(y as number) + 20} width="28" height="3" fill="#b3a889" /><circle cx={(x as number) + 26} cy={(y as number) + 4} r="3" fill="#e5484d" /></g>)}
        {/* balcão com PC */}
        <g filter={`url(#${id}-shadow)`}><rect x="500" y="420" width="190" height="64" rx="8" fill="#fff" stroke="#cfe3da" strokeWidth="3" /><rect x="500" y="420" width="190" height="12" rx="6" fill="#bfe3d3" /></g>
        <Monitor x={590} y={424} screen="#e8fff5"><rect x="-34" y="-48" width="64" height="4" fill="#0f9d8a" /><rect x="-34" y="-38" width="64" height="4" fill="#9cd8c8" /><rect x="-34" y="-28" width="44" height="4" fill="#9cd8c8" /></Monitor>
        {/* recebimento */}
        <g>{[[850, 430], [906, 430], [962, 430], [878, 388], [934, 388]].map(([x, y], i) => <Box key={i} x={x!} y={y!} w={56} h={44} c={["#d9a35b", "#c98b46", "#e0b36b"][i % 3]!} tag={p.caso === 6 && i === 4 ? "#e5484d" : undefined} />)}</g>
      </Room>
      <People loc="farmacia" p={p} />
      <g>
        <g filter={`url(#${id}-shadow)`}><rect x="696" y="425" width="132" height="60" rx="6" fill="#f2f6f4" stroke="#cfe3da" strokeWidth="3" /></g>
        <Papers x={760} y={414} n={2} tilt={-4} />
      </g>
      <Finish id={id} />
    </>
  );
}

/* ───────────────────────── Enfermagem ───────────────────────── */
function Enfermagem(p: SceneProps) {
  const id = "en"; const w = p.world;
  return (
    <>
      <Room id={id} c={{ wall: ["#eaf6ff", "#cfe7fa"], wain: "#9cc8ea", floor: ["#e7eef5", "#bccbd8"] }}>
        <Sign x={470} y={50} t="Posto de Enfermagem" c={PAL.blue} />
        <Door x={20} y={170} w={130} h={310} c="#e0b36b" /><Door x={1060} y={170} w={120} h={310} c="#7fc4a8" />
        {/* quadro de escala */}
        <rect x="100" y="90" width="290" height="200" rx="10" fill="#8b6b44" /><rect x="110" y="100" width="270" height="180" rx="6" fill="#fffdf8" />
        {[0, 1, 2, 3, 4].map((r) => <g key={r}><rect x="124" y={116 + r * 32} width="52" height="18" rx="4" fill="#d9e4f2" />{[0, 1, 2, 3].map((c) => <rect key={c} x={186 + c * 48} y={116 + r * 32} width="40" height="18" rx="4" fill={[(r + c) % 3 === 0 ? "#ffd7a6" : "#c6e6d6", "#bcd3f6", "#f6c2cf"][(r * 2 + c) % 3]!} />)}</g>)}
        <rect x="408" y="88" width="230" height="130" rx="10" fill="#fff" stroke="#9cc8ea" strokeWidth="4" />
        {[0, 1, 2, 3, 4, 5].map((i) => <g key={i}><rect x={424 + (i % 3) * 70} y={104 + Math.floor(i / 3) * 52} width="58" height="38" rx="6" fill={i < 5 + (w.obraConcluida ? 0 : 0) ? "#ffb4a2" : "#c6e6d6"} /><text x={453 + (i % 3) * 70} y={129 + Math.floor(i / 3) * 52} textAnchor="middle" fontFamily="var(--g-display)" fontSize="15" fontWeight="700" fill="#1b2340">L{i + 1}</text></g>)}
        {/* macas e monitores antigos */}
        <g filter={`url(#${id}-shadow)`}>
          <rect x="790" y="420" width="250" height="14" rx="7" fill="#c9d2dc" /><rect x="800" y="400" width="230" height="26" rx="12" fill="#fff" /><rect x="806" y="434" width="8" height="50" fill="#8a96a6" /><rect x="1016" y="434" width="8" height="50" fill="#8a96a6" /><circle cx="810" cy="490" r="8" fill="#4a5070" /><circle cx="1020" cy="490" r="8" fill="#4a5070" />
        </g>
        {[0, 1, 2].map((i) => <g key={i}><rect x={810 + i * 78} y="320" width="64" height="62" rx="8" fill={i === 1 && w.degradacao ? "#7a7f99" : "#2b3350"} /><rect x={816 + i * 78} y="326" width="52" height="40" rx="4" fill={i === 1 && w.degradacao ? "#3a3f55" : "#0e1a3a"} />{!(i === 1 && w.degradacao) && <path d={`M${820 + i * 78},350 l8,-12 l8,16 l8,-22 l8,18 l8,-8`} stroke="#6ff0a6" strokeWidth="2.5" fill="none" />}<rect x={826 + i * 78} y="378" width="30" height="42" fill="#4a5070" /></g>)}
        {/* posto */}
        <g filter={`url(#${id}-shadow)`}><rect x="470" y="410" width="300" height="76" rx="10" fill="#fff" stroke="#cfe0f0" strokeWidth="3" /><rect x="470" y="410" width="300" height="14" rx="7" fill="#bcd3f6" /></g>
        <Monitor x={560} y={414} screen="#eaf6ff" s={0.9} />
        {w.equipeNivel >= 1 && <Extra x={400} y={470} c="#2bb3a3" skin="#d9ab87" s={1.1} />}
        {w.equipeNivel >= 2 && <Extra x={1100} y={470} c="#2bb3a3" skin="#8d5b3d" s={1.1} />}
        <Papers x={700} y={400} n={3} tilt={3} />
      </Room>
      <People loc="enfermagem" p={p} />
      <Finish id={id} />
    </>
  );
}

/* ───────────────────────── Gabinete ───────────────────────── */
function Administracao(p: SceneProps) {
  const id = "ad"; const w = p.world;
  const luxo = w.luxoNivel;
  return (
    <>
      <Room id={id} c={{ wall: luxo >= 2 ? ["#f6e8c8", "#ead09a"] : ["#fff4e0", "#f7dfb4"], wain: luxo >= 2 ? "#8a5a2b" : "#c98f55", floor: luxo >= 2 ? ["#b0764a", "#7d4d2a"] : ["#d4b27c", "#b3905a"] }}>
        <Sign x={60} y={56} t="Administração da UPA" c={PAL.orange} />
        <Window x={870} y={100} w={150} h={150} id={id} />
        <Door x={20} y={170} w={130} h={310} c="#7fa6c6" /><Door x={1070} y={170} w={110} h={310} c="#4b6d5c" />
        <Sign x={1030} y={126} t="Cofre →" c="#4b6d5c" />
        {/* mural de recados */}
        <rect x="390" y="90" width="170" height="150" rx="8" fill="#c58a4a" /><rect x="398" y="98" width="154" height="134" rx="5" fill="#e8c88f" />
        {[[408, 108, "#fff"], [470, 116, "#ffe97a"], [420, 168, "#ffb4a2"], [482, 172, "#bfe3ff"]].map(([x, y, c], i) => <g key={i} transform={`rotate(${i % 2 ? 4 : -3} ${x} ${y})`}><rect x={x as number} y={y as number} width="52" height="46" fill={c as string} /><rect x={(x as number) + 8} y={(y as number) + 12} width="32" height="3" fill="#9a8e70" /><circle cx={(x as number) + 26} cy={(y as number) + 5} r="3" fill="#e5484d" /></g>)}
        {/* memorando */}
        <rect x="580" y="84" width="256" height="170" rx="6" fill="#fffdf8" stroke="#d9c9a6" strokeWidth="3" /><rect x="600" y="104" width="120" height="8" fill="#2a5be0" /><rect x="600" y="126" width="210" height="5" fill="#c9bb98" /><rect x="600" y="140" width="190" height="5" fill="#c9bb98" /><rect x="600" y="154" width="200" height="5" fill="#c9bb98" /><rect x="600" y="168" width="140" height="5" fill="#c9bb98" />
        {luxo >= 1 && <g><rect x="190" y="90" width="150" height="110" rx="6" fill="#d8b04a" /><rect x="200" y="100" width="130" height="90" fill="#6b8fc4" /><circle cx="236" cy="136" r="22" fill="#f0c04a" /><path d="M200,190 L250,150 L290,176 L330,140 L330,190Z" fill="#3f7a5c" /></g>}
        <Plant x={290} y={480} s={1.1} fresh={w.degradacao < 2} />
        {/* sofá */}
        <g filter={`url(#${id}-shadow)`}><rect x="880" y="410" width="240" height="70" rx="22" fill={luxo >= 2 ? "#6b1d2a" : "#6a86c6"} /><rect x="870" y="380" width="260" height="56" rx="24" fill={luxo >= 2 ? "#85283a" : "#86a0da"} /></g>
        {luxo >= 3 && <g><path d="M120,470 L120,360 q50,-40 100,0 L220,470Z" fill="#f0c04a" opacity="0.9" /><circle cx="170" cy="344" r="20" fill="#f0c04a" /></g>}
      </Room>
      <People loc="administracao" p={p} />
      <g filter={`url(#${id}-shadow)`}>
        <rect x="100" y="420" width="210" height="84" rx="8" fill="#9aa7b8" /><rect x="100" y="420" width="210" height="12" rx="6" fill="#c9d2dc" />{[0, 1].map((i) => <g key={i}><rect x={116 + i * 96} y="442" width="84" height="48" rx="5" fill="#8896a8" /><rect x={142 + i * 96} y="458" width="32" height="6" rx="3" fill="#e8eef4" /></g>)}
        <rect x="310" y="430" width="108" height="70" rx="8" fill="#7a5a3a" /><rect x="310" y="430" width="108" height="10" rx="5" fill="#a07a4e" /><circle cx="326" cy="508" r="9" fill="#2b3350" /><circle cx="402" cy="508" r="9" fill="#2b3350" />
        <rect x="820" y="432" width="230" height="56" rx="10" fill="#6a86c6" />
      </g>
      {/* mesa do administrador */}
      <Desk x={420} y={420} w={360} id={id}>
        <Monitor x={560} y={422} s={0.8} screen="#e6f1ff"><rect x="-34" y="-48" width="50" height="4" fill="#2a5be0" /><rect x="-34" y="-38" width="64" height="4" fill="#9db6ee" /></Monitor>
        <Papers x={700} y={420} n={4} tilt={-3} />
        <g><rect x="460" y="410" width="46" height="10" rx="3" fill={luxo >= 2 ? "#f0c04a" : "#4a5070"} /><rect x="470" y="396" width="26" height="16" rx="4" fill="#2a5be0" /></g>
        {luxo >= 2 && <g><rect x="640" y="400" width="26" height="22" rx="4" fill="#f0c04a" /><circle cx="653" cy="394" r="10" fill="#f0c04a" /></g>}
      </Desk>
      <Finish id={id} />
    </>
  );
}

/* ───────────────────────── Cofre ───────────────────────── */
function Cofre(p: SceneProps) {
  const id = "cf";
  return (
    <>
      <Room id={id} c={{ wall: ["#e6efe9", "#c9dccf"], wain: "#7fa18f", floor: ["#c9cdc7", "#8e968e"] }}>
        <Sign x={60} y={56} t="Tesouraria" c="#4b6d5c" />
        <Door x={20} y={160} w={100} h={320} c="#c9a36b" />
        {/* cofre grande */}
        <g filter={`url(#${id}-shadow)`}>
          <rect x="790" y="160" width="300" height="340" rx="14" fill="#6f7b78" /><rect x="806" y="176" width="268" height="308" rx="10" fill="#8f9c98" />
          <circle cx="940" cy="330" r="86" fill="#5a6663" /><circle cx="940" cy="330" r="70" fill="#a9b6b2" /><circle cx="940" cy="330" r="22" fill="#f0c04a" />
          {Array.from({ length: 12 }, (_, i) => <line key={i} x1={940 + Math.cos(i / 12 * 6.283) * 40} y1={330 + Math.sin(i / 12 * 6.283) * 40} x2={940 + Math.cos(i / 12 * 6.283) * 64} y2={330 + Math.sin(i / 12 * 6.283) * 64} stroke="#5a6663" strokeWidth="5" strokeLinecap="round" />)}
          <rect x="1050" y="290" width="14" height="80" rx="5" fill="#5a6663" />
        </g>
        {/* chaveiro */}
        <g transform="translate(700 200)"><path d="M0,0 L0,60" stroke="#c9a36b" strokeWidth="3" /><circle cx="0" cy="64" r="14" fill="none" stroke="#f0c04a" strokeWidth="5" /><rect x="-4" y="80" width="8" height="32" fill="#f0c04a" /><rect x="4" y="100" width="12" height="6" fill="#f0c04a" /></g>
        {/* livro-caixa */}
        <g filter={`url(#${id}-shadow)`}><rect x="170" y="400" width="250" height="84" rx="8" fill="#8a5528" /><path d="M186,390 h100 q10,0 14,12 v60 h-114z" fill="#fffdf8" /><path d="M300,402 q4,-12 14,-12 h100 v72 h-114z" fill="#f7efe0" /><line x1="300" y1="402" x2="300" y2="464" stroke="#c9bb98" /></g>
        {[0, 1, 2, 3].map((i) => <g key={i}><rect x={198} y={412 + i * 12} width="90" height="3" fill="#c9bb98" /><rect x={312} y={412 + i * 12} width="80" height="3" fill="#c9bb98" /></g>)}
        {/* estantes */}
        <rect x="260" y="140" width="360" height="12" fill="#9a7a4a" /><rect x="270" y="100" width="40" height="40" fill="#d9a35b" /><rect x="320" y="110" width="60" height="30" fill="#c98b46" /><rect x="510" y="102" width="70" height="38" fill="#e0b36b" />
      </Room>
      <People loc="cofre" p={p} />
      {/* balcão do guardião */}
      <g filter={`url(#${id}-shadow)`}><rect x="430" y="440" width="270" height="62" rx="8" fill="#4b6d5c" /><rect x="430" y="440" width="270" height="12" rx="6" fill="#6f9a86" /></g>
      <Finish id={id} />
    </>
  );
}

/* ───────────────────────── Pátio ───────────────────────── */
function Patio(p: SceneProps) {
  const id = "pt"; const w = p.world;
  const pronta = w.obraConcluida;
  return (
    <>
      <defs>
        <linearGradient id="pt-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd0ff" /><stop offset="1" stopColor="#e7f6ff" /></linearGradient>
        <linearGradient id="pt-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfd3d6" /><stop offset="1" stopColor="#9da4a8" /></linearGradient>
      </defs>
      <SceneDefs id={id} />
      <rect width="1200" height="480" fill="url(#pt-sky)" />
      <circle cx="1020" cy="90" r="46" fill="#fff6c9" /><ellipse cx="1020" cy="90" rx="110" ry="80" fill="#fff6c9" opacity="0.4" filter={`url(#${id}-soft)`} />
      {[[140, 90, 1], [520, 60, 0.8], [800, 120, 1.2]].map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity="0.9"><ellipse cx="0" cy="0" rx="60" ry="20" /><ellipse cx="34" cy="-12" rx="38" ry="22" /><ellipse cx="-26" cy="-8" rx="30" ry="18" /></g>)}
      <path d="M0,330 q150,-60 300,-10 t320,-20 t300,10 t280,-30 V480 H0Z" fill="#7fc48a" opacity="0.7" />
      <rect y="470" width="1200" height="205" fill="url(#pt-ground)" />
      <rect y="470" width="1200" height="10" fill="#8a9298" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={60 + i * 200} y="600" width="90" height="10" rx="4" fill="#fff" opacity="0.65" />)}
      {/* prédio da UPA */}
      <rect x="40" y="180" width="560" height="296" rx="10" fill={pronta ? "#f4fff7" : "#e9e2d2"} /><rect x="40" y="180" width="560" height="22" fill={pronta ? "#34ad70" : "#c9bb98"} />
      {pronta ? (
        <g>{[0, 1, 2].map((i) => <rect key={i} x={80 + i * 150} y="240" width="110" height="130" rx="6" fill="#bfe3ff" />)}<rect x="60" y="400" width="520" height="12" fill="#bfe6d8" /><Sign x={200} y={210} t="Sala de Observação — ABERTA" c={PAL.green} /></g>
      ) : (
        <g>
          {[0, 1, 2].map((i) => <rect key={i} x={80 + i * 150} y="240" width="110" height="130" rx="2" fill="none" stroke="#a89f86" strokeWidth="3" strokeDasharray="10 8" />)}
          {/* andaime */}
          {[60, 200, 340, 480, 580].map((x) => <rect key={x} x={x} y="190" width="8" height="286" fill="#f2b705" />)}{[240, 330, 420].map((y) => <rect key={y} x="56" y={y} width="530" height="8" fill="#f2b705" />)}
          {[[96, 280], [250, 300], [400, 270]].map(([x, y], i) => <rect key={i} x={x} y={y} width="70" height="50" fill="#c9a36b" opacity="0.8" />)}
          <g transform="translate(120 130) rotate(-3)"><rect width="440" height="54" rx="8" fill="#e5484d" /><text x="220" y="38" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="30" fill="#fff" letterSpacing="4">INAUGURAÇÃO · SÁBADO</text></g>
        </g>
      )}
      {/* placa da obra */}
      <g><rect x="500" y="380" width="8" height="100" fill="#6b4a2a" /><rect x="470" y="270" width="110" height="130" rx="8" fill="#fff" stroke="#2a5be0" strokeWidth="5" /><rect x="482" y="284" width="86" height="12" fill="#2a5be0" /><rect x="482" y="308" width="70" height="6" fill="#9db6ee" /><rect x="482" y="322" width="76" height="6" fill="#9db6ee" /><text x="525" y="368" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="26" fill={pronta ? "#34ad70" : "#e5484d"}>{pronta ? "100%" : "62%"}</text></g>
      {/* ambulâncias */}
      <g filter={`url(#${id}-shadow)`} transform="translate(880 360) scale(0.72) translate(-880 -360)">
        <rect x="880" y="360" width="250" height="110" rx="18" fill="#fff" /><rect x="1040" y="380" width="80" height="50" rx="8" fill="#bfe3ff" /><rect x="880" y="420" width="250" height="14" fill="#e5484d" />
        <rect x="940" y="378" width="14" height="40" fill="#e5484d" /><rect x="927" y="391" width="40" height="14" fill="#e5484d" />
        <circle cx="940" cy="474" r="22" fill="#2b3350" /><circle cx="1080" cy="474" r="22" fill="#2b3350" /><circle cx="940" cy="474" r="9" fill="#c9d2dc" /><circle cx="1080" cy="474" r="9" fill="#c9d2dc" /><rect x="1002" y="350" width="40" height="12" rx="5" fill="#e5484d" />
      </g>
      {w.luxoNivel >= 2 && <g filter={`url(#${id}-shadow)`}><path d="M640,470 q10,-50 70,-52 q60,-32 130,0 q30,8 34,52Z" fill="#14161c" /><path d="M690,424 q30,-22 80,-6 l8,20 h-96z" fill="#9fd0ff" opacity="0.8" /><circle cx="690" cy="470" r="18" fill="#2b3350" /><circle cx="800" cy="470" r="18" fill="#2b3350" /></g>}
      <Door x={1050} y={150} w={130} h={330} glass />
      <Plant x={40} y={480} s={1} />
      <People loc="patio" p={p} />
      <g filter={`url(#${id}-shadow)`}><rect x="660" y="424" width="210" height="64" rx="8" fill="#8a5528" /><rect x="660" y="424" width="210" height="12" rx="6" fill="#b9773d" /><text x="765" y="466" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="18" fill="#ffe3b0" letterSpacing="3">PALANQUE</text></g>
      <Finish id={id} />
    </>
  );
}

/* ───────────────────────── Nível 2: salas da Secretaria ───────────────────────── */
const SALAS_N2: Record<string, { id: string; sign: string; signC: string; wall: [string, string]; wain: string; floor: [string, string]; extra: "mapa" | "bandeira" | "plenario" | "posto" | "gabinete" | "obra" }> = {
  secretaria: { id: "sc", sign: "Secretaria Municipal de Saúde", signC: PAL.teal, wall: ["#f4f1e6", "#e6dfc8"], wain: "#9fb7a8", floor: ["#d6c7a4", "#b9a67c"], extra: "gabinete" },
  planejamento: { id: "pl", sign: "Sala de Situação · Regulação", signC: PAL.blue, wall: ["#eaf1fb", "#d6e3f5"], wain: "#8fa9cf", floor: ["#c9d3e0", "#a5b3c7"], extra: "mapa" },
  prefeitura: { id: "pf", sign: "Gabinete da Prefeita", signC: PAL.orange, wall: ["#f9ecd6", "#eed3a6"], wain: "#8a5a2b", floor: ["#b0764a", "#7d4d2a"], extra: "bandeira" },
  camara: { id: "cm", sign: "Câmara · Comissão de Saúde", signC: "#6a4fa8", wall: ["#efe6f3", "#ddd0e8"], wain: "#6a4fa8", floor: ["#bfae9a", "#9c8a74"], extra: "plenario" },
  ubs: { id: "ub", sign: "UBS Esperança", signC: PAL.teal, wall: ["#e8f7ef", "#cfeedd"], wain: "#6fcfae", floor: ["#e0e8d6", "#c2cdb2"], extra: "posto" },
};

const EXTRA_TEMA = { gabinete: "gabinete", dados: "mapa", plenario: "plenario", hospital: "posto", obra: "obra", reuniao: "bandeira" } as const;
/** Cena genérica dos níveis 3–7: paleta e adereços vêm do tema do local. */
function configGen(loc: LocationId): (typeof SALAS_N2)[string] {
  const info = LOC_INFO[loc]; const tm = TEMAS[info?.spec.tema ?? "gabinete"];
  return { id: "gx", sign: info?.spec.nome ?? loc, signC: tm.trim, wall: tm.wall, wain: tm.wain, floor: tm.floor, extra: EXTRA_TEMA[info?.spec.tema ?? "gabinete"] };
}

function SalaN2({ loc, ...p }: SceneProps & { loc: LocationId }) {
  const S = SALAS_N2[loc] ?? configGen(loc); const id = S.id;
  const mesa = LOCATIONS[loc].hotspots.find((h) => h.kind === "mesa");
  return (
    <>
      <Room id={id} c={{ wall: S.wall, wain: S.wain, floor: S.floor }}>
        <Sign x={60} y={56} t={S.sign} c={S.signC} />
        <Window x={870} y={100} w={150} h={150} id={id} />
        <Window x={250} y={100} w={130} h={130} id={id} />
        <Door x={24} y={170} w={120} h={310} c="#7b5330" />
        {S.extra === "mapa" && (
          <g>
            <rect x="420" y="84" width="380" height="190" rx="8" fill="#fffdf8" stroke="#8fa9cf" strokeWidth="4" />
            {[[450, 120, "#e5484d"], [560, 160, "#e5484d"], [660, 120, "#f2b54f"], [740, 200, "#34ad70"], [500, 220, "#f2b54f"]].map(([x, y, c], i) => <g key={i}><circle cx={x as number} cy={y as number} r="16" fill={c as string} opacity="0.85" /><circle cx={x as number} cy={y as number} r="6" fill="#fff" /></g>)}
            <path d="M440,250 L520,170 L600,210 L690,140 L780,230" stroke="#2a5be0" strokeWidth="4" fill="none" />
          </g>
        )}
        {S.extra === "bandeira" && (
          <g>
            <rect x="460" y="80" width="12" height="190" fill="#c9a24a" />
            <rect x="472" y="88" width="190" height="120" fill="#2e9a5f" /><path d="M567,100 L650,148 L567,196 L484,148Z" fill="#f2c94c" /><circle cx="567" cy="148" r="30" fill="#2a5be0" />
            <rect x="700" y="100" width="130" height="150" rx="6" fill="#fff" stroke="#d9c9a6" strokeWidth="3" /><rect x="716" y="122" width="98" height="8" fill="#2a5be0" /><rect x="716" y="144" width="98" height="5" fill="#c9bb98" /><rect x="716" y="158" width="80" height="5" fill="#c9bb98" />
          </g>
        )}
        {S.extra === "plenario" && (
          <g>
            <rect x="420" y="84" width="380" height="150" rx="10" fill="#6a4fa8" opacity="0.9" /><text x="610" y="148" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="34" fill="#fff" letterSpacing="5">CÂMARA MUNICIPAL</text><text x="610" y="190" textAnchor="middle" fontFamily="var(--g-display)" fontSize="18" fill="#e4d8f6" letterSpacing="3">COMISSÃO DE SAÚDE</text>
            {[100, 220, 340].map((x) => <rect key={x} x={x} y="410" width="90" height="56" rx="8" fill="#8a6a4a" />)}
          </g>
        )}
        {S.extra === "posto" && (
          <g>
            <rect x="420" y="90" width="300" height="170" rx="8" fill="#fff" stroke="#6fcfae" strokeWidth="4" /><text x="570" y="140" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="26" fill="#2e8a7a">Agenda do dia</text>
            {[170, 196, 222].map((y) => <rect key={y} x="446" y={y} width="250" height="8" fill="#b9e0d0" />)}
            <rect x="760" y="110" width="40" height="150" rx="6" fill="#fff" stroke="#6fcfae" strokeWidth="3" /><rect x="773" y="130" width="14" height="40" fill="#e5484d" /><rect x="760" y="144" width="40" height="12" fill="#e5484d" opacity="0.0" />
          </g>
        )}
        {S.extra === "obra" && (
          <g>
            {[440, 560, 680, 800].map((x) => <rect key={x} x={x} y="90" width="8" height="190" fill="#8f969b" />)}<rect x="440" y="150" width="376" height="10" fill="#c9a066" /><rect x="440" y="230" width="376" height="10" fill="#c9a066" />
            <rect x="470" y="104" width="120" height="44" fill="#d9822b" /><text x="530" y="134" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="22" fill="#fff">OBRA</text>
            {[100, 200].map((x) => <rect key={x} x={x} y="420" width="70" height="50" fill="#c9a36b" />)}
          </g>
        )}
        {S.extra === "gabinete" && (
          <g>
            <rect x="420" y="90" width="260" height="170" rx="8" fill="#fffdf8" stroke="#d9c9a6" strokeWidth="3" /><rect x="444" y="112" width="120" height="8" fill="#2a5be0" />{[136, 154, 172, 190].map((y) => <rect key={y} x="444" y={y} width="200" height="5" fill="#c9bb98" />)}
            <rect x="720" y="110" width="80" height="150" rx="6" fill="#9aa7b8" />
          </g>
        )}
        <Plant x={300} y={480} s={1.1} />
        <Chair x={210} y={470} c={PAL.blue} s={0.95} />
      </Room>
      <People loc={loc} p={p} />
      {mesa && (
        <Desk x={mesa.x} y={mesa.y + 20} w={mesa.w} id={id}>
          <Monitor x={mesa.x + mesa.w * 0.35} y={mesa.y + 22} s={0.8} screen="#e6f1ff" />
          <Papers x={mesa.x + mesa.w * 0.7} y={mesa.y + 20} n={4} tilt={-3} />
        </Desk>
      )}
      <Finish id={id} />
    </>
  );
}
const salaN2 = (loc: LocationId) => (p: SceneProps) => <SalaN2 loc={loc} {...p} />;

const SCENES = {
  recepcao: Recepcao, farmacia: Farmacia, enfermagem: Enfermagem, administracao: Administracao, cofre: Cofre, patio: Patio,
  secretaria: salaN2("secretaria"), planejamento: salaN2("planejamento"), prefeitura: salaN2("prefeitura"), camara: salaN2("camara"), ubs: salaN2("ubs"),
} as Partial<Record<LocationId, (p: SceneProps) => ReactNode>>;

/** Cena completa de um local: SVG ilustrado em 3 camadas (paralaxe controlada por --px/--py do contêiner). */
export function LocationScene({ location, ...p }: SceneProps & { location: LocationId }) {
  const Comp = SCENES[location] ?? salaN2(location);
  return (
    <svg viewBox="0 0 1200 675" className="h-full w-full" role="img" aria-label={`Cenário: ${LOCATIONS[location].nome}`} preserveAspectRatio="xMidYMid slice">
      <SceneDefs id={({ recepcao: "rc", farmacia: "fa", enfermagem: "en", administracao: "ad", cofre: "cf", patio: "pt", secretaria: "sc", planejamento: "pl", prefeitura: "pf", camara: "cm", ubs: "ub" } as Partial<Record<LocationId, string>>)[location] ?? "gx"} />
      <g style={{ transform: "translate(calc(var(--px, 0) * -8px), calc(var(--py, 0) * -4px)) scale(1.02)", transformOrigin: "600px 340px", transition: "transform .2s ease-out" }}>
        <Comp {...p} />
      </g>
    </svg>
  );
}

export { K as hotspotOf };
export { Banner };
