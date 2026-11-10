// Handoff 29 · the freemium brand flow: the open choices and the Pro ones.
// Palettes are in role order: a warm signature accent (dawn), a soft light
// mid (haze), a second accent (nova), a near-black (night).

export interface FmPalette { k: string; d: string; pal: [string, string, string, string] }

export const PAL_OPEN: FmPalette[] = [
  { k: "Dawn", d: "Warm peach into deep blue", pal: ["#ff9e7a", "#c9b6ff", "#7c9cff", "#0f0d24"] },
  { k: "Ember", d: "Fire, cream and coal", pal: ["#ff6b4a", "#ffc79a", "#c2410c", "#2a1712"] },
  { k: "Tide", d: "Sea, foam and sun", pal: ["#3fa7c4", "#e3f0f2", "#f2b84b", "#0f3a4d"] },
  { k: "Sage", d: "Herb, linen and clay", pal: ["#d9824f", "#dfe6d3", "#6f8f6a", "#24372c"] },
];
export const PAL_PRO: FmPalette[] = [
  { k: "Forest & sand", d: "Natural, grounded", pal: ["#8a9b6e", "#d8c3a5", "#4e6e58", "#1b241b"] },
  { k: "Monochrome", d: "Timeless, serious", pal: ["#bdbdbd", "#ededed", "#6b6b6b", "#101010"] },
  { k: "Citrus pop", d: "Energetic, bright", pal: ["#ffb238", "#ffe9b8", "#ff6b35", "#241a10"] },
  { k: "Rose", d: "Blush and plum", pal: ["#e8748e", "#f8dfe4", "#8e3b5f", "#2a1220"] },
  { k: "Ocean", d: "Deep and clear", pal: ["#2f80ed", "#dceafe", "#14b8a6", "#0b1b33"] },
  { k: "Terracotta", d: "Sun-baked earth", pal: ["#c8603a", "#f3e1d2", "#7a8b4f", "#2b1a12"] },
  { k: "Lilac", d: "Soft and dreamy", pal: ["#a78bfa", "#ede9fe", "#f0abfc", "#1e1433"] },
  { k: "Noir & gold", d: "Luxe, after dark", pal: ["#c9a24a", "#efe6cf", "#8c6d2c", "#0d0c0a"] },
  { k: "Mint", d: "Fresh and light", pal: ["#2ec4a0", "#dcf7ef", "#ffb4a2", "#0e2a24"] },
];
export const CUSTOM_PAL = "Your colour";

const hexRgb = (h: string): [number, number, number] => { const n = parseInt(h.replace("#", "").padEnd(6, "0").slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
/** A whole palette from one colour: a soft tint, a deeper accent, a tinted near-black. */
export function palFromHex(hex: string): [string, string, string, string] {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : "#ff9e7a";
  return [h, mix(h, "#ffffff", 0.82), mix(h, "#000000", 0.35), mix(h, "#0a0a0f", 0.9)];
}

export interface FmType { fi: number; d: string }
// X_FONTS indexes (logos.ts): Newsreader, Inter Tight, Archivo, Fraunces.
export const TYPE_OPEN: FmType[] = [
  { fi: 2, d: "Classic, warm" }, { fi: 9, d: "Clean, modern" }, { fi: 17, d: "Bold, direct" }, { fi: 5, d: "Soft serif" },
];
export const TYPE_PRO: FmType[] = [
  { fi: 0, d: "Elegant" }, { fi: 3, d: "High contrast" }, { fi: 4, d: "Editorial" }, { fi: 6, d: "Sturdy slab" },
  { fi: 10, d: "Friendly" }, { fi: 12, d: "Geometric" }, { fi: 13, d: "Smooth, digital" }, { fi: 16, d: "Characterful" },
  { fi: 18, d: "Loud capitals" }, { fi: 21, d: "Rounded" }, { fi: 25, d: "Technical" }, { fi: 28, d: "Handmade" },
];

export const PRICE_DEFAULT = 29;
