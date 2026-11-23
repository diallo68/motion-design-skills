# Moves

The patterns that recur in app and website motion design on Dribbble and Pinterest, each with markup for this
engine. Pick 3 to 5 per video, one leading move per beat, and 2 to 4 transitions with a cause (19–25) to join
the beats. Times are examples.

## Contents
1. Kinetic intro ("Introducing…") · 2. Word-by-word headline · 3. Ticker word · 4. Phone arrives in 3D ·
5. Floating device · 6. Screen sequence in one phone · 7. Chips around the device · 8. Cursor and press ·
9. Typing · 10. Counter · 11. Bars and progress · 12. Fan of screens · 13. Cards stack · 14. Browser launch ·
15. Glow and mesh grounds · 16. Big type takeover · 17. Marquee band · 18. End card ·
**Transitions and camera:** 19. Punch-in · 20. Object becomes the world · 21. Iris from the tap ·
22. Colour flood · 23. Whip · 24. Blur swap · 25. Dip cut · **Timing:** eases by role, holds, what looks generated

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

### 5. Floating device (optional, sparingly)
`data-loop="float/4"` (straight) or `data-loop="floatTilt/5"` (after `tiltIn`). Slow and small: the eye should
feel it, not watch it. A float standing in for motion reads as a template: prefer the UI acting (a screen
changing, a value counting) or the camera moving (19). Never on text: `check` warns `moving-text`.

### 6. Screen sequence in one phone
Several screens inside one `.screen`, each with `data-show="a,b"`. Change screens on the beat where the headline
or a chip changes, so the cut feels motivated.

### 7. Chips around the device
```js
chips([{ icon: 'bolt', text: '21-day streaks', at: 6.5, side: 'right', top: 1450, hold: 2.6 }]);
```
Alternate sides, 1–1.5 s apart, each gone before the next on the same side. Chips may overlap the phone's edge,
never its key content. Icons: `references/engine.md`.

### 8. Cursor and press
```html
<div class="cursor" data-point="#go@9.05" data-in="fadeIn@8.3/.3"><span data-in="riseIn@7.4/.9" style="display:block">…icon('cursor')…</span></div>
<span class="go" id="go" data-in="press@9.05/.3">See our work</span>
```
The pressed thing answers: it presses (`press`), then a checkbox fills or the next scene opens from it (21).
On a phone, skip the cursor: press the row or button itself. Tap rings (`data-tap`) still exist but read as a
template; `check` warns `tap-ring`.

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
`endcard({ at, logo, name, tagline, cta, stores: ['apple','google'], storeNote: 'Coming soon on', note })` — 2.8–3 s,
the last thing on screen. Store badges only for platforms the app is really on (or "Coming soon").

---

## Transitions with a cause

Join beats through something on screen: a cut that has a reason reads as designed, a fade between unrelated
scenes reads as slides. Use 2 to 4 kinds in one film, at most a third of the joins as plain cuts, and never
crossfade two worlds.

### 19. Punch-in (camera)
Magnify the part of a screen the line talks about, hold, come back. Put the content in a `.cam` wrapper (never on
an element that has its own entrance); `data-cam` lists the states in order, `at/duration scale x y [ease]`:
```html
<div class="cam" data-cam="6.55/.6 1.4 0 0; 8.2/.5 1 0 0">  … the phone …  </div>
```
Set `transform-origin` on the `.cam` to the point that must not move (the phone's top edge keeps it under the
headline: `.cam { transform-origin: 50% 600px }`). 1.3–2× is a punch-in; 6× and more is a zoom through, then cut
to what is inside. Default ease `move` (both ways).

### 20. Object becomes the world
The device or a card grows past the frame; its fill is the ground of the next beat.
```html
<div class="phone" data-in="phoneIn@2.5/1.2" data-become="9.9/.6">…</div>
<div class="layer" style="background:var(--bg)" data-show="10.3,12.2" data-in="fadeIn@10.3/.25"></div>  <!-- next ground, faded in while it still grows -->
```
The engine measures the element on its start frame and scales it to cover the frame, corners squaring off,
accelerating (`leave`). Let the headline leave just before (`data-out="outBlur@9.8/.2"`) or `check` reports it
`covered`. It cannot leave an `overflow: hidden` parent: grow the phone, not a card inside its screen.

### 21. Iris from the tap
The next scene opens in a circle from the thing pressed:
```html
<div class="flood" style="background:var(--bg);z-index:6" data-show="9.3,12.2" data-in="iris@9.35/.5" data-from="#go">
  … the next scene …
</div>
```
`data-from` takes the centre of that element on the iris's start frame. 0.35–0.5 s.

### 22. Colour flood
The ground changes colour while the hero stays: an empty `.flood` with a colour, under the hero
(`z-index` below it), `data-in="iris@4.2/.4"`, opening from the hero (`data-from`) or the centre.

### 23. Whip
Out fast and blurred, in from the other side, landing sharp: `data-out="whipOutL@2.4/.25"` on the leaving block,
`data-in="whipInR@2.5/.45"` on the arriving one (also `whipOutR/whipInL`, `whipOutUp/whipInUp`). Same direction
both sides.

### 24. Blur swap on one stage
The ground stays, the content changes: `data-out="outBlur@t/.2"` then `data-in="blurIn@t/.3"`.

### 25. Dip cut
A hard cut that reads as meant: the outgoing frame darkens for a few frames. `<div class="dip" data-in="dip@t/.12"></div>`
just before the cut.

---

## Timing

- **Eases by role** (default, or name one after the time: `fadeUp@1/.8:move`): entrances `arrive` (long tail),
  exits `leave` (accelerating), floods, irises and camera moves `move` (both ways), pops `pop`. The same ease on
  everything is what makes a film feel generated.
- **Exits are about half the entrance**: entrances 0.5–0.9 s, exits 0.2–0.4 s (default 0.4). The next element
  starts when the previous one is 30–50 % done.
- **A landed line holds still.** Motion moves to the next element, the camera or the ground.
- **Vary the entrances**: words one by one, a blur-in, a mask, a whip, a pop for a number. `check` warns
  `same-entrance` when 70 % of the texts enter the same way.
- **What looks generated**: floating or pulsing loops on UI and titles, tap rings, every element fading and
  sliding up, every scene entering the same way.
