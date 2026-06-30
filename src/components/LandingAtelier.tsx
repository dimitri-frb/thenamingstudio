// Home page — redesigned to match "The Naming Studio - Home" design.
// Inline styles so it's self-contained and doesn't inherit beta/cosmos tokens.
const ACCENT = "#0071e3";
const INK = "#1d1d1f";
const INK3 = "#636366";
const INK4 = "#aeaeb2";
const SANS = "-apple-system, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif";
const BG = "#e8e8ed";

function Mark({ size = 28 }: { size?: number }) {
  const r = Math.round(size * 0.28);
  return (
    <div style={{ width: size, height: size, borderRadius: r, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" />
      </svg>
    </div>
  );
}

export function LandingAtelier({ onNext, onBeta }: { onNext: () => void; onBeta?: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, fontFamily: SANS }}>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Mark size={28} />
          <span style={{ fontSize: 14, fontWeight: 500, color: INK, letterSpacing: "-0.01em" }}>The Naming Studio</span>
        </div>
        {/* Theme switcher — visual only, future wiring */}
        <div style={{ display: "flex", gap: 1, background: "rgba(0,0,0,0.07)", borderRadius: 9, padding: 3 }}>
          {(["Light", "Dark", "Blue", "Graphite"] as const).map((t) => {
            const active = t === "Blue";
            return (
              <button key={t}
                style={{ padding: "5px 13px", borderRadius: 6, border: "none", fontSize: 12.5, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: SANS,
                  background: active ? "#fff" : "transparent", color: active ? INK : INK3,
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.14)" : "none" }}>
                {t}
              </button>
            );
          })}
        </div>
      </header>

      {/* Hero */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 24px" }}>
        <h1 style={{ fontSize: "clamp(48px, 7vw, 76px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.06, margin: 0, color: INK }}>
          Name it.{" "}<span style={{ color: ACCENT }}>Own it.</span>
        </h1>
        <p style={{ marginTop: 20, fontSize: 17, lineHeight: 1.6, color: INK3, maxWidth: 400 }}>
          Describe what you're building. Walk out with a name you love and the domain to match.
        </p>
        <div style={{ marginTop: 36, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={onNext}
            style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 50, padding: "15px 30px", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: SANS, boxShadow: "0 2px 12px rgba(0,113,227,0.35)" }}>
            Start a brief
          </button>
          {onBeta && (
            <button onClick={onBeta}
              style={{ background: "rgba(255,255,255,0.7)", color: INK, border: "none", borderRadius: 50, padding: "15px 30px", fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              Start a brief
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(0,0,0,0.07)", padding: "3px 8px", borderRadius: 5, color: INK3 }}>BETA</span>
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderTop: "1px solid rgba(0,0,0,0.07)", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Mark size={20} />
          <span style={{ fontSize: 12.5, color: INK3 }}>A project by <strong style={{ color: INK, fontWeight: 600 }}>The Naming Studio</strong></span>
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12.5, color: INK4 }}>
          <span style={{ cursor: "pointer" }}>Privacy</span>
          <span style={{ cursor: "pointer" }}>Terms</span>
          <span style={{ cursor: "pointer" }}>Contact</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
