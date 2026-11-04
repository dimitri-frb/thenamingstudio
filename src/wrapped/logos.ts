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
export type CustomSymbol = "half" | "full" | "ring" | "horizon" | "rays" | "arc" | "monogram" | "none";
export interface CustomLogo {
  symbol: CustomSymbol; layout: "stacked" | "side" | "symbol"; accentHex?: string; scale?: number;
  tileKey?: string;        // the picked tile — kept until symbol/layout are touched, so every render IS that tile
  family?: string;       // a Google Fonts family picked in "More fonts"
  famWeight?: number;
  sseed?: number;        // "↻ More": cycles subtle symbol proportions
}

/* Google Fonts, loaded on demand for the personalized wordmark. */
const fontsLoaded = new Set<string>();
export function ensureFonts(fonts: { family: string; weight?: number }[]): void {
  if (typeof document === "undefined") return;
  const need = fonts.filter((f) => f.family && !fontsLoaded.has(f.family + ":" + (f.weight || 500)));
  if (!need.length) return;
  need.forEach((f) => fontsLoaded.add(f.family + ":" + (f.weight || 500)));
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?" +
    need.map((f) => `family=${encodeURIComponent(f.family).replace(/%20/g, "+")}:wght@${f.weight || 500}`).join("&") +
    "&display=swap";
  document.head.appendChild(l);
}
export interface LogoConcept { key: string; title: string; accent: Accent; seed: number; font?: LogoFont; shape?: LogoShape; custom?: CustomLogo }

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

// Keep the name's own capitals ("Clos & Crumb", "NetSuite"); only a name
// typed all in capitals is softened to one capital per word.
const cap = (s: string) => {
  if (!s) return s;
  const t = s.length > 3 && s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s&\-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s;
  return t[0].toUpperCase() + t.slice(1);
};

const SERIF = `'Newsreader',Georgia,'Times New Roman',serif`;

export function logoSvg(key: string, rawName: string, pal: Palette, opts: { variant?: LogoVariant; accent?: keyof Palette; accentHex?: string; height?: number; seed?: number; font?: LogoFont; shape?: LogoShape; family?: string; famWeight?: number; custom?: CustomLogo } = {}): string {
  const variant = opts.variant || "light";
  // A personalised colour rides on custom.accentHex for v2 logos too.
  const hexAcc = opts.accentHex || (key.startsWith("x:") ? opts.custom?.accentHex : undefined);
  const accent = hexAcc && variant !== "mono" ? hexAcc : pal[opts.accent || "dawn"];
  // Logo engine v2 (2 Nov): the key carries layout, symbol, font and case.
  if (key.startsWith("x:")) {
    return renderX(key, cap((rawName || "Name").trim()), pal, { variant, accent, H: opts.height || 220, shape: opts.shape || "round", famOverride: opts.family || opts.custom?.family, famWeight: opts.famWeight || opts.custom?.famWeight });
  }
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

  const word = (x: number, y: number, fs: number, o: { weight?: number; spacing?: number; color?: string; text?: string; anchor?: string; serif?: boolean; italic?: boolean; family?: string } = {}) =>
    `<text x="${x}" y="${y}" font-family="${o.family ? `'${o.family}',${o.serif ? SERIF : FONT}` : o.serif ? SERIF : FONT}" font-size="${fs}" font-weight="${o.weight ?? 800}" letter-spacing="${o.spacing ?? -fs * 0.03}" ${o.italic ? `font-style="italic"` : ""} fill="${o.color || fg}" ${o.anchor ? `text-anchor="${o.anchor}"` : ""}>${esc(o.text ?? name)}</text>`;

  // The wordmark voice rotates with the round (heavy sans → serif → light sans),
  // unless the founder picked a font explicitly on the logo page.
  const FACES: Record<LogoFont, { serif?: boolean; weight: number; wf: number }> = {
    bold: { weight: 800, wf: 0.60 }, serif: { serif: true, weight: 500, wf: 0.56 }, light: { weight: 400, wf: 0.58 },
  };
  const face = {
    ...(opts.font ? FACES[opts.font] : v === 1 ? FACES.serif : v === 2 ? FACES.light : FACES.bold),
    ...(opts.family ? { family: opts.family, weight: opts.famWeight || 600, wf: 0.6 } : {}),
  };
  if (opts.family) ensureFonts([{ family: opts.family, weight: opts.famWeight }]);
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

  // The personalized lockup (Chapter 3 · Personalize): symbol, colour, face, layout.
  // App icons fall through: they keep their own square treatment and borrow
  // the custom accent and typeface below.
  if ((opts.custom || key === "custom") && key !== "appicon" && variant !== "icon") {
    const c: CustomLogo = opts.custom || { symbol: "half", layout: "side" };
    if (c.tileKey) {
      return logoSvg(c.tileKey, rawName, pal, {
        ...opts, custom: undefined,
        accentHex: c.accentHex || opts.accentHex,
        family: c.family || opts.family, famWeight: c.famWeight || opts.famWeight,
      });
    }
    if (c.family) ensureFonts([{ family: c.family, weight: c.famWeight }]);
    const sc = c.scale || 1;
    const accRaw = c.accentHex || accent;
    const acc = variant === "mono" ? fg : accRaw;
    const faint = acc.toLowerCase() === "#ffffff" && !isDark && variant !== "dawn";
    const ring = faint ? ` stroke="rgba(0,0,0,.18)" stroke-width="2"` : "";
    const sv = ((c.sseed || 0) % 3 + 3) % 3; // "↻ More" cycles proportions
    const letterFg = faint || acc.toLowerCase() === "#ffffff" ? pal.night : "#ffffff";
    const sym = (cx: number, cy: number, r: number) => {
      switch (c.symbol) {
        case "none": return "";
        case "full": return faint ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${acc}"${ring}/>` : dot(cx, cy, r, acc);
        case "ring": {
          const sw = r * (sv === 1 ? 0.3 : sv === 2 ? 0.58 : 0.44);
          return `<circle cx="${cx}" cy="${cy}" r="${r - sw / 2}" fill="none" stroke="${acc}" stroke-width="${sw}"/>`;
        }
        case "horizon": {
          const d = r * 0.88;
          return `<path d="M ${cx - d} ${cy + r * 0.32} A ${d} ${d} 0 0 1 ${cx + d} ${cy + r * 0.32} Z" fill="${acc}"${ring}/>` +
            `<line x1="${cx - r * 1.15}" y1="${cy + r * (sv === 2 ? 0.78 : 0.58)}" x2="${cx + r * 1.15}" y2="${cy + r * (sv === 2 ? 0.78 : 0.58)}" stroke="${faint ? "rgba(0,0,0,.4)" : acc}" stroke-width="${r * 0.16}" stroke-linecap="round"/>`;
        }
        case "rays": {
          const n = sv === 1 ? 7 : sv === 2 ? 11 : 9;
          const core = r * 0.52, from = r * 0.68, to = r;
          let out = `<circle cx="${cx}" cy="${cy}" r="${core}" fill="${acc}"${ring}/>`;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            out += `<line x1="${cx + Math.cos(a) * from}" y1="${cy + Math.sin(a) * from}" x2="${cx + Math.cos(a) * to}" y2="${cy + Math.sin(a) * to}" stroke="${acc}" stroke-width="${r * 0.12}" stroke-linecap="round"/>`;
          }
          return out;
        }
        case "arc": {
          const sw = r * (sv === 2 ? 0.62 : 0.46);
          const rr = r - sw / 2;
          return `<path d="M ${cx - rr} ${cy + r * 0.42} A ${rr} ${rr} 0 0 1 ${cx + rr} ${cy + r * 0.42}" fill="none" stroke="${acc}" stroke-width="${sw}" stroke-linecap="round"/>`;
        }
        case "monogram": {
          const rx = r * (sv === 1 ? 0.5 : sv === 2 ? 0.16 : 0.3);
          return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${rx}" fill="${acc}"${ring}/>` +
            `<text x="${cx}" y="${cy + r * 0.42}" text-anchor="middle" font-family="${FONT}" font-size="${r * 1.2}" font-weight="800" fill="${letterFg}">${esc((name[0] || "A").toUpperCase())}</text>`;
        }
        default:
          // "half" follows the founder's shape pick, exactly like the tiles —
          // a round arc only when the taste says round (the faint ring needs
          // the stroke, so a white-on-white symbol keeps the outlined arc).
          return faint
            ? `<path d="M ${cx - r} ${cy + r * 0.5} A ${r} ${r} 0 0 1 ${cx + r} ${cy + r * 0.5} Z" fill="${acc}"${ring}/>`
            : sun(cx, cy + r * 0.5, r, acc);
      }
    };
    const cface = c.family ? { ...face, family: c.family, weight: c.famWeight || 600 } : face;
    const cW = (t: string, f: number) => Math.max(f, t.length * f * (c.family ? 0.6 : face.wf));
    if (c.layout === "symbol") {
      const S = 170, r = 46 * sc;
      return wrap(S, S, sym(S / 2, S / 2, r) || `<circle cx="${S / 2}" cy="${S / 2}" r="${40 * sc}" fill="${acc}"${ring}/>`);
    }
    if (c.layout === "stacked") {
      const r = 26 * sc;
      const w = Math.max(cW(name, fs), r * 2) + pad * 2;
      const cx = w / 2;
      const top = c.symbol === "none" ? "" : sym(cx, 52, r);
      return wrap(w, 190, top + word(cx, c.symbol === "none" ? 110 : 148, fs, { ...cface, anchor: "middle" }));
    }
    const r = 22 * sc;
    const lead = c.symbol === "none" ? 0 : r * 2 + 18;
    const w = lead + cW(name, fs) + pad * 2;
    return wrap(w, 130, (c.symbol === "none" ? "" : sym(pad + r, 66, r)) + word(pad + lead, 84, fs, { ...cface }));
  }

  if (key === "appicon" || variant === "icon") {
    // Square app icon: three treatments per round. A personalized lockup's
    // accent and typeface carry through, so the favicon matches the logo.
    const S = 220;
    const letter = (name[0] || "A");
    const cAcc = opts.custom?.accentHex && variant !== "mono" ? opts.custom.accentHex : accent;
    const cFont = opts.custom?.family ? `'${opts.custom.family}',${FONT}` : FONT;
    const tileBg = variant === "dawn" || v === 1 ? "url(#dg)" : v === 2 ? "#ffffff" : pal.night;
    const letterFg = v === 1 ? pal.night : v === 2 ? pal.night : "#ffffff";
    const inner =
      v === 2
        ? `<circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.36}" fill="none" stroke="${cAcc}" stroke-width="9"/>` +
          `<text x="${S / 2}" y="${S * 0.635}" text-anchor="middle" font-family="${cFont}" font-size="${S * 0.38}" font-weight="800" fill="${letterFg}">${esc(letter)}</text>`
        : sun(S / 2, S * 0.72, S * 0.20, v === 1 ? pal.night : cAcc) +
          `<text x="${S / 2}" y="${S * 0.60}" text-anchor="middle" font-family="${v === 1 ? SERIF : cFont}" font-size="${S * 0.42}" font-weight="${v === 1 ? 500 : 800}" fill="${letterFg}">${esc(letter)}</text>`;
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

/** The app icon for a logo: a v2 logo draws its own icon from its key. */
export const iconKey = (key?: string) => (key && key.startsWith("x:") ? key : "appicon");

/* ── the downloadable logo pack (shared by the flow and the account page) ── */
export async function buildLogoPack(
  name: string, key: string, accent: Accent, seed: number,
  swatches?: { name: string; hex: string }[] | null, font?: LogoFont, shape?: LogoShape, custom?: CustomLogo,
): Promise<{ blob: Blob; filename: string }> {
  const { makeZip } = await import("./zip");
  const { outlineSvg } = await import("./outline");
  const pal = toPalette(swatches);
  const o = { accent, seed, font, shape, custom };
  // Lettering → vector outlines, so every file looks the same in any app.
  const svgs = {
    primary: await outlineSvg(logoSvg(key, name, pal, { ...o, variant: "light" })),
    reversed: await outlineSvg(logoSvg(key, name, pal, { ...o, variant: "night" })),
    gradient: await outlineSvg(logoSvg(key, name, pal, { ...o, variant: "dawn" })),
    mono: await outlineSvg(logoSvg(key, name, pal, { ...o, variant: "mono" })),
    icon: await outlineSvg(logoSvg(iconKey(key), name, pal, { ...o, variant: "icon" })),
  };
  // One-colour versions: strip any background card, then recolour.
  const clear = (svg: string) => svg.replace(/(<svg[^>]*>(?:<defs>.*?<\/defs>)?)<rect width="[^"]+" height="[^"]+"(?: rx="[^"]+")? fill="[^"]+"\/>/, "$1");
  const black = (svg: string) => clear(svg).replace(/fill="#(?:[0-9a-fA-F]{3}){1,2}"/g, 'fill="#000000"').replace(/stroke="#(?:[0-9a-fA-F]{3}){1,2}"/g, 'stroke="#000000"');
  const white = (svg: string) => clear(svg).replace(/fill="#(?:[0-9a-fA-F]{3}){1,2}"/g, 'fill="#ffffff"').replace(/stroke="#(?:[0-9a-fA-F]{3}){1,2}"/g, 'stroke="#ffffff"');
  const enc = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [];
  const Nm = (name || "Logo").replace(/[^A-Za-z0-9-]+/g, "-");
  // Handoff 27 · P·2: {Name}-logo-pack/ Logo · Icon · Colours · Logo guide.pdf · README.txt
  const add = (n: string, d: string | Uint8Array) => files.push({ name: `${Nm}-logo-pack/${n}`, data: typeof d === "string" ? enc.encode(d) : d });
  const byWidth = (svg: string, w: number) => { const m = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/); const ar = m ? Number(m[1]) / Number(m[2]) : 2; return rasterSvg(svg, Math.round(w / ar)); };
  const onPaper = (svg: string) => svg.replace(/(<svg[^>]*>)/, `$1<rect x="-10000" y="-10000" width="20000" height="20000" fill="#ffffff"/>`);
  add(`Logo/${Nm}-logo.svg`, svgs.primary);
  add(`Logo/${Nm}-logo-white.svg`, white(svgs.mono));
  add(`Logo/${Nm}-logo-black.svg`, black(svgs.mono));
  add(`Logo/${Nm}-logo-reversed.svg`, svgs.reversed);
  try { const { svgToEps } = await import("./eps"); add(`Logo/${Nm}-logo.eps`, svgToEps(svgs.primary, `${name} logo`)); } catch { /* EPS is a bonus */ }
  add(`Icon/app-icon.svg`, svgs.icon);
  try {
    add(`Logo/${Nm}-logo.png`, await byWidth(onPaper(svgs.primary), 2000));
    add(`Logo/${Nm}-logo@2x.png`, await byWidth(onPaper(svgs.primary), 4000));
    add(`Logo/${Nm}-logo-transparent.png`, await byWidth(clear(svgs.primary), 2000));
    add(`Logo/${Nm}-logo-white.png`, await byWidth(white(svgs.mono), 2000));
    add(`Icon/app-icon-1024.png`, await rasterSvg(svgs.icon, 1024));
    add(`Icon/app-icon-512.png`, await rasterSvg(svgs.icon, 512));
    add(`Icon/app-icon-180.png`, await rasterSvg(svgs.icon, 180));
    add(`Icon/favicon-32.png`, await rasterSvg(svgs.icon, 32));
    add(`Icon/favicon.ico`, icoOf([await rasterSvg(svgs.icon, 16), await rasterSvg(svgs.icon, 32), await rasterSvg(svgs.icon, 48)], [16, 32, 48]));
  } catch { /* svg-only pack if the canvas fails */ }
  const sw = (Array.isArray(swatches) && swatches.length >= 4 ? swatches.slice(0, 4) : [{ name: "Dawn", hex: pal.dawn }, { name: "Haze", hex: pal.haze }, { name: "Nova", hex: pal.nova }, { name: "Night", hex: pal.night }]);
  const G = await import("./logoGuide");
  add(`Colours/${Nm}-colours.ase`, G.aseOf(sw));
  add(`Colours/${Nm}-colours.txt`, `${name} · brand colours\n\n` + sw.map((c) => `${c.name.padEnd(10)} HEX ${c.hex.toUpperCase()}   RGB ${G.rgbOf(c.hex).join(", ")}   CMYK ${G.cmykOf(c.hex).join(" / ")}`).join("\n") + "\n");
  try {
    const { svgPdf } = await import("./pdf");
    const guide = await svgPdf([G.logoGuideSvg(name, key, pal, { accent, seed, font, shape, custom }, sw)], 297, 210, `${name} · Logo guide`);
    add("Logo guide.pdf", new Uint8Array(await guide.arrayBuffer()));
  } catch { /* the pack ships without the guide if the PDF can't be made */ }
  add("README.txt", `${name} · your logo files\n\nWhich file do I use?\n\n` +
    `Website            → Logo/${Nm}-logo.svg\n` +
    `Instagram, Canva   → Logo/${Nm}-logo.png\n` +
    `On a dark photo    → Logo/${Nm}-logo-white.svg\n` +
    `Print (cards,      → Logo guide.pdf, or the SVG\n  signs, flyers)\n` +
    `Browser tab        → Icon/favicon.ico\n` +
    `App / home screen  → Icon/app-icon-1024.png\n` +
    `Colours            → Colours/${Nm}-colours.txt (Adobe apps: the .ase)\n\n` +
    `Every file uses vector lettering, so it looks the same on every device.\nPNGs are 2000 px wide (@2x: 4000 px). The transparent PNG has no background.\n\nMade with Name Name · namename.ai\n`);
  return { blob: makeZip(files), filename: `${Nm}-logo-pack.zip` };
}

// A .ico holding PNG images (Windows Vista+, every browser).
function icoOf(pngs: Uint8Array[], sizes: number[]): Uint8Array {
  const head = 6 + 16 * pngs.length;
  const total = head + pngs.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint16(2, 1, true); dv.setUint16(4, pngs.length, true);
  let off = head;
  pngs.forEach((p, i) => {
    const e = 6 + i * 16, s = sizes[i] >= 256 ? 0 : sizes[i];
    out[e] = s; out[e + 1] = s; dv.setUint16(e + 4, 1, true); dv.setUint16(e + 6, 32, true);
    dv.setUint32(e + 8, p.length, true); dv.setUint32(e + 12, off, true);
    out.set(p, off); off += p.length;
  });
  return out;
}

/* ── raster export (SVG string → PNG bytes, drawn at 2x) ── */
export async function svgToPng(svg: string, heightPx: number): Promise<Uint8Array> {
  const { outlineSvg } = await import("./outline");
  return rasterSvg(await outlineSvg(svg), heightPx);
}
function rasterSvg(svg: string, heightPx: number): Promise<Uint8Array> {
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

/* ═══════════════ Logo engine v2 (logo Phase 1, 2 Nov) ═══════════════
   Nine logos per brand from three ingredients chosen for THIS brand:
   - a typeface: 3 curated Google Fonts per type pick (30 in all);
   - a symbol: ~35 marks in four families (round / sharp / geometric /
     organic), picked by the shape pick and the brief's sector;
   - a layout: mark beside or above the name, wordmark, emblem, monogram,
     a letter swapped for the mark, a pill, a split lockup, an app icon.
   Everything is encoded in the concept key ("x:layout:symbol:font:case"), so
   the tile, the preview, the brand book, the pack and the favicon all draw
   the exact same logo from the key alone. */

export interface XFont { f: string; w: number; wf: number; serif?: boolean; caps?: boolean; sp?: number; italic?: boolean }
export const X_FONTS: XFont[] = [
  // 0–2 Elegant serif
  { f: "Cormorant Garamond", w: 600, wf: 0.5, serif: true }, { f: "EB Garamond", w: 500, wf: 0.52, serif: true }, { f: "Newsreader", w: 500, wf: 0.53, serif: true },
  // 3–5 Modern serif
  { f: "Playfair Display", w: 700, wf: 0.58, serif: true }, { f: "DM Serif Display", w: 400, wf: 0.55, serif: true }, { f: "Fraunces", w: 600, wf: 0.58, serif: true },
  // 6–8 Slab serif
  { f: "Roboto Slab", w: 700, wf: 0.6, serif: true }, { f: "Zilla Slab", w: 600, wf: 0.52, serif: true }, { f: "Arvo", w: 700, wf: 0.62, serif: true },
  // 9–11 Clean sans
  { f: "Inter Tight", w: 600, wf: 0.55 }, { f: "Manrope", w: 700, wf: 0.6 }, { f: "DM Sans", w: 700, wf: 0.58 },
  // 12–14 Geometric sans
  { f: "Outfit", w: 600, wf: 0.56 }, { f: "Sora", w: 600, wf: 0.62 }, { f: "Poppins", w: 600, wf: 0.62 },
  // 15–17 Grotesque
  { f: "Space Grotesk", w: 700, wf: 0.6 }, { f: "Bricolage Grotesque", w: 700, wf: 0.56 }, { f: "Archivo", w: 800, wf: 0.6 },
  // 18–20 Strong caps
  { f: "Archivo Black", w: 400, wf: 0.72, caps: true, sp: 0.02 }, { f: "Anton", w: 400, wf: 0.5, caps: true, sp: 0.04 }, { f: "Bebas Neue", w: 400, wf: 0.44, caps: true, sp: 0.06 },
  // 21–23 Rounded
  { f: "Nunito", w: 800, wf: 0.6 }, { f: "Quicksand", w: 700, wf: 0.58 }, { f: "Varela Round", w: 400, wf: 0.6 },
  // 24–26 Technical mono
  { f: "JetBrains Mono", w: 600, wf: 0.62 }, { f: "Space Mono", w: 700, wf: 0.64 }, { f: "IBM Plex Mono", w: 600, wf: 0.62 },
  // 27–29 Script
  { f: "Pacifico", w: 400, wf: 0.62 }, { f: "Dancing Script", w: 700, wf: 0.5 }, { f: "Caveat", w: 700, wf: 0.46 },
];
export const TYPE_FONTS: Record<string, number[]> = {
  "Elegant serif": [0, 1, 2], "Modern serif": [3, 4, 5], "Slab serif": [6, 7, 8], "Clean sans": [9, 10, 11],
  "Geometric sans": [12, 13, 14], "Grotesque": [15, 16, 17], "Strong caps": [18, 19, 20], "Rounded": [21, 22, 23],
  "Technical mono": [24, 25, 26], "Script": [27, 28, 29],
};
// The broad family of each type pick: the only fonts its logos may use.
const SANS_ALL = [9, 10, 11, 12, 13, 14, 15, 16, 17, 21, 22, 23];
// Without a type question, the feel picks the four type families to show.
export const FEEL_TYPES: Record<string, string[]> = {
  "Soft & warm": ["Elegant serif", "Rounded", "Modern serif", "Clean sans"],
  "Bold & bright": ["Strong caps", "Geometric sans", "Grotesque", "Slab serif"],
  "Calm & minimal": ["Clean sans", "Modern serif", "Geometric sans", "Technical mono"],
  "Playful": ["Rounded", "Geometric sans", "Script", "Slab serif"],
};
/** The type family a logo font belongs to (for the book, sliders, kit). */
export const typeOfFont = (fi: number): string => Object.keys(TYPE_FONTS).find((t) => TYPE_FONTS[t].includes(fi)) || "Clean sans";
/** The shape family of a symbol, as the taste names it. */
export const shapeOfSym = (sym: string): string => {
  const f = X_SYMS[sym]?.fam;
  return f === "sharp" ? "Sharp & angular" : f === "organic" ? "Organic" : f === "geometric" ? "Geometric" : "Round & soft";
};
export const FEEL_SHAPE: Record<string, string> = { "Soft & warm": "Round & soft", "Bold & bright": "Sharp & angular", "Calm & minimal": "Geometric", "Playful": "Organic" };
export const TYPE_FAMILY: Record<string, number[]> = {
  "Elegant serif": [0, 1, 2, 3, 4, 5], "Modern serif": [3, 4, 5, 0, 1, 2], "Slab serif": [6, 7, 8, 3, 5],
  "Clean sans": SANS_ALL, "Geometric sans": [12, 13, 14, 9, 10, 11, 21, 22], "Grotesque": [15, 16, 17, 9, 10, 11, 18],
  "Strong caps": [18, 19, 20, 17, 15], "Rounded": [21, 22, 23, 12, 14, 10], "Technical mono": [24, 25, 26, 15, 9],
  "Script": [27, 28, 29],
};

type SymFamily = "round" | "sharp" | "geometric" | "organic";
interface XSym { fam: SymFamily; label: string; why: string; draw: (cx: number, cy: number, r: number, c: string, bg: string) => string }
const P = (d: string, c: string) => `<path d="${d}" fill="${c}"/>`;
const S = (d: string, c: string, w: number) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const n2 = (v: number) => Math.round(v * 10) / 10;
export const X_SYMS: Record<string, XSym> = {
  // ── round
  rise: { fam: "round", label: "Rise", why: "a sun lifting over a line: a beginning", draw: (x, y, r, c) => P(`M${n2(x - r)} ${n2(y + r * 0.25)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(x + r)} ${n2(y + r * 0.25)}Z`, c) + `<rect x="${n2(x - r)}" y="${n2(y + r * 0.45)}" width="${n2(r * 2)}" height="${n2(r * 0.22)}" rx="${n2(r * 0.11)}" fill="${c}"/>` },
  arch: { fam: "round", label: "Arch", why: "an open doorway: a place to step into", draw: (x, y, r, c) => P(`M${n2(x - r * 0.8)} ${n2(y + r)}V${n2(y - r * 0.1)}A${n2(r * 0.8)} ${n2(r * 0.8)} 0 0 1 ${n2(x + r * 0.8)} ${n2(y - r * 0.1)}V${n2(y + r)}H${n2(x + r * 0.38)}V${n2(y)}A${n2(r * 0.38)} ${n2(r * 0.38)} 0 0 0 ${n2(x - r * 0.38)} ${n2(y)}V${n2(y + r)}Z`, c) },
  orbit: { fam: "round", label: "Orbit", why: "a body in orbit: motion around a centre", draw: (x, y, r, c) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.8)}" fill="none" stroke="${c}" stroke-width="${n2(r * 0.16)}"/><circle cx="${n2(x + r * 0.57)}" cy="${n2(y - r * 0.57)}" r="${n2(r * 0.26)}" fill="${c}"/>` },
  split: { fam: "round", label: "Split", why: "two halves of one whole: balance", draw: (x, y, r, c, bg) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="${c}"/>` + P(`M${n2(x)} ${n2(y - r)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(x)} ${n2(y + r)}Z`, bg) + `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="none" stroke="${c}" stroke-width="${n2(r * 0.12)}"/>` },
  crescent: { fam: "round", label: "Crescent", why: "a crescent moon: quiet, constant", draw: (x, y, r, c, bg) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.92)}" fill="${c}"/><circle cx="${n2(x + r * 0.4)}" cy="${n2(y - r * 0.26)}" r="${n2(r * 0.74)}" fill="${bg}"/>` },
  venn: { fam: "round", label: "Together", why: "two circles overlapping: people meeting", draw: (x, y, r, c) => `<circle cx="${n2(x - r * 0.35)}" cy="${n2(y)}" r="${n2(r * 0.62)}" fill="none" stroke="${c}" stroke-width="${n2(r * 0.16)}"/><circle cx="${n2(x + r * 0.35)}" cy="${n2(y)}" r="${n2(r * 0.62)}" fill="none" stroke="${c}" stroke-width="${n2(r * 0.16)}"/>` },
  target: { fam: "round", label: "Focus", why: "rings to a centre: focus", draw: (x, y, r, c) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.88)}" fill="none" stroke="${c}" stroke-width="${n2(r * 0.18)}"/><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.34)}" fill="${c}"/>` },
  drop: { fam: "round", label: "Drop", why: "a single drop: pure, essential", draw: (x, y, r, c) => P(`M${n2(x)} ${n2(y - r)}C${n2(x + r * 0.3)} ${n2(y - r * 0.5)} ${n2(x + r * 0.78)} ${n2(y - r * 0.05)} ${n2(x + r * 0.78)} ${n2(y + r * 0.32)}A${n2(r * 0.78)} ${n2(r * 0.78)} 0 0 1 ${n2(x - r * 0.78)} ${n2(y + r * 0.32)}C${n2(x - r * 0.78)} ${n2(y - r * 0.05)} ${n2(x - r * 0.3)} ${n2(y - r * 0.5)} ${n2(x)} ${n2(y - r)}Z`, c) },
  wave: { fam: "round", label: "Wave", why: "a wave: flow and rhythm", draw: (x, y, r, c) => S(`M${n2(x - r)} ${n2(y - r * 0.2)}q${n2(r * 0.5)} ${n2(-r * 0.5)} ${n2(r)} 0t${n2(r)} 0`, c, r * 0.22) + S(`M${n2(x - r)} ${n2(y + r * 0.35)}q${n2(r * 0.5)} ${n2(-r * 0.5)} ${n2(r)} 0t${n2(r)} 0`, c, r * 0.22) },
  bloom: { fam: "round", label: "Bloom", why: "four petals opening: care and growth", draw: (x, y, r, c) => [0, 90, 180, 270].map((a) => `<ellipse cx="${n2(x)}" cy="${n2(y - r * 0.48)}" rx="${n2(r * 0.34)}" ry="${n2(r * 0.52)}" fill="${c}" transform="rotate(${a} ${n2(x)} ${n2(y)})"/>`).join("") },
  loop: { fam: "round", label: "Loop", why: "an endless loop: continuity", draw: (x, y, r, c) => S(`M${n2(x)} ${n2(y)}C${n2(x + r * 0.35)} ${n2(y - r * 0.55)} ${n2(x + r)} ${n2(y - r * 0.55)} ${n2(x + r)} ${n2(y)}S${n2(x + r * 0.35)} ${n2(y + r * 0.55)} ${n2(x)} ${n2(y)}S${n2(x - r)} ${n2(y - r * 0.55)} ${n2(x - r)} ${n2(y)}S${n2(x - r * 0.35)} ${n2(y + r * 0.55)} ${n2(x)} ${n2(y)}Z`, c, r * 0.2) },
  bubble: { fam: "round", label: "Voice", why: "a speech bubble: conversation", draw: (x, y, r, c) => P(`M${n2(x - r)} ${n2(y - r * 0.15)}A${n2(r)} ${n2(r * 0.78)} 0 1 1 ${n2(x - r * 0.35)} ${n2(y + r * 0.58)}L${n2(x - r * 0.85)} ${n2(y + r)}L${n2(x - r * 0.72)} ${n2(y + r * 0.42)}A${n2(r)} ${n2(r * 0.78)} 0 0 1 ${n2(x - r)} ${n2(y - r * 0.15)}Z`, c) },
  // ── sharp
  spark: { fam: "sharp", label: "Spark", why: "a four-point spark: the moment an idea lands", draw: (x, y, r, c) => P(`M${n2(x)} ${n2(y - r)}C${n2(x + r * 0.12)} ${n2(y - r * 0.12)} ${n2(x + r * 0.12)} ${n2(y - r * 0.12)} ${n2(x + r)} ${n2(y)}C${n2(x + r * 0.12)} ${n2(y + r * 0.12)} ${n2(x + r * 0.12)} ${n2(y + r * 0.12)} ${n2(x)} ${n2(y + r)}C${n2(x - r * 0.12)} ${n2(y + r * 0.12)} ${n2(x - r * 0.12)} ${n2(y + r * 0.12)} ${n2(x - r)} ${n2(y)}C${n2(x - r * 0.12)} ${n2(y - r * 0.12)} ${n2(x - r * 0.12)} ${n2(y - r * 0.12)} ${n2(x)} ${n2(y - r)}Z`, c) },
  chevron: { fam: "sharp", label: "Forward", why: "two chevrons: forward motion", draw: (x, y, r, c) => S(`M${n2(x - r * 0.75)} ${n2(y - r * 0.7)}L${n2(x - r * 0.05)} ${n2(y)}L${n2(x - r * 0.75)} ${n2(y + r * 0.7)}M${n2(x + r * 0.05)} ${n2(y - r * 0.7)}L${n2(x + r * 0.75)} ${n2(y)}L${n2(x + r * 0.05)} ${n2(y + r * 0.7)}`, c, r * 0.26) },
  diamond: { fam: "sharp", label: "Facet", why: "a cut facet: precision and value", draw: (x, y, r, c, bg) => P(`M${n2(x)} ${n2(y - r)}L${n2(x + r * 0.85)} ${n2(y)}L${n2(x)} ${n2(y + r)}L${n2(x - r * 0.85)} ${n2(y)}Z`, c) + S(`M${n2(x - r * 0.85)} ${n2(y)}H${n2(x + r * 0.85)}`, bg, r * 0.08) },
  peak: { fam: "sharp", label: "Summit", why: "two peaks: ambition, the climb", draw: (x, y, r, c) => P(`M${n2(x - r)} ${n2(y + r * 0.7)}L${n2(x - r * 0.25)} ${n2(y - r * 0.7)}L${n2(x + r * 0.15)} ${n2(y + r * 0.05)}L${n2(x + r * 0.42)} ${n2(y - r * 0.3)}L${n2(x + r)} ${n2(y + r * 0.7)}Z`, c) },
  bolt: { fam: "sharp", label: "Bolt", why: "a bolt: energy and speed", draw: (x, y, r, c) => P(`M${n2(x + r * 0.15)} ${n2(y - r)}L${n2(x - r * 0.6)} ${n2(y + r * 0.12)}H${n2(x - r * 0.02)}L${n2(x - r * 0.2)} ${n2(y + r)}L${n2(x + r * 0.62)} ${n2(y - r * 0.15)}H${n2(x + r * 0.04)}Z`, c) },
  shield: { fam: "sharp", label: "Shield", why: "a shield: protection, trust", draw: (x, y, r, c) => P(`M${n2(x)} ${n2(y - r)}L${n2(x + r * 0.82)} ${n2(y - r * 0.68)}V${n2(y)}C${n2(x + r * 0.82)} ${n2(y + r * 0.55)} ${n2(x + r * 0.4)} ${n2(y + r * 0.85)} ${n2(x)} ${n2(y + r)}C${n2(x - r * 0.4)} ${n2(y + r * 0.85)} ${n2(x - r * 0.82)} ${n2(y + r * 0.55)} ${n2(x - r * 0.82)} ${n2(y)}V${n2(y - r * 0.68)}Z`, c) },
  seal: { fam: "sharp", label: "Seal", why: "a seal with a tick: proof, certainty", draw: (x, y, r, c, bg) => {
    let d = ""; const n = 12;
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.84 : r; d += `${i ? "L" : "M"}${n2(x + Math.cos(a) * rr)} ${n2(y + Math.sin(a) * rr)}`; }
    return P(d + "Z", c) + S(`M${n2(x - r * 0.35)} ${n2(y + r * 0.02)}L${n2(x - r * 0.08)} ${n2(y + r * 0.3)}L${n2(x + r * 0.4)} ${n2(y - r * 0.28)}`, bg, r * 0.16);
  } },
  ascent: { fam: "sharp", label: "Ascent", why: "an arrow cutting upward: growth", draw: (x, y, r, c) => P(`M${n2(x - r)} ${n2(y + r * 0.8)}L${n2(x + r * 0.3)} ${n2(y - r * 0.5)}V${n2(y - r * 0.05)}H${n2(x + r * 0.8)}V${n2(y - r)}H${n2(x - r * 0.05)}V${n2(y - r * 0.5)}H${n2(x + r * 0.36)}L${n2(x - r * 0.8)} ${n2(y + r)}Z`, c) },
  prism: { fam: "sharp", label: "Prism", why: "a triangle in a ring: clarity", draw: (x, y, r, c) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.92)}" fill="none" stroke="${c}" stroke-width="${n2(r * 0.14)}"/>` + P(`M${n2(x)} ${n2(y - r * 0.55)}L${n2(x + r * 0.5)} ${n2(y + r * 0.35)}H${n2(x - r * 0.5)}Z`, c) },
  // ── geometric
  grid: { fam: "geometric", label: "Grid", why: "four blocks in order: a system", draw: (x, y, r, c) => [[-1, -1], [1, -1], [-1, 1]].map(([a, b]) => `<rect x="${n2(x + a * r * 0.5 - r * 0.42)}" y="${n2(y + b * r * 0.5 - r * 0.42)}" width="${n2(r * 0.84)}" height="${n2(r * 0.84)}" rx="${n2(r * 0.16)}" fill="${c}"/>`).join("") + `<circle cx="${n2(x + r * 0.5)}" cy="${n2(y + r * 0.5)}" r="${n2(r * 0.42)}" fill="${c}"/>` },
  stairs: { fam: "geometric", label: "Steps", why: "steps: progress, one at a time", draw: (x, y, r, c) => P(`M${n2(x - r)} ${n2(y + r)}V${n2(y + r * 0.34)}H${n2(x - r * 0.34)}V${n2(y - r * 0.32)}H${n2(x + r * 0.32)}V${n2(y - r)}H${n2(x + r)}V${n2(y + r)}Z`, c) },
  bars: { fam: "geometric", label: "Rise", why: "bars rising: measurable growth", draw: (x, y, r, c) => [0, 1, 2].map((i) => `<rect x="${n2(x - r + i * r * 0.72)}" y="${n2(y + r - r * (0.7 + i * 0.65))}" width="${n2(r * 0.52)}" height="${n2(r * (0.7 + i * 0.65))}" rx="${n2(r * 0.1)}" fill="${c}"/>`).join("") },
  cube: { fam: "geometric", label: "Cube", why: "a cube: something solid, built", draw: (x, y, r, c, bg) => P(`M${n2(x)} ${n2(y - r)}L${n2(x + r * 0.87)} ${n2(y - r * 0.5)}V${n2(y + r * 0.5)}L${n2(x)} ${n2(y + r)}L${n2(x - r * 0.87)} ${n2(y + r * 0.5)}V${n2(y - r * 0.5)}Z`, c) + S(`M${n2(x - r * 0.87)} ${n2(y - r * 0.5)}L${n2(x)} ${n2(y)}L${n2(x + r * 0.87)} ${n2(y - r * 0.5)}M${n2(x)} ${n2(y)}V${n2(y + r)}`, bg, r * 0.09) },
  frame: { fam: "geometric", label: "Frame", why: "a frame with one corner open: room to build", draw: (x, y, r, c) => P(`M${n2(x - r)} ${n2(y - r)}H${n2(x + r * 0.35)}L${n2(x + r)} ${n2(y - r * 0.35)}V${n2(y + r)}H${n2(x - r)}Z M${n2(x - r * 0.55)} ${n2(y - r * 0.55)}V${n2(y + r * 0.55)}H${n2(x + r * 0.55)}V${n2(y - r * 0.15)}L${n2(x + r * 0.15)} ${n2(y - r * 0.55)}Z`, c).replace("<path", `<path fill-rule="evenodd"`) },
  blocks: { fam: "geometric", label: "Stack", why: "two blocks offset: layers working together", draw: (x, y, r, c, bg) => `<rect x="${n2(x - r)}" y="${n2(y - r)}" width="${n2(r * 1.25)}" height="${n2(r * 1.25)}" rx="${n2(r * 0.14)}" fill="${c}" opacity=".55"/><rect x="${n2(x - r * 0.25)}" y="${n2(y - r * 0.25)}" width="${n2(r * 1.25)}" height="${n2(r * 1.25)}" rx="${n2(r * 0.14)}" fill="${c}"/>` + (bg ? "" : "") },
  slice: { fam: "geometric", label: "Slice", why: "a square with one bold cut: decisive", draw: (x, y, r, c) => P(`M${n2(x - r)} ${n2(y - r)}H${n2(x + r * 0.2)}L${n2(x - r)} ${n2(y + r * 0.2)}Z M${n2(x + r * 0.55)} ${n2(y - r)}H${n2(x + r)}V${n2(y + r)}H${n2(x - r)}V${n2(y + r * 0.55)}Z`, c) },
  pixel: { fam: "geometric", label: "Pixel", why: "a pixel stepping out of line: digital, playful", draw: (x, y, r, c) => [[-1, -1], [0, -1], [-1, 0], [0, 0], [1, 1]].map(([a, b]) => `<rect x="${n2(x + a * r * 0.66 - r * 0.3)}" y="${n2(y + b * r * 0.66 - r * 0.3)}" width="${n2(r * 0.6)}" height="${n2(r * 0.6)}" fill="${c}"/>`).join("") },
  // ── organic
  leaf: { fam: "organic", label: "Leaf", why: "a leaf: natural, alive", draw: (x, y, r, c, bg) => P(`M${n2(x - r * 0.85)} ${n2(y + r * 0.85)}C${n2(x - r * 0.95)} ${n2(y - r * 0.35)} ${n2(x - r * 0.1)} ${n2(y - r)} ${n2(x + r * 0.9)} ${n2(y - r * 0.9)}C${n2(x + r)} ${n2(y + r * 0.1)} ${n2(x + r * 0.3)} ${n2(y + r * 0.95)} ${n2(x - r * 0.85)} ${n2(y + r * 0.85)}Z`, c) + S(`M${n2(x - r * 0.7)} ${n2(y + r * 0.7)}L${n2(x + r * 0.45)} ${n2(y - r * 0.45)}`, bg, r * 0.09) },
  sprout: { fam: "organic", label: "Sprout", why: "a sprout: something growing", draw: (x, y, r, c) => S(`M${n2(x)} ${n2(y + r)}V${n2(y - r * 0.05)}`, c, r * 0.16) + P(`M${n2(x)} ${n2(y)}C${n2(x - r * 0.15)} ${n2(y - r * 0.75)} ${n2(x - r * 0.85)} ${n2(y - r * 0.85)} ${n2(x - r)} ${n2(y - r * 0.45)}C${n2(x - r * 0.75)} ${n2(y + r * 0.02)} ${n2(x - r * 0.25)} ${n2(y + r * 0.05)} ${n2(x)} ${n2(y)}Z`, c) + P(`M${n2(x)} ${n2(y - r * 0.15)}C${n2(x + r * 0.2)} ${n2(y - r * 0.9)} ${n2(x + r * 0.85)} ${n2(y - r)} ${n2(x + r)} ${n2(y - r * 0.6)}C${n2(x + r * 0.7)} ${n2(y - r * 0.1)} ${n2(x + r * 0.25)} ${n2(y - r * 0.08)} ${n2(x)} ${n2(y - r * 0.15)}Z`, c) },
  flame: { fam: "organic", label: "Flame", why: "a flame: warmth and passion", draw: (x, y, r, c) => P(`M${n2(x)} ${n2(y - r)}C${n2(x + r * 0.25)} ${n2(y - r * 0.4)} ${n2(x + r * 0.85)} ${n2(y - r * 0.15)} ${n2(x + r * 0.75)} ${n2(y + r * 0.35)}A${n2(r * 0.76)} ${n2(r * 0.66)} 0 0 1 ${n2(x - r * 0.75)} ${n2(y + r * 0.35)}C${n2(x - r * 0.8)} ${n2(y - r * 0.05)} ${n2(x - r * 0.45)} ${n2(y - r * 0.25)} ${n2(x - r * 0.3)} ${n2(y - r * 0.55)}C${n2(x - r * 0.15)} ${n2(y - r * 0.2)} ${n2(x + r * 0.05)} ${n2(y - r * 0.45)} ${n2(x)} ${n2(y - r)}Z`, c) },
  pebble: { fam: "organic", label: "Pebble", why: "a smooth pebble: calm, handmade", draw: (x, y, r, c) => P(`M${n2(x - r * 0.95)} ${n2(y + r * 0.05)}C${n2(x - r)} ${n2(y - r * 0.7)} ${n2(x + r * 0.2)} ${n2(y - r * 0.95)} ${n2(x + r * 0.8)} ${n2(y - r * 0.45)}C${n2(x + r * 1.1)} ${n2(y - r * 0.1)} ${n2(x + r * 0.85)} ${n2(y + r * 0.85)} ${n2(x)} ${n2(y + r * 0.8)}C${n2(x - r * 0.6)} ${n2(y + r * 0.78)} ${n2(x - r * 0.92)} ${n2(y + r * 0.5)} ${n2(x - r * 0.95)} ${n2(y + r * 0.05)}Z`, c) },
  vessel: { fam: "organic", label: "Vessel", why: "a vessel: made by hand, made to share", draw: (x, y, r, c) => P(`M${n2(x - r * 0.75)} ${n2(y - r * 0.55)}H${n2(x + r * 0.75)}V${n2(y - r * 0.2)}C${n2(x + r * 0.75)} ${n2(y + r * 0.6)} ${n2(x + r * 0.35)} ${n2(y + r)} ${n2(x)} ${n2(y + r)}C${n2(x - r * 0.35)} ${n2(y + r)} ${n2(x - r * 0.75)} ${n2(y + r * 0.6)} ${n2(x - r * 0.75)} ${n2(y - r * 0.2)}Z`, c) + `<rect x="${n2(x - r * 0.9)}" y="${n2(y - r * 0.85)}" width="${n2(r * 1.8)}" height="${n2(r * 0.18)}" rx="${n2(r * 0.09)}" fill="${c}"/>` },
  book: { fam: "organic", label: "Pages", why: "an open book: knowledge, a story", draw: (x, y, r, c) => P(`M${n2(x)} ${n2(y - r * 0.55)}C${n2(x - r * 0.35)} ${n2(y - r * 0.8)} ${n2(x - r * 0.75)} ${n2(y - r * 0.8)} ${n2(x - r)} ${n2(y - r * 0.65)}V${n2(y + r * 0.75)}C${n2(x - r * 0.7)} ${n2(y + r * 0.6)} ${n2(x - r * 0.3)} ${n2(y + r * 0.62)} ${n2(x)} ${n2(y + r * 0.85)}Z`, c) + P(`M${n2(x)} ${n2(y - r * 0.55)}C${n2(x + r * 0.35)} ${n2(y - r * 0.8)} ${n2(x + r * 0.75)} ${n2(y - r * 0.8)} ${n2(x + r)} ${n2(y - r * 0.65)}V${n2(y + r * 0.75)}C${n2(x + r * 0.7)} ${n2(y + r * 0.6)} ${n2(x + r * 0.3)} ${n2(y + r * 0.62)} ${n2(x)} ${n2(y + r * 0.85)}Z`, c).replace(`fill="${c}"`, `fill="${c}" opacity=".7"`) },
  pin: { fam: "organic", label: "Place", why: "a pin: a place, found", draw: (x, y, r, c, bg) => P(`M${n2(x)} ${n2(y + r)}C${n2(x - r * 0.25)} ${n2(y + r * 0.55)} ${n2(x - r * 0.75)} ${n2(y + r * 0.1)} ${n2(x - r * 0.75)} ${n2(y - r * 0.3)}A${n2(r * 0.75)} ${n2(r * 0.75)} 0 0 1 ${n2(x + r * 0.75)} ${n2(y - r * 0.3)}C${n2(x + r * 0.75)} ${n2(y + r * 0.1)} ${n2(x + r * 0.25)} ${n2(y + r * 0.55)} ${n2(x)} ${n2(y + r)}Z`, c) + `<circle cx="${n2(x)}" cy="${n2(y - r * 0.3)}" r="${n2(r * 0.28)}" fill="${bg}"/>` },
  heart: { fam: "organic", label: "Care", why: "a heart, drawn simply: care", draw: (x, y, r, c) => P(`M${n2(x)} ${n2(y + r * 0.9)}C${n2(x - r * 1.2)} ${n2(y)} ${n2(x - r * 0.95)} ${n2(y - r * 1.05)} ${n2(x)} ${n2(y - r * 0.4)}C${n2(x + r * 0.95)} ${n2(y - r * 1.05)} ${n2(x + r * 1.2)} ${n2(y)} ${n2(x)} ${n2(y + r * 0.9)}Z`, c) },
  // ── added 3 Nov (tester: "the choice of symbols is very limited")
  sunburst: { fam: "round", label: "Sunburst", why: "a sun with its rays: warmth, optimism", draw: (x, y, r, c) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.42)}" fill="${c}"/>` + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="${n2(x - r * 0.07)}" y="${n2(y - r)}" width="${n2(r * 0.14)}" height="${n2(r * 0.3)}" rx="${n2(r * 0.07)}" fill="${c}" transform="rotate(${a} ${n2(x)} ${n2(y)})"/>`).join("") },
  ring: { fam: "round", label: "Ring", why: "a single bold ring: whole, complete", draw: (x, y, r, c) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.74)}" fill="none" stroke="${c}" stroke-width="${n2(r * 0.34)}"/>` },
  trio: { fam: "round", label: "Trio", why: "three dots together: a small team, a community", draw: (x, y, r, c) => [[0, -0.5], [-0.52, 0.4], [0.52, 0.4]].map(([a, b]) => `<circle cx="${n2(x + a * r)}" cy="${n2(y + b * r)}" r="${n2(r * 0.4)}" fill="${c}"/>`).join("") },
  eye: { fam: "round", label: "Vision", why: "an open eye: insight, seeing clearly", draw: (x, y, r, c, bg) => P(`M${n2(x - r)} ${n2(y)}Q${n2(x)} ${n2(y - r * 1.05)} ${n2(x + r)} ${n2(y)}Q${n2(x)} ${n2(y + r * 1.05)} ${n2(x - r)} ${n2(y)}Z`, c) + `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.34)}" fill="${bg}"/><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.16)}" fill="${c}"/>` },
  bridge: { fam: "round", label: "Bridge", why: "a bridge: connecting two sides", draw: (x, y, r, c) => S(`M${n2(x - r)} ${n2(y + r * 0.55)}H${n2(x + r)}`, c, r * 0.16) + S(`M${n2(x - r * 0.8)} ${n2(y + r * 0.55)}V${n2(y)}A${n2(r * 0.8)} ${n2(r * 0.8)} 0 0 1 ${n2(x + r * 0.8)} ${n2(y)}V${n2(y + r * 0.55)}`, c, r * 0.16) + S(`M${n2(x)} ${n2(y - r * 0.8)}V${n2(y + r * 0.55)}`, c, r * 0.12) },
  dial: { fam: "round", label: "Dial", why: "a dial: time, measure, control", draw: (x, y, r, c) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.86)}" fill="none" stroke="${c}" stroke-width="${n2(r * 0.15)}"/>` + S(`M${n2(x)} ${n2(y)}V${n2(y - r * 0.5)}M${n2(x)} ${n2(y)}L${n2(x + r * 0.35)} ${n2(y + r * 0.2)}`, c, r * 0.15) },
  cloud: { fam: "round", label: "Cloud", why: "a soft cloud: light, always there", draw: (x, y, r, c) => P(`M${n2(x - r * 0.62)} ${n2(y + r * 0.5)}A${n2(r * 0.4)} ${n2(r * 0.4)} 0 0 1 ${n2(x - r * 0.58)} ${n2(y - r * 0.28)}A${n2(r * 0.55)} ${n2(r * 0.55)} 0 0 1 ${n2(x + r * 0.42)} ${n2(y - r * 0.3)}A${n2(r * 0.42)} ${n2(r * 0.42)} 0 0 1 ${n2(x + r * 0.6)} ${n2(y + r * 0.5)}Z`, c) },
  star: { fam: "sharp", label: "Star", why: "a five-point star: excellence", draw: (x, y, r, c) => { let d = ""; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.42 : r; d += `${i ? "L" : "M"}${n2(x + Math.cos(a) * rr)} ${n2(y + Math.sin(a) * rr)}`; } return P(d + "Z", c); } },
  north: { fam: "sharp", label: "North", why: "a compass star: direction, guidance", draw: (x, y, r, c) => { let d = ""; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.2 : i % 4 === 0 ? r : r * 0.55; d += `${i ? "L" : "M"}${n2(x + Math.cos(a) * rr)} ${n2(y + Math.sin(a) * rr)}`; } return P(d + "Z", c); } },
  play: { fam: "sharp", label: "Play", why: "a play button: press start", draw: (x, y, r, c) => P(`M${n2(x - r * 0.55)} ${n2(y - r * 0.85)}L${n2(x + r * 0.85)} ${n2(y)}L${n2(x - r * 0.55)} ${n2(y + r * 0.85)}Z`, c) },
  crown: { fam: "sharp", label: "Crown", why: "a crown: the best of its kind", draw: (x, y, r, c) => P(`M${n2(x - r)} ${n2(y - r * 0.55)}L${n2(x - r * 0.5)} ${n2(y + r * 0.05)}L${n2(x)} ${n2(y - r * 0.75)}L${n2(x + r * 0.5)} ${n2(y + r * 0.05)}L${n2(x + r)} ${n2(y - r * 0.55)}V${n2(y + r * 0.45)}H${n2(x - r)}Z`, c) + `<rect x="${n2(x - r)}" y="${n2(y + r * 0.6)}" width="${n2(r * 2)}" height="${n2(r * 0.22)}" rx="${n2(r * 0.08)}" fill="${c}"/>` },
  gem: { fam: "sharp", label: "Gem", why: "a cut gem: rare and precious", draw: (x, y, r, c, bg) => P(`M${n2(x - r * 0.55)} ${n2(y - r * 0.7)}H${n2(x + r * 0.55)}L${n2(x + r)} ${n2(y - r * 0.2)}L${n2(x)} ${n2(y + r * 0.9)}L${n2(x - r)} ${n2(y - r * 0.2)}Z`, c) + S(`M${n2(x - r)} ${n2(y - r * 0.2)}H${n2(x + r)}M${n2(x - r * 0.3)} ${n2(y - r * 0.2)}L${n2(x)} ${n2(y + r * 0.85)}L${n2(x + r * 0.3)} ${n2(y - r * 0.2)}`, bg, r * 0.07) },
  pulse: { fam: "sharp", label: "Pulse", why: "a heartbeat line: alive, measured", draw: (x, y, r, c) => S(`M${n2(x - r)} ${n2(y + r * 0.1)}H${n2(x - r * 0.45)}L${n2(x - r * 0.2)} ${n2(y - r * 0.7)}L${n2(x + r * 0.15)} ${n2(y + r * 0.75)}L${n2(x + r * 0.4)} ${n2(y + r * 0.1)}H${n2(x + r)}`, c, r * 0.17) },
  arrow: { fam: "sharp", label: "Go", why: "an arrow out of a circle: going further", draw: (x, y, r, c) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.88)}" fill="none" stroke="${c}" stroke-width="${n2(r * 0.14)}"/>` + S(`M${n2(x - r * 0.35)} ${n2(y + r * 0.35)}L${n2(x + r * 0.35)} ${n2(y - r * 0.35)}M${n2(x - r * 0.15)} ${n2(y - r * 0.38)}H${n2(x + r * 0.38)}V${n2(y + r * 0.15)}`, c, r * 0.16) },
  kite: { fam: "sharp", label: "Kite", why: "a kite in the wind: lift, lightness", draw: (x, y, r, c, bg) => P(`M${n2(x)} ${n2(y - r)}L${n2(x + r * 0.62)} ${n2(y - r * 0.15)}L${n2(x)} ${n2(y + r)}L${n2(x - r * 0.62)} ${n2(y - r * 0.15)}Z`, c) + S(`M${n2(x)} ${n2(y - r)}V${n2(y + r)}M${n2(x - r * 0.62)} ${n2(y - r * 0.15)}H${n2(x + r * 0.62)}`, bg, r * 0.07) },
  hex: { fam: "geometric", label: "Hex", why: "a hexagon: strong, efficient structure", draw: (x, y, r, c, bg) => { let d = ""; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; d += `${i ? "L" : "M"}${n2(x + Math.cos(a) * r)} ${n2(y + Math.sin(a) * r)}`; } return P(d + "Z", c) + `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.3)}" fill="${bg}"/>`; } },
  plus: { fam: "geometric", label: "Plus", why: "a plus: care added, something more", draw: (x, y, r, c) => P(`M${n2(x - r * 0.3)} ${n2(y - r)}H${n2(x + r * 0.3)}V${n2(y - r * 0.3)}H${n2(x + r)}V${n2(y + r * 0.3)}H${n2(x + r * 0.3)}V${n2(y + r)}H${n2(x - r * 0.3)}V${n2(y + r * 0.3)}H${n2(x - r)}V${n2(y - r * 0.3)}H${n2(x - r * 0.3)}Z`, c) },
  house: { fam: "geometric", label: "Home", why: "a simple house: home, belonging", draw: (x, y, r, c, bg) => P(`M${n2(x)} ${n2(y - r)}L${n2(x + r * 0.9)} ${n2(y - r * 0.15)}V${n2(y + r * 0.9)}H${n2(x - r * 0.9)}V${n2(y - r * 0.15)}Z`, c) + `<rect x="${n2(x - r * 0.22)}" y="${n2(y + r * 0.3)}" width="${n2(r * 0.44)}" height="${n2(r * 0.6)}" rx="${n2(r * 0.08)}" fill="${bg}"/>` },
  window: { fam: "geometric", label: "Window", why: "four panes: a view onto something", draw: (x, y, r, c) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => `<rect x="${n2(x + (a < 0 ? -r : r * 0.08))}" y="${n2(y + (b < 0 ? -r : r * 0.08))}" width="${n2(r * 0.92)}" height="${n2(r * 0.92)}" rx="${n2(r * 0.12)}" fill="${c}"/>`).join("") },
  quarter: { fam: "geometric", label: "Quarters", why: "four quarter-circles: modular, playful order", draw: (x, y, r, c) => P(`M${n2(x - r)} ${n2(y)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(x)} ${n2(y - r)}V${n2(y)}Z M${n2(x + r)} ${n2(y)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(x)} ${n2(y + r)}V${n2(y)}Z`, c) + P(`M${n2(x + r * 0.08)} ${n2(y - r * 0.08)}V${n2(y - r)}H${n2(x + r)}V${n2(y - r * 0.08)}Z M${n2(x - r * 0.08)} ${n2(y + r * 0.08)}V${n2(y + r)}H${n2(x - r)}V${n2(y + r * 0.08)}Z`, c).replace(`fill="${c}"`, `fill="${c}" opacity=".45"`) },
  stripes: { fam: "geometric", label: "Stripes", why: "three bold stripes: rhythm and pace", draw: (x, y, r, c) => [-0.62, 0, 0.62].map((o) => `<rect x="${n2(x + o * r - r * 0.18)}" y="${n2(y - r)}" width="${n2(r * 0.36)}" height="${n2(r * 2)}" rx="${n2(r * 0.18)}" fill="${c}" transform="rotate(20 ${n2(x)} ${n2(y)})"/>`).join("") },
  node: { fam: "geometric", label: "Network", why: "connected nodes: a network that links people and data", draw: (x, y, r, c) => S(`M${n2(x - r * 0.65)} ${n2(y + r * 0.5)}L${n2(x)} ${n2(y - r * 0.55)}L${n2(x + r * 0.65)} ${n2(y + r * 0.5)}Z`, c, r * 0.12) + [[-0.65, 0.5], [0, -0.55], [0.65, 0.5]].map(([a, b]) => `<circle cx="${n2(x + a * r)}" cy="${n2(y + b * r)}" r="${n2(r * 0.3)}" fill="${c}"/>`).join("") },
  keyhole: { fam: "geometric", label: "Keyhole", why: "a keyhole: access, something kept safe", draw: (x, y, r, c, bg) => `<rect x="${n2(x - r * 0.85)}" y="${n2(y - r * 0.85)}" width="${n2(r * 1.7)}" height="${n2(r * 1.7)}" rx="${n2(r * 0.4)}" fill="${c}"/><circle cx="${n2(x)}" cy="${n2(y - r * 0.15)}" r="${n2(r * 0.26)}" fill="${bg}"/>` + P(`M${n2(x - r * 0.12)} ${n2(y)}H${n2(x + r * 0.12)}L${n2(x + r * 0.2)} ${n2(y + r * 0.45)}H${n2(x - r * 0.2)}Z`, bg) },
  pine: { fam: "organic", label: "Pine", why: "an evergreen: steady, lasting growth", draw: (x, y, r, c) => P(`M${n2(x)} ${n2(y - r)}L${n2(x + r * 0.55)} ${n2(y - r * 0.25)}H${n2(x + r * 0.3)}L${n2(x + r * 0.8)} ${n2(y + r * 0.5)}H${n2(x - r * 0.8)}L${n2(x - r * 0.3)} ${n2(y - r * 0.25)}H${n2(x - r * 0.55)}Z`, c) + `<rect x="${n2(x - r * 0.1)}" y="${n2(y + r * 0.5)}" width="${n2(r * 0.2)}" height="${n2(r * 0.45)}" fill="${c}"/>` },
  spiral: { fam: "organic", label: "Spiral", why: "a spiral shell: natural growth, depth", draw: (x, y, r, c) => { let d = ""; for (let i = 0; i <= 60; i++) { const t = (i / 60) * Math.PI * 4.2; const rr = r * 0.08 + (r * 0.84 * i) / 60; d += `${i ? "L" : "M"}${n2(x + Math.cos(t) * rr)} ${n2(y + Math.sin(t) * rr)}`; } return S(d, c, r * 0.15); } },
  cup: { fam: "organic", label: "Cup", why: "a warm cup: a pause, hospitality", draw: (x, y, r, c) => P(`M${n2(x - r * 0.8)} ${n2(y - r * 0.35)}H${n2(x + r * 0.5)}V${n2(y + r * 0.3)}A${n2(r * 0.55)} ${n2(r * 0.55)} 0 0 1 ${n2(x - r * 0.25)} ${n2(y + r * 0.85)}H${n2(x - r * 0.05)}A${n2(r * 0.75)} ${n2(r * 0.55)} 0 0 1 ${n2(x - r * 0.8)} ${n2(y + r * 0.3)}Z`, c) + S(`M${n2(x + r * 0.5)} ${n2(y - r * 0.15)}H${n2(x + r * 0.7)}A${n2(r * 0.25)} ${n2(r * 0.25)} 0 0 1 ${n2(x + r * 0.7)} ${n2(y + r * 0.35)}H${n2(x + r * 0.45)}`, c, r * 0.13) + S(`M${n2(x - r * 0.4)} ${n2(y - r * 0.6)}q${n2(r * 0.12)} ${n2(-r * 0.2)} 0 ${n2(-r * 0.38)}M${n2(x)} ${n2(y - r * 0.6)}q${n2(r * 0.12)} ${n2(-r * 0.2)} 0 ${n2(-r * 0.38)}`, c, r * 0.1) },
  anchor: { fam: "organic", label: "Anchor", why: "an anchor: steady, dependable", draw: (x, y, r, c) => `<circle cx="${n2(x)}" cy="${n2(y - r * 0.7)}" r="${n2(r * 0.2)}" fill="none" stroke="${c}" stroke-width="${n2(r * 0.12)}"/>` + S(`M${n2(x)} ${n2(y - r * 0.5)}V${n2(y + r * 0.9)}M${n2(x - r * 0.4)} ${n2(y - r * 0.2)}H${n2(x + r * 0.4)}M${n2(x - r * 0.85)} ${n2(y + r * 0.25)}Q${n2(x - r * 0.75)} ${n2(y + r * 0.9)} ${n2(x)} ${n2(y + r * 0.9)}Q${n2(x + r * 0.75)} ${n2(y + r * 0.9)} ${n2(x + r * 0.85)} ${n2(y + r * 0.25)}`, c, r * 0.14) },
  feather: { fam: "organic", label: "Feather", why: "a feather: light touch, freedom", draw: (x, y, r, c, bg) => P(`M${n2(x + r * 0.75)} ${n2(y - r)}C${n2(x - r * 0.2)} ${n2(y - r * 0.8)} ${n2(x - r * 0.85)} ${n2(y)} ${n2(x - r * 0.6)} ${n2(y + r * 0.6)}C${n2(x)} ${n2(y + r * 0.5)} ${n2(x + r * 0.7)} ${n2(y)} ${n2(x + r * 0.75)} ${n2(y - r)}Z`, c) + S(`M${n2(x - r * 0.85)} ${n2(y + r)}L${n2(x + r * 0.5)} ${n2(y - r * 0.6)}`, bg, r * 0.08) + S(`M${n2(x - r * 0.85)} ${n2(y + r)}L${n2(x - r * 0.55)} ${n2(y + r * 0.62)}`, c, r * 0.1) },
  hand: { fam: "organic", label: "Hands", why: "two cupped hands: holding something with care", draw: (x, y, r, c) => P(`M${n2(x - r)} ${n2(y - r * 0.1)}C${n2(x - r)} ${n2(y + r * 0.7)} ${n2(x - r * 0.4)} ${n2(y + r * 0.9)} ${n2(x - r * 0.06)} ${n2(y + r * 0.9)}V${n2(y + r * 0.35)}C${n2(x - r * 0.5)} ${n2(y + r * 0.35)} ${n2(x - r * 0.72)} ${n2(y + r * 0.1)} ${n2(x - r * 0.72)} ${n2(y - r * 0.1)}Z`, c) + P(`M${n2(x + r)} ${n2(y - r * 0.1)}C${n2(x + r)} ${n2(y + r * 0.7)} ${n2(x + r * 0.4)} ${n2(y + r * 0.9)} ${n2(x + r * 0.06)} ${n2(y + r * 0.9)}V${n2(y + r * 0.35)}C${n2(x + r * 0.5)} ${n2(y + r * 0.35)} ${n2(x + r * 0.72)} ${n2(y + r * 0.1)} ${n2(x + r * 0.72)} ${n2(y - r * 0.1)}Z`, c) + `<circle cx="${n2(x)}" cy="${n2(y - r * 0.4)}" r="${n2(r * 0.32)}" fill="${c}"/>` },
};

// The brief's sector → the marks that speak it (first match wins a head start).
const SECTOR_SYMS: [RegExp, string[]][] = [
  [/verif|trust|certif|compliance|legal|law|notar|audit|attest|insur|secur|safe|guard|protect/i, ["seal", "shield", "keyhole", "prism", "frame", "eye"]],
  [/bank|financ|pay|fintech|invest|account|money|wealth|capital|fund|crypto|tax/i, ["bars", "split", "stairs", "shield", "dial", "hex"]],
  [/\bai\b|software|saas|app\b|tech|data|cloud|platform|automat|code|dev|api|digital|\bpos\b|point of sale|ipad|tool/i, ["node", "spark", "grid", "pulse", "orbit", "pixel", "hex", "cloud"]],
  [/restaurant|food|caf[eé]|coffee|bak|kitchen|chef|dining|bistro|bar\b|wine|brew|cater|pizza|seafood|deli/i, ["cup", "vessel", "flame", "leaf", "sunburst", "pebble"]],
  [/ceramic|pottery|craft|handmade|studio|atelier|maker|design|art|furniture/i, ["vessel", "pebble", "arch", "spiral", "hand", "frame"]],
  [/health|care|clinic|wellness|therapy|medic|fitness|yoga|mental|nutrition|spa/i, ["plus", "pulse", "heart", "hand", "leaf", "drop", "bloom"]],
  [/beauty|skin|cosmet|fashion|jewel|salon|perfume|luxury/i, ["gem", "bloom", "diamond", "drop", "crescent", "feather", "crown"]],
  [/eco|green|garden|plant|farm|organic|sustain|nature|climate|solar/i, ["leaf", "sprout", "pine", "sunburst", "rise", "drop"]],
  [/energy|power|electric|battery|charge|fast|speed/i, ["bolt", "sunburst", "spark", "ascent", "pulse", "rise"]],
  [/travel|tour|trip|hotel|holiday|outdoor|adventure|hike|mountain|surf/i, ["peak", "north", "pin", "kite", "wave", "pine", "orbit"]],
  [/sea|ocean|water|marine|boat|sail|beach|swim|fish/i, ["wave", "anchor", "drop", "spiral", "crescent", "rise"]],
  [/home|house|real estate|property|interior|architect|build|construct/i, ["house", "keyhole", "window", "arch", "frame", "blocks", "cube"]],
  [/learn|school|educat|course|tutor|teach|book|publish|library/i, ["book", "stairs", "feather", "spark", "bubble", "star"]],
  [/community|social|dating|friend|network|event|club|meet/i, ["trio", "venn", "bubble", "bridge", "heart", "loop"]],
  [/logistic|deliver|ship|transport|move|courier|supply/i, ["chevron", "arrow", "cube", "ascent", "north", "loop"]],
  [/market|agency|brand|media|creative|content|ads|growth/i, ["target", "play", "star", "spark", "chevron", "ascent", "eye"]],
  [/film|cinema|video|music|audio|stream|podcast|media|photo|camera|studio/i, ["play", "eye", "star", "wave", "dial"]],
  [/clean|wash|laundry|soap|bath|candle|hygien/i, ["drop", "wave", "sunburst", "bloom", "cloud", "spiral"]],
  [/hair|barber|lash|nail|brow/i, ["feather", "gem", "crown", "bloom", "crescent"]],
  [/kid|child|toy|game|play/i, ["star", "bloom", "kite", "pixel", "sprout", "bubble"]],
];
// Symbols that picture a real object: shown only when the brief is in their sector.
const LITERAL = new Set(["cup", "vessel", "flame", "leaf", "sprout", "pine", "house", "window", "keyhole", "book", "anchor", "crown", "gem", "plus", "heart", "drop", "feather", "hand", "pin", "play", "cloud", "bolt", "shield", "seal"]);
const FAM_ORDER: Record<string, SymFamily[]> = {
  round: ["round", "organic", "geometric", "sharp"], sharp: ["sharp", "geometric", "round", "organic"],
  geometric: ["geometric", "sharp", "round", "organic"], organic: ["organic", "round", "geometric", "sharp"],
};
const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export const LAYOUT_TITLE: Record<string, string> = {
  side: "Mark & name", stack: "Stacked", word: "Wordmark", emblem: "Emblem", mono: "Monogram",
  swap: "Letter mark", pill: "Badge", split: "Lockup", icon: "App icon",
};
/** The nine logos for this brand (seed = "Show nine more"). */
// Twelve logos per batch (handoff concept-D v2). bumps[i] = how many times tile i's
// "↻ More" was tapped: it keeps the layout and moves the symbol and the font on.
export function logoConceptsX(name: string, brief: string, taste: { type?: string; shape?: string; feeling?: string[] }, seed = 0, bumps: Record<number, number> = {}): LogoConcept[] {
  const h = hashStr((name || "") + "|" + brief.slice(0, 40));
  const pool = symbolPool(name, brief, taste);
  // Each batch takes the next 10 symbols not yet shown: no repeats inside a
  // batch, nothing reshown until every symbol has had its turn.
  const per = 10, batches = Math.max(1, Math.floor(pool.length / per));
  const bi = seed % batches, lap = Math.floor(seed / batches);
  const syms = pool.slice(bi * per, bi * per + per);
  // Fonts: with a type pick, only that family (its own 3 lead). Without one
  // (the taste is just feel + colours), the 12 tiles ARE the type choice:
  // the four type families that suit the feel, interleaved.
  let fOrder: number[];
  if (taste.type) {
    const own = TYPE_FONTS[taste.type] || TYPE_FONTS["Clean sans"];
    const fam = [...new Set([...own, ...(TYPE_FAMILY[taste.type] || TYPE_FAMILY["Clean sans"])])];
    fOrder = [...own, ...fam.filter((f) => !own.includes(f))];
  } else {
    const types = FEEL_TYPES[(taste.feeling || [])[0] || ""] || FEEL_TYPES["Soft & warm"];
    const lists = types.map((t) => TYPE_FONTS[t]);
    fOrder = [0, 1, 2].flatMap((k) => lists.map((l) => l[k]));
  }
  const fShift = (seed * 5 + (h % 3)) % fOrder.length;
  const fontAt = (k: number) => fOrder[(k + fShift) % fOrder.length];
  const calm = (taste.feeling || []).includes("Calm & minimal"), bold = (taste.feeling || []).some((f) => f === "Bold & bright" || f === "Playful");
  const caseOf = (fi: number, i: number) => (X_FONTS[fi].caps ? "u" : calm && i % 3 === 1 ? "l" : bold && i % 4 === 3 ? "u" : "n");
  // 12 tiles: 10 with a symbol (each a different one), a wordmark and a
  // monogram. The letter-swap layout is gone (testers found it odd).
  const plan: [string, number][] = [ // layout, symbol slot (-1 = none)
    ["side", 0], ["stack", 1], ["word", -1], ["emblem", 2], ["pill", 3], ["split", 4],
    ["mono", -1], ["side", 5], ["stack", 6], ["split", 7], ["side", 8], ["icon", 9],
  ];
  const lays = [...plan.slice(0, 11).map((_, i, a) => a[(i + seed + lap) % 11]), plan[11]];
  const ACC: Accent[] = ["dawn", "haze", "nova"];
  return lays.map(([lay, si], i) => {
    const b = bumps[i] || 0;
    // "↻ More" on a tile: same layout, a symbol from outside this batch, the next font.
    const base = si < 0 ? "none" : syms[si % syms.length] || pool[si % pool.length];
    const sym = si < 0 || !b ? base : pool[(pool.indexOf(base) + per * b + i) % pool.length];
    const f = fontAt(i + b * 3 + lap);
    const key = `x:${lay}:${sym}:${f}:${caseOf(f, i)}`;
    // one pattern for every tile: what the mark is · how it's laid out
    const title = lay === "word" ? "Name only · Wordmark" : lay === "mono" ? "Initial · Monogram" : `${X_SYMS[sym]?.label || "Mark"} · ${LAYOUT_TITLE[lay]}`;
    return { key, title, accent: ACC[(i + seed) % 3], seed };
  });
}
/** Every symbol, in this brand's order: the sector's marks, then the shape
 *  family's, then the rest (each list rotated by the name, so two brands in
 *  the same sector don't open on the same marks). */
export function symbolPool(name: string, brief: string, taste: { shape?: string }): string[] {
  const h = hashStr((name || "") + "|" + (brief || "").slice(0, 40));
  const fam = (taste.shape === "Sharp & angular" ? "sharp" : taste.shape === "Organic" ? "organic" : taste.shape === "Geometric" ? "geometric" : "round") as SymFamily;
  const hits = SECTOR_SYMS.filter(([re]) => re.test(brief || ""));
  // A tool FOR a sector (software, a POS, an app) isn't that sector: its own
  // marks lead, the sector's literal objects (a cup for a restaurant POS) don't.
  const tool = hits.find(([, l]) => l.includes("node"));
  const own = tool ? tool[1] : [...new Set(hits.flatMap(([, l]) => l))];
  const allowed = new Set(tool ? own : hits.flatMap(([, l]) => l));
  const sector = own;
  const rot = <T,>(arr: T[], k: number): T[] => arr.map((_, i) => arr[(i + k) % arr.length]);
  // Literal objects only ever appear for a brief in their own sector.
  const byFam = FAM_ORDER[fam].map((f) => { const l = Object.keys(X_SYMS).filter((k) => X_SYMS[k].fam === f && (!LITERAL.has(k) || allowed.has(k))); return rot(l, h % Math.max(1, l.length)); });
  return [...new Set([...rot(sector, h % Math.max(1, sector.length)), ...byFam[0], ...byFam[1], ...byFam[2], ...byFam[3]])];
}
/** How many fresh batches of twelve this brand has before they repeat. */
export function logoBatches(name: string, brief: string, taste: { shape?: string }): number {
  return Math.max(1, Math.floor(symbolPool(name, brief, taste).length / 10));
}
export function whyItWorksX(key: string, name: string): string {
  const [, lay, sym, fi] = key.split(":");
  const s = X_SYMS[sym], f = X_FONTS[Number(fi)] || X_FONTS[9];
  const face = `${f.f}${f.serif ? ", a serif with character" : f.caps ? ", strong capitals" : ", a clean, modern face"}`;
  const L: Record<string, string> = {
    side: `The mark sits beside ${name}, so the pair works in a header, on a card, on a sign.`,
    stack: `Mark above, name below: a centred lockup made for packaging, social and print.`,
    word: `No symbol, just ${name} set carefully: the name does all the work, and it stays readable at any size.`,
    emblem: `${name} held inside a single emblem: one shape you can stamp, stitch or print anywhere.`,
    mono: `The initial, set in ${f.f} on a solid shape: instantly recognisable as an avatar, a favicon, a stamp.`,
    swap: `The mark takes the place of a letter in ${name}: the story told inside the name itself.`,
    pill: `${name} on a solid badge in your colour: confident, and it reads from across a room.`,
    split: `Mark, a fine rule, then the name: an assured lockup with the calm of a masthead.`,
    icon: `Square and bold, made for the home screen and the browser tab.`,
  };
  return `${L[lay] || L.side}${s && sym !== "none" ? ` The mark is ${s.why}.` : ""} Set in ${face}.`;
}

// Measure a word in its real font (canvas) once that font has loaded; until then
// estimate from the font's average glyph width. The app re-renders on font load.
let measureCtx: CanvasRenderingContext2D | null = null;
function measureText(t: string, fam: string, weight: number, size: number, spacing: number, estWf: number): number {
  const est = t.length * size * estWf + Math.max(0, t.length - 1) * spacing;
  try {
    if (typeof document === "undefined" || !(document as any).fonts?.check?.(`${weight} ${size}px '${fam}'`)) return est;
    measureCtx = measureCtx || document.createElement("canvas").getContext("2d");
    if (!measureCtx) return est;
    measureCtx.font = `${weight} ${size}px '${fam}'`;
    return measureCtx.measureText(t).width + Math.max(0, t.length - 1) * spacing;
  } catch { return est; }
}
const TILE_BG = "#010203"; // stands for the tile's own background (a CSS variable) in the app

function renderX(key: string, name0: string, pal: Palette, o: { variant: LogoVariant; accent: string; H: number; shape: LogoShape; famOverride?: string; famWeight?: number }): string {
  const [, lay, symK, fiS, cs, scS, spS] = key.split(":");
  const symScale = Math.min(1.35, Math.max(0.65, Number(scS) || 1)); // personalisation: symbol size
  const f = X_FONTS[Number(fiS)] || X_FONTS[9];
  const fam = o.famOverride || f.f;
  ensureFonts([{ family: fam, weight: o.famOverride ? o.famWeight || 600 : f.w }]);
  const v = o.variant;
  const isDark = v === "night" || v === "tile";
  const fg = v === "mono" ? pal.night : isDark ? "#ffffff" : pal.night;
  const acc = v === "mono" ? fg : o.accent;
  const bgCol = v === "night" ? pal.night : v === "tile" ? TILE_BG : v === "dawn" ? pal.haze : "#ffffff";
  const sym = X_SYMS[symK];
  const text = cs === "u" ? name0.toUpperCase() : cs === "l" ? name0.toLowerCase() : name0;
  const fallback = f.serif ? SERIF : FONT;
  const ff = `'${fam}',${fallback}`;
  const fs = 46;
  // personalisation: letter spacing in % of the size (key part 7, e.g. "-3")
  const sp = ((f.sp || (cs === "u" ? 0.06 : -0.015)) + Math.max(-0.08, Math.min(0.2, (Number(spS) || 0) / 100))) * fs;
  const wf = o.famOverride ? 0.6 : f.wf * (cs === "u" ? 1.12 : 1);
  const fw = o.famOverride ? o.famWeight || 600 : f.w;
  const tw = (t: string, size: number, space = sp) => Math.max(size * 0.5, measureText(t, fam, fw, size, space * (size / fs), wf));
  const word = (x: number, y: number, size: number, opts: { anchor?: string; color?: string; t?: string } = {}) =>
    `<text x="${n2(x)}" y="${n2(y)}" font-family="${ff}" font-size="${n2(size)}" font-weight="${o.famOverride ? o.famWeight || 600 : f.w}" letter-spacing="${n2(sp * (size / fs))}"${f.italic ? ` font-style="italic"` : ""} fill="${opts.color || fg}"${opts.anchor ? ` text-anchor="${opts.anchor}"` : ""}>${esc(opts.t ?? text)}</text>`;
  const defs = `<defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.dawn}"/><stop offset=".5" stop-color="${pal.haze}"/><stop offset="1" stop-color="${pal.nova}"/></linearGradient></defs>`;
  const tileFix = (svg: string) => svg.split(`fill="${TILE_BG}"`).join(`style="fill:var(--surface3,#1c1c1c)"`).split(`stroke="${TILE_BG}"`).join(`style="stroke:var(--surface3,#1c1c1c)"`);
  const wrap = (w: number, h: number, inner: string) => tileFix(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n2(w)} ${n2(h)}" width="${n2((w / h) * o.H)}" height="${o.H}">${defs}` +
    (v === "night" ? `<rect width="${n2(w)}" height="${n2(h)}" fill="${pal.night}"/>` : v === "dawn" ? `<rect width="${n2(w)}" height="${n2(h)}" rx="18" fill="url(#dg)"/>` : "") + inner + `</svg>`);
  const mark = (cx: number, cy: number, r: number, c = acc, bg = bgCol) => (sym ? sym.draw(cx, cy, r * symScale, c, bg) : "");
  const pad = 30;
  const rxf = o.shape === "sharp" ? 0.08 : o.shape === "geometric" ? 0.14 : o.shape === "organic" ? 0.32 : 0.24;

  if (lay === "icon" || v === "icon") {
    const S0 = 220;
    const tileBg = v === "mono" ? "#ffffff" : pal.night;
    const markC = v === "mono" ? pal.night : acc;
    const inner = sym
      ? mark(S0 / 2, S0 / 2, S0 * 0.27, markC, tileBg)
      : `<text x="${S0 / 2}" y="${S0 * 0.64}" text-anchor="middle" font-family="${ff}" font-size="${S0 * 0.44}" font-weight="${f.w}" fill="${markC}">${esc((name0[0] || "A").toUpperCase())}</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S0} ${S0}" width="${o.H}" height="${o.H}">${defs}<rect width="${S0}" height="${S0}" rx="${n2(S0 * rxf)}" fill="${tileBg}"${v === "mono" ? ` stroke="rgba(0,0,0,.12)" stroke-width="2"` : ""}/>${inner}</svg>`;
  }
  switch (lay) {
    case "stack": {
      const w = Math.max(tw(text, fs), 120) + pad * 2, cx = w / 2;
      return wrap(w, 196, mark(cx, 58, 30) + word(cx, 158, fs, { anchor: "middle" }));
    }
    case "word": {
      const w = tw(text, fs * 1.1) + pad * 2;
      return wrap(w, 130, word(w / 2, 82, fs * 1.1, { anchor: "middle" }) + `<rect x="${n2(w / 2 - 14)}" y="102" width="28" height="4" rx="2" fill="${acc}"/>`);
    }
    case "emblem": {
      const S0 = 220, cx = S0 / 2;
      const small = Math.min(46, Math.max(18, 40 * (S0 * 0.68) / Math.max(1, tw(text, 40))));
      return wrap(S0, S0, `<circle cx="${cx}" cy="${cx}" r="${cx - 8}" fill="none" stroke="${acc}" stroke-width="5"/>` +
        mark(cx, 82, 28) + word(cx, 146 + small * 0.2, small, { anchor: "middle" }));
    }
    case "mono": {
      const S0 = 190, cx = S0 / 2;
      const L0 = (name0[0] || "A").toUpperCase();
      const shapeD = o.shape === "sharp" || o.shape === "geometric"
        ? `<rect x="${cx - 74}" y="${cx - 74}" width="148" height="148" rx="${n2(148 * rxf)}" fill="${acc}"/>`
        : `<circle cx="${cx}" cy="${cx}" r="76" fill="${acc}"/>`;
      return wrap(S0, S0, shapeD +
        `<text x="${cx}" y="${cx + 30}" text-anchor="middle" font-family="${ff}" font-size="86" font-weight="${fw}" fill="${v === "mono" ? "#ffffff" : pal.night}">${esc(L0)}</text>`);
    }
    case "swap": {
      // the mark replaces one inner letter (a vowel if possible)
      const mv = midVowel(text);
      const i = mv.i > 0 ? mv.i : Math.min(text.length - 1, Math.max(1, Math.floor(text.length / 2)));
      const a = text.slice(0, i), b = text.slice(i + 1);
      const r = fs * 0.34;
      const wa = tw(a, fs), wb = tw(b, fs);
      const w = wa + r * 2 + 10 + wb + pad * 2;
      return wrap(w, 140, word(pad, 90, fs, { t: a }) + mark(pad + wa + 5 + r, 90 - fs * 0.33, r) + word(pad + wa + r * 2 + 10, 90, fs, { t: b }));
    }
    case "pill": {
      const tw0 = tw(text, fs * 0.9);
      const w = tw0 + 70 + pad * 2, h = 130;
      const onAcc = v === "mono" ? "#ffffff" : pal.night;
      return wrap(w, h, `<rect x="${pad - 6}" y="26" width="${n2(w - (pad - 6) * 2)}" height="78" rx="${n2(78 * Math.max(rxf, 0.12) * 2)}" fill="${acc}"/>` +
        mark(pad + 30, 65, 18, onAcc, acc) + word(pad + 58, 65 + fs * 0.32, fs * 0.9, { color: onAcc }));
    }
    case "split": {
      const r = 26;
      const w = r * 2 + 34 + tw(text, fs) + pad * 2;
      return wrap(w, 130, mark(pad + r, 65, r) + `<rect x="${n2(pad + r * 2 + 15)}" y="35" width="3" height="60" rx="1.5" fill="${fg}" opacity=".35"/>` + word(pad + r * 2 + 34, 65 + fs * 0.34, fs));
    }
    default: { // side
      const r = 24;
      const w = r * 2 + 18 + tw(text, fs) + pad * 2;
      return wrap(w, 130, mark(pad + r, 65, r) + word(pad + r * 2 + 18, 65 + fs * 0.34, fs));
    }
  }
}
