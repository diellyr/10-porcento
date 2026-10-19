/** A caneta do poder: elemento central da identidade (decorativo). */
export function CanetaPoder({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 520" aria-hidden="true" focusable="false" className={`mx-caneta ${className}`}>
      <defs>
        <linearGradient id="cp-corpo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0b1b52" /><stop offset=".35" stopColor="#2a5be0" /><stop offset=".55" stopColor="#1b3fa8" /><stop offset="1" stopColor="#081238" /></linearGradient>
        <linearGradient id="cp-ouro" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a8741a" /><stop offset=".4" stopColor="#ffe27a" /><stop offset=".7" stopColor="#d9a335" /><stop offset="1" stopColor="#7a4f0e" /></linearGradient>
        <linearGradient id="cp-brilho" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="cp-clip"><path d="M30 70h60v300H30z" /></clipPath>
      </defs>
      {/* clipe */}
      <path d="M86 70v190a6 6 0 0 0 12 0V90a10 10 0 0 0-10-10z" fill="url(#cp-ouro)" />
      {/* corpo */}
      <path d="M30 70a30 30 0 0 1 60 0v300H30z" fill="url(#cp-corpo)" />
      <rect x="30" y="360" width="60" height="16" fill="url(#cp-ouro)" /><rect x="30" y="100" width="60" height="9" fill="url(#cp-ouro)" /><rect x="30" y="116" width="60" height="4" fill="url(#cp-ouro)" />
      {/* ponta */}
      <path d="M32 376h56l-12 54H44z" fill="url(#cp-ouro)" />
      <path d="M44 430h32l-12 80z" fill="#e9eef8" /><path d="M60 440v52" stroke="#10192f" strokeWidth="2.5" /><circle cx="60" cy="446" r="3.5" fill="#10192f" />
      {/* brilho que percorre o corpo */}
      <g clipPath="url(#cp-clip)"><rect className="mx-caneta-brilho" x="30" y="60" width="16" height="140" fill="url(#cp-brilho)" /></g>
    </svg>
  );
}
