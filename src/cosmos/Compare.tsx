// Step 7 · Domains — the heart of the studio. For the founder's pick we lay out a
// generous board of extensions, each tagged Available (with price), Negotiable
// (aftermarket, via Domainr) or Taken (hover to see who's there). The brand score
// sits quietly alongside: at the end of the day, a great domain is the prize.
import { useEffect, useState } from "react";
import {
  naming, fetchDomains, fetchDomainBoard,
  type Brief, type Comparison, type CompareRow, type DomainHit, type SuggestedDomain,
  type DomainBoardData, type DomainCard,
} from "../lib/namingApi";
import { Head, Thinking, Info } from "./chrome";
import { DomainContext } from "./DomainContext";
import { godaddyUrl } from "./data";

type Dom = { domains: DomainHit[]; suggested: SuggestedDomain[] };

function smileOf(r: CompareRow) { return Math.max(1, Math.min(5, Math.round((r.intuitive + r.visual + r.sound + r.emotional) / 4))); }
function verdictOf(r: CompareRow) { const t = r.intuitive + r.visual + r.sound + r.emotional; return t >= 20 ? "Perfect" : t >= 16 ? "Great" : "Solid"; }
const verdictClass = (v: string) => (v === "Perfect" ? "fill" : v === "Great" ? "good" : "");

// Small coloured SMILE pips + number, shown on each name pill.
function Pips({ score }: { score: number }) {
  const color = score >= 4 ? "var(--good)" : score >= 3 ? "var(--watch)" : "var(--bad)";
  return <span style={{ display: "inline-flex", gap: 2.5 }}>{Array.from({ length: 5 }).map((_, i) =>
    <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i < score ? color : "var(--line)" }} />)}</span>;
}

const STATUS_LABEL: Record<string, string> = { available: "Available", negotiable: "Negotiable", taken: "Taken", unknown: "Unknown" };
const STATUS_CLASS: Record<string, string> = { available: "avail", negotiable: "nego", taken: "taken", unknown: "taken" };

export function Compare({ brief, shortlist, comp, setComp, onBack, onDone, onLockIn }: {
  brief: Brief; shortlist: string[]; comp: Comparison | null;
  setComp: (c: Comparison) => void; onBack: () => void; onDone: () => void; onLockIn: () => void;
}) {
  const [starred, setStarred] = useState("");
  const [dom, setDom] = useState<Record<string, Dom>>({});
  const [boards, setBoards] = useState<Record<string, DomainBoardData>>({});

  // Score the shortlist (gives SMILE + verdict + a recommended pick).
  useEffect(() => {
    if (comp) return;
    let live = true;
    const names = shortlist.map((name) => ({ name, type: "", rationale: "", score: 0 }));
    naming.compare(brief, names).then((c) => { if (live) setComp(c); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The light 3-TLD lookup (RDAP, cheap) for every name, so the Decision + Share
  // screens still have domains.
  useEffect(() => {
    if (!comp) return;
    let live = true;
    comp.rows.map((r) => r.name).forEach(async (name) => {
      if (!(name in dom)) { const d = await fetchDomains(name); if (live) setDom((p) => ({ ...p, [name]: d })); }
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comp]);

  // The full domain board (the hero of this screen). Fastly's Domain Research API
  // is metered, so we fetch it ONLY for the name the founder is looking at, and
  // cache it, switching pills loads that name once, then it's instant.
  const star = starred || comp?.recommended || comp?.rows?.[0]?.name || "";
  useEffect(() => {
    if (!star || star in boards) return;
    let live = true;
    fetchDomainBoard(star).then((b) => { if (live) setBoards((p) => ({ ...p, [star]: b })); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [star]);

  // Persist the 3-TLD availability back into comp for the downstream screens.
  useEffect(() => {
    if (!comp || !comp.rows.length) return;
    if (!comp.rows.every((r) => dom[r.name])) return;
    if (!comp.rows.some((r) => !r.suggested && dom[r.name]?.suggested)) return;
    setComp({ ...comp, rows: comp.rows.map((r) => ({ ...r, domains: dom[r.name]?.domains ?? r.domains, suggested: dom[r.name]?.suggested ?? r.suggested })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dom, comp]);

  if (!comp) return (
    <>
      <HeadC />
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <Thinking lines={["Scoring each name and hunting domains you can claim…", "Available · negotiable · taken"]} />
      </div>
    </>
  );

  const chooseStar = (name: string) => { setStarred(name); setComp({ ...comp, recommended: name }); };
  const active = comp.rows.find((r) => r.name === star) || comp.rows[0];
  const board = boards[star];
  const verdict = active ? verdictOf(active) : "Solid";

  // Available first, then negotiable, then taken: read it as a list of what you can claim.
  const order: Record<string, number> = { available: 0, negotiable: 1, unknown: 2, taken: 3 };
  const sortedTlds = board ? [...board.tlds].sort((a, b) => (order[a.status] - order[b.status])) : [];
  const availCount = sortedTlds.filter((t) => t.status === "available").length;
  const negoCount = sortedTlds.filter((t) => t.status === "negotiable").length;

  return (
    <>
      <HeadC />

      {/* Name selector — the shortlist as pills; the pick drives the board below. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="lbl" style={{ flex: "0 0 auto" }}>Your pick</span>
        {comp.rows.map((r) => {
          const on = r.name === star;
          return (
            <button key={r.name} className={"npill" + (on ? " on" : "")} onClick={() => chooseStar(r.name)}>
              <span className="nm" style={{ fontSize: 16 }}>{r.name}</span>
              <Pips score={smileOf(r)} />
            </button>
          );
        })}
      </div>

      {/* The domain board for the pick. */}
      <div className="dboard-wrap">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 30, letterSpacing: "-0.02em" }}>{active?.name}</span>
          <span className={"tag " + verdictClass(verdict)}>{verdict}</span>
          <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{availCount} available{negoCount ? ` · ${negoCount} negotiable` : ""}</span>
          <span style={{ flex: 1 }} />
          {active?.verdict && <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14.5, color: "var(--ink-2)", maxWidth: 360, textAlign: "right" }}>{active.verdict}</span>}
        </div>

        {!board ? (
          <div style={{ padding: "30px 0", display: "grid", placeItems: "center" }}><Thinking lines={["Checking every extension…"]} /></div>
        ) : (
          <>
            <div className="dboard">
              {sortedTlds.map((d) => <DomainCardView key={d.domain} card={d} brief={brief} />)}
            </div>

            {board.variants.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span className="lbl">Also free, a close variant</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {board.variants.map((v) => (
                    <a key={v.domain} href={godaddyUrl(v.domain)} target="_blank" rel="noreferrer" className="dvar">
                      <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{v.domain}</span>
                      <span style={{ fontSize: 11, color: "var(--good)" }}>{v.price}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* If the exact .com is gone, show who's actually on it. */}
            <div style={{ marginTop: 12 }}>
              <DomainContext name={star} brief={brief} domains={dom[star]?.domains} />
            </div>

            {board.source === "rdap" && (
              <p style={{ fontSize: 12, color: "var(--ink-4)", margin: "12px 2px 0", lineHeight: 1.45 }}>
                Showing registrable domains (live, via RDAP). Negotiable (for-sale) listings appear once the Fastly domain key is connected.
              </p>
            )}
          </>
        )}
      </div>

      <div className="cx-foot">
        <span className="link" onClick={onBack}>← Name ideas</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="btn" onClick={onLockIn}>Lock in {active?.name} →</button>
          <button className="btn lg solid" onClick={onDone}>Get a gut check →</button>
        </div>
      </div>
    </>
  );
}

// One domain card: name, status chip, and the right action.
function DomainCardView({ card, brief }: { card: DomainCard; brief: Brief }) {
  const cls = STATUS_CLASS[card.status] || "taken";
  const label = STATUS_LABEL[card.status] || "Taken";
  return (
    <div className={"dcard " + cls}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span className="dom">{card.domain}</span>
        {card.premium && <span className="lbl" style={{ fontSize: 8.5, color: "var(--watch)" }}>Premium</span>}
      </div>
      <span className={"dchip " + cls}>● {label}{card.status === "available" && card.price ? ` · ${card.price}` : ""}{card.status === "negotiable" && card.offerPrice ? ` · ${card.offerPrice}` : ""}</span>
      <div style={{ marginTop: "auto", paddingTop: 6 }}>
        {card.status === "available" && <a href={godaddyUrl(card.domain)} target="_blank" rel="noreferrer" className="dlink">Register →</a>}
        {card.status === "negotiable" && <a href={card.offerUrl || godaddyUrl(card.domain)} target="_blank" rel="noreferrer" className="dlink">{card.offerPrice ? "Buy / make an offer →" : "Make an offer →"}</a>}
        {card.status === "taken" && card.tld === ".com"
          ? <a href={godaddyUrl(card.domain)} target="_blank" rel="noreferrer" className="dlink" style={{ color: "var(--ink-3)" }} title="See who's on it below">Taken</a>
          : card.status === "taken" && <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>Taken</span>}
        {card.status === "unknown" && <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>Couldn't check</span>}
      </div>
      {/* keep brief referenced for potential future per-card context */}
      {false && <span hidden>{brief.does}</span>}
    </div>
  );
}

function HeadC() {
  return (
    <Head eyebrow={<>The domains <Info>For your pick we check a broad set of extensions live. <b>Available</b> you can register now (with price), <b>Negotiable</b> is taken but for sale on the aftermarket, <b>Taken</b> is in use, hover the .com to see who.</Info></>}
      title={<>Now, <em>claim the domain.</em></>}
      sub="A great name is only great if you can own it. Here's where your pick can live, what you can register, and what's up for negotiation." />
  );
}
