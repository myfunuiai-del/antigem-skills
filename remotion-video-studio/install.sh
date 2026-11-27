#!/data/user/0/ai.antigem/files/usr/bin/bash
set -euo pipefail

PREFIX_DIR="${PREFIX:-/data/user/0/ai.antigem/files/usr}"
STUDIO_DIR="$HOME/remotion-studio"
FONT_DIR="$HOME/.local/share/fonts"
BIN_DIR="$PREFIX_DIR/bin"
GLIBC_LIB="$PREFIX_DIR/glibc/lib"
LD_LINUX="$GLIBC_LIB/ld-linux-aarch64.so.1"
REPO_RAW="https://raw.githubusercontent.com/myfunuiai-del/antigem-skills/main/remotion-video-studio"

SKILL_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

echo "==> [1/6] Checking and installing Termux system dependencies..."
if command -v pkg >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  APT_OPTS=(-y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

  MISSING_PKGS=()
  command -v node >/dev/null 2>&1 || MISSING_PKGS+=(nodejs)
  command -v ffmpeg >/dev/null 2>&1 || MISSING_PKGS+=(ffmpeg)
  command -v chromium-browser >/dev/null 2>&1 || MISSING_PKGS+=(chromium)
  command -v curl >/dev/null 2>&1 || MISSING_PKGS+=(curl)
  command -v tar >/dev/null 2>&1 || MISSING_PKGS+=(tar)

  if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
    pkg update -y
    apt-get install "${APT_OPTS[@]}" "${MISSING_PKGS[@]}"
  fi

  if [ ! -x "$LD_LINUX" ]; then
    echo "==> [2/6] Installing glibc-repo & glibc-runner (for native @remotion/renderer)..."
    if [ ! -f "$PREFIX_DIR/etc/apt/sources.list.d/glibc.list" ]; then
      apt-get install "${APT_OPTS[@]}" glibc-repo
      pkg update -y
    fi
    apt-get install "${APT_OPTS[@]}" glibc-runner
  else
    echo "==> [2/6] glibc dynamic linker already installed ($LD_LINUX)."
  fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi

echo "==> [3/6] Setting up Node/Remotion workspace in $STUDIO_DIR..."
mkdir -p "$STUDIO_DIR/src" "$STUDIO_DIR/out" "$STUDIO_DIR/fonts" "$STUDIO_DIR/binaries" "$STUDIO_DIR/binaries-gnu" "$FONT_DIR"
cd "$STUDIO_DIR"

if [ ! -f "package.json" ]; then
  pnpm init >/dev/null
  node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json","utf8"));p.type="module";fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n");'
fi

pnpm add remotion @remotion/cli @remotion/renderer @remotion/bundler puppeteer-core react react-dom

echo "==> [4/6] Setting up native ARM64 @remotion/renderer compositor binaries..."
REMOTION_VER="$(node -p "require('./node_modules/remotion/package.json').version")"
INSTALLED_COMP_VER=""
if [ -f "$STUDIO_DIR/binaries-gnu/package.json" ]; then
  INSTALLED_COMP_VER="$(node -p "try{require('$STUDIO_DIR/binaries-gnu/package.json').version}catch{''}")"
fi

if [ "$INSTALLED_COMP_VER" != "$REMOTION_VER" ]; then
  echo "    Fetching @remotion/compositor-linux-arm64-gnu@${REMOTION_VER}..."
  TMP_WORK="$(mktemp -d "${TMPDIR:-$HOME/.cache}/remotion-comp.XXXXXX")"
  TARBALL_URL="$(npm view "@remotion/compositor-linux-arm64-gnu@${REMOTION_VER}" dist.tarball)"
  curl -fsSL "$TARBALL_URL" | tar -xz -C "$TMP_WORK"
  rm -rf "$STUDIO_DIR/binaries-gnu"
  mkdir -p "$STUDIO_DIR/binaries-gnu"
  cp -a "$TMP_WORK/package/." "$STUDIO_DIR/binaries-gnu/"
  rm -rf "$TMP_WORK"
else
  echo "    Compositor binaries already match Remotion v${REMOTION_VER}."
fi

if [ -x "$LD_LINUX" ]; then
  for bin in remotion ffmpeg ffprobe; do
    cat > "$STUDIO_DIR/binaries/$bin" <<EOF
#!${PREFIX_DIR}/bin/sh
unset LD_PRELOAD
exec "${LD_LINUX}" --library-path "${STUDIO_DIR}/binaries-gnu:${GLIBC_LIB}" "${STUDIO_DIR}/binaries-gnu/${bin}" "\$@"
EOF
    chmod +x "$STUDIO_DIR/binaries/$bin"
  done
  "$STUDIO_DIR/binaries/ffprobe" -version | head -n 1
else
  echo "WARNING: $LD_LINUX not found; native @remotion/renderer wrappers were skipped."
fi

echo "==> [5/6] Syncing Remotion config, templates, Studio & Bangla fonts..."
copy_or_fetch() {
  local rel="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [ -n "$SKILL_DIR" ] && [ -f "$SKILL_DIR/$rel" ]; then
    cp "$SKILL_DIR/$rel" "$dest"
  else
    curl -fsSL "$REPO_RAW/$rel" -o "$dest"
  fi
}

copy_or_fetch "templates/remotion.config.ts" "$STUDIO_DIR/remotion.config.ts"
copy_or_fetch "templates/tsconfig.json" "$STUDIO_DIR/tsconfig.json"
copy_or_fetch "templates/render-remotion.mjs" "$STUDIO_DIR/render-remotion.mjs"
[ -f "$STUDIO_DIR/src/index.ts" ] || copy_or_fetch "templates/src/index.ts" "$STUDIO_DIR/src/index.ts"
[ -f "$STUDIO_DIR/src/Root.tsx" ] || copy_or_fetch "templates/src/Root.tsx" "$STUDIO_DIR/src/Root.tsx"
[ -f "$STUDIO_DIR/src/TestVideo.tsx" ] || copy_or_fetch "templates/src/TestVideo.tsx" "$STUDIO_DIR/src/TestVideo.tsx"

[ -f "$STUDIO_DIR/src/scene.html" ] || copy_or_fetch "templates/scene.html" "$STUDIO_DIR/src/scene.html"
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

echo "==> [6/6] Done!"
echo "    - Native Remotion CLI:  cd $STUDIO_DIR && ./node_modules/.bin/remotion render src/index.ts TestVideo out/test.mp4"
echo "    - Programmatic API:     cd $STUDIO_DIR && node render-remotion.mjs TestVideo out/test.mp4"
echo "    - Studio & Mindmap:     mkprompt"
