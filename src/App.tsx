import { useEffect, useMemo, useRef, useState } from "react";
import {
  generateNames,
  TYPE_META,
  type Brief,
  type NameIdea,
  type NameType,
  type Vibe,
} from "./lib/generate";
import { useVoice } from "./lib/useVoice";
import { Results } from "./components/Results";

type Screen = "landing" | "vibe" | "types" | "refine" | "generating" | "results";

const VIBES: { key: Vibe; emoji: string; hint: string }[] = [
  { key: "Modern", emoji: "✨", hint: "clean, current" },
  { key: "Bold", emoji: "🔥", hint: "loud, confident" },
  { key: "Playful", emoji: "🎈", hint: "fun, human" },
  { key: "Premium", emoji: "💎", hint: "high-end" },
  { key: "Minimal", emoji: "⚪", hint: "simple, quiet" },
  { key: "Techy", emoji: "⚡", hint: "engineered" },
  { key: "Friendly", emoji: "🤝", hint: "warm, approachable" },
  { key: "Trustworthy", emoji: "🛡️", hint: "solid, safe" },
];

const TYPE_ORDER: NameType[] = [
  "Suggestive", "Compound", "Invented", "AbstractRealWord",
  "Evocative", "Playful", "Descriptive", "FounderName", "Acronym",
];

const EXAMPLES = [
  "An AI app that turns voice notes into polished blog posts",
  "A marketplace for renting camera gear between creators",
  "A budgeting tool for freelancers with irregular income",
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [description, setDescription] = useState("");
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [types, setTypes] = useState<NameType[]>(["Suggestive"]);
  const [include, setInclude] = useState("");
  const [avoid, setAvoid] = useState("");
  const [results, setResults] = useState<NameIdea[]>([]);

  const brief: Brief = useMemo(
    () => ({ description, vibes, types, include, avoid }),
    [description, vibes, types, include, avoid],
  );

  function toggle<T>(arr: T[], v: T, setter: (a: T[]) => void, max = 99) {
    if (arr.includes(v)) setter(arr.filter((x) => x !== v));
    else if (arr.length < max) setter([...arr, v]);
  }

  function run() {
    setScreen("generating");
    window.setTimeout(() => {
      setResults(generateNames(brief, 60));
      setScreen("results");
    }, 1900);
  }

  function restart() {
    setScreen("landing");
    setResults([]);
  }

  return (
    <div className="min-h-screen mesh">
      <Header onLogo={restart} />
      <main className="mx-auto w-full max-w-5xl px-5 pb-24">
        {screen === "landing" && (
          <Landing description={description} setDescription={setDescription} onNext={() => setScreen("vibe")} />
        )}

        {(screen === "vibe" || screen === "types" || screen === "refine") && (
          <Wizard step={screen}>
            {screen === "vibe" && (
              <Step
                index={1}
                title="What's the personality?"
                subtitle="Pick up to 3. This is your tone — it shapes every name."
                onBack={() => setScreen("landing")}
                onNext={() => setScreen("types")}
                canNext={vibes.length > 0}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {VIBES.map((v) => (
                    <Chip key={v.key} active={vibes.includes(v.key)} onClick={() => toggle(vibes, v.key, setVibes, 3)}>
                      <span className="text-2xl">{v.emoji}</span>
                      <span className="mt-2 block font-semibold">{v.key}</span>
                      <span className="block text-xs text-white/40">{v.hint}</span>
                    </Chip>
                  ))}
                </div>
              </Step>
            )}

            {screen === "types" && (
              <Step
                index={2}
                title="Pick your naming lane"
                subtitle="The type of name shapes everything. ★ Suggestive is the sweet spot for most startups."
                onBack={() => setScreen("vibe")}
                onNext={() => setScreen("refine")}
                canNext={types.length > 0}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {TYPE_ORDER.map((t) => {
                    const m = TYPE_META[t];
                    return (
                      <Chip key={t} active={types.includes(t)} onClick={() => toggle(types, t, setTypes)} align="left">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {m.label} {m.star && <span className="text-amber-400">★</span>}
                          </span>
                          <span className="text-xs text-white/40">{m.examples}</span>
                        </div>
                        <span className="mt-1 block text-sm text-white/50">{m.desc}</span>
                      </Chip>
                    );
                  })}
                </div>
              </Step>
            )}

            {screen === "refine" && (
              <Step
                index={3}
                title="Any must-haves?"
                subtitle="Optional. Steer the generator with words to keep or avoid."
                onBack={() => setScreen("types")}
                onNext={run}
                nextLabel="Generate names →"
                canNext
              >
                <div className="space-y-5">
                  <Field label="Words to include or hint at" placeholder="e.g. lens, focus, capture" value={include} onChange={setInclude} />
                  <Field label="Words to avoid" placeholder="e.g. snap, pro, hub" value={avoid} onChange={setAvoid} />
                  <Recap brief={brief} />
                </div>
              </Step>
            )}
          </Wizard>
        )}

        {screen === "generating" && <Generating description={description} />}

        {screen === "results" && (
          <Results
            results={results}
            brief={brief}
            onMore={() => setResults(generateNames(brief, 60, String(performance.now())))}
            onRestart={restart}
          />
        )}
      </main>
      {screen === "landing" && <Footer />}
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header({ onLogo }: { onLogo: () => void }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6">
      <button onClick={onLogo} className="group flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-black text-white shadow-lg shadow-fuchsia-500/20">B</span>
        <span className="text-lg font-bold tracking-tight">Brandr</span>
      </button>
      <div className="hidden items-center gap-6 text-sm text-white/60 sm:flex">
        <a href="#process" className="hover:text-white">Process</a>
        <a href="#types" className="hover:text-white">Name types</a>
        <a href="#pricing" className="hover:text-white">Pricing</a>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">🇫🇷 INPI-ready</span>
      </div>
    </header>
  );
}

/* ---------------- Landing ---------------- */
function Landing({ description, setDescription, onNext }: { description: string; setDescription: (s: string) => void; onNext: () => void }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { supported, listening, error, toggle } = useVoice((t) => setDescription(t));

  return (
    <div className="animate-in pt-10 text-center sm:pt-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        From idea → registered brand, in one flow
      </span>
      <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
        Name your company in
        <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-sky-400 bg-clip-text text-transparent"> the next 60 seconds</span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-white/55">
        Describe what you're building — by typing or just talking. Get brandable
        names, domain checks, and a path to file your trademark.
      </p>

      <div className="mx-auto mt-9 max-w-2xl text-left">
        <label className="mb-2 block text-sm font-medium text-white/60">What are you building?</label>
        <div className={`glass rounded-2xl p-2 transition ${listening ? "border-fuchsia-400/60" : "focus-within:border-fuchsia-400/40"}`}>
          <div className="relative">
            <textarea
              ref={taRef}
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && description.trim()) onNext();
              }}
              rows={3}
              placeholder={listening ? "Listening… start talking" : "An AI app that turns voice notes into polished blog posts…"}
              className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-lg outline-none placeholder:text-white/25"
            />
            {supported && (
              <button
                onClick={() => { toggle(description); taRef.current?.focus(); }}
                title={listening ? "Stop dictation" : "Dictate your idea"}
                className={`absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-xl transition ${
                  listening
                    ? "bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30"
                    : "border border-white/10 text-white/60 hover:border-white/30 hover:text-white"
                }`}
                aria-label="Toggle voice input"
              >
                {listening ? <PulsingMic /> : <MicIcon />}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setDescription(ex)} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/40 transition hover:border-white/25 hover:text-white/70">
                  {ex.length > 34 ? ex.slice(0, 34) + "…" : ex}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-1.5 h-4 text-xs">
          {listening && <span className="text-fuchsia-400">● Listening — speak naturally, then tap the mic to stop.</span>}
          {error && <span className="text-amber-400">{error}. You can type instead.</span>}
          {!listening && !error && supported && <span className="text-white/35">Tip: tap the mic 🎙️ to describe your idea out loud.</span>}
        </div>

        <button
          onClick={onNext}
          disabled={!description.trim()}
          className="mt-3 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-4 text-base font-semibold shadow-xl shadow-fuchsia-500/20 transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start naming →
        </button>
        <p className="mt-3 text-center text-xs text-white/35">Free preview · no signup · ~60 seconds</p>
      </div>

      <Process />
      <NameTypes />
      <Pricing />
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
  );
}
function PulsingMic() {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
    </span>
  );
}

/* ---------------- The 5-phase process (from research) ---------------- */
function Process() {
  const phases = [
    { n: "01", t: "Strategic foundation", d: "Define the job your name must do — audience, what it must signal, anti-goals." },
    { n: "02", t: "Generation", d: "Volume first. 50+ options across 9 name types — get past the obvious ideas." },
    { n: "03", t: "Filtering", d: "Score on 4 axes (Intuitive · Visual · Sound · Emotional) + the SMILE check." },
    { n: "04", t: "Validation", d: "Domain availability + 🇫🇷 INPI / EUIPO trademark search + registry check." },
    { n: "05", t: "Decision", d: "Pick, commit, secure the domain & social handles, and file the trademark." },
  ];
  return (
    <section id="process" className="mt-28">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">The naming process</h2>
      <p className="mt-2 text-white/55">A real framework — from strategic brief to a name you own. Not a random generator.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-5">
        {phases.map((p) => (
          <div key={p.n} className="glass rounded-2xl p-5 text-left">
            <span className="text-2xl font-black text-white/15">{p.n}</span>
            <h3 className="mt-2 font-semibold">{p.t}</h3>
            <p className="mt-1 text-sm text-white/50">{p.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 9 name types showcase ---------------- */
function NameTypes() {
  return (
    <section id="types" className="mt-28">
      <h2 className="text-center text-3xl font-bold tracking-tight">9 ways to name a company</h2>
      <p className="mt-2 text-center text-white/50">Every great name fits a type. We generate across all of them — you pick the lane.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {TYPE_ORDER.map((t) => {
          const m = TYPE_META[t];
          return (
            <div key={t} className={`rounded-2xl p-5 text-left ${m.star ? "border border-amber-400/30 bg-amber-400/5" : "glass"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{m.label} {m.star && <span className="text-amber-400">★</span>}</h3>
              </div>
              <p className="mt-0.5 text-xs text-white/40">{m.examples}</p>
              <p className="mt-2 text-sm text-white/55">{m.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */
function Pricing() {
  const tiers = [
    { name: "Preview", price: "Free", tagline: "Find your shortlist", features: ["8 names across your chosen types", "4-axis brand-strength scores", "Domain availability hints"], cta: "You're here", highlight: false },
    { name: "Founder", price: "€19", tagline: "Everything to decide", features: ["60+ names, unlimited regenerations", "Live domain search across TLDs", "INPI / EUIPO trademark conflict check 🇫🇷", "Logo & color directions"], cta: "Unlock Founder", highlight: true },
    { name: "Launch", price: "€89", tagline: "Go from name to filed", features: ["Everything in Founder", "Domain registration handled", "Trademark filing with INPI", "Full brand book (PDF)"], cta: "Get Launch", highlight: false },
  ];
  return (
    <section id="pricing" className="mt-28">
      <h2 className="text-center text-3xl font-bold tracking-tight">Start free. Pay when you're sure.</h2>
      <p className="mt-3 text-center text-white/50">The name generation is the preview. Going further is where we shine.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className={`relative rounded-3xl p-6 text-left ${t.highlight ? "border border-fuchsia-400/40 bg-gradient-to-b from-fuchsia-500/10 to-transparent shadow-2xl shadow-fuchsia-500/10" : "glass"}`}>
            {t.highlight && <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 py-1 text-xs font-semibold">Most popular</span>}
            <h3 className="font-semibold">{t.name}</h3>
            <p className="text-sm text-white/45">{t.tagline}</p>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-4xl font-extrabold">{t.price}</span>
              {t.price !== "Free" && <span className="mb-1 text-white/40">one-time</span>}
            </div>
            <ul className="mt-5 space-y-2.5 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2 text-white/70"><span className="text-emerald-400">✓</span>{f}</li>
              ))}
            </ul>
            <button className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${t.highlight ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:brightness-110" : "border border-white/15 hover:bg-white/5"}`}>{t.cta}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Wizard shell ---------------- */
function Wizard({ step, children }: { step: Screen; children: React.ReactNode }) {
  const order: Screen[] = ["vibe", "types", "refine"];
  const idx = order.indexOf(step);
  const pct = ((idx + 1) / order.length) * 100;
  return (
    <div className="pt-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        {children}
      </div>
    </div>
  );
}

function Step({ index, title, subtitle, children, onBack, onNext, canNext, nextLabel = "Continue" }: {
  index: number; title: string; subtitle: string; children: React.ReactNode; onBack: () => void; onNext: () => void; canNext: boolean; nextLabel?: string;
}) {
  return (
    <div key={index} className="animate-in">
      <p className="text-sm font-medium text-fuchsia-400">Step {index} of 3</p>
      <h2 className="mt-1 text-3xl font-bold tracking-tight">{title}</h2>
      <p className="mt-2 text-white/50">{subtitle}</p>
      <div className="mt-7">{children}</div>
      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-white/50 transition hover:text-white">← Back</button>
        <button onClick={onNext} disabled={!canNext} className="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold shadow-lg shadow-fuchsia-500/20 transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{nextLabel}</button>
      </div>
    </div>
  );
}

function Chip({ children, active, onClick, align = "center" }: { children: React.ReactNode; active: boolean; onClick: () => void; align?: "center" | "left" }) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-4 transition ${align === "center" ? "text-center" : "text-left"} ${active ? "border-fuchsia-400/60 bg-fuchsia-500/10 shadow-lg shadow-fuchsia-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
      {children}
    </button>
  );
}

function Field({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/60">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="glass w-full rounded-xl px-4 py-3 outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/40" />
    </div>
  );
}

function Recap({ brief }: { brief: Brief }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm">
      <p className="mb-2 font-medium text-white/60">Your brief</p>
      <div className="space-y-1.5 text-white/45">
        <p className="line-clamp-2">💡 {brief.description || "—"}</p>
        <p>🎨 {brief.vibes.length ? brief.vibes.join(", ") : "Any tone"}</p>
        <p>🔤 {brief.types.length ? brief.types.map((t) => TYPE_META[t].label).join(", ") : "Mixed types"}</p>
      </div>
    </div>
  );
}

/* ---------------- Generating ---------------- */
function Generating({ description }: { description: string }) {
  const lines = ["Reading your brief…", "Exploring name territories…", "Generating across 9 types…", "Checking domains…", "Scoring on 4 axes…"];
  const [i, setI] = useState(0);
  const ref = useRef<number | undefined>(undefined);
  useEffect(() => {
    ref.current = window.setInterval(() => setI((x) => Math.min(x + 1, lines.length - 1)), 360);
    return () => window.clearInterval(ref.current);
  }, []);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 animate-ping rounded-2xl bg-fuchsia-500/30" />
        <div className="relative grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-3xl font-black shadow-2xl shadow-fuchsia-500/30">B</div>
      </div>
      <p className="mt-8 text-xl font-semibold">{lines[i]}</p>
      <p className="mt-2 max-w-sm text-sm text-white/40 line-clamp-1">"{description || "your idea"}"</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mx-auto mt-20 w-full max-w-5xl border-t border-white/10 px-5 py-10 text-sm text-white/35">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <span>© 2026 Brandr — a V1 preview.</span>
        <span>Domain & 🇫🇷 INPI trademark integrations · demo data</span>
      </div>
    </footer>
  );
}
