import { eur } from "../lib/plans";
import { OFFERS } from "./Paywall";

// The home — a calm, editorial hero. "Start a brief" leads into the flow;
// the brief itself is captured there, not on the landing.

const STEPS = [
  { n: "01", t: "Strategy", note: "Who it's for, what it must signal, what to avoid." },
  { n: "02", t: "Concept", note: "Territories to mine — the story your name lives in." },
  { n: "03", t: "Word", note: "Raw material: roots, metaphors, foreign gems." },
  { n: "04", t: "Name", note: "Candidates, scored and stress-tested. Then you pick." },
];

type Cell = boolean | string;
// Free everything creative; pay only to "make it real" once you have a shortlist.
const PRICE_COLS = ["The studio", "Reality check", "Name it + ship it"];
const PRICE_ROWS: { f: string; vals: [Cell, Cell, Cell] }[] = [
  { f: "Full naming flow — brief → concepts → words → names", vals: [true, true, true] },
  { f: "4-axis SMILE scoring", vals: [true, true, true] },
  { f: "Scored shortlist & recommendation", vals: [true, true, true] },
  { f: "🌐 Domain availability across registers", vals: [false, true, true] },
  { f: "🇫🇷 INPI / EUIPO trademark check", vals: [false, true, true] },
  { f: "📕 Full brand book (logo, colors, type, voice)", vals: [false, false, true] },
];

export function LandingAtelier({ onNext, onTalk, canTalk }: { onNext: () => void; onTalk: () => void; canTalk: boolean }) {
  return (
    <div className="animate-in">
      {/* hero */}
      <section className="mx-auto flex min-h-[74vh] max-w-3xl flex-col items-center justify-center px-2 text-center">
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
          <a
            href="#process"
            className="rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-6 py-3.5 text-base font-medium text-ink transition hover:border-ink/40"
          >
            See how it works
          </a>
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

      {/* how it works */}
      <section id="process" className="mx-auto mt-10 max-w-3xl border-t border-ink/10 px-2 pt-14">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/40">How it works</p>
        <h2 className="mt-3 text-3xl">From a blank page to a name you own.</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-lg border border-ink/15 p-4 text-left">
              <span className="font-mono text-xs text-ink/35">{s.n}</span>
              <h3 className="mt-1 text-xl">{s.t}</h3>
              <p className="mt-1 text-sm leading-snug text-ink/50">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="mx-auto mt-14 max-w-3xl border-t border-ink/10 px-2 pt-14">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/40">Pricing</p>
        <h2 className="mt-3 text-3xl">Start free. Pay when you're sure.</h2>
        <div className="mt-7 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/25">
                <th className="py-3 pr-4 font-normal text-ink/45"></th>
                {PRICE_COLS.map((c, i) => (
                  <th key={c} className={`px-4 py-3 text-center font-serif text-lg italic ${i === 2 ? "bg-accent/5 text-ink" : "text-ink/70"}`}>
                    {c}{i === 2 && <span className="text-accent"> ★</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {PRICE_ROWS.map((r) => (
                <tr key={r.f}>
                  <td className="py-3 pr-4 text-ink/60">{r.f}</td>
                  {r.vals.map((v, i) => (
                    <td key={i} className={`px-4 py-3 text-center ${i === 2 ? "bg-accent/5" : ""}`}>
                      {typeof v === "string" ? <span className="font-medium text-ink/80">{v}</span> : v ? <span className="text-accent">✓</span> : <span className="text-ink/20">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-ink/25">
                <td className="py-4 pr-4 font-serif text-lg italic">Price</td>
                <td className="px-4 py-4 text-center font-serif text-xl">Free</td>
                <td className="px-4 py-4 text-center font-serif text-xl">{eur(OFFERS.check.price)}</td>
                <td className="bg-accent/5 px-4 py-4 text-center font-serif text-xl">
                  {eur(OFFERS.bundle.price)} <span className="ml-1 font-mono text-xs text-ink/35 line-through">{eur(OFFERS.bundle.was)}</span>
                </td>
              </tr>
              <tr>
                <td className="pr-4"></td>
                <td className="px-2 py-3 text-center">
                  <button onClick={onNext} className="rounded-md border border-ink/40 px-4 py-2 font-serif text-base italic transition hover:bg-ink/5">Start free →</button>
                </td>
                <td colSpan={2} className="px-2 py-3 text-center font-mono text-xs uppercase tracking-wide text-ink/40">
                  Unlocked after your shortlist — pay when you're sure
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* footer bar */}
      <footer className="mx-auto mt-16 flex max-w-3xl flex-col items-center justify-between gap-2 border-t border-ink/10 px-2 py-7 font-mono text-[11px] uppercase tracking-widest text-ink/35 sm:flex-row">
        <span>© 2026</span>
        <span className="text-ink/45">Strategy → Concept → Word → Name</span>
        <span className="flex gap-4"><a href="#pricing" className="hover:text-ink">Pricing</a><span>Manifesto</span></span>
      </footer>
    </div>
  );
}
