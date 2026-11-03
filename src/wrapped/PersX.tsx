// 06f·b · Logo editor (handoff 27 · L): opens on the EXACT logo they picked
// and changes only what they touch. Tabs: Symbol · Font · Layout · Colour ·
// Fine-tune; "↺ Undo" and "Back to my original" always visible; "Describe a
// change…" redraws, then Keep / Undo. The logo is its key,
// "x:layout:symbol:font:case:size:spacing", plus a colour.
import { useMemo, useState } from "react";
import { LAYOUT_TITLE, X_FONTS, X_SYMS, ensureFonts, logoSvg, symbolPool, type Palette, type LogoShape } from "./logos";
import { logoTweakX } from "./api";

export interface XDraft { lay: string; sym: string; font: number; cs: string; size: number; sp: number; hex?: string }
export const parseX = (key: string, hex?: string): XDraft => {
  const [, lay = "side", sym = "none", f = "9", cs = "n", sz = "1", sp = "0"] = key.split(":");
  return { lay: lay === "swap" ? "side" : lay, sym, font: Number(f) || 0, cs, size: Number(sz) || 1, sp: Number(sp) || 0, hex };
};
export const keyOfX = (d: XDraft) => {
  const sz = Math.abs(d.size - 1) > 0.01 || d.sp ? `:${d.size.toFixed(2)}` : "";
  return `x:${d.lay}:${d.sym}:${d.font}:${d.cs}${sz}${d.sp ? `:${Math.round(d.sp)}` : ""}`;
};

const LAYOUTS: [string, string][] = [
  ["side", "Side by side"], ["stack", "Stacked"], ["word", "Name only"], ["split", "Lockup"],
  ["pill", "Badge"], ["emblem", "Emblem"], ["mono", "Initial"], ["icon", "Symbol only"],
];
const FONT_GROUPS: [string, number[]][] = [
  ["Serif", [2, 3, 0, 1, 4, 5]], ["Sans", [9, 11, 15, 10, 12, 13, 16, 21]], ["Display", [17, 18, 19, 20, 14, 27]],
];
const TABS = ["Symbol", "Font", "Layout", "Colour", "Fine-tune"] as const;
type Tab = typeof TABS[number];

export function PersX({ name, pal, shape, brief, taste, baseKey, baseHex, onSave, onBack, track }: {
  name: string; pal: Palette; shape: LogoShape; brief: string; taste: { type?: string; shape?: string };
  baseKey: string; baseHex?: string;
  onSave: (key: string, hex?: string) => void; onBack: () => void;
  track: (ev: string, p?: Record<string, unknown>) => void;
}) {
  const base = useMemo(() => parseX(baseKey, baseHex), [baseKey, baseHex]);
  const [d, setD] = useState<XDraft>(base);
  const [hist, setHist] = useState<XDraft[]>([]);
  const [tab, setTab] = useState<Tab>("Symbol");
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ before: XDraft; note: string; text: string } | null>(null);
  const [err, setErr] = useState("");
  const set = (nx: Partial<XDraft>, control: string) => { setHist((h) => [...h.slice(-30), d]); setD({ ...d, ...nx }); setPending(null); track("logo_edit", { control }); };

  const pool = useMemo(() => symbolPool(name, brief, taste), [name, brief, taste]);
  ensureFonts(FONT_GROUPS.flatMap(([, l]) => l).map((i) => ({ family: X_FONTS[i].f, weight: X_FONTS[i].w })));

  const key = keyOfX(d);
  const custom = d.hex ? { symbol: "none" as const, layout: "side" as const, accentHex: d.hex } : undefined;
  const svg = (variant: "light" | "night" | "dawn" | "icon", h: number, k = key) => logoSvg(k, name, pal, { variant, height: h, shape, custom });
  const fields = (["lay", "sym", "font", "cs", "size", "sp", "hex"] as const).filter((k) => (d as any)[k] !== (base as any)[k]);
  const noSym = d.lay === "word" || d.lay === "mono";
  const iconK = `x:icon:${d.sym}:${d.font}:${d.cs}`;
  const what = (() => { let o = ""; for (const w of (brief || "").split(/[.,;]/)[0].trim().toLowerCase().split(/\s+/)) { if ((o + " " + w).trim().length > 28) break; o = (o + " " + w).trim(); } return o; })();

  const doAsk = async () => {
    const q = ask.trim();
    if (!q || busy) return;
    setBusy(true); setErr("");
    const r = await logoTweakX({
      ask: q,
      current: { layout: d.lay, symbol: d.sym, font: X_FONTS[d.font].f, case: d.cs, colour: d.hex || pal.dawn, size: d.size },
      layouts: LAYOUTS.map(([k]) => k), symbols: Object.keys(X_SYMS), fonts: X_FONTS.map((f) => f.f),
    });
    setBusy(false);
    if (!r) { setErr("Couldn't redraw just now. Try again, or use the tabs."); return; }
    const fi = X_FONTS.findIndex((f) => f.f.toLowerCase() === String(r.font || "").toLowerCase());
    const nx: XDraft = {
      ...d,
      lay: LAYOUTS.some(([k]) => k === r.layout) ? String(r.layout) : d.lay,
      sym: r.symbol === "none" || X_SYMS[String(r.symbol)] ? String(r.symbol) : d.sym,
      font: fi >= 0 ? fi : d.font,
      cs: ["n", "u", "l"].includes(String(r.case)) ? String(r.case) : d.cs,
      size: Math.min(1.35, Math.max(0.65, Number(r.size) || d.size)),
      hex: /^#[0-9a-fA-F]{6}$/.test(String(r.colour)) && String(r.colour).toLowerCase() !== (d.hex || pal.dawn).toLowerCase() ? String(r.colour) : d.hex,
    };
    if (nx.sym === "none" && !["word", "mono"].includes(nx.lay)) nx.lay = "word";
    setPending({ before: d, note: String(r.note || "Redrawn"), text: q });
    setD(nx); setAsk("");
  };
  const keep = () => { if (!pending) return; setHist((h) => [...h.slice(-30), pending.before]); track("logo_edit_prompt", { text: pending.text, kept: true }); setPending(null); };
  const undoAsk = () => { if (!pending) return; setD(pending.before); track("logo_edit_prompt", { text: pending.text, kept: false }); setPending(null); };
  const undo = () => { if (pending) return undoAsk(); if (!hist.length) return; setD(hist[hist.length - 1]); setHist(hist.slice(0, -1)); };

  const askBox = (
    <>
      <form className="ask" onSubmit={(e) => { e.preventDefault(); void doAsk(); }}>
        <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="✎  Describe a change…" />
        <button type="submit" disabled={busy || !ask.trim()}>{busy ? "…" : "↑"}</button>
      </form>
      {busy && <p className="asknote">Redrawing your logo…</p>}
      {pending && (
        <div className="askres"><b>{pending.note}</b><span><button className="u" onClick={undoAsk}>Undo</button><button className="k" onClick={keep}>Keep</button></span></div>
      )}
      {err && <p className="asknote">{err}</p>}
    </>
  );

  return (
    <>
      <div className="wr-stage" style={{ paddingTop: 18 }}>
        <div className="wr-lwrap wr-pers px">
          <div className="pl">
            <div className="hero" dangerouslySetInnerHTML={{ __html: svg("light", 150) }} />
            <div className="edrow">
              <button onClick={undo} disabled={!hist.length && !pending}>↺ Undo</button>
              {fields.length > 0 && <em className="mono">{fields.length} change{fields.length > 1 ? "s" : ""}</em>}
              <button onClick={() => { setHist((h) => [...h, d]); setD(base); setPending(null); }} disabled={!fields.length}>Back to my original</button>
            </div>
            <div className="minis">
              <figure><span className="m night" dangerouslySetInnerHTML={{ __html: svg("night", 40) }} /><figcaption>On dark</figcaption></figure>
              <figure><span className="m dawn" dangerouslySetInnerHTML={{ __html: svg("dawn", 40) }} /><figcaption>On your gradient</figcaption></figure>
              <figure><span className="m icon" dangerouslySetInnerHTML={{ __html: svg("icon", 52, iconK) }} /><figcaption>App icon</figcaption></figure>
            </div>
          </div>
          <div className="pr">
            <div className="tabs">
              {TABS.map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => { setTab(t); track("logo_edit_tab", { tab: t }); }}>{t}</button>)}
            </div>

            {tab === "Symbol" && (
              <>
                {noSym ? <p className="plab">This layout has no symbol · pick another in Layout</p> : <p className="plab">{what ? `Picked for ${what}` : "Picked for you"}</p>}
                <div className="symrow">
                  {pool.map((k) => (
                    <button key={k} className={d.sym === k ? "on" : ""} title={X_SYMS[k].label} onClick={() => set({ sym: k, lay: noSym ? "side" : d.lay }, "symbol")}
                      dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 40 40" width="30" height="30">${X_SYMS[k].draw(20, 20, 15, d.sym === k ? "#000" : "currentColor", d.sym === k ? "#fff" : "#111")}</svg>` }} />
                  ))}
                </div>
                <p className="fine mono">{pool.length} symbols · swipe for more</p>
              </>
            )}

            {tab === "Font" && FONT_GROUPS.map(([g, list]) => (
              <div key={g}>
                <p className="plab">{g}</p>
                <div className="fontgrid">
                  {list.map((i) => (
                    <button key={i} className={d.font === i ? "on" : ""} onClick={() => set({ font: i, cs: X_FONTS[i].caps ? "u" : d.cs === "u" && X_FONTS[d.font].caps ? "n" : d.cs }, "font")}>
                      <span style={{ fontFamily: `'${X_FONTS[i].f}', var(--sans)`, fontWeight: X_FONTS[i].w }}>Aa</span>
                      <em>{X_FONTS[i].f}</em>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {tab === "Layout" && (
              <>
                <p className="plab">Layout</p>
                <div className="laygrid">
                  {LAYOUTS.map(([k, l]) => (
                    <button key={k} className={d.lay === k ? "on" : ""} onClick={() => set({ lay: k, sym: k === "word" || k === "mono" ? d.sym : d.sym === "none" ? pool[0] : d.sym }, "layout")}>
                      <span dangerouslySetInnerHTML={{ __html: logoSvg(`x:${k}:${d.sym === "none" ? pool[0] : d.sym}:${d.font}:${d.cs}`, name, pal, { variant: k === "icon" ? "icon" : "light", height: 40, shape, custom }) }} />
                      <em>{l}</em>
                    </button>
                  ))}
                </div>
                <p className="plab">Letters</p>
                <div className="seg sm">
                  {([["n", "Aa · as typed"], ["u", "AA · capitals"], ["l", "aa · lowercase"]] as const).map(([k, l]) => (
                    <button key={k} className={d.cs === k ? "on" : ""} onClick={() => set({ cs: k }, "case")}>{l}</button>
                  ))}
                </div>
              </>
            )}

            {tab === "Colour" && (
              <>
                <p className="plab">Symbol colour</p>
                <div className="sw">
                  {([["Dawn", pal.dawn], ["Haze", pal.haze], ["Nova", pal.nova]] as const).map(([l, hex]) => (
                    <button key={l} className={(d.hex || pal.dawn).toLowerCase() === hex.toLowerCase() ? "on" : ""} onClick={() => set({ hex: hex === pal.dawn ? undefined : hex }, "colour")}>
                      <i style={{ background: hex }} /><em>{l}</em>
                    </button>
                  ))}
                  {(() => {
                    const customOn = !!d.hex && ![pal.dawn, pal.haze, pal.nova].map((x) => x.toLowerCase()).includes(d.hex.toLowerCase());
                    return (
                      <label className={"swcustom" + (customOn ? " on" : "")}>
                        <i style={customOn ? { background: d.hex } : undefined}>{customOn ? "" : "+"}</i><em>Custom</em>
                        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(d.hex || "") ? d.hex : "#ff4f1a"} onChange={(e) => setD({ ...d, hex: e.target.value })} onBlur={() => track("logo_edit", { control: "colour" })} />
                      </label>
                    );
                  })()}
                </div>
              </>
            )}

            {tab === "Fine-tune" && (
              <>
                <div className="slab"><b>Symbol size</b><span className="mono">{Math.round(d.size * 100)}%</span></div>
                <input className="range" type="range" min={0.65} max={1.35} step={0.05} value={d.size} disabled={noSym}
                  onPointerDown={() => setHist((h) => [...h.slice(-30), d])} onChange={(e) => setD({ ...d, size: Number(e.target.value) })} onPointerUp={() => track("logo_edit", { control: "size" })} />
                <div className="slab sub"><span>Smaller</span><span>Bigger</span></div>
                <div className="slab"><b>Letter spacing</b><span className="mono">{d.sp > 0 ? "+" : ""}{Math.round(d.sp)}%</span></div>
                <input className="range" type="range" min={-6} max={15} step={1} value={d.sp}
                  onPointerDown={() => setHist((h) => [...h.slice(-30), d])} onChange={(e) => setD({ ...d, sp: Number(e.target.value) })} onPointerUp={() => track("logo_edit", { control: "spacing" })} />
                <div className="slab sub"><span>Tighter</span><span>Wider</span></div>
              </>
            )}

            <p className="plab">Describe a change</p>
            {askBox}
          </div>
        </div>
      </div>
      <div className="wr-foot col persfoot" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 280 }} onClick={() => { track("logo_saved", { changed_fields: fields, key }); onSave(key, d.hex); }}>Save my logo</button>
        <button className="wr-link" onClick={onBack}>← Your kit</button>
      </div>
    </>
  );
}

export const layoutTitle = (lay: string) => LAYOUT_TITLE[lay] || "Logo";
