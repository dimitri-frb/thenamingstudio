// Shared studio primitives for the v2 funnel. Kept local to v2 so styling
// choices here can never ripple into v1. Reuses only the global design tokens
// (Tailwind theme in index.css) and the studio voice mark from Guide.

import type React from "react";

export const PHASE_TITLES = [
  "Position",
  "Direct",
  "Generate",
  "Shortlist",
  "Pressure-test",
  "Decide & own",
];

export function PhaseRail({ phase }: { phase: number }) {
  return (
    <div className="mx-auto mb-7 flex max-w-2xl items-center gap-1.5">
      {PHASE_TITLES.map((t, i) => {
        const n = i + 1;
        const done = n < phase;
        const active = n === phase;
        return (
          <div key={t} className="flex flex-1 flex-col items-center gap-1.5" title={`${n}. ${t}`}>
            <div
              className={`h-1 w-full rounded-full transition-colors ${
                done ? "bg-accent/70" : active ? "bg-accent" : "bg-ink/12"
              }`}
            />
            <span
              className={`hidden text-[9px] font-mono uppercase tracking-wider sm:block ${
                active ? "text-accent" : "text-ink/30"
              }`}
            >
              {t}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">{children}</p>;
}

export function StudioNote({ children, tone = "calm" }: { children: React.ReactNode; tone?: "calm" | "tension" }) {
  const tension = tone === "tension";
  return (
    <div
      className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${
        tension ? "border-amber-500/30 bg-amber-500/[0.06]" : "border-accent/20 bg-accent/[0.04]"
      }`}
    >
      <span
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-white shadow-sm ${
          tension ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-gradient-to-br from-accent to-accent2"
        }`}
      >
        {tension ? (
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" />
          </svg>
        )}
      </span>
      <p className="font-serif text-lg italic leading-snug text-ink/75">{children}</p>
    </div>
  );
}

export function PhaseHeader({
  phase,
  title,
  accent,
}: {
  phase: number;
  title: React.ReactNode;
  accent?: string;
}) {
  return (
    <>
      <Kicker>
        Phase {phase} / 6 · {PHASE_TITLES[phase - 1]}
      </Kicker>
      <h2 className="mt-2 text-3xl leading-snug sm:text-4xl">
        {title} {accent && <span className="italic text-accent">{accent}</span>}
      </h2>
    </>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function BackLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm text-ink/50 transition hover:text-ink">
      {children}
    </button>
  );
}

export function FooterNav({
  onBack,
  backLabel = "← Back",
  middle,
  children,
}: {
  onBack: () => void;
  backLabel?: string;
  middle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink/10 pt-6">
      <BackLink onClick={onBack}>{backLabel}</BackLink>
      {middle}
      {children}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
  align = "center",
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  align?: "center" | "left";
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 transition ${align === "center" ? "text-center" : "text-left"} ${
        active ? "border-accent bg-accent/5 shadow-sm" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"
      }`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  placeholder,
  value,
  onChange,
  hint,
  textarea,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink/60">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-4 py-3 outline-none transition placeholder:text-ink/25 focus:border-accent/50"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-4 py-3 outline-none transition placeholder:text-ink/25 focus:border-accent/50"
        />
      )}
      {hint && <p className="mt-1 text-xs text-ink/40">{hint}</p>}
    </div>
  );
}

// A thinking screen reused between async phases.
export function Thinking({ lines }: { lines: string[] }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <span className="grid h-16 w-16 animate-pulse place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent2 text-white shadow-2xl shadow-accent2/30">
        <svg viewBox="0 0 24 24" width="40%" height="40%" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" />
        </svg>
      </span>
      <p className="mt-6 font-serif text-xl italic text-ink/70">{lines[0]}</p>
      {lines[1] && <p className="mt-1 text-sm text-ink/40">{lines[1]}</p>}
    </div>
  );
}

// State pills for availability + test results.
export function StatePill({ state }: { state: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    available: { label: "free", cls: "bg-emerald-500/12 text-emerald-700 border-emerald-600/20" },
    clear: { label: "clear", cls: "bg-emerald-500/12 text-emerald-700 border-emerald-600/20" },
    pass: { label: "pass", cls: "bg-emerald-500/12 text-emerald-700 border-emerald-600/20" },
    premium: { label: "premium", cls: "bg-amber-500/12 text-amber-700 border-amber-600/20" },
    warn: { label: "warn", cls: "bg-amber-500/12 text-amber-700 border-amber-600/20" },
    unknown: { label: "n/a", cls: "bg-ink/8 text-ink/45 border-ink/15" },
    taken: { label: "taken", cls: "bg-rose-500/12 text-rose-700 border-rose-600/20" },
    conflict: { label: "conflict", cls: "bg-rose-500/12 text-rose-700 border-rose-600/20" },
    fail: { label: "fail", cls: "bg-rose-500/12 text-rose-700 border-rose-600/20" },
  };
  const m = map[state] || map.unknown;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  );
}
