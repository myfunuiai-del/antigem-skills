#!/data/user/0/ai.antigem/files/usr/bin/bash
set -e

STUDIO_DIR="$HOME/remotion-studio"
FONT_DIR="$HOME/.local/share/fonts"
BIN_DIR="/data/user/0/ai.antigem/files/usr/bin"
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
mkdir -p "$STUDIO_DIR/src" "$STUDIO_DIR/out" "$STUDIO_DIR/fonts" "$FONT_DIR"
cd "$STUDIO_DIR"

if [ ! -f "package.json" ]; then
  pnpm init >/dev/null
fi

pnpm add remotion @remotion/cli puppeteer-core react react-dom

copy_or_fetch() {
  local rel="$1"
  local dest="$2"
  if [ -f "$SKILL_DIR/$rel" ]; then
    cp "$SKILL_DIR/$rel" "$dest"
  else
    curl -fsSL "$REPO_RAW/$rel" -o "$dest"
  fi
}

copy_or_fetch "templates/scene.html" "$STUDIO_DIR/src/scene.html"
copy_or_fetch "templates/render.mjs" "$STUDIO_DIR/render.mjs"
copy_or_fetch "studio/server.mjs" "$STUDIO_DIR/server.mjs"
copy_or_fetch "studio/video-workflow-mindmap.html" "$STUDIO_DIR/video-workflow-mindmap.html"
copy_or_fetch "studio/dependency-modal.css" "$STUDIO_DIR/dependency-modal.css"
copy_or_fetch "studio/dependency-modal.js" "$STUDIO_DIR/dependency-modal.js"
copy_or_fetch "studio/prompts-playbook.json" "$STUDIO_DIR/prompts-playbook.json"

for weight in Light Regular Medium SemiBold Bold; do
  copy_or_fetch "fonts/HindSiliguriFixed-${weight}.ttf" "$STUDIO_DIR/fonts/HindSiliguriFixed-${weight}.ttf"
  cp "$STUDIO_DIR/fonts/HindSiliguriFixed-${weight}.ttf" "$FONT_DIR/"
done

if [ -d "$BIN_DIR" ]; then
  copy_or_fetch "bin/mkprompt" "$BIN_DIR/mkprompt"
  chmod +x "$BIN_DIR/mkprompt"
fi

echo "Full backup restored! Run 'mkprompt' to launch Studio & Prompt Builder."
