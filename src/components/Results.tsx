import { useState } from "react";
import { TYPE_META, type Brief, type NameIdea } from "../lib/generate";
import { eur, PLANS, type PlanId } from "../lib/plans";

const FREE_LIMIT = 8;

export function Results({ results, brief, onMore, onRestart, onCheckout }: {
  results: NameIdea[]; brief: Brief; onMore: () => void; onRestart: () => void; onCheckout: (p: PlanId) => void;
}) {
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const free = results.slice(0, FREE_LIMIT);
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

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {free.map((n, i) => (
          <NameCard key={n.name} idea={n} fav={favs.has(n.name)} onFav={() => toggleFav(n.name)} delay={i} />
        ))}
      </div>

      <Paywall lockedCount={locked.length} locked={locked} onCheckout={onCheckout} />
      <BeyondNames onCheckout={onCheckout} />

      <div className="mt-16 text-center">
        <button onClick={onRestart} className="text-sm text-ink/40 transition hover:text-ink">← Start a new brief</button>
      </div>
    </div>
  );
}

function NameCard({ idea, fav, onFav, delay }: { idea: NameIdea; fav: boolean; onFav: () => void; delay: number }) {
  return (
    <div className="group glass animate-in relative rounded-2xl p-5 transition hover:border-ink/20" style={{ animationDelay: `${delay * 50}ms` }}>
      <button onClick={onFav} className={`absolute right-4 top-4 text-xl transition ${fav ? "text-accent2" : "text-ink/20 hover:text-ink/50"}`} aria-label="Save name">
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
    </div>
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
      <p className="mt-2 text-center text-ink/50">Brandr takes you all the way from idea to a brand you legally own.</p>
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
