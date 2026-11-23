"""Chatterbox Multilingual (Resemble AI, MIT licence) through its official Hugging Face Space.

Called by voice.mjs:  python chatterbox.py '{"text": "...", "lang": "fr", "ref": "path.wav" | null, "out": "x.wav",
                                            "exaggeration": 0.5, "cfg": 0.5, "temperature": 0.8, "seed": 42}'
Runs on any machine (the model runs on Hugging Face's GPUs). The text and the reference recording are sent to
Hugging Face. HF_TOKEN (a free account's access token) raises the free quota. Every clip carries Resemble's
inaudible PerTh watermark.
"""
import json, os, shutil, subprocess, sys

from gradio_client import Client, handle_file

SPACE = os.environ.get("CHATTERBOX_SPACE", "ResembleAI/Chatterbox-Multilingual-TTS")


def main():
    a = json.loads(sys.argv[1])
    token = os.environ.get("HF_TOKEN") or None
    try:
        client = Client(SPACE, token=token, verbose=False)          # gradio_client >= 1.0
    except TypeError:
        client = Client(SPACE, hf_token=token, verbose=False)       # older clients
    ref = a.get("ref")
    if not ref:  # the Space's own reference voice for the language
        ref, _ = client.predict(a.get("lang", "fr"), None, "", api_name="/on_language_change")
    try:
        wav = client.predict(a["text"], a.get("lang", "fr"), handle_file(ref), a.get("exaggeration", 0.5),
                             a.get("temperature", 0.8), a.get("seed", 42), a.get("cfg", 0.5), api_name="/generate_tts_audio")
    except Exception as e:  # quota and queue errors come back as text
        msg = str(e)
        if "quota" in msg.lower() or "limit" in msg.lower():
            msg += " — set HF_TOKEN (a free Hugging Face access token) in your shell profile for more quota."
        print(msg, file=sys.stderr)
        sys.exit(2)
    # normalise to a 48 kHz WAV whatever the Space returns
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ar", "48000", a["out"]], check=True)


if __name__ == "__main__":
    main()
