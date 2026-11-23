"""Kokoro (hexgrad, Apache 2.0) through kokoro-onnx: natural voices that run on this machine, no account, no network.

Called by voice.mjs:  python kokoro.py '{"text": "...", "voice": "ff_siwis", "lang": "fr-fr", "speed": 1.0, "out": "x.wav"}'
Model files: ~/.cache/motion-video/kokoro/kokoro-v1.0.onnx and voices-v1.0.bin (voice-setup.mjs --kokoro).
French has one voice, ff_siwis (a woman). English: af_heart, af_bella, am_michael, bf_emma, bm_george, and more.
"""
import json, os, sys

import soundfile as sf
from kokoro_onnx import Kokoro

HOME = os.environ.get("KOKORO_DIR", os.path.join(os.path.expanduser("~"), ".cache", "motion-video", "kokoro"))


def main():
    a = json.loads(sys.argv[1])
    k = Kokoro(os.path.join(HOME, "kokoro-v1.0.onnx"), os.path.join(HOME, "voices-v1.0.bin"))
    voice = a.get("voice", "ff_siwis")
    lang = a.get("lang") or ("fr-fr" if voice.startswith("f") and voice[1] == "f" else "en-us" if voice[0] == "a" else "en-gb" if voice[0] == "b" else "fr-fr")
    samples, rate = k.create(a["text"], voice=voice, speed=float(a.get("speed", 1.0)), lang=lang)
    sf.write(a["out"], samples, rate)


if __name__ == "__main__":
    main()
