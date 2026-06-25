// End-of-flow feedback (step 10). Sliders (bad -> great) with optional notes, plus
// two free-text fields. Submits to submitFeedback, which registers it in /admin.
// Rendered in a portal, so colours are inline (matched to the cosmos.so palette).
import { useState } from "react";
import { createPortal } from "react-dom";
import { submitFeedback, type Feedback as Fb } from "../lib/namingApi";

const C = {
  ink: "#0D0D0D", ink2: "#52514E", ink3: "#918E8A", ink4: "#BEBCB8",
  surface: "#FFFFFF", surface2: "#F6F5F3", line: "#E8E7E3",
  sans: "'Geist', ui-sans-serif, system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
};

const SLIDERS: { key: "experience" | "ux" | "found"; q: string; lo: string; hi: string }[] = [
  { key: "experience", q: "How was the overall experience?", lo: "Poor", hi: "Loved it" },
  { key: "ux", q: "How was the platform to use (UX)?", lo: "Clunky", hi: "Effortless" },
  { key: "found", q: "Did you find a name that works?", lo: "Not at all", hi: "Found the one" },
];

export function Feedback({ fromName, email, onClose }: { fromName?: string; email?: string; onClose: () => void }) {
  const [score, setScore] = useState<Record<string, number>>({ experience: 4, ux: 4, found: 4 });
  const [note, setNote] = useState<Record<string, string>>({});
  const [improve, setImprove] = useState("");
  const [free, setFree] = useState("");
  const [done, setDone] = useState(false);

  function submit() {
    const fb: Fb = {
      experience: score.experience, ux: score.ux, found: score.found,
      experienceNote: note.experience, uxNote: note.ux, foundNote: note.found,
      improve: improve.trim() || undefined, free: free.trim() || undefined,
      fromName, email,
    };
    submitFeedback(fb);
    setDone(true);
    setTimeout(onClose, 1200);
  }

  const fieldStyle = { width: "100%", fontFamily: C.sans, fontSize: 14, padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface, color: C.ink, outline: "none", boxSizing: "border-box" as const };

  return createPortal(
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", padding: 20, background: "rgba(13,13,13,0.42)", backdropFilter: "blur(3px)", fontFamily: C.sans, overflow: "auto" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 540, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, padding: "30px 30px 26px", position: "relative", boxShadow: "0 40px 90px -40px rgba(13,13,13,0.5)", margin: "auto" }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.line}`, background: C.surface, color: C.ink3, cursor: "pointer", fontSize: 14 }}>✕</button>

        {done ? (
          <div style={{ padding: "30px 0", textAlign: "center" }}>
            <div style={{ fontFamily: C.sans, fontSize: 26, color: C.ink, marginBottom: 8 }}>Thank you{fromName ? `, ${fromName.split(" ")[0]}` : ""}.</div>
            <p style={{ fontSize: 14.5, color: C.ink2, margin: 0 }}>Your feedback helps us make this better.</p>
          </div>
        ) : (
          <>
            <span style={{ fontFamily: C.mono, fontSize: 10.5, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: C.ink3 }}>Before you go</span>
            <h2 style={{ fontFamily: C.sans, fontSize: 26, lineHeight: 1.1, margin: "10px 0 4px", color: C.ink }}>How did we do?</h2>
            <p style={{ fontSize: 14, color: C.ink2, lineHeight: 1.5, margin: "0 0 20px" }}>A minute of feedback shapes what we build next.</p>

            {SLIDERS.map((s) => (
              <div key={s.key} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 500, color: C.ink }}>{s.q}</span>
                  <span style={{ fontFamily: C.mono, fontSize: 13, color: C.ink }}>{score[s.key]}/5</span>
                </div>
                <input type="range" min={1} max={5} step={1} value={score[s.key]}
                  onChange={(e) => setScore((p) => ({ ...p, [s.key]: +e.target.value }))}
                  style={{ width: "100%", margin: "8px 0 2px", accentColor: C.ink, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: C.mono, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.06em", color: C.ink4 }}>
                  <span>{s.lo}</span><span>{s.hi}</span>
                </div>
                <input value={note[s.key] || ""} onChange={(e) => setNote((p) => ({ ...p, [s.key]: e.target.value }))}
                  placeholder="Add a detail (optional)" style={{ ...fieldStyle, marginTop: 8, fontSize: 13 }} />
              </div>
            ))}

            <label style={{ display: "block", fontSize: 14.5, fontWeight: 500, color: C.ink, margin: "4px 0 6px" }}>What could we improve?</label>
            <textarea value={improve} onChange={(e) => setImprove(e.target.value)} rows={2} placeholder="The one thing that would have made this better…" style={{ ...fieldStyle, resize: "vertical" }} />

            <label style={{ display: "block", fontSize: 14.5, fontWeight: 500, color: C.ink, margin: "14px 0 6px" }}>Anything else?</label>
            <textarea value={free} onChange={(e) => setFree(e.target.value)} rows={2} placeholder="Optional" style={{ ...fieldStyle, resize: "vertical" }} />

            <button onClick={submit}
              style={{ width: "100%", marginTop: 18, fontFamily: C.sans, fontSize: 15, fontWeight: 500, padding: "13px 18px", borderRadius: 14, border: "none", cursor: "pointer", background: C.ink, color: "#fff" }}>
              Send feedback →
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
