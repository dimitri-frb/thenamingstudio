# the naming studio - API Worker

A Cloudflare Worker that proxies the Anthropic API so the key never ships to the
browser. The live site calls it for real Claude; if it is absent or errors, the
site falls back to its built-in demo engine.

## One-time setup (≈ 5 minutes)

From this `worker/` folder:

```bash
npx wrangler login                      # opens the browser, log into Cloudflare (free tier is fine)
npx wrangler secret put ANTHROPIC_API_KEY   # paste your Anthropic API key (you create it; it is never committed)
npx wrangler deploy                     # prints your Worker URL, e.g. https://naming-studio-api.<you>.workers.dev
```

Then point the site at it:

1. GitHub repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**
   - Name: `STUDIO_API_URL`
   - Value: the Worker URL from `wrangler deploy`
2. Re-run the **Deploy to GitHub Pages** workflow (Actions tab → Run workflow), or push any commit.

The rebuilt site now uses real Claude. To go back to the demo engine, delete the
variable and redeploy.

## Cost control

- Models are split by job: Haiku for mechanical steps, Sonnet for creative ones.
- The system prompt is cached (5-min TTL) to cut input cost.
- Set a hard monthly spend cap in the Anthropic Console (Billing → Limits) so a
  test cohort can never run up a surprise bill.
- Optional: set `ALLOWED_ORIGIN` in `wrangler.toml` `[vars]` to your site origin
  so only your site can call the Worker.

## Notes

- Availability (domain / Instagram / INPI) is still an AI estimate, clearly
  labelled as such. Wiring real RDAP / INPI checks is a later step.
- Deeper word "blooms" and hover descriptions on the v2 board stay client-side;
  the high-value steps (territories, board words, names, rationale) use Claude.
