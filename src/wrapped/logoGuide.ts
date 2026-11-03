// Handoff 27 · P·1: the one-page logo guide (A4 landscape) shipped in the logo
// pack: the logo in its versions, app icon + favicon, clear space and minimum
// size, the colours (HEX · RGB · CMYK), do and don't. Drawn as SVG, saved as PDF.
import { logoSvg, iconKey, type Palette } from "./logos";
import { nest } from "./bookArt";

const W = 1000, H = 707; // A4 landscape units
const UI = `'Inter Tight',-apple-system,Helvetica,Arial,sans-serif`, MONO = `'JetBrains Mono',ui-monospace,monospace`;
const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
const r1 = (v: number) => Math.round(v * 10) / 10;
export const rgbOf = (h: string) => { const x = h.replace("#", ""); const n = parseInt(x.length === 3 ? x.split("").map((c) => c + c).join("") : x.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const cmykOf = (h: string) => { const [r, g, b] = rgbOf(h).map((v) => v / 255); const k = 1 - Math.max(r, g, b); if (k >= 1) return [0, 0, 0, 100]; return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((v) => Math.round(v * 100)); };
const strip = (svg: string) => svg.replace(/<rect width="[^"]+" height="[^"]+"(?: rx="[^"]+")? fill="[^"]+"\/>/, "");
const recolour = (svg: string, c: string) => strip(svg).replace(/fill="#(?:[0-9a-fA-F]{3}){1,2}"/g, `fill="${c}"`).replace(/stroke="#(?:[0-9a-fA-F]{3}){1,2}"/g, `stroke="${c}"`);

export function logoGuideSvg(name: string, key: string, pal: Palette, opts: Parameters<typeof logoSvg>[3], swatches: { name: string; hex: string }[]): string {
  const L = (variant: "light" | "night" | "mono") => logoSvg(key, name, pal, { ...opts, variant, height: 120 });
  const light = strip(L("light")), night = strip(L("night")), mono = L("mono");
  const icon = logoSvg(iconKey(key), name, pal, { ...opts, custom: undefined, variant: "icon", height: 120 });
  const month = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const T = (x: number, y: number, t: string, o: { size?: number; w?: number; fam?: string; fill?: string; anchor?: string; ls?: number } = {}) =>
    `<text x="${r1(x)}" y="${r1(y)}" font-family="${o.fam || UI}" font-size="${o.size || 10}" font-weight="${o.w || 400}"${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.ls ? ` letter-spacing="${o.ls}"` : ""} fill="${o.fill || "#14121f"}">${esc(t)}</text>`;
  const sec = (x: number, y: number, t: string) => T(x, y, t.toUpperCase(), { fam: MONO, size: 10, ls: 1.6, fill: "#55525f", w: 600 });
  const paper = "#f4f2ee";
  let o = "";
  o += T(40, 82, `${name} · Logo guide`, { size: 26, w: 700, ls: -0.6 }) + T(960, 80, `v1 · ${month} · page 1 of 1`, { fam: MONO, size: 9.5, anchor: "end", fill: "#55525f" }) + `<rect x="40" y="100" width="920" height="1.2" fill="#14121f"/>`;
  // 01 · the logo
  o += sec(40, 140, "01 · The logo");
  const cell = (x: number, y: number, bg: string, logo: string, cap: string, border = false) =>
    `<rect x="${x}" y="${y}" width="155" height="95" rx="5" fill="${bg}"${border ? ` stroke="#d9d6cf"` : ""}/>` + nest(logo, x + 18, y + 22, 119, 51) + T(x, y + 112, cap, { fam: MONO, size: 8.5, fill: "#55525f" });
  o += cell(40, 158, paper, light, "Primary · on paper") + cell(208, 158, pal.night, night, "Reversed · on Night") +
    cell(40, 285, "#ffffff", recolour(mono, "#000000"), "Mono black", true) + cell(208, 285, "#111111", recolour(mono, "#ffffff"), "Mono white");
  // 05 · do and don't
  o += sec(40, 430, "05 · Do and don't");
  const dd = (x: number, ok: boolean, inner: string, cap: string) =>
    `<rect x="${x}" y="447" width="75" height="72" rx="5" fill="${paper}"/>${inner}<circle cx="${x + 60}" cy="460" r="8" fill="${ok ? "#1f9d55" : "#e5482e"}"/>` +
    (ok ? `<path d="M${x + 56} 460l3 3l5 -6" fill="none" stroke="#fff" stroke-width="1.8"/>` : `<path d="M${x + 57} 457l6 6M${x + 63} 457l-6 6" stroke="#fff" stroke-width="1.8"/>`) + T(x, 537, cap, { size: 10, w: 700 });
  o += dd(40, true, nest(light, 46, 470, 63, 28), "As drawn") +
    dd(123, false, `<g transform="translate(129 470) scale(1.6 0.7) translate(-129 -470)">${nest(light, 129, 478, 40, 28)}</g>`, "No stretching") +
    dd(206, false, nest(recolour(light, "#2bb24c"), 212, 470, 63, 28), "No new colours") +
    dd(289, false, nest(recolour(light, "#a020f0"), 297, 474, 63, 28) + nest(light, 293, 470, 63, 28), "No effects");
  // 02 · app icon & favicon
  o += sec(393, 140, "02 · App icon & favicon");
  let ix = 393;
  for (const [s, lab] of [[72, "1024"], [48, "512"], [32, "180"], [32, "32"], [16, "favicon"]] as [number, string][]) {
    o += nest(icon, ix, 158 + (72 - s), s, s) + T(ix + s / 2, 244, lab, { fam: MONO, size: 8.5, anchor: "middle", fill: "#55525f" });
    ix += s + 20;
  }
  // 03 · clear space & minimum
  o += sec(393, 278, "03 · Clear space & minimum");
  o += `<rect x="393" y="295" width="278" height="120" rx="6" fill="${paper}"/>`;
  o += `<rect x="459" y="325" width="146" height="60" fill="none" stroke="#5b7cff" stroke-width="1" stroke-dasharray="3 3"/>` + nest(light, 472, 335, 120, 40) +
    T(532, 332, "x", { fam: MONO, size: 8, fill: "#5b7cff", anchor: "middle" }) + T(462, 357, "x", { fam: MONO, size: 8, fill: "#5b7cff" });
  o += T(393, 437, "x = the height of the symbol. Keep at least 1x", { size: 10.5 }) + T(393, 452, "empty on every side.", { size: 10.5 });
  o += nest(light, 393, 472, 42, 12, "xMinYMid") + T(447, 482, "Minimum: 24 px wide · 15 mm in print", { fam: MONO, size: 9 });
  // 04 · colours
  o += sec(701, 140, "04 · Colours");
  swatches.slice(0, 4).forEach((sw, i) => {
    const y = 165 + i * 73;
    const rgb = rgbOf(sw.hex), cmyk = cmykOf(sw.hex);
    o += `<rect x="701" y="${y}" width="46" height="46" rx="4" fill="${sw.hex}"${sw.hex.toLowerCase() === "#ffffff" ? ` stroke="#ddd"` : ""}/>` +
      T(759, y + 10, sw.name, { size: 12, w: 700 }) + T(759, y + 24, `HEX ${sw.hex.toUpperCase()}`, { fam: MONO, size: 8.5 }) +
      T(759, y + 36, `RGB ${rgb.join(" ")}`, { fam: MONO, size: 8.5 }) + T(759, y + 48, `CMYK ${cmyk.join(" ")}`, { fam: MONO, size: 8.5 });
  });
  o += `<rect x="40" y="660" width="920" height=".8" fill="#d9d6cf"/>` + T(40, 682, "Made with Name Name · namename.ai", { fam: MONO, size: 8.5, fill: "#77737f" }) +
    T(960, 682, "Which file? See README.txt in this folder", { fam: MONO, size: 8.5, fill: "#77737f", anchor: "end" });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${o}</svg>`;
}

/** Adobe Swatch Exchange (.ase): the palette for Illustrator, Photoshop, InDesign, Affinity. */
export function aseOf(swatches: { name: string; hex: string }[]): Uint8Array {
  const blocks: Uint8Array[] = swatches.map((sw) => {
    const nm = sw.name + "\0";
    const nameBytes = nm.length * 2;
    const len = 2 + nameBytes + 4 + 12 + 2;
    const b = new Uint8Array(2 + 4 + len), dv = new DataView(b.buffer);
    let o = 0;
    dv.setUint16(o, 0x0001); o += 2; dv.setUint32(o, len); o += 4;
    dv.setUint16(o, nm.length); o += 2;
    for (let i = 0; i < nm.length; i++) { dv.setUint16(o, nm.charCodeAt(i)); o += 2; }
    b.set([82, 71, 66, 32], o); o += 4; // "RGB "
    for (const v of rgbOf(sw.hex)) { dv.setFloat32(o, v / 255); o += 4; }
    dv.setUint16(o, 2); // normal colour
    return b;
  });
  const head = new Uint8Array(12), hv = new DataView(head.buffer);
  head.set([65, 83, 69, 70], 0); hv.setUint16(4, 1); hv.setUint16(6, 0); hv.setUint32(8, blocks.length);
  const out = new Uint8Array(12 + blocks.reduce((n, x) => n + x.length, 0));
  out.set(head, 0); let off = 12;
  for (const x of blocks) { out.set(x, off); off += x.length; }
  return out;
}
