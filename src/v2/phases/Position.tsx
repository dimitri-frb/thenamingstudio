// Phase 1 — Position. A short, guided conversation that produces the NameBrief.
// Three cards keep it under a couple of minutes; the studio reflects a tension
// back if the personality and the name-job slider disagree.

import { useEffect, useMemo, useState } from "react";
import type { NameBrief } from "../types";
import { PERSONALITY_POOL, briefTension } from "../studioEngine";
import { Chip, Field, FooterNav, PhaseHeader, PrimaryButton, StudioNote } from "../ui";

const TARGETS: { key: NameBrief["namingTarget"]; label: string; hint: string }[] = [
  { key: "company", label: "A company", hint: "the whole brand" },
  { key: "product", label: "A product", hint: "inside a brand" },
  { key: "rename", label: "A rename", hint: "starting over" },
];
const MARKETS = ["FR", "EU", "US", "UK", "Global"];

export function Position({
  initial,
  onBack,
  onDraft,
  onDone,
}: {
  initial?: NameBrief;
  onBack: () => void;
  onDraft?: (brief: NameBrief) => void;
  onDone: (brief: NameBrief) => void;
}) {
  const [step, setStep] = useState(0);
  const [namingTarget, setTarget] = useState<NameBrief["namingTarget"]>(initial?.namingTarget || "company");
  const [whatItDoes, setWhat] = useState(initial?.whatItDoes || "");
  const [audience, setAudience] = useState(initial?.audience || "");
  const [oneThingToOwn, setOwn] = useState(initial?.oneThingToOwn || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [competitorsRaw, setCompetitors] = useState((initial?.competitors || []).join(", "));
  const [personality, setPersonality] = useState<string[]>(initial?.personality || []);
  const [nameJob, setNameJob] = useState<number>(initial?.nameJob ?? 50);
  const [targetMarkets, setMarkets] = useState<string[]>(initial?.targetMarkets || ["FR"]);

  const competitors = useMemo(
    () => competitorsRaw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 6),
    [competitorsRaw],
  );

  const draft: NameBrief = {
    namingTarget, whatItDoes, audience, oneThingToOwn, category, competitors,
    personality, nameJob, targetMarkets,
  };
  const tension = step === 2 ? briefTension(draft) : null;

  // Feed the live draft up to the brief panel as the founder fills it in. Keyed
  // on the actual fields (not the draft object) so it fires on input, not on
  // every render, which would loop.
  useEffect(() => { onDraft?.(draft); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [namingTarget, whatItDoes, audience, oneThingToOwn, category, competitorsRaw, personality, nameJob, targetMarkets]);

  function toggle<T>(arr: T[], v: T, set: (a: T[]) => void, max = 99, min = 0) {
    if (arr.includes(v)) { if (arr.length > min) set(arr.filter((x) => x !== v)); }
    else if (arr.length < max) set([...arr, v]);
  }

  const canA = whatItDoes.trim().length > 2 && audience.trim().length > 1;
  const canB = oneThingToOwn.trim().length > 1 && category.trim().length > 1;
  const canC = personality.length >= 3 && targetMarkets.length >= 1;

  return (
    <div className="animate-in mx-auto max-w-2xl">
      <PhaseHeader phase={1} title="Let's position" accent="the brand." />
      <StudioNote>
        {step === 0 && "Before a single name, we get the strategy right. Tell me what we're naming and who it's for, in your own words."}
        {step === 1 && "Now the edge. What's the one thing you want to be known for, and who are you up against?"}
        {step === 2 && "Last piece: the character, and how hard you want the name itself to work."}
      </StudioNote>

      <div className="mt-7 space-y-5">
        {step === 0 && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink/60">What are we naming?</label>
              <div className="grid grid-cols-3 gap-2">
                {TARGETS.map((t) => (
                  <Chip key={t.key} active={namingTarget === t.key} onClick={() => setTarget(t.key)}>
                    <span className="block font-semibold">{t.label}</span>
                    <span className="block text-xs text-ink/40">{t.hint}</span>
                  </Chip>
                ))}
              </div>
            </div>
            <Field label="What does it do?" placeholder="e.g. an AI naming studio that helps founders name their company in minutes" value={whatItDoes} onChange={setWhat} textarea />
            <Field label="Who is it for?" placeholder="e.g. first-time founders" value={audience} onChange={setAudience} />
          </>
        )}

        {step === 1 && (
          <>
            <Field label="The one thing to own" placeholder="e.g. the rigor of a strategist at the speed of a tool" value={oneThingToOwn} onChange={setOwn} hint="If people remembered one thing about you, what should it be?" />
            <Field label="The category" placeholder="e.g. branding tools · SaaS" value={category} onChange={setCategory} />
            <Field label="Competitors" placeholder="e.g. Namelix, Looka, Brandpa" value={competitorsRaw} onChange={setCompetitors} hint="Name 2 to 4, comma-separated. They sharpen the directions." />
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink/60">Personality <span className="text-ink/35">· pick 3 to 5</span></label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {PERSONALITY_POOL.map((p) => (
                  <Chip key={p} active={personality.includes(p)} onClick={() => toggle(personality, p, setPersonality, 5)}>
                    <span className="text-sm font-medium">{p}</span>
                  </Chip>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-ink/15 bg-[var(--surface-solid)] p-4">
              <label className="block text-sm font-medium text-ink/60">How hard should the name work?</label>
              <input
                type="range" min={0} max={100} value={nameJob}
                onChange={(e) => setNameJob(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--c-accent)]"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-wide text-ink/45">
                <span>Explains what we do</span>
                <span>An empty vessel</span>
              </div>
              <p className="mt-2 text-xs text-ink/50">
                {nameJob <= 35
                  ? "Descriptive. Great when the category is unknown or the budget is tight, the name does the explaining."
                  : nameJob >= 65
                    ? "Abstract. Great if you'll invest in the brand, you give it meaning over time."
                    : "Balanced. A hint of meaning, plenty of room to grow into."}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink/60">Target markets <span className="text-ink/35">· drives the language checks</span></label>
              <div className="flex flex-wrap gap-2">
                {MARKETS.map((m) => (
                  <button key={m} onClick={() => toggle(targetMarkets, m, setMarkets, 99, 1)}
                    className={`rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-wide transition ${
                      targetMarkets.includes(m) ? "border-accent bg-accent/10 text-accent" : "border-ink/15 text-ink/50 hover:border-ink/30"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {tension && <StudioNote tone="tension">{tension}</StudioNote>}
          </>
        )}
      </div>

      <FooterNav onBack={() => (step === 0 ? onBack() : setStep(step - 1))} backLabel={step === 0 ? "← Home" : "← Back"}>
        {step < 2 ? (
          <PrimaryButton onClick={() => setStep(step + 1)} disabled={step === 0 ? !canA : !canB}>
            Continue →
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => onDone(draft)} disabled={!canC}>
            Read the room →
          </PrimaryButton>
        )}
      </FooterNav>
    </div>
  );
}
