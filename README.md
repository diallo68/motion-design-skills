# Motion design skills

An agent skill that makes **motion design videos** — app promos, website launch videos and social media ads —
in the style common on Dribbble and Pinterest: kinetic type, phones arriving in 3D, camera punch-ins, transitions
that grow out of what is on screen, UI cards, benefit chips, presses,
rolling words, counters and end cards with store badges. Each video is an HTML page rendered frame by frame
to MP4, in the formats the platforms want:

| Format | Size | For |
|---|---|---|
| story | 1080×1920 | Reels, Stories, TikTok, Shorts |
| feed | 1080×1350 | Instagram / Facebook / LinkedIn feed |
| square | 1080×1080 | feeds, X, marketplaces |
| landscape | 1920×1080 | YouTube, websites, slides |

Ask your agent something like *"make a 15-second launch video for my app for Instagram Reels"* or *"animate our
new website for LinkedIn"*: it writes a storyboard, picks a style and the moves, builds the video, runs the
quality check, looks at the frames on a contact sheet and renders the MP4s.

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
node engine/check.mjs video.html               # what a viewer would notice, each with its fix
node engine/render.mjs video.html --sheet      # contact sheet of frames, to look at the layout
node engine/render.mjs video.html              # MP4s in renders/
```

Open `video.html?format=feed&t=4` in a browser to look at any moment while you edit.

## What is inside

- **3 templates** (working videos to start from, each passing the check): `app-promo` 15 s, `website-launch` 15 s,
  `social-ad` 12 s.
- **6 styles**: `midnight-glow`, `pastel-pop`, `bold-type`, `clean-light`, `neon-lime`, `warm-editorial`.
- **25 moves** documented with markup in `skills/motion-video/references/moves.md`, including transitions with a
  cause (punch-in camera, object becomes the world, iris from the tap, colour flood, whip) and eases by role.
- **An engine** of plain CSS keyframes and `data-` attributes (`data-in="fadeUp@1.2"`, `data-words`,
  `data-ticker`, `data-count`, `data-type`…), and a deterministic renderer (Playwright + ffmpeg).
- **A quality check** (`check.mjs`) that plays the video and measures every line of text every 0.1 s in every
  format: platform safe zones (Reels, TikTok, Shorts), text off the frame, cut, overlapping or covered, time to
  read, contrast, letter size, crowding, end-card length, missing files.
- **Helpers**: `capture-app.mjs` captures the real app from an Android emulator or device or an iOS simulator,
  with the system bars cropped off; `capture.mjs` captures a live site for the browser frame.

- **Sound**: effects synthesised by the engine and placed on the visible actions (whoosh, click, pop, tap,
  chime…), music of your own mixed under them.
- **4 formats from one page**: story, feed, square and landscape, each template laid out and checked in all four.

Every frame is computed from time `t`, so renders are identical every time, at any frame rate, with no screen
recording.

## Where the moves come from

The moves and timings are written from common patterns in public motion design work (Dribbble and Pinterest
showcases of app promos and launch videos) and from platform guidance on safe zones and reading time. No video
was copied or analysed frame by frame; the templates and styles are original.

## License

MIT
