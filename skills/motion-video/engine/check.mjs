#!/usr/bin/env node
// Check a motion-video page before rendering: it plays the video in a headless browser, measures every line of
// text every 0.1 s in every format, and lists what a viewer would notice, each with how to fix it.
//
//   node check.mjs video.html                    all formats the page declares
//   node check.mjs video.html --format story     one format
//   node check.mjs video.html --json             machine-readable findings
//   node check.mjs video.html --step 0.05        finer sampling (default 0.1 s)
//
// Exit code 1 when there is at least one error. Rules: safe-zone, off-frame, cut-off, overlap, covered,
// read-time, last-line, end-card, small-text, contrast, crowded, never-shown, load; motion warnings moving-text,
// same-entrance, tap-ring.
// Opt-outs on any element: data-check="ignore" (never checked), "ui" (app or site UI inside a device: not read),
// "note" (small print such as the disclaimer: no read-time, safe-zone or contrast rule), "overlap" (meant to overlap).
import { options, loadPlaywright, serve, openFormat, pickFormats, SIZES } from './page.mjs';

const args = process.argv.slice(2);
const opt = options(args);
const file = args.find((a) => a.endsWith('.html'));
if (!file) { console.error('usage: node check.mjs <video.html> [--format story,feed] [--json] [--step 0.1]'); process.exit(1); }
const STEP = +opt('step', 0.1);
const asJson = !!opt('json');

// Where the platform's own buttons and captions sit. Story: Meta's Reels guidance (top 14 %, bottom 35 %, the
// action column on the right), which also covers TikTok and YouTube Shorts. Other formats: 5 % title-safe margin.
function safeBox(format, w, h) {
  if (format === 'story') return { x0: 60, x1: w - 120, y0: Math.round(h * 0.14), y1: Math.round(h * 0.65), platform: true };
  const m = Math.round(Math.min(w, h) * 0.05);
  return { x0: m, x1: w - m, y0: m, y1: h - m, platform: false };
}

// ---------------------------------------------------------------- in-page measurement
// Runs in the page. A "block" is the nearest non-inline element around a piece of text (a heading, a chip,
// a line split into words by data-words): what the viewer reads as one line or paragraph.
function install() {
  const st = document.createElement('style');
  st.textContent = '*{pointer-events:auto!important}';
  document.head.append(st);
  let next = 1;
  const tokens = (el) => {
    const set = new Set();
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) (e.dataset?.check || '').split(/\s+/).forEach((x) => x && set.add(x));
    return set;
  };
  const blockOf = (el) => {
    const tk = el.closest('.ticker');           // rolling words belong to the line around the ticker
    if (tk) el = tk.parentElement;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const d = getComputedStyle(e).display;
      if (!d.startsWith('inline') && d !== 'contents') return e;
    }
    return el;
  };
  const clipOf = (el) => {
    let r = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
    for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const b = e.getBoundingClientRect();
        r = { l: Math.max(r.l, b.left), t: Math.max(r.t, b.top), r: Math.min(r.r, b.right), b: Math.min(r.b, b.bottom) };
      }
    }
    return r;
  };
  const isect = (a, c) => ({ l: Math.max(a.l, c.l), t: Math.max(a.t, c.t), r: Math.min(a.r, c.r), b: Math.min(a.b, c.b) });
  const area = (a) => Math.max(0, a.r - a.l) * Math.max(0, a.b - a.t);
  const paints = (e) => {
    if (/^(IMG|SVG|VIDEO|CANVAS|PICTURE)$/i.test(e.tagName)) return true;
    const cs = getComputedStyle(e);
    if (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') return false;   // gradient text paints only its letters
    if (cs.backgroundImage !== 'none') return true;
    const m = cs.backgroundColor.match(/[\d.]+/g);
    return m && (m.length < 4 ? true : +m[3] > 0.5) && !(m.length === 4 && +m[3] === 0);
  };

  window.__mvMeasure = () => {
    const W = innerWidth, H = innerHeight, view = { l: 0, t: 0, r: W, b: H };
    const op = new Map();
    const opacity = (el) => {
      if (op.has(el)) return op.get(el);
      const cs = getComputedStyle(el);
      let v = cs.display === 'none' || cs.visibility === 'hidden' ? 0 : +cs.opacity;
      if (v > 0 && el.parentElement && el.parentElement !== document.documentElement) v *= opacity(el.parentElement);
      op.set(el, v); return v;
    };
    const blocks = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const txt = n.textContent.trim();
      if (!txt) continue;
      const el = n.parentElement;
      if (!el || el.closest('script,style,noscript,template')) continue;
      const tk = tokens(el);
      if (tk.has('ignore') || tk.has('ui') || el.closest('.phone,.browser')) continue;
      const o = opacity(el);
      range.selectNodeContents(n);
      const clip = clipOf(el);
      const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1)
        .map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom }));
      let raw = 0, vis = 0, off = false; const visRects = [];
      for (const r of rects) {
        const v = isect(isect(r, clip), view);
        raw += area(r); const a = area(v); vis += a;
        if (a > 0) visRects.push(v);
        const c = isect(r, clip);                // only what its container lets through can leave the frame
        if (area(c) > 0 && (c.l < -2 || c.t < -2 || c.r > W + 2 || c.b > H + 2)) off = true;
      }
      if (!vis) continue;                       // hidden: scaled to 0, outside its mask, off-frame entirely
      const inClip = rects.reduce((s, r) => s + area(isect(r, clip)), 0);
      const cut = inClip < raw * 0.95 && !el.closest('.ticker');   // hidden by a container's overflow (a ticker's mask is meant)
      const blk = blockOf(el);
      if (!blk.dataset.mvId) blk.dataset.mvId = String(next++);
      const id = blk.dataset.mvId;
      if (!blocks.has(id)) {
        const cls = [...blk.classList].filter((c) => c !== 'words')[0];
        blocks.set(id, { id, sel: blk.id ? `#${blk.id}` : `${blk.tagName.toLowerCase()}${cls ? '.' + cls : ''}`,
          note: tk.has('note') || !!blk.closest('.disclaimer'), overlapOk: tk.has('overlap'), text: '', words: 0, seen: 0, read: 0,
          maxOp: 0, rects: [], cut: false, off: false, size: 1e9, colors: {}, covered: 0, probes: 0 });
      }
      const b = blocks.get(id);
      // a ticker shows one of its words at a time: count only the one mostly in view
      const words = el.closest('.ticker') && vis < raw * 0.5 ? 0 : txt.split(/\s+/).length;
      b.text += (b.text ? ' ' : '') + txt;
      b.words += words; b.seen += words; if (o > 0.6) b.read += words;
      b.maxOp = Math.max(b.maxOp, o);
      if (o > 0.3) {
        b.rects.push(...visRects); b.cut ||= cut; b.off ||= off;
        for (const r of rects) b.size = Math.min(b.size, (r.b - r.t) / 1.17);
        const cs = getComputedStyle(el);
        const col = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color;
        b.colors[col] = (b.colors[col] || 0) + txt.length;
        b.op = Math.max(b.op || 0, o);
      }
      // covered: probe the centre of each visible line; is something opaque painted above the text?
      if (o > 0.6) for (const r of visRects.slice(0, 6)) {
        const x = (r.l + r.r) / 2, y = (r.t + r.b) / 2;
        const stack = document.elementsFromPoint(x, y);
        const i = stack.findIndex((e) => e === el || e.contains(el) || el.contains(e));
        b.probes++;
        if (i > 0 && stack.slice(0, i).some((e) => !el.contains(e) && !e.closest('[data-check~="ignore"]') && paints(e) && opacity(e) > 0.5)) b.covered++;
      }
    }
    const els = [...blocks.keys()].map((id) => [id, document.querySelector(`[data-mv-id="${id}"]`)]);
    for (const [id, e] of els) blocks.get(id).inside = els.filter(([j, f]) => j !== id && f.contains(e)).map(([j]) => j);
    return [...blocks.values()].map((b) => {
      const color = Object.entries(b.colors).sort((a, c) => c[1] - a[1])[0]?.[0];
      return { id: b.id, sel: b.sel, note: b.note, overlapOk: b.overlapOk, text: b.text.replace(/\s+/g, ' ').slice(0, 60),
        words: b.words, readable: b.seen ? b.read / b.seen >= 0.8 : false, op: b.op || 0, rects: b.rects,
        cut: b.cut, off: b.off, inside: b.inside, size: b.size === 1e9 ? 0 : Math.round(b.size), color, coveredShare: b.probes ? b.covered / b.probes : 0 };
    });
  };

  // Hide or show all text, so the background behind a block can be sampled for contrast.
  window.__mvHide = (hide) => {
    for (const e of document.body.querySelectorAll('*')) {
      if (hide) { e.dataset.mvStyle = e.getAttribute('style') || ''; e.style.setProperty('color', 'transparent', 'important'); e.style.setProperty('-webkit-text-fill-color', 'transparent', 'important'); e.style.setProperty('text-shadow', 'none', 'important'); }
      else if (e.dataset.mvStyle !== undefined) { e.setAttribute('style', e.dataset.mvStyle); delete e.dataset.mvStyle; }
    }
  };

  // Static facts: elements timed after the end, the end card's start.
  window.__mvStatic = () => {
    const D = window.DURATION; const late = [];
    for (const el of document.querySelectorAll('[data-in],[data-show],[data-words]')) {
      const at = el.dataset.in ? +el.dataset.in.split('@')[1]?.split('/')[0] : el.dataset.show ? +el.dataset.show.split(',')[0] : +el.dataset.words.split(',')[0];
      if (at >= D) late.push({ sel: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}${el.classList[0] ? '.' + el.classList[0] : ''}`, at, text: el.textContent.trim().slice(0, 40) });
    }
    // motion craft: titles that keep moving, one entrance everywhere, tap rings
    const textOf = (el) => !el.closest('.phone,.browser,[data-check~="ui"],[data-check~="ignore"]') && el.textContent.trim();
    const loops = [...document.querySelectorAll('[data-loop]')].filter(textOf).map((el) => ({ sel: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}${el.classList[0] ? '.' + el.classList[0] : ''}`, text: el.textContent.trim().slice(0, 40), loop: el.dataset.loop }));
    const entrances = [...document.querySelectorAll('[data-in]')].filter((el) => !el.classList.contains('w') && textOf(el) && !el.closest('.endcard')).map((el) => el.dataset.in.split('@')[0]);
    const counts = entrances.reduce((m, n) => ((m[n] = (m[n] || 0) + 1), m), {});
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const sameEntrance = entrances.length >= 5 && top && top[1] / entrances.length >= 0.7 ? { name: top[0], n: top[1], of: entrances.length } : null;
    const taps = document.querySelectorAll('[data-tap]').length;
    const end = document.querySelector('.endcard');
    const endAt = end?.dataset.in ? +end.dataset.in.split('@')[1].split('/')[0] : null;
    return { duration: D, hasDuration: !!document.body.dataset.duration, late, endAt, loops, sameEntrance, taps };
  };
}

// ---------------------------------------------------------------- colour maths (Node side)
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const parseColor = (s) => { const m = (s || '').match(/[\d.]+/g); return m ? { rgb: m.slice(0, 3).map(Number), a: m.length > 3 ? +m[3] : 1 } : null; };

// ---------------------------------------------------------------- run
const chromium = await loadPlaywright();
const site = await serve(file);
const browser = await chromium.launch();
const formats = await pickFormats(browser, site.url, opt('format'));
const decoder = await browser.newPage();   // decodes screenshots into pixels for the contrast rule
const report = [];

const fmtT = (t) => `${t.toFixed(1)}s`;
const quote = (s) => `“${s.length > 40 ? s.slice(0, 39) + '…' : s}”`;

for (const format of formats) {
  const [W, H] = SIZES[format];
  const box = safeBox(format, W, H);
  const { page, errors } = await openFormat(browser, site.url, format);
  await page.evaluate(install);
  const stat = await page.evaluate(() => window.__mvStatic());
  const D = stat.duration;
  const issues = [];
  const add = (severity, rule, b, from, to, message, fix) => issues.push({ format, severity, rule, element: b?.sel, text: b?.text, from, to, message, fix });

  for (const e of [...new Set(errors)]) add('error', 'load', null, null, null, e, 'Keep every asset in the project folder and check its path and name (case counts).');
  if (!stat.hasDuration) add('warning', 'duration', null, null, null, 'No data-duration on <body>: the video is 12 s by default.', 'Set <body data-duration="…">.');
  for (const l of stat.late) add('warning', 'never-shown', { sel: l.sel, text: l.text }, l.at, null, `Starts at ${fmtT(l.at)}, after the video ends (${fmtT(D)}).`, 'Move it earlier or raise data-duration.');
  for (const l of stat.loops) add('warning', 'moving-text', l, null, null, `Text on a ${l.loop} loop keeps moving after it lands.`, 'A landed line holds still; move the camera, the device or the ground instead (data-loop on a wrapper without text).');
  if (stat.sameEntrance) add('warning', 'same-entrance', null, null, null, `${stat.sameEntrance.n} of ${stat.sameEntrance.of} texts enter with ${stat.sameEntrance.name}.`, 'Vary entrances within a film: words one by one, a blur-in, a mask, a whip; see references/moves.md.');
  if (stat.taps) add('warning', 'tap-ring', null, null, null, `${stat.taps} tap ring${stat.taps > 1 ? 's' : ''}: rings read as a template.`, 'Show the tap by what it does: press the button (press keyframe) and let the screen answer, or cut on the tap.');
  if (stat.endAt !== null && D - stat.endAt < 2.5) add('warning', 'end-card', { sel: '.endcard' }, stat.endAt, D, `The end card is on screen for ${(D - stat.endAt).toFixed(1)} s.`, 'Give the end card 2.5–3 s: start it earlier or raise data-duration.');

  // sample the whole video
  const timeline = [];  // [{ t, blocks }]
  for (let t = 0; t < D - 1e-6; t += STEP) {
    const blocks = await page.evaluate((t) => { window.seek(t); return window.__mvMeasure(); }, +t.toFixed(3));
    timeline.push({ t: +t.toFixed(3), blocks });
  }

  // turn per-sample flags into time ranges; keep ranges that last at least `min` seconds
  const runs = (flags, min) => {
    const out = []; let start = null, last = null;
    for (const { t, on } of flags) {
      if (on && start === null) start = t;
      if (on) last = t;
      if (!on && start !== null) { out.push([start, last + STEP]); start = null; }
    }
    if (start !== null) out.push([start, Math.min(D, last + STEP)]);
    return out.filter(([a, b]) => b - a >= min - 1e-6);
  };
  const ids = [...new Set(timeline.flatMap((s) => s.blocks.map((b) => b.id)))];
  const byId = (id) => timeline.map(({ t, blocks }) => ({ t, b: blocks.find((x) => x.id === id) }));
  const info = (id) => { const all = byId(id).map((x) => x.b).filter(Boolean); return all.reduce((a, b) => (b.words > a.words ? b : a), all[0]); };
  const area = (r) => Math.max(0, r.r - r.l) * Math.max(0, r.b - r.t);
  const isect = (a, c) => ({ l: Math.max(a.l, c.l), t: Math.max(a.t, c.t), r: Math.min(a.r, c.r), b: Math.min(a.b, c.b) });

  const readRuns = {};
  for (const id of ids) {
    const s = byId(id); const b = info(id);
    const readable = s.map(({ t, b }) => ({ t, on: !!b && b.readable && b.op > 0.6 }));
    const shown = s.map(({ t, b }) => ({ t, on: !!b && b.op > 0.3 }));
    readRuns[id] = runs(readable, 0);

    // off-frame and cut-off
    for (const [a, z] of runs(s.map(({ t, b }) => ({ t, on: !!b && b.op > 0.3 && b.off })), 0.35))
      add('error', 'off-frame', b, a, z, 'Text runs past the edge of the frame.', 'Shorten the line, lower the font size or move it inside the frame.');
    for (const [a, z] of runs(s.map(({ t, b }) => ({ t, on: !!b && b.op > 0.3 && b.cut })), 0.35))
      add('error', 'cut-off', b, a, z, 'Part of the text is hidden by its container (overflow).', 'Make the container larger or the text shorter; a ticker word must fit on one line.');

    // safe zone
    const outside = (r) => area(r) - area(isect(r, { l: box.x0, t: box.y0, r: box.x1, b: box.y1 }));
    if (!b.note) {
      const share = (b) => { const tot = b.rects.reduce((x, r) => x + area(r), 0); return tot ? b.rects.reduce((x, r) => x + outside(r), 0) / tot : 0; };
      const flags = s.map(({ t, b }) => ({ t, on: !!b && b.op > 0.6 && share(b) > 0.02 }));
      for (const [a, z] of runs(flags, 0.3)) {
        const worst = Math.max(...s.filter(({ t, b }) => b && t >= a && t < z).map(({ b }) => share(b)));
        if (box.platform) add(worst > 0.5 ? 'error' : 'warning', 'safe-zone', b, a, z, `${Math.round(worst * 100)} % of the text sits where Reels, TikTok and Shorts draw their buttons and caption.`, `Keep text inside x ${box.x0}–${box.x1}, y ${box.y0}–${box.y1} px.`);
        else add('warning', 'safe-zone', b, a, z, 'Text touches the 5 % margin of the frame.', `Keep text inside x ${box.x0}–${box.x1}, y ${box.y0}–${box.y1} px.`);
      }
    }

    // covered by something opaque
    for (const [a, z] of runs(s.map(({ t, b }) => ({ t, on: !!b && b.readable && b.coveredShare >= 0.4 })), 0.3))
      add('error', 'covered', b, a, z, 'Something opaque is drawn on top of this text.', 'Raise the text’s z-index, move it, or time the other element so they are not on screen together.');

    // read time
    if (!b.note) for (const [a, z] of readRuns[id]) {
      const words = Math.max(...s.filter(({ t, b }) => b && t >= a && t < z).map(({ b }) => b.words));
      const need = 0.5 + 0.3 * words; const got = z - a;
      if (z >= D - STEP) continue;                     // still on screen at the end: the last-line rule covers it
      if (got < need - 0.05) add(got < need * 0.75 ? 'error' : 'warning', 'read-time', b, a, z, `${words} word${words > 1 ? 's' : ''} readable for ${got.toFixed(1)} s; a viewer needs about ${need.toFixed(1)} s.`, `Hold it ${(need - got).toFixed(1)} s longer (0.5 s + 0.3 s a word), or cut words.`);
    }

    // small text
    if (b.size && shown.some((x) => x.on)) {
      const min = b.note ? 20 : Math.round(Math.min(W, H) * 0.026);
      const size = Math.min(...s.filter(({ b }) => b && b.op > 0.3 && b.size).map(({ b }) => b.size));
      if (size < min) add('warning', 'small-text', b, null, null, `Letters about ${size} px high; on a phone that is hard to read.`, `Use at least ${min} px${b.note ? ' for small print' : ''}.`);
    }
  }

  // last line: the text on screen at the end must have been readable for 2 s
  const lastIds = ids.filter((id) => { const r = readRuns[id].at(-1); return r && r[1] >= D - STEP && !info(id).note; });
  if (lastIds.length) {
    const since = Math.min(...lastIds.map((id) => readRuns[id].at(-1)[0]));
    if (D - since < 1.95) add('warning', 'last-line', info(lastIds[0]), since, D, `The closing text is readable for ${(D - since).toFixed(1)} s.`, 'Hold the last line at least 2 s: start it earlier or raise data-duration.');
  } else add('warning', 'last-line', null, null, null, 'No text on screen at the end.', 'End on the name, the promise and where to get it (endcard()).');

  // overlap between two pieces of text
  const pairs = new Map();
  for (const { t, blocks } of timeline) {
    const vis = blocks.filter((b) => b.op > 0.6 && !b.overlapOk);
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      const A = vis[i], B = vis[j]; let hit = false;
      if (A.inside.includes(B.id) || B.inside.includes(A.id)) continue;
      const trim = (r) => { const d = (r.b - r.t) * 0.15; return { l: r.l, r: r.r, t: r.t + d, b: r.b - d }; };
      for (const ra of A.rects.map(trim)) for (const rb of B.rects.map(trim)) if (area(isect(ra, rb)) > 0.15 * Math.min(area(ra), area(rb))) hit = true;
      if (!hit) continue;
      const k = `${A.id}|${B.id}`; if (!pairs.has(k)) pairs.set(k, new Set()); pairs.get(k).add(t);
    }
  }
  for (const [k, set] of pairs) {
    const [a, b] = k.split('|');
    for (const [from, to] of runs(timeline.map(({ t }) => ({ t, on: set.has(t) })), 0.3)) {
      const A = info(a), B = info(b);
      add('error', 'overlap', A, from, to, `Overlaps ${B.sel} ${quote(B.text)}.`, 'Move one of them, or make one leave before the other arrives (add data-check="overlap" only when the overlap is the design).');
    }
  }

  // crowded: too many words to read at once
  const crowded = timeline.map(({ t, blocks }) => ({ t, on: blocks.filter((b) => b.readable && !b.note).reduce((s, b) => s + b.words, 0) > 18 }));
  for (const [a, z] of runs(crowded, 0.5)) add('warning', 'crowded', null, a, z, 'More than 18 words on screen at once.', 'One idea a beat: 6–8 words, the rest goes in the post’s caption.');

  // contrast: sample the background behind each text block at the middle of its longest readable stretch
  for (const id of ids) {
    const b = info(id); if (b.note) continue;
    const r = readRuns[id].sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))[0]; if (!r) continue;
    const t = +(r[0] + Math.min(r[1] - r[0], 1) / 2).toFixed(3);
    const at = timeline.reduce((best, s) => (Math.abs(s.t - t) < Math.abs(best.t - t) ? s : best)).blocks.find((x) => x.id === id);
    const col = parseColor(at?.color); if (!at || !col || col.a < 0.1 || !at.rects.length) continue;
    const u = at.rects.reduce((u, q) => ({ l: Math.min(u.l, q.l), t: Math.min(u.t, q.t), r: Math.max(u.r, q.r), b: Math.max(u.b, q.b) }));
    const clip = { x: Math.max(0, Math.floor(u.l)), y: Math.max(0, Math.floor(u.t)) }; clip.width = Math.min(W, Math.ceil(u.r)) - clip.x; clip.height = Math.min(H, Math.ceil(u.b)) - clip.y;
    if (clip.width < 4 || clip.height < 4) continue;
    await page.evaluate(({ t, id }) => { window.seek(t); window.__mvHide(true); }, { t });
    const png = await page.screenshot({ clip, type: 'png' });
    await page.evaluate(() => window.__mvHide(false));
    const px = await decoder.evaluate(async (b64) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; const out = [];
      const stride = Math.max(1, Math.floor(Math.sqrt((c.width * c.height) / 4000)));
      for (let y = 0; y < c.height; y += stride) for (let x = 0; x < c.width; x += stride) { const i = (y * c.width + x) * 4; out.push([d[i], d[i + 1], d[i + 2]]); }
      return out;
    }, png.toString('base64'));
    const o = Math.min(1, at.op * col.a);
    const ratios = px.map((p) => ratio(col.rgb.map((c, k) => o * c + (1 - o) * p[k]), p)).sort((x, y) => x - y);
    const low = ratios[Math.floor(ratios.length * 0.1)];
    if (low < 3) add(low < 2 ? 'error' : 'warning', 'contrast', b, r[0], r[1], `Contrast about ${low.toFixed(1)}:1 against what is behind it.`, 'Aim for 4.5:1 (3:1 at least for large titles): darken or lighten the text, or put it on a solid card.');
  }

  await page.close();
  report.push(...issues);
}
await browser.close();
site.close();

// ---------------------------------------------------------------- report
const order = { error: 0, warning: 1 };
report.sort((a, b) => a.format.localeCompare(b.format) || order[a.severity] - order[b.severity] || (a.from ?? -1) - (b.from ?? -1));
const errors = report.filter((r) => r.severity === 'error').length;
const warnings = report.length - errors;
if (asJson) {
  console.log(JSON.stringify({ ok: errors === 0, errors, warnings, formats, findings: report }, null, 2));
} else {
  for (const format of formats) {
    const list = report.filter((r) => r.format === format);
    const [w, h] = SIZES[format];
    console.log(`\n${format} ${w}×${h}  ${list.length ? '' : '✓ nothing to fix'}`);
    for (const r of list) {
      const when = r.from == null ? '' : r.to == null ? ` at ${fmtT(r.from)}` : ` ${fmtT(r.from)}–${fmtT(r.to)}`;
      const what = r.element ? ` ${r.element}${r.text ? ' ' + quote(r.text) : ''}` : '';
      console.log(`  ${r.severity === 'error' ? '✗ error  ' : '! warning'} ${r.rule}${when}${what}\n             ${r.message}\n             Fix: ${r.fix}`);
    }
  }
  console.log(`\n${errors ? '✗' : '✓'} ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}${errors ? ' — fix the errors, then check again' : ''}`);
}
process.exit(errors ? 1 : 0);
