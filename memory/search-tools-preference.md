# Search, Inspection & Rust CLI Tools Policy

The environment has Rust and modern Rust-based CLI tools installed:
- **`ripgrep` (`rg`)**: Blazing-fast regex/text/code search tool.
- **`fd`**: Blazing-fast file and directory name search tool.
- **`jql`**: Fast JSON query and filtering tool.
- **`dust`**: Fast visual disk usage analyzer.
- **`bat`**: Syntax-highlighted file viewer with line numbers.
- **`procs`**: Modern, detailed process and memory viewer.
- **`watchexec`**: On-demand file watcher for running tests/builds on file changes (use on-demand only; never leave idle background daemons running to save battery).
- **`ctx-squeeze`**: Custom Pure-Rust structural code outline extractor (prints imports, functions, structs, classes with line numbers to save tokens).
- **`mem-search`**: Custom Pure-Rust keyword/relevance scorer for `~/.antigem/memory/` and history files.
- **`rustc` & `cargo`**: Modern Rust toolchain.

### Usage Guidelines for Agents:
1. **Prefer Rust CLI Tools**: Use `rg`, `fd`, `jql`, `dust`, `bat`, `procs`, `ctx-squeeze`, and `mem-search` directly for speed and low token overhead.
2. **Standard Compatibility**: Do NOT globally alias or override system `grep`, `find`, `cat`, `du`, `ps`, or `jq` binaries in PATH, so legacy scripts and strict POSIX flags never break.
3. **Respect `.gitignore`**: `rg` and `fd` automatically ignore files in `.gitignore`. If git-ignored or hidden files need to be searched, use `rg -u`/`rg -uu`, `fd -I`/`fd -u`, or the built-in `read_file` tool directly.
