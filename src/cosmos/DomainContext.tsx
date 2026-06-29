// When a name's exact .com is already taken, this looks up who's actually there
// (live title + description) and flags whether it's a real competitor in the
// founder's space, a "safe play" if not, a "heads-up" if so. Fetched lazily and
// cached, so it only runs for the name(s) the founder is actually weighing.
import { useEffect, useState } from "react";
import { fetchSiteInfo, type Brief, type DomainHit, type SiteInfo } from "../lib/namingApi";
import { comTaken, godaddyUrl, slugify } from "./data";

export function DomainContext({ name, brief, domains, compact }: {
  name: string; brief: Brief; domains?: DomainHit[]; compact?: boolean;
}) {
  const taken = comTaken(domains) === true;
  const dom = `${slugify(name)}.com`;
  const [info, setInfo] = useState<SiteInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    if (!taken) { setInfo(null); return; }
    setLoading(true);
    fetchSiteInfo(dom, brief).then((r) => { if (live) { setInfo(r); setLoading(false); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dom, taken]);

  if (!taken) return null;

  // The verdict: competitor (amber), parked/for-sale (neutral), or clear (green).
  const competitor = info?.ok && info.competitor;
  const parked = info?.ok && info.parked;
  const clear = info?.ok && !info.competitor && !info.parked;
  const tone = competitor ? "var(--bad)" : clear ? "var(--good)" : "var(--ink-3)";
  const badge = loading ? "CHECKING…" : competitor ? "HEADS-UP" : parked ? "FOR SALE?" : clear ? "SAFE PLAY" : "REGISTERED";
  const line = loading
    ? `Looking up who's on ${dom}…`
    : competitor
      ? <>A company in your space already runs <b>{dom}</b>{info?.note ? <>, {info.note}</> : ""}. Worth a closer look before you commit.</>
      : parked
        ? <><b>{dom}</b> looks parked or listed for sale, it may be buyable on the aftermarket.</>
        : clear
          ? <><b>{dom}</b> is taken but by something unrelated to your space{info?.note ? <> ({info.note})</> : ""}, no obvious conflict.</>
          : <><b>{dom}</b> is registered. We couldn't read the site; it may still be for sale on the aftermarket.</>;

  return (
    <div style={{
      border: "1px solid var(--line)", borderLeft: `3px solid ${tone}`, borderRadius: "var(--r2)",
      background: "var(--surface-2)", padding: compact ? "9px 12px" : "11px 14px", textAlign: "left",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span className="lbl" style={{ color: tone, fontSize: 9.5 }}>● {badge}</span>
        {info?.title && !loading && <span style={{ fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.title}</span>}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: 0, lineHeight: 1.45 }}>{line}</p>
      {info?.ok && info.desc && !loading && (
        <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "5px 0 0", lineHeight: 1.4, fontStyle: "italic" }}>“{info.desc}”</p>
      )}
      {!loading && (
        <div style={{ display: "flex", gap: 14, marginTop: 7 }}>
          {info?.ok && info.url && <a href={info.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "var(--ink-2)", textDecoration: "none", fontWeight: 500 }}>Visit {dom} →</a>}
          <a href={godaddyUrl(dom)} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "var(--ink-3)", textDecoration: "none" }}>Check price on GoDaddy →</a>
        </div>
      )}
    </div>
  );
}
