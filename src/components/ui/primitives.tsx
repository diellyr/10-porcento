import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}

export function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8">
      {eyebrow && <p className="mb-2 text-sm font-medium text-primary">{eyebrow}</p>}
      <h1 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 max-w-2xl text-pretty text-base text-ink-2">{subtitle}</p>}
      {children}
    </header>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "bad" | "ok"; children: ReactNode }) {
  const t = { info: "bg-primary-50 text-primary-600 border-primary/20", warn: "bg-warn-bg text-warn border-warn/20", bad: "bg-bad-bg text-bad border-bad/20", ok: "bg-ok-bg text-ok border-ok/20" }[tone];
  return <div role={tone === "bad" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${t}`}>{children}</div>;
}

export function SetupNotice() {
  return (
    <Notice tone="warn">
      <strong className="font-semibold">Configuração necessária.</strong> Defina as variáveis do Supabase (veja <code className="font-mono">.env.example</code> e o README) e aplique as migrations para ver dados reais.
    </Notice>
  );
}

export function Button({ children, variant = "primary", className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const v = {
    primary: "bg-primary text-white hover:bg-primary-600",
    secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
    danger: "bg-bad text-white hover:opacity-90",
    ghost: "text-ink-2 hover:bg-surface-2",
  }[variant];
  return (
    <button {...rest} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}>
      {children}
    </button>
  );
}
