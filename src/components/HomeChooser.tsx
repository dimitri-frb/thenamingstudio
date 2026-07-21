// Home — "Choose your flow": Beta (guided studio) or Epsilon (cinematic), from
// the Claude Design Kinetic Flow handoff. One black stage, two cards.
// Self-contained styles so nothing leaks in or out.

const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif";

function Mark({ size = 28 }: { size?: number }) {
  return (
    <span style={{ display: "grid", placeItems: "center", width: size, height: size, borderRadius: Math.round(size * 0.28), background: "#fff", color: "#000" }}>
      <svg viewBox="0 0 24 24" width={size * 0.53} height={size * 0.53} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <path d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" />
      </svg>
    </span>
  );
}

export function HomeChooser({ onBeta, onEpsilon }: { onBeta: () => void; onEpsilon: () => void }) {
  return (
    <div className="hc" style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", background: "#000", color: "#fff", fontFamily: SANS, WebkitFontSmoothing: "antialiased", letterSpacing: "-0.01em", overflowY: "auto" }}>
      <style>{`
        .hc-stage { flex: 1; display: flex; flex-direction: column; padding: 34px 24px 0; }
        .hc-cards { display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .hc-card { border-radius: 15px; padding: 13px 15px; cursor: pointer; text-align: left; font-family: inherit; border: none; display: flex; flex-direction: column; }
        .hc-card.dark { background: #0f0f0f; border: 1px solid #2c2c2c; color: #fff; }
        .hc-card.light { background: #fff; border: 1.5px solid #fff; color: #000; }
        .hc-title { font-size: 30px; font-weight: 700; letter-spacing: -.03em; line-height: 1.04; margin: 0; }
        .hc-sub { font-size: 14px; color: #8a8a8a; margin: 10px 0 18px; line-height: 1.45; }
        .hc-start { display: none; }
        @media (min-width: 701px) {
          .hc-stage { align-items: center; justify-content: center; text-align: center; padding: 0 80px; }
          .hc-title { font-size: 46px; letter-spacing: -.035em; line-height: 1.02; }
          .hc-sub { font-size: 16px; margin: 16px 0 40px; line-height: 1.5; max-width: 44ch; }
          .hc-cards { flex-direction: row; gap: 22px; max-width: 680px; }
          .hc-card { flex: 1; border-radius: 22px; padding: 28px; text-align: left; }
          .hc-card .hc-desc { flex: 1; }
          .hc-start { display: inline-block; }
        }
      `}</style>

      <div className="hc-stage">
        <Mark size={30} />
        <h1 className="hc-title" style={{ marginTop: 16 }}>To find the perfect name</h1>
        <p className="hc-sub">Two ways to reach the same place — a name you own. Pick a pace; you can switch anytime.</p>
        <div className="hc-cards">
          <button className="hc-card dark" onClick={onBeta}>
            <span style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: "clamp(16px, 1.8vw, 24px)", fontWeight: 700, letterSpacing: "-.02em" }}>Beta</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#8a8a8a", border: "1px solid #333", borderRadius: 980, padding: "3px 9px" }}>Guided studio</span>
              <span style={{ marginLeft: "auto", fontSize: 15, color: "#fff" }}>→</span>
            </span>
            <span className="hc-desc" style={{ fontSize: "clamp(12.5px, 1.2vw, 14.5px)", color: "#9a9a9a", lineHeight: 1.55 }}>
              The full nine-step studio — sidebar, cards, and considered choices at every turn. Thorough and calm, for when you want to see everything.
            </span>
            <span className="hc-start" style={{ alignSelf: "flex-start", marginTop: 20, padding: "12px 24px", borderRadius: 980, fontSize: 15, fontWeight: 600, border: "1px solid #3a3a3a", color: "#fff" }}>Start Beta →</span>
          </button>
          <button className="hc-card light" onClick={onEpsilon}>
            <span style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: "clamp(16px, 1.8vw, 24px)", fontWeight: 700, letterSpacing: "-.02em" }}>Epsilon</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#000", background: "#eaeaea", borderRadius: 980, padding: "3px 9px" }}>New · cinematic</span>
              <span style={{ marginLeft: "auto", fontSize: 15, color: "#000" }}>→</span>
            </span>
            <span className="hc-desc" style={{ fontSize: "clamp(12.5px, 1.2vw, 14.5px)", color: "#4a4a4a", lineHeight: 1.55 }}>
              One question at a time on a black stage. Huge type, no chrome, and the name arrives as a reveal. Fast and focused.
            </span>
            <span className="hc-start" style={{ alignSelf: "flex-start", marginTop: 20, padding: "12px 24px", borderRadius: 980, fontSize: 15, fontWeight: 600, border: "none", color: "#fff", background: "#000" }}>Start Epsilon →</span>
          </button>
        </div>
      </div>
      <div style={{ padding: "18px 26px 22px", textAlign: "center", flex: "0 0 auto" }}>
        <span style={{ fontSize: 12, color: "#5c5c5c" }}>You can switch anytime</span>
      </div>
    </div>
  );
}
