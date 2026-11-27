#!/data/user/0/ai.antigem/files/usr/bin/bash
set -e

STUDIO_DIR="$HOME/remotion-studio"
REPO_RAW="https://raw.githubusercontent.com/myfunuiai-del/antigem-skills/main/remotion-video-studio"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Checking and installing system dependencies..."
if command -v pkg >/dev/null 2>&1; then
  MISSING_PKGS=""
  command -v node >/dev/null 2>&1 || MISSING_PKGS="$MISSING_PKGS nodejs"
  command -v ffmpeg >/dev/null 2>&1 || MISSING_PKGS="$MISSING_PKGS ffmpeg"
  command -v chromium-browser >/dev/null 2>&1 || MISSING_PKGS="$MISSING_PKGS chromium"
  if [ -n "$MISSING_PKGS" ]; then
    pkg update -y && pkg install -y $MISSING_PKGS
  fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi

echo "Setting up $STUDIO_DIR..."
mkdir -p "$STUDIO_DIR/src" "$STUDIO_DIR/out"
cd "$STUDIO_DIR"

if [ ! -f "package.json" ]; then
  pnpm init >/dev/null
fi

pnpm add remotion @remotion/cli puppeteer-core react react-dom

if [ -f "$SKILL_DIR/templates/scene.html" ]; then
  cp "$SKILL_DIR/templates/scene.html" "$STUDIO_DIR/src/scene.html"
  cp "$SKILL_DIR/templates/render.mjs" "$STUDIO_DIR/render.mjs"
else
  curl -fsSL "$REPO_RAW/templates/scene.html" -o "$STUDIO_DIR/src/scene.html"
  curl -fsSL "$REPO_RAW/templates/render.mjs" -o "$STUDIO_DIR/render.mjs"
fi

echo "Setup complete! Run: cd $STUDIO_DIR && node render.mjs"
