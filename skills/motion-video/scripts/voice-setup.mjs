#!/usr/bin/env node
// One-time setup for voice-over with Piper (free, offline text-to-speech).
//   node voice-setup.mjs                         install Piper and the two default French voices
//   node voice-setup.mjs en_US-lessac-medium     add any voice from https://huggingface.co/rhasspy/piper-voices
//
// Piper is installed as a command-line tool with uv (`uv tool install piper-tts`) or pipx; voices go to
// ~/.cache/motion-video/piper (PIPER_VOICES to change it). Each voice has its own licence: read its MODEL_CARD.
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const engine = join(dirname(fileURLToPath(import.meta.url)), '..', 'engine', 'voice.mjs');
const { PIPER_DIR, piperBin, piperPython } = await import(engine);
const has = (c) => spawnSync('sh', ['-c', 'command -v "$0"', c]).status === 0;
const run = (c, a) => { console.log(`$ ${c} ${a.join(' ')}`); return spawnSync(c, a, { stdio: 'inherit' }).status === 0; };

if (!piperBin()) {
  const ok = has('uv') ? run('uv', ['tool', 'install', 'piper-tts']) : has('pipx') ? run('pipx', ['install', 'piper-tts']) : false;
  if (!ok) { console.error('Install uv first (https://docs.astral.sh/uv/: `curl -LsSf https://astral.sh/uv/install.sh | sh`), then run this again.'); process.exit(1); }
}
const py = piperPython();
if (!py) { console.error('Piper is installed but its Python was not found; reinstall with `uv tool install --force piper-tts`.'); process.exit(1); }

// Default French voices with licences that allow use in ads (with credit): siwis (CC BY 4.0, a woman),
// upmc (CC BY-SA 4.0, speakers jessica and pierre). fr_FR-tom-medium is AGPL-licensed: not installed by default.
const voices = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const wanted = voices.length ? voices : ['fr_FR-siwis-medium', 'fr_FR-upmc-medium'];
mkdirSync(PIPER_DIR, { recursive: true });
const missing = wanted.filter((v) => !existsSync(join(PIPER_DIR, `${v}.onnx`)));
if (missing.length && !run(py, ['-m', 'piper.download_voices', '--download-dir', PIPER_DIR, ...missing])) process.exit(1);

for (const v of wanted) {
  const cfg = JSON.parse(readFileSync(join(PIPER_DIR, `${v}.onnx.json`), 'utf8'));
  const speakers = Object.keys(cfg.speaker_id_map || {});
  console.log(`✓ ${v}${speakers.length > 1 ? `  speakers: ${speakers.join(', ')} (piper:${v}#${speakers[0]})` : ''}`);
}
console.log(`\nVoices in ${PIPER_DIR}. Use one with <body data-voice="piper:${wanted[0]}">.`);
console.log('Licences: read https://huggingface.co/rhasspy/piper-voices/tree/main/<lang>/<voice>/<quality>/MODEL_CARD and credit the voice where it asks.');
