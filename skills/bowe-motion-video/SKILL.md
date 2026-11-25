---
name: bowe-motion-video
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
- **The client's own promise.** When there is a site, read its main title, its subtitles and its calls to action
  (`curl -sL <url>` and the `<h1>`, `<h2>`, buttons, or `scripts/capture.mjs` for a look). The main promise is the
  client's, in the client's words: it must appear in the video, on screen. Note the features the site puts forward
  (an assistant, a free tier, a price) and keep them for the concept.
- **Where it will be posted** → formats (table below) and length.
- **Material**: logo, brand colours and font, app screenshots or the real app's UI code, the site URL, real
  numbers (users, ratings, prices) and whether the app is already in the stores.
- **Language** of the on-screen text (match the audience, not this file).

**Real screens first.** If the app runs in an emulator, device or simulator, capture its real screens (step 7)
instead of redrawing them: a video built from the real UI beats invented screens. Redraw in HTML only what cannot
be captured, from the app's own code and colours. Ask at most three short questions, and only about things that change the video.

| Format | Size | Where |
|---|---|---|
| `story` | 1080×1920 (9:16) | Reels, Stories, TikTok, Shorts |
| `feed` | 1080×1350 (4:5) | Instagram/Facebook feed, LinkedIn mobile |
| `square` | 1080×1080 (1:1) | feeds, marketplaces, X |
| `landscape` | 1920×1080 (16:9) | YouTube, website hero, presentations, LinkedIn desktop |

The eight templates lay out all four formats (landscape puts the text beside the device). Declare the ones the
person needs in `<body data-formats>`, and `check` every one: a layout that works in story often overflows in
feed or landscape.

### 2. Identify the sector

The sector decides the story, the proof, the genre and the look; the format does not. Two clients from different
sectors never get the same film in other colours. Before any concept:
1. Read the site, the app or the repository and note the clues listed in `references/sectors.md`.
2. Classify on three axes: the **sector** (one card of `sectors.md`, or "no card"), the **medium** (mobile app,
   site, or both) and the **model** (direct sale, subscription, matchmaking, booking, free with ads, donation).
3. For a mixed business, name one main sector (the one in the site's main title, or what the client is paid for)
   and at most one secondary sector, which gets a single beat.
4. Announce the classification in one line with the clues behind it, then go on without waiting. For example:
   "Gandal: education (main) + teacher matchmaking (secondary), mobile app + site, HAM subscription. Clues: quizzes
   by level, list of teachers, plans at 20,000 GNF a month."
5. Only when the clues contradict each other or are missing, ask the user ONE question instead of guessing (it
   counts in the brief's three). When no card fits, apply the cards' common rules and say so in the announcement.

### 3. Concept before the storyboard

A video that passes every check can still say nothing: the concept is what it says. Write it in five lines:
1. **The message**: one sentence the viewer keeps.
2. **The viewer's problem**, in the viewer's words.
3. **The product's answer, shown**: what the viewer sees the product do on screen (a search returning results, a
   reply typing, a value counting), not a line that claims it.
4. **The visual idea** that joins the beats: one object, place or gesture the film keeps returning to (the phone
   that becomes the next scene, a map that fills, a receipt that prints).
5. **The proof**: a real number, a real screen, a real price.

Start from the main sector's card (step 2): its trigger, its proof and its structure. The card decides the story
(the order of the beats and the proof); the template decides the layout and the moves. Its structure is given as
shares of the length, so a 20 s film keeps the same order and proportions as a 15 s one. Leave the card only with a
reason written in the storyboard.

Always offer the user **two concepts** in **two different genres from the card**, not two variants of one genre
nor only different wording, and wait for their choice before writing code; when they told you to go ahead without
them, or nobody can answer, pick the stronger one and say why in the report. Rules for both:
- **Every question on screen gets the product's answer in the next beat.** "Stuck on an exercise?" is followed by
  the product solving it, not by a feature list.
- **The client's main promise appears on screen** (from the brief), in their words.
- **The template is not the concept.** Templates give structure and moves; the story, the screens and every word
  come from the client. `check` reports any phrase or `[placeholder]` of the template still in the video
  (`template-leftover`). When several videos are made for one client, each gets its own concept and a different
  genre from the card, not one recipe with new words.

### 4. Storyboard

Write `storyboard.md` in the project folder, from the chosen concept: a table of beats with start time, what is on
screen, the words, the move, and what keeps the frame moving while a line holds. Read `references/storyboard.md`
for timing and structure (a visual hook before 0.5 s, one idea per beat, 6–8 words of on-screen text per beat,
each format composed for itself, end card 2.5–3 s).

### 5. Pick a look and the moves

- **Style preset** from `styles/`, starting with those the sector card names (with the client's own colours on top;
  see `references/styles.md`):
  `midnight-glow`, `pastel-pop`, `bold-type`, `clean-light`, `neon-lime`, `warm-editorial`.
- **Moves**: pick 3 to 5 from `references/moves.md` (the catalogue of Dribbble/Pinterest patterns with the exact
  markup for each). A video that uses every move looks like a template demo; one strong move per beat reads as
  designed.
- **Transitions with a cause**: join the beats through something on screen, 2 to 4 kinds per film (moves 19–25):
  a punch-in on the part of the screen the line names, the phone growing into the next scene, the next scene
  opening from the button pressed, a whip between two lines. Write each one in the storyboard's Move column.
- **Genre from the sector card.** Each card lists the genres that suit it. For shops and catalogues the products
  are the film: a phone with a title and chips undersells the catalogue. The product templates: `collage` (product
  photos slapped on paper with price tags and marker scribbles), `map-story` (the area draws itself, towns light up
  with their real counts; `scripts/geo-outline.mjs` turns a GeoJSON country or region into its outline and places),
  `parcel-3d` (a parcel drops, opens, the products burst out in 3D), `grid-montage` (a grid of cells cutting on the
  beat between photos, prices and places). Kinetic type and feed-style films suit brands and services better than
  catalogues.
- **3D** when the brief asks for it or the product reads best as objects in a small world (isometric app scenes,
  a delivery route, a process): `engine/scene3d.js` and `references/3d.md`; the `iso-promo` template is a working
  isometric promo. One continuous shot, objects entering one by one, the real app screens on a 3D phone.
- **Timing**: eases by role, exits half the entrance, a landed line holds still, entrances varied (moves.md,
  Timing). Floating loops and tap rings are options, not defaults: show the UI acting and the press answering.
- **The frame never freezes.** A landed line holds still, but the frame keeps moving: every beat gets a slow
  push (`data-drift="start,end"` on its scene or device, scale 1 → 1.07 over the beat) unless something else moves
  through it (the UI acting, a camera move, a 3D orbit). `check` reports 0.8 s where the frame barely changes (a moving background alone does not count) as
  `dead-time`, and a beat of more than 3.5 s where only one thing enters as `long-beat`.

### 6. Start the project

```bash
node <skill>/scripts/init.mjs <folder> --template app-promo|website-launch|social-ad|iso-promo|collage|map-story|parcel-3d|grid-montage --style <preset> [--name video]
cd <folder> && npm install && npx playwright install chromium
```

`init` copies the engine, the style (as `style.css`) and the template (as `<name>.html`). Several videos can share
one folder: run `init` again with another `--name`.
A template just made by `init` fails `check` with `template-leftover` (reported once, for the page) until every
`[placeholder]` and template phrase is replaced: that error is the list of what is left to write.

### 7. Build the video

Edit the HTML. Replace every sample name, screen, number and text with the client's. `references/engine.md` is the
full API; the essentials:

```html
<body data-duration="12" data-formats="story,feed">
  <div class="mid center" data-out="outBlur@2.2">                       <!-- leaves at 2.2 s -->
    <div class="display" data-words=".2,.1">Meet <span class="accent">Tempo</span></div>  <!-- words one by one -->
  </div>
  <div class="ph-wrap stage3d"><div class="phone" data-in="tiltIn@2.4/1.1" data-drift="3.5,7">…</div></div>
  <div data-show="5,9">shown from 5 s to 9 s</div>
<script src="engine/motion.js"></script>
<script>chips([...]); endcard({ at: 9.5, name: 'Tempo', stores: ['apple','google'] });</script>
```

- Position with a wrapper, animate the element inside it: an entrance animation owns `transform`, so a
  `translate(-50%)` on the same element would be lost.
- Give each format its layout with `body.feed …`, `body.square …`, `body.landscape …` rules; check them all.
- App screens: capture the running app, one screen per beat, after navigating to it (or asking the person to):

  ```bash
  node <skill>/scripts/capture-app.mjs home          # → assets/screens/home.png, Android (adb) or iOS simulator
  node <skill>/scripts/capture-app.mjs quiz --keep-status   # keep the status bar (iOS: cleaned to 9:41)
  ```

  It crops the status and navigation bars at their exact size. Inside a `.phone`, put the engine's clean
  `<div class="statusbar">` above `<img class="shot" src="assets/screens/home.png">`, and set `--screen-bg` and
  `--screen-ink` on the `.screen` to the colours at the top of the capture so the bar blends in; on a flat screen
  card, use the capture alone. Use a demo account, and look at every capture before using it: no real person's name, face,
  message or number. Capture a live site with `node <skill>/scripts/capture.mjs <url> --out assets/site.png` (stop
  above sections showing real people).

### 8. Check, then critique, before you render

```bash
node engine/check.mjs video.html                      # every format: errors and warnings, each with its fix
node engine/render.mjs video.html --sheet             # one frame per second, all declared formats, as one JPG
node engine/render.mjs video.html --sheet --every 0.25 --from 4.5 --to 7   # 4 frames a second around a transition
node engine/render.mjs video.html --still 4.2 --format feed
```

`check` plays the video and measures every line of text every 0.1 s: text under the platform's buttons
(`safe-zone`), off the frame or cut by its box, two texts overlapping, text covered by something opaque or by a
device or picture (`object-over-text`, probed at five points across each line and three heights, so a device over the bottom
of the letters counts), lines not held long enough to read
(0.5 s + 0.3 s a word; the last line 2 s), weak contrast, small letters, too many words at once, a title ending on
a single word (`orphan`), a short end card, missing files, frames that read as frozen for 0.8 s, backgrounds aside (`dead-time`), long
beats where one thing enters (`long-beat`), and template text left in the video (`template-leftover`). Fix every
error and run it again until it says `0 errors`; weigh each warning. Never silence a finding with `data-check` to
make it pass: only real UI inside a device (`ui`), small print (`note`) or a designed overlap (`overlap`) gets one.

`0 errors` is where the critique starts, not the end. `check` cannot judge whether the film says something:
1. Render a sheet at `--every 0.25` around **each transition** (from 0.5 s before to 0.5 s after) and one of the
   whole film, for every format, and look at all of them.
2. Score the film from 1 to 5 on each line, writing one sentence of evidence per score:
   - **Visual hook**: something striking is on screen before 0.5 s.
   - **Change**: something visibly changes every second.
   - **Product in action**: the viewer sees the product do its job, not only a claim about it.
   - **Motivated transitions**: each join goes through something on screen.
   - **True to the site**: the client's promise and features, in their words and colours.
   - **Readable on a phone**: sizes, contrast, one focus a beat, in every format.
   - **Sector proof**: the film shows the proof its sector card asks for, as a moment seen.
   - **No sector trap**: none of the traps listed in the sector card is in the film.
3. Revise while any score is below 4, then score again: at least two passes, even when the first looks good.
4. When you can start a sub-agent, have one that did not write the video do the scoring, from the sheets and the
   concept only; it sees what the author's eye fills in.

Show the user the scores with the sheets when you deliver.

### 9. Sound, render and deliver

```bash
node engine/render.mjs video.html                     # MP4 per format in renders/ (H.264, 30 fps), with its effects
node engine/render.mjs video.html --audio music.mp3   # music under the effects, faded in and out (--music-volume 0.55)
node engine/render.mjs video.html --sfx off           # silent
node engine/render.mjs video.html --scale 2 --motion-blur   # final render only: supersampled, film-like blur (8 sub-frames)
```

For the files that will be posted, and only for them, render with `--scale 2` (every frame at twice the size, PNG,
scaled down with lanczos: finer 3D edges and pictures; flat HTML text gains little) and `--motion-blur` on films
with whips and fast moves (8 sub-frames blended into each frame; with 3 or 4 a fast move shows as separate copies).
Their cost: `--scale 2` multiplies the render time by 4 to 5, `--motion-blur N` by N, and both multiply. Frames are
captured by several browsers at once (`--workers`, auto from the machine's cores, up to 4), and a 2D page renders
without Chrome's software GL, so a 17 s story previews in about 30 s on a 16-core laptop; 3D pages stay slower
(software WebGL). Draft, check and review the sheets at `--scale 1`; render the final once. Deliver the MP4 that
`render.mjs` wrote as it is: re-encoding it (an editor's export, a converter, a messaging app) compresses it a
second time and softens the text.

- **Effects on what is seen.** `<body data-sfx="auto">` (the templates have it) puts a sound on each visible
  action: a whoosh when the phone grows or the scene irises open, a click on a press, a pop, a tap as a chip
  lands, a swoosh on a camera move, a chime on the end card. `data-sfx="none"` mutes one element,
  `data-sfx="thud@4.2:0.8"` sets one (effects: `whoosh swoosh pop click tap chime thud riser`, or a file in the
  project). They are synthesised by the engine, so they carry no licence. Sound only what moves on screen; a
  film where everything clicks sounds cheap.
- **Voice-over** (optional): a synthetic voice that sounds robotic does more harm than none. In French, start
  with Chatterbox or the person's own recorded voice; Kokoro and Piper are offline fallbacks, flatter. Listen to
  the voice on the rendered MP4 before delivering, and say plainly if it still sounds synthetic. Chatterbox's free
  quota makes only a few lines a day, even with `HF_TOKEN`: for a series, make each video's lines as soon as they are
  written (they are cached), and tell the person early if the rest must wait a day or needs Hugging Face PRO. Write the lines in
  the storyboard, then put them on the page, `data-vo="…"` on the
  element they go with (said when it enters) or `window.VOICE = [{ at, text }]`. Voices: Kokoro, natural, free and
  offline (`voice-setup.mjs --kokoro` once; `kokoro:ff_siwis` in French, `kokoro:af_heart` in English); Chatterbox, the most natural
  (`voice-setup.mjs --chatterbox` once; `chatterbox:fr`, or `chatterbox:fr@assets/voice/ref.wav` to speak with
  the voice of a person who agreed, from a 10-30 s recording); Piper, free and offline
  (`node <skill>/scripts/voice-setup.mjs` once; `<body data-voice="piper:fr_FR-siwis-medium">`, a woman, or
  `piper:fr_FR-upmc-medium#pierre`, a man), Google Cloud Text-to-Speech (`google:fr-FR-Neural2-A`, with the
  person's own `GOOGLE_TTS_API_KEY`), or the person's recorded voice (`{ at, file: 'assets/voice/01.m4a' }`),
  often the most convincing for a local audience. `data-voice-rate="1.1"` speeds it up. `check` times every line:
  no line may run into the next or past the end. The music ducks under the voice by itself. Credit a Piper
  voice where its licence asks (siwis CC BY 4.0, upmc CC BY-SA 4.0), in the post's caption.
- **Music**: a social ad always gets music. Ask the person for a track they own or license for ads, or propose a
  royalty-free source whose licence covers ads on social media (YouTube Audio Library, Pixabay Music, a paid
  library such as Artlist or Epidemic Sound; read the track's licence, some require a credit). Never a commercial
  song. Take the track's tempo from the library (BPM) or count its beats over 10 s, and cut on it: beat changes,
  whips and presses on the beat (a beat lasts 60/BPM s; at 120 BPM, 0.5 s). Effects stay, under the music.
- Videos autoplay muted in feeds: every message must still work without sound.

Report the files with their format and length, what each is for, the critique scores, and what the user should
replace (sample screens, stand-in numbers, the music).

## Network access (disclosed)

Rendering, checking and the sound effects run locally. The skill reaches the network only for:
- **Fonts**: style presets (and the `collage` template's marker font) load Google Fonts (fonts.googleapis.com) when a page renders.
- **Live pages**: `scripts/capture.mjs` opens the URL the user gives, to capture it.
- **Voice setup, once**: `scripts/voice-setup.mjs` installs Piper or Kokoro with uv/pipx and downloads their
  model files (huggingface.co/rhasspy, github.com/thewh1teagle/kokoro-onnx).
- **Optional voices**: `chatterbox:` sends the line's text (and a reference recording, if one is given) to the
  official Chatterbox Space on Hugging Face; `google:` sends the text to Google Cloud Text-to-Speech with the user's
  own key. Piper and Kokoro run offline.

No credentials are read or sent except the keys the user sets for those services (`HF_TOKEN`,
`GOOGLE_TTS_API_KEY`), and only to those services.

## Honesty in ads

Show only true claims. Numbers, ratings, reviews, user counts and press logos come from the user; if the video
needs illustrative data on app screens, keep it plausible and add the small `.disclaimer` line ("Screens are
illustrative"). Say "Coming soon" on store badges until the app is live. Products, prices and places in a
shop's video are its real listings (with the seller's agreement for a marketplace), and a map's counts are real
and dated: replace every stand-in before rendering for posting. Never use another company's logo or
product as if it were the client's.

## Files

- `engine/` — `motion.css` (components, keyframes), `motion.js` (timing engine, helpers, sound cues), `check.mjs`
  (quality check), `render.mjs` (renderer), `sound.mjs` (effects and mix), `page.mjs` (shared), `leftover.mjs`
  (template text left in a video)
- `styles/` — six presets; `references/styles.md` says when to use which and how to brand one
- `templates/` — `app-promo` (15 s), `website-launch` (15 s), `social-ad` (12 s), `iso-promo` (12 s, 3D); for products:
  `collage` (16 s), `map-story` (16.4 s), `parcel-3d` (14.4 s, 3D), `grid-montage` (13.4 s). Each is a working
  structure that passes `check` in all four formats, with its words as `[placeholders]` naming their role (no
  sector, nothing to translate); the product ones draw stand-in images until `PRODUCTS` gets real photos
- `engine/scene3d.js` and `references/3d.md` — 3D scenes (isometric or perspective) on the video's clock
- `references/sectors.md` — the sector cards: clues, proof, structure, genres, look, traps
- `references/moves.md` — the motion patterns with markup · `references/storyboard.md` — structure and timing ·
  `references/engine.md` — every attribute, helper and keyframe · `references/troubleshooting.md`
- `scripts/init.mjs` — new project · `scripts/capture-app.mjs` — capture the running app (Android, iOS simulator)
  · `scripts/capture.mjs` — capture a live web page · `scripts/geo-outline.mjs` — a GeoJSON area and its places as
  the outline and points of `map-story` (offline) · `scripts/test-templates.mjs` — for whoever edits the skill:
  every template in every style and format through `check`, as a grid
