use antigem_common::{collect_files, read_lossy};
use std::env;
use std::path::PathBuf;
use std::process;

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.iter().any(|a| a == "-h" || a == "--help") {
        println!("Usage: router-stats [--dir <claude-router-path>]");
        process::exit(0);
    }

    let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let mut target = PathBuf::from(home).join(".gemini").join("claude-router");

    let mut i = 0;
    while i < args.len() {
        if (args[i] == "--dir" || args[i] == "-d") && i + 1 < args.len() {
            target = PathBuf::from(&args[i + 1]);
            break;
        }
        i += 1;
    }

    if !target.exists() {
        eprintln!("router-stats: path not found: {}", target.display());
        process::exit(1);
    }

    let mut files = Vec::new();
    collect_files(&target, &["log", "jsonl"], &mut files);

    let mut total_lines = 0usize;
    let mut error_lines = 0usize;
    let mut warn_lines = 0usize;
    let mut request_lines = 0usize;

    for f in &files {
        let Ok(content) = read_lossy(f) else {
            continue;
        };
        for line in content.lines() {
            total_lines += 1;
            let lower = line.to_lowercase();
            if lower.contains("error") || lower.contains("traceback") || lower.contains("exception") {
                error_lines += 1;
            }
            if lower.contains("warn") || lower.contains("429") || lower.contains("rate limit") {
                warn_lines += 1;
            }
            if lower.contains("post ") || lower.contains("get ") || lower.contains("/v1/") {
                request_lines += 1;
            }
        }
    }

    println!("=== claude-router Log Summary ({}) ===", target.display());
    println!("Log/JSONL files : {}", files.len());
    println!("Total lines     : {}", total_lines);
    println!("API requests    : {}", request_lines);
    println!("Warnings / 429  : {}", warn_lines);
    println!("Errors          : {}", error_lines);
}
