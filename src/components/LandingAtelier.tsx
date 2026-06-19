// The home, a calm, editorial hero. "Start a brief" leads into the flow;
// the brief itself is captured there, not on the landing.

export function LandingAtelier({ onNext, onTalk, canTalk }: { onNext: () => void; onTalk: () => void; canTalk: boolean }) {
  return (
    <div>
      {/* hero */}
      <section className="relative mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-2 text-center">
        <div className="hero-glow" aria-hidden />

        <div className="relative z-10 flex flex-col items-center">
          <p className="reveal font-mono text-xs uppercase tracking-[0.3em] text-ink/40" style={{ animationDelay: "0.05s" }}>A studio for the unnamed</p>

          <h1 className="mt-7 text-6xl leading-[1.0] sm:text-7xl">
            <span className="reveal block" style={{ animationDelay: "0.14s" }}>Name your</span>
            <span className="reveal block" style={{ animationDelay: "0.26s" }}>
              company, <span className="accent-underline italic text-accent">properly.</span>
            </span>
          </h1>

          <p className="reveal mx-auto mt-8 max-w-xl font-serif text-2xl leading-relaxed text-ink/65" style={{ animationDelay: "0.42s" }}>
            Not a list of suggestions. A brief, a strategy, a defensible name,
            with the rigor of a senior consultant and the speed of a tool.
          </p>

          <p className="reveal mt-5 inline-flex items-center gap-2 rounded-full border border-ink/15 bg-[var(--surface-solid)] px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-ink/55" style={{ animationDelay: "0.54s" }}>
            <span className="text-sm">🇫🇷</span> Every name checked against the INPI, Instagram, domain names and much more...
          </p>

          <div className="reveal mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.66s" }}>
            <button
              onClick={onNext}
              className="spring group flex items-center gap-3 rounded-full bg-ink px-7 py-3.5 text-base font-medium text-[var(--page)] shadow-lg shadow-ink/10 hover:shadow-xl hover:shadow-ink/20"
            >
              Start a brief
              <kbd className="grid h-5 w-5 place-items-center rounded-full border border-[var(--page)]/30 text-[10px] leading-none">⏎</kbd>
            </button>
            <button
              onClick={() => window.location.assign(window.location.pathname + "?test")}
              className="spring group flex items-center gap-2.5 rounded-full border border-ink/20 px-7 py-3.5 text-base font-medium text-ink/60 hover:border-ink/40 hover:text-ink"
              title="Jump through every step with sample data, no real run"
            >
              Test flow
              <span className="font-serif italic transition group-hover:translate-x-1">→</span>
            </button>
          </div>

          {canTalk && (
            <button
              onClick={onTalk}
              className="reveal group mt-5 inline-flex items-center gap-2 font-serif text-lg italic text-ink/55 transition hover:text-accent"
              style={{ animationDelay: "0.74s" }}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full border border-ink/20 text-ink/60 transition group-hover:border-accent group-hover:text-accent">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" /></svg>
              </span>
              …or just talk it through
            </button>
          )}

          <p className="reveal mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 font-mono text-xs uppercase tracking-widest text-ink/40" style={{ animationDelay: "0.82s" }}>
            <span>10 steps</span>
            <span>under 5 min</span>
            <span>used by 4,200 founders</span>
          </p>
        </div>
      </section>

      {/* footer bar */}
      <footer className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 border-t border-ink/10 px-2 py-7 font-mono text-[11px] uppercase tracking-widest text-ink/35 sm:flex-row">
        <span>© 2026</span>
        <span className="text-ink/45">Strategy → Concept → Word → Name</span>
      </footer>
    </div>
  );
}
