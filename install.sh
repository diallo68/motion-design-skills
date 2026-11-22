#!/usr/bin/env bash
# Link the skill into Claude Code (~/.claude/skills) so `git pull` updates it in place.
#   ./install.sh            Claude Code
#   ./install.sh --codex    Codex (~/.codex/skills)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dest="$HOME/.claude/skills"; [ "${1:-}" = "--codex" ] && dest="$HOME/.codex/skills"
mkdir -p "$dest"
for s in "$here"/skills/*/; do
  name="$(basename "$s")"
  if [ -e "$dest/$name" ] && [ ! -L "$dest/$name" ]; then echo "skip $name: $dest/$name exists and is not a link"; continue; fi
  ln -sfn "$s" "$dest/$name" && echo "linked $name -> $dest/$name"
done
echo "Restart your agent session so it loads the skill."
