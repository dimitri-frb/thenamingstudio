// 06f·b · Logo personalisation on logo engine v2 (tester feedback, 3 Nov):
// starts from the EXACT logo they picked and changes only what they touch.
// The logo is its key, "x:layout:symbol:font:case:size", plus a colour.
import { useMemo, useState } from "react";
import { LAYOUT_TITLE, TYPE_FAMILY, TYPE_FONTS, X_FONTS, X_SYMS, ensureFonts, logoSvg, symbolPool, type Palette, type LogoShape } from "./logos";
import { logoTweakX } from "./api";

export interface XDraft { lay: string; sym: string; font: number; cs: string; size: number; hex?: string }
export const parseX = (key: string, hex?: string): XDraft => {
  const [, lay = "side", sym = "none", f = "9", cs = "n", sz = "1"] = key.split(":");
  return { lay: lay === "swap" ? "side" : lay, sym, font: Number(f) || 0, cs, size: Number(sz) || 1, hex };
};
export const keyOfX = (d: XDraft) => `x:${d.lay}:${d.sym}:${d.font}:${d.cs}${Math.abs(d.size - 1) > 0.01 ? `:${d.size.toFixed(2)}` : ""}`;

const LAYOUTS: [string, string][] = [
  ["side", "Side by side"], ["stack", "Stacked"], ["word", "Name only"], ["split", "Lockup"],
  ["pill", "Badge"], ["emblem", "Emblem"], ["mono", "Initial"], ["icon", "Symbol only"],
];
const FONT_GROUPS: [string, number[]][] = [
  ["Serif", [0, 1, 2, 3, 4, 5, 6, 7, 8]], ["Sans", [9, 10, 11, 12, 13, 14, 15, 16, 17]],
  ["Rounded", [21, 22, 23]], ["Display", [18, 19, 20]], ["Mono", [24, 25, 26]], ["Script", [27, 28, 29]],
];

export function PersX({ name, pal, shape, brief, taste, baseKey, baseHex, onSave, onBack, track }: {
  name: string; pal: Palette; shape: LogoShape; brief: string; taste: { type?: string; shape?: string };
  baseKey: string; baseHex?: string;
  onSave: (key: string, hex?: string) => void; onBack: () => void;
  track: (ev: string, p?: Record<string, unknown>) => void;
}) {
  const base = useMemo(() => parseX(baseKey, baseHex), [baseKey, baseHex]);
  const [d, setD] = useState<XDraft>(base);
  const [hist, setHist] = useState<XDraft[]>([]);
  const [allSyms, setAllSyms] = useState(false);
  const [allFonts, setAllFonts] = useState(false);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const set = (nx: Partial<XDraft>, control: string) => { setHist((h) => [...h.slice(-20), d]); setD({ ...d, ...nx }); track("logo_edit", { control }); };

  const pool = useMemo(() => symbolPool(name, brief, taste), [name, brief, taste]);
  const syms = allSyms ? pool : pool.slice(0, 15);
  const famFonts = useMemo(() => {
    const own = TYPE_FONTS[taste.type || ""] || TYPE_FONTS["Clean sans"];
    return [...new Set([...own, ...(TYPE_FAMILY[taste.type || ""] || [])])].slice(0, 9);
  }, [taste.type]);
  const fonts = allFonts ? FONT_GROUPS.flatMap(([, l]) => l) : [...new Set([d.font, ...famFonts])];
  ensureFonts(fonts.map((i) => ({ family: X_FONTS[i].f, weight: X_FONTS[i].w })));

  const key = keyOfX(d);
  const custom = d.hex ? { symbol: "none" as const, layout: "side" as const, accentHex: d.hex } : undefined;
  const svg = (variant: "light" | "night" | "dawn" | "icon", h: number, k = key) => logoSvg(k, name, pal, { variant, height: h, shape, custom });
  const changes = (["lay", "sym", "font", "cs", "size", "hex"] as const).filter((k) => (d as any)[k] !== (base as any)[k]).length;
  const noSym = d.lay === "word" || d.lay === "mono";
  const iconKey = `x:icon:${d.sym === "none" ? "none" : d.sym}:${d.font}:${d.cs}`;

  const doAsk = async () => {
    const q = ask.trim();
    if (!q || busy) return;
    setBusy(true); setNote("");
    track("logo_edit", { control: "ask" });
    const r = await logoTweakX({
      ask: q,
      current: { layout: d.lay, symbol: d.sym, font: X_FONTS[d.font].f, case: d.cs, colour: d.hex || pal.dawn, size: d.size },
      layouts: LAYOUTS.map(([k]) => k), symbols: Object.keys(X_SYMS), fonts: X_FONTS.map((f) => f.f),
    });
    setBusy(false);
    if (!r) { setNote("Couldn't do that just now. Try again, or use the controls."); return; }
    const fi = X_FONTS.findIndex((f) => f.f.toLowerCase() === String(r.font || "").toLowerCase());
    const nx: XDraft = {
      lay: LAYOUTS.some(([k]) => k === r.layout) ? String(r.layout) : d.lay,
      sym: r.symbol === "none" || X_SYMS[String(r.symbol)] ? String(r.symbol) : d.sym,
      font: fi >= 0 ? fi : d.font,
      cs: ["n", "u", "l"].includes(String(r.case)) ? String(r.case) : d.cs,
      size: Math.min(1.35, Math.max(0.65, Number(r.size) || d.size)),
      hex: /^#[0-9a-fA-F]{6}$/.test(String(r.colour)) && String(r.colour).toLowerCase() !== (d.hex || pal.dawn).toLowerCase() ? String(r.colour) : d.hex,
    };
    if (nx.sym === "none" && !["word", "mono"].includes(nx.lay)) nx.lay = "word";
    setHist((h) => [...h.slice(-20), d]); setD(nx); setAsk("");
    setNote(r.note ? `✓ ${String(r.note)}` : "✓ Done");
  };

  return (
    <>
      <div className="wr-stage" style={{ paddingTop: 18 }}>
        <div className="wr-lwrap wr-pers px">
          <div className="pl">
            <div className="phead">
              <p className="wr-kicker" style={{ margin: 0 }}>Your logo</p>
              {changes > 0 && <span className="edits">Edited · {changes} change{changes > 1 ? "s" : ""}</span>}
            </div>
            <div className="hero" dangerouslySetInnerHTML={{ __html: svg("light", 150) }} />
            <div className="minis">
              <figure><span className="m night" dangerouslySetInnerHTML={{ __html: svg("night", 40) }} /><figcaption>On dark</figcaption></figure>
              <figure><span className="m dawn" dangerouslySetInnerHTML={{ __html: svg("dawn", 40) }} /><figcaption>On your gradient</figcaption></figure>
              <figure><span className="m icon" dangerouslySetInnerHTML={{ __html: svg("icon", 52, iconKey) }} /><figcaption>App icon</figcaption></figure>
            </div>
          </div>
          <div className="pr">
            <p className="plab">Layout</p>
            <div className="seg">
              {LAYOUTS.map(([k, l]) => (
                <button key={k} className={d.lay === k ? "on" : ""} onClick={() => set({ lay: k, sym: k === "word" || k === "mono" ? d.sym : d.sym === "none" ? pool[0] : d.sym }, "layout")}>{l}</button>
              ))}
            </div>

            {!noSym && (
              <>
                <div className="plabrow"><p className="plab">Symbol</p><span className="pmini mono">{X_SYMS[d.sym]?.label || "None"}</span></div>
                <div className="symgrid sx">
                  {syms.map((k) => (
                    <button key={k} className={d.sym === k ? "on" : ""} title={X_SYMS[k].label} onClick={() => set({ sym: k }, "symbol")}
                      dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 40 40" width="26" height="26">${X_SYMS[k].draw(20, 20, 15, d.sym === k ? "#000" : "currentColor", d.sym === k ? "#fff" : "#111")}</svg>` }} />
                  ))}
                </div>
                <button className="pmini more" onClick={() => setAllSyms(!allSyms)}>{allSyms ? "Show fewer" : `Show all ${pool.length} symbols`}</button>
                <div className="plabrow"><p className="plab">Symbol size</p><span className="pmini mono">{Math.round(d.size * 100)}%</span></div>
                <input className="range" type="range" min={0.65} max={1.35} step={0.05} value={d.size} onChange={(e) => setD({ ...d, size: Number(e.target.value) })} onMouseUp={() => track("logo_edit", { control: "size" })} onTouchEnd={() => track("logo_edit", { control: "size" })} />
              </>
            )}

            <div className="plabrow"><p className="plab">Typeface</p><span className="pmini mono">{X_FONTS[d.font].f}</span></div>
            <div className="fontgrid">
              {fonts.map((i) => (
                <button key={i} className={d.font === i ? "on" : ""} onClick={() => set({ font: i, cs: X_FONTS[i].caps ? "u" : d.cs === "u" && X_FONTS[d.font].caps ? "n" : d.cs }, "font")}>
                  <span style={{ fontFamily: `'${X_FONTS[i].f}', var(--sans)`, fontWeight: X_FONTS[i].w }}>{d.cs === "u" || X_FONTS[i].caps ? name.toUpperCase() : d.cs === "l" ? name.toLowerCase() : name}</span>
                  <em>{X_FONTS[i].f}</em>
                </button>
              ))}
            </div>
            <div className="fontrow">
              <button className="pmini more" onClick={() => setAllFonts(!allFonts)}>{allFonts ? "Only my style" : "Show all 30 fonts"}</button>
              <span className="seg sm">
                {([["n", "Aa"], ["u", "AA"], ["l", "aa"]] as const).map(([k, l]) => (
                  <button key={k} className={d.cs === k ? "on" : ""} onClick={() => set({ cs: k }, "case")}>{l}</button>
                ))}
              </span>
            </div>

            <p className="plab">Colour</p>
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
                    <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(d.hex || "") ? d.hex : "#ff4f1a"} onChange={(e) => setD({ ...d, hex: e.target.value })} />
                  </label>
                );
              })()}
            </div>

            <p className="plab">Or just ask</p>
            <form className="ask" onSubmit={(e) => { e.preventDefault(); void doAsk(); }}>
              <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="e.g. more premium, in green, no symbol" />
              <button type="submit" disabled={busy}>{busy ? "…" : "↑"}</button>
            </form>
            {note && <p className="asknote">{note}</p>}
          </div>
        </div>
      </div>
      <div className="wr-foot col persfoot" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 280 }} onClick={() => { track("logo_saved", { changes, key }); onSave(key, d.hex); }}>Save my logo ✓</button>
        <span className="urow">
          <button className="wr-link" onClick={onBack}>← Back</button>
          {hist.length > 0 && <button className="wr-link" onClick={() => { setD(hist[hist.length - 1]); setHist(hist.slice(0, -1)); }}>↶ Undo</button>}
          {changes > 0 && <button className="wr-link" onClick={() => { setHist((h) => [...h, d]); setD(base); }}>Back to my original</button>}
        </span>
      </div>
    </>
  );
}

export const layoutTitle = (lay: string) => LAYOUT_TITLE[lay] || "Logo";
