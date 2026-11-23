# Engine reference

A video is an HTML page that links `engine/motion.css`, `style.css`, then loads `engine/motion.js` at the end of
`<body>`, followed by its own script. The renderer opens it at the format's size (`?format=`) and calls
`window.seek(t)` for each frame. Open the file in a browser with `?format=feed&t=4.2` to preview one moment.

## Body attributes
- `data-duration="15"` — length in seconds.
- `data-formats="story,feed,square"` — formats rendered by default. `body` gets the class of the current format.

## Timing attributes
| Attribute | Example | Meaning |
|---|---|---|
| `data-in` | `fadeUp@1.2`, `pop@1.2/.5` | entrance keyframe at a time (default .8 s); holds the end state |
| `data-out` | `outUp@4.5`, `fadeOut@9/.3` | exit keyframe (default .5 s); stays gone |
| `data-loop` | `float/4` | infinite loop of a keyframe, cycle in seconds |
| `data-show` | `2,6` | present from 2 s to 6 s (`display` toggled); omit the end to stay |
| `data-words` | `1,.08` | split text into words entering 0.08 s apart from 1 s |
| `data-type` | `2,18` | type the text from 2 s at 18 characters/s |
| `data-count` | `0,1200,3,1.5,0` | count from, to, start, duration, decimals (locale of `<html lang>`) |
| `data-ticker` | `2,1.4` | roll child `<span>`s every 1.4 s from 2 s |
| `data-tap` | `5.2` | tap ring at 5.2 s (on a `.tap` element) |
| `data-cam` | `2/.6 1.8 0 -240; 4/.5 1 0 0` | camera on a `.cam` wrapper: states `at/duration scale x y [ease]` in order |
| `data-become` | `9.9/.6` | grows past the frame (measured on its start frame); its fill becomes the next ground |
| `data-point` | `#go@9.05` | places the element (a cursor) on that element's centre as it is at that time |
| `data-from` | `#go` | an `iris` on a `.flood` starts from that element's centre |
| `data-check` | `note` | how `check.mjs` treats the element: `ignore`, `ui`, `note`, `overlap` |

Any timing may name its ease after a colon: `fadeUp@1.2/.8:move`. Eases: `arrive` (entrances, default), `leave`
(exits, default), `move` (floods, irises, camera, default), `pop`, `linear`. Exits default to 0.4 s.

An element can have `data-in`, `data-out` and `data-loop` together. Entrance and loop both drive `transform`: the
later one in the list wins, so put a loop on a wrapper when the entrance also moves the element.

## Keyframes
Entrances: `fadeIn fadeUp fadeDown slideL slideR pop zoomIn zoomOut blurIn maskUp maskRight wordIn riseIn phoneIn
tiltIn flyIn grow growY tapRing press settle`. Exits: `fadeOut outUp outDown outScale outBlur`. Transitions: `iris
whipOutL whipOutR whipOutUp whipInL whipInR whipInUp dip` (see moves 19–25). Loops: `float floatTilt
spin pulse drift marquee marqueeY`. Add your own `@keyframes` in the page and use them by name.

## Components (classes)
Type `display h1 h2 lead label accent muted hl grad center` · layout `layer abs stack row top mid bottom` ·
grounds `bg-glow bg-grid bg-dots bg-mesh grain` · devices `stage3d phone phone.sm screen statusbar shot` ·
`browser bar lights url view progress` · `card glass chip pill btn store` · `cursor tap` · `disclaimer` ·
transitions `cam flood dip`.

## Helpers (JS, after motion.js)
- `icon(name)` — SVG: `sparkles check bolt heart star bell chat lock lockOpen chart calendar search user users globe
  phone pin cart card play arrow shield clock gift cursor apple googleplay`.
- `chips([{ icon, text, at, side: 'left'|'right', top, hold, inset }])` — pills that slide in and out.
- `endcard({ at, logo, name, tagline, cta, stores: ['apple','google'], storeNote, note })`.
- `FORMAT` — current format, for per-format numbers in scripts. `window.onSeek = (t) => {}` — run code each frame
  for anything procedural (a drawn path, a custom value); it must depend only on `t`.

## Variables (set by the style, override in the page)
`--bg --bg2 --ink --muted --accent --accent-ink --accent2 --card --card-ink --line --font --font-display
--display-weight --tracking --radius --shadow --screen-bg --screen-ink --end-bg --end-ink --end-btn --end-btn-ink
--pad --ease --ease-pop --ease-io --ease-arrive --ease-move --ease-leave`.

## Sound
`<body data-sfx="auto">` gives each visible action its effect (become and iris: whoosh; press: click; pop: pop;
chips sliding in: tap; phone, fly and zoom entrances, camera moves: swoosh; whip out: whoosh; end card: chime).
`data-sfx` on an element: `none`, `pop` (at its entrance or become time), `pop@3.2:0.6` (time and gain), or a file
path. `window.SFX = [{ at, sfx, gain }]` adds cues by script. Effects are synthesised by `sound.mjs` into
`engine/.sfx/` on first render, each peaking at -3 dB. `render.mjs --audio track.mp3 --music-volume 0.55` lays
music under them; `--sfx off` renders silent.
The finished mix is normalised to -16 LUFS with voice or music, -18 LUFS for effects alone, peaks under
about -1.5 dB: loud enough for feeds, never clipping.

## Voice-over
Lines: `data-vo="Bloqué sur un exercice ?"` on an element (said at its entrance, `data-vo-at="1.2"` to move it), or
`window.VOICE = [{ at, text }, { at, file }]`. Voice: `<body data-voice="provider:voice">` or `--voice` on render
and check (`--voice off` for none); speed `data-voice-rate`.

| Provider | Example | Needs |
|---|---|---|
| Piper (default) | `piper:fr_FR-siwis-medium`, `piper:fr_FR-upmc-medium#pierre` | `scripts/voice-setup.mjs` once; free, offline |
| Google Cloud TTS | `google:fr-FR-Neural2-A`, `google:fr-FR-Wavenet-B` | `GOOGLE_TTS_API_KEY` (an API key restricted to Text-to-Speech) |
| Kokoro (natural, offline) | `kokoro:ff_siwis` (French), `kokoro:af_heart`, `kokoro:bm_george` (English) | `scripts/voice-setup.mjs --kokoro` once; no account, no network |
| Chatterbox (most natural) | `chatterbox:fr`, `chatterbox:fr@assets/voice/ref.wav` | `scripts/voice-setup.mjs --chatterbox` once; runs on Hugging Face (any machine); `HF_TOKEN` for quota |
| Recorded | `{ at: 1.2, file: 'assets/voice/01.m4a' }` | a clean recording, one file per line |

Chatterbox (Resemble AI, MIT licence, 23 languages) speaks with the voice of a 10–30 s reference recording when
one is given: only a person who agreed (the client, a teacher, an actor with a signed release), or a recording
whose licence allows it; never a voice taken from the internet. The text and the recording go to Hugging Face;
every clip carries Resemble's inaudible watermark. Lines may set `exaggeration` (0.25 calm, 0.5 default, 0.8
expressive) and `cfg` (lower is slower and more deliberate): `{ at, text, exaggeration: 0.6 }`.

Lines are cached in `.voice/` by their text. The mix cleans the voice (high-pass, gentle compression), lowers the
effects to 70 % and ducks the music about 11 dB while someone speaks. `check` reports `voice-overlap`,
`voice-late` and `voice` (a provider error).

## Check (`node engine/check.mjs video.html`)
Rules, each reported with a time range, the element and a fix: `safe-zone` (story: text inside x 60–960, y 270–1250,
clear of the Reels/TikTok/Shorts buttons and caption; other formats: a 5 % margin), `off-frame`, `cut-off`,
`overlap`, `covered`, `read-time` (0.5 s + 0.3 s a word), `last-line` (2 s), `end-card` (2.5 s), `small-text`
(2.6 % of the short side, 20 px for small print), `contrast` (3:1 at least), `crowded` (over 18 words at once),
`never-shown`, `load`, and motion warnings `moving-text` (a loop on text), `same-entrance`, `tap-ring`. Errors make the exit code 1. `--format story` checks one format, `--json` prints findings.

`data-check` on an element (inherited by its children): `ignore` never checked · `ui` app or site UI that is not
read as a line (`.phone` and `.browser` content is treated so already) · `note` small print such as
`.disclaimer` and store-badge captions · `overlap` a designed overlap. · `beat` a one- or two-word line cut on the rhythm
(kinetic type), allowed to hold 0.4 s.

## Rules that keep frames exact
- Everything that moves must be a CSS animation or computed in `seek`/`onSeek` from `t`. No `setTimeout`,
  `requestAnimationFrame`, `Date.now()` or video elements playing in real time.
- Load fonts and images before the first frame (the renderer waits for `document.fonts.ready` and image decode).
- Use local assets in the project folder; remote images may fail in the renderer.
