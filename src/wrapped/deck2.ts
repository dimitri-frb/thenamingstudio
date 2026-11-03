// Handoff 27 · D + handoff 28 · the pitch deck, drafted from the brief, in 3
// themes (Night · Paper · Colour). Each slide is ONE scene of simple shapes
// and text boxes, drawn two ways: SVG (preview, PDF) and native PowerPoint
// shapes (.pptx, which Keynote and Google Slides open) — so every text box
// stays editable. Only Traction and The ask keep [fill-in] fields.
import { X_FONTS, X_SYMS, svgToPng, type Palette } from "./logos";
import { A, Dc, fit, measure, mix, on, roles } from "./families";
import { makeZip } from "./zip";
import type { WDeck2, WDeckSlide } from "./api";

export type Theme = 0 | 1 | 2;
export const THEMES = ["Night", "Paper", "Colour"] as const;
export interface DeckBrand { name: string; sym: string; font: number; pal: Palette; site: string; email: string; founder: string; brief: string; tagline: string; concept: string }
const W = 1600, H = 900, P = 90;
const UI = "Inter Tight", SERIF = "Newsreader", MONO = "JetBrains Mono";

/* ── content: the AI draft, an older draft, or a template from the brief ── */
export function deckContent(b: DeckBrand, ai?: WDeck2 | WDeckSlide[] | null): WDeck2 {
  if (ai && !Array.isArray(ai) && (ai as WDeck2).v === 2) return ai as WDeck2;
  const old = Array.isArray(ai) && ai.length >= 10 ? ai : null;
  const cols3 = (pts?: string[], dflt: string[] = []) => (pts?.length ? pts : dflt).slice(0, 3).map((t) => ({ t, d: "" }));
  const brief = (b.brief || "").replace(/\.$/, "");
  return {
    v: 2,
    // the tagline leads; the plain description supports it
    cover: b.tagline
      ? { head: b.tagline, sub: brief ? brief[0].toUpperCase() + brief.slice(1) + "." : "" }
      : { head: brief ? brief[0].toUpperCase() + brief.slice(1) + "." : `${b.name}.`, sub: "" },
    problem: { head: old?.[1].head || "What's broken today", cols: cols3(old?.[1].points, ["Who has the problem", "What it costs them", "Why today's options fail"]) },
    solution: { head: old?.[2].head || `${b.name}: ${b.concept || "the better way"}`, cols: cols3(old?.[2].points, ["The promise", "Done better", "How it feels"]) },
    who: { head: old?.[3].head || "Who it's for", segs: (old?.[3].points || ["First customers", "Next group", "Later"]).slice(0, 3).map((t, i) => ({ t, w: 3 - i })) },
    how: { head: old?.[4].head || `How ${b.name} works`, steps: (old?.[4].points || ["Step one", "Step two", "Step three"]).slice(0, 3).map((t) => t.replace(/^\d\s*·\s*/, "")) },
    model: { head: old?.[5].head || "How it makes money", cols: cols3(old?.[5].points, ["What we sell", "Who pays", "How we reach them"]) },
    traction: { head: old?.[6].head || "Early signs people want this.", lines: old?.[6].points?.slice(0, 3) || ["[number] people on the waiting list", "[number] customers so far", "First sale on [date]"] },
    team: { head: `Who's behind ${b.name}.`, founder: { name: b.founder || "Your name", role: "Founder" }, next: { role: "Hiring next", note: "Your first key hire" } },
    ask: { head: old?.[8].head || "What we're raising", sentence: "Raising [amount] to reach [number] customers by [year].", uses: ["Product", "Growth", "Team"] },
    thanks: { line: "Thank you." },
  };
}

/* ── scene primitives ── */
type Prim =
  | { k: "rect"; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; dash?: boolean; r?: number; op?: number }
  | { k: "ell"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; dash?: boolean }
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number }
  | { k: "text"; x: number; y: number; w: number; lines: string[]; size: number; weight: number; color: string; font: string; italic?: boolean; align?: "l" | "c" | "r"; lh: number; ls?: number }
  | { k: "rich"; x: number; y: number; w: number; text: string; size: number; color: string; field: string; lh: number; maxLines?: number }
  | { k: "mark"; sym: string; cx: number; cy: number; size: number; color: string; bg: string }
  | { k: "glow"; c1: string; c2: string };
export interface Scene { bg: string; prims: Prim[]; label: string }

const T = (x: number, y: number, w: number, text: string, size: number, color: string, o: { weight?: number; font?: string; italic?: boolean; align?: "l" | "c" | "r"; lh?: number; max?: number; ls?: number } = {}): Prim => {
  const font = o.font || UI, weight = o.weight || 400;
  const f = fit(text, w, font, weight, size, o.max || 3, !!o.italic);
  return { k: "text", x, y, w, lines: f.lines, size: f.size, weight, color, font, italic: o.italic, align: o.align, lh: f.size * (o.lh || 1.15), ls: o.ls };
};

export function deckScenes(theme: Theme, b: DeckBrand, c: WDeck2): Scene[] {
  const R = roles([b.pal.night, b.pal.nova, b.pal.dawn, b.pal.haze]);
  const bg = theme === 0 ? R.ink : theme === 1 ? R.paper : R.mid;
  const fg = on(bg);
  const acc = theme === 2 ? A(R.ink, bg) : A(R.mid, bg);
  const box = mix(bg, fg, theme === 1 ? 0.06 : 0.09);
  const muted = mix(fg, bg, 0.35);
  const lf = X_FONTS[b.font] || X_FONTS[9];
  const lock = (x: number, y: number, fs: number, align: "l" | "c" | "r" = "l"): Prim[] => {
    const name = lf.caps ? b.name.toUpperCase() : b.name;
    const tw = measure(name, lf.f, lf.w, fs), s = fs * 0.95, gap = fs * 0.32, wTot = s + gap + tw;
    const x0 = align === "r" ? x - wTot : align === "c" ? x - wTot / 2 : x;
    return [{ k: "mark", sym: b.sym, cx: x0 + s / 2, cy: y + fs * 0.5, size: s, color: theme === 2 ? fg : acc, bg },
      { k: "text", x: x0 + s + gap, y: y - fs * 0.05, w: tw + 20, lines: [name], size: fs, weight: lf.w, color: fg, font: lf.f, lh: fs * 1.1 }];
  };
  const top = (n: string, title: string): Prim[] => [T(P, 66, 700, `${n} · ${title}`, 26, acc, { font: MONO, max: 1 }), ...lock(W - P, 62, 30, "r")];
  const h2 = (t: string): Prim => T(P, 150, 1300, t, t.length <= 35 ? 76 : 60, fg, { weight: 600, max: 2, lh: 1.1, ls: -1.5 });
  const cols3 = (cols: { t: string; d: string }[]): Prim[] => {
    const cw = (W - 2 * P - 2 * 40) / 3, y = 560;
    return cols.slice(0, 3).flatMap((c2, i) => {
      const x = P + i * (cw + 40);
      return [{ k: "rect", x, y, w: cw, h: 4, fill: theme === 2 ? acc : Dc(R.mid, bg) } as Prim, T(x, y + 28, cw, c2.t, 34, fg, { weight: 700, max: 2 }), ...(c2.d ? [T(x, y + 120, cw, c2.d, 26, muted, { max: 3, lh: 1.3 })] : [])];
    });
  };
  const coverArt = (): Prim[] => theme === 0 ? [{ k: "glow", c1: Dc(R.mid, bg), c2: Dc(R.deep, bg) }]
    : [{ k: "mark", sym: b.sym, cx: W - 260, cy: H / 2 + 120, size: 760, color: theme === 1 ? Dc(R.mid, bg) : Dc(R.paper, bg), bg }];
  const S: Scene[] = [];
  // 01 cover
  const n = b.name.length;
  S.push({ bg, label: "Cover", prims: [...coverArt(), ...lock(P, 66, 34), T(W - P - 520, 70, 520, "Seed round · 2026", 24, muted, { font: MONO, align: "r", max: 1 }),
    T(P, 380, theme === 0 ? 1200 : 900, c.cover.head, n <= 8 ? 96 : 84, fg, { weight: 600, max: 3, lh: 1.02, ls: -3 }),
    T(P, 700, 1000, c.cover.sub, 36, mix(fg, bg, 0.2), { max: 2, lh: 1.3 })] });
  // 02 problem · 03 solution
  S.push({ bg, label: "Problem", prims: [...top("02", "Problem"), h2(c.problem.head), ...cols3(c.problem.cols)] });
  S.push({ bg, label: "Solution", prims: [...top("03", "Solution"), h2(c.solution.head), ...cols3(c.solution.cols)] });
  // 04 who it's for: three circles sized by importance
  const segC = [Dc(R.mid, bg), Dc(R.soft, bg), Dc(R.deep, bg)];
  let sx = P;
  const whoP: Prim[] = [];
  c.who.segs.slice(0, 3).forEach((s2, i) => {
    const r = [130, 105, 80][Math.max(0, 3 - Math.max(1, Math.min(3, s2.w)))] || 90;
    whoP.push({ k: "ell", cx: sx + r, cy: 640 - r + 130 - r * 0.0, r, fill: segC[i] });
    whoP.push(T(sx - 20, 790, r * 2 + 40, s2.t, 26, fg, { weight: 700, align: "c", max: 2 }));
    sx += r * 2 + 90;
  });
  S.push({ bg, label: "Who it's for", prims: [...top("04", "Who it's for"), h2(c.who.head), ...whoP] });
  // 05 how it works: three numbered boxes with arrows
  const bw = 400, bh = 190, gapH = (W - 2 * P - 3 * bw) / 2;
  S.push({ bg, label: "How it works", prims: [...top("05", "How it works"), h2(c.how.head), ...c.how.steps.slice(0, 3).flatMap((t, i) => {
    const x = P + i * (bw + gapH), y = 560;
    return [{ k: "rect", x, y, w: bw, h: bh, fill: box, r: 18 } as Prim, T(x + 30, y + 26, 200, `0${i + 1}`, 46, acc, { font: MONO, max: 1 }), T(x + 30, y + 100, bw - 60, t, t.length <= 24 ? 34 : 28, fg, { weight: 700, max: 2, lh: 1.2 }),
      ...(i < 2 ? [T(x + bw + gapH / 2 - 20, y + bh / 2 - 22, 40, "→", 36, muted, { align: "c", max: 1 })] : [])];
  })] });
  // 06 business model
  S.push({ bg, label: "Business model", prims: [...top("06", "Business model"), h2(c.model.head), ...cols3(c.model.cols)] });
  // 07 traction: fill-in lines
  S.push({ bg, label: "Traction", prims: [...top("07", "Traction"), h2(c.traction.head), ...c.traction.lines.slice(0, 3).map((t, i) => ({ k: "rich", x: P, y: 560 + i * 82, w: W - 2 * P, text: t, size: 34, color: fg, field: mix(fg, bg, 0.45), lh: 46, maxLines: 1 } as Prim))] });
  // 08 team
  const ini = (c.team.founder.name || b.founder || "?").split(/\s+/).map((w2) => w2[0]).join("").slice(0, 2).toUpperCase();
  S.push({ bg, label: "Team", prims: [...top("08", "Team"), h2(c.team.head),
    { k: "ell", cx: P + 70, cy: 700, r: 70, fill: Dc(R.mid, bg) }, T(P, 672, 140, ini, 48, on(Dc(R.mid, bg)), { weight: 700, align: "c", max: 1 }),
    T(P + 170, 650, 480, c.team.founder.name || b.founder || "Your name", 36, fg, { weight: 700, max: 1 }), T(P + 170, 706, 480, c.team.founder.role, 26, muted, { max: 2 }),
    { k: "ell", cx: 860, cy: 700, r: 66, stroke: muted, sw: 3, dash: true }, T(794, 668, 132, "+", 56, muted, { align: "c", max: 1 }),
    T(960, 650, 500, c.team.next.role, 36, fg, { weight: 700, max: 1 }), T(960, 706, 500, c.team.next.note, 26, muted, { max: 2 })] });
  // 09 the ask
  const uw = (W - 2 * P - 2 * 24) / 3;
  S.push({ bg, label: "The ask", prims: [...top("09", "The ask"), h2(c.ask.head),
    { k: "rich", x: P, y: 470, w: W - 2 * P, text: c.ask.sentence, size: 38, color: fg, field: mix(fg, bg, 0.45), lh: 58, maxLines: 2 },
    ...c.ask.uses.slice(0, 3).flatMap((u, i) => {
      const x = P + i * (uw + 24), y = 660;
      return [{ k: "rect", x, y, w: uw, h: 130, fill: box, r: 14 } as Prim, T(x + 24, y + 22, uw - 48, u, 26, mix(fg, bg, 0.15), { max: 1 }), { k: "rich", x: x + 24, y: y + 70, w: uw - 48, text: "[%]", size: 30, color: fg, field: mix(fg, bg, 0.45), lh: 40, maxLines: 1 } as Prim];
    })] });
  // 10 thank you
  S.push({ bg, label: "Thank you", prims: [...(theme === 0 ? [{ k: "glow", c1: Dc(R.mid, bg), c2: Dc(R.deep, bg) } as Prim] : []), ...lock(W / 2, 340, 64, "c"),
    T(200, 450, W - 400, c.thanks.line || "Thank you.", 44, fg, { font: SERIF, italic: true, align: "c", max: 1 }),
    T(200, 540, W - 400, [b.email, b.site].filter(Boolean).join("  ·  "), 26, muted, { font: MONO, align: "c", max: 1 })] });
  return S;
}

/* ── SVG renderer ── */
const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r1 = (v: number) => Math.round(v * 10) / 10;
const stackOf = (f: string) => `'${f}',${f === SERIF ? "Georgia,serif" : f === MONO ? "ui-monospace,monospace" : "-apple-system,Helvetica,Arial,sans-serif"}`;
// [fields] laid out as runs: words wrap, a bracket group never splits.
function richRuns(p: Extract<Prim, { k: "rich" }>) {
  const toks = p.text.match(/\[[^\]]+\]|\S+/g) || [];
  const sp = measure(" ", UI, 400, p.size);
  const lines: { t: string; f: boolean; x: number; w: number }[][] = [[]];
  let x = 0;
  for (const t of toks) {
    const f = t.startsWith("[");
    const w = f ? measure(t, MONO, 400, p.size * 0.72) + 28 : measure(t, UI, 400, p.size);
    if (x > 0 && x + w > p.w) { if (lines.length >= (p.maxLines || 3)) break; lines.push([]); x = 0; }
    lines[lines.length - 1].push({ t, f, x, w });
    x += w + sp;
  }
  return lines;
}
export function sceneSvg(s: Scene, width = W): string {
  const k = width / W;
  let out = "", defs = "";
  for (const p of s.prims) {
    if (p.k === "rect") out += `<rect x="${r1(p.x)}" y="${r1(p.y)}" width="${r1(p.w)}" height="${r1(p.h)}"${p.r ? ` rx="${p.r}"` : ""} fill="${p.fill || "none"}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.sw || 2}"${p.dash ? ` stroke-dasharray="8 6"` : ""}` : ""}${p.op != null ? ` opacity="${p.op}"` : ""}/>`;
    else if (p.k === "ell") out += `<circle cx="${r1(p.cx)}" cy="${r1(p.cy)}" r="${r1(p.r)}" fill="${p.fill || "none"}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.sw || 2}"${p.dash ? ` stroke-dasharray="8 6"` : ""}` : ""}/>`;
    else if (p.k === "line") out += `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${p.stroke}" stroke-width="${p.sw}"/>`;
    else if (p.k === "mark") out += (X_SYMS[p.sym] || X_SYMS.rise).draw(p.cx, p.cy, p.size / 2, p.color, p.bg);
    else if (p.k === "glow") {
      defs += `<radialGradient id="g1" cx="18%" cy="30%" r="55%"><stop offset="0" stop-color="${p.c1}" stop-opacity=".55"/><stop offset="1" stop-color="${p.c1}" stop-opacity="0"/></radialGradient><radialGradient id="g2" cx="88%" cy="78%" r="55%"><stop offset="0" stop-color="${p.c2}" stop-opacity=".55"/><stop offset="1" stop-color="${p.c2}" stop-opacity="0"/></radialGradient>`;
      out += `<rect width="${W}" height="${H}" fill="url(#g1)"/><rect width="${W}" height="${H}" fill="url(#g2)"/>`;
    } else if (p.k === "text") {
      const anchor = p.align === "c" ? "middle" : p.align === "r" ? "end" : "start";
      const x = p.align === "c" ? p.x + p.w / 2 : p.align === "r" ? p.x + p.w : p.x;
      p.lines.forEach((l, i) => { out += `<text x="${r1(x)}" y="${r1(p.y + p.size * 0.82 + i * p.lh)}" font-family="${stackOf(p.font)}" font-size="${r1(p.size)}" font-weight="${p.weight}"${p.italic ? ` font-style="italic"` : ""}${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}${p.ls ? ` letter-spacing="${p.ls}"` : ""} fill="${p.color}">${esc(l)}</text>`; });
    } else if (p.k === "rich") {
      richRuns(p).forEach((ln, i) => {
        const yb = p.y + p.size * 0.82 + i * p.lh;
        for (const r of ln) {
          if (r.f) out += `<rect x="${r1(p.x + r.x)}" y="${r1(yb - p.size * 0.78)}" width="${r1(r.w)}" height="${r1(p.size * 1.05)}" rx="8" fill="none" stroke="${p.field}" stroke-width="2.5" stroke-dasharray="7 5"/><text x="${r1(p.x + r.x + 14)}" y="${r1(yb - p.size * 0.08)}" font-family="${stackOf(MONO)}" font-size="${r1(p.size * 0.72)}" fill="${p.color}">${esc(r.t)}</text>`;
          else out += `<text x="${r1(p.x + r.x)}" y="${r1(yb)}" font-family="${stackOf(UI)}" font-size="${p.size}" fill="${p.color}">${esc(r.t)}</text>`;
        }
      });
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${r1(W * k)}" height="${r1(H * k)}">${defs ? `<defs>${defs}</defs>` : ""}<rect width="${W}" height="${H}" fill="${s.bg}"/>${out}</svg>`;
}

/* ── PPTX renderer: native shapes and text boxes; glow and marks as images ── */
const EMU = 7620; // per px (12192000 EMU / 1600 px)
const PT = 0.6;   // px → pt (13.333 in / 1600 px × 72)
const hx = (c: string) => c.replace("#", "").slice(0, 6).toUpperCase();
const xe = (s: string) => esc(s).replace(/"/g, "&quot;");
export async function deckPptx2(scenes: Scene[], title: string): Promise<Blob> {
  const enc = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [];
  const add = (n: string, x: string) => files.push({ name: n, data: enc.encode(x) });
  let media = 0;
  const glowPng = new Map<string, string>();
  for (let si = 0; si < scenes.length; si++) {
    const s = scenes[si];
    let id = 2, shapes = "";
    const rels: string[] = [`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`];
    const pic = async (svg: string, x: number, y: number, w: number, h: number, pxH: number, name: string) => {
      const png = await svgToPng(svg, pxH);
      const mn = `image${++media}.png`;
      files.push({ name: `ppt/media/${mn}`, data: png });
      const rid = `rId${rels.length + 1}`;
      rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mn}"/>`);
      shapes += `<p:pic><p:nvPicPr><p:cNvPr id="${id++}" name="${name}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${Math.round(x * EMU)}" y="${Math.round(y * EMU)}"/><a:ext cx="${Math.round(w * EMU)}" cy="${Math.round(h * EMU)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
    };
    const geo = (prst: string, x: number, y: number, w: number, h: number, fill?: string, stroke?: string, sw = 2, dash = false) =>
      `<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="Shape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${Math.round(x * EMU)}" y="${Math.round(y * EMU)}"/><a:ext cx="${Math.round(Math.max(1, w) * EMU)}" cy="${Math.round(Math.max(1, h) * EMU)}"/></a:xfrm><a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${hx(fill)}"/></a:solidFill>` : "<a:noFill/>"}${stroke ? `<a:ln w="${Math.round(sw * EMU)}"><a:solidFill><a:srgbClr val="${hx(stroke)}"/></a:solidFill>${dash ? `<a:prstDash val="dash"/>` : ""}</a:ln>` : "<a:ln><a:noFill/></a:ln>"}</p:spPr></p:sp>`;
    const tbox = (x: number, y: number, w: number, h: number, paras: string, anchorB = false) =>
      `<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${Math.round(x * EMU)}" y="${Math.round(y * EMU)}"/><a:ext cx="${Math.round(w * EMU)}" cy="${Math.round(h * EMU)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"${anchorB ? ` anchor="b"` : ""}><a:noAutofit/></a:bodyPr><a:lstStyle/>${paras}</p:txBody></p:sp>`;
    const run = (t: string, size: number, color: string, font: string, bold = false, italic = false) =>
      `<a:r><a:rPr lang="en-GB" sz="${Math.round(size * PT * 100)}" b="${bold ? 1 : 0}" i="${italic ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${hx(color)}"/></a:solidFill><a:latin typeface="${xe(font)}"/></a:rPr><a:t>${xe(t)}</a:t></a:r>`;
    for (const p of s.prims) {
      if (p.k === "rect") shapes += geo(p.r ? "roundRect" : "rect", p.x, p.y, p.w, p.h, p.fill, p.stroke, p.sw, p.dash);
      else if (p.k === "ell") shapes += geo("ellipse", p.cx - p.r, p.cy - p.r, p.r * 2, p.r * 2, p.fill, p.stroke, p.sw, p.dash);
      else if (p.k === "line") shapes += geo("line", Math.min(p.x1, p.x2), Math.min(p.y1, p.y2), Math.abs(p.x2 - p.x1), Math.abs(p.y2 - p.y1), undefined, p.stroke, p.sw);
      else if (p.k === "mark") {
        const sz = p.size * 1.1;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${p.cx - sz / 2} ${p.cy - sz / 2} ${sz} ${sz}" width="${sz}" height="${sz}">${(X_SYMS[p.sym] || X_SYMS.rise).draw(p.cx, p.cy, p.size / 2, p.color, p.bg)}</svg>`;
        // big decorative marks hang off the slide: crop them to the slide in the picture itself
        const x0 = Math.max(0, p.cx - sz / 2), y0 = Math.max(0, p.cy - sz / 2), x1 = Math.min(W, p.cx + sz / 2), y1 = Math.min(H, p.cy + sz / 2);
        const crop = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" width="${x1 - x0}" height="${y1 - y0}">${(X_SYMS[p.sym] || X_SYMS.rise).draw(p.cx, p.cy, p.size / 2, p.color, p.bg)}</svg>`;
        await pic(x0 === p.cx - sz / 2 && x1 === p.cx + sz / 2 && y1 === p.cy + sz / 2 && y0 === p.cy - sz / 2 ? svg : crop, x0, y0, x1 - x0, y1 - y0, Math.min(1200, Math.max(64, (y1 - y0) * 2)), "Mark");
      } else if (p.k === "glow") {
        const key = p.c1 + p.c2;
        if (!glowPng.has(key)) glowPng.set(key, "");
        const g = sceneSvg({ bg: s.bg, prims: [p], label: "" }).replace(`<rect width="${W}" height="${H}" fill="${s.bg}"/>`, "");
        await pic(g, 0, 0, W, H, 900, "Glow");
      } else if (p.k === "text") {
        const algn = p.align === "c" ? "ctr" : p.align === "r" ? "r" : "l";
        const paras = p.lines.map((l) => `<a:p><a:pPr algn="${algn}"><a:lnSpc><a:spcPts val="${Math.round(p.lh * PT * 100)}"/></a:lnSpc></a:pPr>${run(l, p.size, p.color, p.font, p.weight >= 600, !!p.italic)}</a:p>`).join("");
        shapes += tbox(p.x, p.y, p.w, p.lines.length * p.lh + p.size * 0.3, paras);
      } else if (p.k === "rich") {
        const lines = richRuns(p);
        const paras = lines.map((ln) => `<a:p><a:lnSpc><a:spcPts val="${Math.round(p.lh * PT * 100)}"/></a:lnSpc>${ln.map((r, i) => (r.f ? run(r.t, p.size * 0.8, p.field, MONO) : run(r.t, p.size, p.color, UI)) + (i < ln.length - 1 ? run(" ", p.size, p.color, UI) : "")).join("")}</a:p>`).join("");
        shapes += tbox(p.x, p.y, p.w, lines.length * p.lh + p.size * 0.4, paras.replace(/<a:p><a:lnSpc>/g, "<a:p><a:pPr><a:lnSpc>").replace(/<\/a:lnSpc>/g, "</a:lnSpc></a:pPr>"));
      }
    }
    add(`ppt/slides/slide${si + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${hx(s.bg)}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
    add(`ppt/slides/_rels/slide${si + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`);
  }
  const n = scenes.length;
  const emptyTree = `<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>`;
  const NS = `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"`;
  const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  add("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${Array.from({ length: n }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`);
  add("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`);
  add("ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${Array.from({ length: n }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join("")}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
  add("ppt/_rels/presentation.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="${REL}/theme" Target="theme/theme1.xml"/>${Array.from({ length: n }, (_, i) => `<Relationship Id="rId${i + 3}" Type="${REL}/slide" Target="slides/slide${i + 1}.xml"/>`).join("")}</Relationships>`);
  add("ppt/slideMasters/slideMaster1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>${emptyTree}</p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`);
  add("ppt/slideMasters/_rels/slideMaster1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${REL}/theme" Target="../theme/theme1.xml"/></Relationships>`);
  add("ppt/slideLayouts/slideLayout1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank">${emptyTree}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
  add("ppt/slideLayouts/_rels/slideLayout1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
  const fill3 = `<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>`;
  add("ppt/theme/theme1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${xe(title)}"><a:themeElements><a:clrScheme name="Brand"><a:dk1><a:srgbClr val="14121F"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="14121F"/></a:dk2><a:lt2><a:srgbClr val="F4F2EE"/></a:lt2><a:accent1><a:srgbClr val="FF4F1A"/></a:accent1><a:accent2><a:srgbClr val="7C9CFF"/></a:accent2><a:accent3><a:srgbClr val="C9B6FF"/></a:accent3><a:accent4><a:srgbClr val="FF9E7A"/></a:accent4><a:accent5><a:srgbClr val="3DDC84"/></a:accent5><a:accent6><a:srgbClr val="FFB02E"/></a:accent6><a:hlink><a:srgbClr val="7C9CFF"/></a:hlink><a:folHlink><a:srgbClr val="C9B6FF"/></a:folHlink></a:clrScheme><a:fontScheme name="Brand"><a:majorFont><a:latin typeface="Inter Tight"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Inter Tight"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Brand"><a:fillStyleLst>${fill3}${fill3}${fill3}</a:fillStyleLst><a:lnStyleLst><a:ln w="6350">${fill3}</a:ln><a:ln w="12700">${fill3}</a:ln><a:ln w="19050">${fill3}</a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${fill3}${fill3}${fill3}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`);
  return makeZip(files);
}
