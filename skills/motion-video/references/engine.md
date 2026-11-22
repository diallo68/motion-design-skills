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

An element can have `data-in`, `data-out` and `data-loop` together. Entrance and loop both drive `transform`: the
later one in the list wins, so put a loop on a wrapper when the entrance also moves the element.

## Keyframes
Entrances: `fadeIn fadeUp fadeDown slideL slideR pop zoomIn zoomOut blurIn maskUp maskRight wordIn riseIn phoneIn
tiltIn flyIn grow growY tapRing press`. Exits: `fadeOut outUp outDown outScale outBlur`. Loops: `float floatTilt
spin pulse drift marquee marqueeY`. Add your own `@keyframes` in the page and use them by name.

## Components (classes)
Type `display h1 h2 lead label accent muted hl grad center` · layout `layer abs stack row top mid bottom` ·
grounds `bg-glow bg-grid bg-dots bg-mesh grain` · devices `stage3d phone phone.sm screen statusbar shot` ·
`browser bar lights url view progress` · `card glass chip pill btn store` · `cursor tap` · `disclaimer`.

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
--pad --ease --ease-pop --ease-io`.

## Rules that keep frames exact
- Everything that moves must be a CSS animation or computed in `seek`/`onSeek` from `t`. No `setTimeout`,
  `requestAnimationFrame`, `Date.now()` or video elements playing in real time.
- Load fonts and images before the first frame (the renderer waits for `document.fonts.ready` and image decode).
- Use local assets in the project folder; remote images may fail in the renderer.
