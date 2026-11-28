#!/usr/bin/env python3
"""
Edge-TTS IPv4 Helper for Termux/Android

Forces IPv4 (socket.AF_INET) in aiohttp so edge-tts connects reliably to
speech.platform.bing.com without mobile IPv6 ConnectionResetError [Errno 104].

Usage:
  python3 tts-edge.py --text "হ্যালো বন্ধুরা!" --out voice.mp3 [--voice bn-BD-NabanitaNeural] [--rate +0%] [--pitch +0Hz]
"""
import argparse
import asyncio
import json
import os
import socket
import subprocess
import sys

import aiohttp
import edge_tts

# Force IPv4 on Termux/mobile networks where Bing WSS IPv6 resets connections
_orig_tcp_init = aiohttp.TCPConnector.__init__


def _ipv4_tcp_init(self, *args, **kwargs):
    kwargs.setdefault("family", socket.AF_INET)
    return _orig_tcp_init(self, *args, **kwargs)


aiohttp.TCPConnector.__init__ = _ipv4_tcp_init


async def synthesize(text: str, out_path: str, voice: str, rate: str, pitch: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    comm = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
    await comm.save(out_path)


def probe_duration(path: str):
    try:
        out = subprocess.check_output(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            text=True,
        ).strip()
        return round(float(out), 3)
    except Exception:
        return None


def main():
    p = argparse.ArgumentParser(description="Termux IPv4-safe Edge-TTS voice generator")
    p.add_argument("--text", required=True, help="Text to synthesize")
    p.add_argument("--out", required=True, help="Output audio path (.mp3)")
    p.add_argument("--voice", default="bn-BD-NabanitaNeural", help="Edge TTS voice name")
    p.add_argument("--rate", default="+0%", help="Speaking rate, e.g. +10%% or -5%%")
    p.add_argument("--pitch", default="+0Hz", help="Voice pitch offset, e.g. +2Hz")
    args = p.parse_args()

    asyncio.run(synthesize(args.text, args.out, args.voice, args.rate, args.pitch))
    size_bytes = os.path.getsize(args.out)
    duration = probe_duration(args.out)
    print(json.dumps({
        "ok": True,
        "out": os.path.abspath(args.out),
        "voice": args.voice,
        "duration": duration,
        "sizeBytes": size_bytes,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
