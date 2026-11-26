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
echo "   AntiGem Skills & Environment Installer        "
echo "=================================================="

# Function to prompt user confirmation before installing packages
confirm_and_install() {
    local pm="$1"
    shift
    local pkgs=("$@")

    echo ""
    echo "The following system packages are required:"
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
                echo "[!] Package installation skipped by user."
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

# 1. Install System Packages (Interactive Confirmation)
echo "[1/5] Checking required system packages..."
CORE_PKGS="python python-pillow tesseract ffmpeg yt-dlp quickjs-ng git zsh rust ripgrep fd jql dust bat procs watchexec"
APT_PKGS="python3 ffmpeg yt-dlp quickjs git zsh rustc cargo ripgrep fd-find jq dust bat procs watchexec"

if command -v pkg >/dev/null 2>&1; then
    confirm_and_install "pkg" $CORE_PKGS
elif command -v apt-get >/dev/null 2>&1; then
    confirm_and_install "apt" $APT_PKGS
fi

# 2. Deploy Custom Binaries (fast-touch, auto-cut, etc.)
echo "[2/5] Installing custom Termux binaries to PREFIX/bin..."
BIN_TARGET="${PREFIX:-/data/user/0/ai.antigem/files/usr}/bin"
mkdir -p "$BIN_TARGET"

if [ -d "$SCRIPT_DIR/bin" ]; then
    cp -r "$SCRIPT_DIR/bin/"* "$BIN_TARGET/"
    chmod +x "$BIN_TARGET/fast-touch" 2>/dev/null || true
    chmod +x "$BIN_TARGET/auto-cut" 2>/dev/null || true
    echo "  [✓] Installed custom binaries to $BIN_TARGET"
fi

# 3. Deploy Skills to AntiGem and Claude
echo "[3/5] Deploying Skills to Agent directories..."
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

# 4. Deploy Global Agent Memory Rules
echo "[4/5] Syncing Global Agent Memories..."
MEMORY_DIR="$HOME/.antigem/memory/global"
mkdir -p "$MEMORY_DIR"
if [ -d "$SCRIPT_DIR/memory" ]; then
    cp -r "$SCRIPT_DIR/memory/"* "$MEMORY_DIR/"
    echo "  [✓] Copied global memory policies to $MEMORY_DIR"
fi

# 5. Full Shell & Dotfiles Setup (when run with --full)
if [ "$FULL_SETUP" = true ]; then
    echo "[5/5] Configuring blazing-fast Zsh shell & plugins..."
    if [ -f "$SCRIPT_DIR/dotfiles/.zshrc" ]; then
        # Backup existing .zshrc if exists
        [ -f "$HOME/.zshrc" ] && cp "$HOME/.zshrc" "$HOME/.zshrc.bak_$(date +%s)"
        cp "$SCRIPT_DIR/dotfiles/.zshrc" "$HOME/.zshrc"
        echo "  [✓] Deployed optimized .zshrc"
    fi

    # Clone plugins if missing
    mkdir -p "$HOME/.zsh"
    if [ ! -d "$HOME/.zsh/zsh-autosuggestions" ]; then
        echo "  [*] Cloning zsh-autosuggestions..."
        git clone https://github.com/zsh-users/zsh-autosuggestions "$HOME/.zsh/zsh-autosuggestions" --depth 1
    fi
    if [ ! -d "$HOME/.zsh/zsh-syntax-highlighting" ]; then
        echo "  [*] Cloning zsh-syntax-highlighting..."
        git clone https://github.com/zsh-users/zsh-syntax-highlighting "$HOME/.zsh/zsh-syntax-highlighting" --depth 1
    fi
    echo "  [✓] Shell plugins ready."
else
    echo "[5/5] Note: Shell dotfiles (.zshrc) skipped. To apply full shell setup, run:"
    echo "      ./install.sh --full"
fi

echo "=================================================="
echo " [✓] AntiGem Environment Setup Complete!"
echo "=================================================="
