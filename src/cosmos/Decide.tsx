// Step 10 · Decision. Pick the name from the table, then "Lock in" to celebrate and
// make it real: grab the domain, the brand book (beta), the logo (coming soon).
import { useEffect, useRef, useState } from "react";
import type { Comparison, CompareRow } from "../lib/namingApi";
import { Dots, Head } from "./chrome";
import { availableDomains, slugify, godaddyUrl } from "./data";

function smileOf(r: CompareRow) { return Math.max(1, Math.min(5, Math.round((r.intuitive + r.visual + r.sound + r.emotional) / 4))); }
function verdictOf(r: CompareRow) { const t = r.intuitive + r.visual + r.sound + r.emotional; return t >= 20 ? "Perfect" : t >= 16 ? "Great" : "Solid"; }
const verdictClass = (v: string) => (v === "Perfect" ? "fill" : v === "Great" ? "good" : "");
const bestDomain = (r: CompareRow) => availableDomains(r.name, r.domains, r.suggested)[0];

export function Decide({ comp, chosen, setChosen, onBack, onBrandBook, onFeedback }: {
  comp: Comparison | null; chosen: string; setChosen: (n: string) => void;
  onBack: () => void; onBrandBook: () => void; onFeedback?: () => void;
}) {
  const rows = comp ? [...comp.rows].sort((a, b) => smileOf(b) - smileOf(a)) : [];
  // Exactly one domain can be locked; "Register" then opens that domain's link.
  const [picked, setPicked] = useState<string>("");
  const [locked, setLocked] = useState(false);

  useEffect(() => { if (!chosen && comp) setChosen(comp.recommended || comp.rows[0]?.name || ""); /* eslint-disable-next-line */ }, [comp]);

  const pick = rows.find((r) => r.name === chosen) || rows[0];
  const doms = pick ? availableDomains(pick.name, pick.domains, pick.suggested) : [];
  const defaultedFor = useRef<string | null>(null);
  useEffect(() => {
    if (defaultedFor.current === chosen) return;
    defaultedFor.current = chosen;
    setPicked(doms[0]?.domain || "");
    /* eslint-disable-next-line */
  }, [chosen, doms.length]);

  if (!comp) return <Head eyebrow="The decision" title={<>Make the call.</>} />;

  const slug = slugify(pick?.name || "");
  const best = pick ? bestDomain(pick) : undefined;
  // The one locked domain decides where "Register" goes (its own registrar link).
  const claimDomain = picked || best?.domain || `${slug}.com`;
  const claimUrl = godaddyUrl(claimDomain);

  // ── The domain "grab" block, shared by both views ──
  const domainBlock = (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r2)", background: "var(--surface)", padding: "13px 16px", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span className="lbl" style={{ fontSize: 9.5 }}>01</span>
        <div style={{ fontFamily: "var(--serif)", fontSize: 17, letterSpacing: "-0.01em" }}>Grab the domain</div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>pick one</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {doms.length === 0 && <span style={{ fontSize: 13, color: "var(--ink-4)" }}>No exact domain free, the name may still be worth it, or try a variant.</span>}
        {doms.map((d) => {
          const on = picked === d.domain;
          return (
            <label key={d.domain} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", cursor: "pointer" }}>
              <span style={{ width: 17, height: 17, flex: "0 0 auto", borderRadius: "50%", border: "1.5px solid " + (on ? "var(--ink)" : "var(--line)"), display: "grid", placeItems: "center" }}>
                {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ink)" }} />}
              </span>
              <input type="radio" name="lockdomain" checked={on} onChange={() => setPicked(d.domain)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
              <span style={{ fontFamily: "var(--serif)", fontSize: 16, flex: 1 }}>{d.domain}</span>
              {d.price && <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{d.price}</span>}
            </label>
          );
        })}
      </div>
      <a href={claimUrl} target="_blank" rel="noreferrer"
        style={{ display: "flex", justifyContent: "center", marginTop: 10, padding: "9px 12px", borderRadius: "var(--rp)", background: "var(--ink)", color: "var(--bg)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textDecoration: "none", ...(picked ? {} : { opacity: 0.45, pointerEvents: "none" }) }}>
        {picked ? `REGISTER ${picked.toUpperCase()} →` : "PICK A DOMAIN →"}
      </a>
    </div>
  );

  // ─────────────────────────── Locked-in celebration ───────────────────────────
  if (locked && pick) {
    return (
      <div className="celebrate">
        <Confetti />
        <div className="celebrate-inner">
          <span className="lbl" style={{ color: "var(--ink-3)" }}>Locked in</span>
          <div className="celebrate-name">{pick.name}</div>
          <p className="celebrate-msg">
            Congratulations. <b style={{ fontWeight: 500 }}>{pick.name}</b> is the one, the perfect name for what you're building. Now go make it unforgettable.
          </p>

          <span className="lbl" style={{ marginTop: 8 }}>Now, let's make it real</span>
          <div className="make-real">
            {domainBlock}

            <button className="mr-card" onClick={onBrandBook}>
              <span className="lbl" style={{ fontSize: 9.5, flex: "0 0 auto" }}>02</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 17 }}>Discover your brand book <span className="beta">beta</span></div>
                <p style={{ fontSize: 12, color: "var(--ink-3)", margin: 0 }}>Story, voice, colour and type</p>
              </div>
              <span className="mr-cta">OPEN →</span>
            </button>

            <div className="mr-card disabled">
              <span className="lbl" style={{ fontSize: 9.5, flex: "0 0 auto" }}>03</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 17 }}>Design the perfect logo</div>
                <p style={{ fontSize: 12, color: "var(--ink-4)", margin: 0 }}>A mark that fits the name</p>
              </div>
              <span className="mr-cta" style={{ color: "var(--ink-4)" }}>COMING SOON</span>
            </div>

            <div className="mr-card disabled">
              <span className="lbl" style={{ fontSize: 9.5, flex: "0 0 auto" }}>04</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 17 }}>Launch your website</div>
                <p style={{ fontSize: 12, color: "var(--ink-4)", margin: 0 }}>A first page to claim your name online</p>
              </div>
              <span className="mr-cta" style={{ color: "var(--ink-4)" }}>COMING SOON</span>
            </div>
          </div>

          {onFeedback && (
            <button className="btn lg solid" style={{ width: "100%", justifyContent: "center", marginTop: 18 }} onClick={onFeedback}>
              Share your feedback →
            </button>
          )}
          <button className="link" style={{ marginTop: 14, background: "none", border: "none", cursor: "pointer" }} onClick={() => setLocked(false)}>← Not sure yet, back to the shortlist</button>
        </div>
      </div>
    );
  }

  // ─────────────────────────── Decision (pick + lock in) ───────────────────────────
  return (
    <>
      <Head eyebrow="The decision" title={<>The signals are in. <em>You make the call.</em></>}
        sub="SMILE and domain sit side by side as the case for each name. Pick the row that's right, then lock it in." />
      <div className="decide-cols">
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="cmp">
              <thead>
                <tr><th style={{ width: 36 }}></th><th>Name</th><th>SMILE</th><th>Domain</th><th>Verdict</th></tr>
              </thead>
              <tbody>
                {rows.map((n) => {
                  const isChosen = n.name === chosen;
                  const v = verdictOf(n);
                  return (
                    <tr key={n.name} className={isChosen ? "win" : ""} style={{ cursor: "pointer" }} onClick={() => setChosen(n.name)}>
                      <td className="c" data-label="">
                        <span style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid " + (isChosen ? "var(--ink)" : "var(--line)"), background: isChosen ? "var(--ink)" : "transparent", display: "inline-grid", placeItems: "center" }}>
                          {isChosen && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--surface)" }} />}
                        </span>
                      </td>
                      <td data-label="Name"><span className="nm" style={{ fontSize: 21 }}>{n.name}</span></td>
                      <td className="c" data-label="SMILE"><Dots score={smileOf(n)} /></td>
                      <td className="c" data-label="Domain">{(() => { const d = bestDomain(n); return d
                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}><span style={{ color: "var(--good)", fontSize: 12 }}>✓</span><span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{d.domain}</span></span>
                        : <span style={{ color: "var(--ink-4)" }}>—</span>; })()}</td>
                      <td className="c" data-label="Verdict"><span className={"tag " + verdictClass(v)}>{v}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "11px 16px", borderTop: "1px solid var(--line-2)", background: "var(--surface-2)", display: "flex", alignItems: "center", gap: 10 }}>
            <span className="lbl">Note</span>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Trust the whole row, not one column. A strong name you can own beats a clever one you can't.</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
          <div style={{ border: "1px solid var(--ink)", borderRadius: "var(--r3)", background: "var(--surface)", padding: "26px 24px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="lbl">Your choice</span>
            <div style={{ fontFamily: "var(--serif)", fontSize: 56, lineHeight: 0.92, letterSpacing: "-0.025em" }}>{pick?.name}</div>
            {pick && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="tag good">SMILE {smileOf(pick)}</span>
                {best && <span className="tag good" style={{ textTransform: "none" }}>{best.domain}</span>}
                <span className={"tag " + verdictClass(verdictOf(pick))}>{verdictOf(pick)}</span>
              </div>
            )}
            <button className="btn lg solid" style={{ justifyContent: "center", marginTop: 6 }} onClick={() => setLocked(true)} disabled={!pick}>
              Lock in {pick?.name} ✓
            </button>
            <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: 0, textAlign: "center" }}>Lock it in to celebrate and make it real.</p>
          </div>
        </div>
      </div>
      <div className="cx-foot">
        <span className="link" onClick={onBack}>← Share & vote</span>
        {onFeedback && <span className="link" onClick={onFeedback}>Share your feedback</span>}
      </div>
    </>
  );
}

// A short, tasteful confetti burst (monochrome, to keep the cosmos register).
function Confetti() {
  const colors = ["#0D0D0D", "#52514E", "#918E8A", "#C9774E"];
  return (
    <div aria-hidden className="confetti">
      {Array.from({ length: 42 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const dur = 2.4 + Math.random() * 1.6;
        const size = 5 + Math.random() * 6;
        return (
          <span key={i} style={{
            left: left + "%", width: size, height: size * 1.5,
            background: colors[i % colors.length],
            animation: `confetti-fall ${dur}s ${delay}s cubic-bezier(.3,.2,.5,1) forwards`,
          }} />
        );
      })}
    </div>
  );
}
