# Brandr — name your company in minutes

**Live demo: https://dimitri-frb.github.io/brandr/**

V1 preview of a naming + branding tool for founders (esp. people vibecoding
products). Inspired by [namelix](https://namelix.com/), but built around one
idea: **an amazing, ultra-short funnel** where name generation is the free
preview and everything downstream (more names, domain search + registration,
🇫🇷 INPI trademark check & filing, brand book) is paid.

Built on the team's naming framework (see the Figma research): **5 phases**,
**9 name types**, and **4-axis scoring** (Intuitive · Visual · Sound ·
Emotional) plus a SMILE check.

## Brand directions (live theme switcher)

The header has a switcher to try three brand identities on the spot:

- **Nocturne** — dark, techy SaaS (default): indigo→fuchsia, glassmorphism.
- **Atelier** — calm, handmade, zen: warm paper, ink serif type, sage & clay
  tones, soft paper grain.
- **Carnival** — creative & arty: bright pop colors (violet/pink/tangerine),
  bold display type, playful gradient mesh.

Themes are driven by CSS variables on `data-theme` (see `src/index.css`), so the
whole app — funnel, results, checkout, journey rail — restyles instantly.

## The funnel (the core of the product)

1. **Describe** — one textarea: "What are you building?" — **type or dictate it
   by voice** (mic button, Web Speech API; great for non-native speakers). Example
   chips remove the blank-page problem.
2. **Vibe** — pick up to 3 personalities / tones (Modern, Bold, Playful, Premium…).
3. **Naming lane** — pick from the 9 name types (Suggestive ★, Compound, Invented,
   Abstract real word, Evocative, Playful, Descriptive, Founder, Acronym).
4. **Refine** — optional include / avoid keywords + a recap of the brief.
5. **Generate** → ranked shortlist with 4-axis brand-strength score, domain
   availability, name-type tag, and a one-line rationale.
6. **Paywall** — first 8 names are free; the rest are blurred behind an unlock
   CTA. Pricing: Preview (free) → Founder (€19) → Launch (€89).

The landing page also teaches the **5-phase process** and showcases the
**9 name types** with real-world archetypes.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

Pushing to `main` auto-deploys to GitHub Pages via
[.github/workflows/deploy.yml](.github/workflows/deploy.yml).

> Voice dictation uses the Web Speech API — works in Chrome/Edge/Safari and
> needs mic permission. Where unsupported, the mic button hides and typing works.

## What's real vs. mocked (V1)

The whole UX/funnel is real. The intelligence is mocked so the preview runs
with **zero setup / no API keys**:

- **Name generation** — `src/lib/generate.ts` is a self-contained engine
  (keyword extraction + style templates + seeded RNG). Swap `generateNames()`
  for an LLM call when ready.
- **Domain availability** — heuristic per name. Replace with a real domain API
  (e.g. registrar / RDAP).
- **INPI trademark check & filing** — surfaced in the paywall/feature cards.
  Wire up the [INPI API](https://data.inpi.fr/content/editorial/Acces_API_Entreprises)
  for the Launch tier.

## Next steps

- Real LLM name generation (Claude) with the brief as the prompt.
- Live domain lookups + a "register" flow.
- INPI integration: trademark conflict screening, then assisted filing.
- Auth + payments to gate the paid tiers.
- Generated brand book (logo directions, palette, type, voice) as a PDF.
