// Handoff 27 · the paid kit's four layout families (Calm & minimal · Bold &
// bright · Classic & elegant · Playful), built from data only: name, tagline,
// the 4 palette colours, the logo's own symbol and font, AI text.
// Port of design/kit-engine.js (section R): colours by role, WCAG contrast
// guard, text-length steps, long-name shrink, banner safe zone. Output is
// SVG (previewed inline, exported to PNG/PDF through the outliner).
import qrcode from "qrcode-generator";
import { X_FONTS, X_SYMS, ensureFonts } from "./logos";

/* ── colour roles + contrast guard (README R·1–R·3) ── */
const hex6 = (h: string) => { const x = (h || "#000000").replace("#", ""); return "#" + (x.length === 3 ? x.split("").map((c) => c + c).join("") : x.slice(0, 6)).toLowerCase(); };
export const lum = (h: string) => {
  const n = parseInt(hex6(h).slice(1), 16);
  const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};
export const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(hex6(h).slice(i, i + 2), 16));
  const X = p(a), Y = p(b);
  return "#" + X.map((x, i) => Math.round(x + (Y[i] - x) * t).toString(16).padStart(2, "0")).join("");
};
export const cr = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const DK = "#14121f";
/** Text colour: near-black or white, whichever contrasts more. */
export const on = (bg: string) => (cr(bg, DK) >= cr(bg, "#ffffff") ? DK : "#ffffff");
/** Accent text: ≥ 3:1, else pulled toward the text colour. */
export const A = (c: string, bg: string) => (cr(c, bg) >= 3 ? hex6(c) : mix(on(bg), c, 0.2));
/** Decoration: ≥ 1.5:1, else pulled toward text over the background. */
// A clearly different hue reads as a shape even at similar brightness
// (orange on lilac), so it passes too; same-hue pastels still get pulled.
const rgbDist = (a: string, b: string) => { const p = (h: string) => [1, 3, 5].map((i) => parseInt(hex6(h).slice(i, i + 2), 16)); const X = p(a), Y = p(b); return Math.hypot(X[0] - Y[0], X[1] - Y[1], X[2] - Y[2]); };
export const Dc = (c: string, bg: string) => (cr(c, bg) >= 1.5 || rgbDist(c, bg) >= 110 ? hex6(c) : mix(on(bg), bg, 0.68));
export interface Roles { ink: string; deep: string; mid: string; soft: string; paper: string }
export const roles = (pal: string[]): Roles => {
  const s = [...pal].map(hex6).sort((a, b) => lum(a) - lum(b));
  const [ink, deep, mid, soft] = s;
  return { ink, deep, mid, soft, paper: lum(soft) > 0.8 ? soft : mix(soft, "#ffffff", 0.85) };
};

/* ── families ── */
export type Fam = 0 | 1 | 2 | 3;
export const FAMS = ["Calm & minimal", "Bold & bright", "Classic & elegant", "Playful"] as const;
export const FAM_SHORT = ["Calm", "Bold", "Classic", "Playful"] as const;
/** The taste quiz picks the family (feeling first; "Soft & warm" → Classic for serif types). */
export function famFromTaste(t: { feeling?: string[]; type?: string }): Fam {
  const f = t.feeling || [];
  if (f.includes("Bold & bright")) return 1;
  if (f.includes("Playful")) return 3;
  if (f.includes("Calm & minimal")) return 0;
  return /serif|Script/i.test(t.type || "") ? 2 : 0;
}

export interface FamData {
  name: string; sym: string; font: number; pal: string[];
  tagline: string; person?: string; role?: string; email?: string; site?: string;
}
/** The data a family needs, from a v2 logo key + the palette. */
export function famData(key: string, name: string, pal: { dawn: string; haze: string; nova: string; night: string }, more: Partial<FamData> = {}): FamData {
  const [, lay, sym, f] = (key || "").split(":");
  const symOk = sym && X_SYMS[sym] && lay !== "mono" ? sym : sym && X_SYMS[sym] ? sym : "rise";
  return { name, sym: symOk, font: Number(f) || 9, pal: [pal.night, pal.nova, pal.dawn, pal.haze], tagline: "", ...more };
}

/* ── text: measured widths, wrapping, size steps ── */
const UI = "Inter Tight", SERIF = "Newsreader", MONO = "JetBrains Mono";
const stack = (fam: string) => `'${fam}',${fam === SERIF ? "Georgia,serif" : fam === MONO ? "ui-monospace,monospace" : "-apple-system,Helvetica,Arial,sans-serif"}`;
let ctx: CanvasRenderingContext2D | null = null;
export function measure(t: string, fam: string, weight: number, size: number, italic = false, spacing = 0): number {
  const est = t.length * size * (fam === MONO ? 0.6 : fam === SERIF ? 0.46 : 0.52) + spacing * t.length;
  try {
    if (typeof document === "undefined") return est;
    ctx = ctx || document.createElement("canvas").getContext("2d");
    if (!ctx) return est;
    ctx.font = `${italic ? "italic " : ""}${weight} ${size}px ${stack(fam)}`;
    return ctx.measureText(t).width + spacing * Math.max(0, t.length - 1);
  } catch { return est; }
}
export function wrapW(t: string, maxW: number, fam: string, weight: number, size: number, italic = false, spacing = 0): string[] {
  const words = (t || "").split(/\s+/).filter(Boolean);
  const out: string[] = []; let cur = "";
  for (const w of words) {
    const nx = cur ? cur + " " + w : w;
    if (cur && measure(nx, fam, weight, size, italic, spacing) > maxW) { out.push(cur); cur = w; } else cur = nx;
  }
  if (cur) out.push(cur);
  return out;
}
/** Wrap at the step size; never more than `max` lines: shrink, never cut. */
export function fit(t: string, maxW: number, fam: string, weight: number, size: number, max = 3, italic = false, spacing = 0): { size: number; lines: string[] } {
  let s = size;
  for (let k = 0; k < 14; k++) {
    const lines = wrapW(t, maxW, fam, weight, s, italic, spacing * (s / size));
    const widest = Math.max(0, ...lines.map((l) => measure(l, fam, weight, s, italic)));
    if (lines.length <= max && widest <= maxW * 1.02) return { size: s, lines };
    s = Math.round(s * 0.92);
  }
  return { size: s, lines: wrapW(t, maxW, fam, weight, s, italic) };
}
export const step = (n: number, b: number[]) => (n <= 24 ? b[0] : n <= 40 ? b[1] : n <= 55 ? b[2] : b[3]);
const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n1 = (v: number) => Math.round(v * 10) / 10;
type TOpt = { fam?: string; weight?: number; italic?: boolean; anchor?: "start" | "middle" | "end"; ls?: number; opacity?: number; upper?: boolean };
export function txt(lines: string[], x: number, y0: number, size: number, lh: number, fill: string, o: TOpt = {}): string {
  const fam = o.fam || UI;
  return lines.map((l, i) => `<text x="${n1(x)}" y="${n1(y0 + i * lh)}" font-family="${stack(fam)}" font-size="${n1(size)}" font-weight="${o.weight || 400}"${o.italic ? ` font-style="italic"` : ""}${o.anchor && o.anchor !== "start" ? ` text-anchor="${o.anchor}"` : ""}${o.ls ? ` letter-spacing="${n1(o.ls)}"` : ""}${o.opacity != null ? ` opacity="${o.opacity}"` : ""} fill="${fill}">${esc(o.upper ? l.toUpperCase() : l)}</text>`).join("");
}

/* ── the brand's own mark + lockup ── */
export function mark(sym: string, cx: number, cy: number, size: number, c: string, bg: string): string {
  const s = X_SYMS[sym] || X_SYMS.rise;
  return s.draw(cx, cy, size / 2, c, bg);
}
/** Symbol + name in the brand's logo font. y = optical centre line. Returns svg + width. */
export function lockup(d: FamData, x: number, y: number, fs0: number, fg: string, symC: string, bg: string, anchor: "start" | "middle" = "start"): { svg: string; w: number } {
  const f = X_FONTS[d.font] || X_FONTS[9];
  const fs = d.name.length > 12 ? Math.round(fs0 * 0.78) : fs0;
  const s = fs * 0.95, gap = fs * 0.32;
  const name = f.caps ? d.name.toUpperCase() : d.name;
  const tw = measure(name, f.f, f.w, fs, !!f.italic);
  const w = s + gap + tw;
  const x0 = anchor === "middle" ? x - w / 2 : x;
  return {
    w,
    svg: mark(d.sym, x0 + s / 2, y, s, symC, bg) +
      `<text x="${n1(x0 + s + gap)}" y="${n1(y + fs * 0.35)}" font-family="${stack(f.f)}" font-size="${n1(fs)}" font-weight="${f.w}"${f.italic ? ` font-style="italic"` : ""} letter-spacing="${n1(-fs * 0.02)}" fill="${fg}">${esc(name)}</text>`,
  };
}
const svgOf = (W: number, H: number, bg: string, inner: string, vb?: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb || `0 0 ${W} ${H}`}" width="${W}" height="${H}"><rect ${vb ? `x="-1000" y="-1000" width="${W + 2000}" height="${H + 2000}"` : `width="${W}" height="${H}"`} fill="${bg}"/>${inner}</svg>`;
const circ = (x: number, y: number, d: number, c: string) => `<circle cx="${n1(x + d / 2)}" cy="${n1(y + d / 2)}" r="${n1(d / 2)}" fill="${c}"/>`;

/* ═════ banners (LinkedIn 1584×396, X 1500×500) — text clear of the photo at 27% ═════ */
export function banner(f: Fam, d: FamData, W = 1584, H = 396): string {
  ensureFonts([{ family: X_FONTS[d.font]?.f || UI, weight: X_FONTS[d.font]?.w || 600 }, { family: SERIF, weight: 500 }]);
  const R = roles(d.pal), L = Math.round(W * 0.27), Rp = Math.round(W * 0.05), cw = W - L - Rp, t = d.tagline || d.name;
  const fs = Math.round(H * step(t.length, [0.2, 0.155, 0.125, 0.105]));
  if (f === 0) {
    const bg = R.paper, fg = on(bg), sc = Dc(R.mid, bg);
    const lk = lockup(d, L, H * 0.16 + H * 0.0375, Math.round(H * 0.075), fg, sc, bg);
    const ft = fit(t, cw, UI, 600, fs, 3);
    const lh = ft.size * 1.08;
    return svgOf(W, H, bg, mark(d.sym, L * 0.5, H * 0.5, H * 0.42, sc, bg) +
      `<rect x="${L - 44}" y="${H * 0.25}" width="2" height="${H * 0.5}" fill="${Dc(mix(fg, bg, 0.82), bg)}"/>` + lk.svg +
      txt(ft.lines, L, H * 0.84 - (ft.lines.length - 1) * lh - ft.size * 0.18, ft.size, lh, fg, { weight: 600, ls: -ft.size * 0.03 }));
  }
  if (f === 1) {
    const bg = R.mid, fg = on(bg), big = Dc(R.paper, bg);
    const ft = fit(t, cw * 0.66, UI, 800, Math.round(fs * 1.12), 3);
    return svgOf(W, H, bg, mark(d.sym, W - H * 0.62 + H * 0.05, H * 0.35 + H * 0.62, H * 1.25, big, bg) +
      txt(ft.lines, L, H * 0.14 + ft.size * 0.82, ft.size, ft.size, fg, { weight: 800, ls: -ft.size * 0.045 }) +
      lockup(d, L, H * 0.86 - H * 0.033, Math.round(H * 0.065), fg, fg, bg).svg);
  }
  if (f === 2) {
    const bg = R.ink, fg = on(bg), i = Math.round(H * 0.07);
    const ft = fit(t, cw, SERIF, 500, Math.round(fs * 0.92), 2, true);
    const lh = ft.size * 1.12, lockH = H * 0.075, gap = H * 0.07;
    const total = lockH + gap + ft.lines.length * lh;
    const top = (H - total) / 2;
    const cx = L + cw / 2;
    return svgOf(W, H, bg, `<rect x="${i}" y="${i}" width="${W - 2 * i}" height="${H - 2 * i}" fill="none" stroke="${fg}" stroke-opacity=".3" stroke-width="2"/>` +
      lockup(d, cx, top + lockH / 2, Math.round(H * 0.075), fg, A(R.mid, bg), bg, "middle").svg +
      txt(ft.lines, cx, top + lockH + gap + ft.size * 0.85, ft.size, lh, fg, { fam: SERIF, weight: 500, italic: true, anchor: "middle" }));
  }
  const bg = R.soft, fg = on(bg);
  const ft = fit(t, cw * 0.78, UI, 800, Math.round(fs * 1.02), 3);
  return svgOf(W, H, bg, circ(W - H * 0.95, -H * 0.35, H * 0.95, Dc(R.mid, bg)) + circ(L * 0.25, H * 0.55, H * 0.32, Dc(R.deep, bg)) + circ(L * 0.62, H * 0.18, H * 0.12, A(R.ink, bg)) +
    lockup(d, L, H * 0.14 + H * 0.03, Math.round(H * 0.06), fg, A(R.ink, bg), bg).svg +
    `<g transform="rotate(-2 ${L} ${H * 0.34})">` + txt(ft.lines, L, H * 0.34 + ft.size * 0.85, ft.size, ft.size * 1.05, fg, { weight: 800, ls: -ft.size * 0.035 }) + `</g>`);
}

/* ═════ launch posts (1080×1080) and stories (1080×1920) ═════ */
export function post(f: Fam, d: FamData, title: string, day: string, W = 1080, H = 1080): string {
  ensureFonts([{ family: X_FONTS[d.font]?.f || UI, weight: X_FONTS[d.font]?.w || 600 }, { family: SERIF, weight: 500 }]);
  const R = roles(d.pal), t = title || d.tagline, P = 84, story = H > W;
  const fs = step(t.length, [112, 92, 76, 64]);
  if (f === 0) {
    const bg = R.paper, fg = on(bg), sc = Dc(R.mid, bg);
    const ft = fit(t, W - 2 * P, UI, 600, fs, 3);
    const lh = ft.size * 1.05, last = H - P - ft.size * 0.25;
    const y0 = last - (ft.lines.length - 1) * lh;
    return svgOf(W, H, bg, mark(d.sym, W - P - 60, P + 60, 120, sc, bg) + lockup(d, P, P + 20, 40, fg, sc, bg).svg +
      `<rect x="${P}" y="${y0 - ft.size - 36}" width="90" height="6" fill="${fg}"/>` + txt(ft.lines, P, y0, ft.size, lh, fg, { weight: 600, ls: -ft.size * 0.035 }));
  }
  if (f === 1) {
    const bg = R.mid, fg = on(bg);
    const ft = fit(t, W - 2 * P - 60, UI, 800, Math.round(fs * 1.15), 4);
    const big = story ? 1100 : 860;
    return svgOf(W, H, bg, mark(d.sym, 380 + big / 2, (story ? H - 700 : 520) + big / 2, big, Dc(R.paper, bg), bg) +
      txt(ft.lines, P, P + ft.size * 0.82, ft.size, ft.size * 0.98, fg, { weight: 800, ls: -ft.size * 0.05 }) +
      lockup(d, P, H - P - 20, 36, fg, fg, bg).svg);
  }
  if (f === 2) {
    const bg = R.ink, fg = on(bg);
    const ft = fit(t, W - 240, SERIF, 500, Math.round(fs * 0.95), 4, true);
    const lh = ft.size * 1.12, mid = H / 2;
    return svgOf(W, H, bg, `<rect x="44" y="44" width="${W - 88}" height="${H - 88}" fill="none" stroke="${fg}" stroke-opacity=".3" stroke-width="3"/>` +
      txt([d.name], W / 2, 150, d.name.length > 12 ? 18 : 24, 0, A(R.mid, bg), { fam: MONO, anchor: "middle", ls: 7.5, upper: true }) +
      txt(ft.lines, W / 2, mid - ((ft.lines.length - 1) * lh) / 2 + ft.size * 0.3, ft.size, lh, fg, { fam: SERIF, weight: 500, italic: true, anchor: "middle" }) +
      mark(d.sym, W / 2, H - 160, 72, A(R.mid, bg), bg));
  }
  const bg = R.soft, fg = on(bg), pb = A(R.ink, bg);
  const ft = fit(t, W - 2 * P - 40, UI, 800, Math.round(fs * 1.02), 4);
  const pill = (day || "").trim();
  const pw = measure(pill, UI, 800, 30) + 52;
  return svgOf(W, H, bg, circ(600, -180, 640, Dc(R.mid, bg)) + circ(70, H - 220, 150, Dc(R.deep, bg)) + lockup(d, P, P + 18, 36, fg, pb, bg).svg +
    `<g transform="rotate(-3 ${P} ${story ? 560 : 300})">` + txt(ft.lines, P, (story ? 560 : 300) + ft.size * 0.85, ft.size, ft.size * 1.04, fg, { weight: 800, ls: -ft.size * 0.04 }) + `</g>` +
    (pill ? `<g transform="rotate(-6 ${W - P - pw / 2} ${H - P - 30})"><rect x="${W - P - pw}" y="${H - P - 60}" width="${pw}" height="60" rx="30" fill="${pb}"/>${txt([pill], W - P - pw / 2, H - P - 20, 30, 0, on(pb), { weight: 800, anchor: "middle" })}</g>` : ""));
}

/* ═════ business cards (850×550 = 85×55 mm; bleed 30 = 3 mm, marks beyond) ═════ */
export interface CardOpts { bleed?: boolean; marks?: boolean }
function cardWrap(bg: string, inner: string, o: CardOpts, W = 850, H = 550): string {
  const B = o.bleed ? 30 : 0, M = o.marks ? 30 : 0, off = B + M;
  const VW = W + off * 2, VH = H + off * 2;
  let marks = "";
  if (o.marks) {
    const k = `stroke="#000" stroke-width="1.5"`;
    for (const x of [off, off + W]) marks += `<line x1="${x - off}" y1="${-off}" x2="${x - off}" y2="${-off + M - 5}" ${k}/><line x1="${x - off}" y1="${H + off - M + 5}" x2="${x - off}" y2="${H + off}" ${k}/>`;
    for (const y of [off, off + H]) marks += `<line x1="${-off}" y1="${y - off}" x2="${-off + M - 5}" y2="${y - off}" ${k}/><line x1="${W + off - M + 5}" y1="${y - off}" x2="${W + off}" y2="${y - off}" ${k}/>`;
  }
  const mm = (v: number) => `${n1(v / 10)}mm`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-off} ${-off} ${VW} ${VH}" width="${o.bleed || o.marks ? mm(VW) : W}" height="${o.bleed || o.marks ? mm(VH) : H}">` +
    (o.marks ? `<rect x="${-off}" y="${-off}" width="${VW}" height="${VH}" fill="#fff"/>` : "") +
    `<rect x="${-B}" y="${-B}" width="${W + 2 * B}" height="${H + 2 * B}" fill="${bg}"/>` +
    (o.bleed ? `<clipPath id="cb"><rect x="${-B}" y="${-B}" width="${W + 2 * B}" height="${H + 2 * B}"/></clipPath><g clip-path="url(#cb)">${inner}</g>` : `<clipPath id="cb"><rect width="${W}" height="${H}"/></clipPath><g clip-path="url(#cb)">${inner}</g>`) +
    marks + `</svg>`;
}
const info = (d: FamData, x: number, yBottom: number, fg: string, anchor: "start" | "end" = "start") => {
  const person = d.person || "Your name", pn = person.length > 18 ? 28 : 34;
  const lines = [d.email, d.site].filter(Boolean) as string[];
  const lh = 32, yMail = yBottom - (lines.length - 1) * lh;
  const yRole = yMail - 44, yName = yRole - 34;
  return txt([person], x, yName, pn, 0, fg, { weight: 700, ls: -pn * 0.02, anchor }) +
    txt([d.role || "Founder"], x, yRole, 23, 0, fg, { opacity: 0.7, anchor }) +
    txt(lines, x, yMail, 20, lh, fg, { fam: MONO, opacity: 0.85, anchor });
};
export function cardFront(f: Fam, layout: "A" | "B", d: FamData, o: CardOpts = {}): string {
  ensureFonts([{ family: X_FONTS[d.font]?.f || UI, weight: X_FONTS[d.font]?.w || 600 }, { family: SERIF, weight: 500 }]);
  const R = roles(d.pal), W = 850, H = 550;
  const person = d.person || "Your name";
  if (f === 0) {
    const bg = R.paper, fg = on(bg), sc = Dc(R.mid, bg);
    if (layout === "A") return cardWrap(bg, lockup(d, 64, 84, 40, fg, sc, bg).svg + info(d, 64, H - 64, fg), o);
    return cardWrap(bg, lockup(d, 64, H / 2, 34, fg, sc, bg).svg + `<rect x="${W * 0.47}" y="${H * 0.28}" width="2" height="${H * 0.44}" fill="${Dc(mix(fg, bg, 0.75), bg)}"/>` + info(d, W * 0.47 + 36, H / 2 + 62, fg), o);
  }
  if (f === 1) {
    if (layout === "A") {
      const bg = R.mid, fg = on(bg);
      const nm = d.name.length > 12 ? 44 : 64;
      return cardWrap(bg, mark(d.sym, 470 + 250, (d.sym === "rise" ? 330 : 250) + 250, 500, Dc(R.paper, bg), bg) + txt([d.name], 64, 64 + nm * 0.8, nm, 0, fg, { fam: X_FONTS[d.font]?.f || UI, weight: 800, ls: -nm * 0.045 }) + info(d, 64, H - 64, fg), o);
    }
    const bg = R.deep, fg = on(bg);
    const pn = person.length > 18 ? 40 : 52;
    return cardWrap(bg, txt([person], 64, H / 2 - 4, pn, 0, fg, { weight: 800, ls: -pn * 0.03 }) + txt([d.email || ""], 64, H / 2 + 46, 22, 0, fg, { fam: MONO, opacity: 0.85 }), o);
  }
  if (f === 2) {
    if (layout === "A") {
      const bg = R.ink, fg = on(bg);
      const ps = person.length > 18 ? 38 : 46;
      return cardWrap(bg, `<rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="${fg}" stroke-opacity=".35" stroke-width="2"/>` +
        lockup(d, W / 2, H / 2 - 40, 30, fg, A(R.mid, bg), bg, "middle").svg +
        txt([`${person}, ${d.role || "Founder"}`], W / 2, H / 2 + 40, ps * 0.8, 0, fg, { fam: SERIF, italic: true, weight: 500, anchor: "middle" }), o);
    }
    const bg = R.paper, fg = on(bg), ink = A(R.ink, bg);
    const ps = person.length > 18 ? 44 : 54;
    return cardWrap(bg, `<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="${ink}" stroke-width="2"/>` +
      txt([person], W / 2, H / 2 + 6, ps, 0, fg, { fam: SERIF, weight: 500, anchor: "middle" }) +
      txt([`${d.role || "Founder"} · ${d.name}`], W / 2, H / 2 + 60, 18, 0, fg, { fam: MONO, anchor: "middle", ls: 3.6, upper: true, opacity: 0.75 }), o);
  }
  if (layout === "A") {
    const bg = R.soft, fg = on(bg), pb = A(R.ink, bg);
    const nm = d.name.length > 12 ? 34 : 48;
    const pw = measure(d.name, UI, 800, nm) + 48;
    return cardWrap(bg, circ(630, -90, 300, Dc(R.mid, bg)) + circ(W - 130, H - 130, 70, Dc(R.deep, bg)) +
      `<g transform="rotate(-4 ${64 + pw / 2} ${64 + nm * 0.6})"><rect x="64" y="64" width="${pw}" height="${nm * 1.3}" rx="${nm * 0.65}" fill="${pb}"/>${txt([d.name], 64 + pw / 2, 64 + nm * 0.95, nm, 0, on(pb), { weight: 800, anchor: "middle", ls: -nm * 0.04 })}</g>` +
      info(d, 64, H - 64, fg), o);
  }
  const bg = R.mid, fg = on(bg);
  return cardWrap(bg, circ(40, 400, 90, Dc(R.deep, bg)) + info(d, W - 64, 220, fg, "end"), o);
}
/** QR modules as one path (no fill gaps), quiet zone included. */
export function qrSvg(text: string, x: number, y: number, size: number, dark: string, light: string): string {
  const q = qrcode(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(), m = size / (n + 2);
  let dpath = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) dpath += `M${n1(x + (c + 1) * m)} ${n1(y + (r + 1) * m)}h${n1(m)}v${n1(m)}h${n1(-m)}z`;
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.06}" fill="${light}"/><path d="${dpath}" fill="${dark}" shape-rendering="crispEdges"/>`;
}
export function cardBack(f: Fam, d: FamData, withQr: boolean, o: CardOpts = {}): string {
  const R = roles(d.pal), W = 850, H = 550, site = (d.site || "").trim();
  const url = site ? (/^https?:/.test(site) ? site : `https://${site}`) : "";
  const qr = withQr && url;
  if (f === 0) {
    const bg = R.paper, fg = on(bg);
    if (!qr) return cardWrap(bg, lockup(d, W / 2, H / 2 - 10, 48, fg, Dc(R.mid, bg), bg, "middle").svg + txt([site], W / 2, H / 2 + 70, 22, 0, fg, { fam: MONO, anchor: "middle", opacity: 0.7 }), o);
    return cardWrap(bg, qrSvg(url, 120, 135, 280, DK, bg) + txt(["Scan to visit"], 450, 255, 24, 0, fg, { opacity: 0.6 }) + txt([site], 450, 300, 26, 0, fg, { fam: MONO, weight: 600 }), o);
  }
  if (f === 1) {
    const bg = R.ink, fg = on(bg);
    if (!qr) return cardWrap(bg, mark(d.sym, W / 2, H / 2 - 30, 160, Dc(R.mid, bg), bg) + txt([site || d.name], W / 2, H / 2 + 110, 38, 0, fg, { weight: 800, anchor: "middle" }), o);
    return cardWrap(bg, qrSvg(url, 90, 125, 300, DK, "#ffffff") + txt([site], 450, 290, site.length > 16 ? 30 : 38, 0, fg, { weight: 800 }), o);
  }
  if (f === 2) {
    const bg = R.ink, fg = on(bg);
    const fr = `<rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="${fg}" stroke-opacity=".35" stroke-width="2"/>`;
    if (!qr) return cardWrap(bg, fr + mark(d.sym, W / 2, H / 2 - 30, 90, A(R.mid, bg), bg) + txt([site || d.name], W / 2, H / 2 + 70, 34, 0, fg, { fam: SERIF, italic: true, anchor: "middle" }), o);
    return cardWrap(bg, fr + qrSvg(url, 120, 130, 290, DK, "#ffffff") + txt([site], 460, 290, site.length > 16 ? 30 : 36, 0, fg, { fam: SERIF, italic: true }), o);
  }
  const bg = R.soft, fg = on(bg), pb = A(R.ink, bg);
  if (!qr) return cardWrap(bg, circ(630, -90, 300, Dc(R.mid, bg)) + lockup(d, W / 2, H / 2, 52, fg, pb, bg, "middle").svg, o);
  return cardWrap(bg, qrSvg(url, 150, 120, 300, DK, "#ffffff") +
    `<g transform="rotate(-6 590 280)"><rect x="500" y="250" width="180" height="60" rx="30" fill="${pb}"/>${txt(["Scan me"], 590, 290, 26, 0, on(pb), { weight: 800, anchor: "middle" })}</g>`, o);
}

/* ═════ socials: profile picture (the mark on the family's ground) ═════ */
export function avatar(f: Fam, d: FamData, S = 400): string {
  const R = roles(d.pal);
  const bg = f === 0 ? R.paper : f === 1 ? R.mid : f === 2 ? R.ink : R.soft;
  const c = f === 0 ? Dc(R.mid, bg) : f === 1 ? Dc(R.paper, bg) : f === 2 ? A(R.mid, bg) : A(R.ink, bg);
  return svgOf(S, S, bg, mark(d.sym, S / 2, S / 2, S * 0.5, c, bg));
}
