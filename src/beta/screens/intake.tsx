// Beta intake screens (01–04), rebuilt to the redesign: 1d brief, 1g brand
// context, 1h emotional value (north star), 1i naming strategy.
import { useState } from "react";
import type { Brief } from "../../lib/namingApi";
import { INDUSTRIES, GEO_OPTIONS, LANES } from "../../cosmos/data";

// The design's three stages (the studio's full list is collapsed to these here).
const BETA_STAGES = ["Idea", "Building it", "Launched"];
import { recommendLanes } from "../../lib/localStudio";
import { BField, Chips, Segmented, ReframeCard, BHead, BFoot, Skel } from "../atoms";

// 01 — Company context (design 1d)
export function BetaBrief({ brief, set, stage, setStage, firstName, briefLine, briefTags, onNext }: {
  brief: Brief; set: (p: Partial<Brief>) => void; stage: string; setStage: (s: string) => void;
  firstName?: string; briefLine: string; briefTags: string[];
  onNext: () => void;
}) {
  const [showCustom, setShowCustom] = useState(false);

  // brief.industry is comma-separated for multi-select, e.g. "SaaS, Fintech"
  const allSel = brief.industry ? brief.industry.split(", ").filter(Boolean) : [];
  const presetSel = allSel.filter((i) => INDUSTRIES.includes(i));
  const customVal = allSel.find((i) => !INDUSTRIES.includes(i)) || "";

  const applyIndustry = (presets: string[], custom: string) => {
    const all = custom ? [...presets, custom] : presets;
    set({ industry: all.join(", ") });
  };
  const togglePreset = (o: string) => {
    const next = presetSel.includes(o) ? presetSel.filter((x) => x !== o) : [...presetSel, o];
    applyIndustry(next, customVal);
  };

  return (
    <>
      <div className="bbody">
        <div className="bintake">
          <div className="bintake-main">
            <BHead eyebrow="The brief · 1 of 4" title={firstName ? <>{firstName}, what does the company do?</> : <>What does the company do?</>}
              sub="The sharper this is, the sharper your name." />
            <BField label="What it does">
              <textarea className="binput barea" rows={3} value={brief.does} onChange={(e) => set({ does: e.target.value })}
                placeholder="An AI naming studio that helps founders find a brand name with the rigor of a strategist, in minutes instead of months." />
            </BField>
            <BField label="Industry">
              <div className="bchips">
                {INDUSTRIES.map((o) => (
                  <button key={o} type="button" className={"bchip" + (presetSel.includes(o) ? " on" : "")}
                    onClick={() => togglePreset(o)}>{o}</button>
                ))}
                {showCustom || customVal ? (
                  <input className="bchip-input" autoFocus value={customVal}
                    placeholder="Type your own…"
                    onChange={(e) => applyIndustry(presetSel, e.target.value)}
                    onBlur={() => setShowCustom(false)} />
                ) : (
                  <button type="button" className="bchip dashed" onClick={() => setShowCustom(true)}>
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
      <BFoot next={brief.does.trim() ? "Next: brand context →" : "Describe what you're building first"} disabled={!brief.does.trim()} onNext={onNext} />
    </>
  );
}

// 02 — Brand context (design 1g)
export function BetaBrand({ brief, set, toggleArr, briefLine, briefTags, firstName, onNext }: {
  brief: Brief; set: (p: Partial<Brief>) => void; toggleArr: (a: string[], v: string, max?: number) => string[];
  briefLine: string; briefTags: string[]; firstName?: string; onNext: () => void;
}) {
  return (
    <>
      <div className="bbody">
        <div className="bintake">
          <div className="bintake-main">
            <BHead eyebrow="The brief · 2 of 4" title={firstName ? <>{firstName}, what do you solve, and who's it for?</> : <>What do you solve, and who's it for?</>}
              sub="A name only works in context." />
            <BField label="The problem you solve">
              <textarea className="binput barea" rows={2} value={brief.problem} onChange={(e) => set({ problem: e.target.value })}
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
      <BFoot next="Next: emotional value →" disabled={!brief.problem.trim()} onNext={onNext} />
    </>
  );
}

// 03 — Emotional value · north star (design 1h)
export function BetaEmotional({ options, selected, northStar, busy, onToggle, onStar, onNext }: {
  options: string[]; selected: string[]; northStar: string; busy?: boolean;
  onToggle: (s: string) => void; onStar: (s: string) => void; onNext: () => void;
}) {
  return (
    <>
      <div className="bbody">
        <div className="bintake">
          <div className="bintake-main">
            <BHead eyebrow="The brief · 3 of 4"
              title={busy ? <>Reading how your brand should feel&hellip;</> : <>How should the name make people feel?</>}
              sub={busy ? "Drawing the feelings your name could carry, from your brief." : "Pick a few. One becomes your north star."} />
            {/* Mobile-only north star card — shows above the chip grid on small screens */}
            <div className="bnorthstar-card">
              <span className="bnorthstar-card-label">North Star</span>
              <div className="bnorthstar" style={{ margin: 0 }}>
                ★ {northStar || <span style={{ opacity: 0.5, fontWeight: 400 }}>Pick one</span>}
              </div>
            </div>
            {busy ? (
              <div className="bemotions">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="bskel-card" style={{ padding: "13px 15px", opacity: 1 - i * 0.06 }}>
                    <Skel w={`${45 + ((i * 17) % 35)}%`} h={13} />
                  </div>
                ))}
              </div>
            ) : (
            <div className="bemotions">
              {options.map((o) => {
                const on = selected.includes(o);
                const star = o === northStar;
                return (
                  <div key={o} className={"bemotion" + (on ? " on" : "") + (star ? " star" : "")} onClick={() => onToggle(o)}>
                    <span>{o}</span>
                    <span className="bem-star" style={{ opacity: star ? 1 : on ? 0.75 : 0 }}
                      onClick={(e) => { e.stopPropagation(); if (!on) onToggle(o); onStar(o); }}>★</span>
                  </div>
                );
              })}
            </div>
            )}
            {selected.length > 0 && !northStar && (
              <p className="bemotion-hint">Tap ★ on a word to set it as your north star</p>
            )}
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
      <BFoot next="Next: naming strategy →" disabled={selected.length < 1} onNext={onNext} />
    </>
  );
}

// 04 — Naming strategy (design 1i)
export function BetaStrategy({ brief, set, toggleArr, onNext }: {
  brief: Brief; set: (p: Partial<Brief>) => void; toggleArr: (a: string[], v: string, max?: number) => string[];
  onNext: () => void;
}) {
  const rec = recommendLanes({ ...brief })[0];
  const recName = LANES.find((l) => l.key === rec)?.name || "evocative";
  return (
    <>
      <div className="bbody">
        <BHead eyebrow="The brief · 4 of 4" title={<>What kind of name are we hunting?</>}
          sub={<>We recommend <span style={{ color: "var(--accent)", fontWeight: 600 }}>{recName.toLowerCase()}</span>. Steer it how you like.</>} />
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
      <BFoot next="Begin exploration →" disabled={brief.lanes.length < 1} onNext={onNext} />
    </>
  );
}
