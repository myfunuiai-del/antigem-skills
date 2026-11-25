"""Orchestrator: SVG file → styled SVG via canvas.py.

Usage:
    python draw.py <svg_file> <output_svg>

All style (fills, wobble, grain) is applied by canvas.py as SVG markup — no
rasterization. The input SVG defines what to draw; canvas.py defines how it
looks, and the output is SVG too.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from canvas import svg_to_svg


def draw(svg_string: str, output_path: str) -> str:
    """SVG string → styled scribble art SVG. Returns output_path."""
    return svg_to_svg(svg_string, output_path)


def main():
    parser = argparse.ArgumentParser(
        prog="draw",
        description="SVG → styled scribble art SVG (fills + wobble + grain applied automatically).",
    )
    parser.add_argument("svg_file", help="Input SVG file path")
    parser.add_argument("output", help="Output SVG path")
    args = parser.parse_args()
    with open(args.svg_file, "r", encoding="utf-8") as f:
        svg_string = f.read()
    result = draw(svg_string, args.output)
    print(f"[draw] output: {result}")


if __name__ == "__main__":
    main()
