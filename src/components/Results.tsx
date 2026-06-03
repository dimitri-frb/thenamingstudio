import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TYPE_META, type Brief, type NameIdea } from "../lib/generate";
import { eur, PLANS, type PlanId } from "../lib/plans";

const FREE_LIMIT = 8;

export function Results({ results, brief, onMore, onRestart, onCheckout }: {
  results: NameIdea[]; brief: Brief; onMore: () => void; onRestart: () => void; onCheckout: (p: PlanId) => void;
}) {
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<NameIdea | null>(null);
  const recommended = results[0];
  const free = results.slice(1, FREE_LIMIT);
  const locked = results.slice(FREE_LIMIT);

  function toggleFav(name: string) {
    setFavs((s) => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  }

  return (
    <div className="animate-in pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your name shortlist</h2>
          <p className="mt-1 text-ink/50">
            {brief.vibes.length ? brief.vibes.join(" · ") + " · " : ""}ranked by brand strength
          </p>
        </div>
        <div className="flex items-center gap-3">
          {favs.size > 0 && <span className="rounded-full border border-ink/10 bg-ink/5 px-3 py-1.5 text-sm text-ink/60">♥ {favs.size} saved</span>}
          <button onClick={onMore} className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-medium transition hover:bg-ink/5">↻ Regenerate</button>
        </div>
      </div>

      {recommended && (
        <Recommendation idea={recommended} fav={favs.has(recommended.name)} onFav={() => toggleFav(recommended.name)} onPick={() => setPicked(recommended)} />
      )}

      <p className="mt-10 text-sm font-medium uppercase tracking-widest text-ink/40">The rest of your shortlist</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {free.map((n, i) => (
          <NameCard key={n.name} idea={n} fav={favs.has(n.name)} onFav={() => toggleFav(n.name)} onPick={() => setPicked(n)} delay={i} />
        ))}
      </div>

      <Paywall lockedCount={locked.length} locked={locked} onCheckout={onCheckout} />
      <BeyondNames onCheckout={onCheckout} />

      <div className="mt-16 text-center">
        <button onClick={onRestart} className="text-sm text-ink/40 transition hover:text-ink">← Start a new brief</button>
      </div>

      {picked && <NamePopup idea={picked} onClose={() => setPicked(null)} onCheckout={onCheckout} />}
    </div>
  );
}

/* ---- Our pick: featured #1 with a human "why it wins" note ---- */
function syllables(name: string) {
  return (name.toLowerCase().match(/[aeiouy]+/g) || []).length || 1;
}

function whyItWins(idea: NameIdea): { intro: string; points: string[] } {
  const syl = syllables(idea.name);
  const meaning: Record<NameIdea["type"], string> = {
    Suggestive: "It hints at what you do without spelling it out — that's exactly why names like Slack and Uber stuck.",
    AbstractRealWord: "A familiar word in an unfamiliar place. Your brain remembers it on the first pass.",
    Invented: "It's invented, so it's genuinely yours — easy to trademark, with nothing to compete against.",
    Compound: "Two plain words doing one clear job. People get it instantly, no explaining.",
    Evocative: "It leads with a feeling, and a feeling is what people actually remember.",
    Playful: "It's got personality — the kind of name people repeat just because it's fun to say.",
    Descriptive: "It says exactly what you do. Nobody ever has to ask what you're about.",
    FounderName: "It reads like there's a person and a story behind it — warm, and very human.",
    Acronym: "Short and sharp. Once people know you, it's effortless to recall.",
  };

  const points = [
    `Highest combined score of the batch — ${idea.score}/100 across all four checks.`,
    meaning[idea.type],
  ];

  if (syl <= 2) points.push(`Just ${syl} syllable${syl > 1 ? "s" : ""}, and it reads the same in English, French and German — no awkward pauses.`);
  if (idea.name.length <= 7) points.push("You could say it once in a loud room and someone could still spell it right.");

  if (idea.premiumDomain) points.push(`The .com is taken, but it's available as a premium buy — or grab ${idea.domain} today.`);
  else if (idea.domainAvailable) points.push(`And ${idea.domain} is free right now. That almost never happens — worth grabbing.`);
  else points.push(`The exact .com is gone, but ${idea.domain} is open and works perfectly well.`);

  points.push("Broad enough to grow into, too — it won't box you in if you expand beyond the first product.");

  return {
    intro: "Honestly? If this were our company, this is the one we'd run with.",
    points: points.slice(0, 5),
  };
}

function Recommendation({ idea, fav, onFav, onPick }: { idea: NameIdea; fav: boolean; onFav: () => void; onPick: () => void }) {
  const { intro, points } = whyItWins(idea);
  return (
    <div className="relative mt-7 overflow-hidden rounded-3xl border border-accent2/30 bg-gradient-to-br from-accent2/10 via-accent/5 to-transparent p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent2/40 bg-accent2/10 px-3 py-1 text-xs font-semibold text-accent2">★ Our recommendation</span>
        <button
          onClick={onFav}
          className={`text-2xl transition ${fav ? "text-accent2" : "text-ink/20 hover:text-ink/50"}`}
          aria-label="Save name"
        >
          {fav ? "♥" : "♡"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <h3 className="font-serif text-5xl leading-none sm:text-6xl">{idea.name}</h3>
        <span className="mb-1 text-sm font-semibold text-emerald-500">{idea.score}/100</span>
      </div>
      <p className="mt-2 text-ink/55">{idea.tagline}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DomainBadge idea={idea} />
        <span className="rounded-md border border-ink/10 px-2 py-0.5 text-xs text-ink/40">{TYPE_META[idea.type].label}</span>
      </div>

      <div className="mt-6 rounded-2xl border border-ink/10 bg-ink/[0.03] p-5">
        <p className="font-serif text-lg italic text-ink/80">Why we'd choose it</p>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">{intro}</p>
        <ul className="mt-4 space-y-2.5">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink/70">
              <span className="mt-0.5 text-accent2">✓</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-right font-serif text-base italic text-ink/40">— the studio</p>
      </div>

      <button
        onClick={onPick}
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent to-accent2 px-6 py-3.5 font-semibold text-white shadow-lg shadow-accent2/20 transition hover:brightness-110"
      >
        Make {idea.name} mine →
      </button>
    </div>
  );
}

function NameCard({ idea, fav, onFav, onPick, delay }: { idea: NameIdea; fav: boolean; onFav: () => void; onPick: () => void; delay: number }) {
  return (
    <div
      onClick={onPick}
      className="group glass animate-in relative cursor-pointer rounded-2xl p-5 transition hover:border-ink/20 hover:-translate-y-0.5"
      style={{ animationDelay: `${delay * 50}ms` }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onFav(); }}
        className={`absolute right-4 top-4 text-xl transition ${fav ? "text-accent2" : "text-ink/20 hover:text-ink/50"}`}
        aria-label="Save name"
      >
        {fav ? "♥" : "♡"}
      </button>

      <div className="flex items-center gap-2">
        <h3 className="font-serif text-3xl leading-none">{idea.name}</h3>
        <ScorePill score={idea.score} />
      </div>
      <p className="mt-2 text-sm text-ink/55">{idea.tagline}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DomainBadge idea={idea} />
        <span className="rounded-md border border-ink/10 px-2 py-0.5 text-xs text-ink/40">{TYPE_META[idea.type].label}</span>
      </div>

      <AxisBars idea={idea} />
      <p className="mt-3 text-xs leading-relaxed text-ink/35">{idea.rationale}</p>
      <p className="mt-3 text-xs font-medium text-accent2 opacity-0 transition group-hover:opacity-100">Choose this name →</p>
    </div>
  );
}

/* "Amazing name! What do you want to do next?" — opens on name click. */
function NamePopup({ idea, onClose, onCheckout }: { idea: NameIdea; onClose: () => void; onCheckout: (p: PlanId) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const actions: { icon: string; title: string; sub: string; plan: PlanId }[] = [
    { icon: "🛡️", title: "Register it at INPI", sub: "Lock the trademark in France & the EU", plan: "launch" },
    { icon: "🎨", title: "Create a logo", sub: "Logo & color directions, on brand", plan: "founder" },
    { icon: "📖", title: "Design the brand", sub: "Full brand book — type, voice, palette", plan: "launch" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-in relative w-full max-w-md rounded-3xl border border-ink/10 [background:var(--surface-solid)] p-7 text-center shadow-2xl shadow-black/40">
        <button onClick={onClose} className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-lg text-ink/40 transition hover:bg-ink/5 hover:text-ink" aria-label="Close">✕</button>

        <span className="text-3xl">🎉</span>
        <h3 className="mt-2 text-xl font-bold">Amazing name!</h3>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="font-serif text-4xl">{idea.name}</span>
        </div>
        <p className="mt-1 text-sm text-ink/45">{idea.domain} · {TYPE_META[idea.type].label}</p>
        <p className="mt-4 text-sm font-medium text-ink/70">What do you want to do next?</p>

        <div className="mt-4 space-y-2.5 text-left">
          {actions.map((a) => (
            <button
              key={a.title}
              onClick={() => { onClose(); onCheckout(a.plan); }}
              className="group flex w-full items-center gap-3 rounded-2xl border border-ink/10 bg-ink/[0.02] p-3.5 text-left transition hover:border-accent2/40 hover:bg-ink/5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink/5 text-xl">{a.icon}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{a.title}</span>
                <span className="block text-xs text-ink/45">{a.sub}</span>
              </span>
              <span className="text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-accent2">→</span>
            </button>
          ))}
        </div>

        <button onClick={onClose} className="mt-4 text-xs text-ink/40 transition hover:text-ink">Maybe later — keep browsing</button>
      </div>
    </div>,
    document.body,
  );
}

function AxisBars({ idea }: { idea: NameIdea }) {
  const axes: { k: string; v: number }[] = [
    { k: "Intuitive", v: idea.axes.intuitive },
    { k: "Visual", v: idea.axes.visual },
    { k: "Sound", v: idea.axes.sound },
    { k: "Emotional", v: idea.axes.emotional },
  ];
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {axes.map((a) => (
        <div key={a.k} title={`${a.k}: ${a.v}`}>
          <div className="h-1 w-full overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent2" style={{ width: `${a.v}%` }} />
          </div>
          <span className="mt-1 block text-[10px] text-ink/35">{a.k}</span>
        </div>
      ))}
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  // emerald-500/accent3 read well on both light & dark themes
  const color = score >= 85 ? "text-emerald-500" : score >= 75 ? "text-accent3" : "text-ink/50";
  return <span className={`text-xs font-semibold ${color}`} title="Brand strength (avg of 4 axes)">{score}</span>;
}

function DomainBadge({ idea }: { idea: NameIdea }) {
  if (idea.premiumDomain) return <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-300">◆ {idea.domain} · premium</span>;
  if (idea.domainAvailable) return <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">● {idea.domain} available</span>;
  return <span className="rounded-md bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/45">○ {idea.domain} taken</span>;
}

function Paywall({ lockedCount, locked, onCheckout }: { lockedCount: number; locked: NameIdea[]; onCheckout: (p: PlanId) => void }) {
  const teaser = locked.slice(0, 6);
  return (
    <div className="relative mt-4">
      <div className="pointer-events-none grid select-none gap-4 opacity-50 blur-[6px] sm:grid-cols-2">
        {teaser.map((n) => (
          <div key={n.name} className="glass rounded-2xl p-5">
            <h3 className="font-serif text-3xl">{n.name}</h3>
            <p className="mt-2 text-sm text-ink/50">{n.tagline}</p>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="glass w-full max-w-md rounded-3xl border-accent2/30 p-7 text-center shadow-2xl shadow-accent2/10">
          <span className="text-3xl">🔓</span>
          <h3 className="mt-3 text-2xl font-bold">Unlock {lockedCount}+ more names</h3>
          <p className="mt-2 text-sm text-ink/55">Plus live domain search across every TLD and an INPI 🇫🇷 / EUIPO trademark conflict check — so you pick a name you can actually own.</p>
          <button onClick={() => onCheckout("founder")} className="mt-5 w-full rounded-xl bg-gradient-to-r from-accent to-accent2 text-white px-6 py-3.5 font-semibold shadow-lg shadow-accent2/20 transition hover:brightness-110">Unlock Founder — {eur(PLANS.founder.price)}</button>
          <p className="mt-2.5 text-xs text-ink/35">One-time · instant access · no subscription</p>
        </div>
      </div>
    </div>
  );
}

function BeyondNames({ onCheckout }: { onCheckout: (p: PlanId) => void }) {
  const cards: { icon: string; title: string; body: string; tag: string; plan: PlanId }[] = [
    { icon: "🌐", title: "Domain search & registration", body: "Real-time availability across .com, .io, .fr and 400+ TLDs. Found the one? We register it for you.", tag: "Founder & Launch", plan: "founder" },
    { icon: "🛡️", title: "INPI trademark check & filing", body: "We screen your name against existing French & EU trademarks, flag conflicts, then file the deposit for you.", tag: "Launch", plan: "launch" },
    { icon: "📘", title: "Brand book", body: "Logo directions, color palette, typography and voice — a ready-to-share PDF to launch with confidence.", tag: "Launch", plan: "launch" },
  ];
  return (
    <section className="mt-24">
      <h2 className="text-center text-2xl font-bold tracking-tight">A name is just the start</h2>
      <p className="mt-2 text-center text-ink/50">The naming studio takes you all the way from idea to a brand you legally own.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <button key={c.title} onClick={() => onCheckout(c.plan)} className="glass rounded-2xl p-6 text-left transition hover:border-ink/20">
            <span className="text-3xl">{c.icon}</span>
            <h3 className="mt-3 font-semibold">{c.title}</h3>
            <p className="mt-1.5 text-sm text-ink/50">{c.body}</p>
            <span className="mt-4 inline-block rounded-full border border-ink/10 px-2.5 py-0.5 text-xs text-ink/40">{c.tag}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
