// Voice-over for motion-video: turns the page's lines into WAV files, timed on the video.
//
// Providers, set by <body data-voice="…"> or render/check --voice "…":
//   piper:fr_FR-siwis-medium          free and offline (default). A speaker: piper:fr_FR-upmc-medium#pierre
//   google:fr-FR-Neural2-A            Google Cloud Text-to-Speech; needs GOOGLE_TTS_API_KEY in the environment
//   (any line with a file)            a recorded voice: window.VOICE = [{ at: 1.2, file: 'assets/voice/01.m4a' }]
// Speed: data-voice-rate="1.1" (1 = normal). Lines are cached in .voice/ next to the video, keyed by their text.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const PIPER_DIR = process.env.PIPER_VOICES || join(homedir(), '.cache', 'motion-video', 'piper');
export const DEFAULT_VOICE = 'piper:fr_FR-siwis-medium';

const which = (cmd) => { const r = spawnSync('sh', ['-c', 'command -v "$0"', cmd], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
export const piperBin = () => which('piper') || (existsSync(join(homedir(), '.local/bin/piper')) ? join(homedir(), '.local/bin/piper') : null);
const duration = (f) => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim();

function piper(text, spec, rate, out) {
  const bin = piperBin();
  if (!bin) throw new Error('Piper is not installed: run `node <skill>/scripts/voice-setup.mjs` once.');
  const [model, speakerName] = spec.split('#');
  const onnx = join(PIPER_DIR, `${model}.onnx`);
  if (!existsSync(onnx)) throw new Error(`Voice ${model} is not downloaded: run \`node <skill>/scripts/voice-setup.mjs ${model}\`.`);
  const args = ['-m', onnx, '-f', out, '--length-scale', String((1 / rate).toFixed(3)), '--sentence-silence', '0.15'];
  if (speakerName) {
    const map = JSON.parse(readFileSync(`${onnx}.json`, 'utf8')).speaker_id_map || {};
    if (!(speakerName in map)) throw new Error(`${model} has no speaker "${speakerName}" (it has: ${Object.keys(map).join(', ') || 'one voice'})`);
    args.push('-s', String(map[speakerName]));
  }
  const r = spawnSync(bin, args, { input: text, encoding: 'utf8' });
  if (r.status || !existsSync(out)) throw new Error(`Piper failed: ${r.stderr}`);
}

async function google(text, name, rate, out) {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new Error('GOOGLE_TTS_API_KEY is not set: create an API key restricted to the Text-to-Speech API in Google Cloud and export it in your shell profile.');
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },   // the key travels in a header, never in the URL
    body: JSON.stringify({ input: { text }, voice: { languageCode: name.split('-').slice(0, 2).join('-'), name }, audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 48000, speakingRate: rate } }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google TTS: ${j.error?.message || res.status}`);
  writeFileSync(out, Buffer.from(j.audioContent, 'base64'));
}

// lines: [{ at, text } | { at, file }] → [{ at, file, dur, text }], ready to mix and to check.
export async function synthesize(lines, { root, voice = DEFAULT_VOICE, rate = 1 }) {
  const cache = join(root, '.voice'); mkdirSync(cache, { recursive: true });
  const [provider, spec] = voice.includes(':') ? [voice.slice(0, voice.indexOf(':')), voice.slice(voice.indexOf(':') + 1)] : ['piper', voice];
  const out = [];
  for (const l of lines) {
    if (l.file) {
      const f = resolve(root, l.file);
      if (!existsSync(f)) throw new Error(`voice file not found: ${l.file}`);
      out.push({ at: l.at, file: f, dur: duration(f), text: l.text || l.file }); continue;
    }
    const r = l.rate || rate;
    const id = createHash('sha1').update(`${provider}|${spec}|${r}|${l.text}`).digest('hex').slice(0, 16);
    const f = join(cache, `${id}.wav`);
    if (!existsSync(f)) {
      if (provider === 'piper') piper(l.text, spec, r, f);
      else if (provider === 'google') await google(l.text, spec, r, f);
      else throw new Error(`unknown voice provider "${provider}" (piper or google)`);
    }
    out.push({ at: l.at, file: f, dur: duration(f), text: l.text });
  }
  return out;
}

// Where the piper executable's own Python lives (to run its voice downloader).
export function piperPython() {
  const bin = piperBin(); if (!bin) return null;
  const first = readFileSync(realpathSync(bin), 'utf8').split('\n')[0];
  return first.startsWith('#!') ? first.slice(2).trim() : null;
}
