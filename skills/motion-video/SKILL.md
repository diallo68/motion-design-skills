---
name: motion-video
description: Make motion design videos — app promos, website launch videos and social media ads (Reels, Stories, TikTok, feed posts) — rendered to MP4 from HTML/CSS, with the moves seen on Dribbble and Pinterest (kinetic type, 3D floating phones, UI cards, chips, cursor taps, tickers, counters, end cards with store badges). Use this skill whenever the user wants a promo video, launch video, teaser, product animation, explainer clip, animated ad, motion graphics, "motion design", a video for Instagram/Facebook/TikTok/LinkedIn/YouTube Shorts, or an animated showcase of an app or website, even if they only say "make a video for my app" or "animate our launch". Not for editing camera footage or generating AI video from prompts.
---

# Motion video

Turn a product (an app, a website, a service) into short motion design videos that look like the work people
save on Dribbble and Pinterest, rendered frame by frame to MP4. Each video is one HTML page: CSS keyframes and a
few `data-` attributes describe what moves when; a renderer scrubs time and records every frame, so the result is
exact and repeatable, with no screen recording and no timeline app.

`<skill>` below is this folder.

## What you need on the machine

Node 18+, ffmpeg on the PATH, and Playwright's Chromium (installed per project by `npm install` and
`npx playwright install chromium`). If ffmpeg is missing, say how to install it (macOS `brew install ffmpeg`,
Debian/Ubuntu `sudo apt install ffmpeg`, Windows `winget install ffmpeg`) instead of working around it.

## The workflow

### 1. Brief (ask only what you cannot find)

Collect, from the conversation, the repository or the live site first:
- **What it is and for whom**, in one plain sentence. The one message the video must leave.
- **Where it will be posted** → formats (table below) and length.
- **Material**: logo, brand colours and font, app screenshots or the real app's UI code, the site URL, real
  numbers (users, ratings, prices) and whether the app is already in the stores.
- **Language** of the on-screen text (match the audience, not this file).

If the user's own codebase holds the app, read its screens and colours: a video built from the real UI beats
invented screens. Ask at most three short questions, and only about things that change the video.

| Format | Size | Where |
|---|---|---|
| `story` | 1080×1920 (9:16) | Reels, Stories, TikTok, Shorts |
| `feed` | 1080×1350 (4:5) | Instagram/Facebook feed, LinkedIn mobile |
| `square` | 1080×1080 (1:1) | feeds, marketplaces, X |
| `landscape` | 1920×1080 (16:9) | YouTube, website hero, presentations, LinkedIn desktop |

### 2. Storyboard before code

Write `storyboard.md` in the project folder: a table of beats with start time, what is on screen, the words, and
the move. Show it to the user when the brief was thin; otherwise go on. Read `references/storyboard.md` for timing
and structure (hook in the first 1.5 s, one idea per beat, 6–8 words of on-screen text per beat, end card 2.5–3 s).

### 3. Pick a look and the moves

- **Style preset** from `styles/` (or the client's own colours on top of one; see `references/styles.md`):
  `midnight-glow`, `pastel-pop`, `bold-type`, `clean-light`, `neon-lime`, `warm-editorial`.
- **Moves**: pick 3 to 5 from `references/moves.md` (the catalogue of Dribbble/Pinterest patterns with the exact
  markup for each). A video that uses every move looks like a template demo; one strong move per beat reads as
  designed.

### 4. Start the project

```bash
node <skill>/scripts/init.mjs <folder> --template app-promo|website-launch|social-ad --style <preset> [--name video]
cd <folder> && npm install && npx playwright install chromium
```

`init` copies the engine, the style (as `style.css`) and the template (as `<name>.html`). Several videos can share
one folder: run `init` again with another `--name`.

### 5. Build the video

Edit the HTML. Replace every sample name, screen, number and text with the client's. `references/engine.md` is the
full API; the essentials:

```html
<body data-duration="12" data-formats="story,feed">
  <div class="mid center" data-out="outBlur@2.2">                       <!-- leaves at 2.2 s -->
    <div class="display" data-words=".2,.1">Meet <span class="accent">Tempo</span></div>  <!-- words one by one -->
  </div>
  <div class="ph-wrap stage3d"><div class="phone" data-in="tiltIn@2.4/1.1" data-loop="floatTilt/5">…</div></div>
  <div data-show="5,9">shown from 5 s to 9 s</div>
<script src="engine/motion.js"></script>
<script>chips([...]); endcard({ at: 9.5, name: 'Tempo', stores: ['apple','google'] });</script>
```

- Position with a wrapper, animate the element inside it: an entrance animation owns `transform`, so a
  `translate(-50%)` on the same element would be lost.
- Give each format its layout with `body.feed …`, `body.square …`, `body.landscape …` rules; check them all.
- App screens: real screenshots (`<img class="shot">`) or HTML rebuilt from the real UI. Capture a live site with
  `node <skill>/scripts/capture.mjs <url> --out assets/site.png` (stop above sections showing real people).

### 6. Check, then look, before you render

```bash
node engine/check.mjs video.html                      # every format: errors and warnings, each with its fix
node engine/render.mjs video.html --sheet             # one frame per second, all declared formats, as one JPG
node engine/render.mjs video.html --still 4.2 --format feed
```

`check` plays the video and measures every line of text every 0.1 s: text under the platform's buttons
(`safe-zone`), off the frame or cut by its box, two texts overlapping, text covered by something opaque, lines not
held long enough to read (0.5 s + 0.3 s a word; the last line 2 s), weak contrast, small letters, too many words at
once, a short end card, missing files. Fix every error and run it again until it says `0 errors`; weigh each
warning. Then open every sheet: `check` cannot judge whether a beat has one clear focus or looks good. This
step is where most of the quality comes from; do not skip it to save time. Never silence a finding with
`data-check` to make it pass: only real UI inside a device (`ui`), small print (`note`) or a designed overlap
(`overlap`) gets one.

### 7. Render and deliver

```bash
node engine/render.mjs video.html                     # MP4 per format in renders/ (H.264, 30 fps)
node engine/render.mjs video.html --audio music.mp3   # optional: a licensed track, faded out at the end
```

Report the files with their format and length, what each is for, and what the user should replace (sample
screens, stand-in numbers). Videos autoplay muted in feeds: every message must work without sound.

## Honesty in ads

Show only true claims. Numbers, ratings, reviews, user counts and press logos come from the user; if the video
needs illustrative data on app screens, keep it plausible and add the small `.disclaimer` line ("Screens are
illustrative"). Say "Coming soon" on store badges until the app is live. Never use another company's logo or
product as if it were the client's.

## Files

- `engine/` — `motion.css` (components, keyframes), `motion.js` (timing engine, helpers), `check.mjs` (quality
  check), `render.mjs` (renderer), `page.mjs` (shared by both)
- `styles/` — six presets; `references/styles.md` says when to use which and how to brand one
- `templates/` — `app-promo` (15 s), `website-launch` (14 s), `social-ad` (10 s); each is a working video
- `references/moves.md` — the motion patterns with markup · `references/storyboard.md` — structure and timing ·
  `references/engine.md` — every attribute, helper and keyframe · `references/troubleshooting.md`
- `scripts/init.mjs` — new project · `scripts/capture.mjs` — capture a live web page
