import { APP_VERSION } from "@/lib/version";

/** Versão do jogo ao lado do nome (fonte única: package.json; histórico em version.md). */
export function Versao({ className = "" }: { className?: string }) {
  return <span className={`inline-block rounded-lg border-2 border-current px-1.5 py-0.5 align-middle text-[0.8rem] font-bold leading-none opacity-70 ${className}`} title={`Versão ${APP_VERSION}`} style={{ fontFamily: "var(--g-body, inherit)" }}>v{APP_VERSION}</span>;
}
