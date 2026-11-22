# Moves

The patterns that recur in app and website motion design on Dribbble and Pinterest, each with markup for this
engine. Pick 3 to 5 per video, one leading move per beat. Times are examples.

## Contents
1. Kinetic intro ("Introducing…") · 2. Word-by-word headline · 3. Ticker word · 4. Phone arrives in 3D ·
5. Floating device · 6. Screen sequence in one phone · 7. Chips around the device · 8. Cursor and tap ·
9. Typing · 10. Counter · 11. Bars and progress · 12. Fan of screens · 13. Cards stack · 14. Browser launch ·
15. Glow and mesh grounds · 16. Big type takeover · 17. Marquee band · 18. End card

---

### 1. Kinetic intro
A single word, then the name, blurred in, then gone. Opens most launch videos.
```html
<div class="mid center" data-out="outBlur@2.3/.4">
  <div class="label" data-in="fadeIn@.1">Introducing</div>
  <div class="display" style="font-size:190px" data-in="blurIn@.45/1">Tempo</div>
</div>
```
Variants: `zoomIn` for punch, `maskUp` for an editorial reveal, `data-words` for a sentence.

### 2. Word-by-word headline
```html
<div class="h1" data-words="2.5,.09">Build habits <span class="accent">that stick</span></div>
```
Inner markup survives the split. Keep it to 2–6 words; longer lines read as subtitles.

### 3. Ticker word (one slot, words roll through)
```html
<div class="h1">Track <span class="accent" data-ticker="10.6,.55"><span>sleep</span><span>water</span><span>reading</span></span></div>
```
The slot's width follows the word on show. Last word stays. 0.5–0.8 s per word.

### 4. Phone arrives in 3D
```html
<div class="ph-wrap stage3d"><div class="phone" data-in="phoneIn@2.5/1.2"><div class="screen">…</div></div></div>
```
`phoneIn` rises and flattens; `tiltIn` lands at a three-quarter angle (Dribbble's most common hero);
`flyIn` comes from depth. `.stage3d` on the parent gives perspective. Place and scale `.ph-wrap`, never the
`.phone` itself.

### 5. Floating device
`data-loop="float/4"` (straight) or `data-loop="floatTilt/5"` (after `tiltIn`). Slow and small: the eye should
feel it, not watch it.

### 6. Screen sequence in one phone
Several screens inside one `.screen`, each with `data-show="a,b"`. Change screens on the beat where the headline
or a chip changes, so the cut feels motivated.

### 7. Chips around the device
```js
chips([{ icon: 'bolt', text: '21-day streaks', at: 6.5, side: 'right', top: 1450, hold: 2.6 }]);
```
Alternate sides, 1–1.5 s apart, each gone before the next on the same side. Chips may overlap the phone's edge,
never its key content. Icons: `references/engine.md`.

### 8. Cursor and tap
```html
<div class="cursor" style="left:62%;top:78%" data-in="fadeIn@7.4/.3"><span data-in="riseIn@7.4/.9" style="display:block">…icon('cursor')…</span></div>
<div class="tap" style="left:63%;top:80%" data-tap="8.5"></div>
```
Then show the result of the tap (a checkbox fills, a screen changes) 0.1–0.2 s after the ring.

### 9. Typing
`<span data-type="2.9,14">northwind.studio</span>` — URL bars, search fields, chat prompts. A caret blinks in
while typing.

### 10. Counter
`<span data-count="0,21,6.6,1.2">21</span>` — from, to, start, duration, decimals. Only real numbers in ads.

### 11. Bars and progress
`<i data-in="growY@6.8/.6" style="height:40%"></i>` for bars (stagger by .1 s); `grow` for horizontal progress
lines (set `transform-origin: left`).

### 12. Fan of screens
Three `.phone.sm` with `rotate`/`translate` set inline and `flyIn` staggered by .1 s. Shows breadth: "it does all of
this". Best right before the end card.

### 13. Cards stack
Cards sliding in one under another (`slideR`, 1 s apart) — the clearest way to list three benefits in an ad.

### 14. Browser launch
`.browser` with `.bar`, `.url` (typing), `.progress` (`grow`), `.view` holding a capture or HTML page that scrolls
with a custom keyframe (see `templates/website-launch.html`). End with the same site on a phone.

### 15. Glow and mesh grounds
`.bg-mesh` (soft colour field, `data-loop="drift/9"`), `.bg-glow` behind the device (`data-loop="pulse/5"`),
`.bg-grid` / `.bg-dots` for a technical feel, `body.grain` for texture. One ground per video.

### 16. Big type takeover
A full-frame word or number (`.display` at 200–300 px) between beats — a price, a stat, a verb. Pairs with
`bold-type`.

### 17. Marquee band
A row of words or logos moving across the frame:
```html
<div class="abs" style="left:0;top:1500px;white-space:nowrap" data-loop="marquee/8"><span class="h2">Sleep · Water · Reading · Workouts · Sleep · Water · Reading · Workouts · </span></div>
```
Duplicate the content once so the loop is seamless.

### 18. End card
`endcard({ at, logo, name, tagline, cta, stores: ['apple','google'], storeNote: 'Coming soon on', note })` — 2.5–3 s,
the last thing on screen. Store badges only for platforms the app is really on (or "Coming soon").
