// End-of-beta-flow satisfaction check: a 0–10 NPS-style score + optional comment.
// Appears automatically ~2s after the Decision reveal so founders see the name first.
import { useState } from "react";
import { createPortal } from "react-dom";
import { submitSatisfaction } from "../lib/namingApi";

const C = {
  ink: "#0D0D0D", ink2: "#52514E", ink3: "#918E8A",
  surface: "#FFFFFF", surface2: "#F6F5F3", line: "#E8E7E3",
  accent: "#0071E3",
  sans: "'Geist', ui-sans-serif, system-ui, sans-serif",
};

// Red → yellow → green across 0–10
const DOT_COLOR = [
  "#FF3B30", "#FF3B30", "#FF6B30", "#FF9500", "#FFCC00",
  "#FFCC00", "#34C759", "#34C759", "#34C759", "#34C759", "#34C759",
];

export function SatisfactionPopup({ name, onClose }: { name: string; onClose: () => void }) {
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  function submit() {
    submitSatisfaction(score ?? 0, note.trim() || undefined, name);
    setDone(true);
    setTimeout(onClose, 1400);
  }

  return createPortal(
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: "20px 16px", background: "rgba(13,13,13,0.45)", backdropFilter: "blur(4px)", fontFamily: C.sans }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, background: C.surface, borderRadius: 20, padding: "28px 24px 24px", position: "relative", boxShadow: "0 40px 90px -40px rgba(13,13,13,0.55)" }}>

        <button onClick={onClose} aria-label="Close"
          style={{ position: "absolute", top: 14, right: 14, width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.line}`, background: C.surface, color: C.ink3, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        {done ? (
          <div style={{ padding: "24px 0 16px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 20, color: C.ink, fontWeight: 600 }}>Thank you!</div>
            <p style={{ fontSize: 13.5, color: C.ink2, margin: "6px 0 0" }}>Your feedback shapes what we build next.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: C.ink3, margin: "0 0 10px" }}>Before you go</p>
            <h2 style={{ fontSize: 21, fontWeight: 600, color: C.ink, margin: "0 0 4px", lineHeight: 1.25, paddingRight: 24 }}>
              How satisfied are you with{" "}
              <span style={{ color: C.accent }}>{name || "your name"}</span>?
            </h2>
            <p style={{ fontSize: 13, color: C.ink3, margin: "0 0 18px" }}>0 = not at all &middot; 10 = love it</p>

            {/* 0–10 score buttons */}
            <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
              {Array.from({ length: 11 }, (_, i) => {
                const sel = score === i;
                return (
                  <button key={i} onClick={() => setScore(i)}
                    style={{
                      flex: 1, height: 38, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: sel ? 700 : 400,
                      border: sel ? "none" : `1px solid ${C.line}`,
                      background: sel ? DOT_COLOR[i] : C.surface2,
                      color: sel ? "#fff" : C.ink2,
                      transition: "all 0.1s",
                    }}>{i}</button>
                );
              })}
            </div>

            {score !== null && (
              <>
                <textarea value={note} onChange={(e) => setNote(e.target.value)}
                  rows={2} placeholder="Add a comment (optional)"
                  autoFocus
                  style={{ width: "100%", fontFamily: C.sans, fontSize: 13.5, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 12 }} />
                <button onClick={submit}
                  style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: C.ink, color: "#fff", fontSize: 14.5, fontWeight: 500, cursor: "pointer" }}>
                  Submit →
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
