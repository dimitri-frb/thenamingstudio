// Step 8 · Comparison — the shortlist side by side in one table: meaning, domain
// availability (real, via RDAP) + price, INPI trademark, handle, and a SMILE score.
// Switch the extension to see who's free where.
import { useEffect, useState } from "react";
import { naming, type Brief, type Comparison, type CompareRow } from "../lib/namingApi";
import { Dots, Foot, Head, Star, Thinking } from "./chrome";
import { TLDS, TLD_PRICE, slugify } from "./data";

function smileOf(r: CompareRow) { return Math.max(1, Math.min(5, Math.round((r.intuitive + r.visual + r.sound + r.emotional) / 4))); }
function verdictOf(r: CompareRow) { const t = r.intuitive + r.visual + r.sound + r.emotional; return t >= 20 ? "Strong" : t >= 15 ? "Solid" : "Risky"; }

export function Compare({ brief, shortlist, comp, setComp, onBack, onDone }: {
  brief: Brief; shortlist: string[]; comp: Comparison | null;
  setComp: (c: Comparison) => void; onBack: () => void; onDone: () => void;
}) {
  const [activeTld, setActiveTld] = useState<string>(".com");
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
        <Thinking lines={["Scoring and checking each name…", "SMILE · domain · INPI · handle"]} />
      </div>
    </>
  );

  let rows = [...comp.rows];
  if (sortSmile) rows.sort((a, b) => smileOf(b) - smileOf(a));

  return (
    <>
      <HeadC />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="lbl">Domain extension</span>
        <div style={{ display: "flex", gap: 6 }}>
          {TLDS.map((t) => (
            <span key={t} className={"relchip" + (t === activeTld ? " on" : " off")} style={{ padding: "6px 12px" }} onClick={() => setActiveTld(t)}>
              <span className="t" style={{ fontFamily: "var(--sans)" }}>{t}</span>
            </span>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button className="btn" style={{ fontSize: 13 }} onClick={() => setSortSmile((s) => !s)}>Sort by SMILE {sortSmile ? "↓" : "·"}</button>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="cmp">
            <thead>
              <tr>
                <th style={{ width: "14%" }}>Name</th>
                <th style={{ width: "28%" }}>Why it works</th>
                <th>{activeTld} domain</th>
                <th>Est. price</th>
                <th>Trademark · INPI</th>
                <th>Handle</th>
                <th>SMILE</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const slug = slugify(n.name);
                const dom = n.domains.find((d) => d.tld === activeTld);
                const free = dom?.available ?? false;
                const [upfront, renewal] = TLD_PRICE[activeTld] || ["—", "—"];
                const verdict = verdictOf(n);
                const win = n.name === comp.recommended;
                return (
                  <tr key={n.name} className={win ? "win" : ""}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="nm">{n.name}</span>{win && <Star on />}
                      </div>
                      <div className="meta">{slug}{activeTld}</div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.4 }}>{n.verdict}</td>
                    <td className="c"><span className={"tag " + (free ? "good" : "bad")}>{free ? "available" : "taken"}</span></td>
                    <td className="c">
                      <span style={{ fontFamily: "var(--serif)", fontSize: 17 }}>{free ? upfront : "—"}</span>
                      <div className="meta">{free ? "then " + renewal : "purchase"}</div>
                    </td>
                    <td className="c"><span className={"tag " + (n.inpi ? "good" : "watch")}>{n.inpi ? "Clear" : "Check"}</span></td>
                    <td className="c"><span className={"tag " + (n.instagram ? "good" : "bad")}>{n.instagram ? "free" : "taken"}</span></td>
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
      sub="Meaning, domain availability and price, French trademark (INPI), handle, and SMILE — in one table. Switch the extension to see who's free where." />
  );
}
