// The Cosmos shell + shared atoms, ported from the design's cosmos-chrome.jsx and
// wired to the live flow (rail jumps to reached steps, back/leave callbacks).
import type { CSSProperties, ReactNode } from "react";
import "./cosmos.css";

export const CXSTEPS = [
  "Company context", "Brand context", "Emotional value", "Naming strategy",
  "Concepts", "Exploration", "Name ideas", "Comparison", "Share & vote", "Decision",
];

export function CxBrand() {
  return (
    <div className="cx-brand">
      <span className="gl">✳</span>
      <span className="nm">the naming studio</span>
    </div>
  );
}

function CxRail({ step, reached, onJump, onLeave }: {
  step: number; reached: number; onJump: (n: number) => void; onLeave: () => void;
}) {
  return (
    <aside className="cx-rail">
      <div className="grp"><span className="lbl">The process</span></div>
      <ol>
        {CXSTEPS.map((s, i) => (
          <li
            key={s}
            className={i < step ? "done" : i === step ? "active" : ""}
            style={i <= reached ? { cursor: "pointer" } : undefined}
            onClick={() => i <= reached && onJump(i)}
          >
            <span className="n">{String(i + 1).padStart(2, "0")}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className="leave" style={{ cursor: "pointer" }} onClick={onLeave}>← Leave the studio</div>
    </aside>
  );
}

function CxBar({ step, total, onBack, right }: { step: number; total: number; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="cx-bar">
      <button className="back" onClick={onBack}>←</button>
      <span className="sno">{String(step + 1).padStart(2, "0")} / {total}</span>
      <div className="cx-prog">
        {Array.from({ length: total }).map((_, i) => <span key={i} className={i <= step ? "on" : ""} />)}
      </div>
      {right}
    </div>
  );
}

// Full shell with rail. `wide` drops the rail for the board-width screens.
export function Cx({ step, total = 10, wide, reached, topRight, barRight, onBack, onJump, onLeave, children }: {
  step: number; total?: number; wide?: boolean; reached?: number;
  topRight?: ReactNode; barRight?: ReactNode;
  onBack: () => void; onJump: (n: number) => void; onLeave: () => void;
  children: ReactNode;
}) {
  return (
    <div className="cosmos-root">
      <div className={"cx" + (wide ? " wide" : "")}>
        <div className="cx-top">
          <CxBrand />
          <div className="right">
            {topRight || <span className="lbl">🇫🇷 INPI-ready</span>}
          </div>
        </div>
        {!wide && <CxRail step={step} reached={reached ?? step} onJump={onJump} onLeave={onLeave} />}
        <div className="cx-main">
          <CxBar step={step} total={total} onBack={onBack} right={barRight} />
          <div className="cx-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

// A quiet "i" badge that reveals an explanation on hover/focus. Lets us keep the
// standing copy short and move the "what is this?" detail out of the way.
export function Info({ children, pos = "down" }: { children: ReactNode; pos?: "up" | "down" }) {
  return (
    <span className={"info " + pos} tabIndex={0} role="button" aria-label="What's this?">
      i<span className="info-pop">{children}</span>
    </span>
  );
}

export function Head({ eyebrow, title, sub }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="h1">{title}</h1>
      {sub && <p className="sub">{sub}</p>}
    </div>
  );
}

export function Foot({ back = "Back", next, onBack, onNext, disabled, solid = true }: {
  back?: string; next: ReactNode; onBack?: () => void; onNext?: () => void; disabled?: boolean; solid?: boolean;
}) {
  return (
    <div className="cx-foot">
      <span className="link" onClick={onBack} style={{ visibility: onBack ? "visible" : "hidden" }}>← {back}</span>
      <button
        className={"btn lg" + (solid ? " solid" : "")}
        onClick={onNext}
        disabled={disabled}
        style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
      >{next}</button>
    </div>
  );
}

export function Dots({ score = 3, max = 5 }: { score?: number; max?: number }) {
  return <span className="dots">{Array.from({ length: max }).map((_, i) => <i key={i} className={i < score ? "on" : ""} />)}</span>;
}

export function Star({ on, onClick }: { on?: boolean; onClick?: (e: React.MouseEvent) => void }) {
  return <span className={"star" + (on ? " on" : "")} onClick={onClick}>{on ? "★" : "☆"}</span>;
}

export function Anno({ pos = "down", style, k, children }: { pos?: string; style?: CSSProperties; k: ReactNode; children: ReactNode }) {
  return <div className={"cx-anno " + pos} style={style}><span className="k">{k}</span>{children}</div>;
}

export function Thinking({ lines }: { lines: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "40px 0" }}>
      <span className="eyebrow">Working</span>
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? "stream" : ""} style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: i === 0 ? 22 : 15, color: i === 0 ? "var(--ink)" : "var(--ink-3)", margin: 0 }}>{l}</p>
      ))}
    </div>
  );
}
