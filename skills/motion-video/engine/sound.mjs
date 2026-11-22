// Sound for motion-video: a small library of sound effects synthesised with ffmpeg (original, so no licence to
// check), and a mixer that lays the effects on their cues and the music under them.
//
// Effects: whoosh swoosh pop click tap chime thud riser. They are made once into engine/.sfx/ on first use.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SFX_DIR = join(HERE, '.sfx');

// name: [seconds, aevalsrc expression (t in s), extra filters]
const N = '(random(0)*2-1)';
export const SFX = {
  whoosh: [0.55, `${N}*pow(sin(PI*t/0.55),2)*0.9`, 'highpass=f=300,lowpass=f=2600,aecho=0.6:0.4:18:0.25'],
  swoosh: [0.32, `${N}*pow(sin(PI*t/0.32),2)*0.7`, 'highpass=f=900,lowpass=f=5200'],
  pop: [0.14, 'sin(2*PI*(520*t+2600*t*t))*exp(-28*t)*0.8', 'lowpass=f=4000'],
  click: [0.06, `(${N}*0.45*exp(-140*t)+sin(2*PI*2300*t)*0.5*exp(-90*t))`, 'highpass=f=700'],
  tap: [0.09, 'sin(2*PI*1150*t)*exp(-55*t)*0.55+sin(2*PI*2300*t)*exp(-80*t)*0.15', ''],
  chime: [1.8, '(0.32*sin(2*PI*880*t)*exp(-2.6*t)+0.16*sin(2*PI*1760*t)*exp(-4*t)+0.3*sin(2*PI*1318.5*(t-0.11))*exp(-2.6*(t-0.11))*gte(t,0.11)+0.12*sin(2*PI*2637*(t-0.11))*exp(-4.5*(t-0.11))*gte(t,0.11))*0.8', 'aecho=0.7:0.5:60:0.3'],
  thud: [0.45, 'sin(2*PI*(95*t-70*t*t))*exp(-8*t)*0.95', 'lowpass=f=600'],
  riser: [1.1, `${N}*pow(t/1.1,2.2)*0.75`, 'highpass=f=500,lowpass=f=6000'],
};

const ff = (args) => spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });

export function ensureSfx() {
  mkdirSync(SFX_DIR, { recursive: true });
  for (const [name, [d, expr, filt]] of Object.entries(SFX)) {
    const f = join(SFX_DIR, `${name}.wav`);
    if (existsSync(f)) continue;
    const raw = join(SFX_DIR, `.${name}.raw.wav`);
    const r = ff(['-f', 'lavfi', '-i', `aevalsrc=exprs='${expr}':s=48000:d=${d}`, '-af', [filt, 'afade=t=out:st=' + Math.max(0, d - 0.03) + ':d=0.03', 'aformat=channel_layouts=stereo'].filter(Boolean).join(','), raw]);
    if (r.status) throw new Error(`could not make ${name}: ${r.stderr}`);
    // every effect peaks at -3 dB, so cue gains mean the same thing for all of them
    const peak = +(spawnSync('ffmpeg', ['-i', raw, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr.match(/max_volume: ([-\d.]+) dB/)?.[1] ?? -3);
    ff(['-i', raw, '-af', `volume=${(-3 - peak).toFixed(1)}dB`, f]);
    rmSync(raw, { force: true });
  }
}

// Cues come from the page (window.soundCues()): [{ at, sfx, gain }]. A cue may name an effect of the library or a
// file in the project (assets/sfx/door.wav). Writes a stereo WAV of the video's length.
export function mix({ cues, root, duration, out, music, musicVolume = 0.55 }) {
  const inputs = []; const chains = [];
  let k = 0;
  for (const c of cues) {
    const file = SFX[c.sfx] ? join(SFX_DIR, `${c.sfx}.wav`) : join(root, c.sfx);
    if (!existsSync(file)) { console.warn(`sound: no effect or file named ${c.sfx}`); continue; }
    inputs.push('-i', file);
    const ms = Math.max(0, Math.round(c.at * 1000));
    chains.push(`[${k}]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms},volume=${c.gain ?? 1}[c${k}]`);
    k++;
  }
  if (music) {
    inputs.push('-stream_loop', '-1', '-i', music);
    chains.push(`[${k}]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${duration},volume=${musicVolume},afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, duration - 1.2)}:d=1.2[c${k}]`);
    k++;
  }
  // a silent bed sets the length, so the mix is exactly as long as the video
  inputs.push('-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=48000:cl=stereo');
  chains.push(`[${k}]anull[c${k}]`); k++;
  const graph = `${chains.join(';')};${Array.from({ length: k }, (_, i) => `[c${i}]`).join('')}amix=inputs=${k}:normalize=0:duration=longest,atrim=0:${duration},alimiter=limit=0.9[a]`;
  const r = ff([...inputs, '-filter_complex', graph, '-map', '[a]', '-c:a', 'pcm_s16le', out]);
  if (r.status) throw new Error(`sound mix failed: ${r.stderr}`);
  return k;
}
