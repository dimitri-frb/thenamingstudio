import { useEffect, useRef, useState } from "react";
import { naming, type Brief, type Concept, type NameIdea, type Comparison, type TerritoryWorld } from "../lib/namingApi";
import { useVoice } from "../lib/useVoice";
import { recommendLanes } from "../lib/localStudio";
import { ConceptDeepDive, type Selection } from "./ConceptDeepDive";
import { StudioNote, Kicker } from "./Guide";
import { PublicVote } from "./PublicVote";
import { Paywall, type Tier } from "./Paywall";

// The "Classic flow" (Atelier), the storytelling naming process, wired to a
// real Claude turn per generative phase via the dev bridge (/api/naming).

const STEPS = [
  "Company context", "Brand context", "Emotional value", "Naming strategy",
  "Concepts", "Exploration", "Name ideas", "Comparison", "Decision",
];

const SIGNAL = ["Trust", "Craft", "Taste", "Innovation", "Speed", "Warmth", "Boldness", "Calm", "Premium", "Playfulness", "Intelligence", "Optimism", "Rebellion", "Heritage", "Simplicity", "Intrigue"];
const TONE = ["Bold", "Warm", "Witty", "Confident", "Friendly", "Elegant", "Minimal", "Modern", "Rebellious", "Honest", "Playful", "Refined"];
const AVOID = ["Generic industry terms", "Tech-bro acronyms", "Cutesy / cheesy", "Corporate jargon", "Hard to spell", "Trendy buzzwords"];
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

export function ClassicFlow({ initialDoes, seedBrief, onRestart }: { initialDoes: string; seedBrief?: Brief | null; onRestart: () => void }) {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [brief, setBrief] = useState<Brief>({ ...empty, does: initialDoes || "" });

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [worlds, setWorlds] = useState<TerritoryWorld[]>([]);
  const [sel, setSel] = useState<Record<string, Selection>>({});
  const [names, setNames] = useState<NameIdea[]>([]);
  const [starNames, setStarNames] = useState<Set<string>>(new Set());
  const [comp, setComp] = useState<Comparison | null>(null);
  const [chosenFinal, setChosenFinal] = useState<string>("");
  const [voteOpen, setVoteOpen] = useState(false);

  // Monetization, everything above is free; the comparison's INPI + domain
  // checks are the paid "make it real" product. paid unlocks them; maybeLater
  // lets them see the scored shortlist with those cells still locked.
  const [paid, setPaid] = useState(false);
  const [paidTier, setPaidTier] = useState<Tier | null>(null);
  const [payOpen, setPayOpen] = useState(false);

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

  const exploredCount = Object.values(sel).filter((s) => s.feeling || s.quote || s.brands.length).length;
  const selectFor = (concept: string, patch: Partial<Selection>) =>
    setSel((s) => { const prev = s[concept] || { brands: [] }; return { ...s, [concept]: { ...prev, ...patch } }; });

  // Arrived from the voice conversation with a ready brief → skip the forms,
  // generate concepts, and drop the founder straight into the creative steps.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !seedBrief) return;
    seeded.current = true;
    setBrief(seedBrief);
    generate("concepts", async () => setConcepts(await naming.concepts(seedBrief)), 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedBrief]);

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
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => (step > 0 ? goto(step - 1) : onRestart())}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/15 text-ink/50 transition hover:border-ink/35 hover:text-ink"
            title={step > 0 ? "Back" : "Leave the studio"}
          >←</button>
          <div className="flex flex-1 items-center gap-2">
            <span className="font-mono text-xs text-ink/45">{String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}</span>
            <div className="flex flex-1 gap-1">
              {STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full transition ${i < step ? "bg-accent/60" : i === step ? "bg-accent" : "bg-ink/12"}`} />)}
            </div>
            <span className="hidden font-mono text-xs uppercase tracking-widest text-ink/45 sm:inline">{STEPS[step]}</span>
          </div>
          {(() => {
            const c = step === 4 ? chosen.size : step === 5 ? exploredCount : step === 6 ? starNames.size : null;
            return c != null ? <span className="shrink-0 font-mono text-xs text-accent">★ {c}</span> : null;
          })()}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/40 bg-red-500/5 p-4 text-sm text-red-500">{error}</div>
        )}

        {loading ? (
          <Thinking what={loading} />
        ) : (
          <>
            {step === 0 && (
              <Panel kicker="The brief · 1 of 4" title={<>First, what does the <I>company</I> actually do?</>}
                guide="Great names are built on clarity, not luck. Tell us plainly what you're making, we'll do the heavy lifting from there.">
                <Field label="What does the company do?" value={brief.does} onChange={(v) => set({ does: v })} area placeholder="An AI naming studio that helps founders find a brand name with the rigor of a strategist, in minutes, not months." />
                <Field label="Industry" value={brief.industry} onChange={(v) => set({ industry: v })} placeholder="Creator tools · SaaS" />
                <Nav onNext={() => goto(1)} canNext={!!brief.does.trim()} nextLabel="Next · Brand context" />
              </Panel>
            )}

            {step === 1 && (
              <Panel kicker="The brief · 2 of 4" title={<>Now, who is it <I>for</I>, and why does it matter?</>}
                guide="A name isn't for you. It's for the person who has to remember it, say it, and trust it. So let's get them right.">
                <Field label="What problem does it solve?" value={brief.problem} onChange={(v) => set({ problem: v })} area placeholder="Founders spend weeks naming and settle for something generic." onSuggest={() => naming.suggest(brief, "problem")} />
                <Field label="Who is the target audience?" value={brief.audience} onChange={(v) => set({ audience: v })} placeholder="Startup founders & brand strategists." onSuggest={() => naming.suggest(brief, "audience")} />
                <Field label="What do they value?" value={brief.values} onChange={(v) => set({ values: v })} placeholder="Taste, speed, a defensible system." onSuggest={() => naming.suggest(brief, "values")} />
                <Field label="Unique value proposition" value={brief.uvp} onChange={(v) => set({ uvp: v })} placeholder="A naming studio in your pocket." onSuggest={() => naming.suggest(brief, "uvp")} />
                <Nav onBack={() => goto(0)} onNext={() => goto(2)} canNext={!!brief.problem.trim()} nextLabel="Next · Emotional value" />
              </Panel>
            )}

            {step === 2 && (
              <Panel kicker="The brief · 3 of 4" title={<>What should the name make people <I>feel</I>?</>}
                guide="Names land in the gut before the brain. Pick the feelings worth chasing, and the ones to steer well clear of.">
                <ChipGroup label="Should signal" options={SIGNAL} selected={brief.signal} onToggle={(v) => set({ signal: toggleArr(brief.signal, v) })} onAdd={(v) => set({ signal: [...brief.signal, v] })} />
                <ChipGroup label="Should NOT signal" options={AVOID} selected={brief.avoid} onToggle={(v) => set({ avoid: toggleArr(brief.avoid, v) })} onAdd={(v) => set({ avoid: [...brief.avoid, v] })} tone="avoid" />
                <ChipGroup label="Tone / personality" options={TONE} selected={brief.tone} onToggle={(v) => set({ tone: toggleArr(brief.tone, v) })} onAdd={(v) => set({ tone: [...brief.tone, v] })} />
                <Nav onBack={() => goto(1)} onNext={() => { if (!brief.lanes.length) set({ lanes: recommendLanes(brief) }); goto(3); }} canNext={brief.signal.length > 0} nextLabel="Next · Naming strategy" />
              </Panel>
            )}

            {step === 3 && (
              <Panel kicker="The brief · 4 of 4" title={<>Last one, which <I>kinds</I> of names should we chase?</>}
                guide="Every memorable name is a deliberate bet on a style. We've pre-set the lanes that fit you, trust them, or follow your instinct."
                hint="Keep our picks, or choose your own (up to 4).">
                <div className="grid gap-3 sm:grid-cols-3">
                  {LANES.map((l) => {
                    const on = brief.lanes.includes(l.key);
                    const rec = recommendLanes(brief).includes(l.key);
                    return (
                      <button key={l.key} onClick={() => set({ lanes: toggleArr(brief.lanes, l.key, 4) })}
                        className={`relative rounded-xl border p-4 text-left transition ${on ? "border-accent bg-accent/5" : "border-ink/15 hover:border-ink/30"}`}>
                        {on && <Check />}
                        <p className="font-semibold">{l.label}</p>
                        {rec && <span className="mt-1 inline-block rounded-full bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-accent">recommended</span>}
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
              <Panel kicker="The concepts" title={<>These are the <I>worlds</I> your brand could live in.</>}
                guide="A name with no world behind it is just a word. Pick the two or three that make your gut say yes, we'll explore each together."
                hint="Choose 2–4 to take further.">
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
                <Nav onBack={() => goto(3)} canNext={chosen.size > 0} nextLabel="Explore in depth →"
                  onNext={() => generate("explore", async () => setWorlds(await Promise.all(concepts.filter((c) => chosen.has(c.title)).map((c) => naming.explore(brief, c)))), 5)} />
              </Panel>
            )}

            {step === 5 && (
              <ConceptDeepDive
                worlds={worlds}
                selections={sel}
                onSelect={selectFor}
                onBack={() => goto(4)}
                onGenerate={() => generate("names", async () => {
                  const entries = Object.entries(sel).filter(([, s]) => s.feeling || s.quote || s.brands.length);
                  const sketch = {
                    concepts: entries.length ? entries.map(([t]) => t) : worlds.map((w) => w.title),
                    feelings: [...new Set(entries.map(([, s]) => s.feeling).filter(Boolean) as string[])],
                    quotes: [...new Set(entries.map(([, s]) => s.quote).filter(Boolean) as string[])],
                    brands: [...new Set(entries.flatMap(([, s]) => s.brands))],
                  };
                  setNames(await naming.names(brief, sketch));
                }, 6)}
              />
            )}

            {step === 6 && (
              <Panel kicker="The shortlist" title={<>{names.length} names. <I>Star the keepers.</I></>}
                guide="Don't overthink it, star the ones that make you look twice. We'll pressure-test your favourites next."
                hint="Each carries a rationale and a SMILE pulse. Star up to 8.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {names.map((n) => {
                    const on = starNames.has(n.name);
                    return (
                      <button key={n.name} onClick={() => toggle(starNames, n.name, setStarNames, 8)}
                        className={`relative rounded-2xl border p-4 text-left transition ${on ? "border-accent/40 bg-accent/[0.07]" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"}`}>
                        <span className={`absolute right-4 top-4 text-lg ${on ? "text-accent" : "text-ink/25"}`}>{on ? "★" : "☆"}</span>
                        <p className="font-serif text-2xl leading-none">{n.name}</p>
                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-ink/40">{n.type}</p>
                        <p className="mt-2 font-serif text-[15px] italic leading-snug text-ink/60">“{n.rationale}”</p>
                        <div className="mt-3 flex items-center gap-2 border-t border-ink/10 pt-3 font-mono text-[10px] uppercase tracking-widest text-ink/40">
                          <span>Smile</span><SmileDots score={n.score} />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Nav onBack={() => goto(5)} canNext={starNames.size >= 2} nextLabel={`Compare ${starNames.size || ""} starred →`}
                  onNext={async () => {
                    await generate("compare", async () => setComp(await naming.compare(brief, names.filter((n) => starNames.has(n.name)))), 7);
                    if (!paid) setPayOpen(true);
                  }} />
              </Panel>
            )}

            {step === 7 && comp && (
              <Panel kicker="The verdict" title={<>How they <I>hold up</I>.</>}
                guide="We scored each name the way a strategist would, does it land, does it look right, does it sound good, does it stir something. Here's our pick, and an honest read on the rest."
                hint="SMILE scoring, cross-language meaning, domain & trademark flags.">
                <HeroPick comp={comp} />
                {paid ? (
                  <div className="-mt-2 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-700">
                    <span>✓</span><span>Reality check complete, INPI trademark & domain availability verified for your shortlist.{paidTier === "bundle" && " Your brand book is on its way to your inbox."}</span>
                  </div>
                ) : (
                  <div className="-mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
                    <span className="text-ink/70">🔒 INPI & domain availability are locked. Unlock the reality check to see what's actually free to take.</span>
                    <button onClick={() => setPayOpen(true)} className="ml-auto shrink-0 rounded-lg bg-accent px-3.5 py-2 font-serif text-sm italic text-white transition hover:brightness-105">Unlock €9 →</button>
                  </div>
                )}
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
                              {paid ? (
                                <p className="mt-1 text-ink/45">🌍 {r.negatives} · 🌐 {r.domain} · ⚖️ {r.trademark}</p>
                              ) : (
                                <p className="mt-1 select-none text-ink/40">🌍 {r.negatives} · <span className="rounded bg-ink/10 px-6 text-transparent blur-[3px]">{r.domain}</span> · <span className="rounded bg-ink/10 px-6 text-transparent blur-[3px]">{r.trademark}</span></p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ShareFriends names={comp.rows.map((r) => r.name)} onVote={() => setVoteOpen(true)} />

                <Nav onBack={() => goto(6)} canNext nextLabel="Make the decision →"
                  onNext={() => { setChosenFinal(comp.recommended); goto(8); }} />
              </Panel>
            )}

            {step === 8 && comp && (
              <Panel kicker="The decision" title={<>Now, <I>commit</I>.</>}
                guide="Here's the truth: great brands aren't the ones with the perfect name. They're the ones who chose, and went. Pick yours."
                hint="Commit to one (or two). You can always gut-check with friends below.">
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
                  </div>
                )}
                <div className="mt-7 flex items-center justify-center gap-3 rounded-2xl border border-ink/12 bg-[var(--surface-solid)] p-5 text-center">
                  <div className="text-left">
                    <p className="font-serif text-lg italic">Not sure? Get a gut-check.</p>
                    <p className="text-sm text-ink/50">Swipe through your shortlist like a vote.</p>
                  </div>
                  <button onClick={() => setVoteOpen(true)} className="ml-auto rounded-xl border border-ink/30 px-4 py-2.5 font-serif text-base italic transition hover:bg-ink/5">Open the vote →</button>
                </div>
                <Nav onBack={() => goto(7)} onNext={onRestart} canNext nextLabel="Start a new session" />
              </Panel>
            )}
          </>
        )}
      </div>

      {voteOpen && comp && (
        <PublicVote
          items={comp.rows.map((r) => ({ name: r.name, note: r.verdict, type: names.find((n) => n.name === r.name)?.type }))}
          onClose={() => setVoteOpen(false)}
        />
      )}

      {payOpen && comp && (
        <Paywall
          names={comp.rows.map((r) => r.name)}
          onClose={() => setPayOpen(false)}
          onMaybeLater={() => setPayOpen(false)}
          onPaid={(tier) => { setPaid(true); setPaidTier(tier); setPayOpen(false); }}
        />
      )}
    </div>
  );
}

// "Ask your friends", share the shortlist for a gut-check (the Tinder-style
// vote, or a prefilled WhatsApp / email / copyable link). Share intents only;
// nothing is sent without the founder's own confirmation in their app.
function ShareFriends({ names, onVote }: { names: string[]; onVote: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = "https://dimitri-frb.github.io/brandr/";
  const msg = `Help me pick my company name 🙌, my shortlist: ${names.slice(0, 6).join(", ")}. Vote here: ${link}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const mail = `mailto:?subject=${encodeURIComponent("Help me name my company")}&body=${encodeURIComponent(msg)}`;
  async function copy() {
    try { await navigator.clipboard.writeText(msg); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* noop */ }
  }
  return (
    <div className="mt-5 rounded-2xl border border-ink/12 bg-[var(--surface-solid)] p-5">
      <p className="font-serif text-xl italic">Still unsure? Ask your friends.</p>
      <p className="mt-1 text-sm text-ink/55">Share your shortlist and let people swipe through it, Tinder-style. The clear favourite usually rises fast.</p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <button onClick={onVote} className="rounded-xl bg-ink px-4 py-2.5 font-serif text-base italic text-[var(--page)] transition hover:opacity-90">Open the swipe vote →</button>
        <a href={wa} target="_blank" rel="noreferrer" className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm font-medium text-ink/75 transition hover:border-ink/40">WhatsApp</a>
        <a href={mail} className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm font-medium text-ink/75 transition hover:border-ink/40">Email</a>
        <button onClick={copy} className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm font-medium text-ink/75 transition hover:border-ink/40">{copied ? "Copied ✓" : "Copy link"}</button>
      </div>
    </div>
  );
}

function HeroPick({ comp }: { comp: Comparison }) {
  const top = comp.rows.find((r) => r.name === comp.recommended) || comp.rows[0];
  if (!top) return null;
  return (
    <div className="mb-7 rounded-3xl border border-accent/30 bg-accent/5 p-6 sm:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Our pick for you</p>
      <h3 className="mt-2 font-serif text-5xl leading-none">{top.name}</h3>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/70">{comp.why}</p>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-ink/45">
        <span>Intuitive {top.intuitive}/5</span>
        <span>Visual {top.visual}/5</span>
        <span>Sound {top.sound}/5</span>
        <span>Emotional {top.emotional}/5</span>
        <span className="text-accent">SMILE {top.total}/20</span>
      </div>
      <p className="mt-4 font-serif text-base italic text-ink/55">“{top.verdict}” · the studio</p>
    </div>
  );
}

function toggleArr(arr: string[], v: string, max = 999): string[] {
  if (arr.includes(v)) return arr.filter((x) => x !== v);
  if (arr.length >= max) return arr;
  return [...arr, v];
}

function Panel({ kicker, title, hint, guide, children }: { kicker?: string; title: React.ReactNode; hint?: string; guide?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="animate-in">
      {kicker && <Kicker>{kicker}</Kicker>}
      <h2 className="mt-2 text-3xl leading-snug sm:text-4xl">{title}</h2>
      {hint && <p className="mt-3 max-w-xl text-ink/55">{hint}</p>}
      {guide && <StudioNote>{guide}</StudioNote>}
      <div className="mt-7 space-y-5">{children}</div>
    </div>
  );
}

function I({ children }: { children: React.ReactNode }) {
  return <span className="italic text-accent2">{children}</span>;
}

function Field({ label, value, onChange, placeholder, area, onSuggest }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean; onSuggest?: () => Promise<string[]> }) {
  const { supported, listening, toggle } = useVoice((t) => onChange(t));
  const [sugg, setSugg] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function suggest() {
    if (busy || !onSuggest) return;
    setBusy(true);
    try { setSugg(await onSuggest()); } catch { /* noop */ } finally { setBusy(false); }
  }
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-ink/60">{label}</span>
        {onSuggest && (
          <button type="button" onClick={suggest} disabled={busy} className="font-mono text-[10px] uppercase tracking-widest text-accent transition hover:opacity-70 disabled:opacity-40">
            {busy ? "…" : "✨ Suggest"}
          </button>
        )}
      </div>
      <div className="relative">
        {area ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={listening ? "Listening…" : placeholder} rows={2}
            className="w-full resize-none rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-4 py-3 pr-12 outline-none transition placeholder:text-ink/25 focus:border-accent/50" />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={listening ? "Listening…" : placeholder}
            className="w-full rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-4 py-3 pr-12 outline-none transition placeholder:text-ink/25 focus:border-accent/50" />
        )}
        {supported && (
          <button
            type="button"
            onClick={() => toggle(value)}
            title={listening ? "Stop dictation" : "Answer with voice"}
            className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border transition ${listening ? "border-accent bg-accent text-white" : "border-ink/15 text-ink/45 hover:border-ink/35 hover:text-ink"}`}
          >
            {listening ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : <MicGlyph />}
          </button>
        )}
      </div>
      {sugg.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sugg.map((s) => (
            <button key={s} type="button" onClick={() => { onChange(value ? `${value}, ${s}` : s); setSugg([]); }}
              className="rounded-full border border-accent/30 bg-accent/5 px-2.5 py-1 text-xs text-ink/70 transition hover:bg-accent/10">
              + {s}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function SmileDots({ score }: { score: number }) {
  const filled = Math.max(1, Math.min(5, Math.round((score / 100) * 5)));
  return (
    <span className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < filled ? "bg-accent" : "bg-ink/15"}`} />
      ))}
    </span>
  );
}

function MicGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
  );
}

function ChipGroup({ label, options, selected, onToggle, onAdd, tone }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void; onAdd?: (v: string) => void; tone?: "avoid" }) {
  const [draft, setDraft] = useState("");
  const extras = selected.filter((s) => !options.includes(s)); // custom additions
  const all = [...options, ...extras];
  const add = () => { const v = draft.trim(); if (v && onAdd && !selected.includes(v)) { onAdd(v); setDraft(""); } };
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-ink/60">{label}</span>
      <div className="flex flex-wrap gap-2">
        {all.map((o) => {
          const on = selected.includes(o);
          const onCls = tone === "avoid" ? "border-red-400/50 bg-red-500/10 text-red-600" : "border-accent bg-accent text-white";
          return (
            <button key={o} onClick={() => onToggle(o)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? onCls : "border-ink/20 hover:border-ink/40"}`}>
              {o}
            </button>
          );
        })}
        {onAdd && (
          <span className="inline-flex items-center rounded-full border border-dashed border-ink/25 pl-3 pr-1">
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              placeholder="add your own" className="w-28 bg-transparent py-1.5 text-sm outline-none placeholder:text-ink/30" />
            <button onClick={add} title="Add" className="grid h-6 w-6 place-items-center rounded-full text-ink/45 transition hover:bg-ink/10 hover:text-ink">+</button>
          </span>
        )}
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
    concepts: "Mapping the worlds your brand could live in…",
    explore: "Sketching this world out for you…",
    names: "Drawing up names that fit your brand…",
    compare: "Scoring each one the way a strategist would…",
  };
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
      <p className="mt-6 font-serif text-2xl italic">{labels[what] || "The studio is thinking…"}</p>
      <p className="mt-2 text-sm text-ink/40">Give us a moment, good work takes a beat.</p>
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
