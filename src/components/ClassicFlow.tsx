import { useState } from "react";
import { naming, type Brief, type Concept, type Word, type NameIdea, type Comparison } from "../lib/namingApi";

// The "Classic flow" (Atelier) — the storytelling naming process, wired to a
// real Claude turn per generative phase via the dev bridge (/api/naming).

const STEPS = [
  "Company context", "Brand context", "Emotional value", "Naming strategy",
  "Concepts", "Words & exploration", "Name ideas", "Comparison", "Decision",
];

const SIGNAL = ["Creativity", "Taste", "Craft", "Sharpness", "Trust", "Speed", "Momentum", "Optimism", "Calm", "Premium", "Playful", "Intrigue"];
const TONE = ["Bold", "Fearless", "Friendly", "Empathetic", "Witty", "Confident", "Polished", "Warm", "Minimal", "Modern"];
const AVOID = ["Generic industry terms", "Tech-bro acronyms", "Cutesy / cheesy", "Corporate jargon", "Hard to spell"];
const LANES: { key: string; label: string; ex: string }[] = [
  { key: "descriptive", label: "Descriptive", ex: "Dropbox, Booking" },
  { key: "suggestive", label: "Suggestive ★", ex: "Amazon, Uber, Slack" },
  { key: "evocative", label: "Evocative", ex: "Calm, Virgin" },
  { key: "invented", label: "Invented", ex: "Google, Spotify" },
  { key: "abstract", label: "Abstract real word", ex: "Apple, Stripe" },
  { key: "compound", label: "Compound", ex: "Facebook, PayPal" },
  { key: "founder", label: "Founder", ex: "Tesla, Chanel" },
  { key: "geographic", label: "Geographic", ex: "Patagonia" },
  { key: "playful", label: "Playful", ex: "Liquid Death" },
];

const empty: Brief = { does: "", industry: "", problem: "", audience: "", values: "", uvp: "", signal: [], avoid: [], tone: [], lanes: [] };

export function ClassicFlow({ initialDoes, onRestart }: { initialDoes: string; onRestart: () => void }) {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [brief, setBrief] = useState<Brief>({ ...empty, does: initialDoes || "" });

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [words, setWords] = useState<Word[]>([]);
  const [starWords, setStarWords] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<NameIdea[]>([]);
  const [starNames, setStarNames] = useState<Set<string>>(new Set());
  const [comp, setComp] = useState<Comparison | null>(null);
  const [chosenFinal, setChosenFinal] = useState<string>("");

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Brief>) => setBrief((b) => ({ ...b, ...patch }));
  const goto = (n: number) => { setStep(n); setReached((r) => Math.max(r, n)); window.scrollTo({ top: 0, behavior: "instant" }); };

  async function generate(what: string, fn: () => Promise<void>, nextStep: number) {
    setError(null); setLoading(what);
    try { await fn(); goto(nextStep); }
    catch (e: any) { setError(e.message || String(e)); }
    finally { setLoading(null); }
  }

  const toggle = (s: Set<string>, v: string, setter: (x: Set<string>) => void, max = 999) => {
    const n = new Set(s);
    if (n.has(v)) n.delete(v); else if (n.size < max) n.add(v);
    setter(n);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-1 pt-8 lg:grid-cols-[200px_1fr]">
      {/* left nav */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <p className="mb-4 flex items-center gap-2 font-serif text-base italic text-ink/50"><Star /> the naming studio</p>
          <ol className="space-y-1.5 text-sm">
            {STEPS.map((s, i) => (
              <li key={s}>
                <button
                  onClick={() => i <= reached && goto(i)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition ${i === step ? "bg-ink/[0.06] text-ink" : i <= reached ? "text-ink/55 hover:text-ink" : "text-ink/25"}`}
                >
                  <span className="font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                  {s}
                </button>
              </li>
            ))}
          </ol>
          <button onClick={onRestart} className="mt-8 text-xs text-ink/35 hover:text-ink">← Leave the studio</button>
        </div>
      </aside>

      {/* main */}
      <div className="min-w-0 pb-24">
        <div className="mb-6 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em] text-ink/40">
          <span>Step {String(step + 1).padStart(2, "0")} / 09 · {STEPS[step]}</span>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/40 bg-red-500/5 p-4 text-sm text-red-500">{error}</div>
        )}

        {loading ? (
          <Thinking what={loading} />
        ) : (
          <>
            {step === 0 && (
              <Panel title={<>Start with what the <I>company</I> actually does.</>} hint="The clearer this is, the sharper your name. Strategy is not optional.">
                <Field label="What does the company do?" value={brief.does} onChange={(v) => set({ does: v })} area placeholder="An AI naming studio that helps founders find a brand name with the rigor of a strategist — in minutes, not months." />
                <Field label="Industry" value={brief.industry} onChange={(v) => set({ industry: v })} placeholder="Creator tools · SaaS" />
                <Nav onNext={() => goto(1)} canNext={!!brief.does.trim()} nextLabel="Next · Brand context" />
              </Panel>
            )}

            {step === 1 && (
              <Panel title={<>Now the <I>brand</I> — who it's for and why it matters.</>} hint="What problem do you solve, for whom, and what makes your point of view defensible?">
                <Field label="What problem does it solve?" value={brief.problem} onChange={(v) => set({ problem: v })} area placeholder="Founders spend weeks naming and settle for something generic." />
                <Field label="Who is the target audience?" value={brief.audience} onChange={(v) => set({ audience: v })} placeholder="Startup founders & brand strategists. Time-pressed, often non-native English speakers." />
                <Field label="What do they value?" value={brief.values} onChange={(v) => set({ values: v })} placeholder="Taste, speed, a defensible system — not a slot machine." />
                <Field label="Unique value proposition" value={brief.uvp} onChange={(v) => set({ uvp: v })} placeholder="A naming studio in your pocket." />
                <Nav onBack={() => goto(0)} onNext={() => goto(2)} canNext={!!brief.problem.trim()} nextLabel="Next · Emotional value" />
              </Panel>
            )}

            {step === 2 && (
              <Panel title={<>What should your name <I>signal</I> emotionally?</>} hint="Pick the words that should resonate — then mark anything to actively avoid.">
                <ChipGroup label="Should signal" options={SIGNAL} selected={brief.signal} onToggle={(v) => set({ signal: toggleArr(brief.signal, v) })} />
                <ChipGroup label="Should NOT signal" options={AVOID} selected={brief.avoid} onToggle={(v) => set({ avoid: toggleArr(brief.avoid, v) })} tone="avoid" />
                <ChipGroup label="Tone / personality" options={TONE} selected={brief.tone} onToggle={(v) => set({ tone: toggleArr(brief.tone, v) })} />
                <Nav onBack={() => goto(1)} onNext={() => goto(3)} canNext={brief.signal.length > 0} nextLabel="Next · Naming strategy" />
              </Panel>
            )}

            {step === 3 && (
              <Panel title={<>Choose the <I>naming lanes</I> we'll explore.</>} hint="Pick up to 4. The right strategy narrows the search before it starts.">
                <div className="grid gap-3 sm:grid-cols-3">
                  {LANES.map((l) => {
                    const on = brief.lanes.includes(l.key);
                    return (
                      <button key={l.key} onClick={() => set({ lanes: toggleArr(brief.lanes, l.key, 4) })}
                        className={`relative rounded-xl border p-4 text-left transition ${on ? "border-accent bg-accent/5" : "border-ink/15 hover:border-ink/30"}`}>
                        {on && <Check />}
                        <p className="font-semibold">{l.label}</p>
                        <p className="mt-1 font-serif text-sm italic text-ink/45">{l.ex}</p>
                      </button>
                    );
                  })}
                </div>
                <Nav onBack={() => goto(2)} canNext={brief.lanes.length > 0} nextLabel="Generate concepts →"
                  onNext={() => generate("concepts", async () => setConcepts(await naming.concepts(brief)), 4)} />
              </Panel>
            )}

            {step === 4 && (
              <Panel title={<>Pick the <I>territories</I> we'll mine for words.</>} hint="Each concept is a creative direction your name could live inside. Pick 2–4 to explore.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {concepts.map((c) => {
                    const on = chosen.has(c.title);
                    return (
                      <button key={c.title} onClick={() => toggle(chosen, c.title, setChosen, 4)}
                        className={`relative rounded-xl border p-4 text-left transition ${on ? "border-accent bg-accent/5" : "border-ink/15 hover:border-ink/30"}`}>
                        {on && <Check />}
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-serif text-xl">{c.title}</p>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink/35">{c.lane}</span>
                        </div>
                        <p className="mt-1 text-sm text-ink/55">{c.blurb}</p>
                      </button>
                    );
                  })}
                </div>
                <Nav onBack={() => goto(3)} canNext={chosen.size > 0} nextLabel="Explore words →"
                  onNext={() => generate("words", async () => setWords(await naming.words(brief, concepts.filter((c) => chosen.has(c.title)))), 5)} />
              </Panel>
            )}

            {step === 5 && (
              <Panel title={<>Mine each territory for <I>words</I> that could become names.</>} hint="Star the words with a pulse. We'll build names from your favourites.">
                <div className="flex flex-wrap gap-2">
                  {words.map((w) => {
                    const on = starWords.has(w.word);
                    return (
                      <button key={w.word} onClick={() => toggle(starWords, w.word, setStarWords)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-accent bg-accent text-white" : "border-ink/20 hover:border-ink/40"}`}
                        title={w.territory}>
                        {on ? "★ " : ""}{w.word}
                      </button>
                    );
                  })}
                </div>
                <Nav onBack={() => goto(4)} canNext={starWords.size > 0} nextLabel="Generate name ideas →"
                  onNext={() => generate("names", async () => setNames(await naming.names(brief, concepts.filter((c) => chosen.has(c.title)), words.filter((w) => starWords.has(w.word)))), 6)} />
              </Panel>
            )}

            {step === 6 && (
              <Panel title={<>Candidate <I>names</I>. Star the ones with a pulse.</>} hint="Each carries a rationale and a pulse score. Star up to 8 for the comparison.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {names.map((n) => {
                    const on = starNames.has(n.name);
                    return (
                      <button key={n.name} onClick={() => toggle(starNames, n.name, setStarNames, 8)}
                        className={`relative rounded-xl border p-4 text-left transition ${on ? "border-accent bg-accent/5" : "border-ink/15 hover:border-ink/30"}`}>
                        <span className="absolute right-3 top-3 text-lg">{on ? "★" : "☆"}</span>
                        <div className="flex items-baseline gap-2">
                          <p className="font-serif text-2xl">{n.name}</p>
                          <span className="text-xs font-semibold text-emerald-600">{n.score}</span>
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink/35">{n.type}</p>
                        <p className="mt-1.5 text-sm text-ink/55">{n.rationale}</p>
                      </button>
                    );
                  })}
                </div>
                <Nav onBack={() => goto(5)} canNext={starNames.size >= 2} nextLabel="Compare the shortlist →"
                  onNext={() => generate("compare", async () => setComp(await naming.compare(brief, names.filter((n) => starNames.has(n.name)))), 7)} />
              </Panel>
            )}

            {step === 7 && comp && (
              <Panel title={<>The <I>comparison</I> — scored, stress-tested.</>} hint="SMILE scoring, cross-language meaning, domain & trademark flags.">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink/25 text-xs uppercase tracking-wider text-ink/45">
                        <th className="py-2 pr-3 font-normal">Name</th>
                        <th className="px-2 font-normal" title="Intuitive">I</th>
                        <th className="px-2 font-normal" title="Visual">V</th>
                        <th className="px-2 font-normal" title="Sound">S</th>
                        <th className="px-2 font-normal" title="Emotional">E</th>
                        <th className="px-2 font-normal">Σ</th>
                        <th className="px-3 font-normal">Notes · meaning · domain · trademark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10">
                      {comp.rows.map((r) => {
                        const rec = r.name === comp.recommended;
                        return (
                          <tr key={r.name} className={rec ? "bg-accent/5" : ""}>
                            <td className="py-3 pr-3 font-serif text-lg">{r.name}{rec && <span className="text-accent"> ★</span>}</td>
                            <td className="px-2 text-center">{r.intuitive}</td>
                            <td className="px-2 text-center">{r.visual}</td>
                            <td className="px-2 text-center">{r.sound}</td>
                            <td className="px-2 text-center">{r.emotional}</td>
                            <td className="px-2 text-center font-semibold">{r.total}</td>
                            <td className="px-3 py-3 text-xs leading-relaxed text-ink/55">
                              <p>{r.verdict}</p>
                              <p className="mt-1 text-ink/40">🌍 {r.negatives} · 🌐 {r.domain} · ⚖ {r.trademark}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-7 rounded-2xl border border-accent/30 bg-accent/5 p-5">
                  <p className="font-serif text-lg italic text-ink/80">Our recommendation — {comp.recommended}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink/70">{comp.why}</p>
                  <p className="mt-3 text-right font-serif text-sm italic text-ink/40">— the studio</p>
                </div>

                <Nav onBack={() => goto(6)} canNext nextLabel="Make the decision →"
                  onNext={() => { setChosenFinal(comp.recommended); goto(8); }} />
              </Panel>
            )}

            {step === 8 && comp && (
              <Panel title={<>The <I>decision</I>.</>} hint="Commit to one (or two). Great brands pick and move.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {comp.rows.map((r) => (
                    <button key={r.name} onClick={() => setChosenFinal(r.name)}
                      className={`relative rounded-xl border p-5 text-left transition ${chosenFinal === r.name ? "border-accent bg-accent/5" : "border-ink/15 hover:border-ink/30"}`}>
                      {chosenFinal === r.name && <Check />}
                      <p className="font-serif text-2xl">{r.name}</p>
                      <p className="mt-1 text-sm text-ink/50">{r.total}/20 · {r.verdict}</p>
                    </button>
                  ))}
                </div>
                {chosenFinal && (
                  <div className="mt-7 rounded-2xl border border-ink/15 p-6 text-center">
                    <p className="font-serif text-3xl">{chosenFinal}</p>
                    <p className="mt-2 text-sm text-ink/55">A fine choice. Next: secure the domain, run an INPI 🇫🇷 trademark check, and build the brand book.</p>
                    <p className="mt-4 font-serif text-base italic text-ink/40">Feedback step (share with 3–5 friends) comes next — coming soon.</p>
                  </div>
                )}
                <Nav onBack={() => goto(7)} onNext={onRestart} canNext nextLabel="Start a new session" />
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function toggleArr(arr: string[], v: string, max = 999): string[] {
  if (arr.includes(v)) return arr.filter((x) => x !== v);
  if (arr.length >= max) return arr;
  return [...arr, v];
}

function Panel({ title, hint, children }: { title: React.ReactNode; hint: string; children: React.ReactNode }) {
  return (
    <div className="animate-in">
      <h2 className="text-3xl leading-snug sm:text-4xl">{title}</h2>
      <p className="mt-3 max-w-xl text-ink/55">{hint}</p>
      <div className="mt-8 space-y-5">{children}</div>
    </div>
  );
}

function I({ children }: { children: React.ReactNode }) {
  return <span className="italic text-accent2">{children}</span>;
}

function Field({ label, value, onChange, placeholder, area }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink/60">{label}</span>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
          className="w-full resize-none rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-4 py-3 outline-none transition placeholder:text-ink/25 focus:border-accent/50" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-4 py-3 outline-none transition placeholder:text-ink/25 focus:border-accent/50" />
      )}
    </label>
  );
}

function ChipGroup({ label, options, selected, onToggle, tone }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void; tone?: "avoid" }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-ink/60">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          const onCls = tone === "avoid" ? "border-red-400/50 bg-red-500/10 text-red-600" : "border-accent bg-accent text-white";
          return (
            <button key={o} onClick={() => onToggle(o)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? onCls : "border-ink/20 hover:border-ink/40"}`}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Nav({ onBack, onNext, canNext, nextLabel }: { onBack?: () => void; onNext?: () => void; canNext: boolean; nextLabel: string }) {
  return (
    <div className="flex items-center justify-between border-t border-ink/10 pt-6">
      {onBack ? <button onClick={onBack} className="text-sm text-ink/50 transition hover:text-ink">← Back</button> : <span />}
      <button onClick={onNext} disabled={!canNext}
        className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30">
        {nextLabel}
      </button>
    </div>
  );
}

function Thinking({ what }: { what: string }) {
  const labels: Record<string, string> = {
    concepts: "Exploring concept territories…",
    words: "Mining each territory for words…",
    names: "Drawing up candidate names…",
    compare: "Scoring, and checking meanings across languages…",
  };
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
      <p className="mt-6 font-serif text-2xl italic">{labels[what] || "The studio is thinking…"}</p>
      <p className="mt-2 text-sm text-ink/40">A real Claude turn — this takes a few seconds.</p>
    </div>
  );
}

function Check() {
  return <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-white">✓</span>;
}

function Star() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 3v18M4.5 7l15 10M19.5 7l-15 10" />
    </svg>
  );
}
