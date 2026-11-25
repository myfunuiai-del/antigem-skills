---
name: fast-browser-automation
description: Low-token, high-speed in-app browser automation using visible-viewport-only JS extraction, browser_find, and browser_batch instead of heavy full-page DOM dumps or screenshots.
---

# Fast Browser Automation Skill

Use this skill whenever automating tasks in the AntiGem built-in browser (`browser_mcp`) to minimize token usage and maximize speed.

---

## STRICT RULES

1. **Visible-Viewport Only (Avoid Full-Page `browser_read_page`):**
   - Full-page `browser_read_page` returns huge DOM trees that waste tokens and slow down responses.
   - Instead, use `browser_find` for a specific target element, OR use `browser_eval_js` to extract **only interactive elements currently visible on screen**:
     ```js
     (() => {
       const els = [...document.querySelectorAll('a,button,input,select,textarea,[role="button"]')];
       return els.filter(el => {
         const r = el.getBoundingClientRect();
         return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
       }).slice(0, 40).map((el, i) => ({
         i, tag: el.tagName, text: (el.innerText || el.placeholder || el.value || '').trim().slice(0, 50),
         id: el.id || undefined, name: el.name || undefined
       }));
     })()
     ```
   - For reading article text, use `browser_get_page_text` instead of `browser_read_page`.

2. **No Screenshots for Text or Buttons:**
   - **NEVER** take `browser_computer(action="screenshot")` just to read text or find buttons.
   - Only take a screenshot for non-text visuals (images, charts, visual layout bugs).

3. **Batch Predictable Actions (`browser_batch`) & Async JS:**
   - Combine multiple predictable steps (click field, type text, press Enter) into a single `browser_batch` call instead of separate turns.
   - For multi-scroll or load-and-extract tasks, use a single `browser_eval_js` (or `browser_batch`) rather than splitting across multiple LLM turns.

4. **Pin `tab_id` & Lock Multi-Step Tasks (`browser_lock`):**
   - Always capture the `tab_id` returned by `browser_open_url` and pass that exact `tab_id` to `browser_lock`, `browser_find`, `browser_eval_js`, and `browser_computer`—so even if the user switches tabs, commands stay pinned to the target tab.
   - Call `browser_lock(locked=true, tab_id=...)` at the start of a multi-step flow and `browser_lock(locked=false)` when finished. If a tab is closed or unlocked unexpectedly, check `browser_list_tabs`.

5. **Public Static Pages → Use `curl` / Python First:**
   - If the task only needs public data/links from a static page without login or JS rendering, fetch it via `curl` or Python in the terminal (~0.5s) instead of opening the browser.
   - *Note:* `browser_eval_js` is **synchronous** (it returns `{}` for `async` Promises), so use `browser_batch` when you need multiple sequential steps.

6. **File Uploads (`browser_upload_file`):**
   - Always fetch a **fresh `ref`** via `browser_find` right before calling `browser_upload_file` (never reuse an old `ref` after the page re-renders, or it will fail with *"The upload element is gone"*).

---

## Exact Parameter Cheat-Sheet (Avoid Schema Errors)

- `browser_open_url`: `{"url": "https://..."}`
- `browser_lock`: `{"locked": true, "tab_id": "..."}` (omit `tab_id` when unlocking all)
- `browser_find`: `{"query": "...", "tab_id": "..."}`
- `browser_eval_js`: `{"script": "...", "tab_id": "..."}` (parameter is `script`, NOT `code`)
- `browser_computer`: `{"action": "left_click"|"type"|"key"|"screenshot", "ref": "ref_1", "text": "Enter", "tab_id": "..."}` (for `key`, use `text: "Enter"`, NOT `key`)
- `browser_batch`: `{"actions": [{"name": "browser_computer", "input": {...}}], "action_summary": "..."}` (parameter is `actions`, NOT `steps`)
- `browser_get_page_text`: `{"tab_id": "..."}`
