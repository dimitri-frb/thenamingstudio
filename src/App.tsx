import { useEffect, useMemo, useRef, useState } from "react";
import {
  generateNames,
  TYPE_META,
  type Brief,
  type NameIdea,
  type NameType,
  type Vibe,
} from "./lib/generate";
import { Results } from "./components/Results";
import { Checkout } from "./components/Checkout";
import { JourneyRail } from "./components/Journey";
import { LandingAtelier } from "./components/LandingAtelier";
import { ClassicFlow } from "./components/ClassicFlow";
import { Conversation } from "./components/Conversation";
import { PublicVote } from "./components/PublicVote";
import { BrandBook } from "./components/BrandBook";
import { BrandMark, Wordmark } from "./components/Logo";
import { type PlanId } from "./lib/plans";
import { type Brief as StudioBrief } from "./lib/namingApi";

type Screen = "landing" | "talk" | "classic" | "vibe" | "types" | "refine" | "generating" | "results";

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

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  // Brief is captured inside the flow now (not on the landing).
  const [description] = useState("");
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [types, setTypes] = useState<NameType[]>(["Suggestive"]);
  const [include, setInclude] = useState("");
  const [avoid, setAvoid] = useState("");
  const [results, setResults] = useState<NameIdea[]>([]);
  const [checkout, setCheckout] = useState<PlanId | null>(null);
  const [seedBrief, setSeedBrief] = useState<StudioBrief | null>(null);
  // A shared "?vote=Name1|Name2&by=…&about=…" link drops friends straight into
  // the swipe vote, with context on who's asking and what the project is.
  const [friendVote, setFriendVote] = useState<{ names: string[]; by: string; about: string } | null>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const names = (p.get("vote") || "").split("|").map((s) => s.trim()).filter(Boolean).slice(0, 10);
      if (!names.length) return null;
      return { names, by: (p.get("by") || "").trim().slice(0, 40), about: (p.get("about") || "").trim().slice(0, 180) };
    } catch { return null; }
  });
  // "?brandbook" (optionally "?brandbook=YourName") jumps straight to a demo
  // brand book with sample data — no need to run the whole flow.
  const [brandBookDemo, setBrandBookDemo] = useState<{ name: string; brief: StudioBrief } | null>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (!p.has("brandbook")) return null;
      const raw = (p.get("brandbook") || "").trim();
      const name = raw && !/^(1|true|yes|demo)$/i.test(raw) ? raw.slice(0, 40) : "Lumora";
      const brief: StudioBrief = {
        does: "An AI naming studio that helps founders find a brand name with the rigor of a strategist, in minutes not months",
        industry: "Creator tools · SaaS",
        problem: "Founders waste weeks naming and settle for something generic",
        audience: "first-time founders",
        values: "taste, speed, a defensible result",
        uvp: "a naming studio in your pocket",
        signal: ["Bold", "Warm", "Clear", "Modern"],
        avoid: [],
        tone: ["Modern", "Confident", "Warm"],
        lanes: ["suggestive", "invented", "evocative"],
      };
      return { name, brief };
    } catch { return null; }
  });

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
    setSeedBrief(null);
  }

  const journeyIndex = screen === "generating" || screen === "results" ? 1 : 0;
  const showJourney = screen === "vibe" || screen === "types" || screen === "refine" || screen === "generating" || screen === "results";

  // Direct brand-book demo (?brandbook): show only the brand book.
  if (brandBookDemo) {
    return (
      <div className="min-h-screen mesh">
        <BrandBook
          brief={brandBookDemo.brief}
          name={brandBookDemo.name}
          onClose={() => { setBrandBookDemo(null); try { window.history.replaceState(null, "", window.location.pathname); } catch { /* noop */ } }}
        />
      </div>
    );
  }

  // Friend arriving via a shared vote link: show only the swipe vote.
  if (friendVote) {
    return (
      <div className="min-h-screen mesh">
        <PublicVote
          items={friendVote.names.map((n) => ({ name: n }))}
          by={friendVote.by}
          about={friendVote.about}
          onClose={() => { setFriendVote(null); try { window.history.replaceState(null, "", window.location.pathname); } catch { /* noop */ } }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh">
      <Header onLogo={restart} />
      {showJourney && <JourneyRail activeIndex={journeyIndex} onCheckout={setCheckout} />}
      <main className="mx-auto w-full max-w-5xl px-5 pb-24">
        {screen === "landing" && (
          /* Works everywhere: real Claude via the bridge in dev, client-side studio fallback on static hosting. */
          <LandingAtelier
            onNext={() => setScreen("classic")}
            onTalk={() => setScreen("talk")}
            canTalk
          />
        )}

        {screen === "talk" && (
          <Conversation
            voiceFirst
            onComplete={(b) => { setSeedBrief(b); setScreen("classic"); }}
            onCancel={restart}
          />
        )}

        {screen === "classic" && <ClassicFlow initialDoes={description} seedBrief={seedBrief} onRestart={restart} />}

        {(screen === "vibe" || screen === "types" || screen === "refine") && (
          <Wizard>
            {screen === "vibe" && (
              <Step
                index={1}
                title="What's the personality?"
                subtitle="Pick up to 3. This is your tone, it shapes every name."
                onBack={() => setScreen("landing")}
                onNext={() => setScreen("types")}
                canNext={vibes.length > 0}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {VIBES.map((v) => (
                    <Chip key={v.key} active={vibes.includes(v.key)} onClick={() => toggle(vibes, v.key, setVibes, 3)}>
                      <span className="text-2xl">{v.emoji}</span>
                      <span className="mt-2 block font-semibold">{v.key}</span>
                      <span className="block text-xs text-ink/40">{v.hint}</span>
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
                            {m.label} {m.star && <span className="text-accent">★</span>}
                          </span>
                          <span className="font-mono text-xs text-ink/40">{m.examples}</span>
                        </div>
                        <span className="mt-1 block text-sm text-ink/50">{m.desc}</span>
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
            onCheckout={setCheckout}
          />
        )}
      </main>

      {checkout && <Checkout planId={checkout} onClose={() => setCheckout(null)} />}
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header({ onLogo }: { onLogo: () => void }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-6">
      <button onClick={onLogo} className="group flex items-center gap-2.5">
        <BrandMark />
        <Wordmark />
      </button>
      <div className="hidden items-center gap-6 font-mono text-xs uppercase tracking-widest text-ink/45 sm:flex">
        <span className="rounded-full border border-ink/15 px-3 py-1">🇫🇷 INPI-ready</span>
      </div>
    </header>
  );
}

/* ---------------- Wizard shell (offline demo funnel) ---------------- */
function Wizard({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-8">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );
}

function Step({ index, title, subtitle, children, onBack, onNext, canNext, nextLabel = "Continue" }: {
  index: number; title: string; subtitle: string; children: React.ReactNode; onBack: () => void; onNext: () => void; canNext: boolean; nextLabel?: string;
}) {
  return (
    <div key={index} className="animate-in">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Step {index} of 3</p>
      <h2 className="mt-1 text-3xl tracking-tight">{title}</h2>
      <p className="mt-2 text-ink/50">{subtitle}</p>
      <div className="mt-7">{children}</div>
      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-ink/50 transition hover:text-ink">← Back</button>
        <button onClick={onNext} disabled={!canNext} className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30">{nextLabel}</button>
      </div>
    </div>
  );
}

function Chip({ children, active, onClick, align = "center" }: { children: React.ReactNode; active: boolean; onClick: () => void; align?: "center" | "left" }) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-4 transition ${align === "center" ? "text-center" : "text-left"} ${active ? "border-accent bg-accent/5 shadow-sm" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"}`}>
      {children}
    </button>
  );
}

function Field({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink/60">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-4 py-3 outline-none transition placeholder:text-ink/25 focus:border-accent/50" />
    </div>
  );
}

function Recap({ brief }: { brief: Brief }) {
  return (
    <div className="rounded-2xl border border-ink/15 bg-[var(--surface-solid)] p-4 text-sm">
      <p className="mb-2 font-serif text-lg italic text-ink/60">Your brief</p>
      <div className="space-y-1.5 text-ink/45">
        <p className="line-clamp-2">💡 {brief.description || ", "}</p>
        <p>🎨 {brief.vibes.length ? brief.vibes.join(", ") : "Any tone"}</p>
        <p>🔤 {brief.types.length ? brief.types.map((t) => TYPE_META[t].label).join(", ") : "Mixed types"}</p>
      </div>
    </div>
  );
}

/* ---------------- Generating (offline demo) ---------------- */
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
        <div className="absolute inset-0 animate-ping rounded-2xl bg-accent2/30" />
        <BrandMark className="relative h-20 w-20 rounded-2xl shadow-2xl shadow-accent2/30" />
      </div>
      <p className="mt-8 font-serif text-2xl italic">{lines[i]}</p>
      <p className="mt-2 max-w-sm text-sm text-ink/40 line-clamp-1">"{description || "your idea"}"</p>
    </div>
  );
}
