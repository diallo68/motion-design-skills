# Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `check` reports `safe-zone` in story | move the text inside x 60–960, y 270–1250; use `.top`/`.bottom`, which already do |
| `check` reports `read-time` | hold the line longer or cut words; a split line counts from when most words are in |
| `check` reports `covered` | something opaque is drawn on top (a later element, a card): raise the text's `z-index` or retime |
| `check` flags app text inside a phone | it is not inside `.phone`/`.browser`: add `data-check="ui"` to its container |
| `capture-app` sees no device | start the emulator or simulator first; `--list` shows what `adb` and `simctl` see |
| A capture sits under the phone's notch | put `<div class="statusbar">` before the `<img class="shot">`, or capture with `--keep-status` |
| The render has no sound | the page needs `<body data-sfx="auto">`, `data-sfx` on elements or `--audio`; check `--sfx off` is not set |
| An effect is too loud or doubled | set `data-sfx="none"` on that element, or `data-sfx="tap@t:0.2"` for a quieter one |
| `Piper is not installed` / `Voice … is not downloaded` | run `node <skill>/scripts/voice-setup.mjs` (it installs Piper with uv and the French voices) |
| `GOOGLE_TTS_API_KEY is not set` | create an API key restricted to the Text-to-Speech API in Google Cloud, `export GOOGLE_TTS_API_KEY=…` in your shell profile |
| `voice-overlap` / `voice-late` | start the next line later, cut words, or `data-voice-rate="1.1"` |
| `Playwright is missing` | run `npm install && npx playwright install chromium` in the project folder |
| `ffmpeg is not on the PATH` | install ffmpeg (macOS `brew install ffmpeg`, Ubuntu `sudo apt install ffmpeg`, Windows `winget install ffmpeg`) |
| Fallback font in the frames | the Google Fonts `@import` needs network at render time; or ship `.woff2` files with `@font-face` |
| An element jumps or loses its position | its entrance animation owns `transform`; position a wrapper and animate the child |
| Something shows before its time | a `data-in` keyframe whose first step is visible; start entrances from `opacity: 0` |
| Element reappears after `data-out` | it also has `data-show`, which restarts animations; use one or the other |
| Words split oddly | `data-words` splits text nodes on spaces; use `&nbsp;` to keep two words together |
| Ticker cuts a word | each `<span>` inside the ticker must be one line; shorten the word or lower the font size |
| Blank frames at the start | images not local or too large; keep assets in the project and under ~3 MB each |
| Render is slow | it is about 0.1–0.3 s per frame; render one format with `--format`, check with `--sheet` first |
| Video not accepted by a platform | outputs are H.264, yuv420p, 30 fps, faststart: accepted everywhere; add `--fps 60` only if asked |
