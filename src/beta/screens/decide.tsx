// Beta comparison (07, design 1k), domains (08, design 1f), share & vote
// (09, design 1l) and decision (10, design 1m).
import { useEffect, useRef, useState } from "react";
import {
  naming, fetchDomainBoard, createVoteSession, getVoteResults,
  type Brief, type Comparison, type CompareRow, type DomainBoardData,
} from "../../lib/namingApi";
import { Thinking } from "../../cosmos/chrome";
import { BHead, BFoot } from "../atoms";

const ABBR = ["Mng", "Mem", "Say", "Dst", ".com", "™"];
// Six 1–5 axes derived from a scored row + its domain/trademark room.
function axes(r: CompareRow): number[] {
  const comAvail = (r.domains || []).some((d) => d.tld === "com" && d.available) ? 5 : (r.suggested?.length ? 4 : 2);
  const tm = r.inpi ? 5 : 3;
  return [r.intuitive, r.visual, r.sound, r.emotional, comAvail, tm].map((n) => Math.max(1, Math.min(5, Math.round(n))));
}
const pctOf = (sc: number[]) => Math.round(sc.reduce((a, b) => a + b, 0) / 30 * 100);
const STANDOUT = ["Most complete", "Easiest to love", "Most elegant", "Most familiar", "Strong contender"];

// 07 — Comparison (design 1k): names ranked by a brief-fit score.
export function BetaCompare({ brief, shortlist, comp, setComp, onBack, onVote, onNext }: {
  brief: Brief; shortlist: string[]; comp: Comparison | null; setComp: (c: Comparison) => void;
  onBack: () => void; onVote: () => void; onNext: (chosen: string) => void;
}) {
  const did = useRef(false);
  const [chosen, setChosen] = useState("");
  useEffect(() => {
    if (comp || did.current || !shortlist.length) return;
    did.current = true;
    naming.compare(brief, shortlist.map((name) => ({ name, type: "", rationale: "", score: 0 }))).then(setComp).catch(() => { /* */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!comp) return <div className="bbody"><Thinking lines={["Scoring each name against your brief…", "meaning \xb7 memorability \xb7 sayability \xb7 distinctiveness \xb7 .com room \xb7 trademark"]} /></div>;

  const rows = [...comp.rows].map((r) => ({ r, sc: axes(r) })).sort((a, b) => pctOf(b.sc) - pctOf(a.sc));
  const leader = rows[0]?.r.name || comp.recommended;
  const pick = chosen || leader;

  return (
    <>
      <div className="bbody">
        <BHead eyebrow="The shortlist" title={<>{rows.length} names, side by side.</>}
          sub={<>Scored against what your brief said matters. <span style={{ color: "var(--accent)", fontWeight: 600 }}>{leader}</span> leads, but the call is yours.</>} />
        <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "-6px 0 0", lineHeight: 1.5 }}>
          Brief-fit score, built from <span style={{ color: "var(--ink-2)" }}>meaning &middot; memorability &middot; sayability &middot; distinctiveness &middot; .com room &middot; trademark room</span>.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map(({ r, sc }, idx) => {
            const sel = r.name === pick;
            return (
              <div key={r.name} className={"bcmp" + (sel ? " lead chosen" : "")}
                style={{ cursor: "pointer" }} onClick={() => setChosen(r.name)}>
                <span className={"bcmp-rank" + (sel ? " lead" : "")}>{sel ? "♔" : idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                  <span className={"bcmp-name" + (sel ? " lead" : "")}>{r.name}</span>
                  <span style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.45 }}>{r.verdict || r.tagline || "A strong, ownable option."}</span>
                </div>
                <div className="bcmp-bars">
                  {sc.map((s, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ height: 48, display: "flex", alignItems: "flex-end" }}>
                        <span style={{ width: 9, height: 8 + s * 8, borderRadius: 999, background: sel ? "var(--accent)" : "var(--ink-3)", opacity: sel ? 1 : 0.4 + s / 5 * 0.6 }} />
                      </div>
                      <span style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{ABBR[i]}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flex: "0 0 auto", width: 118 }}>
                  <span className="bcmp-pct" style={{ color: sel ? "var(--accent)" : "var(--ink)" }}>{pctOf(sc)}%</span>
                  <span className={"bcmp-standout" + (sel ? " lead" : "")}>{STANDOUT[idx] || "Contender"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BFoot back="&larr; Name ideas" onBack={onBack} secondary="Take it to a vote &rarr;" onSecondary={onVote}
        next={`Check domains for ${pick} →`} onNext={() => onNext(pick)} />
    </>
  );
}

// 08 — Domains (design 1f): where the pick can live.
export function BetaDomains({ brief, comp, initialPick, onBack, onVote, onLockIn }: {
  brief: Brief; comp: Comparison | null; initialPick?: string; onBack: () => void; onVote: () => void; onLockIn: (name: string) => void;
}) {
  const allNames = (comp?.rows || []).map((r) => r.name);
  const [pick, setPick] = useState(initialPick || comp?.recommended || allNames[0] || "");
  const [lockedDomain, setLockedDomain] = useState<string>("");
  const [boards, setBoards] = useState<Record<string, DomainBoardData>>({});
  useEffect(() => {
    if (!pick || boards[pick]) return;
    setLockedDomain(""); // reset domain selection when name changes
    let live = true;
    fetchDomainBoard(pick, brief.geos).then((b) => { if (live) setBoards((p) => ({ ...p, [pick]: b })); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick]);

  const board = boards[pick];
  // Show all available/negotiable (at least 6 if they exist), then max 2 taken below.
  const claimable = board ? [
    ...board.tlds.filter((d) => d.status === "available" || d.status === "negotiable"),
    ...board.variants.filter((d) => d.status === "available" || d.status === "negotiable"),
  ] : [];
  const takenRows = board ? [
    ...board.tlds.filter((t) => t.status === "taken"),
    ...board.variants.filter((t) => t.status === "taken"),
  ].slice(0, 2) : [];

  const lockLabel = lockedDomain ? `Confirm ${lockedDomain} →` : `Confirm ${pick} →`;

  return (
    <>
      <div className="bbody">
        <BHead eyebrow="The domains" title={<>Now, claim the domain.</>}
          sub="A great name is only great if you can own it. Here's where your pick can live, and what's up for negotiation." />
        {/* Name pills — fixed order, no reorder on selection */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-3)", marginRight: 4 }}>Your pick</span>
          {allNames.map((n) => (
            <button key={n} className={"bpick" + (n === pick ? " on" : "")} onClick={() => setPick(n)}>{n}</button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{pick}</span>
            {board && claimable.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--on-accent)", background: "var(--accent)", padding: "4px 9px", borderRadius: 7 }}>Great</span>}
            {board && <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{claimable.length} option{claimable.length !== 1 ? "s" : ""} available</span>}
          </div>
          {!board ? <Thinking lines={["Checking every extension…"]} /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {claimable.map((d) => {
                const sel = d.domain === lockedDomain;
                return (
                  <div key={d.domain} className={"bdomrow avail" + (sel ? " chosen" : "")}
                    style={{ cursor: "pointer" }} onClick={() => setLockedDomain(sel ? "" : d.domain)}>
                    <span className="bdomdot" style={{ background: d.status === "available" ? "#28c840" : "var(--watch)" }} />
                    <span className="bdomname" style={{ fontWeight: sel ? 600 : undefined }}>{d.domain}</span>
                    <span className={"bdomstatus " + (d.status === "available" ? "avail" : "nego")}>
                      {sel ? "✓ Selected" : d.status === "available" ? "Available" : "Negotiable"}
                    </span>
                  </div>
                );
              })}
              {takenRows.map((d) => (
                <div key={d.domain} className="bdomrow">
                  <span className="bdomdot" style={{ background: "#ff5f57" }} />
                  <span className="bdomname" style={{ opacity: 0.4, textDecoration: "line-through" }}>{d.domain}</span>
                  <span className="bdomstatus" style={{ color: "var(--ink-4)" }}>Taken</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", margin: "0 0 4px" }}>
        Confirming doesn't register the domain — we'll help you claim it on the next screen.
      </p>
      <BFoot back="&larr; Comparison" onBack={onBack} secondary="Get a gut check &rarr;" onSecondary={onVote}
        next={lockLabel} onNext={() => onLockIn(pick)} />
    </>
  );
}

// 09 — Share & vote (design 1l): a shareable link, live results, voters.
// names is passed directly so this screen works whether the user arrived from
// the comparison step (full comp) or jumped here early from the name ideas step.
export function BetaShare({ brief, names, onBack, onDone }: {
  brief: Brief; names: string[];
  onBack: () => void; onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [results, setResults] = useState<{ votes: Record<string, number>; total: number; voters: number }>({ votes: {}, total: 0, voters: 0 });

  // Create a vote session once on mount.
  useEffect(() => {
    createVoteSession(names, brief.does.slice(0, 180)).then((id) => { if (id) setSessionId(id); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for live results every 5 s while the tab is visible.
  useEffect(() => {
    if (!sessionId) return;
    getVoteResults(sessionId).then(setResults);
    const t = window.setInterval(() => { getVoteResults(sessionId).then(setResults); }, 5000);
    return () => window.clearInterval(t);
  }, [sessionId]);

  const voteFor = (n: string) => results.votes[n] ?? 0;
  const pct = (n: string) => results.total > 0 ? Math.round(100 * voteFor(n) / results.total) : 0;

  const fromName = (() => { try { return (localStorage.getItem("ns.fromName") || "").split(" ")[0].trim(); } catch { return ""; } })();
  const shareUrl = window.location.origin + window.location.pathname
    + "?vote=" + names.map(encodeURIComponent).join("|")
    + (sessionId ? "&session=" + sessionId : "")
    + (fromName ? "&by=" + encodeURIComponent(fromName) : "")
    + (brief.does ? "&about=" + encodeURIComponent(brief.does.slice(0, 180)) : "");

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* ignore */ });
  };

  // Sort names by votes desc for the display (highest first), but keep score order initially.
  const ranked = results.total > 0
    ? [...names].sort((a, b) => voteFor(b) - voteFor(a))
    : names;

  return (
    <>
      <div className="bbody">
        <BHead eyebrow="The vote" title={<>Let the room weigh in.</>}
          sub="Share a link to your shortlist. No login, your team taps a name and it lands here, live." />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "9px 9px 9px 16px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--sep)", maxWidth: "100%", overflow: "hidden" }}>
            <span style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{sessionId ? shareUrl : "Creating session…"}</span>
            <button className="bbtn" style={{ padding: "8px 16px", fontSize: 13, flexShrink: 0 }} onClick={copyLink} disabled={!sessionId}>{copied ? "Copied ✓" : "Copy link"}</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
            {ranked.map((n, i) => {
              const lead = i === 0 && results.total > 0;
              const p = pct(n);
              return (
                <div key={n} className={"bvote" + (lead ? " lead" : "")}>
                  <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", width: 84, flex: "0 0 auto" }}>{n}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 999, background: "var(--surface)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: p + "%", borderRadius: 999, background: lead ? "var(--accent)" : "var(--ink-3)", transition: "width 0.6s ease" }} />
                  </div>
                  <span style={{ fontSize: 13, color: "var(--ink-2)", width: 36, textAlign: "right", flex: "0 0 auto" }}>{p}%</span>
                  <span style={{ fontSize: 13, color: "var(--ink-3)", width: 64, textAlign: "right", flex: "0 0 auto" }}>{voteFor(n)} vote{voteFor(n) === 1 ? "" : "s"}</span>
                </div>
              );
            })}
          </div>
          <div style={{ width: 240, flex: "0 0 auto" }} className="bsaved">
            {results.voters === 0 ? (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 8px" }}>Waiting for votes</p>
                <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>Share the link above with your team or cofounders. Their votes appear here in real time.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 8px" }}>{results.voters} {results.voters === 1 ? "person" : "people"} voted</p>
                <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{results.total} total vote{results.total === 1 ? "" : "s"} · updates every 5 seconds</p>
              </>
            )}
          </div>
        </div>
      </div>
      <BFoot back="&larr; Domains" onBack={onBack} next="Continue to decision →" onNext={onDone} />
    </>
  );
}

// 10 — Decision · the reveal (design 1m).
export function BetaDecide({ comp, chosenFinal, onBack, onBrandBook }: {
  comp: Comparison | null; chosenFinal: string; onBack: () => void; onBrandBook: () => void;
}) {
  const [domainOpen, setDomainOpen] = useState(false);
  const [board, setBoard] = useState<DomainBoardData | null>(null);

  const openDomains = () => {
    if (!domainOpen && chosenFinal && !board) {
      fetchDomainBoard(chosenFinal).then(setBoard).catch(() => { /* ignore */ });
    }
    setDomainOpen((prev) => !prev);
  };

  const gd = (domain: string) => `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`;

  const claimable = board
    ? [
        ...board.tlds.filter((d) => d.status === "available" || d.status === "negotiable"),
        ...board.variants.filter((d) => d.status === "available" || d.status === "negotiable"),
      ].slice(0, 6)
    : [];

  const row = comp?.rows.find((r) => r.name === chosenFinal);

  return (
    <div className="bbody" style={{ padding: 0, position: "relative" }}>
      <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", width: 520, height: 340, transform: "translateX(-50%)", background: "radial-gradient(ellipse at center,var(--accent-soft),transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "50px 40px 24px" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 18px" }}>Your name</p>
        <h1 className="breveal">{chosenFinal || "Aurova"}</h1>
        <p style={{ fontSize: 19, color: "var(--ink-2)", margin: "18px 0 0", maxWidth: "42ch", lineHeight: 1.5 }}>{row?.verdict || row?.tagline || "Clear, premium, and unmistakably yours."}</p>
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: "0 40px 36px" }}>
        <div style={{ width: "100%", maxWidth: 520, borderRadius: 18, background: "var(--surface-2)", border: "1px solid var(--sep)", padding: "22px 24px", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", color: "var(--on-accent)", fontSize: 13, flex: "0 0 auto" }}>&#10003;</span>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>We&rsquo;ve got a name. Here&rsquo;s what&rsquo;s next</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>

            {/* Grab the domain — expandable domain picker */}
            <div>
              <div className="bnext" style={{ cursor: "pointer" }} onClick={openDomains}>
                <span className="bnext-ic">{domainOpen ? "↓" : "→"}</span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Grab the domain</span>
                  {!domainOpen && <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Choose your favourite, then register it</span>}
                </div>
              </div>
              {domainOpen && (
                <div style={{ paddingLeft: 30, marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {!board ? (
                    <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Checking availability&hellip;</span>
                  ) : claimable.length === 0 ? (
                    <span style={{ fontSize: 13, color: "var(--ink-3)" }}>No free extensions found.</span>
                  ) : claimable.map((d) => (
                    <a key={d.domain} href={gd(d.domain)} target="_blank" rel="noopener noreferrer"
                      className="bdomrow avail" style={{ textDecoration: "none" }}>
                      <span className="bdomdot" style={{ background: d.status === "available" ? "#28c840" : "var(--watch)" }} />
                      <span className="bdomname">{d.domain}</span>
                      <span className={"bdomstatus " + (d.status === "available" ? "avail" : "nego")}>
                        {d.status === "available" ? "Available" : "Negotiable"}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Discover your brand book */}
            <div className="bnext" style={{ cursor: "pointer" }} onClick={onBrandBook}>
              <span className="bnext-ic">&rarr;</span>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Discover your brand book</span>
                <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Voice, colours and the story behind {chosenFinal}</span>
              </div>
            </div>

            {/* Coming soon items */}
            {(["Design the perfect logo", "Launch your website", "Register your brand"] as const).map((label) => (
              <div key={label} className="bnext soon">
                <span className="bnext-ic soon"></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
                </div>
                <span className="bnext-soon">Soon</span>
              </div>
            ))}

          </div>
          <div style={{ marginTop: 16 }}><span className="blink" onClick={onBack}>&larr; Back to the vote</span></div>
        </div>
      </div>
    </div>
  );
}
