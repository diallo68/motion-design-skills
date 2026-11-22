# Storyboard

## Length by use
| Use | Length | Beats |
|---|---|---|
| Social ad (Reels, TikTok, Stories) | 6–15 s | hook, answer, 2–3 proofs, offer, CTA |
| App promo / launch | 12–25 s | intro, product, 3–4 features, breadth, end card |
| Website launch | 10–20 s | statement, browser, scroll + highlights, mobile, end card |
| Store preview (App Store/Play) | 15–30 s | features only, real UI, no end card with price |

## Rules that make it read
- **Hook in the first frame.** In a feed the first frame decides. Open on the viewer's problem in their words, a
  bold claim, or the product already moving — never on a logo alone. Its words land within 1 s, then hold.
- **One idea per beat**, 2–3 s each. A beat is one headline, one visual focus, one move.
- **Text is the soundtrack.** 6–8 words per beat, large, readable for 0.5 s + 0.3 s a word once fully in
  (5 words: 2 s; `check.mjs` measures it). When a beat is too short, cut words before you cut time.
- **Motivated cuts.** Change screen, headline and chip on the same beat; let the phone or the ground carry over
  so the video feels like one shot.
- **Rhythm.** Entrances 0.5–0.9 s, exits 0.3–0.5 s, overlaps of 0.1–0.2 s. Vary: a fast stagger, then a calm hold.
- **Safe areas.** In `story`, text stays inside x 60–960 and y 270–1250: the top 14 % (account bar), the bottom
  35 % (caption, music, buttons) and the right 120 px (like and comment column) are covered on Reels, TikTok and
  Shorts. `.top`, `.bottom`, `chips()` and `endcard()` already respect it. Devices and pictures may extend there.
- **End card 2.8–3 s**: name, one line, one action (URL, "Download", store badges); the last line holds 2 s.

## Template
Add a Sound column when the film has music or a sound that matters (the auto effects need no planning).

| Time | On screen | Words | Move |
|---|---|---|---|
| 0.0–2.5 | the problem, big type | "Still splitting bills by hand?" | words one by one |
| 2.5–5.0 | product name, one line | "Meet Splitly" / "Bills settled in one tap." | zoom in |
| 5.0–9.2 | three cards | "Add a receipt / Split with friends / Settle up" | cards stack |
| 9.2–12 | end card with the offer | "Free for groups up to 8" · "Download free" + badges | end card |

## Formats
Design for the primary format first (usually `story`), then adapt: `feed` moves blocks up and scales the device
to about 0.8; `square` to about 0.65; `landscape` puts text beside the device instead of above it.
