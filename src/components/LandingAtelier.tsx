// The home, a calm, editorial hero. "Start a brief" leads into the flow;
// the brief itself is captured there, not on the landing.
import { useState } from "react";

// The 10-step studio isn't mobile-ready yet, so on a phone we don't drop people
// into a broken flow: we tell them, honestly, to come back on a desktop.
const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 680px)").matches;

export function LandingAtelier({ onNext, onTalk, canTalk }: { onNext: () => void; onTalk: () => void; canTalk: boolean }) {
  const [mobileNote, setMobileNote] = useState(false);
  const start = () => (isMobile() ? setMobileNote(true) : onNext());
  const talk = () => (isMobile() ? setMobileNote(true) : onTalk());
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
            <button
              onClick={start}
              className="spring group flex items-center gap-3 rounded-full bg-ink px-10 py-5 text-xl font-medium text-[var(--page)] shadow-lg shadow-ink/10 hover:shadow-xl hover:shadow-ink/20"
            >
              Start a brief
              <kbd className="grid h-6 w-6 place-items-center rounded-full border border-[var(--page)]/30 text-xs leading-none">⏎</kbd>
            </button>

            {canTalk && (
              <button
                onClick={talk}
                className="group inline-flex items-center gap-2 font-serif text-lg italic text-ink/50 transition hover:text-accent"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full border border-ink/20 text-ink/60 transition group-hover:border-accent group-hover:text-accent">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" /></svg>
                </span>
                …or just talk it through
              </button>
            )}

            {mobileNote && (
              <div role="status" className="mt-2 max-w-xs rounded-2xl border border-ink/12 bg-[var(--page)]/80 px-6 py-5 text-center backdrop-blur">
                <p className="font-serif text-lg leading-snug text-ink">The studio is best on desktop.</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/55">For now, open this on a computer for the full naming experience. A mobile version is on the way.</p>
              </div>
            )}
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
