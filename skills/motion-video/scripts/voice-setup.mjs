#!/usr/bin/env node
// One-time setup for voice-over with Piper (free, offline text-to-speech).
//   node voice-setup.mjs                         install Piper and the two default French voices
//   node voice-setup.mjs en_US-lessac-medium     add any voice from https://huggingface.co/rhasspy/piper-voices
//   node voice-setup.mjs --chatterbox            set up Chatterbox (natural voices, voice from a reference recording)
//   node voice-setup.mjs --kokoro                set up Kokoro (natural voices, offline, no account)
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

// Kokoro (natural, offline): kokoro-onnx in the same small venv, and its two model files (about 350 MB)
if (process.argv.includes('--kokoro')) {
  const { CHATTERBOX_PY } = await import(engine);
  const venv = dirname(dirname(CHATTERBOX_PY)); const dir = join(dirname(venv), 'kokoro');
  if (!existsSync(CHATTERBOX_PY) && !(has('uv') ? run('uv', ['venv', '--python', '3.11', venv]) : run('python3', ['-m', 'venv', venv]))) process.exit(1);
  if (!(has('uv') ? run('uv', ['pip', 'install', '--python', CHATTERBOX_PY, 'kokoro-onnx', 'soundfile']) : run(CHATTERBOX_PY, ['-m', 'pip', 'install', 'kokoro-onnx', 'soundfile']))) process.exit(1);
  mkdirSync(dir, { recursive: true });
  for (const f of ['kokoro-v1.0.onnx', 'voices-v1.0.bin']) if (!existsSync(join(dir, f))) run('curl', ['-L', '--fail', '-o', join(dir, f), `https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/${f}`]);
  console.log(`✓ Kokoro in ${dir}. Use <body data-voice="kokoro:ff_siwis"> (French) or kokoro:af_heart, kokoro:bm_george (English).`);
  console.log('Kokoro model: Apache 2.0 (hexgrad/Kokoro-82M).');
  process.exit(0);
}

// Chatterbox (natural voices, voice from a reference recording): a small Python client for its Hugging Face Space
if (process.argv.includes('--chatterbox')) {
  const { CHATTERBOX_PY } = await import(engine);
  const venv = dirname(dirname(CHATTERBOX_PY));
  if (!existsSync(CHATTERBOX_PY)) {
    const ok = has('uv') ? run('uv', ['venv', '--python', '3.11', venv]) && run('uv', ['pip', 'install', '--python', CHATTERBOX_PY, 'gradio_client'])
      : run('python3', ['-m', 'venv', venv]) && run(CHATTERBOX_PY, ['-m', 'pip', 'install', 'gradio_client']);
    if (!ok) process.exit(1);
  }
  console.log(`✓ Chatterbox client in ${venv}`);
  console.log('Use <body data-voice="chatterbox:fr"> (the Space\'s French voice) or "chatterbox:fr@assets/voice/ref.wav" (a 10-30 s');
  console.log('recording of a person who agreed). The text and the recording are sent to Hugging Face. For more free quota,');
  console.log('create a free account, make an access token and add `export HF_TOKEN=…` to your shell profile.');
  process.exit(0);
}

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
