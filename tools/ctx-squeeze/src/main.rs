use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process;

const SKIP_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "__pycache__",
    "dist",
    "build",
    ".venv",
    "venv",
    ".next",
];

fn is_supported_ext(path: &Path, filter_exts: &[String]) -> bool {
    let ext = match path.extension().and_then(|e| e.to_str()) {
        Some(e) => e.to_lowercase(),
        None => return false,
    };
    if !filter_exts.is_empty() {
        return filter_exts.iter().any(|f| f == &ext);
    }
    matches!(
        ext.as_str(),
        "rs" | "py" | "js" | "jsx" | "ts" | "tsx" | "go" | "sh" | "bash" | "zsh" | "c" | "cpp"
            | "h" | "hpp" | "java" | "kt"
    )
}

fn is_structural_line(trimmed: &str, ext: &str) -> bool {
    if trimmed.is_empty() || trimmed.len() > 240 {
        return false;
    }

    // Universal structural prefixes
    if trimmed.starts_with("///")
        || trimmed.starts_with("//!")
        || trimmed.starts_with("/**")
        || trimmed.starts_with("// ===")
        || trimmed.starts_with("# ===")
    {
        return true;
    }

    match ext {
        "rs" => {
            trimmed.starts_with("use ")
                || trimmed.starts_with("pub use ")
                || trimmed.starts_with("mod ")
                || trimmed.starts_with("pub mod ")
                || trimmed.starts_with("fn ")
                || trimmed.starts_with("pub fn ")
                || trimmed.starts_with("async fn ")
                || trimmed.starts_with("pub async fn ")
                || trimmed.starts_with("pub(crate) fn ")
                || trimmed.starts_with("struct ")
                || trimmed.starts_with("pub struct ")
                || trimmed.starts_with("enum ")
                || trimmed.starts_with("pub enum ")
                || trimmed.starts_with("trait ")
                || trimmed.starts_with("pub trait ")
                || trimmed.starts_with("impl ")
                || trimmed.starts_with("impl<")
                || trimmed.starts_with("type ")
                || trimmed.starts_with("pub type ")
                || trimmed.starts_with("const ")
                || trimmed.starts_with("pub const ")
                || trimmed.starts_with("#[")
        }
        "py" => {
            trimmed.starts_with("import ")
                || trimmed.starts_with("from ")
                || trimmed.starts_with("def ")
                || trimmed.starts_with("async def ")
                || trimmed.starts_with("class ")
                || trimmed.starts_with("@")
        }
        "js" | "jsx" | "ts" | "tsx" => {
            trimmed.starts_with("import ")
                || trimmed.starts_with("export ")
                || trimmed.starts_with("function ")
                || trimmed.starts_with("async function ")
                || trimmed.starts_with("class ")
                || trimmed.starts_with("interface ")
                || trimmed.starts_with("type ")
                || trimmed.starts_with("enum ")
                || (trimmed.starts_with("const ") && (trimmed.contains("=>") || trimmed.contains("require(")))
        }
        "go" => {
            trimmed.starts_with("package ")
                || trimmed.starts_with("import ")
                || trimmed.starts_with("func ")
                || trimmed.starts_with("type ")
        }
        "sh" | "bash" | "zsh" => {
            trimmed.starts_with("function ")
                || (trimmed.ends_with("() {") || trimmed.ends_with("(){"))
                || trimmed.starts_with("alias ")
        }
        _ => {
            trimmed.starts_with("class ")
                || trimmed.starts_with("struct ")
                || trimmed.starts_with("interface ")
                || trimmed.starts_with("fun ")
                || trimmed.starts_with("def ")
                || trimmed.starts_with("function ")
                || trimmed.starts_with("#include ")
        }
    }
}

fn squeeze_file(path: &Path, max_lines: usize) {
    let bytes = match fs::read(path) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("ctx-squeeze: failed to read {}: {}", path.display(), e);
            return;
        }
    };
    let content = String::from_utf8_lossy(&bytes);
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let all_lines: Vec<&str> = content.lines().collect();
    let total = all_lines.len();
    let mut hits: Vec<(usize, &str)> = Vec::new();

    for (idx, line) in all_lines.iter().enumerate() {
        let trimmed = line.trim_start();
        if is_structural_line(trimmed, &ext) {
            hits.push((idx + 1, line.trim_end()));
            if hits.len() >= max_lines {
                break;
            }
        }
    }

    println!(
        "=== {} ({} lines -> {} outline) ===",
        path.display(),
        total,
        hits.len()
    );
    for (ln, text) in hits {
        println!("{:>4}: {}", ln, text);
    }
}

fn collect_files(dir: &Path, filter_exts: &[String], out: &mut Vec<PathBuf>) {
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
            collect_files(&p, filter_exts, out);
        } else if p.is_file() && is_supported_ext(&p, filter_exts) {
            out.push(p);
        }
    }
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.is_empty() || args.iter().any(|a| a == "-h" || a == "--help") {
        println!("Usage: ctx-squeeze <file_or_dir> [--max-lines N] [--ext rs,py,js]");
        process::exit(0);
    }

    let mut target: Option<PathBuf> = None;
    let mut max_lines: usize = 120;
    let mut filter_exts: Vec<String> = Vec::new();

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--max-lines" | "-n" => {
                if i + 1 < args.len() {
                    max_lines = args[i + 1].parse().unwrap_or(120);
                    i += 2;
                    continue;
                }
            }
            "--ext" | "-e" => {
                if i + 1 < args.len() {
                    filter_exts = args[i + 1]
                        .split(',')
                        .map(|s| s.trim().trim_start_matches('.').to_lowercase())
                        .filter(|s| !s.is_empty())
                        .collect();
                    i += 2;
                    continue;
                }
            }
            other => {
                if target.is_none() {
                    target = Some(PathBuf::from(other));
                }
            }
        }
        i += 1;
    }

    let target = match target {
        Some(t) => t,
        None => {
            eprintln!("ctx-squeeze: missing <file_or_dir>");
            process::exit(1);
        }
    };

    if target.is_file() {
        squeeze_file(&target, max_lines);
    } else if target.is_dir() {
        let mut files = Vec::new();
        collect_files(&target, &filter_exts, &mut files);
        for f in files {
            squeeze_file(&f, max_lines);
        }
    } else {
        eprintln!("ctx-squeeze: path not found: {}", target.display());
        process::exit(1);
    }
}
