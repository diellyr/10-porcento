"use client";
import { CHARACTERS, avatarLook } from "@/game/content/characters";
import { Portrait } from "./Portrait";
import { Extra, Plant, SceneDefs } from "./parts";

/** Pôster da tela inicial: dois mundos (a UPA que melhora × o gabinete dourado) separados por uma caneta. Arte original. */
export function HeroArt({ avatar = "av1", className = "" }: { avatar?: string; className?: string }) {
  const id = "hero";
  const layer = (d: number) => ({ transform: `translate(calc(var(--px, 0) * ${d}px), calc(var(--py, 0) * ${d / 2}px))`, transition: "transform .25s ease-out" } as const);
  return (
    <svg viewBox="0 0 1200 675" className={className} role="img" aria-label="Arte de MEUS 10%: de um lado a UPA e a população, do outro um gabinete dourado, e no centro uma caneta enorme." preserveAspectRatio="xMidYMid slice">
      <SceneDefs id={id} />
      <defs>
        <linearGradient id="h-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7cc8ff" /><stop offset="0.7" stopColor="#d9f0ff" /><stop offset="1" stopColor="#fff3d6" /></linearGradient>
        <linearGradient id="h-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe9a3" /><stop offset="0.5" stopColor="#ffc933" /><stop offset="1" stopColor="#c9971a" /></linearGradient>
        <linearGradient id="h-pen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1b2fa0" /><stop offset="0.5" stopColor="#3b6cf0" /><stop offset="1" stopColor="#122a85" /></linearGradient>
        <linearGradient id="h-lux" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a1530" /><stop offset="1" stopColor="#8a2a45" /></linearGradient>
        <clipPath id="h-left"><polygon points="0,0 640,0 560,675 0,675" /></clipPath>
        <clipPath id="h-right"><polygon points="640,0 1200,0 1200,675 560,675" /></clipPath>
      </defs>
      {/* mundo da população */}
      <g clipPath="url(#h-left)">
        <rect width="1200" height="675" fill="url(#h-sky)" />
        <g style={layer(-6)}><circle cx="150" cy="120" r="54" fill="#fff6c9" /><ellipse cx="150" cy="120" rx="140" ry="100" fill="#fff6c9" opacity="0.4" filter={`url(#${id}-soft)`} />
          {[[300, 90, 1], [60, 190, 0.7], [470, 150, 0.9]].map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`} fill="#fff"><ellipse rx="60" ry="20" /><ellipse cx="34" cy="-12" rx="38" ry="22" /><ellipse cx="-26" cy="-8" rx="30" ry="18" /></g>)}</g>
        <path d="M0,430 q160,-80 330,-20 t330,-10 V675 H0Z" fill="#8fd09a" /><path d="M0,520 q200,-50 400,0 t300,-10 V675 H0Z" fill="#6cbd7e" />
        <g style={layer(-10)}>
          <rect x="60" y="250" width="440" height="270" rx="12" fill="#f4fff7" /><rect x="60" y="250" width="440" height="30" fill="#34ad70" />
          <rect x="150" y="214" width="260" height="56" rx="12" fill="#e5484d" /><text x="280" y="254" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="34" fill="#fff" letterSpacing="3">UPA 24h</text>
          <rect x="262" y="210" width="36" height="12" fill="#fff" /><rect x="274" y="198" width="12" height="36" fill="#fff" />
          {[0, 1, 2].map((i) => <rect key={i} x={95 + i * 130} y="310" width="90" height="100" rx="8" fill="#bfe3ff" />)}
          <rect x="230" y="420" width="100" height="100" rx="8" fill="#9fd0ff" /><line x1="280" y1="420" x2="280" y2="520" stroke="#fff" strokeWidth="5" />
          <Plant x={60} y={520} s={0.9} /><Plant x={500} y={520} s={0.9} />
        </g>
        <g style={layer(6)}>{[[120, 560, "#2e8a7a"], [210, 575, "#c9577a"], [420, 565, "#6d6fc4"]].map(([x, y, c], i) => <Extra key={i} x={x as number} y={y as number} c={c as string} skin={["#b57a52", "#e0b48f", "#8d5b3d"][i]!} s={1.3} kid={i === 1} />)}</g>
        <rect x="40" y="610" width="300" height="46" rx="14" fill="#34ad70" /><text x="190" y="642" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="24" fill="#fff">Fila andando. De verdade.</text>
      </g>
      {/* mundo do luxo */}
      <g clipPath="url(#h-right)">
        <rect x="560" width="640" height="675" fill="url(#h-lux)" />
        <g opacity="0.55">{Array.from({ length: 6 }, (_, i) => <rect key={i} x={600 + i * 110} y="0" width="46" height="420" fill="#1b0a14" />)}</g>
        <ellipse cx="900" cy="140" rx="250" ry="100" fill="#ffd98a" opacity="0.35" filter={`url(#${id}-soft)`} />
        <rect x="640" y="120" width="260" height="190" rx="8" fill="#c9971a" /><rect x="654" y="134" width="232" height="162" fill="#2f1520" /><circle cx="770" cy="215" r="42" fill="url(#h-gold)" /><path d="M654,296 L730,230 L790,270 L886,206 V296Z" fill="#6b1d2a" />
        <rect x="560" y="470" width="640" height="205" fill="#2a0e1b" />
        <g style={layer(10)}>
          <path d="M880,480 q18,-70 150,-72 q110,-50 210,0 q40,12 50,72Z" fill="#0f1016" /><path d="M980,415 q60,-34 140,-8 l14,32 h-166z" fill="#7fb3dd" opacity="0.8" /><circle cx="990" cy="484" r="26" fill="#1b1e2b" /><circle cx="1150" cy="484" r="26" fill="#1b1e2b" /><circle cx="990" cy="484" r="11" fill="#ffd98a" /><circle cx="1150" cy="484" r="11" fill="#ffd98a" />
        </g>
        <g style={layer(8)}>{[[700, 540], [760, 560], [830, 548], [1040, 560]].map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y} rx="26" ry="9" fill="url(#h-gold)" /><ellipse cx={x} cy={(y as number) - 7} rx="26" ry="9" fill="#ffe9a3" /><text x={x} y={(y as number) - 3} textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="13" fill="#8a5a00">$</text></g>)}</g>
        <rect x="860" y="610" width="320" height="46" rx="14" fill="#6b1d2a" /><text x="1020" y="642" textAnchor="middle" fontFamily="var(--g-display)" fontWeight="700" fontSize="22" fill="#ffe9a3">Amigos repentinos: 7 (e subindo)</text>
      </g>
      {/* a caneta */}
      <g style={layer(-4)} filter={`url(#${id}-shadow)`}>
        <g transform="translate(600 330) rotate(24)">
          <rect x="-30" y="-330" width="60" height="500" rx="30" fill="url(#h-pen)" /><rect x="-30" y="-330" width="60" height="70" rx="30" fill="#ffc933" /><rect x="-30" y="110" width="60" height="26" fill="url(#h-gold)" />
          <path d="M-30,136 L30,136 L0,236 Z" fill="url(#h-gold)" /><path d="M0,150 L0,228" stroke="#8a5a00" strokeWidth="3" /><circle cx="0" cy="170" r="6" fill="#8a5a00" />
          <rect x="-8" y="-300" width="10" height="330" rx="5" fill="#fff" opacity="0.28" /><rect x="20" y="-210" width="9" height="120" rx="4" fill="#ffc933" />
        </g>
        <path d="M540,520 q40,40 84,6" stroke="#1a46d4" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.9" />
      </g>
      {/* personagens */}
      <g style={layer(12)}>
        <Portrait look={CHARACTERS.joana.look} emocao="feliz" x={60} y={455} width={190} height={238} />
        <Portrait look={CHARACTERS.celia.look} emocao="serio" x={210} y={470} width={176} height={220} />
        <Portrait look={avatarLook(avatar)} emocao="neutro" x={460} y={440} width={200} height={250} />
        <Portrait look={CHARACTERS.guardiao.look} emocao="irônico" x={840} y={470} width={176} height={220} />
        <Portrait look={CHARACTERS.cornelio.look} emocao="feliz" x={990} y={455} width={190} height={238} />
      </g>
      <rect width="1200" height="675" fill={`url(#${id}-vig)`} pointerEvents="none" />
    </svg>
  );
}
