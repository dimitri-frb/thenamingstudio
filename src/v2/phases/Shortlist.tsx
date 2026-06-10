// Phase 5 — Shortlist (the core fix). Names arrive already scored (SMILE),
// flagged for failure modes (SCRATCH), and availability-pre-screened (.com,
// Instagram, INPI) so founders only fall for names they can actually own. The
// friend-vote tie-break lives here, at the torn-between-finalists moment.

import { useEffect, useMemo, useState } from "react";
import type { NameBrief, NameCandidate, ScratchFlags, SmileScore, SoundscapeAnalysis, Territory } from "../types";
import { studio } from "../studioApi";
import { FooterNav, PhaseHeader, PrimaryButton, StatePill, StudioNote, Thinking } from "../ui";

const SCRATCH_LABELS: { key: keyof ScratchFlags; label: string }[] = [
  { key: "spellingChallenged", label: "Hard to spell" },
  { key: "copycat", label: "Echoes a rival" },
  { key: "restrictive", label: "Boxes you in" },
  { key: "annoying", label: "Could grate" },
  { key: "tame", label: "Plays it safe" },
  { key: "hardToPronounce", label: "Tongue-twister" },
];

export function Shortlist({
  brief,
  keptWords,
  territories,
  soundscape,
  initialCandidates,
  initialFinalists,
  onBack,
  onDone,
}: {
  brief: NameBrief;
  keptWords: string[];
  territories: Territory[];
  soundscape?: SoundscapeAnalysis;
  initialCandidates?: NameCandidate[];
  initialFinalists?: string[];
  onBack: () => void;
  onDone: (candidates: NameCandidate[], finalists: string[]) => void;
}) {
  const [candidates, setCandidates] = useState<NameCandidate[]>(initialCandidates || []);
  const [finalists, setFinalists] = useState<string[]>(initialFinalists || []);
  const [loading, setLoading] = useState(!initialCandidates?.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [seed, setSeed] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (initialCandidates?.length) return;
    let live = true;
    studio.candidates(brief, keptWords, territories, soundscape, 8, 0).then((c) => {
      if (live) { setCandidates(c); setLoading(false); }
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestMore() {
    setLoadingMore(true);
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    studio.candidates(brief, keptWords, territories, soundscape, 4, nextSeed).then((more) => {
      setCandidates((prev) => {
        const seen = new Set(prev.map((c) => c.name.toLowerCase()));
        return [...prev, ...more.filter((c) => !seen.has(c.name.toLowerCase()))];
      });
      setLoadingMore(false);
    });
  }

  function toggleFinalist(id: string) {
    setFinalists((f) => (f.includes(id) ? f.filter((x) => x !== id) : f.length >= 3 ? f : [...f, id]));
  }

  const ownableCount = useMemo(() => candidates.filter((c) => c.ownable).length, [candidates]);

  if (loading) {
    return (
      <div className="animate-in mx-auto max-w-3xl">
        <PhaseHeader phase={4} title="Building" accent="the shortlist." />
        <Thinking lines={["Scoring, flagging and checking each name…", "SMILE · SCRATCH · domain · handle · INPI"]} />
      </div>
    );
  }

  return (
    <div className="animate-in mx-auto max-w-3xl">
      <PhaseHeader phase={4} title="Your" accent="shortlist." />
      <StudioNote>
        These cleared the bar: strong on the things that make a name work, and actually ownable. {ownableCount} of {candidates.length} pass the ownability gate. Pick 1 to 3 finalists to pressure-test, or ask a friend to break the tie.
      </StudioNote>

      <div className="mt-7 space-y-3">
        {candidates.map((c) => (
          <CandidateCard key={c.id} c={c} picked={finalists.includes(c.id)} onPick={() => toggleFinalist(c.id)} />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button onClick={requestMore} disabled={loadingMore} className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm font-medium text-ink/65 transition hover:border-ink/40 disabled:opacity-40">
          {loadingMore ? "Thinking…" : "Show me more →"}
        </button>
        <ShareVote
          brief={brief}
          names={(finalists.length ? candidates.filter((c) => finalists.includes(c.id)) : candidates.filter((c) => c.ownable).slice(0, 5)).map((c) => ({ name: c.name, note: c.rationale }))}
          open={shareOpen}
          setOpen={setShareOpen}
        />
      </div>

      <FooterNav
        onBack={onBack}
        middle={<span className="font-mono text-xs text-accent">{finalists.length} / 3 finalists</span>}
      >
        <PrimaryButton onClick={() => onDone(candidates, finalists)} disabled={finalists.length < 1}>
          Pressure-test →
        </PrimaryButton>
      </FooterNav>
    </div>
  );
}

function CandidateCard({ c, picked, onPick }: { c: NameCandidate; picked: boolean; onPick: () => void }) {
  const warnings = SCRATCH_LABELS.filter(({ key }) => c.scratch[key]);
  const badMeaning = c.scratch.badMeaningInMarkets || [];
  return (
    <button
      onClick={onPick}
      className={`block w-full rounded-2xl border p-4 text-left transition ${picked ? "border-accent bg-accent/5 shadow-sm" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-2xl">{c.name}</span>
            {c.ownable ? (
              <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-emerald-700">ownable</span>
            ) : (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-rose-700">at risk</span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink/55">{c.rationale}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <SmileDial smile={c.smile} />
          <span className={`grid h-6 w-6 place-items-center rounded-full border text-[12px] ${picked ? "border-accent bg-accent text-white" : "border-ink/25 text-transparent"}`}>✓</span>
        </div>
      </div>

      <SmileBars smile={c.smile} />

      {/* availability + warnings */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink/10 pt-3 text-xs">
        <span className="flex items-center gap-1.5 text-ink/55">{c.name.toLowerCase()}.com <StatePill state={c.availability.domainCom} /></span>
        <span className="flex items-center gap-1.5 text-ink/55">@{c.name.toLowerCase()} <StatePill state={c.availability.instagram} /></span>
        <span className="flex items-center gap-1.5 text-ink/55">INPI <StatePill state={c.availability.trademarkINPI} /></span>
      </div>
      {(warnings.length > 0 || badMeaning.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {warnings.map((w) => (
            <span key={w.key} className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-700">⚠ {w.label}</span>
          ))}
          {badMeaning.map((m) => (
            <span key={m} className="rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-700">⚠ Check meaning · {m}</span>
          ))}
        </div>
      )}
    </button>
  );
}

function SmileDial({ smile }: { smile: SmileScore }) {
  return (
    <div className="text-right">
      <span className="font-serif text-2xl italic text-accent">{smile.overall}</span>
      <span className="block font-mono text-[9px] uppercase tracking-wide text-ink/35">SMILE</span>
    </div>
  );
}

function SmileBars({ smile }: { smile: SmileScore }) {
  const rows: [string, number][] = [
    ["Suggestive", smile.suggestive],
    ["Memorable", smile.memorable],
    ["Imagery", smile.imagery],
    ["Legs", smile.legs],
    ["Emotional", smile.emotional],
  ];
  return (
    <div className="mt-3 grid grid-cols-5 gap-2">
      {rows.map(([label, v]) => (
        <div key={label}>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-accent/70" style={{ width: `${v}%` }} />
          </div>
          <span className="mt-1 block text-center font-mono text-[8px] uppercase tracking-wide text-ink/40">{label}</span>
        </div>
      ))}
    </div>
  );
}

// Friend-vote tie-break: builds the same ?vote= share link v1 uses, so friends
// drop straight into the swipe vote (handled at the app root).
function ShareVote({ brief, names, open, setOpen }: {
  brief: NameBrief;
  names: { name: string; note: string }[];
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [who, setWho] = useState("");
  const link = useMemo(() => {
    const base = window.location.origin + window.location.pathname;
    const p = new URLSearchParams();
    p.set("vote", names.map((n) => n.name).join("|"));
    p.set("notes", names.map((n) => n.note).join("|"));
    if (who.trim()) p.set("by", who.trim());
    p.set("about", brief.whatItDoes.slice(0, 160));
    return `${base}?${p.toString()}`;
  }, [names, who, brief.whatItDoes]);

  if (!names.length) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-xl border border-accent/40 bg-accent/[0.04] px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/10">
        Torn? Ask your friends ♥
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-2 w-80 rounded-2xl border border-ink/15 bg-[var(--surface-solid)] p-4 shadow-xl">
          <p className="font-serif text-lg italic">Let your people vote.</p>
          <p className="mt-1 text-xs text-ink/50">They swipe through {names.length} name{names.length > 1 ? "s" : ""}, you get the tally back. Each share also brings someone new to the studio.</p>
          <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="your first name" className="mt-3 w-full rounded-lg border border-ink/20 bg-[var(--page)] px-3 py-2 text-sm outline-none focus:border-accent/50" />
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent("Help me name my project: " + link)}`} target="_blank" rel="noreferrer" className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white">WhatsApp</a>
            <a href={`mailto:?subject=${encodeURIComponent("Help me pick a name")}&body=${encodeURIComponent(link)}`} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-[var(--page)]">Email</a>
            <button onClick={() => navigator.clipboard?.writeText(link)} className="rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink/65">Copy link</button>
          </div>
        </div>
      )}
    </div>
  );
}
