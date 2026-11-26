---
name: image-organizer
description: Offline, zero-heat image and screenshot organizer that classifies images into structured categories and subfolders using Android package signatures, timestamp patterns, and fast-scaled OCR keyword detection with a strict zero-deletion guarantee.
---

# Image Organizer Skill

Use this skill whenever asked to organize, categorize, clean up, or archive screenshots and images in Android storage (`/sdcard/DCIM/Screenshots`, `/sdcard/Pictures`, etc.) without overheating the device, draining battery, or deleting any files.

---

## Strict Zero-Deletion Guarantee
- **NO FILES ARE EVER DELETED.**
- Files are only safely moved or copied into structured archive subdirectories.
- Name collisions are handled by unique timestamp renaming, never by overwriting.

---

## Automatic Dependency Management
When executed with OCR support, the tool automatically verifies:
- `tesseract` (OCR Engine)
- `python-pillow` (Image Processing)

If either dependency is missing in Termux, the tool automatically prompts and offers one-click automatic installation (`pkg install -y ...`). Users can also run with `--no-ocr` to skip OCR dependencies.

---

## Architecture & Principles

1. **Tag & Signature First:**
   - Detects Android package identifiers (`com.facebook.katana`, `com.termux`, `com.whatsapp`, etc.) embedded in screenshot filenames.
   - Moves them directly to corresponding application folders with zero CPU overhead.

2. **Zero-Heat Scaled Offline OCR:**
   - For images without explicit app signatures, images are downscaled $3\times$ to minimize memory and CPU load.
   - Run via `tesseract --psm 11` (sparse text detection).
   - Enforces a 1.0s cooling sleep every 25 images to keep mobile processors strictly cool.

3. **Subfolder Taxonomy:**
   - **`Social_Media/`**: `Facebook/`, `Instagram_Threads/`, `TikTok/`, `Messenger/`
   - **`Tech_Dev/`**: `Termux/`, `Remote_VNC_TeamViewer/`, `Dev_Tools_LLM/`
   - **`Browsing_Search/`**: `Chrome/`, `Google_Search/`
   - **`Entertainment_Games/`**: `YouTube/`, `Games/`, `Media_Streaming/`
   - **`Shopping_Services/`**: `Daraz/`, `Bikroy/`, `Uber/`
   - **`Messaging/`**: `WhatsApp/`, `Discord/`
   - **`Banking_Payment/`**: `bKash/`, `Banks/` (flagged sensitive)
   - **`Old_Archive/`**: Subdivided by content topic (`Social_and_Chat`, `ECommerce_and_BuySell`, `Tech_Code_Settings`, `Documents_and_Text`, `Uncategorized_Old`)

---

## CLI Usage

Script location:
`~/.gemini/config/skills/image-organizer/scripts/organize.py`

```bash
# Standard run (checks dependencies, prompts install if missing):
python3 ~/.gemini/config/skills/image-organizer/scripts/organize.py /sdcard/DCIM/Screenshots -t /sdcard/Pictures/Screenshots_Archive

# Copy mode (keeps original directory intact):
python3 ~/.gemini/config/skills/image-organizer/scripts/organize.py /sdcard/DCIM/Screenshots -t /sdcard/Pictures/Screenshots_Archive --copy

# Ultra-fast mode without OCR dependencies:
python3 ~/.gemini/config/skills/image-organizer/scripts/organize.py /sdcard/DCIM/Screenshots -t /sdcard/Pictures/Screenshots_Archive --no-ocr
```
