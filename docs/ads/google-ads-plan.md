# Name Name — Google Search Ads launch plan

One campaign, three ad groups, exact/phrase keywords only, English-speaking
markets. Built to answer one question fast: **what does a click on "business
name generator" cost us, and does it turn into a named brand?**

Every final URL carries `utm_source=google&utm_medium=cpc`, which the app's
first-touch attribution maps to **Source: Google Ads** in /admin — so results
show up in your own dashboard from click one, even before conversion tracking.

---

## Campaign settings

| Setting | Value |
|---|---|
| Campaign name | `Search — Naming EN` |
| Type | Search — **uncheck** Display Network AND Search Partners |
| Locations | United States, United Kingdom, Canada, Australia, Ireland, Netherlands, Nordics |
| Location option | **Presence** (people IN the location), not "interest" |
| Language | English |
| Budget | €25/day to start |
| Bidding | Maximize clicks, **max CPC limit €2.50** → switch to Maximize conversions once ~30 conversions are in |
| Audience | none at launch (observation only if you add any) |
| Broad match setting | OFF (campaign setting "use broad match" must be off) |

## Ad groups & keywords

Match types: `[exact]` and `"phrase"` only. No broad.

### 1 · Business name
```
[business name generator]
[company name generator]
[ai business name generator]
[business name ideas]
[company name ideas]
"business name generator"
```

### 2 · Brand & startup
```
[brand name generator]
[startup name generator]
[brand name ideas]
[startup name ideas]
[ai name generator for business]
[product name generator]
"brand name generator"
```

### 3 · Name + domain
```
[business name and domain]
[business name generator with domain]
[brand name with domain available]
[company name with domain]
"name generator with domain"
```

## Negative keywords (campaign level)

```
baby, baby boy, baby girl, last name, surname, meaning, nickname,
username, gamertag, discord, instagram, youtube channel, wifi,
team name, band name, tattoo, pet name, horse, boat, dnd, fantasy,
truck, crew, clan, free fire, roblox
```

## Final URLs

| Ad group | Final URL |
|---|---|
| Business name | `https://namename.ai/?utm_source=google&utm_medium=cpc&utm_campaign=search-naming-en&utm_content=business-name` |
| Brand & startup | `https://namename.ai/?utm_source=google&utm_medium=cpc&utm_campaign=search-naming-en&utm_content=brand-startup` |
| Name + domain | `https://namename.ai/?utm_source=google&utm_medium=cpc&utm_campaign=search-naming-en&utm_content=name-domain` |

## Responsive Search Ads

One RSA per ad group. Headlines ≤30 chars, descriptions ≤90. Don't pin
anything; let Google rotate.

### Shared descriptions (all ad groups)
1. `Describe what you're building. Get six strong names, each with a real domain, in minutes.`
2. `No word mashups: real naming craft, domains checked live, logo and brand book included.`
3. `Every name is scored against your brief, with the story behind it and the domain verified.`
4. `Free to try. Name, domain, logo and brand book — ready before your coffee goes cold.`

### Ad group 1 · Business name — headlines
1. `AI Business Name Generator`
2. `Name Your Business in Minutes`
3. `Business Names With Domains`
4. `Six Names, Domains Checked`
5. `A Name You Can Actually Own`
6. `From Brief to Brand Book`
7. `Free AI Naming Studio`
8. `Real Naming Craft, Not Mashups`
9. `Your Name, Domain & Logo`
10. `Stop Scrolling Name Lists`

### Ad group 2 · Brand & startup — headlines
1. `AI Brand Name Generator`
2. `Startup Names That Stick`
3. `Name Your Startup in Minutes`
4. `Brand Names With Real Stories`
5. `Six Names, Domains Checked`
6. `A Name You Can Actually Own`
7. `From Brief to Brand Book`
8. `Free AI Naming Studio`
9. `Your Name, Domain & Logo`
10. `Built Like a Naming Agency`

### Ad group 3 · Name + domain — headlines
1. `Names With Domains Available`
2. `Name + Domain, Checked Live`
3. `Every Name Comes With a Domain`
4. `Stop Losing Names to Taken.com`
5. `Six Names, Domains Verified`
6. `AI Business Name Generator`
7. `A Name You Can Actually Own`
8. `Free AI Naming Studio`
9. `From Brief to Brand Book`
10. `Your Name, Domain & Logo`

## Extensions (assets)

**Sitelinks** (campaign level)
| Text (≤25) | Description 1 (≤35) | Description 2 | URL |
|---|---|---|---|
| How it works | Brief to brand book | Six steps, a few minutes | `https://namename.ai/how-it-works` |
| See a live example | A real flow, already filled | Browse every step | `https://namename.ai/test/2-concept` |
| Start your brief | One sentence is enough | Names in minutes | `https://namename.ai/?utm_source=google&utm_medium=cpc&utm_campaign=search-naming-en&utm_content=sitelink` |
| Your brand book | Story, voice, colours, type | Download as PDF or Word | `https://namename.ai/how-it-works#book` |

**Callouts**: `Domains checked live` · `Logo included` · `Brand book in minutes` · `Free to try`

**Structured snippet** — header "Service catalog": `Names, Domains, Logos, Brand books, Taglines`

## Conversion tracking (do this before scaling, not before launching)

Two conversion actions in Google Ads (Tools → Conversions → New → Website →
"Add a conversion action manually"):

| Name | Category | Count | Value |
|---|---|---|---|
| `Sign up` | Sign-up | One | none |
| `Name claimed` | Submit lead form (primary) | One | none |

Google gives you a tag ID like `AW-123456789` and two conversion labels.
**Paste all three to Claude** and the app gets wired in one commit: gtag.js in
`index.html`, a conversion ping on Google sign-in success, another when a
domain is claimed. Until then, read results in /admin (Source = Google Ads,
campaign, device, country, and how deep each click got in the funnel).

## Launch checklist

1. ads.google.com → sign in → **skip the "Smart campaign" wizard**: look for
   "Switch to Expert Mode" (bottom of the wizard) or create from the Campaigns
   page directly.
2. New campaign → objective "Create a campaign without a goal's guidance" →
   Search.
3. Apply the Campaign settings table above (watch: uncheck Display + Partners,
   set Presence targeting, set the CPC cap).
4. Create the 3 ad groups: paste keywords from this file.
5. Paste one RSA per ad group (headlines + the 4 shared descriptions), set the
   ad group's Final URL.
6. Add sitelinks, callouts, structured snippet at campaign level.
7. Campaign level → Keywords → Negative keywords → paste the list.
8. Billing: your card, your country, pay-per-click.
9. Launch. Within ~1 day, check Search terms (Keywords → Search terms) and add
   junk queries as negatives. Check /admin for Google Ads flows.
10. Day 3–5: pause keywords with CPC > €4 or CTR < 2%. Week 2+: once 30+
    conversions exist, switch bidding to Maximize conversions.

## What "working" looks like

- CTR above ~4% on exact keywords (search ads for generators run high).
- €25/day at ~€1–2 CPC ≈ 15–25 clicks/day. In /admin: Source "Google Ads",
  most flows reaching Words/Names. If clicks stall at Brief, the landing page
  is the problem, not the ads.
- The exit poll (04·x) now tells you WHY paid visitors leave — read the
  Feedback blocks on Google Ads flows before touching bids.
