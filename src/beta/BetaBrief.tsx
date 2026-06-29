// Beta · Step 1 (Company context) — the brief, rebuilt to the Claude Design "1d"
// screen: a two-column intake with Industry as selectable chips and Stage as a
// segmented control, beside a sticky "brief, so far" reframe card.
import type { Brief } from "../lib/namingApi";
import { INDUSTRIES, STAGES } from "../cosmos/data";
import { Head, Foot } from "../cosmos/chrome";
import { BField, Chips, Segmented, ReframeCard } from "./atoms";

export function BetaBrief({ brief, set, stage, setStage, workingName, setWorkingName, briefLine, briefTags, onBack, onNext }: {
  brief: Brief; set: (patch: Partial<Brief>) => void;
  stage: string; setStage: (s: string) => void;
  workingName: string; setWorkingName: (s: string) => void;
  briefLine: string; briefTags: string[];
  onBack: () => void; onNext: () => void;
}) {
  return (
    <>
      <Head eyebrow="The brief · 1 of 4" title={<>First, what does the <em>company</em> do?</>}
        sub="The sharper this is, the sharper your name." />
      <div className="bintake">
        <div className="bintake-main">
          <BField label="What it does" hint="· one plain sentence">
            <textarea className="binput barea" rows={3} value={brief.does}
              onChange={(e) => set({ does: e.target.value })}
              placeholder="An AI naming studio that helps founders find a brand name with the rigor of a strategist, in minutes instead of months." />
          </BField>
          <BField label="Industry">
            <Chips options={INDUSTRIES} value={brief.industry}
              onPick={(v) => set({ industry: brief.industry === v ? "" : v })} />
          </BField>
          <BField label="Stage">
            <Segmented options={STAGES} value={stage} onChange={setStage} />
          </BField>
          <BField label="Working name" hint="· optional, we won't be bound by it">
            <input className="binput" value={workingName}
              onChange={(e) => setWorkingName(e.target.value)} placeholder="Untitled" />
          </BField>
        </div>
        <ReframeCard line={briefLine} tags={briefTags} />
      </div>
      <Foot back="Welcome" onBack={onBack} next="Next: brand context →"
        disabled={!brief.does.trim()} onNext={onNext} />
    </>
  );
}
