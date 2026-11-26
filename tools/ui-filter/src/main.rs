use antigem_common::{read_lossy, truncate_str};
use std::env;
use std::io::{self, Read};
use std::path::Path;
use std::process;

fn extract_attr<'a>(tag: &'a str, name: &str) -> Option<&'a str> {
    let pattern = format!("{}=\"", name);
    let start = tag.find(&pattern)? + pattern.len();
    let rest = &tag[start..];
    let end = rest.find('"')?;
    Some(&rest[..end])
}

fn parse_bounds_center(bounds: &str) -> Option<(i32, i32)> {
    // Format: [x1,y1][x2,y2]
    let inner = bounds.strip_prefix('[')?.strip_suffix(']')?;
    let (p1, p2) = inner.split_once("][")?;
    let (x1s, y1s) = p1.split_once(',')?;
    let (x2s, y2s) = p2.split_once(',')?;
    let x1: i32 = x1s.parse().ok()?;
    let y1: i32 = y1s.parse().ok()?;
    let x2: i32 = x2s.parse().ok()?;
    let y2: i32 = y2s.parse().ok()?;
    Some(((x1 + x2) / 2, (y1 + y2) / 2))
}

fn filter_xml(xml: &str, all_nodes: bool) -> Vec<String> {
    let mut out = Vec::new();
    let mut pos = 0;

    while let Some(rel_start) = xml[pos..].find("<node ") {
        let start = pos + rel_start;
        let Some(rel_end) = xml[start..].find('>') else {
            break;
        };
        let tag = &xml[start..start + rel_end + 1];
        pos = start + rel_end + 1;

        let text = extract_attr(tag, "text").unwrap_or("").trim();
        let desc = extract_attr(tag, "content-desc").unwrap_or("").trim();
        let res_id = extract_attr(tag, "resource-id").unwrap_or("");
        let clickable = extract_attr(tag, "clickable") == Some("true");
        let bounds = extract_attr(tag, "bounds").unwrap_or("");

        if !all_nodes && !clickable && text.is_empty() && desc.is_empty() {
            continue;
        }
        let Some((cx, cy)) = parse_bounds_center(bounds) else {
            continue;
        };

        let short_id = res_id.rsplit('/').next().unwrap_or(res_id);
        let label = if !text.is_empty() {
            truncate_str(text, 60)
        } else if !desc.is_empty() {
            truncate_str(desc, 60)
        } else {
            "-".to_string()
        };

        let kind = if clickable { "TAP" } else { "LBL" };
        if short_id.is_empty() {
            out.push(format!("[{}] ({},{}) | {}", kind, cx, cy, label));
        } else {
            out.push(format!("[{}] ({},{}) | {} | #{}", kind, cx, cy, label, short_id));
        }
    }
    out
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.iter().any(|a| a == "-h" || a == "--help") {
        println!("Usage: ui-filter [xml_file] [--all]  (reads stdin if no file given)");
        process::exit(0);
    }

    let all_nodes = args.iter().any(|a| a == "--all" || a == "-a");
    let file_arg = args.iter().find(|a| !a.starts_with('-'));

    let xml = match file_arg {
        Some(f) => match read_lossy(Path::new(f)) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("ui-filter: failed to read {}: {}", f, e);
                process::exit(1);
            }
        },
        None => {
            let mut buf = String::new();
            if let Err(e) = io::stdin().read_to_string(&mut buf) {
                eprintln!("ui-filter: failed to read stdin: {}", e);
                process::exit(1);
            }
            buf
        }
    };

    for line in filter_xml(&xml, all_nodes) {
        println!("{}", line);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_filter_xml_extracts_clickable_center() {
        let sample = r#"<hierarchy><node text="" clickable="false" bounds="[0,0][1080,2400]"/><node text="Send" resource-id="com.app:id/btn_send" clickable="true" bounds="[100,200][300,400]"/></hierarchy>"#;
        let res = filter_xml(sample, false);
        assert_eq!(res, vec!["[TAP] (200,300) | Send | #btn_send"]);
    }
}
