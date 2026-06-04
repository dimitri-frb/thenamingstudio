// The "studio voice", a consistent guide presence that makes the whole flow
// feel like being walked through by a brand expert. No persona, no avatar; just
// the studio's mark (the asterisk) and a warm, inspiring line at each step.

export function StudioNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/[0.04] p-4">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-accent to-accent2 text-white shadow-sm shadow-accent2/20">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" />
        </svg>
      </span>
      <p className="font-serif text-lg italic leading-snug text-ink/75">{children}</p>
    </div>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">{children}</p>;
}
