use antigem_common::{collect_files, fnv1a_64};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process;

const IMG_EXTS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic"];

fn detect_source_app(name: &str) -> Option<&str> {
    // Android screenshots often look like Screenshot_2026-11-26-12-00-00-00_com.whatsapp.jpg
    let stem = name.rsplit_once('.').map(|(s, _)| s).unwrap_or(name);
    for part in stem.split('_') {
        if part.contains('.') && (part.starts_with("com.") || part.starts_with("org.") || part.starts_with("ai.")) {
            return Some(part);
        }
    }
    None
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.is_empty() || args.iter().any(|a| a == "-h" || a == "--help") {
        println!("Usage: img-scan <dir> [--dups-only]");
        process::exit(0);
    }

    let dups_only = args.iter().any(|a| a == "--dups-only" || a == "-d");
    let target = match args.iter().find(|a| !a.starts_with('-')) {
        Some(t) => PathBuf::from(t),
        None => {
            eprintln!("img-scan: missing <dir>");
            process::exit(1);
        }
    };

    if !target.is_dir() {
        eprintln!("img-scan: not a directory: {}", target.display());
        process::exit(1);
    }

    let mut files = Vec::new();
    collect_files(&target, IMG_EXTS, &mut files);

    let mut by_size: HashMap<u64, Vec<PathBuf>> = HashMap::new();
    let mut app_counts: HashMap<String, usize> = HashMap::new();
    let mut total_bytes: u64 = 0;

    for f in &files {
        if let Ok(meta) = fs::metadata(f) {
            let sz = meta.len();
            total_bytes += sz;
            by_size.entry(sz).or_default().push(f.clone());
        }
        if let Some(name) = f.file_name().and_then(|n| n.to_str()) {
            if let Some(app) = detect_source_app(name) {
                *app_counts.entry(app.to_string()).or_default() += 1;
            }
        }
    }

    // Exact duplicate check only for files sharing the same byte size
    let mut dup_groups: Vec<Vec<PathBuf>> = Vec::new();
    for (_sz, group) in by_size {
        if group.len() < 2 {
            continue;
        }
        let mut by_hash: HashMap<u64, Vec<PathBuf>> = HashMap::new();
        for p in group {
            if let Ok(bytes) = fs::read(&p) {
                by_hash.entry(fnv1a_64(&bytes)).or_default().push(p);
            }
        }
        for (_h, dg) in by_hash {
            if dg.len() > 1 {
                dup_groups.push(dg);
            }
        }
    }

    if !dups_only {
        println!(
            "Scanned {} images ({:.2} MB) in {}",
            files.len(),
            total_bytes as f64 / (1024.0 * 1024.0),
            Path::new(&target).display()
        );
        if !app_counts.is_empty() {
            println!("Detected Screenshot Apps:");
            let mut apps: Vec<_> = app_counts.into_iter().collect();
            apps.sort_by(|a, b| b.1.cmp(&a.1));
            for (app, cnt) in apps.into_iter().take(15) {
                println!("  {}: {}", app, cnt);
            }
        }
    }

    println!("Exact Duplicate Groups: {}", dup_groups.len());
    for (idx, g) in dup_groups.iter().enumerate() {
        println!("  [Group {}]", idx + 1);
        for p in g {
            println!("    {}", p.display());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_source_app() {
        assert_eq!(
            detect_source_app("Screenshot_2026-11-26_com.whatsapp.jpg"),
            Some("com.whatsapp")
        );
        assert_eq!(detect_source_app("IMG_20261126.jpg"), None);
    }
}
