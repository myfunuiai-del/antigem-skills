#!/data/user/0/ai.antigem/files/usr/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FULL_SETUP=false
AUTO_YES=false

for arg in "$@"; do
    case "$arg" in
        --full|-f) FULL_SETUP=true ;;
        --yes|-y)  AUTO_YES=true ;;
    esac
done

echo "=================================================="
echo "   AntiGem Skills & Unified Rust Core Installer   "
echo "=================================================="
echo ""
echo "=== Dependency Impact Matrix (What Breaks If Missing) ==="
echo "  * rust (rustc + cargo) [MANDATORY] : Without Rust, ctx-squeeze, mem-search,"
echo "                                       ui-filter, srt-clean, img-scan & router-stats"
echo "                                       cannot build or run."
echo "  * ripgrep (rg) + fd    [MANDATORY] : Without these, fast codebase & file search"
echo "                                       for agents will not work."
echo "  * jql, dust, bat, procs, watchexec : Without these, fast JSON query, disk scan,"
echo "                                       syntax view, process monitor & file watcher fail."
echo "  * python, pillow, tesseract        : Without these, image-organizer OCR & claude-router fail."
echo "  * ffmpeg, yt-dlp                   : Without these, video-analyzer-tool & rea-video fail."
echo "  * git                              : Without git, GitHub sync & updates fail."
echo "=================================================="

confirm_and_install() {
    local pm="$1"
    shift
    local pkgs=("$@")

    echo ""
    echo "The following system packages will be installed/checked:"
    for p in "${pkgs[@]}"; do
        echo "  - $p"
    done
    echo ""

    if [ "$AUTO_YES" = true ]; then
        echo "[*] Auto-confirmation enabled (--yes)."
    else
        read -r -p "Do you want to proceed with installing these packages? (y/N): " response
        case "$response" in
            [yY][eE][sS]|[yY])
                echo "[*] Proceeding with installation..."
                ;;
            *)
                echo "[!] Installation aborted by user."
                if ! command -v rustc >/dev/null 2>&1 || ! command -v cargo >/dev/null 2>&1; then
                    echo "[ERROR] Rust (rustc/cargo) is MANDATORY for the AntiGem Rust Core. Exiting."
                    exit 1
                fi
                return 0
                ;;
        esac
    fi

    if [ "$pm" = "pkg" ]; then
        pkg update -y || true
        pkg install -y "${pkgs[@]}"
    elif [ "$pm" = "apt" ]; then
        sudo apt-get update -y || true
        sudo apt-get install -y "${pkgs[@]}"
    fi
}

# 1. Install Mandatory & Core System Packages
echo "[1/6] Checking mandatory Rust & core packages..."
CORE_PKGS="rust ripgrep fd jql dust bat procs watchexec python python-pillow tesseract ffmpeg yt-dlp quickjs-ng git zsh"
APT_PKGS="rustc cargo ripgrep fd-find jq dust bat procs watchexec python3 ffmpeg yt-dlp quickjs git zsh"

if command -v pkg >/dev/null 2>&1; then
    confirm_and_install "pkg" $CORE_PKGS
elif command -v apt-get >/dev/null 2>&1; then
    confirm_and_install "apt" $APT_PKGS
fi

# Verify mandatory Rust toolchain
if ! command -v rustc >/dev/null 2>&1 || ! command -v cargo >/dev/null 2>&1; then
    echo "[ERROR] Rust (rustc/cargo) is required but not found. Aborting."
    exit 1
fi

# 2. Build Unified Rust Workspace
echo "[2/6] Building Unified Rust Core Workspace..."
BIN_TARGET="${PREFIX:-/data/user/0/ai.antigem/files/usr}/bin"
mkdir -p "$BIN_TARGET" "$SCRIPT_DIR/bin"

if [ -f "$SCRIPT_DIR/tools/Cargo.toml" ]; then
    cargo build --release --workspace --manifest-path "$SCRIPT_DIR/tools/Cargo.toml"
    for tool in ctx-squeeze mem-search ui-filter srt-clean img-scan router-stats; do
        if [ -f "$SCRIPT_DIR/tools/target/release/$tool" ]; then
            cp "$SCRIPT_DIR/tools/target/release/$tool" "$SCRIPT_DIR/bin/$tool"
        fi
    done
    echo "  [✓] Built all 6 Rust Core binaries."
fi

# 3. Deploy Custom Binaries
echo "[3/6] Installing binaries to $BIN_TARGET..."
if [ -d "$SCRIPT_DIR/bin" ]; then
    cp -r "$SCRIPT_DIR/bin/"* "$BIN_TARGET/"
    chmod +x "$BIN_TARGET"/{fast-touch,auto-cut,ctx-squeeze,mem-search,ui-filter,srt-clean,img-scan,router-stats} 2>/dev/null || true
    echo "  [✓] Installed binaries to $BIN_TARGET"
fi

# 4. Deploy Skills to AntiGem and Claude
echo "[4/6] Deploying Skills to Agent directories..."
ANTIGEM_SKILLS="$HOME/.gemini/config/skills"
CLAUDE_SKILLS="$HOME/.claude/skills"

if [ -d "$HOME/.gemini" ]; then
    mkdir -p "$ANTIGEM_SKILLS"
    cp -r "$SCRIPT_DIR/skills/"* "$ANTIGEM_SKILLS/"
    echo "  [✓] Deployed skills to AntiGem ($ANTIGEM_SKILLS)"
fi

if [ -d "$HOME/.claude" ]; then
    mkdir -p "$CLAUDE_SKILLS"
    cp -r "$SCRIPT_DIR/skills/"* "$CLAUDE_SKILLS/"
    echo "  [✓] Deployed skills to Claude Code ($CLAUDE_SKILLS)"
fi

# 5. Deploy Global Agent Memory Rules
echo "[5/6] Syncing Global Agent Memories..."
MEMORY_DIR="$HOME/.antigem/memory/global"
mkdir -p "$MEMORY_DIR"
if [ -d "$SCRIPT_DIR/memory" ]; then
    cp -r "$SCRIPT_DIR/memory/"* "$MEMORY_DIR/"
    echo "  [✓] Copied global memory policies to $MEMORY_DIR"
fi

# 6. Full Shell & Dotfiles Setup (when run with --full)
if [ "$FULL_SETUP" = true ]; then
    echo "[6/6] Configuring Zsh shell & plugins..."
    if [ -f "$SCRIPT_DIR/dotfiles/.zshrc" ]; then
        [ -f "$HOME/.zshrc" ] && cp "$HOME/.zshrc" "$HOME/.zshrc.bak_$(date +%s)"
        cp "$SCRIPT_DIR/dotfiles/.zshrc" "$HOME/.zshrc"
        echo "  [✓] Deployed optimized .zshrc"
    fi

    mkdir -p "$HOME/.zsh"
    if [ ! -d "$HOME/.zsh/zsh-autosuggestions" ]; then
        git clone https://github.com/zsh-users/zsh-autosuggestions "$HOME/.zsh/zsh-autosuggestions" --depth 1
    fi
    if [ ! -d "$HOME/.zsh/zsh-syntax-highlighting" ]; then
        git clone https://github.com/zsh-users/zsh-syntax-highlighting "$HOME/.zsh/zsh-syntax-highlighting" --depth 1
    fi
    echo "  [✓] Shell plugins ready."
else
    echo "[6/6] Note: Shell dotfiles (.zshrc) skipped. Run './install.sh --full' to apply."
fi

echo "=================================================="
echo " [✓] AntiGem Unified Rust Setup Complete!"
echo "=================================================="
