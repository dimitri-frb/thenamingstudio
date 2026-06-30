// Beta intake screens (01–04), rebuilt to the redesign: 1d brief, 1g brand
// context, 1h emotional value (north star), 1i naming strategy.
import { useState } from "react";
import type { Brief } from "../../lib/namingApi";
import { INDUSTRIES, GEO_OPTIONS, LANES } from "../../cosmos/data";

// The design's three stages (the studio's full list is collapsed to these here).
const BETA_STAGES = ["Idea", "Building it", "Launched"];
import { recommendLanes } from "../../lib/localStudio";
import { BField, Chips, Segmented, ReframeCard, BHead, BFoot } from "../atoms";

// 01 — Company context (design 1d)
export function BetaBrief({ brief, set, stage, setStage, firstName, briefLine, briefTags, onBack, onNext }: {
  brief: Brief; set: (p: Partial<Brief>) => void; stage: string; setStage: (s: string) => void;
  firstName?: string; briefLine: string; briefTags: string[];
  onBack: () => void; onNext: () => void;
}) {
  const [custom, setCustom] = useState(false);
  const known = INDUSTRIES.includes(brief.industry);
  return (
    <>
      <div className="bbody">
        <div className="bintake">
          <div className="bintake-main">
            <BHead eyebrow="The brief · 1 of 4" title={firstName ? <>{firstName}, what does the company do?</> : <>First, what does the company do?</>}
              sub="The sharper this is, the sharper your name." />
            <BField label="What it does" hint="· one plain sentence">
              <textarea className="binput barea" rows={3} value={brief.does} onChange={(e) => set({ does: e.target.value })}
                placeholder="An AI naming studio that helps founders find a brand name with the rigor of a strategist, in minutes instead of months." />
            </BField>
            <BField label="Industry">
              <div className="bchips">
                {INDUSTRIES.map((o) => (
                  <button key={o} type="button" className={"bchip" + (brief.industry === o ? " on" : "")}
                    onClick={() => { setCustom(false); set({ industry: brief.industry === o ? "" : o }); }}>{o}</button>
                ))}
                {custom || (brief.industry && !known) ? (
                  <input className="bchip-input" autoFocus value={known ? "" : brief.industry}
                    placeholder="Type your own…" onChange={(e) => set({ industry: e.target.value })}
                    onBlur={() => setCustom(false)} />
                ) : (
                  <button type="button" className="bchip dashed" onClick={() => { setCustom(true); set({ industry: "" }); }}>
                    <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>Type your own…
                  </button>
                )}
              </div>
            </BField>
            <BField label="Stage"><Segmented options={BETA_STAGES} value={stage} onChange={setStage} /></BField>
          </div>
          <ReframeCard line={briefLine} tags={briefTags} />
        </div>
      </div>
      <BFoot back="← Welcome" onBack={onBack} next="Next: brand context →" disabled={!brief.does.trim()} onNext={onNext} />
    </>
  );
}

// 02 — Brand context (design 1g)
export function BetaBrand({ brief, set, toggleArr, briefLine, briefTags, firstName, onBack, onNext }: {
  brief: Brief; set: (p: Partial<Brief>) => void; toggleArr: (a: string[], v: string, max?: number) => string[];
  briefLine: string; briefTags: string[]; firstName?: string; onBack: () => void; onNext: () => void;
}) {
  return (
    <>
      <div className="bbody">
        <div className="bintake">
          <div className="bintake-main">
            <BHead eyebrow="The brief · 2 of 4" title={firstName ? <>{firstName}, what do you solve, and who for?</> : <>What do you solve, and who for?</>}
              sub="A name only works in context. Two plain sentences is enough." />
            <BField label="The problem you solve">
              <textarea className="binput barea active" rows={2} value={brief.problem} onChange={(e) => set({ problem: e.target.value })}
                placeholder="Founders lose weeks and thousands to naming. Agencies are slow, generators are generic." />
            </BField>
            <BField label="Who it's for">
              <textarea className="binput barea" rows={2} value={brief.audience} onChange={(e) => set({ audience: e.target.value })}
                placeholder="Early-stage founders and the product & design leads naming their first real thing." />
            </BField>
            <BField label="Geographical scope">
              <Chips options={GEO_OPTIONS} value={brief.geos || []} onPick={(s) => set({ geos: toggleArr(brief.geos || [], s) })} />
            </BField>
          </div>
          <ReframeCard line={briefLine} tags={briefTags} />
        </div>
      </div>
      <BFoot back="← Company context" onBack={onBack} next="Next: emotional value →" disabled={!brief.problem.trim()} onNext={onNext} />
    </>
  );
}

// 03 — Emotional value · north star (design 1h)
export function BetaEmotional({ options, selected, northStar, firstName, onToggle, onStar, onBack, onNext }: {
  options: string[]; selected: string[]; northStar: string; firstName?: string;
  onToggle: (s: string) => void; onStar: (s: string) => void; onBack: () => void; onNext: () => void;
}) {
  return (
    <>
      <div className="bbody">
        <div className="bintake">
          <div className="bintake-main">
            <BHead eyebrow="The brief · 3 of 4" title={firstName ? <>How should {firstName}'s name make people feel?</> : <>How should the name make people feel?</>}
              sub="Pick a few. One becomes your north star, the feeling every name is judged against." />
            <div className="bemotions">
              {options.map((o) => {
                const on = selected.includes(o);
                const star = o === northStar;
                return (
                  <div key={o} className={"bemotion" + (on ? " on" : "") + (star ? " star" : "")} onClick={() => onToggle(o)}>
                    <span>{o}</span>
                    <span className="bem-star" style={{ opacity: star ? 1 : on ? 0.4 : 0 }}
                      onClick={(e) => { e.stopPropagation(); if (!on) onToggle(o); onStar(o); }}>★</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="breframe" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p className="brlabel" style={{ margin: 0 }}>North star</p>
              <div className="bnorthstar">★ {northStar || "Pick one"}</div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink-2)", margin: 0 }}>
              Every name from here will be measured first by how <span style={{ color: "var(--accent)", fontWeight: 600 }}>{(northStar || "clear").toLowerCase()}</span> it feels{selected.length > 1 ? <>, then by {selected.slice(1, 4).map((s) => s.toLowerCase()).join(", ")}.</> : "."}
            </p>
          </div>
        </div>
      </div>
      <BFoot back="← Brand context" onBack={onBack} next="Next: naming strategy →" disabled={selected.length < 1} onNext={onNext} />
    </>
  );
}

// 04 — Naming strategy (design 1i)
export function BetaStrategy({ brief, set, toggleArr, onBack, onNext }: {
  brief: Brief; set: (p: Partial<Brief>) => void; toggleArr: (a: string[], v: string, max?: number) => string[];
  onBack: () => void; onNext: () => void;
}) {
  const rec = recommendLanes({ ...brief })[0];
  const recName = LANES.find((l) => l.key === rec)?.name || "evocative";
  return (
    <>
      <div className="bbody">
        <BHead eyebrow="The brief · 4 of 4" title={<>What kind of name are we hunting?</>}
          sub={<>Based on your brief, the studio recommends an <span style={{ color: "var(--accent)", fontWeight: 600 }}>{recName.toLowerCase()}</span> direction. You can steer it.</>} />
        <div className="bstrat-grid">
          {LANES.map((l) => {
            const on = brief.lanes.includes(l.key);
            return (
              <div key={l.key} className={"bstrat" + (on ? " on" : "")} onClick={() => set({ lanes: toggleArr(brief.lanes, l.key, 5) })}>
                {l.key === rec && <span className="bstrat-badge">Recommended for you</span>}
                <span className="bstrat-name">{l.name}</span>
                <span className="bstrat-desc">{l.d}</span>
                <span className="bstrat-ex">e.g. {l.ex}</span>
              </div>
            );
          })}
        </div>
      </div>
      <BFoot back="← Emotional value" onBack={onBack} next="Begin exploration →" disabled={brief.lanes.length < 1} onNext={onNext} />
    </>
  );
}
