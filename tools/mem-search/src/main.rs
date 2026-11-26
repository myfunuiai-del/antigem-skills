use antigem_common::{collect_files, read_lossy, truncate_str};
use std::env;
use std::path::PathBuf;
use std::process;

#[derive(Clone)]
struct Hit {
    score: usize,
    path: PathBuf,
    line_num: usize,
    preview: String,
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.is_empty() || args.iter().any(|a| a == "-h" || a == "--help") {
        println!("Usage: mem-search <query> [--dir <path>] [--top N]");
        process::exit(0);
    }

    let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let mut search_dir = PathBuf::from(home).join(".antigem").join("memory");
    let mut top_n: usize = 10;
    let mut query_parts: Vec<String> = Vec::new();

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--dir" | "-d" => {
                if i + 1 < args.len() {
                    search_dir = PathBuf::from(&args[i + 1]);
                    i += 2;
                    continue;
                }
            }
            "--top" | "-n" => {
                if i + 1 < args.len() {
                    top_n = args[i + 1].parse().unwrap_or(10);
                    i += 2;
                    continue;
                }
            }
            other => {
                query_parts.push(other.to_string());
            }
        }
        i += 1;
    }

    let full_query = query_parts.join(" ").to_lowercase();
    let terms: Vec<String> = full_query
        .split_whitespace()
        .map(|t| t.to_string())
        .filter(|t| !t.is_empty())
        .collect();

    if terms.is_empty() {
        eprintln!("mem-search: empty query");
        process::exit(1);
    }
    if !search_dir.exists() {
        eprintln!("mem-search: directory not found: {}", search_dir.display());
        process::exit(1);
    }

    let mut files = Vec::new();
    collect_files(&search_dir, &["md", "txt", "jsonl", "json"], &mut files);

    let mut hits: Vec<Hit> = Vec::new();
    for file in files {
        let content = match read_lossy(&file) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let file_name_lower = file
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();

        let filename_bonus: usize = terms
            .iter()
            .filter(|t| file_name_lower.contains(t.as_str()))
            .count()
            * 3;

        for (idx, line) in content.lines().enumerate() {
            let line_lower = line.to_lowercase();
            let mut matched_terms = 0usize;
            let mut term_hits = 0usize;

            for t in &terms {
                let count = line_lower.matches(t.as_str()).count();
                if count > 0 {
                    matched_terms += 1;
                    term_hits += count.min(4);
                }
            }

            if matched_terms == 0 {
                continue;
            }

            let mut score = matched_terms * 5 + term_hits + filename_bonus;
            if terms.len() > 1 && line_lower.contains(&full_query) {
                score += 10;
            }

            hits.push(Hit {
                score,
                path: file.clone(),
                line_num: idx + 1,
                preview: truncate_str(line, 160),
            });
        }
    }

    hits.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| a.path.cmp(&b.path)));
    hits.truncate(top_n);

    if hits.is_empty() {
        println!("No matches found for '{}'.", full_query);
    } else {
        for h in hits {
            println!(
                "[score:{}] {}:{}: {}",
                h.score,
                h.path.display(),
                h.line_num,
                h.preview
            );
        }
    }
}
