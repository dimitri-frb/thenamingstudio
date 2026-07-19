// Beta comparison (07, design 1k), domains (08, design 1f), share & vote
// (09, design 1l) and decision (10, design 1m).
import { useEffect, useState } from "react";
import {
  fetchDomainBoard, createVoteSession, getVoteResults,
  type Brief, type Comparison, type DomainBoardData, type DomainCard,
} from "../../lib/namingApi";
import { BHead, BFoot, Skel, LoadBar } from "../atoms";

// 08 — Domains (design): "Now, claim the domain." — exact TLD rows on the left
// (status + real price), close variants in a card on the right, taken at the bottom.
export function BetaDomains({ brief, comp, initialPick, fallbackNames, onLockIn }: {
  brief: Brief; comp: Comparison | null; initialPick?: string; fallbackNames?: string[]; onLockIn: (name: string) => void;
}) {
  const allNames = comp ? comp.rows.map((r) => r.name) : (fallbackNames || []);
  const [pick, setPick] = useState(initialPick || comp?.recommended || allNames[0] || "");
  const [lockedDomain, setLockedDomain] = useState<string>("");
  const [boards, setBoards] = useState<Record<string, DomainBoardData>>({});
  // comp can arrive after mount (scoring runs while we land here) — adopt a pick then.
  useEffect(() => { if (!pick && allNames.length) setPick(allNames[0]); /* eslint-disable-next-line */ }, [allNames.length]);
  useEffect(() => {
    if (!pick || boards[pick]) return;
    setLockedDomain(""); // reset domain selection when name changes
    let live = true;
    fetchDomainBoard(pick, brief.geos).then((b) => { if (live) setBoards((p) => ({ ...p, [pick]: b })); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick]);

  const board = boards[pick];
  const rows = board ? board.tlds.filter((d) => d.status === "available" || d.status === "negotiable") : [];
  const taken = board ? board.tlds.filter((t) => t.status === "taken") : [];
  const variants = board ? board.variants : [];
  // "Available" = genuinely registrable at the standard price; for-sale and
  // premium rows show their real asking price instead, never as free.
  const availCount = rows.filter((d) => d.status === "available" && !d.premium).length;
  const note = comp?.rows.find((r) => r.name === pick)?.verdict || "";

  const selectRow = (domain: string) => setLockedDomain((p) => (p === domain ? "" : domain));
  const statusOf = (d: DomainCard) =>
    d.status === "negotiable" ? "For sale" : d.premium ? "Premium" : "Available";
  const priceOf = (d: DomainCard) => d.price || d.offerPrice || "";

  return (
    <>
      <div className="bbody">
        {!board ? (
          <>
            <BHead eyebrow="The domains" title={<>Checking what&rsquo;s available&hellip;</>}
              sub="Looking up every extension for your pick — and hunting close variants you can own." />
            <LoadBar text={<>Querying registrars for {pick || "your picks"}&hellip;</>} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>{pick}</span>
              <span className="bspin" />
            </div>
            <div className="bdom-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bdomrow" style={{ opacity: 1 - i * 0.09 }}>
                    <span className="bdomdot" style={{ background: "var(--surface-3)" }} />
                    <span style={{ flex: 1 }}><Skel w={i % 2 ? "38%" : "52%"} h={12} /></span>
                    <Skel w={54} h={12} />
                  </div>
                ))}
              </div>
              <div className="bdom-vars">
                <p className="bdom-vars-label">Also free &middot; a close variant</p>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bvarrow" style={{ cursor: "default" }}>
                    <Skel w={i % 2 ? "58%" : "70%"} h={11} />
                    <Skel w={28} h={11} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <BHead eyebrow="The domains" title={<>Now, claim the domain.</>}
              sub="A great name is only great if you can own it. Here's where your pick can live — and what's up for negotiation." />
            {/* Your pick — fixed order, ★ on the selected one */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginRight: 2 }}>Your pick</span>
              {allNames.map((n) => (
                <button key={n} className={"bpick" + (n === pick ? " on" : "")} onClick={() => setPick(n)}>
                  {n === pick && <span style={{ fontSize: 11, marginRight: 6 }}>★</span>}{n}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>{pick}</span>
              {availCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--on-accent)", background: "var(--accent)", padding: "4px 10px", borderRadius: 999 }}>Great</span>
              )}
              <span style={{ fontSize: 14, color: "var(--ink-2)" }}>
                {availCount} available{note ? <> &middot; {note.charAt(0).toLowerCase() + note.slice(1).replace(/\.$/, "")}</> : ""}
              </span>
            </div>
            <div className="bdom-grid">
              {/* Exact extensions — status + real price on every row */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rows.map((d) => {
                  const sel = d.domain === lockedDomain;
                  const paid = d.status === "negotiable" || d.premium;
                  return (
                    <div key={d.domain} className={"bdomrow avail" + (sel ? " chosen" : "")} onClick={() => selectRow(d.domain)}>
                      <span className="bdomdot" style={{ background: paid ? "var(--watch)" : "#28c840" }} />
                      <span className="bdomname" style={{ fontWeight: sel ? 600 : undefined }}>{d.domain}</span>
                      <span className={"bdomstatus " + (sel ? "" : paid ? "nego" : "avail")} style={sel ? { color: "var(--accent)" } : undefined}>
                        {sel ? "✓ Selected" : statusOf(d)}
                      </span>
                      {priceOf(d) && <span className="bdomprice">{priceOf(d)}</span>}
                    </div>
                  );
                })}
                {!rows.length && (
                  <p style={{ fontSize: 13.5, color: "var(--ink-3)", margin: 0 }}>No exact extension is free — a close variant on the right can still be yours.</p>
                )}
              </div>
              {/* Close variants — also free, a prefix or suffix away */}
              {variants.length > 0 && (
                <div className="bdom-vars">
                  <p className="bdom-vars-label">Also free &middot; a close variant</p>
                  {variants.slice(0, 8).map((v) => {
                    const sel = v.domain === lockedDomain;
                    return (
                      <div key={v.domain} className={"bvarrow" + (sel ? " chosen" : "")} onClick={() => selectRow(v.domain)}>
                        <span className="nm" style={sel ? { color: "var(--accent)", fontWeight: 600 } : undefined}>{v.domain}</span>
                        <span className="pr" style={sel ? { color: "var(--accent)" } : undefined}>{sel ? "✓" : v.price || ""}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {taken.length > 0 && (
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 8px" }}>Already taken</p>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  {taken.map((d) => (
                    <span key={d.domain} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--mono)", fontSize: 13.5, color: "var(--ink-3)", textDecoration: "line-through" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff5f57", flexShrink: 0 }} />
                      {d.domain}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BFoot next={`Block ${lockedDomain || pick}`} disabled={!pick} onNext={() => onLockIn(pick)} />
    </>
  );
}

// 09 — Share & vote (design 1l): a shareable link, live results, voters.
// names is passed directly so this screen works whether the user arrived from
// the comparison step (full comp) or jumped here early from the name ideas step.
export function BetaShare({ brief, names, onDone }: {
  brief: Brief; names: string[];
  onDone: () => void;
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
      <BFoot next="Check domains →" onNext={onDone} />
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
                  ) : claimable.map((d) => {
                    const paid = d.status === "negotiable" || d.premium;
                    return (
                      <a key={d.domain} href={gd(d.domain)} target="_blank" rel="noopener noreferrer"
                        className="bdomrow avail" style={{ textDecoration: "none" }}>
                        <span className="bdomdot" style={{ background: paid ? "var(--watch)" : "#28c840" }} />
                        <span className="bdomname">{d.domain}</span>
                        <span className={"bdomstatus " + (paid ? "nego" : "avail")}>
                          {d.price || d.offerPrice || (d.status === "negotiable" ? "For sale" : d.premium ? "Premium" : "Available")}
                        </span>
                      </a>
                    );
                  })}
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
          <div style={{ marginTop: 16 }}><span className="blink" onClick={onBack}>&larr; Back to domains</span></div>
        </div>
      </div>
    </div>
  );
}
