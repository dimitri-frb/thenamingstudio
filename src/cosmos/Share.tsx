// Step 9 · Share & vote (optional). Send up to 5 favourites as a quick No / Maybe
// / Yes vote, each with its tagline. Results feed the comparison, they don't
// decide for you. The founder can also skip straight to the decision.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Brief, Comparison } from "../lib/namingApi";
import { Head } from "./chrome";

export function Share({ brief, comp, taglines, setTaglines, onBack, onSkip, onDone, onCapture }: {
  brief: Brief; comp: Comparison | null; taglines: Record<string, string>;
  setTaglines: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void; onSkip: () => void; onDone: () => void;
  onCapture?: (email: string, fromName: string) => void;
}) {
  const all = comp?.rows || [];
  const [sending, setSending] = useState<string[]>(all.slice(0, 5).map((r) => r.name));
  const [showTaglines, setShowTaglines] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [gate, setGate] = useState(false);
  const [fromName, setFromName] = useState(() => { try { return localStorage.getItem("ns.fromName") || ""; } catch { return ""; } });

  const hasEmail = () => { try { return !!localStorage.getItem("ns.email"); } catch { return false; } };

  function doCopy() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1700);
  }
  // First share also registers the lead: collect a name + email so the founder gets
  // the answers back (and we never re-ask on the decision step).
  function copyLink() {
    if (hasEmail()) doCopy(); else setGate(true);
  }
  function submitGate(email: string) {
    try { localStorage.setItem("ns.fromName", fromName.trim()); } catch { /* ignore */ }
    onCapture?.(email.trim(), fromName.trim());
    setGate(false);
    doCopy();
  }

  // The brand tagline for each name (a founder edit overrides the generated one).
  const tagOf = (name: string) => taglines[name] ?? (all.find((r) => r.name === name)?.tagline || all.find((r) => r.name === name)?.verdict || "");
  const list = sending.map((n) => all.find((r) => r.name === n)).filter(Boolean) as Comparison["rows"];
  const preview = list[1] || list[0];

  const link = useMemo(() => {
    const base = window.location.origin + window.location.pathname;
    const p = new URLSearchParams();
    p.set("vote", sending.join("|"));
    p.set("notes", sending.map((n) => tagOf(n)).join("|"));
    p.set("about", (brief.does || "").slice(0, 160));
    if (fromName.trim()) p.set("from", fromName.trim());
    return `${base}?${p.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending, taglines, brief.does, fromName]);

  return (
    <>
      <HeadS />
      <div className="share-cols">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="lbl">Sending these {list.length}</span>
            <span style={{ flex: 1 }} />
            <span className="lbl">Show taglines</span>
            <span onClick={() => setShowTaglines((v) => !v)} role="switch" aria-checked={showTaglines}
              style={{ width: 34, height: 20, borderRadius: 999, background: showTaglines ? "var(--ink)" : "var(--line)", position: "relative", cursor: "pointer", flex: "0 0 auto", transition: "background .14s ease" }}>
              <span style={{ position: "absolute", top: 2, left: showTaglines ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "var(--surface)", transition: "left .14s ease" }} />
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 9, overflow: "auto" }}>
            {list.map((n) => (
              <div key={n.name} style={{ display: "flex", alignItems: "flex-start", gap: 12, border: "1px solid var(--line)", borderRadius: "var(--r2)", background: "var(--surface)", padding: "13px 16px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 22, letterSpacing: "-0.01em" }}>{n.name}</span>
                  {showTaglines && (
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
              {showTaglines && preview && <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 12.5, color: "var(--ink-2)", margin: "8px 0 0", lineHeight: 1.4 }}>"{tagOf(preview.name)}"</p>}
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
      {gate && <ShareGate fromName={fromName} setFromName={setFromName} onSubmit={submitGate} onClose={() => setGate(false)} />}
    </>
  );
}

// Collected before the first shareable link: the founder's name (so friends know
// who's asking) and email (so we send the results back, and register the lead).
function ShareGate({ fromName, setFromName, onSubmit, onClose }: {
  fromName: string; setFromName: (v: string) => void; onSubmit: (email: string) => void; onClose: () => void;
}) {
  const C = {
    ink: "#1A1916", ink2: "#55534C", ink3: "#8C887F", ink4: "#B6B2A8",
    surface: "#FFFFFF", line: "#E4E2DB",
    serif: "'Newsreader', Georgia, serif", sans: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  };
  const [email, setEmail] = useState(() => { try { return localStorage.getItem("ns.email") || ""; } catch { return ""; } });
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const ready = valid && fromName.trim().length > 0;
  function go() { if (ready) onSubmit(email.trim()); }
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 20, background: "rgba(26,25,22,0.42)", backdropFilter: "blur(3px)", fontFamily: C.sans }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, background: "#F7F6F2", border: `1px solid ${C.line}`, borderRadius: 22, padding: "34px 32px 28px", position: "relative", boxShadow: "0 40px 90px -40px rgba(26,25,22,0.5)" }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.line}`, background: C.surface, color: C.ink3, cursor: "pointer", fontSize: 14 }}>✕</button>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: C.ink3 }}>Share for votes</span>
        <h2 style={{ fontFamily: C.serif, fontSize: 30, lineHeight: 1.08, margin: "10px 0 0", color: C.ink }}>Get the answers back.</h2>
        <p style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.5, margin: "12px 0 22px" }}>
          Add your name and email. Friends see who's asking, and we send the results, and your brand book, straight to your inbox.
        </p>
        <input autoFocus value={fromName} placeholder="Your name"
          onChange={(e) => setFromName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }}
          style={{ width: "100%", fontFamily: C.sans, fontSize: 15.5, padding: "13px 15px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.surface, color: C.ink, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
        <input type="email" value={email} placeholder="you@company.com"
          onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }}
          style={{ width: "100%", fontFamily: C.sans, fontSize: 15.5, padding: "13px 15px", borderRadius: 12, border: `1px solid ${valid || !email ? C.line : "#9A5C50"}`, background: C.surface, color: C.ink, outline: "none", boxSizing: "border-box" }} />
        <button onClick={go} disabled={!ready}
          style={{ width: "100%", marginTop: 12, fontFamily: C.sans, fontSize: 15, fontWeight: 500, padding: "13px 18px", borderRadius: 14, border: "none", cursor: ready ? "pointer" : "not-allowed", background: C.ink, color: "#fff", opacity: ready ? 1 : 0.4 }}>
          Copy my share link →
        </button>
        <p style={{ fontSize: 11.5, color: C.ink4, textAlign: "center", margin: "12px 0 0" }}>No spam. Just your results.</p>
      </div>
    </div>,
    document.body,
  );
}

function HeadS() {
  return (
    <Head eyebrow="The gut-check · optional" title={<>Before you commit, <em>ask your friends.</em></>}
      sub="Send up to 5 favourites as a quick No / Maybe / Yes vote. The results inform you, they don't decide for you." />
  );
}
