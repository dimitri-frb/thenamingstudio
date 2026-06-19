// Step 9 · Share & vote (optional). Send up to 5 favourites as a quick No / Maybe
// / Yes vote, each with an editable tagline. Results feed the comparison — they
// don't decide for you. The founder can also skip straight to the decision.
import { useMemo, useState } from "react";
import type { Brief, Comparison } from "../lib/namingApi";
import { Head } from "./chrome";

export function Share({ brief, comp, taglines, setTaglines, onBack, onSkip, onDone }: {
  brief: Brief; comp: Comparison | null; taglines: Record<string, string>;
  setTaglines: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void; onSkip: () => void; onDone: () => void;
}) {
  const all = comp?.rows || [];
  const [sending, setSending] = useState<string[]>(all.slice(0, 5).map((r) => r.name));
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1700);
  }

  const tagOf = (name: string) => taglines[name] ?? (all.find((r) => r.name === name)?.verdict || "");
  const list = sending.map((n) => all.find((r) => r.name === n)).filter(Boolean) as Comparison["rows"];
  const preview = list[1] || list[0];

  const link = useMemo(() => {
    const base = window.location.origin + window.location.pathname;
    const p = new URLSearchParams();
    p.set("vote", sending.join("|"));
    p.set("notes", sending.map((n) => tagOf(n)).join("|"));
    p.set("about", (brief.does || "").slice(0, 160));
    return `${base}?${p.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending, taglines, brief.does]);

  return (
    <>
      <HeadS />
      <div className="share-cols">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="lbl">Sending these {list.length}</span>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 9, overflow: "auto" }}>
            {list.map((n) => (
              <div key={n.name} style={{ display: "flex", alignItems: "flex-start", gap: 12, border: "1px solid var(--line)", borderRadius: "var(--r2)", background: "var(--surface)", padding: "13px 16px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 22, letterSpacing: "-0.01em" }}>{n.name}</span>
                  {(
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                      {editing === n.name ? (
                        <input autoFocus className="inp" style={{ padding: "4px 8px", fontSize: 14 }} value={tagOf(n.name)}
                          onChange={(e) => setTaglines((t) => ({ ...t, [n.name]: e.target.value }))}
                          onBlur={() => setEditing(null)} onKeyDown={(e) => { if (e.key === "Enter") setEditing(null); }} />
                      ) : (
                        <>
                          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.35 }}>{tagOf(n.name)}</span>
                          <span className="lbl" style={{ color: "var(--ink-3)", cursor: "pointer", flex: "0 0 auto" }} onClick={() => setEditing(n.name)}>✎ edit</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <span className="x" style={{ color: "var(--ink-4)", cursor: "pointer" }} onClick={() => setSending((s) => s.filter((x) => x !== n.name))}>×</span>
              </div>
            ))}
            {!list.length && <span className="rn">All names removed, step back to add favourites.</span>}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span title={link} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", border: "1px solid var(--line)", borderRadius: "var(--r2)", fontSize: 13, color: "var(--ink-2)", background: "var(--surface-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ flex: "0 0 auto" }}>🔗</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Shareable vote link · {list.length} name{list.length === 1 ? "" : "s"}</span>
            </span>
            <button
              className={"btn" + (copied ? " copied-anim" : "")}
              onClick={copyLink}
              style={{ minWidth: 104, justifyContent: "center", ...(copied ? { background: "var(--ink)", color: "var(--surface)", borderColor: "var(--ink)" } : {}) }}
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>
        </div>

        {/* friend preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center" }}>
          <span className="lbl">What a friend sees</span>
          <div className="mini-phone">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15 }}>the naming studio</span>
              <span className="lbl" style={{ fontSize: 9 }}>{Math.min(2, list.length)} / {list.length}</span>
            </div>
            <div className="swipe" style={{ padding: "20px 16px" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 42, lineHeight: 1, letterSpacing: "-0.02em" }}>{preview?.name || "—"}</div>
              {preview && <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 12.5, color: "var(--ink-2)", margin: "8px 0 0", lineHeight: 1.4 }}>"{tagOf(preview.name)}"</p>}
            </div>
            <div style={{ display: "flex", gap: 7, justifyContent: "center" }}>
              {([["No", "✗", "var(--ink-4)"], ["Maybe", "~", "var(--ink-3)"], ["Yes!", "♥", "#fff"]] as const).map(([t, g, c], i) => (
                <div key={t} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                  <span style={{ width: 42, height: 42, borderRadius: "50%", border: i === 2 ? "1px solid var(--ink)" : "1px solid var(--line)", background: i === 2 ? "var(--ink)" : "var(--surface)", color: c, display: "grid", placeItems: "center", fontSize: 16 }}>{g}</span>
                  <span className="lbl" style={{ fontSize: 8 }}>{t}</span>
                </div>
              ))}
            </div>
            <span className="lbl" style={{ fontSize: 8.5, textAlign: "center" }}>Anonymous · 30 seconds</span>
          </div>
        </div>
      </div>

      <div className="cx-foot">
        <span className="link" onClick={onBack}>← Comparison</span>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span className="link" onClick={onSkip}>Skip, decide without a vote →</span>
          <button className="btn lg solid" onClick={onDone}>See how it landed →</button>
        </div>
      </div>
    </>
  );
}

function HeadS() {
  return (
    <Head eyebrow="The gut-check · optional" title={<>Before you commit, <em>ask your friends.</em></>}
      sub="Send up to 5 favourites as a quick No / Maybe / Yes vote. The results inform you, they don't decide for you." />
  );
}
