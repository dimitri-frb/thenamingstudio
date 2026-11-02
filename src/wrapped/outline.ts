// Export-time text outlining: every <text> in an exported SVG becomes a <path>
// drawn from the real font file, so a downloaded logo (SVG, PNG, PDF, PPTX)
// looks exactly like it did on screen, on any device, in any app (Figma,
// Illustrator, Canva, a print shop) — no font install needed.
// Fonts come as TTF through the worker's /font relay (Google Fonts serves
// browsers woff2 only). Anything that can't be outlined is left as text.
import type { Font } from "opentype.js";
import { ENDPOINT } from "./api";

const fontCache = new Map<string, Promise<Font | null>>();
// System stacks (the v1 engine) have no file to fetch: use the flow's face.
const SYSTEM = /^(-apple-system|BlinkMacSystemFont|system-ui|'?SF Pro|'?Helvetica|Arial|sans-serif)/i;

function familyOf(ff: string): string {
  const first = (ff || "").split(",")[0].trim();
  if (!first || SYSTEM.test(first)) return "Inter Tight";
  const f = first.replace(/^['"]|['"]$/g, "");
  if (/^(Georgia|Times New Roman|serif)$/i.test(f)) return "Newsreader";
  if (/^(ui-monospace|SF Mono|Menlo|monospace)$/i.test(f)) return "JetBrains Mono";
  return f;
}

export function loadFont(family: string, weight: number, italic: boolean): Promise<Font | null> {
  const k = `${family}|${weight}|${italic ? 1 : 0}`;
  let p = fontCache.get(k);
  if (!p) {
    p = (async () => {
      try {
        const r = await fetch(`${ENDPOINT.replace(/\/$/, "")}/font?f=${encodeURIComponent(family)}&w=${weight}&i=${italic ? 1 : 0}`);
        if (!r.ok) return null;
        const buf = await r.arrayBuffer();
        const ot = (await import("opentype.js")).default;
        return ot.parse(buf);
      } catch { return null; }
    })();
    fontCache.set(k, p);
  }
  return p;
}

const inh = (el: Element, a: string): string | null => {
  for (let n: Element | null = el; n && n.nodeType === 1; n = n.parentElement) {
    const v = n.getAttribute(a);
    if (v != null && v !== "") return v;
    const st = n.getAttribute("style") || "";
    const m = st.match(new RegExp(`(?:^|;)\\s*${a}\\s*:\\s*([^;]+)`));
    if (m) return m[1].trim();
  }
  return null;
};
const num = (v: string | null, d = 0) => { const n = parseFloat(v || ""); return Number.isFinite(n) ? n : d; };
const KEEP = ["fill", "fill-opacity", "opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-linejoin", "transform", "clip-path", "mask", "filter", "class", "id", "style"];

// Path data for one line of text, laid out like the browser does
// (kerning + letter-spacing after every glyph, text-anchor on the advance).
export function textPath(font: Font, text: string, x: number, y: number, size: number, spacing: number, anchor: string): string | null {
  const glyphs = font.stringToGlyphs(text);
  if (glyphs.some((g, i) => g.index === 0 && !/\s/.test(text[i] || ""))) return null; // a missing glyph: keep it as text
  const sc = size / font.unitsPerEm;
  const adv: number[] = [];
  let w = 0;
  glyphs.forEach((g, i) => {
    const kern = i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) * sc : 0;
    const a = (g.advanceWidth || 0) * sc + kern + spacing;
    adv.push(a); w += a;
  });
  let pen = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  let d = "";
  glyphs.forEach((g, i) => { d += g.getPath(pen, y, size).toPathData(2); pen += adv[i]; });
  return d || null;
}

export async function outlineSvg(svg: string): Promise<string> {
  if (!svg.includes("<text") || typeof DOMParser === "undefined") return svg;
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (doc.getElementsByTagName("parsererror").length) return svg;
    const texts = Array.from(doc.getElementsByTagName("text"));
    for (const t of texts) {
      if (t.getElementsByTagName("tspan").length) continue;
      const fam = familyOf(inh(t, "font-family") || "");
      const weight = Math.round(num(inh(t, "font-weight"), 400) / 100) * 100 || 400;
      const italic = (inh(t, "font-style") || "") === "italic";
      const font = await loadFont(fam, weight, italic);
      if (!font) continue;
      const size = num(inh(t, "font-size"), 16);
      const lsRaw = inh(t, "letter-spacing") || "0";
      const spacing = lsRaw.endsWith("em") ? num(lsRaw) * size : num(lsRaw);
      const d = textPath(font, t.textContent || "", num(t.getAttribute("x")), num(t.getAttribute("y")), size, spacing, inh(t, "text-anchor") || "start");
      if (!d) continue;
      const p = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      for (const a of KEEP) { const v = t.getAttribute(a); if (v != null) p.setAttribute(a, v); }
      if (!p.getAttribute("fill") && !/fill\s*:/.test(p.getAttribute("style") || "")) { const f = inh(t, "fill"); if (f) p.setAttribute("fill", f); }
      t.parentNode?.replaceChild(p, t);
    }
    return new XMLSerializer().serializeToString(doc.documentElement);
  } catch { return svg; }
}
