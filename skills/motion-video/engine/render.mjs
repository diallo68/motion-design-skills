#!/usr/bin/env node
// Render a motion-video HTML page to MP4, frame by frame (deterministic: every frame is seek(t)).
//
//   node render.mjs video.html                       all formats the page declares (<body data-formats>)
//   node render.mjs video.html --format story,feed   chosen formats: story 1080x1920, feed 1080x1350,
//                                                    square 1080x1080, landscape 1920x1080
//   node render.mjs video.html --still 3.5           one PNG at 3.5 s (check a moment)
//   node render.mjs video.html --sheet               contact sheet: one frame every second, in one JPG
//   node render.mjs video.html --sheet --every 0.25 --from 4 --to 7   a finer sheet around a transition
//   node render.mjs video.html --scale 2             supersampled: rendered at twice the size, scaled down (lanczos)
//   node render.mjs video.html --motion-blur 4       4 sub-frames blended into each frame (fast moves blur like film)
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
if (!file) { console.error('usage: node render.mjs <video.html> [--format story,feed] [--still t] [--sheet [--every s --from t --to t]] [--fps 30] [--scale 2] [--motion-blur 4] [--audio file] [--out dir]'); process.exit(1); }
const scale = Math.max(1, Math.min(3, +opt('scale', 1) || 1));
const blur = Math.max(1, Math.round(+opt('motion-blur', 1) || 1));

const chromium = await loadPlaywright();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const site = await serve(file);
const fps = +opt('fps', 30); const out = resolve(opt('out', join(site.root, 'renders')));
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const formats = await pickFormats(browser, site.url, opt('format'));

for (const format of formats) {
  const { page, errors } = await openFormat(browser, site.url, format, scale);
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
    const step = +opt('every', 1); const shots = []; const times = [];
    const from = opt('from') !== undefined ? +opt('from') : Math.min(0.5, step); const to = Math.min(duration, opt('to') !== undefined ? +opt('to') : duration);
    for (let t = from; t < to + 1e-6 && shots.length < 96; t += step) {
      // each frame is stamped with its time, so a finding in check maps to a cell
      await page.evaluate(([t, k]) => { window.seek(t); let d = document.getElementById('mv-stamp');
        if (!d) { d = document.createElement('div'); d.id = 'mv-stamp'; d.style.cssText = `position:fixed;left:0;top:0;z-index:2147483647;padding:${8 * k}px ${14 * k}px;background:rgba(0,0,0,.7);color:#fff;font:700 ${30 * k}px/1 system-ui,sans-serif`; document.body.append(d); }
        d.textContent = `${t.toFixed(2)}s`; }, [t, (SIZES[format][0] / (step < 1 ? 270 : 360)) * 0.8]);
      const f = join(out, `.sheet-${tag}-${shots.length}.jpg`); await page.screenshot({ path: f, type: 'jpeg', quality: 80 }); shots.push(f); times.push(t);
    }
    const cols = Math.min(step < 1 ? 8 : 6, shots.length); const [w, h] = SIZES[format]; const tw = step < 1 ? 270 : 360; const th = Math.round(h * tw / w);
    const inputs = shots.flatMap((s) => ['-i', s]);
    const layout = shots.map((_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * th}`).join('|');
    const scaled = shots.map((_, i) => `[${i}]scale=${tw}:${th}[s${i}]`).join(';');
    const f = join(out, opt('from') !== undefined || opt('to') !== undefined ? `${tag}-sheet-${from}-${to}.jpg` : `${tag}-sheet.jpg`);
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${scaled};${shots.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${shots.length}:layout=${layout}:fill=black`, f]);
    await page.evaluate(() => document.getElementById('mv-stamp')?.remove());
    for (const s of shots) await rm(s);
    console.log(`sheet ${f} (one frame every ${step}s from ${from}s${shots.length >= 96 ? ', first 96 frames: narrow --from/--to' : ''})`);
  } else {
    if (!hasFfmpeg) { console.error('ffmpeg is not on the PATH (macOS: brew install ffmpeg · Debian/Ubuntu: sudo apt install ffmpeg · Windows: winget install ffmpeg)'); process.exit(1); }
    const frames = Math.round(duration * fps); const f = join(out, `${tag}.mp4`);
    const music = opt('audio'); const cues = opt('sfx') === 'off' ? [] : await page.evaluate(() => window.soundCues ? window.soundCues() : []);
    // frames go to ffmpeg as PNG (lossless: x264 compresses once); --motion-blur sends N sub-frames per frame
    const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps * blur), '-i', '-'];
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
    const [W, H] = SIZES[format]; const vf = [];
    if (blur > 1) vf.push(`tmix=frames=${blur}`, `select='eq(mod(n\\,${blur})\\,${blur - 1})'`, `setpts=N/(${fps}*TB)`);
    if (scale > 1) vf.push(`scale=${W}:${H}:flags=lanczos`);
    if (vf.length) ffArgs.push('-vf', vf.join(','));
    ffArgs.push('-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f);
    const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < frames; i++) {
      // sub-frames spread over half the frame interval: a 180° shutter, as a film camera blurs
      for (let k = 0; k < blur; k++) {
        await page.evaluate((t) => window.seek(t), i / fps + (blur > 1 ? (k / blur) * (0.5 / fps) : 0));
        const buf = await page.screenshot({ type: 'png' });
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      }
      if (i % fps === 0) process.stdout.write(`\r${tag}: ${Math.round((i / frames) * 100)}%   `);
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
    if (wav) await rm(wav, { force: true });
    console.log(`\rvideo ${f} (${duration}s, ${fps} fps${scale > 1 ? `, ×${scale} supersampled` : ''}${blur > 1 ? `, motion blur ${blur}` : ''})`);
  }
  await page.close();
}
await browser.close();
site.close();
