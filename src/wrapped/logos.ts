// The logo engine: nine concepts drawn as parameterized SVG from the chosen name
// and its brand palette. No images, no AI renders: every mark is a template the
// name and colours flow into, so it exports as clean, scalable SVG.

export interface Palette { dawn: string; haze: string; nova: string; night: string }
export const DEFAULT_PALETTE: Palette = { dawn: "#FF9E7A", haze: "#C9B6FF", nova: "#7C9CFF", night: "#0F0D24" };

export function toPalette(swatches?: { name: string; hex: string }[] | null): Palette {
  const p = { ...DEFAULT_PALETTE };
  if (Array.isArray(swatches) && swatches.length >= 4) {
    p.dawn = swatches[0].hex || p.dawn;
    p.haze = swatches[1].hex || p.haze;
    p.nova = swatches[2].hex || p.nova;
    p.night = swatches[3].hex || p.night;
  }
  return p;
}

export type LogoVariant = "light" | "night" | "dawn" | "mono" | "icon" | "tile";
export type Accent = "dawn" | "haze" | "nova";
export interface LogoConcept { key: string; title: string; accent: Accent }

const BASE: { key: string; title: string }[] = [
  { key: "sunrise", title: "Sunrise" },
  { key: "airy", title: "Airy" },
  { key: "monogram", title: "Monogram" },
  { key: "star", title: "Nova star" },
  { key: "horizon", title: "Horizon" },
  { key: "appicon", title: "App icon" },
  { key: "dawn", title: "Dawn gradient" },
  { key: "halo", title: "Halo" },
  { key: "firstlight", title: "First light" },
];
const ACCENTS: Accent[] = ["dawn", "haze", "nova"];

// Nine concepts; "Nine more" bumps the seed, which rotates each concept's accent
// colour so every round genuinely reads differently.
export function logoConcepts(seed = 0): LogoConcept[] {
  return BASE.map((b, i) => ({ ...b, accent: ACCENTS[(i + seed) % ACCENTS.length] }));
}

export function whyItWorks(key: string, name: string, concept: string): string {
  const map: Record<string, string> = {
    sunrise: `A half sun rising over the name: ${concept || "first light"}. Heavy, tight letters keep it confident and easy to read at any size.`,
    airy: `The name set light and wide, all lowercase: room to breathe. It reads calm and modern, and scales beautifully small.`,
    monogram: `The single ${(name[0] || "A").toUpperCase()} carries the whole brand: instantly recognisable as an avatar, a favicon, a stamp.`,
    star: `A four-point star beside the name: the moment something new becomes visible. Simple enough to live at any size.`,
    horizon: `The name in capitals over a thin horizon line: steady, assured, built to last. It reads like a masthead.`,
    appicon: `The name reduced to its first letter and a period: made for the home screen, the tab bar, the places brands actually live.`,
    dawn: `The wordmark carried by the brand gradient: colour does the talking, so the letters stay quiet and sure.`,
    halo: `A thin ring floating over the name: light with nothing extra. Understated, and unmistakably yours.`,
    firstlight: `The sun rises inside the name itself, replacing its ${midVowel(name).ch || "o"}: the story of the brand told in one glyph.`,
  };
  return map[key] || map.sunrise;
}

/* ── SVG builder ── */
const FONT = `-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function midVowel(name: string): { ch: string; i: number } {
  const lower = (name || "").toLowerCase();
  for (const v of ["o", "a", "e", "u"]) {
    const i = lower.indexOf(v, 1);
    if (i > 0 && i < lower.length - 1) return { ch: v, i };
  }
  return { ch: "", i: -1 };
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

// Rough width of a wordmark at font-size fs and weight ~800.
const wordW = (text: string, fs: number, spacing = 0) => Math.max(fs, text.length * fs * 0.60 + text.length * spacing);

export function logoSvg(key: string, rawName: string, pal: Palette, opts: { variant?: LogoVariant; accent?: keyof Palette; height?: number } = {}): string {
  const variant = opts.variant || "light";
  const accent = pal[opts.accent || "dawn"];
  const name = cap((rawName || "Name").trim());
  const isDark = variant === "night" || variant === "tile";
  const fg = variant === "mono" ? pal.night : isDark ? "#ffffff" : pal.night;
  const motif = variant === "mono" ? fg : accent;
  const bg = variant === "night" ? pal.night : variant === "dawn" ? "url(#dg)" : "none";
  const H = opts.height || 220;

  const defs = `<defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.dawn}"/><stop offset=".5" stop-color="${pal.haze}"/><stop offset="1" stop-color="${pal.nova}"/></linearGradient></defs>`;

  const wrap = (w: number, h: number, inner: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${(w / h) * H}" height="${H}">${defs}` +
    (bg !== "none" ? `<rect width="${w}" height="${h}" fill="${bg}" rx="${variant === "dawn" ? 18 : 0}"/>` : "") +
    inner + `</svg>`;

  const word = (x: number, y: number, fs: number, o: { weight?: number; spacing?: number; color?: string; text?: string; anchor?: string } = {}) =>
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${fs}" font-weight="${o.weight ?? 800}" letter-spacing="${o.spacing ?? -fs * 0.03}" fill="${o.color || fg}" ${o.anchor ? `text-anchor="${o.anchor}"` : ""}>${esc(o.text ?? name)}</text>`;

  const fs = 44;
  const pad = 34;

  if (key === "appicon" || variant === "icon") {
    // Square app icon: rounded tile, first letter + a small rising sun.
    const S = 220;
    const letter = (name[0] || "A");
    const tileBg = variant === "dawn" ? "url(#dg)" : pal.night;
    const tileFg = "#ffffff";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${H}" height="${H}">${defs}` +
      `<rect width="${S}" height="${S}" rx="${S * 0.225}" fill="${tileBg}"/>` +
      `<path d="M ${S * 0.30} ${S * 0.72} A ${S * 0.20} ${S * 0.20} 0 0 1 ${S * 0.70} ${S * 0.72} Z" fill="${variant === "dawn" ? pal.night : accent}"/>` +
      `<text x="${S / 2}" y="${S * 0.60}" text-anchor="middle" font-family="${FONT}" font-size="${S * 0.42}" font-weight="800" fill="${variant === "dawn" ? pal.night : tileFg}">${esc(letter)}</text>` +
      `</svg>`;
  }

  switch (key) {
    case "sunrise": {
      const w = wordW(name, fs) + pad * 2;
      const cx = w / 2;
      return wrap(w, 190, [
        `<path d="M ${cx - 30} 78 A 30 30 0 0 1 ${cx + 30} 78 Z" fill="${motif}"/>`,
        `<line x1="${cx - 44}" y1="78" x2="${cx + 44}" y2="78" stroke="${fg}" stroke-width="4" stroke-linecap="round"/>`,
        word(cx, 138, fs, { anchor: "middle" }),
      ].join(""));
    }
    case "airy": {
      const t = name.toLowerCase();
      const sp = fs * 0.24;
      const w = wordW(t, fs * 0.86, sp) + pad * 2;
      return wrap(w, 130, word(w / 2, 82, fs * 0.86, { weight: 300, spacing: sp, text: t, anchor: "middle" }));
    }
    case "monogram": {
      const S = 170;
      return wrap(S, S, [
        `<rect x="14" y="14" width="${S - 28}" height="${S - 28}" rx="30" fill="none" stroke="${motif}" stroke-width="6"/>`,
        `<text x="${S / 2}" y="${S / 2 + 24}" text-anchor="middle" font-family="${FONT}" font-size="72" font-weight="800" fill="${fg}">${esc(name[0] || "A")}</text>`,
      ].join(""));
    }
    case "star": {
      const starW = 46;
      const w = starW + 14 + wordW(name, fs) + pad * 2;
      const sx = pad + starW / 2, sy = 62;
      const star = `<path d="M ${sx} ${sy - 22} C ${sx + 3} ${sy - 8} ${sx + 8} ${sy - 3} ${sx + 22} ${sy} C ${sx + 8} ${sy + 3} ${sx + 3} ${sy + 8} ${sx} ${sy + 22} C ${sx - 3} ${sy + 8} ${sx - 8} ${sy + 3} ${sx - 22} ${sy} C ${sx - 8} ${sy - 3} ${sx - 3} ${sy - 8} ${sx} ${sy - 22} Z" fill="${motif}"/>`;
      return wrap(w, 124, star + word(pad + starW + 14, sy + fs * 0.36, fs));
    }
    case "horizon": {
      const t = name.toUpperCase();
      const sp = fs * 0.16;
      const w = wordW(t, fs * 0.78, sp) + pad * 2;
      return wrap(w, 150, [
        word(w / 2, 78, fs * 0.78, { weight: 700, spacing: sp, text: t, anchor: "middle" }),
        `<line x1="${pad}" y1="104" x2="${w - pad}" y2="104" stroke="${motif}" stroke-width="4" stroke-linecap="round"/>`,
      ].join(""));
    }
    case "dawn": {
      const w = wordW(name, fs) + pad * 2.4;
      const inner = `<text x="${w / 2}" y="86" text-anchor="middle" font-family="${FONT}" font-size="${fs}" font-weight="800" letter-spacing="${-fs * 0.03}" fill="${pal.night}">${esc(name)}</text>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 140" width="${(w / 140) * H}" height="${H}">${defs}<rect width="${w}" height="140" rx="20" fill="url(#dg)"/>${inner}</svg>`;
    }
    case "halo": {
      const w = wordW(name.toLowerCase(), fs) + pad * 2;
      const cx = w / 2;
      return wrap(w, 180, [
        `<circle cx="${cx}" cy="52" r="20" fill="none" stroke="${motif}" stroke-width="5"/>`,
        word(cx, 132, fs, { weight: 700, text: name.toLowerCase(), anchor: "middle" }),
      ].join(""));
    }
    case "firstlight": {
      const mv = midVowel(name);
      const a = mv.i > 0 ? name.slice(0, mv.i) : name;
      const b = mv.i > 0 ? name.slice(mv.i + 1) : "";
      const r = fs * 0.30;
      const wA = wordW(a, fs), wB = wordW(b, fs);
      const w = wA + r * 2 + 12 + wB + pad * 2;
      let x = pad;
      const parts: string[] = [];
      parts.push(word(x, 96, fs, { text: a }));
      x += wA + 6;
      parts.push(`<path d="M ${x} 92 A ${r} ${r} 0 0 1 ${x + r * 2} 92 Z" fill="${motif}"/>`);
      x += r * 2 + 6;
      if (b) parts.push(word(x, 96, fs, { text: b }));
      return wrap(w, 150, parts.join(""));
    }
    default: { // plain wordmark
      const w = wordW(name, fs) + pad * 2;
      return wrap(w, 130, word(w / 2, 84, fs, { anchor: "middle" }));
    }
  }
}

/* ── raster export (SVG string → PNG bytes, drawn at 2x) ── */
export function svgToPng(svg: string, heightPx: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = heightPx / img.height;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const cx = canvas.getContext("2d");
      if (!cx) { URL.revokeObjectURL(url); reject(new Error("no canvas")); return; }
      cx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => {
        URL.revokeObjectURL(url);
        if (!b) { reject(new Error("no png")); return; }
        b.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("svg load failed")); };
    img.src = url;
  });
}
