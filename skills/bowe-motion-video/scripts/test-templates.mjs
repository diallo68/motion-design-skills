#!/usr/bin/env node
// Test every template in every style and format: init, then check, then a grid of the results. For whoever edits the
// skill (a template, a style, the engine); not needed to make a video.
//
//   node scripts/test-templates.mjs <work folder> [--templates a,b] [--styles x,y] [--formats story,feed]
//                                   [--jobs 3] [--node-modules <dir with playwright and three>]
//
// One project folder per style in <work folder>, each holding every template (init --name <template>). Unfilled
// [placeholders] and template phrases are expected in a fresh template, so template-leftover is left out of the
// grid; every other error and warning counts. Exit code 1 when any cell has an error. Each check's full output is
// kept in <work folder>/<style>/<template>.json.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const work = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!work) { console.error('usage: node scripts/test-templates.mjs <work folder> [--templates a,b] [--styles x,y] [--formats f] [--jobs 3] [--node-modules dir]'); process.exit(1); }
const TEMPLATES = (get('templates') || 'app-promo,website-launch,social-ad,iso-promo,collage,map-story,parcel-3d,grid-montage').split(',');
const STYLES = (get('styles') || 'midnight-glow,pastel-pop,bold-type,clean-light,neon-lime,warm-editorial').split(',');
const FORMATS = (get('formats') || 'story,feed,square,landscape').split(',');
const JOBS = +get('jobs', 3);

// projects: one folder per style, every template in it, the engine copied fresh (init keeps an existing engine)
mkdirSync(work, { recursive: true });
let modules = get('node-modules') ? resolve(get('node-modules')) : null;
for (const style of STYLES) {
  const dir = resolve(work, style);
  for (const t of TEMPLATES) {
    if (existsSync(join(dir, `${t}.html`))) continue;
    const r = spawnSync('node', [join(skill, 'scripts', 'init.mjs'), dir, '--template', t, '--style', style, '--name', t], { encoding: 'utf8' });
    if (r.status) { console.error(r.stderr || r.stdout); process.exit(1); }
  }
  spawnSync('cp', ['-R', join(skill, 'engine') + '/.', join(dir, 'engine')]);   // the engine being tested, not an old copy
  if (!existsSync(join(dir, 'node_modules'))) {
    if (!modules) {
      console.log(`installing playwright and three in ${dir} (once)…`);
      if (spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'inherit' }).status) process.exit(1);
      modules = join(dir, 'node_modules');
    } else symlinkSync(modules, join(dir, 'node_modules'));
  }
}

// checks, a few at a time (each opens a browser; too many at once and the captures time out)
const jobs = STYLES.flatMap((style) => TEMPLATES.map((t) => ({ style, t })));
const results = {}; let next = 0, done = 0; const t0 = Date.now();
async function worker() {
  while (next < jobs.length) {
    const { style, t } = jobs[next++]; const dir = resolve(work, style);
    const out = await new Promise((ok) => {
      let s = '', e = '';
      const p = spawn('node', ['engine/check.mjs', `${t}.html`, '--json', '--format', FORMATS.join(',')], { cwd: dir });
      p.stdout.on('data', (x) => { s += x; }); p.stderr.on('data', (x) => { e += x; });
      p.on('close', (code) => ok({ s, e, code }));
    });
    let json; try { json = JSON.parse(out.s); } catch { const ls = (out.e || out.s).trim().split('\n'); json = { crashed: (ls.find((l) => /Error|error:|check:/.test(l)) || ls.at(-1) || '').trim().slice(0, 200) }; }
    writeFileSync(join(dir, `${t}.json`), JSON.stringify(json, null, 1));
    results[`${t}|${style}`] = json;
    process.stdout.write(`\r${++done}/${jobs.length} checked (${Math.round((Date.now() - t0) / 60000)} min)   `);
  }
}
await Promise.all(Array.from({ length: JOBS }, worker));

// grid: one row per template, one column per style; a cell lists, per format, what is wrong (· when nothing)
const short = { story: 's', feed: 'f', square: 'q', landscape: 'l' };
const cell = (j) => {
  if (j.crashed) return 'CRASH';
  const found = (j.findings || []).filter((f) => f.rule !== 'template-leftover');
  if (!found.length) return '✓';
  return FORMATS.map((fm) => {
    const fs = found.filter((f) => f.format === fm);
    const e = fs.filter((f) => f.severity === 'error').length, w = fs.length - e;
    return e || w ? `${short[fm]}:${e ? e + 'E' : ''}${w ? w + 'W' : ''}` : null;
  }).filter(Boolean).join(' ');
};
const W = Math.max(14, ...STYLES.map((s) => s.length), ...Object.values(results).map((j) => cell(j).length)) + 2;
console.log(`\n\n${'template'.padEnd(16)}${STYLES.map((s) => s.padEnd(W)).join('')}`);
for (const t of TEMPLATES) console.log(`${t.padEnd(16)}${STYLES.map((s) => cell(results[`${t}|${s}`]).padEnd(W)).join('')}`);
console.log(`\n✓ nothing to fix · s/f/q/l: story, feed, square, landscape · nE errors, nW warnings (template-leftover left out)`);

// the details, so each cell can be fixed without opening the JSON
const lines = [];
for (const t of TEMPLATES) for (const s of STYLES) {
  const j = results[`${t}|${s}`];
  if (j.crashed) { lines.push(`${t} · ${s}: check crashed: ${j.crashed}`); continue; }
  for (const f of (j.findings || []).filter((x) => x.rule !== 'template-leftover'))
    lines.push(`${t} · ${s} · ${f.format}: ${f.severity} ${f.rule}${f.from != null ? ` ${f.from.toFixed(1)}s` : ''}${f.to != null ? `–${f.to.toFixed(1)}s` : ''}${f.element ? ` ${f.element}` : ''}${f.text ? ` “${f.text.slice(0, 30)}”` : ''}`);
}
if (lines.length) console.log('\n' + lines.join('\n'));
const bad = Object.values(results).some((j) => j.crashed || (j.findings || []).some((f) => f.severity === 'error' && f.rule !== 'template-leftover'));
process.exit(bad ? 1 : 0);
