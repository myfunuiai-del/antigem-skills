#!/data/user/0/ai.antigem/files/usr/bin/bash
set -e

echo "=== Installing Dependencies for AntiGem Skills ==="

# 1. Install required system packages
if command -v pkg >/dev/null 2>&1; then
    echo "[*] Updating and installing Termux packages: python, ffmpeg, yt-dlp, quickjs-ng..."
    pkg update -y || true
    pkg install -y python ffmpeg yt-dlp quickjs-ng
elif command -v apt-get >/dev/null 2>&1; then
    echo "[*] Installing Linux packages via apt..."
    sudo apt-get update -y || true
    sudo apt-get install -y python3 ffmpeg yt-dlp quickjs
fi

# 2. Setup skills into AntiGem or Claude if present
ANTIGEM_DIR="$HOME/.gemini/config/skills"
CLAUDE_DIR="$HOME/.claude/skills"

if [ -d "$HOME/.gemini" ]; then
    echo "[*] Deploying skills to AntiGem config ($ANTIGEM_DIR)..."
    mkdir -p "$ANTIGEM_DIR"
    cp -r skills/* "$ANTIGEM_DIR/"
fi

if [ -d "$HOME/.claude" ]; then
    echo "[*] Deploying skills to Claude Code config ($CLAUDE_DIR)..."
    mkdir -p "$CLAUDE_DIR"
    cp -r skills/* "$CLAUDE_DIR/"
fi

echo "=== Installation & Setup Complete! ==="
