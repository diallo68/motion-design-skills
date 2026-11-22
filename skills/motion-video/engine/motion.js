// motion-video engine. A video is one HTML page whose animations are all CSS/Web Animations;
// render.mjs calls window.seek(t) for every frame, so time is scrubbed, never played live.
//
// Declarative timing (all times in seconds from the start of the video):
//   data-in="fadeUp@1.2"          enter with keyframe fadeUp at 1.2 s (default duration .8 s)
//   data-in="pop@1.2/.5"          ... lasting .5 s
//   data-out="outUp@4.5"          leave at 4.5 s (default .5 s); stays gone after
//   data-loop="float/4"           loop keyframe float, 4 s a cycle, for the whole video
//   data-show="2,6"               present only from 2 s to 6 s (display toggled)
//   data-words="1,.08"            split the text into words entering one by one from 1 s, .08 s apart
//   data-type="2,18"              type the text from 2 s at 18 characters per second
//   data-count="0,1200,3,1.5,0"   count from 0 to 1200 starting at 3 s over 1.5 s, 0 decimals
//   data-ticker="2,1.4"           rotate child <span>s every 1.4 s from 2 s (vertical word slot)
//   data-tap="5.2"                a tap ring at 5.2 s (put it on a .tap element)
// URL parameters: ?format=story|feed|square|landscape  &t=3.5 (preview a frame in a browser)

(() => {
  const params = new URLSearchParams(location.search);
  const FORMATS = ['story', 'feed', 'square', 'landscape'];
  const FORMAT = FORMATS.includes(params.get('format')) ? params.get('format') : (document.body.dataset.format || 'story');
  document.body.classList.add(FORMAT);
  window.FORMAT = FORMAT;
  window.PARAMS = params;
  window.DURATION = +(document.body.dataset.duration || 12);

  // ---------- icons (stroke icons, 24x24) ----------
  const S = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  window.ICONS = {
    sparkles: S('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
    check: S('<path d="M4.5 12.5 10 18 19.5 6.5"/>', 2.6),
    bolt: S('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    heart: S('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    star: S('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
    bell: S('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
    chat: S('<path d="M4 5h16v11H9l-5 4z"/>'),
    lock: S('<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    chart: S('<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>'),
    calendar: S('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    search: S('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
    user: S('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.2-6 8-6s7 2 8 6"/>'),
    users: S('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14.5c2.3 0 4 1.4 4.6 4"/>'),
    globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.6 5.7 3.6 9s-1.1 6.3-3.6 9c-2.5-2.7-3.6-5.7-3.6-9S9.5 5.7 12 3z"/>'),
    phone: S('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>'),
    pin: S('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    cart: S('<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>'),
    card: S('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/>'),
    play: S('<path d="M7 4.5v15l12-7.5z"/>'),
    arrow: S('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    lockOpen: S('<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
    shield: S('<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12 2.3 2.3 4.2-4.6"/>'),
    clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    gift: S('<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z"/>'),
    cursor: '<svg viewBox="0 0 24 24"><path d="M5 3l14 7.5-6.2 1.6L10 18.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    apple: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.3 1.3-2.7 1.3-2.8 0 0-2.5-1-2.5-3.8zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.9-1.4z"/></svg>',
    googleplay: '<svg viewBox="0 0 24 24"><path d="M4 2.5 13.5 12 4 21.5c-.4-.2-.6-.6-.6-1.1V3.6c0-.5.2-.9.6-1.1z" fill="#00d7fe"/><path d="m16.8 8.7-3.3 3.3L4 2.5c.2-.1.5-.1.8 0z" fill="#00f076"/><path d="M16.8 15.3 4.8 21.5c-.3.1-.6.1-.8 0l9.5-9.5z" fill="#ff3a44"/><path d="M20.4 10.8c.8.5.8 1.9 0 2.4l-3.6 2.1-3.3-3.3 3.3-3.3z" fill="#ffd500"/></svg>',
  };
  window.icon = (n) => window.ICONS[n] || '';

  // ---------- helpers that write markup ----------
  // chips([{ icon, text, at, side: 'left'|'right', top, hold }]) — benefit pills that slide in and out.
  window.chips = (list, parent = document.body) => list.forEach((c) => {
    const side = c.side === 'right' ? `right:${c.inset ?? 60}px` : `left:${c.inset ?? 60}px`;
    const out = c.hold === 0 ? '' : ` data-out="outScale@${(c.at + (c.hold || 2.6)).toFixed(2)}"`;
    parent.insertAdjacentHTML('beforeend', `<div class="chip" style="${side};top:${c.top}px" data-in="${c.side === 'right' ? 'slideR' : 'slideL'}@${c.at}"${out}><span class="ico">${icon(c.icon || 'check')}</span>${c.text}</div>`);
  });

  // endcard({ at, logo, name, tagline, cta, stores: ['apple','google'], storeNote, note })
  window.endcard = (o) => {
    const t = (x) => (o.at + x).toFixed(2);
    const stores = (o.stores || []).map((s) => s === 'apple'
      ? `<span class="store">${icon('apple')}<span><small>${o.storeNote || 'Download on the'}</small>App Store</span></span>`
      : `<span class="store">${icon('googleplay')}<span><small>${o.storeNote || 'Get it on'}</small>Google Play</span></span>`).join('');
    document.body.insertAdjacentHTML('beforeend', `<div class="endcard" data-in="fadeIn@${t(0)}/.6">
      ${o.logo ? `<img class="logo" src="${o.logo}" alt="" data-in="pop@${t(.3)}/.7">` : ''}
      ${o.name ? `<div class="name" data-in="fadeUp@${t(.5)}">${o.name}</div>` : ''}
      ${o.tagline ? `<div class="tagline" data-in="fadeUp@${t(.75)}">${o.tagline}</div>` : ''}
      ${o.cta ? `<div class="btn" data-in="pop@${t(1.1)}/.6">${o.cta}</div>` : ''}
      ${stores ? `<div class="stores" data-in="fadeUp@${t(1.4)}">${stores}</div>` : ''}
      ${o.note ? `<div class="note" data-in="fadeIn@${t(1.7)}">${o.note}</div>` : ''}
    </div>`);
  };

  // ---------- compile data-* timing into Web Animations ----------
  const parse = (s, dflt) => { const [name, rest] = s.split('@'); const [at, dur] = (rest || '0').split('/'); return { name, at: +at, dur: dur ? +dur : dflt }; };
  const ease = (name) => (name === 'pop' ? 'var(--ease-pop)' : name.startsWith('out') || name === 'fadeOut' ? 'var(--ease-io)' : 'var(--ease)');
  function compile() {
    document.querySelectorAll('[data-words]:not([data-words-done])').forEach((el) => {
      // split only text nodes, so inner markup (<span class="accent">, <br>) survives
      const [at, step] = el.dataset.words.split(',').map(Number);
      el.classList.add('words');
      let i = 0;
      const walk = (node) => [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.append(w); return; }
            const s = document.createElement('span'); s.className = 'w'; s.textContent = w;
            s.dataset.in = `wordIn@${(at + (i++) * (step || 0.08)).toFixed(3)}/.6`; frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
      walk(el);
      el.dataset.wordsDone = '';
    });
    document.querySelectorAll('[data-ticker]:not([data-ticker-done])').forEach((el) => {
      el.classList.add('ticker');
      el.innerHTML = `<span class="tk">${el.innerHTML}</span>`;
      el.dataset.tickerDone = '';
    });
    document.querySelectorAll('[data-tap]').forEach((el) => { if (!el.dataset.in) el.dataset.in = `tapRing@${el.dataset.tap}/.6`; });
    document.querySelectorAll('[data-type]').forEach((el) => { if (el.dataset.full === undefined) el.dataset.full = el.textContent; });
    document.querySelectorAll('[data-in],[data-out],[data-loop]').forEach((el) => {
      if (el.dataset.compiled) return;
      const parts = [];
      if (el.dataset.loop) { const [name, dur] = el.dataset.loop.split('/'); parts.push(`${name} ${dur || 4}s ease-in-out 0s infinite both`); }
      if (el.dataset.in) { const a = parse(el.dataset.in, 0.8); parts.push(`${a.name} ${a.dur}s ${ease(a.name)} ${a.at}s both`); }
      if (el.dataset.out) { const a = parse(el.dataset.out, 0.5); parts.push(`${a.name} ${a.dur}s ${ease(a.name)} ${a.at}s forwards`); }
      el.style.animation = parts.join(', ');
      el.dataset.compiled = '1';
    });
  }

  // ---------- the clock ----------
  window.seek = (t) => {
    compile();
    // visibility first: an element shown again restarts its animations, which we then set
    document.querySelectorAll('[data-show]').forEach((el) => {
      const [a, b] = el.dataset.show.split(',').map(Number);
      el.style.display = t >= a && (isNaN(b) || t < b) ? '' : 'none';
    });
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000; });
    document.querySelectorAll('[data-type]').forEach((el) => {
      const [at, cps] = el.dataset.type.split(',').map(Number);
      const full = el.dataset.full; const n = Math.max(0, Math.min(full.length, Math.floor((t - at) * (cps || 18))));
      el.textContent = full.slice(0, n);
      el.classList.toggle('caret', t >= at - 0.4 && n < full.length);
    });
    document.querySelectorAll('[data-count]').forEach((el) => {
      const [a, b, at, dur, dec] = el.dataset.count.split(',').map(Number);
      const p = Math.max(0, Math.min(1, (t - at) / (dur || 1.2))); const e = 1 - Math.pow(1 - p, 3);
      const v = a + (b - a) * e;
      el.textContent = v.toLocaleString(document.documentElement.lang || 'en', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
    });
    document.querySelectorAll('[data-ticker]').forEach((el) => {
      const [at, step] = el.dataset.ticker.split(',').map(Number);
      const tk = el.firstElementChild; const n = tk.children.length;
      const k = Math.max(0, (t - at) / (step || 1.4)); const i = Math.floor(k); const f = k - i;
      const slide = 0.32; const p = f > 1 - slide / (step || 1.4) ? (f - (1 - slide / (step || 1.4))) / (slide / (step || 1.4)) : 0;
      const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const pos = Math.min(i + e, n - 1);
      tk.style.transform = `translateY(${-pos * 1.1}em)`;
      // the slot takes the width of the word on show, so the line stays tight around it
      const ws = [...tk.children].map((c) => c.offsetWidth);
      const a0 = Math.min(Math.floor(pos), n - 1), a1 = Math.min(a0 + 1, n - 1), fr = pos - a0;
      el.style.width = `${ws[a0] + (ws[a1] - ws[a0]) * fr}px`;
    });
    if (window.onSeek) window.onSeek(t);
  };

  window.addEventListener('load', () => seek(+(params.get('t') || 0)));
})();
