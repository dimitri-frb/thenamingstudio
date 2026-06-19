// Step 8 · Comparison — the shortlist side by side in one table: meaning, three
// genuinely-available domains (real, via RDAP) with prices, INPI trademark,
// handle, and a SMILE score. Every name leaves with domains it can register.
import { useEffect, useState } from "react";
import { naming, type Brief, type Comparison, type CompareRow } from "../lib/namingApi";
import { Dots, Foot, Head, Star, Thinking } from "./chrome";
import { availableDomains, handleOptions, nameTests } from "./data";

function smileOf(r: CompareRow) { return Math.max(1, Math.min(5, Math.round((r.intuitive + r.visual + r.sound + r.emotional) / 4))); }
function verdictOf(r: CompareRow) { const t = r.intuitive + r.visual + r.sound + r.emotional; return t >= 20 ? "Strong" : t >= 15 ? "Solid" : "Risky"; }

export function Compare({ brief, shortlist, comp, setComp, onBack, onDone }: {
  brief: Brief; shortlist: string[]; comp: Comparison | null;
  setComp: (c: Comparison) => void; onBack: () => void; onDone: () => void;
}) {
  const [sortSmile, setSortSmile] = useState(false);

  useEffect(() => {
    if (comp) return;
    let live = true;
    const names = shortlist.map((name) => ({ name, type: "", rationale: "", score: 0 }));
    naming.compare(brief, names).then((c) => { if (live) setComp(c); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!comp) return (
    <>
      <HeadC />
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <Thinking lines={["Scoring each name and hunting available domains…", "SMILE · domains · INPI · handle"]} />
      </div>
    </>
  );

  let rows = [...comp.rows];
  if (sortSmile) rows.sort((a, b) => smileOf(b) - smileOf(a));

  return (
    <>
      <HeadC />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="lbl">Each name shows three domains you can actually register today</span>
        <span style={{ flex: 1 }} />
        <button className="btn" style={{ fontSize: 13 }} onClick={() => setSortSmile((s) => !s)}>Sort by SMILE {sortSmile ? "↓" : "·"}</button>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="cmp">
            <thead>
              <tr>
                <th style={{ width: "12%" }}>Name</th>
                <th style={{ width: "19%" }}>Why it works</th>
                <th style={{ width: "20%" }}>Available domains</th>
                <th>Trademark · INPI</th>
                <th style={{ width: "13%" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><InstagramGlyph size={12} /> Instagram</span></th>
                <th style={{ width: "12%" }}>Name tests</th>
                <th>SMILE</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const verdict = verdictOf(n);
                const win = n.name === comp.recommended;
                const domains = availableDomains(n.name, n.domains, n.suggested);
                return (
                  <tr key={n.name} className={win ? "win" : ""}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="nm">{n.name}</span>{win && <Star on />}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.4 }}>{n.verdict}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {domains.length === 0 && <span className="meta">checking…</span>}
                        {domains.map((d) => (
                          <span key={d.domain} style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--good)", fontSize: 12, flex: "0 0 auto" }}>✓</span>
                            <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{d.domain}</span>
                            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{d.price}{d.premium ? " · premium" : ""}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="c"><span className={"tag " + (n.inpi ? "good" : "watch")}>{n.inpi ? "Clear" : "Check"}</span></td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {handleOptions(n.name, domains).map((h) => (
                          <a key={h} href={`https://instagram.com/${h.slice(1)}`} target="_blank" rel="noreferrer"
                            title={`Check ${h} on Instagram`}
                            style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-2)", textDecoration: "none", whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--ink-3)", display: "inline-flex", flex: "0 0 auto" }}><InstagramGlyph size={13} /></span>
                            <span style={{ fontFamily: "var(--serif)", fontSize: 14 }}>{h}</span>
                          </a>
                        ))}
                      </div>
                    </td>
                    <td>
                      {(() => { const t = nameTests(n.name); return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {([["Bar test", t.bar], ["Pronounce", t.pronounce], ["Spell", t.spell], ["Short", t.short]] as const).map(([label, ok]) => (
                            <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-2)", whiteSpace: "nowrap" }}>
                              <span style={{ color: ok ? "var(--good)" : "var(--bad)", fontSize: 12, flex: "0 0 auto", width: 11, textAlign: "center" }}>{ok ? "✓" : "✗"}</span>
                              {label}
                            </span>
                          ))}
                        </div>
                      ); })()}
                    </td>
                    <td className="c"><Dots score={smileOf(n)} /></td>
                    <td className="c"><span className={"tag " + (verdict === "Strong" ? "fill" : verdict === "Solid" ? "" : "bad")}>{verdict}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line-2)", display: "flex", alignItems: "center", gap: 14, background: "var(--surface-2)" }}>
          <span className="lbl">SMILE</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            <b style={{ color: "var(--ink-2)" }}>S</b>uggestive · <b style={{ color: "var(--ink-2)" }}>M</b>emorable · <b style={{ color: "var(--ink-2)" }}>I</b>magery · <b style={{ color: "var(--ink-2)" }}>L</b>egs · <b style={{ color: "var(--ink-2)" }}>E</b>motional
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, color: "var(--ink-2)" }}>{comp.why}</span>
        </div>
      </div>

      <Foot back="Name ideas" onBack={onBack} next="Get a gut-check →" onNext={onDone} />
    </>
  );
}

function HeadC() {
  return (
    <Head eyebrow="The comparison" title={<>Your shortlist, <em>side by side</em>.</>}
      sub="Meaning, three available domains (with price), French trademark (INPI), Instagram handles, and SMILE — in one table. We surface domains and matching handles you can claim, tweaking the name where the plain ones are gone." />
  );
}

function InstagramGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
