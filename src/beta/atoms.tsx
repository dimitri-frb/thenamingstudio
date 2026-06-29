// Shared atoms for the beta (Apple-desktop) screens, faithful to the Claude Design
// import. Presentational only; all live under the .cx.skin-beta scope (see beta.css).
import type { ReactNode } from "react";

// A labelled field block (uppercase micro-label + optional hint).
export function BField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="bfield">
      <label className="bflabel">{label}{hint && <span className="bfhint"> {hint}</span>}</label>
      {children}
    </div>
  );
}

// Selectable chips. Single-select when `value` is a string, multi when string[].
export function Chips({ options, value, onPick, max }: {
  options: string[]; value: string | string[]; onPick: (v: string) => void; max?: number;
}) {
  const isOn = (o: string) => Array.isArray(value) ? value.includes(o) : value === o;
  const atMax = Array.isArray(value) && max != null && value.length >= max;
  return (
    <div className="bchips">
      {options.map((o) => {
        const on = isOn(o);
        return (
          <button key={o} type="button" className={"bchip" + (on ? " on" : "")}
            disabled={!on && atMax} onClick={() => onPick(o)}>{o}</button>
        );
      })}
    </div>
  );
}

// A macOS-style segmented control (single select).
export function Segmented({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="bseg">
      {options.map((o) => (
        <button key={o} type="button" className={"bseg-i" + (o === value ? " on" : "")}
          onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

// The sticky "brief, so far" reframe card (right rail of the intake screens).
export function ReframeCard({ line, tags }: { line: string; tags: string[] }) {
  return (
    <div className="breframe">
      <p className="brlabel">The brief, so far</p>
      <p className="brquote">{line}</p>
      {tags.length > 0 && <div className="brsep" />}
      <div className="brtags">{tags.map((t) => <span key={t} className="brtag">{t}</span>)}</div>
    </div>
  );
}
