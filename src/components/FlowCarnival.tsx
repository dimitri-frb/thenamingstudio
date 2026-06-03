import { useEffect, useState } from "react";
import { TYPE_META, type NameType, type Vibe } from "../lib/generate";

// Carnival's own funnel — big tappable blocks, loud copy, a sticky bottom
// action bar so the next step is always one thumb-tap away. Mobile-first.

type Step = "vibe" | "types" | "refine";

const VIBES: { key: Vibe; emoji: string }[] = [
  { key: "Modern", emoji: "✨" },
  { key: "Bold", emoji: "🔥" },
  { key: "Playful", emoji: "🎈" },
  { key: "Premium", emoji: "💎" },
  { key: "Minimal", emoji: "⚪" },
  { key: "Techy", emoji: "⚡" },
  { key: "Friendly", emoji: "🤝" },
  { key: "Trustworthy", emoji: "🛡️" },
];

const TYPE_ORDER: NameType[] = [
  "Suggestive", "Compound", "Invented", "AbstractRealWord",
  "Evocative", "Playful", "Descriptive", "FounderName", "Acronym",
];

const STICKER = ["var(--color-accent)", "var(--color-accent2)", "var(--color-accent3)", "#06b6d4", "#84cc16", "#f43f5e"];

const STEP_NO: Record<Step, number> = { vibe: 1, types: 2, refine: 3 };
const PREV: Record<Step, "landing" | Step> = { vibe: "landing", types: "vibe", refine: "types" };
const NEXT: Record<Step, Step> = { vibe: "types", types: "refine", refine: "refine" };

export function FlowCarnival(props: {
  step: Step;
  goTo: (s: "landing" | Step) => void;
  run: () => void;
  vibes: Vibe[]; setVibes: (v: Vibe[]) => void;
  types: NameType[]; setTypes: (t: NameType[]) => void;
  include: string; setInclude: (s: string) => void;
  avoid: string; setAvoid: (s: string) => void;
}) {
  const { step, goTo, run, vibes, setVibes, types, setTypes, include, setInclude, avoid, setAvoid } = props;

  const toggleVibe = (v: Vibe) =>
    setVibes(vibes.includes(v) ? vibes.filter((x) => x !== v) : vibes.length < 3 ? [...vibes, v] : vibes);
  const toggleType = (t: NameType) =>
    setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);

  const canNext = step === "vibe" ? vibes.length > 0 : step === "types" ? types.length > 0 : true;
  const nextLabel = step === "refine" ? "Generate 🎉" : "Continue →";
  const onBack = () => goTo(PREV[step]);
  const onNext = () => (step === "refine" ? run() : goTo(NEXT[step]));

  const headline: Record<Step, { q: string; sub: string }> = {
    vibe: { q: "What's the vibe?", sub: "Tap up to 3. This sets the tone for every name." },
    types: { q: "Pick your flavors", sub: "Tap any you like — ★ Suggestive works for most startups." },
    refine: { q: "Any must-haves?", sub: "Totally optional. Nudge the machine with words to keep or skip." },
  };

  return (
    <div className="mx-auto max-w-2xl pb-28 pt-6">
      {/* step progress */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-black uppercase tracking-widest text-ink/50">Step {STEP_NO[step]} / 3</span>
        <div className="flex flex-1 gap-1.5">
          {[1, 2, 3].map((i) => (
            <span key={i} className={`nb h-2.5 flex-1 rounded-full ${i <= STEP_NO[step] ? "bg-accent2" : "bg-[var(--surface-solid)]"}`} />
          ))}
        </div>
      </div>

      <h2 className="mt-5 text-4xl font-black uppercase leading-none sm:text-5xl">{headline[step].q}</h2>
      <p className="mt-3 font-medium text-ink/60">{headline[step].sub}</p>

      {/* step body */}
      <div className="mt-7 animate-in" key={step}>
        {step === "vibe" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {VIBES.map((v) => {
              const active = vibes.includes(v.key);
              return (
                <button
                  key={v.key}
                  onClick={() => toggleVibe(v.key)}
                  className={`nb nb-press relative grid min-h-[92px] place-items-center rounded-2xl p-3 text-center ${active ? "text-white" : "bg-[var(--surface-solid)] text-ink"}`}
                  style={active ? { background: "var(--color-accent2)" } : undefined}
                >
                  {active && <Check />}
                  <span className="text-2xl">{v.emoji}</span>
                  <span className="mt-1 block text-sm font-black uppercase">{v.key}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === "types" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPE_ORDER.map((t, i) => {
              const m = TYPE_META[t];
              const active = types.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`nb nb-press relative rounded-2xl p-4 text-left ${active ? "text-white" : "bg-[var(--surface-solid)] text-ink"}`}
                  style={active ? { background: STICKER[i % STICKER.length] } : undefined}
                >
                  {active && <Check />}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-black uppercase">{m.label}{m.star && " ★"}</span>
                    <span className={`text-xs font-bold ${active ? "text-white/70" : "text-ink/40"}`}>{m.examples}</span>
                  </div>
                  <p className={`mt-1 text-sm font-medium ${active ? "text-white/85" : "text-ink/55"}`}>{m.desc}</p>
                </button>
              );
            })}
          </div>
        )}

        {step === "refine" && (
          <div className="space-y-5">
            <BigField label="✅ Words to include or hint at" placeholder="lens, focus, capture…" value={include} onChange={setInclude} />
            <BigField label="🚫 Words to avoid" placeholder="snap, pro, hub…" value={avoid} onChange={setAvoid} />
            <div className="nb rounded-2xl bg-[var(--surface-solid)] p-5">
              <p className="text-xs font-black uppercase tracking-widest text-ink/45">Your brief</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(vibes.length ? vibes : (["Any vibe"] as string[])).map((v) => (
                  <span key={v} className="nb rounded-full bg-accent2 px-3 py-1 text-xs font-black uppercase text-white">{v}</span>
                ))}
                {(types.length ? types.map((t) => TYPE_META[t].label) : ["Mixed"]).map((t) => (
                  <span key={t} className="nb rounded-full bg-[var(--surface-solid)] px-3 py-1 text-xs font-black uppercase">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* sticky action bar — always within thumb reach */}
      <div className="sticky bottom-3 z-30 mt-8">
        <div className="nb-lg flex items-center justify-between gap-3 rounded-full bg-[var(--surface-solid)] px-3 py-2.5 sm:px-4">
          <button onClick={onBack} className="rounded-full px-4 py-2 text-sm font-black uppercase text-ink/60 transition hover:text-ink">← Back</button>
          {step === "vibe" && <span className="hidden text-xs font-bold text-ink/40 sm:block">{vibes.length}/3 picked</span>}
          <button
            onClick={onNext}
            disabled={!canNext}
            className="nb nb-press rounded-full bg-accent px-8 py-3 text-base font-black uppercase tracking-wide text-white disabled:opacity-40"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BigField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black uppercase tracking-wide text-ink/60">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="nb w-full rounded-2xl bg-[var(--surface-solid)] px-5 py-4 text-lg font-bold outline-none placeholder:font-medium placeholder:text-ink/25 focus:bg-ink/[0.02]"
      />
    </label>
  );
}

function Check() {
  return (
    <span className="nb absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-black text-ink">✓</span>
  );
}

/* Carnival generating screen — the machine doing its thing. */
export function GeneratingCarnival({ description }: { description: string }) {
  const lines = ["WARMING UP THE MACHINE…", "BRAINSTORMING LOUD…", "MASHING WORDS TOGETHER…", "CHECKING DOMAINS…", "SCORING THE KEEPERS…"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((x) => Math.min(x + 1, lines.length - 1)), 360);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center text-center">
      <div className="nb-lg w-full rounded-3xl bg-[var(--surface-solid)] p-7">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-ink/50">
          <span className="h-3 w-3 rounded-full bg-accent2" />
          <span className="h-3 w-3 rounded-full bg-accent3" />
          <span className="h-3 w-3 rounded-full bg-accent" />
          <span className="ml-1">the name machine</span>
        </div>
        <p className="mt-6 text-3xl font-black uppercase leading-tight sm:text-4xl">{lines[i]}</p>
        <div className="mt-6 h-4 w-full overflow-hidden rounded-full nb bg-[var(--page)]">
          <div className="h-full bg-gradient-to-r from-accent via-accent2 to-accent3 transition-all duration-300" style={{ width: `${((i + 1) / lines.length) * 100}%` }} />
        </div>
        <p className="mt-4 truncate text-sm font-bold text-ink/40">“{description || "your idea"}”</p>
      </div>
    </div>
  );
}
