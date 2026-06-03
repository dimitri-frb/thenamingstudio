import { useRef } from "react";
import { useVoice } from "../lib/useVoice";
import { eur, PLANS, type PlanId } from "../lib/plans";

// Calm, editorial "naming atelier" — but with varied component shapes so the
// page doesn't read as one long list: a framed rectangle for the brief,
// bordered tiles for the process, a hairline list for types, a real table for
// pricing.

const STEPS = [
  { n: "01", t: "Sit with the idea", note: "A sentence is enough. Say it out loud." },
  { n: "02", t: "Let names appear", note: "We sketch dozens, by hand and by type." },
  { n: "03", t: "Notice the one", note: "The right name feels obvious, quietly." },
  { n: "04", t: "Make it yours", note: "Domain, trademark, a brand to keep." },
];

type Cell = boolean | string;
const PRICE_COLS = ["Preview", "Founder", "Launch"];
const PRICE_ROWS: { f: string; vals: [Cell, Cell, Cell] }[] = [
  { f: "Names", vals: ["8", "60+", "60+"] },
  { f: "4-axis brand scores", vals: [true, true, true] },
  { f: "Domain search", vals: [false, true, true] },
  { f: "INPI / EUIPO check", vals: [false, true, true] },
  { f: "Domain registered", vals: [false, false, true] },
  { f: "Trademark filed", vals: [false, false, true] },
  { f: "Brand book (PDF)", vals: [false, false, true] },
];

export function LandingAtelier({ description, setDescription, onNext, onCheckout }: {
  description: string; setDescription: (s: string) => void; onNext: () => void; onCheckout: (p: PlanId) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { supported, listening, toggle } = useVoice((t) => setDescription(t));

  return (
    <div className="animate-in mx-auto max-w-2xl px-1 pt-10 sm:pt-16">
      {/* kicker */}
      <div className="flex items-center gap-3 text-ink/50">
        <Asterisk />
        <span className="font-serif text-lg italic">naming, the slow way</span>
      </div>

      {/* hero */}
      <h1 className="mt-8 text-5xl leading-[1.08] sm:text-6xl">
        Let's name the thing
        <br />
        you're <Underlined>making</Underlined>.
      </h1>
      <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink/60">
        No noise. No fifty open tabs. Just you, a quiet page, and a name worth
        keeping. Write it down — or say it aloud.
      </p>

      {/* the brief — a framed rectangle */}
      <div className="mt-10 rounded-xl border border-ink/25 p-1.5">
        <div className="rounded-lg border border-ink/12 bg-[var(--surface-solid)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-serif text-lg italic text-ink/55">the brief</span>
            <span className="text-[11px] uppercase tracking-[0.25em] text-ink/35">no.1</span>
          </div>
          <div className="relative">
            <textarea
              ref={taRef}
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && description.trim()) onNext(); }}
              rows={3}
              placeholder={listening ? "listening…" : "a calm budgeting tool for freelancers…"}
              className="w-full resize-none bg-transparent pr-10 font-serif text-2xl leading-snug outline-none placeholder:text-ink/25"
            />
            {supported && (
              <button
                onClick={() => { toggle(description); taRef.current?.focus(); }}
                title={listening ? "Stop" : "Dictate"}
                className={`absolute right-0 top-0 grid h-9 w-9 place-items-center rounded-full border transition ${listening ? "border-accent2 text-accent2" : "border-ink/20 text-ink/45 hover:border-ink/40"}`}
              >
                {listening ? <span className="h-2.5 w-2.5 rounded-full bg-accent2" /> : <Mic />}
              </button>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4">
            <span className="text-sm text-ink/40">~60 seconds · free preview</span>
            <button
              onClick={onNext}
              disabled={!description.trim()}
              className="group rounded-md border border-ink/30 px-5 py-2.5 font-serif text-lg italic transition hover:bg-ink/5 disabled:opacity-30"
            >
              Begin the session <span className="transition group-enabled:group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>
      </div>

      <Rule />

      {/* process — bordered tiles (rectangles), not a list */}
      <section id="process">
        <p className="font-serif text-2xl italic">How a name comes to be</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-lg border border-ink/15 p-4">
              <span className="font-serif text-2xl text-ink/35">{s.n}</span>
              <h3 className="mt-1 text-lg">{s.t}</h3>
              <p className="mt-0.5 font-serif text-base italic text-ink/50">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* pricing — a real comparison table */}
      <section id="pricing">
        <p className="font-serif text-2xl italic">When you're ready to keep it</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/25">
                <th className="py-3 pr-4 font-normal text-ink/45"></th>
                {PRICE_COLS.map((c, i) => (
                  <th key={c} className={`px-4 py-3 text-center font-serif text-lg italic ${i === 1 ? "bg-ink/[0.04] text-ink" : "text-ink/70"}`}>
                    {c}{i === 1 && <span className="text-ink/40"> ✺</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {PRICE_ROWS.map((r) => (
                <tr key={r.f}>
                  <td className="py-3 pr-4 text-ink/60">{r.f}</td>
                  {r.vals.map((v, i) => (
                    <td key={i} className={`px-4 py-3 text-center ${i === 1 ? "bg-ink/[0.04]" : ""}`}>
                      {typeof v === "string" ? <span className="font-medium text-ink/80">{v}</span> : v ? <span className="text-accent">✓</span> : <span className="text-ink/20">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-ink/25">
                <td className="py-4 pr-4 font-serif text-lg italic">Price</td>
                <td className="px-4 py-4 text-center font-serif text-xl">Free</td>
                <td className="bg-ink/[0.04] px-4 py-4 text-center font-serif text-xl">{eur(PLANS.founder.price)}</td>
                <td className="px-4 py-4 text-center font-serif text-xl">{eur(PLANS.launch.price)}</td>
              </tr>
              <tr>
                <td className="pr-4"></td>
                <td className="px-2 py-3 text-center text-xs text-ink/40">you're here</td>
                <td className="bg-ink/[0.04] px-2 py-3 text-center">
                  <button onClick={() => onCheckout("founder")} className="rounded-md border border-ink/40 px-4 py-2 font-serif text-base italic transition hover:bg-ink/5">Choose →</button>
                </td>
                <td className="px-2 py-3 text-center">
                  <button onClick={() => onCheckout("launch")} className="rounded-md border border-ink/40 px-4 py-2 font-serif text-base italic transition hover:bg-ink/5">Choose →</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-20 text-center font-serif text-2xl italic text-ink/55">
        “Good names aren't generated. They're noticed.”
      </p>
      <footer className="mt-10 border-t border-ink/10 py-8 text-center text-sm text-ink/35">
        © 2026 the naming atelier — a V1 preview
      </footer>
    </div>
  );
}

function Rule() {
  return (
    <svg viewBox="0 0 600 12" className="my-14 h-3 w-full text-ink/30" preserveAspectRatio="none" fill="none">
      <path className="draw" style={{ ["--len" as string]: 620 }} d="M2 7 C 120 2, 220 11, 340 6 S 520 2, 598 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Underlined({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      <svg viewBox="0 0 200 18" className="absolute -bottom-2 left-0 h-3 w-full text-accent2" preserveAspectRatio="none" fill="none">
        <path className="draw" style={{ ["--len" as string]: 230 }} d="M3 12 C 50 4, 150 4, 197 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Asterisk() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className="text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path className="draw" style={{ ["--len" as string]: 60 }} d="M12 3v18M4.5 7l15 10M19.5 7l-15 10" />
    </svg>
  );
}

function Mic() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
  );
}
