// Handoff 27 · B: the brand book's illustrated pages, as SVG in the brand's
// palette and logo — "{Name} in use" (two sets: retail/product, service/local
// business) and "Mood and imagery" (photo direction as colour treatments).
import type { Palette } from "./logos";

const r1 = (v: number) => Math.round(v * 10) / 10;
/** Drop a whole logo <svg> into a box of the parent canvas, aspect kept. */
export function nest(svg: string, x: number, y: number, w: number, h: number, align = "xMidYMid"): string {
  return svg.replace(/^<svg\b([^>]*)>/, (_m, a: string) => `<svg${a.replace(/\s(width|height|x|y|preserveAspectRatio)="[^"]*"/g, "")} x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" preserveAspectRatio="${align} meet">`);
}
const SERVICE = /clean|wash|agency|consult|repair|plumb|electric|garden|landscap|estate|letting|clinic|therap|salon|barber|lash|nail|tutor|coach|cater|deliver|courier|move|removal|builder|roof|gutter|locum|recruit|care|nurse|vet|dental|physio|law|account|insur|service/i;
export const inUseSet = (brief: string): "A" | "B" => (SERVICE.test(brief || "") ? "B" : "A");

/** The 5-tile "in use" board (W×H = 700×620). logoL/logoN = light/night logo SVGs; icon = app icon SVG. */
export function inUseSvg(set: "A" | "B", p: Palette, logoL: string, logoN: string, name: string, tagline: string, site: string, person: string): string {
  const W = 700, H = 620, g = 14, cw = (W - 2 * g) / 3, rh = (H - g - 40) / 2;
  const tile = (x: number, y: number, w: number, h: number, bg: string, inner: string, cap: string) =>
    `<g><rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="10" fill="${bg}"/>${inner}<text x="${r1(x)}" y="${r1(y + h + 16)}" font-family="'JetBrains Mono',monospace" font-size="10" fill="#8a8a8f">${cap}</text></g>`;
  const sand = "#ece6dc", lilac = "#e4ddf2", sage = "#dfe7dd";
  const grad = `<defs><linearGradient id="iuG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.dawn}"/><stop offset=".55" stop-color="${p.haze}"/><stop offset="1" stop-color="${p.nova}"/></linearGradient></defs>`;
  const phone = (x: number, y: number, w: number, h: number, inner: string) =>
    `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(w * 0.16)}" fill="#111"/><rect x="${r1(x + 6)}" y="${r1(y + 6)}" width="${r1(w - 12)}" height="${r1(h - 12)}" rx="${r1(w * 0.12)}" fill="${p.night}"/>` + inner;
  const head = (t: string, x: number, y: number, s: number, c: string, wmax: number) => {
    const words = t.split(/\s+/); const lines: string[] = []; let cur = "";
    for (const w of words) { if ((cur + " " + w).trim().length > wmax && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
    if (cur) lines.push(cur);
    return lines.slice(0, 2).map((l, i) => `<text x="${r1(x)}" y="${r1(y + i * s * 1.05)}" font-family="'Inter Tight',sans-serif" font-weight="800" font-size="${s}" letter-spacing="-.4" fill="${c}">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`).join("");
  };
  // the poster / phone headline: whole words only, short enough for 2 lines
  const line1 = (() => { const src = (tagline || `Meet ${name}`).split(/[.,:;!?]/)[0].split(/\s+/); let o = ""; for (const w of src) { if ((o + " " + w).trim().length > 22) break; o = (o + " " + w).trim(); } return o || name; })();
  let out = grad;
  if (set === "A") {
    // shopfront (tall, left)
    const sx = 0, sy = 0, sh = H - 40;
    out += tile(sx, sy, cw, sh, "#3a3029",
      `<rect x="${sx}" y="${sy}" width="${r1(cw)}" height="${r1(sh * 0.16)}" rx="10" fill="#d8d0c4"/>` +
      `<rect x="${sx + 18}" y="${r1(sh * 0.12)}" width="${r1(cw - 36)}" height="${r1(sh * 0.2)}" fill="${p.night}"/>` + nest(logoN.replace(/<rect[^>]*fill="[^"]*"\/>/, ""), sx + 30, sh * 0.14, cw - 60, sh * 0.16) +
      Array.from({ length: 9 }, (_, i) => { const bw = (cw - 36) / 9; const x0 = sx + 18 + i * bw; return `<path d="M${r1(x0)} ${r1(sh * 0.32)}h${r1(bw)}v${r1(sh * 0.05)}l${r1(-bw / 2)} ${r1(sh * 0.025)}l${r1(-bw / 2)} ${r1(-sh * 0.025)}z" fill="${i % 2 ? "#fff" : p.dawn}"/>`; }).join("") +
      `<rect x="${sx + 30}" y="${r1(sh * 0.58)}" width="${r1(cw * 0.32)}" height="${r1(sh * 0.42)}" fill="#6e6075" stroke="#2a2420" stroke-width="4"/><rect x="${r1(sx + cw * 0.6)}" y="${r1(sh * 0.52)}" width="${r1(cw * 0.25)}" height="${r1(sh * 0.48)}" fill="#26201c"/>`, "Shopfront sign");
    // paper bag
    const bx = cw + g, by = 0;
    out += tile(bx, by, cw, rh, sand,
      `<path d="M${r1(bx + cw * 0.35)} ${r1(by + rh * 0.3)}c0 -50 ${r1(cw * 0.3)} -50 ${r1(cw * 0.3)} 0" fill="none" stroke="#8a7f74" stroke-width="3"/>` +
      `<rect x="${r1(bx + cw * 0.25)}" y="${r1(by + rh * 0.24)}" width="${r1(cw * 0.5)}" height="${r1(rh * 0.62)}" rx="3" fill="#f6f3ee"/>` + nest(logoL, bx + cw * 0.3, by + rh * 0.45, cw * 0.4, rh * 0.16), "Paper bag");
    // phone
    const px = 2 * (cw + g), py = 0, pw = cw * 0.42, ph = rh * 0.9;
    out += tile(px, py, cw, rh, lilac, phone(px + (cw - pw) / 2, py + (rh - ph) / 2, pw, ph,
      nest(logoN.replace(/<rect[^>]*fill="[^"]*"\/>/, ""), px + (cw - pw) / 2 + 12, py + (rh - ph) / 2 + 14, pw * 0.45, 14, "xMinYMid") +
      `<rect x="${r1(px + (cw - pw) / 2 + 12)}" y="${r1(py + (rh - ph) / 2 + 36)}" width="${r1(pw - 24)}" height="${r1(ph * 0.55)}" rx="8" fill="url(#iuG)"/>` +
      head(line1, px + (cw - pw) / 2 + 18, py + (rh - ph) / 2 + 36 + ph * 0.42, 11, p.night, 12) +
      `<rect x="${r1(px + (cw - pw) / 2 + 12)}" y="${r1(py + (rh - ph) / 2 + ph - 32)}" width="${r1(pw - 24)}" height="14" rx="7" fill="#fff"/>`), "Phone · website");
    // tote
    const tx = cw + g, ty = rh + g + 20;
    out += tile(tx, ty, cw, rh, sand,
      `<path d="M${r1(tx + cw * 0.38)} ${r1(ty + rh * 0.32)}v-30a8 8 0 0 1 16 0v30M${r1(tx + cw * 0.56)} ${r1(ty + rh * 0.32)}v-30a8 8 0 0 1 16 0v30" fill="none" stroke="#d6cbb8" stroke-width="5"/>` +
      `<rect x="${r1(tx + cw * 0.28)}" y="${r1(ty + rh * 0.3)}" width="${r1(cw * 0.44)}" height="${r1(rh * 0.6)}" fill="#e2d8c7"/>` + nest(logoL, tx + cw * 0.32, ty + rh * 0.52, cw * 0.36, rh * 0.14), "Tote bag");
    // poster
    const qx = 2 * (cw + g), qy = rh + g + 20, qw = cw * 0.66, qh = rh * 0.88;
    out += tile(qx, qy, cw, rh, lilac,
      `<rect x="${r1(qx + (cw - qw) / 2)}" y="${r1(qy + (rh - qh) / 2)}" width="${r1(qw)}" height="${r1(qh)}" fill="${p.night}"/>` +
      `<path d="M${r1(qx + (cw - qw) / 2)} ${r1(qy + (rh - qh) / 2 + qh * 0.82)}V${r1(qy + (rh - qh) / 2 + qh * 0.55)}q${r1(qw / 2)} ${r1(-qh * 0.18)} ${r1(qw)} 0V${r1(qy + (rh - qh) / 2 + qh * 0.82)}z" fill="url(#iuG)"/>` +
      head(line1, qx + (cw - qw) / 2 + 10, qy + (rh - qh) / 2 + 22, 13, "#fff", 12) +
      nest(logoN.replace(/<rect[^>]*fill="[^"]*"\/>/, ""), qx + (cw - qw) / 2 + 10, qy + (rh - qh) / 2 + qh * 0.86, qw * 0.5, qh * 0.1, "xMinYMid"), "Poster");
  } else {
    // van (wide, top-left two columns)
    const vw = cw * 2 + g, vx = 0, vy = 0;
    out += tile(vx, vy, vw, rh, "#dfe3ea",
      `<path d="M${r1(vx + vw * 0.08)} ${r1(vy + rh * 0.3)}h${r1(vw * 0.6)}q${r1(vw * 0.2)} 0 ${r1(vw * 0.24)} ${r1(rh * 0.2)}v${r1(rh * 0.36)}h${r1(-vw * 0.84)}z" fill="#fff" stroke="#c9ced8" stroke-width="2"/>` +
      `<rect x="${r1(vx + vw * 0.7)}" y="${r1(vy + rh * 0.34)}" width="${r1(vw * 0.12)}" height="${r1(rh * 0.12)}" rx="6" fill="#c8cfe0"/>` +
      `<rect x="${r1(vx + vw * 0.08)}" y="${r1(vy + rh * 0.7)}" width="${r1(vw * 0.84)}" height="${r1(rh * 0.05)}" fill="url(#iuG)"/>` +
      nest(logoL, vx + vw * 0.13, vy + rh * 0.38, vw * 0.3, rh * 0.16, "xMinYMid") +
      `<text x="${r1(vx + vw * 0.13)}" y="${r1(vy + rh * 0.63)}" font-family="'JetBrains Mono',monospace" font-size="10" fill="#555">${site}</text>` +
      `<circle cx="${r1(vx + vw * 0.24)}" cy="${r1(vy + rh * 0.86)}" r="${r1(rh * 0.09)}" fill="#222"/><circle cx="${r1(vx + vw * 0.78)}" cy="${r1(vy + rh * 0.86)}" r="${r1(rh * 0.09)}" fill="#222"/>`, "Van side panel");
    // yard sign
    const yx = 2 * (cw + g), yy = 0;
    out += tile(yx, yy, cw, rh, sage,
      `<rect x="${r1(yx + cw / 2 - 2)}" y="${r1(yy + rh * 0.5)}" width="4" height="${r1(rh * 0.4)}" fill="#7a6a5a"/>` +
      `<rect x="${r1(yx + cw * 0.2)}" y="${r1(yy + rh * 0.22)}" width="${r1(cw * 0.6)}" height="${r1(rh * 0.34)}" fill="${p.dawn}"/>` + nest(logoL.replace(/<rect[^>]*fill="#ffffff"\/>/, ""), yx + cw * 0.25, yy + rh * 0.26, cw * 0.5, rh * 0.16) +
      `<text x="${r1(yx + cw / 2)}" y="${r1(yy + rh * 0.5)}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="${p.night}">${site}</text>`, "Yard sign");
    // t-shirt
    const tx = 0, ty = rh + g + 20;
    out += tile(tx, ty, cw, rh, sand,
      `<path d="M${r1(tx + cw * 0.3)} ${r1(ty + rh * 0.18)}l${r1(-cw * 0.18)} ${r1(rh * 0.14)}l${r1(cw * 0.08)} ${r1(rh * 0.14)}l${r1(cw * 0.08)} ${r1(-rh * 0.05)}v${r1(rh * 0.6)}h${r1(cw * 0.44)}v${r1(-rh * 0.6)}l${r1(cw * 0.08)} ${r1(rh * 0.05)}l${r1(cw * 0.08)} ${r1(-rh * 0.14)}l${r1(-cw * 0.18)} ${r1(-rh * 0.14)}q${r1(-cw * 0.1)} ${r1(rh * 0.1)} ${r1(-cw * 0.2)} 0z" fill="${p.night}"/>` +
      nest(logoN.replace(/<rect[^>]*fill="[^"]*"\/>/, ""), tx + cw * 0.36, ty + rh * 0.4, cw * 0.28, rh * 0.12), "T-shirt");
    // phone booking
    const px = cw + g, py = rh + g + 20, pw = cw * 0.42, ph = rh * 0.9;
    out += tile(px, py, cw, rh, lilac, phone(px + (cw - pw) / 2, py + (rh - ph) / 2, pw, ph,
      nest(logoN.replace(/<rect[^>]*fill="[^"]*"\/>/, ""), px + (cw - pw) / 2 + 12, py + (rh - ph) / 2 + 14, pw * 0.45, 12, "xMinYMid") +
      `<text x="${r1(px + (cw - pw) / 2 + 12)}" y="${r1(py + (rh - ph) / 2 + 52)}" font-family="'Inter Tight',sans-serif" font-weight="800" font-size="10" fill="#fff">Book a time</text>` +
      [0, 1, 2].map((i) => `<rect x="${r1(px + (cw - pw) / 2 + 12)}" y="${r1(py + (rh - ph) / 2 + 62 + i * 22)}" width="${r1(pw - 24)}" height="16" rx="4" fill="${i === 1 ? p.dawn : "rgba(255,255,255,.12)"}"/>`).join("")), "Phone · booking");
    // card
    const kx = 2 * (cw + g), ky = rh + g + 20;
    out += tile(kx, ky, cw, rh, "#ece9e3",
      `<rect x="${r1(kx + cw * 0.08)}" y="${r1(ky + rh * 0.3)}" width="${r1(cw * 0.84)}" height="${r1(rh * 0.4)}" rx="4" fill="#fff" stroke="#e2ded6"/>` +
      `<circle cx="${r1(kx + cw * 0.2)}" cy="${r1(ky + rh * 0.5)}" r="${r1(rh * 0.08)}" fill="${p.dawn}" opacity=".85"/>` +
      `<text x="${r1(kx + cw * 0.32)}" y="${r1(ky + rh * 0.47)}" font-family="'Inter Tight',sans-serif" font-weight="700" font-size="11" fill="#111">${(person || "Your name").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>` +
      `<text x="${r1(kx + cw * 0.32)}" y="${r1(ky + rh * 0.56)}" font-family="'Inter Tight',sans-serif" font-size="9" fill="#666">Founder · ${name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>` +
      `<text x="${r1(kx + cw * 0.32)}" y="${r1(ky + rh * 0.64)}" font-family="'JetBrains Mono',monospace" font-size="8" fill="#666">${site}</text>`, "Business card");
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${out}</svg>`;
}

/** Six photo-direction tiles: abstract scenes washed in the palette (W×H = 700×560). */
export const MOOD_DEFAULT = [
  { t: "Golden hour, outside", how: "Colour wash · Dawn 30%" }, { t: "Light and shadow", how: "Crop · tight, off-centre" },
  { t: "Real people, warm faces", how: "Grain · 8%" }, { t: "The place, before the crowd", how: "Colour wash · Haze 40%" },
  { t: "Close up on what you make", how: "Crop · fill the frame" }, { t: "After dark", how: "Colour wash · Nova 25%" },
];
export function moodSvg(p: Palette, tiles: { t: string; how: string }[]): string {
  const W = 700, H = 560, g = 14, cw = (W - 2 * g) / 3, ch = (H - g - 80) / 2;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let defs = `<defs><linearGradient id="mS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.night}"/><stop offset=".55" stop-color="${p.haze}"/><stop offset="1" stop-color="${p.dawn}"/></linearGradient>` +
    `<linearGradient id="mB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="mF" cx="40%" cy="40%" r="60%"><stop offset="0" stop-color="#fff3e8"/><stop offset="1" stop-color="${p.dawn}"/></radialGradient>` +
    `<filter id="mBl"><feGaussianBlur stdDeviation="6"/></filter><pattern id="mG" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="none"/><circle cx="1" cy="1" r=".6" fill="#000" opacity=".12"/></pattern></defs>`;
  let out = "";
  const scene = (i: number, x: number, y: number) => {
    const c = (s: string) => `<g transform="translate(${r1(x)} ${r1(y)})"><clipPath id="mc${i}"><rect width="${r1(cw)}" height="${r1(ch)}" rx="6"/></clipPath><g clip-path="url(#mc${i})">${s}<rect width="${r1(cw)}" height="${r1(ch)}" fill="url(#mG)"/></g>` +
      `<path d="M8 20V8h12M${r1(cw - 20)} 8h12v12M8 ${r1(ch - 20)}v12h12M${r1(cw - 20)} ${r1(ch - 8)}h12v-12" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/></g>`;
    if (i === 0) return c(`<rect width="${r1(cw)}" height="${r1(ch)}" fill="url(#mS)"/>` + Array.from({ length: 9 }, (_, k) => `<rect x="${r1(k * cw / 9)}" y="${r1(ch * (0.78 - (k % 3) * 0.05))}" width="${r1(cw / 9 - 2)}" height="${r1(ch)}" fill="${p.night}"/>`).join(""));
    if (i === 1) return c(`<rect width="${r1(cw)}" height="${r1(ch)}" fill="${p.night}"/><path d="M0 ${r1(ch * 0.55)}L${r1(cw)} ${r1(ch * 0.3)}V${r1(ch * 0.7)}Z" fill="url(#mB)" filter="url(#mBl)"/>`);
    if (i === 2) return c(`<rect width="${r1(cw)}" height="${r1(ch)}" fill="${p.dawn}"/><circle cx="${r1(cw * 0.36)}" cy="${r1(ch * 0.5)}" r="${r1(ch * 0.24)}" fill="${p.night}" opacity=".55" filter="url(#mBl)"/><circle cx="${r1(cw * 0.64)}" cy="${r1(ch * 0.52)}" r="${r1(ch * 0.23)}" fill="${p.night}" opacity=".6" filter="url(#mBl)"/>`);
    if (i === 3) return c(`<rect width="${r1(cw)}" height="${r1(ch)}" fill="${p.haze}"/><rect y="${r1(ch * 0.62)}" width="${r1(cw)}" height="${r1(ch)}" fill="#efe7da"/><rect x="${r1(cw * 0.12)}" y="${r1(ch * 0.62)}" width="${r1(cw * 0.76)}" height="8" rx="4" fill="#6b5a4c"/>` + [0.2, 0.42, 0.64].map((f) => `<rect x="${r1(cw * f)}" y="${r1(ch * 0.58)}" width="${r1(cw * 0.15)}" height="${r1(ch * 0.2)}" rx="2" fill="${p.dawn}"/>`).join(""));
    if (i === 4) return c(`<rect width="${r1(cw)}" height="${r1(ch)}" fill="#2a2633"/><path d="M${r1(cw * 0.25)} ${r1(ch * 0.55)}c0 -60 ${r1(cw * 0.5)} -70 ${r1(cw * 0.55)} -20c${r1(cw * 0.05)} 50 -40 70 -90 60c-40 -8 ${r1(-cw * 0.05)} -20 ${r1(-cw * 0.05)} -40z" fill="url(#mF)"/>`);
    return c(`<rect width="${r1(cw)}" height="${r1(ch)}" fill="${p.night}"/>` + Array.from({ length: 7 }, (_, k) => `<circle cx="${r1(((k * 37) % 100) / 100 * cw)}" cy="${r1(((k * 23) % 40) / 100 * ch + 10)}" r="1.4" fill="#fff"/>`).join("") + `<rect x="${r1(cw * 0.15)}" y="${r1(ch * 0.5)}" width="${r1(cw * 0.7)}" height="${r1(ch * 0.3)}" fill="#e8e6f2" opacity=".9"/><rect width="${r1(cw)}" height="${r1(ch)}" fill="${p.nova}" opacity=".18"/>`);
  };
  tiles.slice(0, 6).forEach((tl, i) => {
    const x = (i % 3) * (cw + g), y = Math.floor(i / 3) * (ch + g + 40);
    out += scene(i, x, y) +
      `<text x="${r1(x)}" y="${r1(y + ch + 16)}" font-family="'Inter Tight',sans-serif" font-weight="700" font-size="11" fill="#111">${esc(tl.t)}</text>` +
      `<text x="${r1(x)}" y="${r1(y + ch + 30)}" font-family="'JetBrains Mono',monospace" font-size="9" fill="#777">${esc(tl.how)}</text>`;
  });
  void defs;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${out}</svg>`;
}
