import type { ReactNode } from "react";
import type { Look } from "@/game/content/types";
import type { Emotion } from "@/game/engine/types";
import { Portrait } from "./Portrait";
import { darken, lighten } from "./color";

/** Peças de cenário reutilizáveis (SVG). Todas desenhadas para o viewBox 1200×675. */

export const PAL = {
  cream: "#fff3dc", sand: "#f6dcae", wood: "#b9773d", woodD: "#8a5528", teal: "#17a493", tealD: "#0c6f64", blue: "#2a5be0", blueD: "#16348f",
  orange: "#ff8a2a", yellow: "#ffcf44", red: "#e5484d", green: "#34ad70", ink: "#1b2340", white: "#fffdf8", steel: "#c9d2dc",
};

export function SceneDefs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer><feFuncA type="linear" slope="0.07" /></feComponentTransfer>
      </filter>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1b2340" floodOpacity="0.22" /></filter>
      <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14" /></filter>
      <filter id={`${id}-blur`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.5" /></filter>
      <linearGradient id={`${id}-light`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6d6" stopOpacity="0.85" /><stop offset="1" stopColor="#fff6d6" stopOpacity="0" /></linearGradient>
      <radialGradient id={`${id}-vig`} cx="50%" cy="48%" r="75%"><stop offset="0.6" stopColor="#1b2340" stopOpacity="0" /><stop offset="1" stopColor="#1b2340" stopOpacity="0.22" /></radialGradient>
    </defs>
  );
}

export interface RoomColors { wall: [string, string]; wain: string; floor: [string, string]; trim?: string }

/** Sala base: parede, rodapé, piso em perspectiva, teto com luminárias, luz e granulado. */
export function Room({ id, c, children, lights = true }: { id: string; c: RoomColors; children?: ReactNode; lights?: boolean }) {
  const trim = c.trim ?? lighten(c.wain, 0.35);
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.wall[0]} /><stop offset="1" stopColor={c.wall[1]} /></linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.floor[0]} /><stop offset="1" stopColor={c.floor[1]} /></linearGradient>
      </defs>
      <rect width="1200" height="480" fill={`url(#${id}-wall)`} />
      <rect y="330" width="1200" height="150" fill={c.wain} />
      <rect y="326" width="1200" height="8" fill={trim} />
      <rect y="470" width="1200" height="14" fill={darken(c.wain, 0.2)} />
      <rect y="40" width="1200" height="3" fill={lighten(c.wall[0], 0.3)} opacity="0.7" />
      <polygon points="0,480 1200,480 1200,675 0,675" fill={`url(#${id}-floor)`} />
      {Array.from({ length: 9 }, (_, i) => {
        const x = -1200 + i * 300;
        return <line key={i} x1={600 + (x - 600) * 0.3} y1="480" x2={x} y2="675" stroke={darken(c.floor[0], 0.18)} strokeWidth="2" opacity="0.4" />;
      })}
      {[500, 530, 575, 635].map((y) => <line key={y} x1="0" y1={y} x2="1200" y2={y} stroke={darken(c.floor[0], 0.18)} strokeWidth="1.5" opacity="0.35" />)}
      {lights && [180, 600, 1020].map((x) => (<g key={x}><rect x={x - 70} y="0" width="140" height="22" rx="6" fill="#fffbe9" /><ellipse cx={x} cy="40" rx="130" ry="50" fill="#fff6d6" opacity="0.28" filter={`url(#${id}-soft)`} /></g>))}
      {children}
    </g>
  );
}

export function Finish({ id }: { id: string }) {
  return (<g pointerEvents="none"><rect width="1200" height="675" fill={`url(#${id}-vig)`} /><rect width="1200" height="675" filter={`url(#${id}-grain)`} /></g>);
}

/* ───────── móveis e objetos ───────── */

export function Window({ x, y, w, h, id, sun = true }: { x: number; y: number; w: number; h: number; id: string; sun?: boolean }) {
  return (
    <g>
      <rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} rx="8" fill="#f6efe0" stroke="#d9c9a6" strokeWidth="2" />
      <rect x={x} y={y} width={w} height={h} rx="4" fill="#bfe3ff" />
      <rect x={x} y={y} width={w} height={h * 0.55} rx="4" fill="#8fd0ff" opacity="0.6" />
      <circle cx={x + w * 0.75} cy={y + h * 0.3} r={Math.min(w, h) * 0.12} fill="#fff6c9" opacity={sun ? 0.95 : 0} />
      <path d={`M${x},${y + h} q${w * 0.15},-${h * 0.2} ${w * 0.3},-${h * 0.05} t${w * 0.35},-${h * 0.05} t${w * 0.35},${h * 0.1}Z`} fill="#6fbf7c" opacity="0.85" />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#f6efe0" strokeWidth="6" /><line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke="#f6efe0" strokeWidth="6" />
      <polygon points={`${x},${y} ${x + w * 0.5},${y} ${x + w * 0.2},${y + h}  ${x},${y + h}`} fill={`url(#${id}-light)`} opacity="0.5" />
    </g>
  );
}

export function Plant({ x, y, s = 1, fresh = true }: { x: number; y: number; s?: number; fresh?: boolean }) {
  const leaf = fresh ? "#2f9d5c" : "#8a9a4a";
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-28,0 L28,0 L22,-44 L-22,-44Z" fill="#c4622d" /><rect x="-30" y="-50" width="60" height="10" rx="4" fill="#d8763a" />
      {([[-26, -110, -30], [-8, -140, -8], [14, -128, 14], [30, -100, 34], [0, -96, 0], [-34, -80, -50]] as Array<[number, number, number]>).map(([lx, ly, r], i) => (
        <path key={i} d={`M0,-48 Q${lx * 0.5 - 14},${ly * 0.6} ${lx},${ly} Q${lx * 0.5 + 14},${ly * 0.55} 0,-48Z`} fill={i % 2 ? leaf : darken(leaf, 0.15)} transform={`rotate(${r * 0.3} 0 -48)`} />
      ))}
    </g>
  );
}

export function Desk({ x, y, w, id, children }: { x: number; y: number; w: number; id: string; children?: ReactNode }) {
  return (
    <g filter={`url(#${id}-shadow)`}>
      <rect x={x} y={y} width={w} height="26" rx="6" fill="#d89452" />
      <rect x={x} y={y} width={w} height="8" rx="4" fill="#f0b676" />
      <rect x={x + 12} y={y + 26} width={w - 24} height="108" fill={PAL.wood} />
      <rect x={x + 12} y={y + 26} width={w - 24} height="108" fill="url(#none)" />
      <rect x={x + 24} y={y + 42} width={(w - 60) / 2} height="40" rx="5" fill={PAL.woodD} opacity="0.55" /><rect x={x + 36 + (w - 60) / 2} y={y + 42} width={(w - 60) / 2} height="40" rx="5" fill={PAL.woodD} opacity="0.55" />
      <circle cx={x + 24 + (w - 60) / 4} cy={y + 62} r="3" fill="#ffd98a" /><circle cx={x + 36 + (w - 60) * 0.75} cy={y + 62} r="3" fill="#ffd98a" />
      {children}
    </g>
  );
}

export function Monitor({ x, y, s = 1, screen = "#bfe9ff", children }: { x: number; y: number; s?: number; screen?: string; children?: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-48" y="-62" width="96" height="62" rx="6" fill="#2b3350" /><rect x="-43" y="-57" width="86" height="50" rx="3" fill={screen} />
      <rect x="-10" y="0" width="20" height="12" fill="#454d6e" /><rect x="-26" y="10" width="52" height="6" rx="3" fill="#2b3350" />
      <path d="M-43,-57 L-10,-57 L-30,-7 L-43,-7Z" fill="#fff" opacity="0.25" />
      {children}
    </g>
  );
}

export function Papers({ x, y, n = 3, tilt = 0 }: { x: number; y: number; n?: number; tilt?: number }) {
  return (<g transform={`translate(${x} ${y}) rotate(${tilt})`}>{Array.from({ length: n }, (_, i) => <g key={i}><rect x={i * 2 - 28} y={-i * 4 - 4} width="56" height="38" rx="2" fill={i % 2 ? "#fff" : "#fdf8ec"} stroke="#e1d2b0" /><rect x={i * 2 - 22} y={-i * 4 + 4} width="30" height="3" fill="#c9bb98" /><rect x={i * 2 - 22} y={-i * 4 + 12} width="40" height="3" fill="#d7caa8" /></g>)}</g>);
}

export function Chair({ x, y, c = PAL.blue, s = 1 }: { x: number; y: number; c?: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-26" y="-70" width="52" height="46" rx="12" fill={darken(c, 0.12)} /><rect x="-30" y="-26" width="60" height="18" rx="9" fill={c} />
      <rect x="-24" y="-8" width="6" height="34" fill="#4a5070" /><rect x="18" y="-8" width="6" height="34" fill="#4a5070" />
      <path d="M-22,-60 q22,-8 44,0" stroke={lighten(c, 0.3)} strokeWidth="3" fill="none" opacity="0.6" />
    </g>
  );
}

/** Figura de fundo (sem identidade): usada só para ocupar sala de espera e mostrar a fila. */
export function Extra({ x, y, c = "#7a8cc4", skin = "#c68d64", s = 1, kid = false }: { x: number; y: number; c?: string; skin?: string; s?: number; kid?: boolean }) {
  const k = kid ? 0.72 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * k})`}>
      <path d="M-24,0 C-22,-30 -12,-44 0,-44 C12,-44 22,-30 24,0Z" fill={c} /><circle cx="0" cy="-60" r="15" fill={skin} />
      <path d="M-15,-64 C-14,-80 14,-80 15,-64 C8,-70 -8,-70 -15,-64Z" fill={darken(skin, 0.6)} />
    </g>
  );
}

export function Banner({ x, y, w, text, c = PAL.red }: { x: number; y: number; w: number; text: string; c?: string }) {
  return (<g><rect x={x} y={y} width={w} height="44" rx="8" fill={c} /><text x={x + w / 2} y={y + 30} textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="24" fill="#fff" letterSpacing="2">{text}</text></g>);
}

export function Box({ x, y, w = 56, h = 40, c = "#d9a35b", tag }: { x: number; y: number; w?: number; h?: number; c?: string; tag?: string }) {
  return (<g><rect x={x} y={y} width={w} height={h} rx="3" fill={c} /><rect x={x} y={y} width={w} height={h * 0.3} fill={lighten(c, 0.25)} /><rect x={x + w * 0.38} y={y} width={w * 0.24} height={h} fill={darken(c, 0.14)} opacity="0.5" />{tag && <rect x={x + 4} y={y + h * 0.5} width="16" height="9" rx="2" fill={tag} />}</g>);
}

/** Pessoa em cena: busto do retrato 2D (mesma identidade do 3D) atrás de um móvel. */
export function PersonSpot({ x, y, w, look, emo = "neutro", falando = false, label }: { x: number; y: number; w: number; look: Look; emo?: Emotion; falando?: boolean; label?: string }) {
  const h = w * 1.25;
  return (
    <g>
      <ellipse cx={x + w / 2} cy={y + h - 4} rx={w * 0.46} ry="10" fill="#1b2340" opacity="0.18" />
      <Portrait look={look} emocao={emo} falando={falando} x={x} y={y} width={w} height={h} title={label} />
    </g>
  );
}
