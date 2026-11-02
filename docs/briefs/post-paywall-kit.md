# Name Name: brief for Claude Design · the paid kit, made really good

**Goal:** what people get after they unlock (€29) has to feel worth far more than €29. Today it feels like a free preview with more pages. This brief covers the screens and the deliverable designs. Engineering fixes that need no design are listed at the end, for context.

**Example data:** Aurova, aurova.com, "A rooftop cinema club for Marseille", palette Dawn #FF9E7A · Haze #C9B6FF · Nova #7C9CFF · Night #0F0D24, founder Sam Okafor.

**Deliver** a .dc.html canvas with 390 px mobile frames and 1000×620 desktop frames, each with a code label (K·1, L·2…), as in earlier handoffs. Where this brief and the canvas disagree, the canvas wins.

**Rules on every screen**
- Top bar: NAME NAME on the left, "Chapter 2 · {Name}" centred, ‹ › on the right. The thin orange evolution bar sits under it.
- Footer: one primary button, centred (full-width on mobile), with secondary links in one row under it.
- Fonts: Inter Tight for UI, Archivo 900 for the NAME NAME wordmark, JetBrains Mono for numbers, file names and sizes.
- Primary colour: white. Orange #FF4F1A is used only on the paywall and the names page.
- Mobile fits 390×844 without layout shifts. Chips and labels never wrap.
- Never name the registrar ("Buy {domain} ↗").

---

## Who buys, and what they need
Nearly all buyers are on an **iPhone**, from Google search ads. They're small local businesses: a soap and candle shop, gutter cleaning, an estate agency, a lash tech, a women's cheer-wear brand. They want to **use** the brand this week on Instagram, a shop sign, business cards or a Canva post. They are not designers, and many will never open an SVG.

**What happened with our first unlock:** she tapped Unlock, landed on the logo page, tapped back through the brand pages and left. She never saw the brand book or any kit. **Nothing tells a buyer what they now own.**

---

## 1 · K · "Your kit": the hub after unlock (new, the most important)
After Unlock → "You're early" (P·3), the primary leads here. The welcome-back email and the account page also land here.

- **K·1 (mobile):**
  - Header: "✓ {Name}'s brand is yours" and "Everything is ready. Open it, download it, use it today."
  - A list of **7 deliverable cards**, each with a real thumbnail of *their* brand, a title, a one-line "what it's for", the file format and size in mono, and two actions: **Open** and **↓**.
    1. Logo pack: "For your website, Instagram, shop sign" · SVG · PNG · favicon
    2. Brand book · 12 pages: "Share with anyone who designs for you" · PDF
    3. Socials kit: "Profile picture, banners, bios" · PNG
    4. Marketing kit: "3 launch posts, ads, a 3-week plan" · PNG · text
    5. Business cards: "Print-ready, 85 × 55 mm" · PDF
    6. Pitch deck · 10 slides: "Google Slides, Keynote, PDF" · PPTX · PDF
    7. Personalise your logo: "Change symbol, font, colour" · opens the editor
  - **Footer:** the primary "↓ Download everything (.zip)". Links "Email it to me · Next: claim {domain} →".
- **K·2:** the same page with "Downloaded ✓" states on two cards, plus a toast after "Email it to me".
- **K·d (desktop):** a 3-column grid of cards, with the header and the download-all button on the left.
- **States:** a card whose content is still generating shows a shimmer with "Writing your deck… about 10 s". Never an empty card.

## 2 · L · Logo personalisation, rebuilt on the new logo engine
Today, personalising swaps their logo for an older, simpler style. That's a downgrade on a paid feature. The new editor **starts from the exact logo they picked** and only changes what they touch.

**Controls** (show them all, mobile first):
- **Symbol:** a scrollable row of 12 symbols that fit their sector, plus "None".
- **Font:** 8 fonts shown as "Aa" swatches, grouped Serif / Sans / Display.
- **Layout:** side by side · stacked · wordmark only · badge · monogram · emblem. Small icons, not words.
- **Colour:** their 4 palette colours, plus a custom colour.
- **Size and spacing:** one slider for the symbol size, one for the letter spacing.
- **"Describe a change":** a text field ("make the sun smaller and greener") with 3 example chips.
- **Undo, and "Back to my original".**

**Frames:**
- **L·1:** the editor (mobile). The logo is large at the top and the controls sit in tabs below: Symbol · Font · Layout · Colour · Fine-tune.
- **L·2:** the same logo shown live on 4 mock-ups at once: shop sign, Instagram profile, business card, app icon.
- **L·3:** "Describe a change", showing loading, then the result with "Keep" / "Undo".
- **L·d:** desktop, with the logo and mock-ups on the left and controls on the right.

**Footer:** the primary "Save my logo". Link "← Your kit".

## 3 · P · The logo pack's contents (what's in the zip)
Design the **"Logo guide" page** that ships as a 1-page PDF inside the zip, and the **folder structure**:
- **P·1, logo guide (A4 landscape):**
  - the primary logo, reversed (on Night), mono black and mono white;
  - the app icon at 3 sizes, plus a favicon;
  - clear space shown with the "x" unit, and the minimum size;
  - the 4 colours with HEX / RGB / CMYK;
  - "Do / Don't" (no stretching, no recolouring outside the palette, no effects).
- **P·2, the folder tree:** `/Logo` (SVG, PNG @1x/@2x, transparent), `/Icon` (app icon 1024/512/180, favicon.ico, favicon-32.png), `/Colours` (.ase swatches + .txt), `Logo guide.pdf`, `README.txt` ("Which file do I use?": website = SVG, Instagram = PNG, print = PDF).

## 4 · B · Brand book: 2 new pages, and the cover
The book has 12 text pages on colour today. Add:
- **B·1 · "Aurova in use":**
  - 4–6 mock-ups in their palette and logo: shopfront sign, paper bag or packaging, phone screen, tote or T-shirt, a poster.
  - **These must work for any sector**, so give 2 sets: "retail / product" and "service / local business".
- **B·2 · "Mood and imagery":**
  - a photo-direction page with 6 image tiles (as treatment boxes, since we have no photography: colour wash, crop, grain), plus 3 "photograph this / not this" lines.
- **B·3 · cover v2:** a cover that feels like a studio deliverable, not a page. Show it as a mobile preview and as the printed A4.

## 5 · V · Visual variety: posts, banners, cards
Every brand gets the same gradient template today. Design **4 layout families** that the user's taste answers pick (Calm & minimal · Bold & bright · Classic & elegant · Playful):
- **V·1:** the 3 launch posts (1080×1080) in each family, so 12 posts.
- **V·2:** the LinkedIn banner (1584×396) and X banner (1500×500) in each family.
- **V·3:** business cards, with 2 layouts per family. Add an optional **QR code** on the back (to their domain).
- **Constraints:**
  - no photography;
  - shapes, the logo symbol, type and colour only;
  - copy lengths: post title ≤ 8 words, caption under the image.

## 6 · D · Pitch deck slides, made real
The deck is mostly placeholders today. **AI will now write a real first draft** of every slide from the brief. Design the 10 slide templates (1600×900) so a draft reads as a deck, not a form:
- Cover · Problem · Solution · Who it's for (market) · How it works (3 steps) · Business model · Traction · Team · The ask · Thank you.
- **Show each slide with Aurova's real drafted content.** Only Traction and The ask keep "[your number]" markers, styled as fill-in fields (dashed outline, mono).
- **D·1:** all 10 slides on one board.
- **D·2:** the deck page (08·p) updated with "Drafted for you · edit anything in Slides/Keynote".

---

## Events (we'll wire them)
| Event | When | Payload |
|---|---|---|
| `kit_hub_seen` | K·1 shown | `source`: unlock / email / account |
| `kit_open` | Open on a card | `asset` |
| `kit_asset_downloaded` | any ↓ | `asset` (logo_pack, book_pdf, socials, marketing, business_cards_pdf, deck_pdf, deck_slides, all_zip) |
| `kit_email_me` | "Email it to me" | none |
| `logo_edit` | any change in L | `control`: symbol / font / layout / colour / size / ask |
| `logo_saved` | Save my logo | `changes` count |

## What we're fixing in code meanwhile (no design needed)
- The logo lettering becomes vector shapes in every export, so files look identical on every device. Today they fall back to system fonts.
- Favicon (.ico, 32 px, 180 px) added to the pack.
- Real PDF files (book, cards, deck, logo guide) instead of the browser's print dialog, which is clumsy on iPhone.
- The pitch-deck content and the brand book story pages are written by our strongest model, with the etymology checked.

## Checklist
- [ ] K · Your kit hub: mobile, the downloaded state, desktop, generating state
- [ ] L · Personalisation on the picked logo: editor, live mock-ups, describe-a-change, desktop
- [ ] P · Logo guide PDF and the zip's folder structure
- [ ] B · "In use" (2 sector sets), "Mood and imagery", cover v2
- [ ] V · 4 layout families × posts, banners, cards (with QR)
- [ ] D · 10 drafted slides and the updated deck page
