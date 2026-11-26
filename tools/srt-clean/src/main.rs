use antigem_common::read_lossy;
use std::env;
use std::io::{self, Read};
use std::path::Path;
use std::process;

fn strip_html_tags(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut in_tag = false;
    for ch in s.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    out
}

fn is_timestamp_line(trimmed: &str) -> bool {
    trimmed.contains("-->")
        || trimmed.starts_with("WEBVTT")
        || trimmed.starts_with("Kind:")
        || trimmed.starts_with("Language:")
        || trimmed.chars().all(|c| c.is_ascii_digit())
}

fn clean_transcript(raw: &str) -> String {
    let mut lines: Vec<String> = Vec::new();
    let mut prev = String::new();

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || is_timestamp_line(trimmed) {
            continue;
        }
        let cleaned = strip_html_tags(trimmed);
        let cleaned = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");
        if cleaned.is_empty() || cleaned == prev {
            continue;
        }
        prev = cleaned.clone();
        lines.push(cleaned);
    }
    lines.join(" ")
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.iter().any(|a| a == "-h" || a == "--help") {
        println!("Usage: srt-clean [subtitle_or_txt_file]  (reads stdin if no file given)");
        process::exit(0);
    }

    let file_arg = args.iter().find(|a| !a.starts_with('-'));
    let raw = match file_arg {
        Some(f) => match read_lossy(Path::new(f)) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("srt-clean: failed to read {}: {}", f, e);
                process::exit(1);
            }
        },
        None => {
            let mut buf = String::new();
            if let Err(e) = io::stdin().read_to_string(&mut buf) {
                eprintln!("srt-clean: failed to read stdin: {}", e);
                process::exit(1);
            }
            buf
        }
    };

    println!("{}", clean_transcript(&raw));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_transcript_removes_timestamps_and_dups() {
        let sample = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\n<c>Hello</c> world\n\n2\n00:00:03.000 --> 00:00:05.000\nHello world\n\n3\n00:00:05.000 --> 00:00:07.000\nNext line";
        assert_eq!(clean_transcript(sample), "Hello world Next line");
    }
}
