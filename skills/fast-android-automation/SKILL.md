---
name: fast-android-automation
description: High-speed Android UI automation using batched ADB/Shizuku/root shell commands, direct Intents, and minimal UI tree scans to avoid slow turn-by-turn Accessibility lag.
---

# Fast Android Automation Skill

Use this skill whenever automating tasks on the Android device to achieve **5x–10x faster execution** than standard step-by-step Accessibility (`android_tap` / `android_screenshot`) calls.

---

## STRICT RULES (NON-NEGOTIABLE)

> **NEVER use `fast-touch shot` or `android_screenshot` to read text, chats, notifications, menus, or lists.**  
> **ALWAYS use `android_get_ui_tree` (or `rish -c 'uiautomator dump /dev/tty'`) to read screen text.**  
> Screenshots are **FORBIDDEN** unless the screen contains non-text visuals (e.g., images, charts, games) that cannot be read from the UI tree.

## Core Speed Rules

1. **Use `fast-touch` CLI for Zero-Latency Operations:**
   - A dedicated utility `/data/user/0/ai.antigem/files/usr/bin/fast-touch` is installed to handle Shizuku execution seamlessly.
   - **Launch App cleanly:** `fast-touch launch com.facebook.katana`
   - **Scroll / Swipe smoothly:** `fast-touch scroll_down` or `fast-touch swipe 500 1600 500 400 250`
   - **Instant Screenshot (Direct Pipe, No Permission Error):** `fast-touch shot -o <path>`
   - **Batch Chaining:** `rish -c 'input tap 500 1000 && sleep 0.3 && input text "search"'`

2. **Fix Screenshot Permissions (Never write to app internal data via rish):**
   - Shizuku runs as `shell (uid=2000)` and cannot write directly to `/data/user/0/ai.antigem/...` (triggers `Permission denied`).
   - Always pipe directly via stdout: `rish -c 'screencap -p' > /path/to/shot.png` (which `fast-touch shot` does automatically).

3. **Avoid Triggering Control Center / Notification Shade:**
   - On Xiaomi/HyperOS/modern Android, swiping from `y < 300` drags down the Control Center.
   - Always swipe from safe middle coordinates: `y1=1600` to `y2=500` or `y2=400`.

4. **Clean Launch Intent & Silent App Lock Wait:**
   - Never rely on static activity names like `.LoginActivity` which might get rejected.
   - Use `fast-touch launch <package>` which uses dynamic launcher resolution (`cmd package resolve-activity --brief <pkg>`).
   - **Silent Unlock Wait:** If an App Lock / Biometric / PIN screen is detected, `fast-touch launch` **waits silently** (polling every 1s up to 60s) without sending any prompt or message. As soon as the user unlocks it, execution continues automatically.

5. **Keep Screen Awake & Signal-Safe Cleanup:**
   - `fast-touch` automatically keeps the screen awake (`svc power stayon true`), turns on **Show Taps** (`show_touches 1`) pointer animation, and posts an **Auto Mode** notification while running.
   - A built-in `AutoSession` (`try...finally` + `SIGINT`/`SIGTERM` handler) guarantees `svc power stayon false`, `show_touches` restoration, and notification cleanup even if interrupted midway.
   - Pass `--no-pointer` or `--no-notif` if you want to disable them for a specific call.

6. **Minimize Screenshots:**
   - Avoid `fast-touch shot` / `android_screenshot` whenever possible. Prefer `android_get_ui_tree` or direct `fast-touch` actions (`tap`, `swipe`, `batch`). Only take a screenshot when visual inspection is strictly necessary.

7. **Return to AntiGem After Task:**
   - Once an external app automation task finishes (e.g., checking info or completing an action), return to AntiGem (`fast-touch launch ai.antigem`).
   - **Exception:** If the user explicitly asked to leave something open inside the target app, stay in that app.
