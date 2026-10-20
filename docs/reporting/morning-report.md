# The morning report — format and data sources

Sent every morning, WhatsApp-formatted (`*bold*`, monospace numbers). Every
number carries its baseline in brackets: the 7-day average (campaign-to-date
average until a full week of history exists). Units go inside the brackets
when they aren't obvious.

## Template

```
☀️ *NAME NAME — {Day DD Mon}* (vs 7d avg)

*CHANGED* {what shipped yesterday, one line — or "nothing shipped"}

*ADS* €{spend} (€{avg}) · {clicks} clicks ({avg}) · CTR {x}% ({avg}%) · CPC €{x} (€{avg})

*FUNNEL*
{clicks} clicks                 €{cpc}
→ {n} typed a brief  {%} ({avg}%🔴) · €{cum}
→ {n} signed up      {%} ({avg}%🟢) · €{cum}
→ {n} words          {%} ({avg}%🔴) · €{cum}
→ {n} names          {%} ({avg}%🔴) · €{cum}
→ {n} domain         {%} ({avg}%🟢) · €{cum}
→ {n} completed      {%}

Inside each bracket, right after the average: 🟢 when the day's step
conversion is better than the 7-day average, 🔴 when it's worse, nothing
when they're equal. No threshold — it's a simple direction marker.

*KPIs* (vs 7d avg)
Click → domain    {x}% ({avg}%) · €{x} (€{avg}) per domain
Click → names     {x}% ({avg}%) · €{x} (€{avg}) per namer
Click → sign-up   {x}% ({avg}%) · €{x} (€{avg}) per account

*WEEK* (campaign to date)
€{spend} · {clicks} clicks · {briefs} briefs · {accounts} accounts · {n} reached domain · €{x}/domain

*LEAKS*
1. {biggest leak, with the step numbers}
2. {second, or an ads flag}
Bright spot: {one genuinely good signal}
```

Rules the format settled on:
- Funnel percentages are step-over-step (share of the PREVIOUS stage), the €
  is cumulative spend divided by the people who reached that stage.
- No per-ad-group click breakdown; no HEARD/BEST/DO sections.
- "typed a brief" includes gate abandoners (visible since the Oct 15
  tracking fix); "signed up" is accounts — it lands straight on the brief page, so there is no separate brief line (it was always 100%).
- A day is a calendar day in Europe/Paris (UTC+2): KV window
  `Date.UTC(y,m,d-1,22) → Date.UTC(y,m,d,22)`.

## Data sources

- **Funnel / KPIs / WEEK**: the worker's KV log (namespace `LOG`,
  id `6deae9f7e8774986ab1e38423de11394`), keys `log:<1e15-at>:<rand>` so the
  timestamp is IN the key — list keys, filter by window, fetch only those.
  Group and merge exactly like `buildFlows` in `src/wrapped/AdminPage.tsx`
  (page/action events are steps; wrap* only as legacy fallback; lead events
  carry the email; one row per email; anonymous generation-only groups =
  gate abandoners).
- **ADS line**: Google Ads UI (account ocid 8601447532, campaign
  "Search — Naming EN" id 24345462378) with the date preset — automatable
  once the Google Ads API developer token lands.
- **Gate moved again** (Mon 20 Oct): the sign-up gate now sits right before
  the WORDS — anonymous founders brief, swipe and tune freely; `gate {to:"words"}`
  fires at the ask. The claim screen no longer links out: choosing a domain
  saves it as `chosen` and buying is only offered at the end + account.
- **Gate telemetry** (since Sat 17 Oct ~22:30 Paris): the brief page logs a
  `page {to:"brief"}` event for everyone (anonymous included), and an
  anonymous founder who hits the sign-up gate logs a `gate {to:<step>}`
  action. So the gate leak splits in two: briefs − gates = stalled on the
  wow page; gates − signups = balked at the modal. Exclude Dimitri's own
  runs (Direct source, dimitrifarber@gmail.com).
