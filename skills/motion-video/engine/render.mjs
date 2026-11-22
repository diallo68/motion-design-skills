#!/usr/bin/env node
// Render a motion-video HTML page to MP4, frame by frame (deterministic: every frame is seek(t)).
//
//   node render.mjs video.html                       all formats the page declares (<body data-formats>)
//   node render.mjs video.html --format story,feed   chosen formats: story 1080x1920, feed 1080x1350,
//                                                    square 1080x1080, landscape 1920x1080
//   node render.mjs video.html --still 3.5           one PNG at 3.5 s (check a moment)
//   node render.mjs video.html --sheet               contact sheet: one frame every second, in one JPG
//   node render.mjs video.html --fps 60 --audio music.mp3 --out renders
//
// Needs Node 18+, `npm i playwright` (then `npx playwright install chromium`) and ffmpeg on the PATH.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, dirname, resolve, basename } from 'node:path';

const SIZES = { story: [1080, 1920], feed: [1080, 1350], square: [1080, 1080], landscape: [1920, 1080] };
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json', '.mp4': 'video/mp4' };

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.findIndex((a) => a === `--${k}` || a.startsWith(`--${k}=`)); if (i < 0) return d; const a = args[i]; return a.includes('=') ? a.split('=')[1] : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const file = args.find((a) => a.endsWith('.html'));
if (!file) { console.error('usage: node render.mjs <video.html> [--format story,feed] [--still t] [--sheet] [--fps 30] [--audio file] [--out dir]'); process.exit(1); }

let chromium;
try { ({ chromium } = await import('playwright')); } catch { console.error('Playwright is missing: run `npm i playwright && npx playwright install chromium` in this folder.'); process.exit(1); }
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

const abs = resolve(file); const root = dirname(abs); const name = basename(abs, '.html');
const fps = +opt('fps', 30); const out = resolve(opt('out', join(root, 'renders')));
await mkdir(out, { recursive: true });

// Serve the video's folder over HTTP (fonts and modules do not load reliably from file://).
const server = createServer(async (req, res) => {
  try {
    const p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(root)) throw new Error('outside');
    res.writeHead(200, { 'Content-Type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(basename(abs))}`;

const browser = await chromium.launch();
async function open(format) {
  const [w, h] = SIZES[format];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => errors.push(`failed to load ${r.url()}`));
  await page.goto(`${base}?format=${format}`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
  if (errors.length) console.warn(`[${format}] warnings:\n  ` + errors.join('\n  '));
  return page;
}

let formats = opt('format');
if (!formats || formats === true) {
  const p = await open('story');
  formats = (await p.evaluate(() => document.body.dataset.formats)) || 'story';
  await p.close();
}
formats = String(formats).split(',').map((f) => f.trim()).filter((f) => SIZES[f]);

for (const format of formats) {
  const page = await open(format);
  const duration = await page.evaluate(() => window.DURATION);
  const tag = `${name}-${format}`;

  if (opt('still') !== undefined) {
    const t = +opt('still');
    await page.evaluate((t) => window.seek(t), t);
    const f = join(out, `${tag}-t${t}.png`);
    await page.screenshot({ path: f }); console.log('still', f);
  } else if (opt('sheet')) {
    if (!hasFfmpeg) { console.error('ffmpeg is needed for --sheet'); process.exit(1); }
    const step = +opt('every', 1); const shots = [];
    for (let t = 0.5; t < duration; t += step) {
      await page.evaluate((t) => window.seek(t), t);
      const f = join(out, `.sheet-${tag}-${shots.length}.jpg`); await page.screenshot({ path: f, type: 'jpeg', quality: 80 }); shots.push(f);
    }
    const cols = Math.min(6, shots.length); const [w, h] = SIZES[format]; const tw = 360; const th = Math.round(h * tw / w);
    const inputs = shots.flatMap((s) => ['-i', s]);
    const layout = shots.map((_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * th}`).join('|');
    const scaled = shots.map((_, i) => `[${i}]scale=${tw}:${th}[s${i}]`).join(';');
    const f = join(out, `${tag}-sheet.jpg`);
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${scaled};${shots.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${shots.length}:layout=${layout}:fill=black`, f]);
    for (const s of shots) await import('node:fs').then((fs) => fs.rmSync(s));
    console.log(`sheet ${f} (one frame every ${step}s from 0.5s)`);
  } else {
    if (!hasFfmpeg) { console.error('ffmpeg is not on the PATH (macOS: brew install ffmpeg · Debian/Ubuntu: sudo apt install ffmpeg · Windows: winget install ffmpeg)'); process.exit(1); }
    const frames = Math.round(duration * fps); const f = join(out, `${tag}.mp4`);
    const audio = opt('audio');
    const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
    if (audio && audio !== true) ffArgs.push('-i', resolve(audio), '-shortest', '-c:a', 'aac', '-b:a', '192k', '-af', `afade=t=out:st=${Math.max(0, duration - 1)}:d=1`);
    ffArgs.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f);
    const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < frames; i++) {
      await page.evaluate((t) => window.seek(t), i / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % fps === 0) process.stdout.write(`\r${tag}: ${Math.round((i / frames) * 100)}%   `);
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
    console.log(`\rvideo ${f} (${duration}s, ${fps} fps)`);
  }
  await page.close();
}
await browser.close();
server.close();
