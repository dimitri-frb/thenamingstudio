// Beta · Steps 2 & 3 (Brand context, Emotional value) — the rest of the intake,
// in the same two-column vocabulary as BetaBrief (textareas / chip pickers beside
// the live "brief, so far" reframe card).
import type { Brief } from "../lib/namingApi";
import { TONE_OPTIONS, GEO_OPTIONS } from "../cosmos/data";
import { Head, Foot } from "../cosmos/chrome";
import { BField, Chips, ReframeCard } from "./atoms";

// Step 2 — Brand context: problem / audience / unique proposition.
export function BetaBrand({ brief, set, briefLine, briefTags, onBack, onNext }: {
  brief: Brief; set: (patch: Partial<Brief>) => void;
  briefLine: string; briefTags: string[]; onBack: () => void; onNext: () => void;
}) {
  return (
    <>
      <Head eyebrow="The brief · 2 of 4" title={<>Now the <em>brand</em>: who it's for, why it matters.</>}
        sub="The problem you solve, who you solve it for, and what only you can claim." />
      <div className="bintake">
        <div className="bintake-main">
          <BField label="The problem you solve">
            <textarea className="binput barea" rows={2} value={brief.problem} onChange={(e) => set({ problem: e.target.value })}
              placeholder="Founders spend weeks on naming and settle for something generic or compromised." />
          </BField>
          <BField label="Who it's for" hint="· and what they value">
            <textarea className="binput barea" rows={2} value={brief.audience} onChange={(e) => set({ audience: e.target.value })}
              placeholder="Startup founders and brand strategists. Time-pressed, care about craft." />
          </BField>
          <BField label="What's your unique proposition" hint="· the one claim rivals can't credibly make">
            <textarea className="binput barea" rows={2} value={brief.uvp} onChange={(e) => set({ uvp: e.target.value })}
              placeholder="e.g. Strategy-first naming with the rigor of a senior consultant, in minutes not months." />
          </BField>
        </div>
        <ReframeCard line={briefLine} tags={briefTags} />
      </div>
      <Foot back="Company context" onBack={onBack} next="Next: emotional value →" disabled={!brief.problem.trim()} onNext={onNext} />
    </>
  );
}

// Step 3 — Emotional value: what the name should signal, its tone, its markets.
export function BetaEmotional({ brief, set, toggleArr, signalOpts, briefLine, briefTags, onBack, onNext }: {
  brief: Brief; set: (patch: Partial<Brief>) => void;
  toggleArr: (arr: string[], v: string, max?: number) => string[];
  signalOpts: string[]; briefLine: string; briefTags: string[]; onBack: () => void; onNext: () => void;
}) {
  return (
    <>
      <Head eyebrow="The brief · 3 of 4" title={<>What should the name <em>signal</em>?</>}
        sub="Pick the feelings it should carry." />
      <div className="bintake">
        <div className="bintake-main" style={{ gap: 26 }}>
          <BField label="The name should signal" hint="· pick 3 to 5">
            <Chips options={signalOpts} value={brief.signal} max={5} onPick={(s) => set({ signal: toggleArr(brief.signal, s, 5) })} />
          </BField>
          <BField label="Tonal register" hint="· pick 2 to 3">
            <Chips options={TONE_OPTIONS} value={brief.tone} max={3} onPick={(s) => set({ tone: toggleArr(brief.tone, s, 3) })} />
          </BField>
          <BField label="Where it needs to work" hint="· optional, reads well in these markets">
            <Chips options={GEO_OPTIONS} value={brief.geos || []} onPick={(s) => set({ geos: toggleArr(brief.geos || [], s) })} />
          </BField>
        </div>
        <ReframeCard line={briefLine} tags={briefTags} />
      </div>
      <Foot back="Brand context" onBack={onBack} next="Next: naming strategy →" disabled={brief.signal.length < 1} onNext={onNext} />
    </>
  );
}
