// Visual fixtures (handoff 27 · R): every layout family × the 5 test brands
// (short/long names, 20–70 character copy, light / dark / greyscale palettes),
// plus the pitch deck in its 3 themes, rendered in a real browser with the
// real fonts. Fails when any line of text is clipped or overflows its canvas,
// or when banner text enters the profile-photo zone (left 27%).
//   npm run test:visual            → report + contact sheet in visual-fixtures/
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "visual-fixtures");
mkdirSync(outDir, { recursive: true });

// Playwright from the project, or a global install (require resolves NODE_PATH)
import { createRequire } from "module";
let chromium;
try { ({ chromium } = await import("playwright")); } catch {
  try { ({ chromium } = createRequire(import.meta.url)("playwright")); } catch { ({ chromium } = await import("playwright-core")); }
}

const bundle = await build({ entryPoints: [resolve(root, "scripts/fixtures-entry.ts")], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "silent" });
const js = bundle.outputFiles[0].text;

const BRANDS = [
  { name: "Aurova", pal: ["#0f0d24", "#7c9cff", "#ff9e7a", "#c9b6ff"], sym: "rise", font: 9, tagline: "Films under the sky, all summer.", post: "Aurova opens Friday, on the rooftop.", person: "Sam Okafor", role: "Founder", email: "sam@aurova.com", site: "aurova.com" },
  { name: "Oko", pal: ["#10221c", "#2f8f6b", "#9fe3c1", "#f2fbf6"], sym: "drop", font: 12, tagline: "Clinics, simplified.", post: "Oko is open for bookings.", person: "Ana Ruiz", role: "Co-founder", email: "ana@oko.health", site: "oko.health" },
  { name: "Northbridge Analytics", pal: ["#0b132b", "#1c2541", "#3a506b", "#5bc0be"], sym: "bars", font: 10, tagline: "Forecasting and pricing tools for regional retailers and their teams.", post: "Northbridge is here: forecasts every store team can actually read.", person: "Tomasz Wiśniewski-Hart", role: "Head of Partnerships", email: "tomasz@northbridge.io", site: "northbridge.io" },
  { name: "Mila", pal: ["#e8cfc4", "#f3e4da", "#d9e3dc", "#fbf8f4"], sym: "leaf", font: 1, tagline: "Slow mornings, good bread, baked before you wake.", post: "Mila opens Saturday morning.", person: "Inès Laurent", role: "Head baker", email: "ines@mila.bakery", site: "mila.bakery" },
  { name: "Tiller", pal: ["#0f0d24", "#7c9cff", "#ff9e7a", "#c9b6ff"], sym: "", font: 2, tagline: "Every great service runs on a steady hand.", post: "Meet Tiller: your whole service on one iPad.", person: "Dimitri Farber", role: "Founder", email: "dimitri@tiller.com", site: "tiller.com" },
  { name: "Veracta", pal: ["#15171c", "#3d434f", "#8b93a1", "#e6e8ec"], sym: "ring", font: 11, tagline: "Health data training built on real precision.", post: "Veracta is live for hospitals.", person: "Lena Moreau", role: "Founder", email: "lena@veracta.com", site: "veracta.com" },
];

const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#ddd"></body></html>`);
await page.addScriptTag({ content: js });
const report = await page.evaluate(async (BRANDS) => {
  const K = window.KIT;
  K.ensureFonts([{ family: "Inter Tight", weight: 400 }, { family: "Inter Tight", weight: 600 }, { family: "Inter Tight", weight: 700 }, { family: "Inter Tight", weight: 800 }, { family: "Newsreader", weight: 500 }, { family: "JetBrains Mono", weight: 400 }, { family: "Manrope", weight: 700 }, { family: "Outfit", weight: 600 }, { family: "DM Sans", weight: 700 }, { family: "EB Garamond", weight: 500 }]);
  await new Promise((r) => setTimeout(r, 2500)); await document.fonts.ready;
  const FAMS = ["Calm", "Bold", "Classic", "Playful"];
  const items = [];
  for (const d of BRANDS) {
    for (let f = 0; f < 4; f++) {
      items.push({ id: `${d.name} · banner LinkedIn · ${FAMS[f]}`, svg: K.banner(f, d, 1584, 396), safe: 0.27 });
      items.push({ id: `${d.name} · banner X · ${FAMS[f]}`, svg: K.banner(f, d, 1500, 500), safe: 0.27 });
      items.push({ id: `${d.name} · post · ${FAMS[f]}`, svg: K.post(f, d, d.post, "Day 3") });
      items.push({ id: `${d.name} · story · ${FAMS[f]}`, svg: K.post(f, d, d.post, "Day 3", 1080, 1920) });
      items.push({ id: `${d.name} · card A · ${FAMS[f]}`, svg: K.cardFront(f, "A", d) });
      items.push({ id: `${d.name} · card B · ${FAMS[f]}`, svg: K.cardFront(f, "B", d) });
      items.push({ id: `${d.name} · card back · ${FAMS[f]}`, svg: K.cardBack(f, d, true) });
    }
    const db = { name: d.name, sym: d.sym, font: d.font, pal: { night: d.pal[0], nova: d.pal[1], dawn: d.pal[2], haze: d.pal[3] }, site: d.site, email: d.email, founder: d.person, brief: d.tagline, tagline: d.tagline, concept: "" };
    for (let t = 0; t < 3; t++) K.deckScenes(t, db, K.deckContent(db, null)).forEach((s, i) => items.push({ id: `${d.name} · deck ${["Night", "Paper", "Colour"][t]} · ${i + 1} ${s.label}`, svg: K.sceneSvg(s, 1600) }));
  }
  // canary: the checker must flag this, or the test itself is broken
  items.push({ id: "canary", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><text x="80" y="50" font-size="30">overflow</text></svg>` });
  const host = document.createElement("div"); document.body.appendChild(host);
  const fails = [];
  for (const it of items) {
    host.innerHTML = it.svg;
    const svg = host.querySelector("svg");
    const vb = svg.viewBox.baseVal;
    // texts hanging off the canvas on purpose would be a design bug too: check every <text>
    for (const t of svg.querySelectorAll("text")) {
      if (t.closest("clipPath") || t.getAttribute("data-deco")) continue; // decorative initial (bleeds like a symbol)
      const bb = t.getBBox();
      const ctm = t.getCTM(), root = svg.getCTM();
      // map the box into the root viewBox (handles rotate / translate groups)
      const m = root.inverse().multiply(ctm);
      const pts = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      const x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x)), y0 = Math.min(...pts.map((p) => p.y)), y1 = Math.max(...pts.map((p) => p.y));
      const tol = 2;
      if (x0 < vb.x - tol || y0 < vb.y - tol || x1 > vb.x + vb.width + tol || y1 > vb.y + vb.height + tol)
        fails.push(`${it.id}: "${t.textContent}" overflows (${Math.round(x0)},${Math.round(y0)})–(${Math.round(x1)},${Math.round(y1)}) in ${vb.width}×${vb.height}`);
      if (it.safe && x0 < vb.width * it.safe - tol && y1 > vb.height * 0.2)
        fails.push(`${it.id}: "${t.textContent}" enters the profile-photo zone (x ${Math.round(x0)} < ${Math.round(vb.width * it.safe)})`);
    }
  }
  // contact sheet
  host.innerHTML = `<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;padding:6px;width:1588px">` + items.filter((it) => it.id !== "canary").map((it) => `<div title="${it.id}">${it.svg.replace(/<svg([^>]*) width="[^"]*" height="[^"]*"/, '<svg$1 style="width:100%;height:auto;display:block"')}</div>`).join("") + `</div>`;
  const canary = fails.some((f) => f.startsWith("canary:"));
  return { count: items.length - 1, fails: fails.filter((f) => !f.startsWith("canary:")).concat(canary ? [] : ["checker broken: the canary overflow was not detected"]) };
}, BRANDS);
await page.waitForTimeout(800);
await page.screenshot({ path: resolve(outDir, "contact-sheet.png"), fullPage: true });
await b.close();
writeFileSync(resolve(outDir, "report.txt"), `${report.count} frames checked\n${report.fails.length ? report.fails.join("\n") : "no text clipped or overflowing"}\n`);
console.log(`${report.count} frames checked, ${report.fails.length} problem(s)`);
for (const f of report.fails.slice(0, 40)) console.log("  ✗ " + f);
process.exit(report.fails.length ? 1 : 0);
