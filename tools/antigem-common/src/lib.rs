use std::fs;
use std::path::{Path, PathBuf};

/// Directories skipped by all AntiGem Rust tools during recursive scans.
pub const SKIP_DIRS: &[&str] = &[
    ".git",
    ".cache",
    "node_modules",
    "target",
    "__pycache__",
    "dist",
    "build",
    ".venv",
    "venv",
    ".next",
    ".system_generated",
];

/// Read a file into a UTF-8 String lossily so weird encodings never crash a tool.
pub fn read_lossy(path: &Path) -> Result<String, std::io::Error> {
    let bytes = fs::read(path)?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

/// Recursively collect files matching `allowed_exts` (empty = all files), skipping `SKIP_DIRS`.
pub fn collect_files(dir: &Path, allowed_exts: &[&str], out: &mut Vec<PathBuf>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    let mut paths: Vec<PathBuf> = entries.filter_map(|e| e.ok().map(|x| x.path())).collect();
    paths.sort();

    for p in paths {
        if p.is_dir() {
            if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                if SKIP_DIRS.contains(&name) || name.starts_with('.') {
                    continue;
                }
            }
            collect_files(&p, allowed_exts, out);
        } else if p.is_file() {
            if allowed_exts.is_empty() {
                out.push(p);
                continue;
            }
            if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                let lower = ext.to_lowercase();
                if allowed_exts.iter().any(|&a| a == lower) {
                    out.push(p);
                }
            }
        }
    }
}

/// Truncate a string safely by char count, appending "..." if shortened.
pub fn truncate_str(s: &str, max_chars: usize) -> String {
    let trimmed = s.trim();
    if trimmed.chars().count() <= max_chars {
        return trimmed.to_string();
    }
    let mut out: String = trimmed.chars().take(max_chars.saturating_sub(3)).collect();
    out.push_str("...");
    out
}

/// Fast 64-bit FNV-1a hash for byte slices (zero dependencies).
pub fn fnv1a_64(data: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for &b in data {
        hash ^= b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_truncate_str() {
        assert_eq!(truncate_str("  hello  ", 10), "hello");
        assert_eq!(truncate_str("abcdefghij", 7), "abcd...");
    }

    #[test]
    fn test_fnv1a_deterministic() {
        assert_eq!(fnv1a_64(b"antigem"), fnv1a_64(b"antigem"));
        assert_ne!(fnv1a_64(b"antigem"), fnv1a_64(b"rust"));
    }
}
