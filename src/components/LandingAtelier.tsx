// The home, a calm, editorial hero. "Start a brief" leads into the flow;
// the brief itself is captured there, not on the landing.

export function LandingAtelier({ onNext, onBeta }: { onNext: () => void; onBeta?: () => void }) {
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

          <div className="reveal mt-10 flex flex-col items-center gap-4" style={{ animationDelay: "0.46s" }}>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <button
                onClick={onNext}
                className="spring group flex items-center gap-3 rounded-full bg-ink px-10 py-5 text-xl font-medium text-[var(--page)] shadow-lg shadow-ink/10 hover:shadow-xl hover:shadow-ink/20"
              >
                Start a brief
                <kbd className="grid h-6 w-6 place-items-center rounded-full border border-[var(--page)]/30 text-xs leading-none">⏎</kbd>
              </button>

              {/* The new design, opt-in. Same studio, reimagined as a macOS app. */}
              {onBeta && (
                <button
                  onClick={onBeta}
                  className="spring group flex items-center gap-2.5 rounded-full border border-ink/15 bg-[var(--surface-solid)] px-8 py-5 text-xl font-medium text-ink/70 transition hover:border-ink/30 hover:text-ink"
                >
                  Start a brief
                  <span className="rounded-full bg-ink/8 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink/55">beta</span>
                </button>
              )}
            </div>

            {/* Non-blocking nudge: phones can run the whole flow, but it shines on
                a wider screen. Shown only on small viewports (hidden at sm+). */}
            <p className="sm:hidden mt-2 max-w-[17rem] text-center text-sm leading-relaxed text-ink/45">
              The studio runs on your phone, but it's best on a desktop.
            </p>
          </div>
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
