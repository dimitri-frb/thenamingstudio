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
export type LogoFont = "bold" | "serif" | "light";
export type LogoShape = "round" | "sharp" | "organic" | "geometric";
export type Accent = "dawn" | "haze" | "nova";
export interface LogoConcept { key: string; title: string; accent: Accent; seed: number; font?: LogoFont; shape?: LogoShape }

// The Brand chapter's nine concepts (built from the taste picks).
export const BRAND_TILES: { key: string; title: string }[] = [
  { key: "sunrise", title: "Sunrise" },
  { key: "nightserif", title: "Night serif" },
  { key: "dawnsun", title: "Dawn sun" },
  { key: "appicon", title: "App icon" },
  { key: "sidebyside", title: "Side by side" },
  { key: "hazeitalic", title: "Haze italic" },
  { key: "outlinesun", title: "Outline sun" },
  { key: "risingdot", title: "Rising dot" },
  { key: "monogram", title: "Monogram" },
];

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

// Nine concepts; "Nine more" bumps the seed, which changes each concept's
// STRUCTURE and typography (motif placement, case, serif/sans, frame shape),
// not just the accent colour — every round genuinely reads differently.
export function logoConcepts(seed = 0): LogoConcept[] {
  return BASE.map((b, i) => ({ ...b, seed, accent: ACCENTS[(i + seed) % ACCENTS.length] }));
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
    nightserif: `${name} set in a confident serif, nothing else: literary, trusted, timeless. The name does all the talking.`,
    dawnsun: `A full sun rising behind the letters: the brand as ${concept || "first light"}, impossible to miss.`,
    sidebyside: `The sun and the name, side by side: a lockup that works in a header, a card, a sign.`,
    hazeitalic: `Lowercase italic serif: soft, human, a little literary. It reads like a signature.`,
    outlinesun: `The sun drawn as a single line: light, precise, modern. Strong at any size.`,
    risingdot: `One dot, lifting off the end of the name: quiet motion, easy to animate, unmistakably yours.`,
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

const SERIF = `'Newsreader',Georgia,'Times New Roman',serif`;

export function logoSvg(key: string, rawName: string, pal: Palette, opts: { variant?: LogoVariant; accent?: keyof Palette; height?: number; seed?: number; font?: LogoFont; shape?: LogoShape } = {}): string {
  const variant = opts.variant || "light";
  const accent = pal[opts.accent || "dawn"];
  const name = cap((rawName || "Name").trim());
  const shape: LogoShape = opts.shape || "round";
  const v = ((opts.seed || 0) % 3 + 3) % 3; // structural variant per round
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

  const word = (x: number, y: number, fs: number, o: { weight?: number; spacing?: number; color?: string; text?: string; anchor?: string; serif?: boolean; italic?: boolean } = {}) =>
    `<text x="${x}" y="${y}" font-family="${o.serif ? SERIF : FONT}" font-size="${fs}" font-weight="${o.weight ?? 800}" letter-spacing="${o.spacing ?? -fs * 0.03}" ${o.italic ? `font-style="italic"` : ""} fill="${o.color || fg}" ${o.anchor ? `text-anchor="${o.anchor}"` : ""}>${esc(o.text ?? name)}</text>`;

  // The wordmark voice rotates with the round (heavy sans → serif → light sans),
  // unless the founder picked a font explicitly on the logo page.
  const FACES: Record<LogoFont, { serif?: boolean; weight: number; wf: number }> = {
    bold: { weight: 800, wf: 0.60 }, serif: { serif: true, weight: 500, wf: 0.56 }, light: { weight: 400, wf: 0.58 },
  };
  const face = opts.font ? FACES[opts.font] : v === 1 ? FACES.serif : v === 2 ? FACES.light : FACES.bold;
  const wWord = (text: string, fs: number, spacing = 0) => Math.max(fs, text.length * fs * face.wf + text.length * spacing);

  const fs = 44;
  const pad = 34;
  // The founder's shape pick changes the motif language itself:
  // round = rising half-sun, sharp = peak, geometric = flat-topped block, organic = leaning hill.
  const sun = (cx: number, baseY: number, r: number, color = motif) =>
    shape === "sharp" ? `<path d="M ${cx - r} ${baseY} L ${cx} ${baseY - r} L ${cx + r} ${baseY} Z" fill="${color}"/>`
    : shape === "geometric" ? `<path d="M ${cx - r} ${baseY} L ${cx - r} ${baseY - r * 0.82} L ${cx + r} ${baseY - r * 0.82} L ${cx + r} ${baseY} Z" fill="${color}"/>`
    : shape === "organic" ? `<path d="M ${cx - r} ${baseY} C ${cx - r * 0.9} ${baseY - r * 1.25} ${cx + r * 0.25} ${baseY - r * 1.1} ${cx + r} ${baseY} Z" fill="${color}"/>`
    : `<path d="M ${cx - r} ${baseY} A ${r} ${r} 0 0 1 ${cx + r} ${baseY} Z" fill="${color}"/>`;
  const dot = (cx: number, cy: number, r: number, color = motif) =>
    shape === "sharp" ? `<path d="M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z" fill="${color}"/>`
    : shape === "geometric" ? `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.25}" fill="${color}"/>`
    : shape === "organic" ? `<path d="M ${cx - r} ${cy} C ${cx - r} ${cy - r * 1.2} ${cx + r * 1.15} ${cy - r} ${cx + r} ${cy + r * 0.15} C ${cx + r * 0.85} ${cy + r * 1.1} ${cx - r * 0.9} ${cy + r} ${cx - r} ${cy} Z" fill="${color}"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
  // Corner radius language follows the shape pick too.
  const rxf = shape === "sharp" ? 0.06 : shape === "geometric" ? 0.12 : shape === "organic" ? 0.30 : 0.225;

  if (key === "appicon" || variant === "icon") {
    // Square app icon: three treatments per round.
    const S = 220;
    const letter = (name[0] || "A");
    const tileBg = variant === "dawn" || v === 1 ? "url(#dg)" : v === 2 ? "#ffffff" : pal.night;
    const letterFg = v === 1 ? pal.night : v === 2 ? pal.night : "#ffffff";
    const inner =
      v === 2
        ? `<circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.36}" fill="none" stroke="${accent}" stroke-width="9"/>` +
          `<text x="${S / 2}" y="${S * 0.635}" text-anchor="middle" font-family="${FONT}" font-size="${S * 0.38}" font-weight="800" fill="${letterFg}">${esc(letter)}</text>`
        : sun(S / 2, S * 0.72, S * 0.20, v === 1 ? pal.night : accent) +
          `<text x="${S / 2}" y="${S * 0.60}" text-anchor="middle" font-family="${v === 1 ? SERIF : FONT}" font-size="${S * 0.42}" font-weight="${v === 1 ? 500 : 800}" fill="${letterFg}">${esc(letter)}</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${H}" height="${H}">${defs}` +
      `<rect width="${S}" height="${S}" rx="${S * rxf}" fill="${tileBg}" ${v === 2 ? `stroke="rgba(0,0,0,.12)" stroke-width="2"` : ""}/>` + inner + `</svg>`;
  }

  switch (key) {
    case "sunrise": {
      if (v === 1) { // sun inline, left of a serif wordmark
        const r = 20;
        const w = r * 2 + 16 + wWord(name, fs) + pad * 2;
        return wrap(w, 130, sun(pad + r, 78, r) + word(pad + r * 2 + 16, 84, fs, { ...face }));
      }
      if (v === 2) { // big sun rising behind a light wordmark
        const w = wWord(name, fs) + pad * 2;
        const cx = w / 2;
        return wrap(w, 170, sun(cx, 118, 52) + word(cx, 118, fs, { ...face, anchor: "middle" }));
      }
      const w = wWord(name, fs) + pad * 2; // classic: sun over the horizon line
      const cx = w / 2;
      return wrap(w, 190, [
        sun(cx, 78, 30),
        `<line x1="${cx - 44}" y1="78" x2="${cx + 44}" y2="78" stroke="${fg}" stroke-width="4" stroke-linecap="round"/>`,
        word(cx, 138, fs, { anchor: "middle" }),
      ].join(""));
    }
    case "airy": {
      if (v === 1) { // serif italic, quietly spaced
        const t = name.toLowerCase();
        const w = wWord(t, fs * 0.95, fs * 0.08) + pad * 2;
        return wrap(w, 130, word(w / 2, 84, fs * 0.95, { serif: true, italic: true, weight: 400, spacing: fs * 0.08, text: t, anchor: "middle" }));
      }
      if (v === 2) { // small caps, very wide
        const t = name.toUpperCase();
        const sp = fs * 0.34;
        const w = wWord(t, fs * 0.62, sp) + pad * 2;
        return wrap(w, 120, word(w / 2, 76, fs * 0.62, { weight: 500, spacing: sp, text: t, anchor: "middle" }));
      }
      const t = name.toLowerCase();
      const sp = fs * 0.24;
      const w = wWord(t, fs * 0.86, sp) + pad * 2;
      return wrap(w, 130, word(w / 2, 82, fs * 0.86, { weight: 300, spacing: sp, text: t, anchor: "middle" }));
    }
    case "monogram": {
      const S = 170;
      const letter = name[0] || "A";
      if (v === 1) { // accent disc, letter reversed
        return wrap(S, S, [
          `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 16}" fill="${motif}"/>`,
          `<text x="${S / 2}" y="${S / 2 + 26}" text-anchor="middle" font-family="${SERIF}" font-size="76" font-weight="500" fill="${variant === "mono" ? "#fff" : pal.night}">${esc(letter)}</text>`,
        ].join(""));
      }
      if (v === 2) { // bare letter with an accent full stop
        return wrap(S, S, [
          `<text x="${S / 2 - 12}" y="${S / 2 + 34}" text-anchor="middle" font-family="${FONT}" font-size="98" font-weight="800" fill="${fg}">${esc(letter.toLowerCase())}</text>`,
          dot(S / 2 + 42, S / 2 + 26, 10),
        ].join(""));
      }
      return wrap(S, S, [
        `<rect x="14" y="14" width="${S - 28}" height="${S - 28}" rx="${(S - 28) * rxf}" fill="none" stroke="${motif}" stroke-width="6"/>`,
        `<text x="${S / 2}" y="${S / 2 + 24}" text-anchor="middle" font-family="${FONT}" font-size="72" font-weight="800" fill="${fg}">${esc(letter)}</text>`,
      ].join(""));
    }
    case "star": {
      const star = (sx: number, sy: number, r: number) =>
        `<path d="M ${sx} ${sy - r} C ${sx + r * 0.14} ${sy - r * 0.36} ${sx + r * 0.36} ${sy - r * 0.14} ${sx + r} ${sy} C ${sx + r * 0.36} ${sy + r * 0.14} ${sx + r * 0.14} ${sy + r * 0.36} ${sx} ${sy + r} C ${sx - r * 0.14} ${sy + r * 0.36} ${sx - r * 0.36} ${sy + r * 0.14} ${sx - r} ${sy} C ${sx - r * 0.36} ${sy - r * 0.14} ${sx - r * 0.14} ${sy - r * 0.36} ${sx} ${sy - r} Z" fill="${motif}"/>`;
      if (v === 1) { // star floats above a serif wordmark
        const w = wWord(name, fs) + pad * 2;
        const cx = w / 2;
        return wrap(w, 185, star(cx, 48, 18) + word(cx, 134, fs, { ...face, anchor: "middle" }));
      }
      if (v === 2) { // star dots the end of the word
        const w = wWord(name, fs) + 16 + 30 + pad * 2;
        return wrap(w, 124, word(pad, 78, fs, { ...face }) + star(pad + wWord(name, fs) + 26, 70, 14));
      }
      const starW = 46;
      const w = starW + 14 + wWord(name, fs) + pad * 2;
      return wrap(w, 124, star(pad + starW / 2, 62, 22) + word(pad + starW + 14, 62 + fs * 0.36, fs));
    }
    case "horizon": {
      const t = name.toUpperCase();
      const sp = fs * 0.16;
      const tw = wWord(t, fs * 0.78, sp);
      const w = tw + pad * 2;
      if (v === 1) { // masthead: rules above and below
        return wrap(w, 168, [
          `<line x1="${pad}" y1="42" x2="${w - pad}" y2="42" stroke="${motif}" stroke-width="3"/>`,
          word(w / 2, 100, fs * 0.78, { weight: 600, spacing: sp, text: t, anchor: "middle", serif: true }),
          `<line x1="${pad}" y1="126" x2="${w - pad}" y2="126" stroke="${motif}" stroke-width="3"/>`,
        ].join(""));
      }
      if (v === 2) { // the line rises into a sun at the end
        return wrap(w, 150, [
          word(w / 2, 78, fs * 0.78, { weight: 700, spacing: sp, text: t, anchor: "middle" }),
          `<line x1="${pad}" y1="104" x2="${w - pad - 34}" y2="104" stroke="${fg}" stroke-width="4" stroke-linecap="round"/>`,
          sun(w - pad - 14, 104, 14),
        ].join(""));
      }
      return wrap(w, 150, [
        word(w / 2, 78, fs * 0.78, { weight: 700, spacing: sp, text: t, anchor: "middle" }),
        `<line x1="${pad}" y1="104" x2="${w - pad}" y2="104" stroke="${motif}" stroke-width="4" stroke-linecap="round"/>`,
      ].join(""));
    }
    case "dawn": {
      const w = wWord(name, fs) + pad * 2.4;
      if (v === 1) { // gradient wordmark on the plain stage
        return wrap(w, 130, `<text x="${w / 2}" y="86" text-anchor="middle" font-family="${FONT}" font-size="${fs}" font-weight="800" letter-spacing="${-fs * 0.03}" fill="url(#dg)">${esc(name)}</text>`);
      }
      if (v === 2) { // wordmark over a gradient underline bar
        return wrap(w, 150, [
          word(w / 2, 80, fs, { anchor: "middle" }),
          `<rect x="${pad}" y="102" width="${w - pad * 2}" height="10" rx="5" fill="url(#dg)"/>`,
        ].join(""));
      }
      const inner = `<text x="${w / 2}" y="86" text-anchor="middle" font-family="${FONT}" font-size="${fs}" font-weight="800" letter-spacing="${-fs * 0.03}" fill="${pal.night}">${esc(name)}</text>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 140" width="${(w / 140) * H}" height="${H}">${defs}<rect width="${w}" height="140" rx="${140 * rxf * 0.7}" fill="url(#dg)"/>${inner}</svg>`;
    }
    case "halo": {
      const t = name.toLowerCase();
      const w = wWord(t, fs) + pad * 2;
      const cx = w / 2;
      if (v === 1) { // the halo leans on the first letter
        const x0 = (w - wWord(t, fs)) / 2;
        return wrap(w, 150, [
          `<circle cx="${x0 + fs * 0.30}" cy="${96 - fs * 0.78}" r="${fs * 0.30}" fill="none" stroke="${motif}" stroke-width="5"/>`,
          word(cx, 96, fs, { weight: 700, text: t, anchor: "middle" }),
        ].join(""));
      }
      if (v === 2) { // three dawn dots above
        return wrap(w, 170, [
          dot(cx - 26, 46, 7, variant === "mono" ? fg : pal.dawn),
          dot(cx, 40, 7, variant === "mono" ? fg : pal.haze),
          dot(cx + 26, 46, 7, variant === "mono" ? fg : pal.nova),
          word(cx, 124, fs, { weight: 700, text: t, anchor: "middle" }),
        ].join(""));
      }
      return wrap(w, 180, [
        `<circle cx="${cx}" cy="52" r="20" fill="none" stroke="${motif}" stroke-width="5"/>`,
        word(cx, 132, fs, { weight: 700, text: t, anchor: "middle" }),
      ].join(""));
    }
    case "firstlight": {
      const mv = midVowel(name);
      if (v === 1) { // rays break over the wordmark
        const w = wWord(name, fs) + pad * 2;
        const cx = w / 2;
        const ray = (a: number) => {
          const x2 = cx + Math.sin(a) * 34, y2 = 62 - Math.cos(a) * 34;
          const x1 = cx + Math.sin(a) * 18, y1 = 62 - Math.cos(a) * 18;
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${motif}" stroke-width="5" stroke-linecap="round"/>`;
        };
        return wrap(w, 175, ray(-0.7) + ray(0) + ray(0.7) + word(cx, 130, fs, { ...face, anchor: "middle" }));
      }
      if (v === 2) { // the sun rises out of the last letter's baseline
        const w = wWord(name, fs) + 44 + pad * 2;
        return wrap(w, 140, word(pad, 88, fs, { ...face }) + sun(pad + wWord(name, fs) + 26, 88, 16));
      }
      const a = mv.i > 0 ? name.slice(0, mv.i) : name;
      const b = mv.i > 0 ? name.slice(mv.i + 1) : "";
      const r = fs * 0.30;
      const wA = wWord(a, fs), wB = wWord(b, fs);
      const w = wA + r * 2 + 12 + wB + pad * 2;
      let x = pad;
      const parts: string[] = [];
      parts.push(word(x, 96, fs, { text: a }));
      x += wA + 6;
      parts.push(sun(x + r, 92, r));
      x += r * 2 + 6;
      if (b) parts.push(word(x, 96, fs, { text: b }));
      return wrap(w, 150, parts.join(""));
    }
    case "nightserif": { // the name, set with care, in serif — three cuts per round
      if (v === 1) {
        const t = name;
        const w = wWord(t, fs * 0.98) + pad * 2;
        return wrap(w, 130, word(w / 2, 84, fs * 0.98, { serif: true, italic: true, weight: 500, anchor: "middle" }));
      }
      if (v === 2) {
        const t = name.toUpperCase();
        const sp = fs * 0.22;
        const w = wWord(t, fs * 0.66, sp) + pad * 2;
        return wrap(w, 120, word(w / 2, 78, fs * 0.66, { serif: true, weight: 600, spacing: sp, text: t, anchor: "middle" }));
      }
      const w = wWord(name, fs) + pad * 2;
      return wrap(w, 130, word(w / 2, 84, fs, { serif: true, weight: 500, anchor: "middle" }));
    }
    case "dawnsun": { // a big sun rising behind the word — placement shifts per round
      const w = wWord(name, fs) + pad * 2;
      const cx = w / 2;
      if (v === 1) return wrap(w, 185, sun(cx, 56, 26) + word(cx, 128, fs, { anchor: "middle" }));
      if (v === 2) return wrap(w, 170, sun(cx - wWord(name, fs) / 2 + fs * 0.3, 118, 40, motif) + word(cx, 118, fs, { anchor: "middle" }));
      return wrap(w, 170, sun(cx, 118, 52) + word(cx, 118, fs, { anchor: "middle" }));
    }
    case "sidebyside": { // small sun and word, side by side — the lockup flips per round
      const r = 17;
      const w = r * 2 + 16 + wWord(name, fs) + pad * 2;
      if (v === 1) return wrap(w, 124, dot(pad + r, 68, r * 0.7) + word(pad + r * 2 + 16, 78, fs, { ...face }));
      if (v === 2) return wrap(w, 124, word(pad, 78, fs, { ...face }) + sun(pad + wWord(name, fs) + 16 + r, 74, r));
      return wrap(w, 124, sun(pad + r, 74, r) + word(pad + r * 2 + 16, 78, fs, {}));
    }
    case "hazeitalic": { // italic serif, haze-tinted — voice shifts per round
      const hz = variant === "mono" ? fg : (variant === "tile" || variant === "night") ? pal.haze : fg;
      if (v === 1) {
        const t = name;
        const w = wWord(t, fs * 0.94) + 26 + pad * 2;
        return wrap(w, 130, dot(pad + 7, 78, 6, motif) + word(pad + 24, 84, fs * 0.94, { serif: true, italic: true, weight: 500, text: t, color: hz }));
      }
      if (v === 2) {
        const t = name.toLowerCase();
        const sp = fs * 0.1;
        const w = wWord(t, fs * 0.9, sp) + pad * 2;
        return wrap(w, 140, word(w / 2, 80, fs * 0.9, { serif: true, italic: true, weight: 400, spacing: sp, text: t, anchor: "middle", color: hz }) +
          `<line x1="${w / 2 - 30}" y1="102" x2="${w / 2 + 30}" y2="102" stroke="${motif}" stroke-width="3" stroke-linecap="round"/>`);
      }
      const t = name.toLowerCase();
      const w = wWord(t, fs * 0.98) + pad * 2;
      return wrap(w, 130, word(w / 2, 84, fs * 0.98, { serif: true, italic: true, weight: 400, text: t, anchor: "middle", color: hz }));
    }
    case "outlinesun": { // the sun as a thin line drawing — changes per round
      const w = wWord(name, fs) + pad * 2;
      const cx = w / 2;
      if (v === 1) return wrap(w, 180, [
        `<circle cx="${cx}" cy="56" r="19" fill="none" stroke="${motif}" stroke-width="4"/>`,
        word(cx, 130, fs, { ...face, anchor: "middle" }),
      ].join(""));
      if (v === 2) return wrap(w, 175, [
        `<path d="M ${cx - 30} 60 A 30 30 0 0 1 ${cx + 30} 60" fill="none" stroke="${motif}" stroke-width="6" stroke-linecap="round"/>`,
        word(cx, 128, fs, { ...face, anchor: "middle" }),
      ].join(""));
      return wrap(w, 180, [
        `<path d="M ${cx - 24} 66 A 24 24 0 0 1 ${cx + 24} 66" fill="none" stroke="${motif}" stroke-width="4" stroke-linecap="round"/>`,
        `<line x1="${cx - 34}" y1="66" x2="${cx + 34}" y2="66" stroke="${fg}" stroke-width="3" stroke-linecap="round"/>`,
        word(cx, 130, fs, { anchor: "middle" }),
      ].join(""));
    }
    case "risingdot": { // a single dot in motion — where it lands changes per round
      const w = wWord(name, fs) + 30 + pad * 2;
      if (v === 1) return wrap(w, 150, [
        word(pad, 96, fs, { ...face }),
        dot(pad + wWord(name, fs) + 16, 92, 8),
      ].join(""));
      if (v === 2) return wrap(w, 165, [
        dot(pad + fs * 0.3, 46, 8),
        word(pad, 118, fs, { ...face }),
      ].join(""));
      return wrap(w, 150, [
        word(pad, 96, fs, {}),
        dot(pad + wWord(name, fs) + 18, 58, 9),
      ].join(""));
    }
    default: { // plain wordmark
      const w = wWord(name, fs) + pad * 2;
      return wrap(w, 130, word(w / 2, 84, fs, { ...face, anchor: "middle" }));
    }
  }
}

/* ── the downloadable logo pack (shared by the flow and the account page) ── */
export async function buildLogoPack(
  name: string, key: string, accent: Accent, seed: number,
  swatches?: { name: string; hex: string }[] | null, font?: LogoFont, shape?: LogoShape,
): Promise<{ blob: Blob; filename: string }> {
  const { makeZip } = await import("./zip");
  const pal = toPalette(swatches);
  const nm = (name || "logo").toLowerCase();
  const svgs: Record<string, string> = {
    [`${nm}-primary.svg`]: logoSvg(key, name, pal, { variant: "light", accent, seed, font, shape }),
    [`${nm}-reversed.svg`]: logoSvg(key, name, pal, { variant: "night", accent, seed, font, shape }),
    [`${nm}-gradient.svg`]: logoSvg(key, name, pal, { variant: "dawn", accent, seed, font, shape }),
    [`${nm}-mono.svg`]: logoSvg(key, name, pal, { variant: "mono", accent, seed, font, shape }),
    [`${nm}-appicon.svg`]: logoSvg("appicon", name, pal, { variant: "icon", accent, seed, shape }),
  };
  const enc = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = Object.entries(svgs).map(([n, svg]) => ({ name: n, data: enc.encode(svg) }));
  try {
    files.push({ name: `${nm}-primary@1024.png`, data: await svgToPng(svgs[`${nm}-primary.svg`], 1024) });
    files.push({ name: `${nm}-appicon@512.png`, data: await svgToPng(svgs[`${nm}-appicon.svg`], 512) });
  } catch { /* svg-only pack if the canvas fails */ }
  return { blob: makeZip(files), filename: `${nm}-logo-pack.zip` };
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
