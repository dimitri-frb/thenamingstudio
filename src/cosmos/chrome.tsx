// The Cosmos shell + shared atoms, ported from the design's cosmos-chrome.jsx and
// wired to the live flow (rail jumps to reached steps, back/leave callbacks).
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./cosmos.css";
import "./beta.css";

// Optional visual skin. "beta" reskins the whole flow as a macOS desktop app
// (cool palette, SF fonts, blue accent, window chrome) without touching the
// classic Cosmos look. Threaded down from CosmosFlow; default is the classic skin.
export type Skin = "beta" | undefined;

export const CXSTEPS = [
  "Company context", "Brand context", "Emotional value", "Naming strategy",
  "Exploration", "Name ideas", "Comparison", "Share & vote", "Decision",
];

export function CxBrand() {
  return (
    <div className="cx-brand">
      {/* SVG asterisk (matches the landing mark). The literal ✳ character renders
          as a colour emoji on phones, which looked off, this stays monochrome. */}
      <span className="gl" aria-hidden>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" />
        </svg>
      </span>
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

function CxBar({ step, total, reached = step, onBack, onForward, right }: { step: number; total: number; reached?: number; onBack: () => void; onForward?: () => void; right?: ReactNode }) {
  const canFwd = step < reached;
  return (
    <div className="cx-bar">
      <button className="back" onClick={onBack} title="Back">←</button>
      <button className="back" onClick={onForward} disabled={!canFwd} title="Forward"
        style={canFwd ? undefined : { opacity: 0.3, cursor: "default" }}>→</button>
      <span className="sno">{String(step + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      <div className="cx-prog">
        {Array.from({ length: total }).map((_, i) => <span key={i} className={i <= step ? "on" : ""} />)}
      </div>
      {right}
    </div>
  );
}

// Full shell with rail. `wide` drops the rail for the board-width screens.
// `skin="beta"` opts the whole shell into the macOS-desktop reskin (see beta.css).
export function Cx({ step, total = CXSTEPS.length, wide, reached, skin, topRight, barRight, onBack, onJump, onLeave, children }: {
  step: number; total?: number; wide?: boolean; reached?: number; skin?: Skin;
  topRight?: ReactNode; barRight?: ReactNode;
  onBack: () => void; onJump: (n: number) => void; onLeave: () => void;
  children: ReactNode;
}) {
  return (
    <div className={"cosmos-root" + (skin ? " skin-" + skin : "")}>
      <div className={"cx" + (wide ? " wide" : "") + (skin ? " skin-" + skin : "")}>
        <div className="cx-top">
          {skin === "beta" && (
            <span className="cx-traffic" aria-hidden><i /><i /><i /></span>
          )}
          <CxBrand />
          <div className="right">
            {topRight}
          </div>
        </div>
        {!wide && <CxRail step={step} reached={reached ?? step} onJump={onJump} onLeave={onLeave} />}
        <div className="cx-main">
          <CxBar step={step} total={total} reached={reached ?? step} onBack={onBack} onForward={() => onJump(Math.min(total - 1, step + 1))} right={barRight} />
          <div className="cx-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

// A quiet "i" badge that reveals an explanation on hover/focus. Lets us keep the
// standing copy short and move the "what is this?" detail out of the way.
// A quiet "i" badge that reveals an explanation on hover/focus. The popover renders
// in a portal at fixed coords, so it never gets clipped by an overflow:hidden
// ancestor (the boards and tables all clip their overflow).
export function Info({ children, pos = "down", align = "left" }: { children: ReactNode; pos?: "up" | "down"; align?: "left" | "right" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  const open = () => { const r = ref.current?.getBoundingClientRect(); if (r) setBox(r); };
  const close = () => setBox(null);
  return (
    <span ref={ref} className="info" tabIndex={0} role="button" aria-label="What's this?"
      onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close}>
      i
      {box && createPortal(
        <span className="info-pop-fixed" style={{
          position: "fixed", zIndex: 999,
          ...(pos === "up" ? { bottom: window.innerHeight - box.top + 8 } : { top: box.bottom + 8 }),
          ...(align === "right" ? { right: Math.max(8, window.innerWidth - box.right) } : { left: Math.max(8, box.left - 2) }),
        }}>{children}</span>,
        document.body,
      )}
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
