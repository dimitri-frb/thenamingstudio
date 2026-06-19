// Email gate shown when the founder locks in their name: leave an email to open
// (and receive) the brand book. Renders in a portal, so colors are inline.
import { useState } from "react";
import { createPortal } from "react-dom";

const C = {
  ink: "#1A1916", ink2: "#55534C", ink3: "#8C887F", ink4: "#B6B2A8",
  surface: "#FFFFFF", line: "#E4E2DB",
  serif: "'Newsreader', Georgia, serif", sans: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
};

export function EmailGate({ name, onSubmit, onClose }: { name: string; onSubmit: (email: string) => void; onClose: () => void }) {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem("ns.email") || ""; } catch { return ""; } });
  const [busy, setBusy] = useState(false);
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  function go() {
    if (!valid || busy) return;
    setBusy(true);
    onSubmit(email.trim());
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 20, background: "rgba(26,25,22,0.42)", backdropFilter: "blur(3px)", fontFamily: C.sans }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, background: "#F7F6F2", border: `1px solid ${C.line}`, borderRadius: 22, padding: "34px 32px 28px", position: "relative", boxShadow: "0 40px 90px -40px rgba(26,25,22,0.5)" }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.line}`, background: C.surface, color: C.ink3, cursor: "pointer", fontSize: 14 }}>✕</button>

        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: C.ink3 }}>Locked in</span>
        <h2 style={{ fontFamily: C.serif, fontSize: 32, lineHeight: 1.08, margin: "10px 0 0", color: C.ink }}>
          <span style={{ fontStyle: "italic" }}>{name}</span> is yours.
        </h2>
        <p style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.5, margin: "12px 0 22px" }}>
          Drop your email to open your brand book, story, voice, colour and type, and get a copy sent to your inbox.
        </p>

        <input
          type="email" autoFocus value={email} placeholder="you@company.com"
          onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }}
          style={{ width: "100%", fontFamily: C.sans, fontSize: 15.5, padding: "13px 15px", borderRadius: 12, border: `1px solid ${valid || !email ? C.line : "#9A5C50"}`, background: C.surface, color: C.ink, outline: "none", boxSizing: "border-box" }} />

        <button onClick={go} disabled={!valid || busy}
          style={{ width: "100%", marginTop: 12, fontFamily: C.sans, fontSize: 15, fontWeight: 500, padding: "13px 18px", borderRadius: 14, border: "none", cursor: valid && !busy ? "pointer" : "not-allowed", background: C.ink, color: "#fff", opacity: valid && !busy ? 1 : 0.4 }}>
          {busy ? "Opening…" : "See my brand book →"}
        </button>
        <p style={{ fontSize: 11.5, color: C.ink4, textAlign: "center", margin: "12px 0 0" }}>No spam. Just your brand book.</p>
      </div>
    </div>,
    document.body,
  );
}
