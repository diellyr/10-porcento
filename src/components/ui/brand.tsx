import Link from "next/link";

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
      <rect x="7" y="16" width="4.5" height="9" rx="1.2" fill="#fff" />
      <rect x="13.75" y="11" width="4.5" height="14" rx="1.2" fill="#fff" />
      <rect x="20.5" y="7" width="4.5" height="18" rx="1.2" fill="#fff" />
      <circle cx="25.5" cy="6.5" r="3" fill="var(--color-accent)" />
    </svg>
  );
}

/** Wordmark textual: "Brasil" em peso forte, "Fiscal" em peso leve — sem símbolos políticos. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Brasil Fiscal — página inicial">
      <Mark />
      <span className="text-[19px] leading-none tracking-tight">
        <span className="font-bold text-ink">Brasil</span>
        <span className="font-light text-ink-2"> Fiscal</span>
      </span>
    </Link>
  );
}
