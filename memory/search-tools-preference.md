# Search, Inspection & Unified Rust Core Policy

The environment has a unified Rust Core (`~/antigem-skills/tools/` Cargo Workspace) and modern Rust-based CLI tools installed:
- **`ripgrep` (`rg`)**: Blazing-fast regex/text/code search tool.
- **`fd`**: Blazing-fast file and directory name search tool.
- **`jql`**: Fast JSON query and filtering tool.
- **`dust`**: Fast visual disk usage analyzer.
- **`bat`**: Syntax-highlighted file viewer with line numbers.
- **`procs`**: Modern, detailed process and memory viewer.
- **`watchexec`**: On-demand file watcher (never leave idle background daemons running).
- **`ctx-squeeze`**: Shared-core structural code outline extractor.
- **`mem-search`**: Shared-core keyword/relevance scorer for `~/.antigem/memory/` and history files.
- **`ui-filter`**: Android `uiautomator` XML filter for `fast-android-automation` (`[TAP]/[LBL] (x,y) | label`).
- **`srt-clean`**: Fast `.srt`/`.vtt`/Whisper transcript cleaner for `video-analyzer-tool` and `rea-video`.
- **`img-scan`**: Read-only parallel image/screenshot & exact-duplicate scanner for `image-organizer`.
- **`router-stats`**: Read-only log & usage summary analyzer for `claude-router`.
- **`rustc` & `cargo`**: Mandatory Rust toolchain.

### Usage Guidelines for Agents:
1. **Prefer Rust CLI Tools**: Use these tools directly for speed and low token overhead.
2. **Standard Compatibility**: Do NOT globally alias or override system `grep`, `find`, `cat`, `du`, `ps`, or `jq` binaries in PATH.
3. **Respect `.gitignore`**: `rg` and `fd` automatically ignore files in `.gitignore`. Use `rg -u`/`rg -uu`, `fd -I`/`fd -u`, or `read_file` when git-ignored or hidden files are needed.
