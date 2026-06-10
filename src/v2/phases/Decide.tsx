// Phase 7 — Decide & own. The earned peak: a hero recommendation with the
// written story you'd tell an investor, the three checks now verified, then
// "make it real" (domain, trademark, brand book). Checks stay free; the brand
// book is the paid hero.

import { useEffect, useMemo, useState } from "react";
import type { NameBrief, NameCandidate } from "../types";
import { studio } from "../studioApi";
import { toLegacyBrief } from "../studioEngine";
import { BrandBook } from "../../components/BrandBook";
import { FooterNav, PhaseHeader, StatePill, StudioNote, Thinking } from "../ui";

export function Decide({
  brief,
  survivors,
  onBack,
  onRestart,
}: {
  brief: NameBrief;
  survivors: NameCandidate[];
  onBack: () => void;
  onRestart: () => void;
}) {
  const ranked = useMemo(() => [...survivors].sort((a, b) => b.smile.overall - a.smile.overall), [survivors]);
  const [chosenId, setChosenId] = useState(ranked[0]?.id || "");
  const chosen = ranked.find((c) => c.id === chosenId) || ranked[0];
  const [rationale, setRationale] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    if (!chosen) return;
    let live = true;
    setRationale(null);
    studio.rationale(brief, chosen).then((r) => { if (live) setRationale(r); });
    return () => { live = false; };
  }, [brief, chosen]);

  if (!chosen) {
    return (
      <div className="animate-in mx-auto max-w-2xl">
        <PhaseHeader phase={7} title="Decide" accent="& own." />
        <StudioNote>No finalists survived. Step back and keep a couple more, even a flawed name beats no name.</StudioNote>
        <FooterNav onBack={onBack}>{null}</FooterNav>
      </div>
    );
  }

  const slug = chosen.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const godaddy = `https://www.godaddy.com/domainsearch/find?domainToCheck=${slug}.com`;
  const inpi = "https://procedures.inpi.fr/?/";
  const shareLink = `${window.location.origin}${window.location.pathname}`;

  return (
    <div className="animate-in mx-auto max-w-2xl">
      <PhaseHeader phase={7} title="You found" accent="it." />

      {/* finalist switcher */}
      {ranked.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {ranked.map((c) => (
            <button key={c.id} onClick={() => setChosenId(c.id)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${c.id === chosenId ? "border-accent bg-accent/10 text-accent" : "border-ink/15 text-ink/55 hover:border-ink/30"}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* hero */}
      <div className="mt-6 rounded-[28px] border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-accent2/[0.04] p-8 text-center shadow-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">The studio recommends</p>
        <h3 className="mt-3 font-serif text-6xl">{chosen.name}</h3>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 text-ink/60">{slug}.com <StatePill state={chosen.availability.domainCom} /></span>
          <span className="flex items-center gap-1.5 text-ink/60">@{slug} <StatePill state={chosen.availability.instagram} /></span>
          <span className="flex items-center gap-1.5 text-ink/60">INPI <StatePill state={chosen.availability.trademarkINPI} /></span>
        </div>
      </div>

      {/* rationale */}
      <div className="mt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">Why this name</p>
        {rationale ? (
          <p className="mt-2 font-serif text-xl italic leading-relaxed text-ink/80">{rationale}</p>
        ) : (
          <Thinking lines={["Writing the case for it…"]} />
        )}
      </div>

      {/* make it real */}
      <div className="mt-8">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-accent">Make it real</p>
        <div className="space-y-3">
          <RealStep
            n="01" title="Get the brand book" sub="Story, voice, colour, type and messaging, ready to use. The studio's hero deliverable."
            cta="Create it →" badge="€49" highlight onClick={() => setBookOpen(true)}
          />
          <RealStep n="02" title="File the trademark" sub="We prepare and file your mark with the INPI, the part nobody enjoys doing alone." cta="File with the studio →" href={inpi} />
          <RealStep n="03" title="Buy the domain" sub={`Grab ${slug}.com before someone else does.`} cta="Search on GoDaddy →" href={godaddy} />
        </div>
      </div>

      {/* lighter "I named it" share */}
      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-6">
        <span className="font-serif text-lg italic text-ink/60">Tell the world you named it.</span>
        <a href={`https://wa.me/?text=${encodeURIComponent(`We're calling it ${chosen.name}. Named with the studio: ${shareLink}`)}`} target="_blank" rel="noreferrer" className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white">Share</a>
        <button onClick={() => navigator.clipboard?.writeText(`We're calling it ${chosen.name}.`)} className="rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink/65">Copy</button>
      </div>

      <FooterNav onBack={onBack}>
        <button onClick={onRestart} className="text-sm text-ink/50 transition hover:text-ink">Start over →</button>
      </FooterNav>

      {bookOpen && <BrandBook brief={toLegacyBrief(brief)} name={chosen.name} onClose={() => setBookOpen(false)} />}
    </div>
  );
}

function RealStep({ n, title, sub, cta, href, onClick, badge, highlight }: {
  n: string; title: string; sub: string; cta: string; href?: string; onClick?: () => void; badge?: string; highlight?: boolean;
}) {
  const inner = (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition ${highlight ? "border-accent/40 bg-accent/[0.05] hover:bg-accent/10" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"}`}>
      <div className="flex items-start gap-3">
        <span className="font-mono text-xs text-ink/35">{n}</span>
        <div>
          <p className="flex items-center gap-2 font-medium text-ink/80">{title} {badge && <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] text-accent">{badge}</span>}</p>
          <p className="text-sm text-ink/50">{sub}</p>
        </div>
      </div>
      <span className="shrink-0 font-serif text-base italic text-accent">{cta}</span>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer" className="block">{inner}</a>;
  return <button onClick={onClick} className="block w-full text-left">{inner}</button>;
}
