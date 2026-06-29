// Shown when the founder clicks "Start a brief": connect (ideally with Google,
// otherwise an email) so we can send the names, domains and brand book and resume
// later. Renders in a portal; colours inline to match the (monochrome) landing.
//
// Google sign-in uses Google Identity Services and only activates when a client id
// is configured via VITE_GOOGLE_CLIENT_ID. The returned credential is a JWT we
// decode client-side for the email/name (lead capture, not authentication), so no
// backend is required. Until a client id is set, the email path is used.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;

const C = {
  ink: "#0D0D0D", ink2: "#52514E", ink3: "#918E8A", ink4: "#BEBCB8",
  surface: "#FFFFFF", page: "#F7F6F3", line: "#E8E7E3",
  serif: "'Geist', ui-sans-serif, system-ui, sans-serif",
  sans: "'Geist', ui-sans-serif, system-ui, sans-serif",
};

function decodeJwt(token: string): any {
  try {
    const p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(p))));
  } catch { return null; }
}

export function StartGate({ onComplete, onClose }: {
  onComplete: (info: { name: string; email: string }) => void; onClose: () => void;
}) {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem("ns.email") || ""; } catch { return ""; } });
  const [name, setName] = useState(() => { try { return localStorage.getItem("ns.fromName") || ""; } catch { return ""; } });
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const gbtn = useRef<HTMLDivElement>(null);

  // Load + render the official Google button when a client id is configured.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const w = window as any;
    const init = () => {
      if (!w.google?.accounts?.id || !gbtn.current) return;
      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: any) => {
          const p = decodeJwt(resp.credential);
          if (p?.email) onComplete({ name: p.name || p.given_name || "", email: p.email });
        },
      });
      w.google.accounts.id.renderButton(gbtn.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "pill", logo_alignment: "center", width: 372 });
    };
    if (w.google?.accounts?.id) { init(); return; }
    const existing = document.getElementById("gsi-script") as HTMLScriptElement | null;
    const s = existing || document.createElement("script");
    if (!existing) { s.id = "gsi-script"; s.src = "https://accounts.google.com/gsi/client"; s.async = true; document.head.appendChild(s); }
    s.addEventListener("load", init);
    return () => s.removeEventListener("load", init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go() { if (valid) onComplete({ name: name.trim(), email: email.trim() }); }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 20, background: "rgba(13,13,13,0.4)", backdropFilter: "blur(3px)", fontFamily: C.sans }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 432, background: C.page, border: `1px solid ${C.line}`, borderRadius: 22, padding: "32px 30px 26px", position: "relative", boxShadow: "0 40px 90px -40px rgba(13,13,13,0.5)" }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.line}`, background: C.surface, color: C.ink3, cursor: "pointer", fontSize: 14 }}>✕</button>

        <span style={{ fontFamily: C.sans, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: C.ink3 }}>The naming studio</span>
        <h2 style={{ fontFamily: C.serif, fontSize: 27, lineHeight: 1.12, letterSpacing: "-0.02em", margin: "10px 0 0", color: C.ink }}>Let's name your company.</h2>
        <p style={{ fontSize: 14, color: C.ink2, lineHeight: 1.5, margin: "10px 0 22px" }}>
          Connect first, so we can send your names, domains and brand book, and let you pick up where you left off.
        </p>

        {GOOGLE_CLIENT_ID
          ? <div ref={gbtn} style={{ display: "flex", justifyContent: "center", minHeight: 44 }} />
          : <div style={{ fontSize: 12.5, color: C.ink3, textAlign: "center", padding: "11px 12px", border: `1px dashed ${C.line}`, borderRadius: 12, background: C.surface }}>
              Google sign-in is being set up, use your email below for now.
            </div>}

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 2px" }}>
          <span style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink4 }}>or with email</span>
          <span style={{ flex: 1, height: 1, background: C.line }} />
        </div>

        <input value={name} placeholder="Your name (optional)" onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", fontFamily: C.sans, fontSize: 15, padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.surface, color: C.ink, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
        <input type="email" autoFocus value={email} placeholder="you@company.com"
          onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }}
          style={{ width: "100%", fontFamily: C.sans, fontSize: 15, padding: "12px 14px", borderRadius: 12, border: `1px solid ${valid || !email ? C.line : "#9A5C50"}`, background: C.surface, color: C.ink, outline: "none", boxSizing: "border-box" }} />

        <button onClick={go} disabled={!valid}
          style={{ width: "100%", marginTop: 14, fontFamily: C.sans, fontSize: 15, fontWeight: 500, padding: "13px 18px", borderRadius: 14, border: "none", cursor: valid ? "pointer" : "not-allowed", background: C.ink, color: "#fff", opacity: valid ? 1 : 0.4 }}>
          Start naming →
        </button>
        <p style={{ fontSize: 11.5, color: C.ink4, textAlign: "center", margin: "12px 0 0" }}>No spam. Just your results.</p>
      </div>
    </div>,
    document.body,
  );
}
