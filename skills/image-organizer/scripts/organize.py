#!/usr/bin/env python3
"""
Zero-Heat Offline Image & Screenshot Organizer
Zero-Deletion Policy: Files are NEVER deleted. They are safely routed or archived.
Auto-checks and prompts/installs required dependencies (tesseract, python-pillow).
"""

import os
import sys
import shutil
import argparse
import subprocess
import time

def check_and_prompt_dependencies():
    """Check if tesseract and pillow are installed. Prompt user or install if in Termux."""
    missing = []
    
    # Check Tesseract binary
    tess_path = shutil.which("tesseract")
    if not tess_path:
        missing.append("tesseract")

    # Check Pillow
    try:
        import PIL
        from PIL import Image
    except ImportError:
        missing.append("python-pillow")

    if missing:
        print("\n=======================================================")
        print(" [!] Missing Required Dependencies for OCR / Organizing:")
        for m in missing:
            print(f"     • {m}")
        print("=======================================================")
        
        # Check if in Termux/AntiGem environment
        has_pkg = shutil.which("pkg") is not None
        if has_pkg:
            try:
                reply = input(" [?] Would you like to automatically install them via pkg now? [y/N]: ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                reply = "n"

            if reply in ["y", "yes"]:
                print(f" [*] Running: pkg install -y {' '.join(missing)} ...")
                res = subprocess.run(["pkg", "install", "-y"] + missing)
                if res.returncode == 0:
                    print(" [✓] Successfully installed dependencies!\n")
                    return True
                else:
                    print(" [X] Installation failed. Please install manually: pkg install " + " ".join(missing))
                    sys.exit(1)
            else:
                print(" [*] Skipping OCR dependencies. Please run manually: pkg install " + " ".join(missing))
                print(" [*] Tip: You can run with '--no-ocr' to organize without OCR.")
                return False
        else:
            print(" [*] Please install the dependencies manually using your package manager:")
            print("     e.g., sudo apt install tesseract-ocr python3-pil")
            return False
    return True

# Mapping of known app tags in filename
APP_TAG_MAP = {
    # Social Media
    'facebook': ('Social_Media', 'Facebook'),
    'katana': ('Social_Media', 'Facebook'),
    'instagram': ('Social_Media', 'Instagram_Threads'),
    'barcelona': ('Social_Media', 'Instagram_Threads'),
    'musically': ('Social_Media', 'TikTok'),
    'tiktok': ('Social_Media', 'TikTok'),
    'orca': ('Social_Media', 'Messenger'),

    # Browsing & Search
    'chrome': ('Browsing_Search', 'Chrome'),
    'googlequicksearchbox': ('Browsing_Search', 'Google_Search'),

    # Dev & Tech
    'termux': ('Tech_Dev', 'Termux'),
    'realvnc': ('Tech_Dev', 'Remote_VNC_TeamViewer'),
    'vnc': ('Tech_Dev', 'Remote_VNC_TeamViewer'),
    'teamviewer': ('Tech_Dev', 'Remote_VNC_TeamViewer'),
    'devcheck': ('Tech_Dev', 'Dev_Tools_LLM'),
    'jarves': ('Tech_Dev', 'Dev_Tools_LLM'),
    'llm.server': ('Tech_Dev', 'Dev_Tools_LLM'),
    'onellm': ('Tech_Dev', 'Dev_Tools_LLM'),
    'everlasting': ('Tech_Dev', 'Dev_Tools_LLM'),

    # Messaging
    'whatsapp': ('Messaging', 'WhatsApp'),
    'discord': ('Messaging', 'Discord'),

    # Shopping
    'daraz': ('Shopping_Services', 'Daraz'),
    'bikroy': ('Shopping_Services', 'Bikroy'),
    'ubercab': ('Shopping_Services', 'Uber'),

    # Entertainment & Games
    'youtube': ('Entertainment_Games', 'YouTube'),
    'tencent': ('Entertainment_Games', 'Games'),
    'netease': ('Entertainment_Games', 'Games'),
    'yysls': ('Entertainment_Games', 'Games'),
    'puzzlemate': ('Entertainment_Games', 'Games'),
    'banglamotion': ('Entertainment_Games', 'Media_Streaming'),

    # Banking / Sensitive
    'bkash': ('Banking_Payment', 'bKash'),
    'cbbl': ('Banking_Payment', 'Banks'),
    'cibl': ('Banking_Payment', 'Banks')
}

OCR_TOPIC_KEYWORDS = {
    'ID_and_Identity': ['national id', 'nid', 'date of birth', 'id no', 'passport', 'driving licence', 'driving license', 'birth certificate', 'student id', 'government of the people', 'জাতীয় পরিচয়পত্র', 'জন্ম নিবন্ধন', 'পাসপোর্ট', 'পরিচয়পত্র'],
    'Banking_and_Payment': ['bkash', 'nagad', 'rocket', 'upay', 'bank', 'balance', 'transaction', 'payment', 'sent money', 'cash out', 'trxid', 'বিকাশ', 'নগদ', 'রকেট', 'টাকা', 'পেমেন্ট', 'লেনদেন', 'ব্যালেন্স'],
    'Bills_and_Invoices': ['invoice', 'receipt', 'bill', 'electricity', 'desco', 'dpdc', 'nesco', 'wasa', 'gas', 'subtotal', 'vat', 'paid', 'বিল', 'রসিদ', 'ভাউচার'],
    'Education_and_Certificates': ['certificate', 'result', 'gpa', 'cgpa', 'admit card', 'marksheet', 'transcript', 'exam', 'university', 'college', 'সার্টিফিকেট', 'ফলাফল', 'পরীক্ষা', 'অ্যাডমিট'],
    'Social_and_Chat': ['facebook', 'whatsapp', 'messenger', 'friend', 'profile', 'reply', 'comment', 'share', 'status', 'chat', 'message', 'inbox', 'লাইক', 'কমেন্ট', 'শেয়ার', 'ফলো', 'ইনবক্স', 'পোস্ট', 'বন্ধু'],
    'ECommerce_and_BuySell': ['marketplace', 'price', 'tk', 'bdt', 'taka', 'dam', 'daraz', 'bikroy', 'order', 'delivery', 'sell', 'discount', 'cart', 'buy', 'অর্ডার', 'দাম', 'ডেলিভারি', 'মূল্য', 'ডিসকাউন্ট', 'শপ', 'কিনুন'],
    'Tech_Code_Settings': ['termux', 'error', 'system', 'root', 'github', 'settings', 'storage', 'wifi', 'battery', 'device', 'android', 'ip', 'port', 'terminal', 'rust', 'cargo', 'python', 'কোড', 'সার্ভার', 'সেটিংস'],
    'Media_and_Entertainment': ['youtube', 'video', 'music', 'song', 'episode', 'game', 'play', 'stream', 'movie', 'ভিডিও', 'গান', 'মুভি', 'গেম'],
    'Documents_and_Text': ['document', 'pdf', 'notice', 'form', 'account', 'application', 'ফর্ম', 'ডকুমেন্ট', 'আবেদন']
}

def get_tesseract_lang():
    try:
        res = subprocess.run(['tesseract', '--list-langs'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        langs = res.stdout.lower()
        if 'ben' in langs:
            return 'eng+ben'
    except Exception:
        pass
    return 'eng'

def find_duplicates_via_rust(src_dirs):
    """Use Rust img-scan to detect exact duplicates fast (Zero-Deletion)."""
    dup_files = set()
    if not shutil.which('img-scan'):
        return dup_files
    for d in src_dirs:
        if not os.path.isdir(d):
            continue
        try:
            res = subprocess.run(['img-scan', d, '--dups-only'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            in_group = False
            kept_first = False
            for line in res.stdout.splitlines():
                s = line.strip()
                if s.startswith('[Group '):
                    in_group = True
                    kept_first = False
                elif in_group and s:
                    if not kept_first:
                        kept_first = True
                    else:
                        dup_files.add(os.path.abspath(s))
        except Exception:
            pass
    return dup_files

def scan_text_fast_ocr(img_path, tmp_path, lang='eng'):
    try:
        from PIL import Image
        with Image.open(img_path) as im:
            w, h = im.size
            # 3x downscale for high speed & zero processor heat
            im_small = im.resize((max(1, w // 3), max(1, h // 3)), Image.Resampling.BILINEAR)
            im_small.save(tmp_path)
        
        proc = subprocess.run(
            ['tesseract', tmp_path, 'stdout', '-l', lang, '--psm', '11'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return proc.stdout.lower()
    except Exception:
        return ""

def organize(src_dirs, target_dir, use_ocr=True, copy_mode=False, old_year_threshold=2026):
    os.makedirs(target_dir, exist_ok=True)
    tmp_ocr_path = f"/data/user/0/ai.antigem/files/usr/tmp/img_org_tmp_{os.getpid()}.png"

    all_files = []
    for d in src_dirs:
        if os.path.exists(d):
            for root, _, files in os.walk(d):
                for f in files:
                    ext = os.path.splitext(f)[1].lower()
                    if ext in ['.jpg', '.jpeg', '.png', '.webp']:
                        all_files.append(os.path.join(root, f))

    print(f"[*] Found {len(all_files)} images to organize.")
    print("    [Policy: Zero-Deletion active. No files will be permanently deleted.]")
    ocr_lang = get_tesseract_lang() if use_ocr else 'eng'
    if use_ocr:
        print(f"    [OCR Language: {ocr_lang}]")
    dup_files = find_duplicates_via_rust(src_dirs)
    if dup_files:
        print(f"    [Rust img-scan: {len(dup_files)} exact duplicate(s) routed to Duplicates_Review/]")
    stats = {}
    ocr_processed = 0

    for idx, fpath in enumerate(all_files):
        fname = os.path.basename(fpath).lower()
        matched = False
        cat, subcat = None, None

        # 0. Route exact duplicates detected by Rust img-scan
        if os.path.abspath(fpath) in dup_files:
            cat, subcat = "Duplicates_Review", "Exact_Duplicates"
            matched = True

        # 1. Check known Android package tag
        if not matched:
            for key, target in APP_TAG_MAP.items():
                if key in fname:
                    cat, subcat = target
                    matched = True
                    break

        # 2. Check year timestamps (e.g. screenshot_2025...)
        if not matched:
            for y in range(2020, old_year_threshold):
                if f"screenshot_{y}" in fname:
                    cat = "Old_Archive"
                    if use_ocr:
                        txt = scan_text_fast_ocr(fpath, tmp_ocr_path, ocr_lang)
                        ocr_processed += 1
                        best_score, best_cat = 0, "Uncategorized_Old"
                        for topic, kws in OCR_TOPIC_KEYWORDS.items():
                            score = sum(1 for kw in kws if kw in txt)
                            if score > best_score:
                                best_score = score
                                best_cat = topic
                        subcat = best_cat
                        if ocr_processed % 25 == 0:
                            time.sleep(1.0)
                    else:
                        subcat = f"Year_{y}"
                    matched = True
                    break

        # 3. Content detection via OCR or Uncategorized
        if not matched:
            if use_ocr:
                txt = scan_text_fast_ocr(fpath, tmp_ocr_path, ocr_lang)
                ocr_processed += 1
                best_score, best_cat = 0, None
                for topic, kws in OCR_TOPIC_KEYWORDS.items():
                    score = sum(1 for kw in kws if kw in txt)
                    if score > best_score:
                        best_score = score
                        best_cat = topic
                if best_cat and best_score > 0:
                    cat, subcat = "Content_Detected", best_cat
                else:
                    cat, subcat = "Uncategorized", "General"
                if ocr_processed % 25 == 0:
                    time.sleep(1.0)
            else:
                cat, subcat = "Uncategorized", "General"

        dest_dir = os.path.join(target_dir, cat, subcat)
        os.makedirs(dest_dir, exist_ok=True)
        dest_file = os.path.join(dest_dir, os.path.basename(fpath))

        # Safe collision handling (Never overwrite or delete)
        if os.path.exists(dest_file) and os.path.abspath(fpath) != os.path.abspath(dest_file):
            base_n, ext_n = os.path.splitext(os.path.basename(fpath))
            dest_file = os.path.join(dest_dir, f"{base_n}_{int(time.time()*1000)%10000}{ext_n}")

        if copy_mode:
            shutil.copy2(fpath, dest_file)
        else:
            shutil.move(fpath, dest_file)

        route = f"{cat}/{subcat}"
        stats[route] = stats.get(route, 0) + 1

    if os.path.exists(tmp_ocr_path):
        os.remove(tmp_ocr_path)

    print(f"\n[✓] Organization Complete! Total processed: {len(all_files)}")
    print("    [Zero files deleted. All files safely archived.]")
    for r, count in sorted(stats.items()):
        print(f"  • {r}: {count} files")

def main():
    parser = argparse.ArgumentParser(description="Zero-Heat Offline Image Organizer with Zero-Deletion Guarantee")
    parser.add_argument("src", nargs="+", help="Source folder(s) to scan")
    parser.add_argument("-t", "--target", default="/sdcard/Pictures/Organized_Images", help="Target base folder")
    parser.add_argument("--no-ocr", action="store_true", help="Disable OCR scanning (fastest)")
    parser.add_argument("--copy", action="store_true", help="Copy instead of move")
    parser.add_argument("--old-year", type=int, default=2026, help="Years below this considered old archive")
    
    args = parser.parse_args()

    use_ocr = not args.no_ocr
    if use_ocr:
        has_deps = check_and_prompt_dependencies()
        if not has_deps:
            use_ocr = False

    organize(args.src, args.target, use_ocr=use_ocr, copy_mode=args.copy, old_year_threshold=args.old_year)

if __name__ == "__main__":
    main()
