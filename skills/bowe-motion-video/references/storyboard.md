# Storyboard

## Length by use
| Use | Length | Beats |
|---|---|---|
| Social ad (Reels, TikTok, Stories) | 6–15 s | hook, answer, 2–3 proofs, offer, CTA |
| App promo / launch | 12–25 s | intro, product, 3–4 features, breadth, end card |
| Website launch | 10–20 s | statement, browser, scroll + highlights, mobile, end card |
| Store preview (App Store/Play) | 15–30 s | features only, real UI, no end card with price |

## Rules that make it read
- **Hook in the first frame.** In a feed the first frame decides. Something striking is on screen before 0.5 s
  (the product already moving, a bold image, the first words landing), then the viewer's problem in their words
  or a bold claim — never a logo alone, never an empty ground waiting for the title.
- **A question gets its answer.** When the hook asks ("Stuck on an exercise?"), the next beat shows the product
  answering it, on screen.
- **One idea per beat**, 2–3 s each. A beat is one headline, one visual focus, one move.
- **Text is the soundtrack.** 6–8 words per beat, large, readable for 0.5 s + 0.3 s a word once fully in
  (5 words: 2 s; `check.mjs` measures it). When a beat is too short, cut words before you cut time.
- **Motivated cuts.** Change screen, headline and chip on the same beat; let the phone or the ground carry over
  so the video feels like one shot.
- **Rhythm.** Entrances 0.5–0.9 s, exits 0.3–0.5 s, overlaps of 0.1–0.2 s. Vary: a fast stagger, then a calm hold.
  A hold is still alive: the slow push (`data-drift`) or the UI acting keeps the frame moving (moves.md, Timing).
- **Safe areas.** In `story`, text stays inside x 60–960 and y 270–1250: the top 14 % (account bar), the bottom
  35 % (caption, music, buttons) and the right 120 px (like and comment column) are covered on Reels, TikTok and
  Shorts. `.top`, `.bottom`, `chips()` and `endcard()` already respect it. Devices and pictures may extend there.
- **End card 2.8–3 s**: name, one line, one action (URL, "Download", store badges); the last line holds 2 s.

## Template
Add a Sound column when the film has music or a sound that matters (the auto effects need no planning), and a
Voice column for a voice-over: one short line per beat, about 2.5 words a second, never more than the beat holds.

Start the file with one line for the sector (SKILL.md, step 2), then the five lines of the concept (step 3),
then the beats:

```
Sector: … · Medium: … · Model: … · Genre: … · Proof: …
```

The beats follow the order and proportions of the sector card's structure. The example shows the
shape only: its words are placeholders for the client's.

| Time | On screen | Words | Move | Alive while it holds |
|---|---|---|---|---|
| 0.0–2.5 | the problem, big type | "[the viewer's problem, as a question]" | words one by one | slow push on the ground |
| 2.5–5.5 | the product answering it, in the phone | "[the answer]" | phone in, the UI acts | a value counts, a row fills |
| 5.5–9.2 | three proofs | "[proof 1 / proof 2 / proof 3]" | cards stack | each card a second apart |
| 9.2–12 | end card with the offer | "[offer]" · "[action]" + badges | end card | — |

## Formats: compose each one

Each format gets its own composition, not the same layout shrunk. Design the primary format first (usually
`story`), then recompose:
- **story (9:16)** has height to spend: use it. A larger device (scale 1.1–1.35, bleeding off the bottom edge where
  the platform's caption sits anyway), the title above it and allowed to overlap its top edge on purpose
  (`data-check="overlap"` on that title), big type stacked on several lines. A story that looks like a feed post
  with empty bands above and below wastes the format.
- **feed (4:5)** moves blocks up and scales the device to about 0.8; one line of title.
- **square (1:1)** to about 0.65; shorter titles (cut words rather than shrinking them), or the title beside the
  device.
- **landscape (16:9)** puts text beside the device instead of above it.

`check` measures every format; look at each sheet, since a format can pass and still look empty or crowded.
