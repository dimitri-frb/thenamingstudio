// Bundled for the visual fixture test (scripts/visual-fixtures.mjs): exposes
// the generators that build the paid kit's images.
import { avatar, banner, cardBack, cardFront, post } from "../src/wrapped/families";
import { deckContent, deckScenes, sceneSvg } from "../src/wrapped/deck2";
import { ensureFonts } from "../src/wrapped/logos";
(window as any).KIT = { avatar, banner, cardBack, cardFront, post, deckContent, deckScenes, sceneSvg, ensureFonts };
