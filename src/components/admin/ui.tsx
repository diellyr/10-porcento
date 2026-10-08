"use client";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/primitives";

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ONLINE: { label: "Online", color: "var(--color-ok)", bg: "var(--color-ok-bg)" },
  DEGRADED: { label: "Degradado", color: "var(--color-warn)", bg: "var(--color-warn-bg)" },
  OFFLINE: { label: "Offline", color: "var(--color-bad)", bg: "var(--color-bad-bg)" },
  DISABLED: { label: "Desativada", color: "var(--color-ink-3)", bg: "var(--color-surface-2)" },
  NOT_CONFIGURED: { label: "Não configurada", color: "var(--color-warn)", bg: "var(--color-warn-bg)" },
  UNKNOWN: { label: "Não testada", color: "var(--color-ink-3)", bg: "var(--color-surface-2)" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.UNKNOWN!;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ color: m.color, background: m.bg }}>
      <span aria-hidden className="size-2 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

/** Interruptor acessível (role=switch). */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full px-1 text-[10px] font-bold transition-colors disabled:opacity-50 ${checked ? "justify-start bg-ok text-white" : "justify-end bg-line text-ink-2"}`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-8" : "left-1"}`} />
      <span className={checked ? "pl-1" : "pr-1"}>{checked ? "ON" : "OFF"}</span>
    </button>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "bad" | "warn" }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-ink-3">{label}</p>
      <p className={`tabular mt-1 text-2xl font-bold ${tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-ink"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </Card>
  );
}

export function AdminTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
