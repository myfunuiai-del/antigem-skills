# Search & Inspection Tools Policy

The environment has Rust and modern Rust-based CLI tools installed:
- **`ripgrep` (`rg`)**: Blazing-fast regex/text/code search tool.
- **`fd`**: Blazing-fast file and directory name search tool.
- **`rustc` & `cargo`**: Modern Rust toolchain.

### Usage Guidelines for Agents:
1. **Prefer `rg` and `fd`**: For large codebases and project directory scanning, use `rg` and `fd` directly instead of traditional `grep` and `find` to save tokens and avoid slow scans.
2. **Standard Compatibility**: Do NOT globally alias or override system `grep` and `find` binaries in PATH, to avoid breaking legacy shell scripts and strict POSIX flag usage.
3. **Respect `.gitignore`**: `rg` and `fd` automatically ignore files in `.gitignore`. If git-ignored or hidden files need to be searched:
   - Use `rg -u` (or `rg -uu` for hidden files).
   - Use `fd -I` (or `fd -u` for hidden files).
   - Or use the agent's built-in `read_file` tool directly with the target file path.
