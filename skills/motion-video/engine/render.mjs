#!/usr/bin/env node
// Render a motion-video HTML page to MP4, frame by frame (deterministic: every frame is seek(t)).
//
//   node render.mjs video.html                       all formats the page declares (<body data-formats>)
//   node render.mjs video.html --format story,feed   chosen formats: story 1080x1920, feed 1080x1350,
//                                                    square 1080x1080, landscape 1920x1080
//   node render.mjs video.html --still 3.5           one PNG at 3.5 s (check a moment)
//   node render.mjs video.html --sheet               contact sheet: one frame every second, in one JPG
//   node render.mjs video.html --fps 60 --audio music.mp3 --out renders
//   node render.mjs video.html --sfx off             no sound effects (they play when <body data-sfx="auto">
//                                                    or elements carry data-sfx); --music-volume 0.55
//   node render.mjs video.html --voice piper:fr_FR-upmc-medium#pierre   voice-over provider (default: the page's
//                                                    <body data-voice>, else Piper siwis); --voice off for none
//
// Run `node check.mjs video.html` first: it finds what a contact sheet hides.
// Needs Node 18+, `npm i playwright` (then `npx playwright install chromium`) and ffmpeg on the PATH.
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SIZES, options, loadPlaywright, serve, openFormat, pickFormats } from './page.mjs';
import { ensureSfx, mix } from './sound.mjs';
import { synthesize, DEFAULT_VOICE } from './voice.mjs';

const args = process.argv.slice(2);
const opt = options(args);
const file = args.find((a) => a.endsWith('.html'));
if (!file) { console.error('usage: node render.mjs <video.html> [--format story,feed] [--still t] [--sheet] [--fps 30] [--audio file] [--out dir]'); process.exit(1); }

const chromium = await loadPlaywright();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const site = await serve(file);
const fps = +opt('fps', 30); const out = resolve(opt('out', join(site.root, 'renders')));
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const formats = await pickFormats(browser, site.url, opt('format'));

for (const format of formats) {
  const { page, errors } = await openFormat(browser, site.url, format);
  if (errors.length) console.warn(`[${format}] warnings:\n  ` + errors.join('\n  '));
  const duration = await page.evaluate(() => window.DURATION);
  const tag = `${site.name}-${format}`;

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
    for (const s of shots) await rm(s);
    console.log(`sheet ${f} (one frame every ${step}s from 0.5s)`);
  } else {
    if (!hasFfmpeg) { console.error('ffmpeg is not on the PATH (macOS: brew install ffmpeg · Debian/Ubuntu: sudo apt install ffmpeg · Windows: winget install ffmpeg)'); process.exit(1); }
    const frames = Math.round(duration * fps); const f = join(out, `${tag}.mp4`);
    const music = opt('audio'); const cues = opt('sfx') === 'off' ? [] : await page.evaluate(() => window.soundCues ? window.soundCues() : []);
    const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
    const vo = opt('voice') === 'off' ? { lines: [] } : await page.evaluate(() => window.voiceLines ? window.voiceLines() : { lines: [] });
    const voice = vo.lines.length ? await synthesize(vo.lines, { root: site.root, voice: (opt('voice') !== true && opt('voice')) || vo.voice || DEFAULT_VOICE, rate: vo.rate }) : [];
    let wav = null;
    if (cues.length || voice.length || (music && music !== true)) {
      if (cues.length) ensureSfx();
      wav = join(out, `.${tag}-sound.wav`);
      mix({ cues, voice, root: site.root, duration, out: wav, music: music && music !== true ? resolve(music) : null, musicVolume: +opt('music-volume', 0.55) });
      ffArgs.push('-i', wav, '-c:a', 'aac', '-b:a', '192k', '-shortest');
      console.log(`sound: ${cues.length} effect${cues.length === 1 ? '' : 's'}${voice.length ? `, ${voice.length} voice line${voice.length === 1 ? '' : 's'}` : ''}${music && music !== true ? ' + music' : ''}`);
    }
    ffArgs.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f);
    const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < frames; i++) {
      await page.evaluate((t) => window.seek(t), i / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % fps === 0) process.stdout.write(`\r${tag}: ${Math.round((i / frames) * 100)}%   `);
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
    if (wav) await rm(wav, { force: true });
    console.log(`\rvideo ${f} (${duration}s, ${fps} fps)`);
  }
  await page.close();
}
await browser.close();
site.close();
