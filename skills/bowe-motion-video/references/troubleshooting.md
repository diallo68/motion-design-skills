# Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `check` reports `safe-zone` in story | move the text inside x 60–960, y 270–1250; use `.top`/`.bottom`, which already do |
| `check` reports `read-time` | hold the line longer or cut words; a split line counts from when most words are in |
| `check` reports `covered` | something opaque is drawn on top (a later element, a card): raise the text's `z-index` or retime |
| `check` reports `dead-time` | the frame is frozen while a line holds: `data-drift="a,b"` on the beat's scene or device, or let the UI act (moves 26–28) |
| `check` reports `object-over-text` | a phone, card or picture covers part of a line: move or scale it, shorten or rebalance the line; `data-check="overlap"` only when the overlap is designed |
| `check` reports `template-leftover` | a phrase or `[Placeholder]` of the template is still in the page (text, voice line or script string): write it from the client's concept |
| `check` reports `orphan` | the title ends on one word: shorten it, change its size or width, or join the last two words with `&nbsp;` |
| `check` flags app text inside a phone | it is not inside `.phone`/`.browser`: add `data-check="ui"` to its container |
| `capture-app` sees no device | start the emulator or simulator first; `--list` shows what `adb` and `simctl` see |
| A capture sits under the phone's notch | put `<div class="statusbar">` before the `<img class="shot">`, or capture with `--keep-status` |
| The render has no sound | the page needs `<body data-sfx="auto">`, `data-sfx` on elements or `--audio`; check `--sfx off` is not set |
| An effect is too loud or doubled | set `data-sfx="none"` on that element, or `data-sfx="tap@t:0.2"` for a quieter one |
| `Kokoro is not set up` | run `node <skill>/scripts/voice-setup.mjs --kokoro` (about 350 MB of model files) |
| `Piper is not installed` / `Voice … is not downloaded` | run `node <skill>/scripts/voice-setup.mjs` (it installs Piper with uv and the French voices) |
| `GOOGLE_TTS_API_KEY is not set` | create an API key restricted to the Text-to-Speech API in Google Cloud, `export GOOGLE_TTS_API_KEY=…` in your shell profile |
| `Chatterbox failed: … ZeroGPU runs limit` | the free quota is used up. Anonymous: a few lines; with a free account (`HF_TOKEN`): a few lines a day, renewed daily; Hugging Face PRO: about 40 GPU minutes a day. Finished lines are cached, so run again the next day and only the missing lines are made, or use Kokoro or Piper meanwhile |
| A Chatterbox line runs on after its text | handled: a line much longer than its text is made again with another seed, then cut at the first pause; silences at both ends are trimmed |
| `Chatterbox is not set up` | run `node <skill>/scripts/voice-setup.mjs --chatterbox` |
| `voice-overlap` / `voice-late` | start the next line later, cut words, or `data-voice-rate="1.1"` |
| `Playwright is missing` | run `npm install && npx playwright install chromium` in the project folder |
| `ffmpeg is not on the PATH` | install ffmpeg (macOS `brew install ffmpeg`, Ubuntu `sudo apt install ffmpeg`, Windows `winget install ffmpeg`) |
| Fallback font in the frames, or `check` and the render differ | the Google Fonts `@import` needs network at check and render time, and a fallback font changes every line's width. Install the fonts in the project: `npm i @fontsource/inter-tight` (the family the style's `@import` names: Inter Tight for midnight-glow, Archivo, Nunito, Plus Jakarta Sans, Space Grotesk, Fraunces and DM Sans for the others), then in `style.css` replace the `@import` with one `@import url('node_modules/@fontsource/inter-tight/800.css');` per weight used; or put `.woff2` files in `assets/fonts/` with an `@font-face { font-family: …; src: url('assets/fonts/x.woff2') format('woff2'); font-weight: …; }` each. `check` then needs no network |
| An element jumps or loses its position | its entrance animation owns `transform`; position a wrapper and animate the child |
| Something shows before its time | a `data-in` keyframe whose first step is visible; start entrances from `opacity: 0` |
| Element reappears after `data-out` | it also has `data-show`, which restarts animations; use one or the other |
| Words split oddly | `data-words` splits text nodes on spaces; use `&nbsp;` to keep two words together |
| Ticker cuts a word | each `<span>` inside the ticker must be one line; shorten the word or lower the font size |
| Blank frames at the start | images not local or too large; keep assets in the project and under ~3 MB each |
| Render is slow | it is about 0.2–0.6 s per frame (×4–5 with `--scale 2`, ×N with `--motion-blur N`, and they multiply); render one format with `--format`, check with `--sheet` first, keep the quality options for the final render |
| Video not accepted by a platform | outputs are H.264, yuv420p, 30 fps, faststart: accepted everywhere; add `--fps 60` only if asked |
