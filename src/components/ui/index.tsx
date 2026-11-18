import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="AI Academic Advisor home">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="9" fill="#3a1607" />
        <path d="M8 21.5 16 9l8 12.5" stroke="#fce38a" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="21.5" r="2.4" fill="#e0600c" />
      </svg>
      <span className="font-[family-name:var(--font-display)] text-[17px] leading-none tracking-tight">
        Academic<br />Advisor
      </span>
    </Link>
  );
}

export function PageHeader({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] sm:text-[40px]">{title}</h1>
        {intro && <p className="mt-2 text-ink-soft">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      {(title || aside) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && <h2 className="text-[17px] font-semibold">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  ink: "bg-ink text-[#fff8e6]",
  butter: "bg-butter-soft text-ink",
  ember: "bg-ember-soft text-[#9a3f05]",
  leaf: "bg-leaf-soft text-leaf",
  alarm: "bg-alarm-soft text-alarm",
  plain: "bg-white text-ink-soft border border-line",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "butter", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${TONES[tone]}`}>{children}</span>;
}

export function Stat({ value, label, hint, tone }: { value: ReactNode; label: string; hint?: ReactNode; tone?: "ember" | "leaf" | "alarm" }) {
  const color = tone === "ember" ? "text-ember" : tone === "leaf" ? "text-leaf" : tone === "alarm" ? "text-alarm" : "text-ink";
  return (
    <div className="card p-4">
      <div className={`numeral text-[34px] ${color}`}>{value}</div>
      <div className="mt-2 text-[13px] font-semibold text-ink-soft">{label}</div>
      {hint && <div className="mt-0.5 text-[12px] text-ink-faint">{hint}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warning" | "critical"; title?: string; children?: ReactNode }) {
  const map = {
    info: { cls: "bg-butter-soft border-[#f6e3a3]", Icon: Info, ic: "text-ink-soft" },
    warning: { cls: "bg-ember-soft border-[#f8cfa9]", Icon: AlertTriangle, ic: "text-ember" },
    critical: { cls: "bg-alarm-soft border-[#f7c2bb]", Icon: OctagonAlert, ic: "text-alarm" },
  }[tone];
  return (
    <div role={tone === "critical" ? "alert" : "status"} className={`flex gap-3 rounded-[14px] border px-4 py-3 text-[14px] ${map.cls}`}>
      <map.Icon className={`mt-0.5 size-4 shrink-0 ${map.ic}`} aria-hidden />
      <div>
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="text-ink-soft">{children}</div>}
      </div>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card-butter flex flex-col items-start gap-3 p-6">
      <div className="font-semibold">{title}</div>
      {children && <p className="max-w-lg text-[14px] text-ink-soft">{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[14px] bg-butter-soft ${className}`} aria-hidden />;
}

export function AiLabel({ text }: { text?: string }) {
  return (
    <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-faint">
      <span className="rounded-full bg-butter-soft px-1.5 py-px font-semibold text-ink-soft">AI</span>
      {text ?? "AI-generated guidance. It may be wrong, so check important details with your faculty."}
    </p>
  );
}

export function ProgressBar({ value, tone = "ink" }: { value: number; tone?: "ink" | "ember" | "leaf" | "alarm" }) {
  const c = { ink: "bg-ink", ember: "bg-ember", leaf: "bg-leaf", alarm: "bg-alarm" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-butter-soft" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${c}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
