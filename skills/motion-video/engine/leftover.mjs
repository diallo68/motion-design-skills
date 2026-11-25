// Text a template wrote, found again in a video made from it: check.mjs reports it as template-leftover.
// init.mjs stores the template's phrases in engine/template.json when it creates a video; check.mjs looks for them
// in the video's source (on-screen text, voice lines, and the strings its scripts draw, such as 3D screens or a
// product list), and for role placeholders in square brackets ([Problem], [Proof]) left in place.

const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', hellip: '…', mdash: '—', ndash: '–' };
const decode = (s) => s.replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m);
const strip = (s) => decode(s.replace(/\$\{[^}]*\}/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Every piece of text a page can show or say: text between tags, data-vo lines, string literals in its scripts.
export function textSegments(html) {
  const src = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<head\b[\s\S]*?<\/head>/i, ' ');
  const out = [];
  const scripts = [...src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  // string literals that read as words, not code (selectors, markup with handlers, expressions)
  const code = (x) => /(^|\s)[.#][a-z]|[{};=()]|^[\w-]+$|^\.{0,2}\/|^[\w./-]+\.(m?js|css|html|json|png|jpe?g|webp|svg|mp3|wav|m4a)$/i.test(x.replace(/<[^>]+>|\$\{[^}]*\}/g, ' ').trim());   // selectors, code, file paths
  for (const js of scripts) for (const m of js.replace(/^\s*\/\/.*$/gm, ' ').matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g)) if (!code(m[2])) out.push(strip(m[2]));
  const body = src.replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
  for (const m of body.matchAll(/\bdata-vo="([^"]*)"/g)) out.push(strip(m[1]));
  for (const t of body.split(/<[^>]+>/)) out.push(strip(t));
  return out.filter((t) => /\p{L}/u.test(t));
}

const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
// wording that any video may legitimately share with a template
const COMMON = /^(download (on the|free)|get it on|coming soon( on)?|app store|google play|learn more|sign up|order now|shop now)$|illustrati/;

// The template's own phrases: two words or more, long enough to be the template's and not anyone's.
export function templatePhrases(html) {
  const set = new Set();
  for (const seg of textSegments(html)) {
    const n = norm(seg);
    if (n.split(' ').length >= 2 && n.length >= 8 && !COMMON.test(n)) set.add(n);
  }
  return [...set];
}

// Phrases of the template still in the video, and placeholders such as [Problem] never filled in.
export function leftovers(videoHtml, phrases = []) {
  const segs = textSegments(videoHtml);
  const all = ` ${segs.map(norm).join(' | ')} `;
  const kept = phrases.filter((p) => all.includes(p));
  const placeholders = [...new Set(segs.flatMap((s) => s.match(/\[[A-ZÀ-ÖØ-Þ][^\][=<>"'{}]{0,58}\]/g) || []))];
  return { kept, placeholders };
}
