import { useEffect, useRef, useState } from "react";
import { naming, type Brief, type Concept, type Feeling, type NameIdea, type Comparison, type CompareRow, type TerritoryWorld } from "../lib/namingApi";
import { useVoice } from "../lib/useVoice";
import { recommendLanes } from "../lib/localStudio";
import { ConceptDeepDive } from "./ConceptDeepDive";
import { StudioNote, Kicker } from "./Guide";
import { FeelingDeck } from "./FeelingDeck";
import { PublicVote } from "./PublicVote";
import { BrandBook } from "./BrandBook";

// The "Classic flow" (Atelier), the storytelling naming process, wired to a
// real Claude turn per generative phase via the dev bridge (/api/naming).

const STEPS = [
  "Company context", "Brand context", "Emotional value", "Naming strategy",
  "Concepts", "Exploration", "Name ideas", "Comparison", "Decision",
];

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

  const [feelings, setFeelings] = useState<Feeling[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [worlds, setWorlds] = useState<TerritoryWorld[]>([]);
  const [words, setWords] = useState<Set<string>>(new Set()); // words kept in the constellations
  const [names, setNames] = useState<NameIdea[]>([]);
  const [starNames, setStarNames] = useState<Set<string>>(new Set());
  const [comp, setComp] = useState<Comparison | null>(null);
  const [chosenFinal, setChosenFinal] = useState<string>("");
  const [voteOpen, setVoteOpen] = useState(false);
  const [brandBookOpen, setBrandBookOpen] = useState(false);

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
            const c = step === 2 ? brief.signal.length : step === 4 ? chosen.size : step === 5 ? words.size : step === 6 ? starNames.size : null;
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
                <Nav onBack={() => goto(0)} canNext={!!brief.problem.trim()} nextLabel="Next · Emotional value"
                  onNext={() => generate("feelings", async () => setFeelings(await naming.feelings(brief)), 2)} />
              </Panel>
            )}

            {step === 2 && (
              <Panel kicker="The brief · 3 of 4" title={<>What should the name make people <I>feel</I>?</>}
                guide="Names land in the gut before the brain. Swipe through the feelings that fit, we picked these from what you just told us.">
                <FeelingDeck
                  cards={feelings}
                  kept={brief.signal}
                  onKeep={(w) => set({ signal: [...brief.signal, w] })}
                  onUnkeep={(w) => set({ signal: brief.signal.filter((x) => x !== w) })}
                  onBack={() => goto(1)}
                  onContinue={() => { set({ tone: brief.signal, lanes: brief.lanes.length ? brief.lanes : recommendLanes({ ...brief, tone: brief.signal }) }); goto(3); }}
                />
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
                kept={words}
                onToggle={(w) => toggle(words, w, setWords)}
                onBack={() => goto(4)}
                onGenerate={() => generate("names", async () => {
                  const sketch = { concepts: worlds.map((w) => w.title), words: [...words] };
                  setNames(await naming.names(brief, sketch));
                }, 6)}
              />
            )}

            {step === 6 && (
              <Panel kicker="The shortlist" title={<>{names.length} names. <I>Star the keepers.</I></>}
                guide="Don't overthink it, star the ones that make you look twice. We'll pressure-test your favourites next."
                hint="Each carries a one-line rationale. Star up to 8.">
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
                      </button>
                    );
                  })}
                </div>
                <Nav onBack={() => goto(5)} canNext={starNames.size >= 2} nextLabel={`Compare ${starNames.size || ""} starred →`}
                  onNext={() => generate("compare", async () => setComp(await naming.compare(brief, names.filter((n) => starNames.has(n.name)))), 7)} />
              </Panel>
            )}

            {step === 7 && comp && (
              <Panel kicker="The verdict" title={<>You <I>found</I> it.</>}
                guide="This is the part founders remember. Sit with it for a second, then let's see what's yours to claim, the domain, the trademark, the handle."
                hint="">
                <HeroPick comp={comp} />
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/40">The rest of your shortlist</p>
                <div className="mt-2 space-y-3">
                  {comp.rows.filter((r) => r.name !== comp.recommended).map((r) => (
                    <div key={r.name} className="rounded-2xl border border-ink/12 bg-[var(--surface-solid)] p-5">
                      <p className="font-serif text-2xl leading-none">{r.name}</p>
                      <p className="mt-2 font-serif text-[15px] italic leading-snug text-ink/60">“{r.verdict}”</p>
                      <Checks row={r} className="mt-3 border-t border-ink/10 pt-3" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink/40">Domain, trademark and handle reads are best-guess estimates, confirm with the live checks before you file.</p>

                <ShareFriends names={comp.rows.map((r) => r.name)} notes={comp.rows.map((r) => r.verdict)} about={brief.does} onVote={() => setVoteOpen(true)} />

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
                      <p className="mt-1 text-sm text-ink/50">{r.verdict}</p>
                    </button>
                  ))}
                </div>
                {chosenFinal && <NextSteps name={chosenFinal} onBrandBook={() => setBrandBookOpen(true)} />}
                <div className="mt-2 flex items-center justify-center gap-3 rounded-2xl border border-ink/12 bg-[var(--surface-solid)] p-5 text-center">
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

      {brandBookOpen && <BrandBook brief={brief} name={chosenFinal} onClose={() => setBrandBookOpen(false)} />}
    </div>
  );
}

// After the winner is picked: three ways to make it real.
function NextSteps({ name, onBrandBook }: { name: string; onBrandBook: () => void }) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const inpi = "https://procedures.inpi.fr/?/";
  const godaddy = `https://www.godaddy.com/domainsearch/find?domainToCheck=${slug}.com`;
  return (
    <div className="mt-2 rounded-3xl border border-accent2/30 bg-gradient-to-br from-accent2/12 via-accent/[0.06] to-transparent p-6 sm:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">You chose</p>
      <h3 className="mt-2 font-serif text-5xl leading-none">{name}</h3>
      <p className="mt-3 text-sm text-ink/60">A fine choice. Now let's make it real, here's where to go next.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <NextStep n="01" title="Register the name" sub="Protect it as a trademark at INPI 🇫🇷" cta="Open INPI →" href={inpi} />
        <NextStep n="02" title="Buy the domain" sub={`Grab ${slug}.com before someone else does`} cta="Search on GoDaddy →" href={godaddy} />
        <NextStep n="03" title="Brand book & logo" sub="Story, voice, colour & type, generated for you" cta="Create it →" onClick={onBrandBook} />
      </div>
    </div>
  );
}

function NextStep({ n, title, sub, cta, href, onClick, badge }: { n: string; title: string; sub: string; cta: string; href?: string; onClick?: () => void; badge?: string }) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-ink/35">{n}</span>
        {badge && <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-accent">{badge}</span>}
      </div>
      <p className="mt-3 font-serif text-xl leading-tight">{title}</p>
      <p className="mt-1 text-sm leading-snug text-ink/55">{sub}</p>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-accent">{cta}</p>
    </>
  );
  const cls = "block h-full rounded-2xl border border-ink/15 bg-[var(--surface-solid)] p-5 text-left transition hover:border-accent/40 hover:shadow-sm";
  return href
    ? <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
    : <button onClick={onClick} className={cls}>{inner}</button>;
}

// "Ask your friends", share the shortlist for a gut-check (the Tinder-style
// vote, or a prefilled WhatsApp / email / copyable link). Share intents only;
// nothing is sent without the founder's own confirmation in their app.
function ShareFriends({ names, notes, about, onVote }: { names: string[]; notes: string[]; about: string; onVote: () => void }) {
  const [copied, setCopied] = useState(false);
  const [who, setWho] = useState("");
  // Link straight into the swipe vote for THIS shortlist, with context for
  // friends on who's asking and what the project is (App reads ?vote/by/about).
  const base = window.location.origin + window.location.pathname.replace(/index\.html$/, "");
  const params = new URLSearchParams();
  params.set("vote", names.slice(0, 8).join("|"));
  if (notes?.length) params.set("notes", notes.slice(0, 8).map((n) => (n || "").replace(/\|/g, " ")).join("|").slice(0, 700));
  if (who.trim()) params.set("by", who.trim());
  if (about?.trim()) params.set("about", about.trim().slice(0, 180));
  const voteLink = `${base}?${params.toString()}`;
  const msg = `Help me pick my company name 🙌, swipe through my shortlist and tell me your favourite: ${voteLink}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const mail = `mailto:?subject=${encodeURIComponent("Help me name my company")}&body=${encodeURIComponent(msg)}`;
  async function copy() {
    try { await navigator.clipboard.writeText(voteLink); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { window.prompt("Copy this link to share:", voteLink); }
  }
  return (
    <div className="mt-5 rounded-2xl border border-ink/12 bg-[var(--surface-solid)] p-5">
      <p className="font-serif text-xl italic">Still unsure? Ask your friends.</p>
      <p className="mt-1 text-sm text-ink/55">Share your shortlist and let people swipe through it, Tinder-style. The clear favourite usually rises fast.</p>
      <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Your first name (optional), so friends know who's asking"
        className="mt-4 w-full rounded-xl border border-ink/20 bg-[var(--page)] px-4 py-2.5 text-sm outline-none transition placeholder:text-ink/30 focus:border-accent/50" />
      <div className="mt-3 flex flex-wrap gap-2.5">
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
  const free = (top.domains.find((d) => d.tld === ".com")?.available ? 1 : 0) + (top.inpi ? 1 : 0) + (top.instagram ? 1 : 0);
  return (
    <div className="mb-8 overflow-hidden rounded-3xl border border-accent2/30 bg-gradient-to-br from-accent2/12 via-accent/[0.06] to-transparent p-6 sm:p-8">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent2/40 bg-accent2/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent2">★ Our pick for you</span>
      <h3 className="mt-4 font-serif text-6xl leading-[0.95] sm:text-7xl">{top.name}</h3>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink/70">{comp.why}</p>
      <p className="mt-4 font-serif text-base italic text-ink/55">“{top.verdict}” · the studio</p>

      <div className="mt-7 rounded-2xl border border-ink/10 bg-[var(--page)]/60 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          Yours to claim {free === 3 ? "· all three are free right now ✨" : `· ${free} of 3 free right now`}
        </p>
        <Checks row={top} className="mt-4" />
      </div>
    </div>
  );
}

// The end-of-flow checks: domain (.com first), INPI trademark, Instagram handle.
function Checks({ row, className = "" }: { row: CompareRow; className?: string }) {
  const slug = row.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const com = row.domains.find((d) => d.tld === ".com")?.available ?? false;
  const alts = row.domains.filter((d) => d.tld !== ".com");
  return (
    <div className={`grid gap-x-4 gap-y-3.5 sm:grid-cols-3 ${className}`}>
      <CheckItem ok={com} head="Domain" title={`${slug}.com`} sub={alts.map((d) => `${d.tld} ${d.available ? "free" : "taken"}`).join(" · ")} icon={<GlobeGlyph />} />
      <CheckItem ok={row.inpi} amber={!row.inpi} head="Trademark · INPI 🇫🇷" title={row.inpi ? "Looks clear to register" : "Worth a closer check"} sub={row.inpiNote} icon={<ScaleGlyph />} />
      <CheckItem ok={row.instagram} head="Instagram" title={`@${slug}`} sub="handle" icon={<AtGlyph />} />
    </div>
  );
}

function CheckItem({ ok, amber, head, title, sub, icon }: { ok: boolean; amber?: boolean; head: string; title: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${ok ? "bg-emerald-500/15 text-emerald-600" : amber ? "bg-amber-500/15 text-amber-600" : "bg-ink/[0.06] text-ink/40"}`}>
        {ok ? <CheckGlyph /> : amber ? <span className="text-sm font-semibold">!</span> : <span className="text-sm">✕</span>}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-ink/40">{icon}{head}</p>
        <p className={`truncate text-sm ${ok ? "text-ink/85" : amber ? "text-amber-700" : "text-ink/45 line-through"}`}>{title}</p>
        {sub && <p className="truncate text-[11px] text-ink/40">{sub}</p>}
      </div>
    </div>
  );
}

function CheckGlyph() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>; }
function GlobeGlyph() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20A15 15 0 0 1 12 2" /></svg>; }
function ScaleGlyph() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v18M5 7h14M5 7l-3 6h6zM19 7l-3 6h6z" /></svg>; }
function AtGlyph() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7" /></svg>; }

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

function MicGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
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
    feelings: "Reading your brief for the feelings that fit…",
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
