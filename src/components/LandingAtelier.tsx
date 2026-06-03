import { useRef } from "react";
import { useVoice } from "../lib/useVoice";
import { TYPE_META, type NameType } from "../lib/generate";
import { type PlanId } from "../lib/plans";

// A deliberately quiet, single-column, editorial layout — a "naming atelier".
// Hand-drawn strokes draw themselves in, as if an artist is sketching alongside.

const STEPS = [
  { n: "01", t: "Sit with the idea", note: "A sentence is enough. Say it out loud." },
  { n: "02", t: "Let names appear", note: "We sketch dozens, by hand and by type." },
  { n: "03", t: "Notice the one", note: "The right name feels obvious, quietly." },
  { n: "04", t: "Make it yours", note: "Domain, trademark, a brand to keep." },
];

const ATELIER_TYPES: NameType[] = ["Suggestive", "AbstractRealWord", "Evocative", "Invented", "Compound", "FounderName"];

export function LandingAtelier({ description, setDescription, onNext }: {
  description: string; setDescription: (s: string) => void; onNext: () => void; onCheckout: (p: PlanId) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { supported, listening, toggle } = useVoice((t) => setDescription(t));

  return (
    <div className="animate-in mx-auto max-w-2xl px-1 pt-10 sm:pt-16">
      {/* kicker */}
      <div className="flex items-center gap-3 text-ink/50">
        <Asterisk />
        <span className="font-serif text-lg italic">the naming atelier</span>
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

      {/* ruled notebook input */}
      <div className="mt-10">
        <label className="font-serif text-lg italic text-ink/55">I'm building…</label>
        <div className="relative mt-2">
          <textarea
            ref={taRef}
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && description.trim()) onNext(); }}
            rows={3}
            placeholder={listening ? "listening…" : "a calm budgeting tool for freelancers…"}
            className="ruled w-full resize-none bg-transparent pr-12 font-serif text-2xl leading-[2.35rem] outline-none placeholder:text-ink/25"
          />
          {supported && (
            <button
              onClick={() => { toggle(description); taRef.current?.focus(); }}
              title={listening ? "Stop" : "Dictate"}
              className={`absolute right-0 top-1 grid h-9 w-9 place-items-center rounded-full border transition ${listening ? "border-accent2 text-accent2" : "border-ink/20 text-ink/45 hover:border-ink/40"}`}
            >
              {listening ? <span className="h-2.5 w-2.5 rounded-full bg-accent2" /> : <Mic />}
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center gap-5">
          <button
            onClick={onNext}
            disabled={!description.trim()}
            className="group inline-flex items-center gap-2 font-serif text-xl italic text-ink transition disabled:opacity-30"
          >
            Begin the session
            <span className="transition group-enabled:group-hover:translate-x-1">→</span>
          </button>
          <span className="text-sm text-ink/40">~60 seconds · free preview</span>
        </div>
      </div>

      <Rule />

      {/* process — handwritten margin list */}
      <section id="process">
        <p className="font-serif text-2xl italic">How a name comes to be</p>
        <div className="mt-7 space-y-7">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-5">
              <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/25 font-serif text-sm">{s.n}</span>
              <div>
                <h3 className="text-xl">{s.t}</h3>
                <p className="mt-0.5 font-serif text-lg italic text-ink/50">{s.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* name types — quiet list, not cards */}
      <section id="types">
        <p className="font-serif text-2xl italic">Nine ways to name — a few favourites</p>
        <ul className="mt-6 divide-y divide-ink/10">
          {ATELIER_TYPES.map((t) => {
            const m = TYPE_META[t];
            return (
              <li key={t} className="flex items-baseline justify-between gap-4 py-3.5">
                <span className="text-lg">{m.label}{m.star && <span className="text-ink/40"> ✺</span>}</span>
                <span className="font-serif text-base italic text-ink/45">{m.examples}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <Rule />

      {/* pricing — minimal rows */}
      <section id="pricing">
        <p className="font-serif text-2xl italic">When you're ready to keep it</p>
        <div className="mt-6 space-y-px">
          <PriceRow name="Preview" price="Free" note="Your shortlist, scored" />
          <PriceRow name="Founder" price="€19" note="Names, domains, logo directions" />
          <PriceRow name="Launch" price="€89" note="Domain, INPI filing, full brand book" />
        </div>
      </section>

      <p className="mt-20 text-center font-serif text-2xl italic text-ink/55">
        “Good names aren't generated. They're noticed.”
      </p>
      <footer className="mt-10 border-t border-ink/10 py-8 text-center text-sm text-ink/35">
        © 2026 Brandr — Atelier · a V1 preview
      </footer>
    </div>
  );
}

function PriceRow({ name, price, note }: { name: string; price: string; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-4">
      <div className="flex items-baseline gap-3">
        <span className="text-lg">{name}</span>
        <span className="font-serif text-base italic text-ink/45">{note}</span>
      </div>
      <span className="font-serif text-xl">{price}</span>
    </div>
  );
}

function Rule() {
  return (
    <svg viewBox="0 0 600 12" className="my-16 h-3 w-full text-ink/30" preserveAspectRatio="none" fill="none">
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
