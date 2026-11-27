#!/data/user/0/ai.antigem/files/usr/bin/bash
set -e

STUDIO_DIR="$HOME/remotion-studio"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Checking dependencies..."
for cmd in node pnpm ffmpeg chromium-browser; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: $cmd is not installed."
    exit 1
  fi
done

echo "Setting up $STUDIO_DIR..."
mkdir -p "$STUDIO_DIR/src" "$STUDIO_DIR/out"
cd "$STUDIO_DIR"

if [ ! -f "package.json" ]; then
  pnpm init >/dev/null
fi

pnpm add puppeteer-core react react-dom

cp "$SKILL_DIR/templates/scene.html" "$STUDIO_DIR/src/scene.html"
cp "$SKILL_DIR/templates/render.mjs" "$STUDIO_DIR/render.mjs"

echo "Setup complete! Run: cd $STUDIO_DIR && node render.mjs"
