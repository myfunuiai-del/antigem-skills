#!/data/user/0/ai.antigem/files/usr/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTO_ALL=false
AUTO_YES=false

for arg in "$@"; do
    case "$arg" in
        --all|--full|-a|-f) AUTO_ALL=true ;;
        --yes|-y)            AUTO_YES=true ;;
    esac
done

echo "=================================================="
echo "   AntiGem Modular Skills & Rust Core Installer   "
echo "=================================================="
echo ""
echo "Select modules to install (with approx. download sizes):"
echo "  [1] Unified Rust Core (rust + rg, fd, jql, dust, bat, procs, watchexec + 6 CLI tools)"
echo "      ~145 MB download  | Required to build/update Rust Core & fast agent search"
echo "  [2] Image Organizer & OCR (python + python-pillow + tesseract)"
echo "      ~45 MB download   | Required for image-organizer OCR text reading"
echo "  [3] Video & Audio Suite (ffmpeg + yt-dlp + python)"
echo "      ~35 MB download   | Required for video-analyzer-tool & rea-video"
echo "  [4] Browser / JS Runtime (quickjs-ng)"
echo "      ~2 MB download    | Required for fast-browser-automation JS eval"
echo "  [5] Zsh Shell & Plugins (zsh + .zshrc + autosuggestions + syntax-highlighting)"
echo "      ~5 MB download    | Optional terminal speed & theme"
echo "  [A] Install ALL of the above (~230 MB total download)"
echo "  [Q] Quit / Cancel"
echo ""

SEL_RUST=false
SEL_IMG=false
SEL_VID=false
SEL_JS=false
SEL_ZSH=false

if [ "$AUTO_ALL" = true ]; then
    SEL_RUST=true; SEL_IMG=true; SEL_VID=true; SEL_JS=true; SEL_ZSH=true
    echo "[*] --all specified: selecting all modules."
else
    read -r -p "Enter choices (e.g. 1,2 or A for all): " choices
    choices_upper=$(echo "$choices" | tr '[:lower:]' '[:upper:]')
    if [[ "$choices_upper" == *"Q"* ]] || [ -z "$choices_upper" ]; then
        echo "[!] Installation cancelled."
        exit 0
    fi
    if [[ "$choices_upper" == *"A"* ]]; then
        SEL_RUST=true; SEL_IMG=true; SEL_VID=true; SEL_JS=true; SEL_ZSH=true
    else
        [[ "$choices_upper" == *"1"* ]] && SEL_RUST=true
        [[ "$choices_upper" == *"2"* ]] && SEL_IMG=true
        [[ "$choices_upper" == *"3"* ]] && SEL_VID=true
        [[ "$choices_upper" == *"4"* ]] && SEL_JS=true
        [[ "$choices_upper" == *"5"* ]] && SEL_ZSH=true
    fi
fi

PKGS=()
[ "$SEL_RUST" = true ] && PKGS+=(rust ripgrep fd jql dust bat procs watchexec git)
[ "$SEL_IMG" = true ]  && PKGS+=(python python-pillow tesseract curl)
[ "$SEL_VID" = true ]  && PKGS+=(ffmpeg yt-dlp python)
[ "$SEL_JS" = true ]   && PKGS+=(quickjs-ng)
[ "$SEL_ZSH" = true ]  && PKGS+=(zsh git)

# Deduplicate package list
UNIQUE_PKGS=($(printf "%s\n" "${PKGS[@]}" | sort -u))

if [ ${#UNIQUE_PKGS[@]} -eq 0 ]; then
    echo "[!] No valid modules selected. Exiting."
    exit 0
fi

if [ "$SEL_RUST" = false ] && ! command -v rustc >/dev/null 2>&1; then
    echo ""
    echo "[WARNING] Rust Core [1] is not selected and rustc is not installed."
    echo "          Without Rust, you cannot build/update ctx-squeeze, mem-search,"
    echo "          ui-filter, srt-clean, img-scan, or router-stats from source."
fi

echo ""
echo "Packages to install/verify: ${UNIQUE_PKGS[*]}"
if [ "$AUTO_YES" = true ]; then
    echo "[*] Auto-confirmation enabled (--yes)."
else
    read -r -p "Proceed with installation? (y/N): " confirm
    case "$confirm" in
        [yY][eE][sS]|[yY]) ;;
        *)
            echo "[!] Installation aborted by user."
            exit 0
            ;;
    esac
fi

if command -v pkg >/dev/null 2>&1; then
    pkg update -y || true
    pkg install -y "${UNIQUE_PKGS[@]}"
elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y || true
    sudo apt-get install -y "${UNIQUE_PKGS[@]}"
fi

# Build Unified Rust Workspace if Rust is available
BIN_TARGET="${PREFIX:-/data/user/0/ai.antigem/files/usr}/bin"
mkdir -p "$BIN_TARGET" "$SCRIPT_DIR/bin"

if [ "$SEL_RUST" = true ] && command -v cargo >/dev/null 2>&1 && [ -f "$SCRIPT_DIR/tools/Cargo.toml" ]; then
    echo "[*] Building Unified Rust Core Workspace..."
    cargo build --release --workspace --manifest-path "$SCRIPT_DIR/tools/Cargo.toml"
    for tool in ctx-squeeze mem-search ui-filter srt-clean img-scan router-stats; do
        if [ -f "$SCRIPT_DIR/tools/target/release/$tool" ]; then
            cp "$SCRIPT_DIR/tools/target/release/$tool" "$SCRIPT_DIR/bin/$tool"
        fi
    done
    echo "  [✓] Built all 6 Rust Core binaries."
fi

# Deploy binaries (including pre-built ones)
if [ -d "$SCRIPT_DIR/bin" ]; then
    cp -r "$SCRIPT_DIR/bin/"* "$BIN_TARGET/"
    chmod +x "$BIN_TARGET"/{fast-touch,auto-cut,ctx-squeeze,mem-search,ui-filter,srt-clean,img-scan,router-stats} 2>/dev/null || true
    echo "  [✓] Deployed binaries to $BIN_TARGET"
fi

# Configure headless Chromium & WebGL if Chromium is present
if [ -x "$BIN_TARGET/chromium-browser" ]; then
    [ ! -e "$BIN_TARGET/chromium" ] && ln -sf chromium-browser "$BIN_TARGET/chromium"
    PREFIX_BASE="${PREFIX:-/data/user/0/ai.antigem/files/usr}"
    mkdir -p "$PREFIX_BASE/etc/chromium"
    cat > "$PREFIX_BASE/etc/chromium/default.conf" << 'EOF'
# Termux default Chromium flags:
# - --no-sandbox --disable-dev-shm-usage: prevent Android sandbox & /dev/shm crashes
# - Mesa Zink (--use-gl=angle --use-angle=gl-egl): fix WebGL/Three.js Context Lost in Termux
# - LP_NUM_THREADS=2: limit llvmpipe CPU threads to reduce phone heating
export LIBGL_ALWAYS_SOFTWARE=1
export LP_NUM_THREADS="${LP_NUM_THREADS:-2}"
CHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage --use-gl=angle --use-angle=gl-egl --ignore-gpu-blocklist"
EOF
    echo "  [✓] Configured headless Chromium flags & symlink in $PREFIX_BASE/etc/chromium"
fi

# Download Bengali OCR traineddata if Image Organizer [2] is selected
TESS_DIR="${PREFIX:-/data/user/0/ai.antigem/files/usr}/share/tessdata"
if [ "$SEL_IMG" = true ] && [ ! -f "$TESS_DIR/ben.traineddata" ] && command -v curl >/dev/null 2>&1; then
    echo "[*] Downloading Bengali OCR data (ben.traineddata ~2.3 MB)..."
    mkdir -p "$TESS_DIR"
    curl -fsSL -o "$TESS_DIR/ben.traineddata" "https://github.com/tesseract-ocr/tessdata_fast/raw/main/ben.traineddata" || true
fi

# Deploy Skills
if [ -d "$HOME/.gemini" ]; then
    mkdir -p "$HOME/.gemini/config/skills"
    cp -r "$SCRIPT_DIR/skills/"* "$HOME/.gemini/config/skills/"
    echo "  [✓] Deployed skills to AntiGem"
fi
if [ -d "$HOME/.claude" ]; then
    mkdir -p "$HOME/.claude/skills"
    cp -r "$SCRIPT_DIR/skills/"* "$HOME/.claude/skills/"
    echo "  [✓] Deployed skills to Claude Code"
fi

# Deploy Global Memories
mkdir -p "$HOME/.antigem/memory/global"
if [ -d "$SCRIPT_DIR/memory" ]; then
    cp -r "$SCRIPT_DIR/memory/"* "$HOME/.antigem/memory/global/"
    echo "  [✓] Synced global agent memories"
fi

# Optional Zsh Setup
if [ "$SEL_ZSH" = true ]; then
    if [ -f "$SCRIPT_DIR/dotfiles/.zshrc" ]; then
        [ -f "$HOME/.zshrc" ] && cp "$HOME/.zshrc" "$HOME/.zshrc.bak_$(date +%s)"
        cp "$SCRIPT_DIR/dotfiles/.zshrc" "$HOME/.zshrc"
        echo "  [✓] Deployed optimized .zshrc"
    fi
    mkdir -p "$HOME/.zsh"
    [ ! -d "$HOME/.zsh/zsh-autosuggestions" ] && git clone https://github.com/zsh-users/zsh-autosuggestions "$HOME/.zsh/zsh-autosuggestions" --depth 1
    [ ! -d "$HOME/.zsh/zsh-syntax-highlighting" ] && git clone https://github.com/zsh-users/zsh-syntax-highlighting "$HOME/.zsh/zsh-syntax-highlighting" --depth 1
    echo "  [✓] Zsh plugins ready."
fi

echo "=================================================="
echo " [✓] AntiGem Setup Complete!"
echo "=================================================="
