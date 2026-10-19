import { APP_VERSION } from "@/lib/version";

/**
 * Logotipo MEUS 10% em SVG (texto vivo, sem imagem): "MEUS" branco com contorno e extrusão azul; "10%" dourado/laranja com volume metálico.
 * `versao` mostra o número da versão ao lado do nome.
 */
export function GameLogo({ className = "", versao = true }: { className?: string; versao?: boolean }) {
  const cam = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
  const font = { fontFamily: 'var(--g-display), "Fredoka Variable", system-ui, sans-serif', fontWeight: 700 } as const;
  return (
    <div className={`mx-logo ${className}`}>
      <svg viewBox="0 0 880 230" role="img" aria-label="MEUS 10%" className="mx-logo-svg">
        <defs>
          <linearGradient id="lg-meus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor="#e6f1ff" /><stop offset="1" stopColor="#a8c8f4" /></linearGradient>
          <linearGradient id="lg-ouro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2a8" /><stop offset=".35" stopColor="#ffc933" /><stop offset=".7" stopColor="#f59a1e" /><stop offset="1" stopColor="#e2641a" /></linearGradient>
          <filter id="lg-brilho" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="9" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="lg-sombra" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#0a1030" floodOpacity=".55" /></filter>
        </defs>
        <g filter="url(#lg-sombra)">
          {/* MEUS */}
          {cam(12).map((i) => <text key={`m${i}`} x={14 + i * 0.9} y={178 + i * 1.1} textLength="470" lengthAdjust="spacingAndGlyphs" fontSize="190" fill="#123b8a" stroke="#123b8a" strokeWidth="14" strokeLinejoin="round" style={font}>MEUS</text>)}
          <text x="14" y="178" textLength="470" lengthAdjust="spacingAndGlyphs" fontSize="190" fill="url(#lg-meus)" stroke="#1d57c9" strokeWidth="9" strokeLinejoin="round" paintOrder="stroke" style={font}>MEUS</text>
          {/* 10% */}
          {cam(12).map((i) => <text key={`d${i}`} x={512 + i * 0.9} y={178 + i * 1.1} textLength="350" lengthAdjust="spacingAndGlyphs" fontSize="190" fill="#9a3f0a" stroke="#9a3f0a" strokeWidth="14" strokeLinejoin="round" style={font}>10%</text>)}
          <g filter="url(#lg-brilho)"><text x="512" y="178" textLength="350" lengthAdjust="spacingAndGlyphs" fontSize="190" fill="url(#lg-ouro)" stroke="#d9570f" strokeWidth="8" strokeLinejoin="round" paintOrder="stroke" style={font}>10%</text></g>
        </g>
      </svg>
      {versao && <span className="mx-versao" title={`Versão ${APP_VERSION}`}>v{APP_VERSION}</span>}
    </div>
  );
}
