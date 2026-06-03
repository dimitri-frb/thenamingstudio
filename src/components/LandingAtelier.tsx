// The home — a calm, editorial hero. "Start a brief" leads into the flow;
// the brief itself is captured there, not on the landing.

export function LandingAtelier({ onNext, onTalk, canTalk }: { onNext: () => void; onTalk: () => void; canTalk: boolean }) {
  return (
    <div className="animate-in">
      {/* hero */}
      <section className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-2 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink/40">A studio for the unnamed</p>

        <h1 className="mt-7 text-6xl leading-[1.0] sm:text-7xl">
          Name your
          <br />
          thing, <span className="italic text-accent">properly.</span>
        </h1>

        <p className="mx-auto mt-8 max-w-xl font-serif text-2xl leading-relaxed text-ink/65">
          Not a list of suggestions. A brief, a strategy, a defensible name —
          with the rigor of a senior consultant and the speed of a tool.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onNext}
            className="group flex items-center gap-3 rounded-xl bg-ink px-6 py-3.5 text-base font-medium text-[var(--page)] transition hover:opacity-90"
          >
            Start a brief
            <kbd className="grid h-5 w-5 place-items-center rounded border border-[var(--page)]/30 text-[10px] leading-none">⏎</kbd>
          </button>
        </div>

        {canTalk && (
          <button
            onClick={onTalk}
            className="group mt-5 inline-flex items-center gap-2 font-serif text-lg italic text-ink/55 transition hover:text-accent"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full border border-ink/20 text-ink/60 transition group-hover:border-accent group-hover:text-accent">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" /></svg>
            </span>
            …or just talk it through
          </button>
        )}

        <p className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 font-mono text-xs uppercase tracking-widest text-ink/40">
          <span>10 steps</span>
          <span>≈ 20 min</span>
          <span>used by 4,200 founders</span>
        </p>
      </section>

      {/* footer bar */}
      <footer className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 border-t border-ink/10 px-2 py-7 font-mono text-[11px] uppercase tracking-widest text-ink/35 sm:flex-row">
        <span>© 2026</span>
        <span className="text-ink/45">Strategy → Concept → Word → Name</span>
      </footer>
    </div>
  );
}
