# Motion design skills

An agent skill that makes **motion design videos** — app promos, website launch videos and social media ads —
the way they look on Dribbble and Pinterest: kinetic type, phones floating in 3D, UI cards, benefit chips, cursor
taps, rolling words, counters and end cards with store badges. Each video is an HTML page rendered frame by frame
to MP4, in the formats the platforms want:

| Format | Size | For |
|---|---|---|
| story | 1080×1920 | Reels, Stories, TikTok, Shorts |
| feed | 1080×1350 | Instagram / Facebook / LinkedIn feed |
| square | 1080×1080 | feeds, X, marketplaces |
| landscape | 1920×1080 | YouTube, websites, slides |

Ask your agent something like *"make a 15-second launch video for my app for Instagram Reels"* or *"animate our
new website for LinkedIn"*: it writes a storyboard, picks a style and the moves, builds the video, checks the
frames on a contact sheet and renders the MP4s.

## Install

**Claude Code (plugin)** — inside Claude Code:
```
/plugin marketplace add diallo68/motion-design-skills
/plugin install motion-design-skills@motion-design-skills
```

**Any agent that reads skills** (Claude Code, Codex, Cursor…) with the [`skills` CLI](https://github.com/vercel-labs/agent-skills):
```bash
npx skills add https://github.com/diallo68/motion-design-skills --skill motion-video
```

**From a clone** (links the skill, so `git pull` updates it):
```bash
git clone https://github.com/diallo68/motion-design-skills && cd motion-design-skills && ./install.sh   # --codex for Codex
```

Requirements: Node 18+, [ffmpeg](https://ffmpeg.org/download.html) on the PATH. Each video project installs
Playwright's Chromium once (`npm install && npx playwright install chromium`); the skill tells the agent how.

## Use it by hand

```bash
node skills/motion-video/scripts/init.mjs my-launch --template app-promo --style midnight-glow
cd my-launch && npm install && npx playwright install chromium
node engine/render.mjs video.html --sheet      # contact sheet of frames, to check the layout
node engine/render.mjs video.html              # MP4s in renders/
```

Open `video.html?format=feed&t=4` in a browser to look at any moment while you edit.

## What is inside

- **3 templates** (working videos to start from): `app-promo` 15 s, `website-launch` 14 s, `social-ad` 10 s.
- **6 styles**: `midnight-glow`, `pastel-pop`, `bold-type`, `clean-light`, `neon-lime`, `warm-editorial`.
- **18 moves** documented with markup in `skills/motion-video/references/moves.md`.
- **An engine** of plain CSS keyframes and `data-` attributes (`data-in="fadeUp@1.2"`, `data-words`,
  `data-ticker`, `data-count`, `data-type`…), and a deterministic renderer (Playwright + ffmpeg).
- **Helpers**: `capture.mjs` to capture a live site for the browser frame.

Every frame is computed from time `t`, so renders are identical every time, at any frame rate, with no screen
recording.

## License

MIT
