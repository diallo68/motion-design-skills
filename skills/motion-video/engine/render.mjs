#!/usr/bin/env node
// Render a motion-video HTML page to MP4, frame by frame (deterministic: every frame is seek(t)).
//
//   node render.mjs video.html                       all formats the page declares (<body data-formats>)
//   node render.mjs video.html --format story,feed   chosen formats: story 1080x1920, feed 1080x1350,
//                                                    square 1080x1080, landscape 1920x1080
//   node render.mjs video.html --still 3.5           one PNG at 3.5 s (check a moment)
//   node render.mjs video.html --sheet               contact sheet: one frame every second, in one JPG
//   node render.mjs video.html --sheet --every 0.25 --from 4 --to 7   a finer sheet around a transition
//   node render.mjs video.html --scale 2             supersampled: rendered at twice the size, scaled down (lanczos), PNG frames
//   node render.mjs video.html --png                 PNG frames at scale 1 (lossless; about 75 % slower than the default JPEG 100)
//   node render.mjs video.html --motion-blur         8 sub-frames blended into each frame (fast moves blur like film;
//                                                    --motion-blur N for another count; it costs N times the render)
//   node render.mjs video.html --workers 4           frames captured by 4 browsers side by side (default: auto, from
//                                                    the machine's cores, up to 4; --workers 1 for one browser)
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
import { cpus } from 'node:os';
import { SIZES, options, loadPlaywright, serve, openFormat, pickFormats, usesWebGL } from './page.mjs';
import { ensureSfx, mix } from './sound.mjs';
import { synthesize, DEFAULT_VOICE } from './voice.mjs';

const args = process.argv.slice(2);
const opt = options(args);
const file = args.find((a) => a.endsWith('.html'));
if (!file) { console.error('usage: node render.mjs <video.html> [--format story,feed] [--still t] [--sheet [--every s --from t --to t]] [--fps 30] [--scale 2] [--motion-blur [N]] [--audio file] [--out dir]'); process.exit(1); }
const scale = Math.max(1, Math.min(3, +opt('scale', 1) || 1));
// --motion-blur alone means 8 sub-frames: with 3 or 4, a fast move shows as separate copies instead of a blur
const mb = opt('motion-blur');
const blur = mb === undefined ? 1 : mb !== true && Number.isFinite(+mb) ? Math.max(1, Math.round(+mb)) : 8;
// frames are captured by several browsers at once and written in order: each seek(t) is independent, so the video
// is the same as with one browser, and a machine with free cores renders 2-3 times faster
const wk = opt('workers', 'auto');
const workers = wk === 'auto' || wk === true ? Math.max(1, Math.min(4, Math.floor(cpus().length / 4))) : Math.max(1, Math.min(8, Math.round(+wk) || 1));

const chromium = await loadPlaywright({ webgl: usesWebGL(file) });
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
    // frames go to ffmpeg as JPEG at quality 100 (SSIM 0.997 against PNG, 75 % faster to capture), or as PNG with
    // --scale 2 or --png (lossless: x264 compresses once); --motion-blur sends N sub-frames per frame
    const png = scale > 1 || !!opt('png');
    const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', png ? 'png' : 'mjpeg', '-framerate', String(fps * blur), '-i', '-'];
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
    // to the delivery size (lanczos when supersampled), in TV range: JPEG frames are full range, and a full-range
    // MP4 (yuvj420p) plays with crushed or washed-out blacks on some phones
    vf.push(`scale=${W}:${H}:flags=lanczos:out_range=tv`, 'format=yuv420p');
    ffArgs.push('-vf', vf.join(','));
    ffArgs.push('-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f);
    const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
    ff.stdin.on('error', () => {});                   // ffmpeg gone: handled below, not an uncaught EPIPE
    let ffDone = false; const ffClosed = new Promise((r) => ff.on('close', (code) => { ffDone = true; r(code); }));
    // a failed render leaves nothing behind: no half-written MP4, no temporary sound file
    const fail = async (why) => {
      ff.stdin.destroy(); ff.kill('SIGKILL'); await ffClosed;
      await rm(f, { force: true }); if (wav) await rm(wav, { force: true });
      console.error(`\n${tag}: render stopped, ${why}. Nothing was written.`); await browser.close(); site.close(); process.exit(1);
    };
    // a capture that times out (a heavy frame, a busy machine) is tried once more before the render stops
    const shot = png ? { type: 'png' } : { type: 'jpeg', quality: 100 };
    const shoot = async (pg) => {
      try { return await pg.screenshot({ ...shot, timeout: 60000 }); } catch {
        try { return await pg.screenshot({ ...shot, timeout: 120000 }); } catch (e) { await fail(`a frame could not be captured twice (${e.message.split('\n')[0]}); close other renders and checks, or render with --workers 1 or without --scale`); }
      }
    };
    // one page per worker, each in its own browser (one browser shares a single compositor between its pages)
    const extra = [];
    for (let w = 1; w < workers; w++) { const b = await chromium.launch(); extra.push(b); extra.push((await openFormat(b, site.url, format, scale)).page); }
    const pages = [page, ...extra.filter((x, i) => i % 2 === 1)];
    // capture c is frame floor(c / blur), sub-frame c % blur: sub-frames spread over half the frame interval, a 180°
    // shutter, as a film camera blurs
    const total = frames * blur; const at = (c) => Math.floor(c / blur) / fps + (blur > 1 ? ((c % blur) / blur) * (0.5 / fps) : 0);
    const ready = new Map(); let next = 0; let wake = null;
    const AHEAD = pages.length * 3;                   // a worker waits when it runs this far ahead of the writer
    const work = async (pg, w) => {
      for (let c = w; c < total; c += pages.length) {
        while (c - next > AHEAD) await new Promise((r) => setTimeout(r, 5));
        await pg.evaluate((t) => window.seek(t), at(c));
        ready.set(c, await shoot(pg)); if (wake) { wake(); wake = null; }
      }
    };
    const running = Promise.all(pages.map(work));
    while (next < total) {
      if (!ready.has(next)) { await new Promise((r) => { wake = r; setTimeout(r, 50); }); continue; }
      const buf = ready.get(next); ready.delete(next);
      if (ffDone) await fail('ffmpeg stopped early (its error is above)');
      if (!ff.stdin.write(buf)) await new Promise((r) => { ff.stdin.once('drain', r); ff.once('close', r); });
      next++;
      if (next % (fps * blur) === 0) process.stdout.write(`\r${tag}: ${Math.round((next / total) * 100)}%   `);
    }
    await running;
    for (const x of extra) await x.close();
    ff.stdin.end(); const code = await ffClosed;
    if (wav) await rm(wav, { force: true });
    if (code !== 0) { await rm(f, { force: true }); console.error(`\n${tag}: ffmpeg failed (exit ${code}); nothing was written.`); process.exit(1); }
    console.log(`\rvideo ${f} (${duration}s, ${fps} fps${scale > 1 ? `, ×${scale} supersampled` : ''}${blur > 1 ? `, motion blur ${blur}` : ''}, ${workers} worker${workers > 1 ? 's' : ''})`);
  }
  await page.close();
}
await browser.close();
site.close();
