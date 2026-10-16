"use client";
import { useId } from "react";
import type { Look } from "@/game/content/types";
import type { Emotion } from "@/game/engine/types";
import { darken, lighten, lipColor, mix } from "./color";

import { EXPR } from "./expr";

export interface PortraitProps {
  look: Look;
  emocao?: Emotion;
  falando?: boolean;
  /** "busto" mostra ombros; "rosto" enquadra só a cabeça (avatares redondos) */
  enquadramento?: "busto" | "rosto";
  className?: string;
  title?: string;
  /** olhar (-1..1) */
  olhar?: number;
  semFundo?: boolean;
  x?: number; y?: number; width?: number | string; height?: number | string;
}

export function Portrait({ look, emocao = "neutro", falando = false, enquadramento = "busto", className, title, olhar = 0, x, y, width, height }: PortraitProps) {
  const uid = useId().replace(/:/g, "");
  const e = EXPR[emocao];
  const skin = look.pele, shade = look.peleSombra;
  const lip = lipColor(skin);
  const hair = look.cabelo;
  const hairShade = darken(hair, 0.35);
  const hairLight = lighten(hair, 0.28);
  const age = Math.max(0, Math.min(1, (look.idade - 35) / 35));
  const ry = 46 * look.rosto;
  const headTop = 100 - ry, headBot = 100 + ry + 8;
  const vb = enquadramento === "rosto" ? "34 28 132 140" : "0 0 200 250";
  const eyeY = 98;
  const gaze = olhar * 2;

  // cabeça: ovo com queixo suave; escala vertical pelo fator de identidade
  const head = `M100,${headTop} C130,${headTop} 143,${100 - ry * 0.55} 142,100 C141,${100 + ry * 0.62} 126,${headBot - 2} 100,${headBot} C74,${headBot - 2} 59,${100 + ry * 0.62} 58,100 C57,${100 - ry * 0.55} 70,${headTop} 100,${headTop}Z`;

  const mouthY = 100 + ry * 0.72;
  const w = 13 + e.smile * 4;
  const mouthCurve = e.smile * 7;
  const openAmt = e.open * 9;
  const smirkL = e.smirk ? -3 : 0, smirkR = e.smirk ? 3.5 : 0;

  return (
    <svg x={x} y={y} width={width} height={height} viewBox={vb} className={className} role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true} focusable="false" preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id={`${uid}-skin`} cx="38%" cy="30%" r="78%">
          <stop offset="0" stopColor={lighten(skin, 0.18)} />
          <stop offset="0.55" stopColor={skin} />
          <stop offset="1" stopColor={shade} />
        </radialGradient>
        <linearGradient id={`${uid}-neck`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={darken(shade, 0.18)} />
          <stop offset="0.5" stopColor={shade} />
          <stop offset="1" stopColor={skin} />
        </linearGradient>
        <linearGradient id={`${uid}-hair`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hairLight} />
          <stop offset="0.45" stopColor={hair} />
          <stop offset="1" stopColor={hairShade} />
        </linearGradient>
        <linearGradient id={`${uid}-cloth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(look.roupa, 0.14)} />
          <stop offset="1" stopColor={darken(look.roupa, 0.22)} />
        </linearGradient>
        <linearGradient id={`${uid}-cloth2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.roupa2} />
          <stop offset="1" stopColor={darken(look.roupa2, 0.14)} />
        </linearGradient>
        <radialGradient id={`${uid}-iris`} cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor={lighten(look.olhos, 0.35)} />
          <stop offset="1" stopColor={darken(look.olhos, 0.3)} />
        </radialGradient>
        <clipPath id={`${uid}-headclip`}><path d={head} /></clipPath>
      </defs>

      {/* cabelo de trás */}
      <HairBack estilo={look.cabeloEstilo} fill={`url(#${uid}-hair)`} dark={hairShade} ry={ry} />

      {/* corpo */}
      <Body look={look} uid={uid} />

      {/* pescoço */}
      <path d="M85,138 L85,176 C92,186 108,186 115,176 L115,138Z" fill={`url(#${uid}-neck)`} />
      <path d="M85,150 C93,160 107,160 115,150 L115,142 C107,152 93,152 85,142Z" fill={darken(shade, 0.25)} opacity="0.35" />

      {/* orelhas */}
      <ellipse cx="58.5" cy="104" rx="6.5" ry="11" fill={skin} /><ellipse cx="58.5" cy="104" rx="3" ry="7" fill={shade} opacity="0.55" />
      <ellipse cx="141.5" cy="104" rx="6.5" ry="11" fill={skin} /><ellipse cx="141.5" cy="104" rx="3" ry="7" fill={shade} opacity="0.55" />

      {/* cabeça */}
      <path d={head} fill={`url(#${uid}-skin)`} />
      <g clipPath={`url(#${uid}-headclip)`}>
        <path d={`M58,${100 + ry * 0.2} C62,${100 + ry * 0.9} 90,${headBot + 6} 100,${headBot + 6} L58,${headBot + 6}Z`} fill={shade} opacity="0.22" />
        <ellipse cx="100" cy={headBot - 2} rx="30" ry="9" fill={shade} opacity="0.2" />
        {/* bochechas */}
        {e.blush > 0 && (<><ellipse cx="73" cy="116" rx="9" ry="6" fill="#e8776b" opacity={0.28 * e.blush * 2} /><ellipse cx="127" cy="116" rx="9" ry="6" fill="#e8776b" opacity={0.28 * e.blush * 2} /></>)}
        {/* rugas leves com a idade */}
        {age > 0.25 && (
          <g stroke={darken(shade, 0.25)} strokeWidth="1" fill="none" opacity={0.25 + age * 0.3} strokeLinecap="round">
            <path d={`M82,${eyeY - 14} q18,-4 36,0`} /><path d={`M80,${eyeY - 8} q20,-3 40,0`} />
            <path d={`M70,${mouthY - 10} q-4,8 -1,16`} /><path d={`M130,${mouthY - 10} q4,8 1,16`} />
            {age > 0.6 && <path d={`M62,${eyeY + 4} q-3,4 -2,9M138,${eyeY + 4} q3,4 2,9`} />}
          </g>
        )}
      </g>

      {/* olhos */}
      <Eye cx={84} cy={eyeY} open={e.eye} iris={`url(#${uid}-iris)`} gaze={gaze} skin={skin} shade={shade} falando={falando} />
      <Eye cx={116} cy={eyeY} open={e.eye} iris={`url(#${uid}-iris)`} gaze={gaze} skin={skin} shade={shade} falando={falando} />

      {/* sobrancelhas */}
      <Brows hair={mix(hair, "#1a1410", 0.25)} brow={e.brow} inner={e.browInner} age={age} y={eyeY - 12} />

      {/* nariz */}
      <path d={`M100,${eyeY + 2} C98,${eyeY + 14} 96,${eyeY + 18} 94,${eyeY + 22} C97,${eyeY + 26} 103,${eyeY + 26} 106,${eyeY + 22} C104,${eyeY + 18} 102,${eyeY + 14} 100,${eyeY + 2}Z`} fill={shade} opacity="0.2" />
      <path d={`M94.5,${eyeY + 22.5} q5.5,4 11,0`} stroke={darken(shade, 0.35)} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d={`M98,${eyeY + 6} q-1,8 0,12`} stroke={lighten(skin, 0.3)} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.5" />

      {/* boca */}
      <g>
        <ellipse cx="100" cy={mouthY + 7} rx="14" ry="4.5" fill={shade} opacity="0.18" />
        {e.open > 0.02 || falando ? (
          <g>
            <path className={falando ? "g-talk" : undefined} style={{ transformOrigin: `100px ${mouthY}px`, transformBox: "view-box" }} d={`M${100 - w},${mouthY + smirkL} Q100,${mouthY + mouthCurve + 1} ${100 + w},${mouthY + smirkR} Q100,${mouthY + mouthCurve + 6 + openAmt + (falando ? 3 : 0)} ${100 - w},${mouthY + smirkL}Z`} fill="#4a1a22" />
            {(e.smile > 0.5 || e.open > 0.3) && <path d={`M${100 - w + 2},${mouthY + 0.8} Q100,${mouthY + mouthCurve + 1.8} ${100 + w - 2},${mouthY + 0.8} L${100 + w - 3},${mouthY + 3} Q100,${mouthY + mouthCurve + 4.5} ${100 - w + 3},${mouthY + 3}Z`} fill="#fbf6ee" />}
            <path d={`M${100 - w},${mouthY + smirkL} Q100,${mouthY + mouthCurve - 2} ${100 + w},${mouthY + smirkR}`} stroke={lip} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d={`M${100 - w + 1},${mouthY + smirkL + 1} Q100,${mouthY + mouthCurve + 6 + openAmt} ${100 + w - 1},${mouthY + smirkR + 1}`} stroke={lip} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <path d={`M${100 - w},${mouthY + smirkL} Q100,${mouthY + mouthCurve + 2} ${100 + w},${mouthY + smirkR}`} stroke={lip} strokeWidth="3.2" fill="none" strokeLinecap="round" />
            <path d={`M${100 - w + 3},${mouthY + smirkL + 2} Q100,${mouthY + mouthCurve + 6} ${100 + w - 3},${mouthY + smirkR + 2}`} stroke={lip} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.75" />
          </g>
        )}
        {e.smile > 0.4 && <><path d={`M${100 - w - 3},${mouthY - 1} q-1.5,2 0,4`} stroke={darken(shade, 0.3)} strokeWidth="1" fill="none" opacity="0.5" /><path d={`M${100 + w + 3},${mouthY - 1} q1.5,2 0,4`} stroke={darken(shade, 0.3)} strokeWidth="1" fill="none" opacity="0.5" /></>}
      </g>

      <FacialHair look={look} mouthY={mouthY} ry={ry} fill={`url(#${uid}-hair)`} />

      {/* cabelo da frente */}
      <HairFront estilo={look.cabeloEstilo} fill={`url(#${uid}-hair)`} shine={hairLight} top={headTop} ry={ry} />

      {/* óculos */}
      <Glasses tipo={look.oculos} y={eyeY} />
    </svg>
  );
}

function Eye({ cx, cy, open, iris, gaze, skin, shade, falando }: { cx: number; cy: number; open: number; iris: string; gaze: number; skin: string; shade: string; falando: boolean }) {
  const h = 6.2 * open;
  return (
    <g className="g-eye" style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: "view-box" }}>
      <path d={`M${cx - 10.5},${cy + 0.5} Q${cx},${cy - h - 1.5} ${cx + 10.5},${cy + 0.5} Q${cx},${cy + h * 0.78 + 2} ${cx - 10.5},${cy + 0.5}Z`} fill="#fdfaf5" stroke={darken(shade, 0.2)} strokeWidth="0.6" />
      <g clipPath={undefined}>
        <circle cx={cx + gaze} cy={cy + 0.4} r={Math.min(4.9, 3.1 + h * 0.28)} fill={iris} />
        <circle cx={cx + gaze} cy={cy + 0.4} r="2.1" fill="#120c08" />
        <circle cx={cx + gaze - 1.6} cy={cy - 1.4} r="1.1" fill="#fff" opacity="0.95" />
        <circle cx={cx + gaze + 1.4} cy={cy + 1.6} r="0.55" fill="#fff" opacity="0.55" />
      </g>
      {/* pálpebra superior sombreada sobre o olho */}
      <path d={`M${cx - 11},${cy + 0.8} Q${cx},${cy - h - 3} ${cx + 11},${cy + 0.8} Q${cx},${cy - h + 0.4} ${cx - 11},${cy + 0.8}Z`} fill={darken(shade, 0.45)} opacity="0.9" />
      <path d={`M${cx - 10},${cy + 4.2} Q${cx},${cy + h * 0.78 + 3.4} ${cx + 10},${cy + 4.2}`} stroke={darken(shade, 0.15)} strokeWidth="0.8" fill="none" opacity="0.5" />
      <path d={`M${cx - 10},${cy - h - 3.4} Q${cx},${cy - h - 6.6} ${cx + 10},${cy - h - 3.4}`} stroke={lighten(skin, 0.1)} strokeWidth="1" fill="none" opacity="0.0" />
      {falando && null}
    </g>
  );
}

function Brows({ hair, brow, inner, age, y }: { hair: string; brow: number; inner: number; age: number; y: number }) {
  const t = 2.8 + age * 0.9;
  const mk = (cx: number, side: -1 | 1) => {
    const x1 = cx - 11 * side * -1; // lado de fora
    const inx = cx + 11 * side * -1 * -1;
    void x1; void inx;
    const outerX = cx + side * 12, innerX = cx - side * 12;
    const outerY = y - brow * 0.9, innerY = y - brow - inner * 0.55;
    const midY = Math.min(outerY, innerY) - 3.2 + (inner > 2 ? 1.5 : 0);
    return `M${innerX},${innerY + t * 0.4} Q${cx},${midY} ${outerX},${outerY + 1.6} Q${cx},${midY + t} ${innerX},${innerY + t}Z`;
  };
  return (<g fill={hair} opacity="0.95"><path d={mk(84, -1)} /><path d={mk(116, 1)} /></g>);
}

function Glasses({ tipo, y }: { tipo?: Look["oculos"]; y: number }) {
  if (!tipo) return null;
  if (tipo === "escuro") return (<g><rect x="68" y={y - 8} width="28" height="17" rx="6" fill="#14161c" opacity="0.92" /><rect x="104" y={y - 8} width="28" height="17" rx="6" fill="#14161c" opacity="0.92" /><path d={`M96,${y - 2} h8`} stroke="#14161c" strokeWidth="2.4" /></g>);
  const stroke = "#3a2a1c";
  if (tipo === "redondo") return (<g fill="rgba(255,255,255,0.08)" stroke={stroke} strokeWidth="2"><circle cx="84" cy={y} r="13.5" /><circle cx="116" cy={y} r="13.5" /><path d={`M97.5,${y - 1} q2.5,-3 5,0`} fill="none" /><path d={`M70.5,${y - 2} L60,${y - 4}M129.5,${y - 2} L140,${y - 4}`} fill="none" /><path d={`M74,${y - 8} a11,11 0 0 1 8,-3`} stroke="rgba(255,255,255,0.7)" fill="none" strokeWidth="1.6" /></g>);
  if (tipo === "meia-lua") return (<g fill="rgba(255,255,255,0.1)" stroke={stroke} strokeWidth="1.8"><path d={`M70,${y - 7} h28 q-1,16 -14,16 q-13,0 -14,-16Z`} /><path d={`M102,${y - 7} h28 q-1,16 -14,16 q-13,0 -14,-16Z`} /><path d={`M98,${y - 6} h4`} fill="none" /><path d={`M70,${y - 6} L60,${y - 8}M130,${y - 6} L140,${y - 8}`} fill="none" /></g>);
  return (<g fill="rgba(255,255,255,0.08)" stroke={stroke} strokeWidth="2.2"><rect x="69" y={y - 9} width="29" height="19" rx="4" /><rect x="102" y={y - 9} width="29" height="19" rx="4" /><path d={`M98,${y - 3} h4`} fill="none" /></g>);
}

function FacialHair({ look, mouthY, ry, fill }: { look: Look; mouthY: number; ry: number; fill: string }) {
  if (!look.barba) return null;
  if (look.barba === "bigode") return (<path d={`M${100 - 17},${mouthY - 5} C${100 - 12},${mouthY - 13} ${100 - 3},${mouthY - 9} 100,${mouthY - 7} C${100 + 3},${mouthY - 9} ${100 + 12},${mouthY - 13} ${100 + 17},${mouthY - 5} C${100 + 10},${mouthY - 2} ${100 + 4},${mouthY - 4} 100,${mouthY - 3.5} C${100 - 4},${mouthY - 4} ${100 - 10},${mouthY - 2} ${100 - 17},${mouthY - 5}Z`} fill={fill} />);
  if (look.barba === "cavanhaque") return (<g fill={fill}><path d={`M${100 - 6},${mouthY + 9} Q100,${mouthY + 5} ${100 + 6},${mouthY + 9} Q${100 + 5},${mouthY + 21} 100,${mouthY + 24} Q${100 - 5},${mouthY + 21} ${100 - 6},${mouthY + 9}Z`} /></g>);
  const bot = 100 + ry + 6;
  return (<g fill={fill} opacity="0.96"><path d={`M59,104 C60,${mouthY - 4} 66,${mouthY + 2} 74,${mouthY - 2} C82,${mouthY - 12} 92,${mouthY - 10} 100,${mouthY - 8} C108,${mouthY - 10} 118,${mouthY - 12} 126,${mouthY - 2} C134,${mouthY + 2} 140,${mouthY - 4} 141,104 C141,${bot - 4} 124,${bot + 8} 100,${bot + 8} C76,${bot + 8} 59,${bot - 4} 59,104Z M86,${mouthY + 3} Q100,${mouthY - 3} 114,${mouthY + 3} Q100,${mouthY + 12} 86,${mouthY + 3}Z`} fillRule="evenodd" /></g>);
}

function HairBack({ estilo, fill, dark, ry }: { estilo: Look["cabeloEstilo"]; fill: string; dark: string; ry: number }) {
  const top = 100 - ry;
  switch (estilo) {
    case "coque": return (<g><circle cx="100" cy={top - 7} r="17" fill={fill} /><circle cx="100" cy={top - 7} r="17" fill="none" stroke={dark} strokeWidth="1.4" opacity="0.4" /><path d={`M60,100 C58,${top - 2} 80,${top - 12} 100,${top - 12} C120,${top - 12} 142,${top - 2} 140,100 L140,120 L60,120Z`} fill={fill} /></g>);
    case "cacheado": return (<g fill={fill}>{[[62, 86, 17], [76, top - 2, 19], [100, top - 8, 21], [124, top - 2, 19], [138, 86, 17], [57, 106, 14], [143, 106, 14], [64, 124, 11], [136, 124, 11]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>);
    case "bob": return (<path d={`M52,112 C46,${top + 6} 66,${top - 8} 100,${top - 8} C134,${top - 8} 154,${top + 6} 148,112 L150,150 C140,158 132,150 134,128 L66,128 C68,150 60,158 50,150Z`} fill={fill} />);
    case "liso": return (<path d={`M54,110 C48,${top + 4} 66,${top - 8} 100,${top - 8} C134,${top - 8} 152,${top + 4} 146,110 L150,168 C138,174 134,160 136,134 L64,134 C66,160 62,174 50,168Z`} fill={fill} />);
    case "branco": case "ralo": case "curto": case "penteado": case "topete": return (<path d={`M58,104 C54,${top + 6} 72,${top - 6} 100,${top - 6} C128,${top - 6} 146,${top + 6} 142,104 C142,92 138,86 134,84 L66,84 C62,86 58,92 58,104Z`} fill={fill} />);
    default: return null;
  }
}

function HairFront({ estilo, fill, shine, top, ry }: { estilo: Look["cabeloEstilo"]; fill: string; shine: string; top: number; ry: number }) {
  void ry;
  switch (estilo) {
    case "curto": return (<g><path d={`M59,96 C54,${top + 2} 74,${top - 8} 100,${top - 8} C126,${top - 8} 146,${top + 2} 141,96 C139,82 134,74 128,70 C116,76 100,70 84,74 C72,72 66,82 59,96Z`} fill={fill} /><path d={`M76,${top + 2} C90,${top - 3} 112,${top - 3} 128,${top + 4}`} stroke={shine} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" /></g>);
    case "penteado": return (<g><path d={`M58,98 C52,${top} 74,${top - 12} 102,${top - 11} C130,${top - 11} 148,${top} 142,98 C142,86 136,76 126,70 C112,72 92,64 72,72 C64,78 60,88 58,98Z`} fill={fill} /><path d={`M72,${top + 2} C92,${top - 8} 118,${top - 8} 134,${top + 2}`} stroke={shine} strokeWidth="2.2" fill="none" opacity="0.5" strokeLinecap="round" /><path d={`M86,66 C98,62 112,64 124,70`} stroke={shine} strokeWidth="1.6" fill="none" opacity="0.35" /></g>);
    case "topete": return (<g><path d={`M60,98 C52,${top} 70,${top - 14} 94,${top - 18} C122,${top - 24} 148,${top - 6} 141,98 C139,84 134,76 124,70 C112,72 88,60 72,70 C64,76 62,88 60,98Z`} fill={fill} /><path d={`M76,${top - 4} C92,${top - 16} 116,${top - 18} 132,${top - 6}`} stroke={shine} strokeWidth="2.4" fill="none" opacity="0.55" strokeLinecap="round" /></g>);
    case "ralo": return (<g><path d={`M64,90 C62,72 74,${top + 2} 90,${top - 2} C80,${top + 6} 74,${top + 18} 68,96Z`} fill={fill} opacity="0.9" /><path d={`M136,90 C138,72 126,${top + 2} 110,${top - 2} C120,${top + 6} 126,${top + 18} 132,96Z`} fill={fill} opacity="0.9" /><path d={`M82,${top + 2} C94,${top - 4} 108,${top - 4} 118,${top + 2}`} stroke={fill} strokeWidth="1.6" fill="none" opacity="0.55" /></g>);
    case "branco": return (<g><path d={`M58,98 C52,${top + 2} 74,${top - 10} 100,${top - 10} C126,${top - 10} 148,${top + 2} 142,98 C140,84 136,74 128,68 C112,76 92,70 74,74 C64,78 60,88 58,98Z`} fill={fill} /><path d={`M74,${top + 2} C90,${top - 5} 112,${top - 5} 128,${top + 3}`} stroke="#fff" strokeWidth="2.2" fill="none" opacity="0.6" strokeLinecap="round" /></g>);
    case "coque": case "liso": case "bob": return (<g><path d={`M60,98 C56,${top + 4} 76,${top - 6} 100,${top - 6} C124,${top - 6} 144,${top + 4} 140,98 C136,78 126,68 114,66 C108,80 92,84 78,78 C68,82 62,88 60,98Z`} fill={fill} /><path d={`M78,${top + 6} C92,${top - 3} 112,${top - 3} 126,${top + 6}`} stroke={shine} strokeWidth="2" fill="none" opacity="0.45" strokeLinecap="round" /></g>);
    case "cacheado": return (<g fill={fill}>{[[74, top + 6, 11], [88, top + 1, 12], [104, top - 1, 12], [120, top + 2, 12], [132, top + 8, 10], [66, top + 16, 9], [140, top + 16, 9]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}<path d={`M82,${top + 6} C96,${top - 2} 114,${top - 2} 128,${top + 6}`} stroke={shine} strokeWidth="2" fill="none" opacity="0.35" /></g>);
    default: return null;
  }
}

function Body({ look, uid }: { look: Look; uid: string }) {
  const shoulder = `M6,250 C8,206 44,188 86,180 L114,180 C156,188 192,206 194,250Z`;
  const cloth = `url(#${uid}-cloth)`, cloth2 = `url(#${uid}-cloth2)`;
  const dk = darken(look.roupa, 0.35);
  switch (look.roupaTipo) {
    case "jaleco": return (
      <g>
        <path d={shoulder} fill={cloth} />
        <path d="M80,180 L100,214 L120,180 C112,190 88,190 80,180Z" fill={look.roupa2} />
        <path d="M80,180 L100,212 L96,184Z" fill={darken(look.roupa2, 0.12)} opacity="0.5" />
        <rect x="132" y="206" width="26" height="14" rx="3" fill="#fff" opacity="0.92" /><rect x="136" y="210" width="12" height="2.4" rx="1" fill={dk} /><rect x="136" y="214" width="17" height="2" rx="1" fill={dk} opacity="0.6" />
        <path d="M46,218 C60,206 74,200 86,198" stroke={darken(look.roupa, 0.3)} strokeWidth="2" fill="none" opacity="0.35" />
        <path d="M100,214 Q100,230 100,250" stroke={darken(look.roupa, 0.3)} strokeWidth="1.4" opacity="0.3" />
      </g>);
    case "blusa": return (
      <g>
        <path d={shoulder} fill={cloth} />
        <path d="M78,180 C86,200 114,200 122,180 C112,188 88,188 78,180Z" fill={look.roupa2} />
        {[[40, 222], [64, 236], [150, 224], [170, 238], [96, 240], [126, 232], [24, 242], [182, 246]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.4" fill={look.roupa2} opacity="0.55" />)}
      </g>);
    case "terno": return (
      <g>
        <path d={shoulder} fill={cloth} />
        <path d="M86,180 L100,226 L114,180 L100,188Z" fill="#f4f6fb" />
        <path d="M96,190 L104,190 L106,236 L100,244 L94,236Z" fill="#c4262e" /><path d="M95,190 h10 l-2,7 h-6z" fill="#8f1b21" />
        <path d="M86,180 L68,206 L88,250 L98,226Z" fill={darken(look.roupa, 0.15)} /><path d="M114,180 L132,206 L112,250 L102,226Z" fill={darken(look.roupa, 0.15)} />
        <circle cx="146" cy="214" r="3" fill="#f5c542" />
      </g>);
    case "camisa": return (
      <g>
        <path d={shoulder} fill={cloth} />
        <path d="M82,180 L100,206 L118,180 L110,176 L100,190 L90,176Z" fill={darken(look.roupa, 0.12)} />
        <path d="M100,206 L100,250" stroke={darken(look.roupa, 0.25)} strokeWidth="1.4" opacity="0.5" />
        {[218, 234].map((y) => <circle key={y} cx="100" cy={y} r="1.8" fill={look.roupa2} opacity="0.9" />)}
        <path d="M82,180 L90,176 L100,190 L88,200Z" fill={look.roupa2} opacity="0.35" />
      </g>);
    case "bomber": return (
      <g>
        <path d={shoulder} fill={cloth} />
        <path d="M78,178 C84,196 116,196 122,178 L118,172 C112,184 88,184 82,172Z" fill={darken(look.roupa, 0.38)} />
        <path d="M100,190 L100,250" stroke="#f0d78c" strokeWidth="2.2" /><path d="M100,196 l-3,6 h6z" fill="#f0d78c" />
        <path d="M30,250 C34,226 52,212 70,206" stroke={darken(look.roupa, 0.35)} strokeWidth="3" fill="none" opacity="0.4" />
        <rect x="18" y="238" width="18" height="12" rx="2" fill={darken(look.roupa, 0.35)} opacity="0.55" />
      </g>);
    case "blazer": return (
      <g>
        <path d={shoulder} fill={cloth} />
        <path d="M84,180 C90,206 110,206 116,180 L100,196Z" fill={look.roupa2} />
        <path d="M84,180 L66,214 L86,250 L98,214Z" fill={darken(look.roupa, 0.18)} /><path d="M116,180 L134,214 L114,250 L102,214Z" fill={darken(look.roupa, 0.18)} />
        <circle cx="144" cy="214" r="2.6" fill="#d9b44a" />
      </g>);
    case "suéter": return (
      <g>
        <path d={shoulder} fill={cloth} />
        <path d="M78,178 C84,200 116,200 122,178 L116,172 C108,184 92,184 84,172Z" fill={darken(look.roupa, 0.2)} />
        {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${24 + i * 19},250 L${30 + i * 19},208`} stroke={darken(look.roupa, 0.25)} strokeWidth="1.6" opacity="0.28" />)}
        <path d="M84,172 L100,190 L116,172" fill="none" stroke={look.roupa2} strokeWidth="5" opacity="0.9" strokeLinejoin="round" />
      </g>);
    case "colete": return (
      <g>
        <path d={shoulder} fill={look.roupa2} />
        <path d="M82,180 L100,204 L118,180 L112,176 L100,190 L88,176Z" fill="#fff" />
        <path d="M60,250 C62,214 76,194 86,180 L100,236 L114,180 C124,194 138,214 140,250Z" fill={cloth} />
        <path d="M100,236 L100,250" stroke={darken(look.roupa, 0.3)} strokeWidth="1.6" />
        {[218, 232].map((y) => <circle key={y} cx="100" cy={y} r="1.8" fill="#d9c27a" />)}
        <path d="M94,190 h12 l-2,8 h-8z" fill="#7a2e2e" /><rect x="97" y="196" width="6" height="30" rx="2" fill="#8a3434" />
        <path d="M128,226 q10,6 14,18" stroke="#d6b45a" strokeWidth="2" fill="none" />
        <circle cx="142" cy="246" r="5" fill="none" stroke="#d6b45a" strokeWidth="2" />
      </g>);
  }
}
