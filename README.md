# Brandr — name your company in minutes

V1 preview of a naming + branding tool for founders (esp. people vibecoding
products). Inspired by [namelix](https://namelix.com/), but built around one
idea: **an amazing, ultra-short funnel** where name generation is the free
preview and everything downstream (more names, domain search + registration,
🇫🇷 INPI trademark check & filing, brand book) is paid.

## The funnel (the core of the product)

1. **Describe** — one textarea on the landing page: "What are you building?"
   (with example chips to remove the blank-page problem).
2. **Vibe** — pick up to 3 personalities (Modern, Bold, Playful, Premium…).
3. **Style** — how the name is built (Brandable, Real words, Compound, Short,
   Evocative) — optional, skippable for a mix.
4. **Refine** — optional include / avoid keywords + a recap of the brief.
5. **Generate** → ranked shortlist of names with brand-strength score, domain
   availability hint, style tag, and a one-line rationale.
6. **Paywall** — first 8 names are free; the rest are blurred behind an unlock
   CTA. Pricing: Preview (free) → Founder (€19) → Launch (€89).

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

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
