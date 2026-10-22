// The paid kit's images (handoff 19 · 08·k socials kit, 08·m marketing kit):
// SVG built from the run's own logo + palette, previewed inline and exported
// as exact-size PNGs through the logo pack's rasterizer.
import { logoSvg, svgToPng, type Palette } from "./logos";
import { download, makeZip } from "./zip";

export interface KitLogo {
  key: string; name: string; pal: Palette;
  opts: Parameters<typeof logoSvg>[3];
}

const SANS = `'Inter Tight',-apple-system,'Helvetica Neue',Arial,sans-serif`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Drop a full <svg> (the logo) into a box of the parent canvas, aspect kept.
function place(svg: string, x: number, y: number, w: number, h: number): string {
  return svg.replace(/^<svg\b([^>]*)>/, (_m, attrs: string) =>
    `<svg${attrs.replace(/\s(width|height|x|y)="[^"]*"/g, "")} x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet">`);
}

// Greedy line wrap by character budget (SVG has no text flow).
function wrap(text: string, perLine: number, maxLines = 4): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if ((cur + " " + w).trim().length > perLine && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  return out.slice(0, maxLines);
}

const defs = (p: Palette, id: string) =>
  `<defs><linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.dawn}"/><stop offset=".5" stop-color="${p.haze}"/><stop offset="1" stop-color="${p.nova}"/></linearGradient>` +
  `<filter id="b${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="90"/></filter></defs>`;

const frame = (w: number, h: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;

/* ── socials kit ── */
export function avatarSvg(l: KitLogo): string {
  const S = 1080;
  const icon = logoSvg(l.key, l.name, l.pal, { ...l.opts, variant: "icon", height: S });
  return frame(S, S, `<defs><clipPath id="r"><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}"/></clipPath></defs><g clip-path="url(#r)">${place(icon, 0, 0, S, S)}</g>`);
}

export function bannerSvg(l: KitLogo, w: number, h: number, tagline: string): string {
  // The reversed logo, minus its own night backdrop: it sits on the banner's glow.
  const mark = logoSvg(l.key, l.name, l.pal, { ...l.opts, variant: "night", height: 220 })
    .replace(/<rect width="[^"]*" height="[^"]*" fill="[^"]*" rx="0"\/>/, "");
  const lw = Math.min(w * 0.42, h * 1.9);
  const t = tagline ? `<text x="${w / 2}" y="${h * 0.86}" text-anchor="middle" font-family="${SANS}" font-size="${Math.round(h * 0.075)}" fill="rgba(255,255,255,.82)">${esc(tagline)}</text>` : "";
  return frame(w, h, defs(l.pal, "bn") +
    `<rect width="${w}" height="${h}" fill="${l.pal.night}"/>` +
    `<circle cx="${w * 0.12}" cy="${h * 0.2}" r="${h * 0.7}" fill="${l.pal.dawn}" opacity=".55" filter="url(#bbn)"/>` +
    `<circle cx="${w * 0.88}" cy="${h * 0.9}" r="${h * 0.75}" fill="${l.pal.nova}" opacity=".5" filter="url(#bbn)"/>` +
    place(mark, (w - lw) / 2, h * 0.14, lw, h * 0.6) + t);
}

/* ── marketing kit: square posts and stories ── */
export function postSvg(l: KitLogo, i: number, title: string, w = 1080, h = 1080): string {
  const p = l.pal;
  const tall = h > w;
  const lines = wrap(title, tall ? 14 : 16, 4);
  const fs = tall ? 104 : 92;
  const baseY = h - (tall ? 260 : 120) - (lines.length - 1) * fs * 1.04;
  const text = (fill: string) => lines.map((ln, k) =>
    `<text x="80" y="${baseY + k * fs * 1.04}" font-family="${SANS}" font-weight="700" font-size="${fs}" letter-spacing="-2.5" fill="${fill}">${esc(ln)}</text>`).join("");
  if (i === 1) { // launch: the brand on its paper colour
    const mark = logoSvg(l.key, l.name, p, { ...l.opts, variant: "light", height: 200 });
    return frame(w, h, `<rect width="${w}" height="${h}" fill="#F7F5F1"/>${place(mark, 80, 80, 360, 140)}${text(p.night)}`);
  }
  if (i === 2) { // story: the full gradient
    return frame(w, h, defs(p, "st") + `<rect width="${w}" height="${h}" fill="url(#gst)"/>${text(p.night)}`);
  }
  // teaser: night, a rising glow
  return frame(w, h, defs(p, "tz") +
    `<rect width="${w}" height="${h}" fill="${p.night}"/>` +
    `<circle cx="${w * 0.3}" cy="${h * 0.32}" r="${w * 0.42}" fill="${p.dawn}" opacity=".7" filter="url(#btz)"/>` +
    `<circle cx="${w * 0.8}" cy="${h * 0.75}" r="${w * 0.36}" fill="${p.nova}" opacity=".6" filter="url(#btz)"/>` +
    text("#ffffff"));
}

/* ── exports ── */
export async function png(svg: string, h: number): Promise<Uint8Array> { return svgToPng(svg, h); }

export async function zipOf(files: { name: string; svg?: string; h?: number; text?: string }[], filename: string) {
  const enc = new TextEncoder();
  const out: { name: string; data: Uint8Array }[] = [];
  for (const f of files) {
    if (f.text != null) out.push({ name: f.name, data: enc.encode(f.text) });
    else if (f.svg) {
      try { out.push({ name: f.name, data: await svgToPng(f.svg, f.h || 1080) }); }
      catch { out.push({ name: f.name.replace(/\.png$/, ".svg"), data: enc.encode(f.svg) }); }
    }
  }
  download(makeZip(out), filename);
}
