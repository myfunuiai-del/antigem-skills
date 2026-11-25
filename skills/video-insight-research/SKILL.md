---
name: video-insight-research
description: Analyze the content of a video or audio source and research its topic. Use when the user shares a video/audio URL or file and asks what it is about or what is said, or asks how to make a similar video based on an example.
---

# Video Insight & Research Skill

Use this skill whenever the user shares a video, audio file, or video/audio URL and asks what it contains—for example, "এই ভিডিওতে কী বলা হয়েছে?", "এই লিংকে কী বলা হয়েছে?", "What is this video about?", or "Summarize this video." Also use it when the user shares a reference video and asks how to make a similar one.

Supports **online streaming URLs** (YouTube, Facebook, X, direct links) without downloading the full video, and **local files** in phone storage. When frames are needed, capture them from the player or stream first; if a download is unavoidable, fetch only short segments around the needed timestamps.

---

## When to Use This Skill

Use it for requests to:
1. Explain what is said or shown in a video or audio file.
2. Summarize or analyze a video link.
3. Find tools, repositories, websites, or links shown or mentioned in a video.
4. Describe a video's topic, structure, style, or key benefits.
5. Plan how to create a similar video from a reference video.

## When Not to Use It

- For a normal web article or text page, use a browser/reading tool rather than this skill.
- This skill analyzes and plans; it does not produce, edit, or render a finished video by itself. For production, give a practical plan and use available media tools.
- If no audio or visual content can be accessed, explain the limitation instead of guessing.

---

## Capabilities & Architecture
1. **Zero-Download Online Analysis**: Extracts direct audio/video streams via `yt-dlp` and `ffmpeg` without saving multi-gigabyte video files to disk.
2. **Multilingual Speech Understanding**:
   - Tries direct subtitles first for speed (0 MB data).
   - If missing, extracts 16kHz audio stream and runs `whisper-cli`:
     - **Bengali (`bn`)**: Uses fine-tuned `ggml-bn-medium-q5_0.bin`.
     - **English / Mixed (Banglish)**: Uses `ggml-large-v3-turbo-q5_0.bin`.
3. **Visual Frame Capture**:
   - Identify useful timestamps from the user's question, transcript, captions, or moments mentioning repos, tools, websites, links, or code (e.g., *"এই রেপোটি..."*, *"on my screen..."*, *"link in description"*).
   - First try to capture a screenshot/frame from the browser player or directly from the remote stream without saving the full video.
   - If direct frame extraction fails for a remote video, download only a short segment around each needed timestamp—not the entire video. The analyzer uses approximately two seconds before and after the target (for example, 3–7 seconds for a frame at 5 seconds; 14–18 seconds for a frame at 16 seconds), then extracts the target frame from that segment.
   - If the short-segment fallback also fails, report that frame as unavailable and do not download the full video unless the user explicitly approves it.
   - Keep each segment separate if convenient. Stitch segments together only when continuity is useful; stitching is optional. Capture and inspect frames from each segment independently when that is sufficient.
   - Record each segment's original-video time range so extracted-frame timestamps remain correctly aligned with the source video.
   - Do not download the full remote video solely to inspect frames. If short-range capture fails and downloading the full video appears to be the only option, ask the user before doing so.
4. **Visual Intelligence**:
   - Read the captured snapshot frames to extract repo names (`owner/repo`), URLs, or terminal commands shown on screen.

### Audio Timeline and Timestamp Alignment

When transcription uses audio with silence removed or playback speed changed, its timestamps no longer directly match the original video timeline.

1. Record the source audio duration, every removed-silence interval, the retained audio intervals, and the applied speed factor as part of preprocessing metadata.
2. After silence removal, try transcription at **1.25×** first. If the transcript is missing or clearly too sparse, retry at **1.0×**, then **0.85×**. Keep the best transcript if none reaches the acceptance threshold; report that transcription quality may be limited rather than inventing missing words.
3. Map transcript times back to the source timeline before using them to capture video frames or presenting them as source timestamps. For speed factor `r` (audio played `r` times faster), first convert processed-audio time `t` to pre-speed time `t × r`, then locate that time in the retained-interval map and account for removed silence preceding it.
4. Record every speed attempt and the selected speed in the manifest. Keep each attempt's WAV and SRT in the run-specific output directory so results can be inspected without mixing runs.
5. Mark the mapping as approximate if silence detection and removal may differ at boundaries. Validate a mapped timestamp against a frame or spoken phrase when possible.
6. If no mapping is available, do not imply that trimmed-audio timestamps are original-video timestamps; explain the limitation or use captions/source-time cues instead.
7. Do not apply silence/speed correction to online subtitles that already use the source video's timeline.

---

## Links and Follow-up Research

When the video provides or mentions links related to its topic:

1. Look for relevant links in the video description, transcript or captions, pinned comment, and visible on-screen text, using available tools.
2. Open and review relevant links to clarify the topic and verify important claims. Prefer official documentation, original research, and other reliable primary sources.
3. Distinguish clearly between what the video says, what the linked sources confirm or add, and what could not be verified.
4. Briefly identify the sources used and explain which points they support. Include source URLs when available and useful.
5. Follow only links relevant to the user's question. If a link is inaccessible or unclear, say so instead of guessing.
6. Do not log in, make purchases, download or run files, or submit personal information while investigating links.

---

## Environment & Agent Guidelines

> [!NOTE]
> In **Claude Agent**, always execute `video-analyzer` for **all** video URLs (YouTube, Facebook, X, etc.) and local files, as Claude relies on this pipeline for media extraction. (Unlike AntiGem which handles YouTube natively, Claude uses `video-analyzer` for YouTube as well).

---

## How to Execute

### 1. Run the Video Analyzer
Run the single command in terminal:
```bash
video-analyzer "<VIDEO_URL_OR_LOCAL_PATH>" -o "$HOME/.antigem/media_analysis"
```

### 2. Inspect the Generated Manifest & Transcripts
Each run creates its own subdirectory under `$HOME/.antigem/media_analysis/`, named with a source hash and run time, to prevent output from different videos being mixed. The tool reports the exact run directory and manifest path.

Each run directory contains:
- `analysis_manifest.json`: metadata, transcript path, timestamp mapping, and captured-frame details.
- `frames/`: individual snapshot images taken at relevant moments, when available.
- The SRT named by `analysis_manifest.json`'s `srt_path`. Treat this as the authoritative transcript. After silence trimming, it is `whisper_sub_original_timeline.srt`; online captions may be stored as `online_sub.<language>.srt`.
- `transcript_clean.txt`: deduplicated readable transcript.
- `audio_16k_mono.wav`: retained extracted audio when transcription was needed.

### 3. Read the Frames & Answer the User
- Open the `analysis_manifest.json` in the run directory printed by the tool; do not assume a fixed manifest path.
- Follow the manifest's `srt_path` rather than globbing for `*_sub.srt`, since the latter may select stale or trimmed-timeline subtitles.
- Inspect any captured frame images using file viewing/reading tools to read screen text (GitHub repository URLs, project names, UI buttons, code snippets).
- Provide a clear, comprehensive breakdown to the user detailing:
  1. **Topic / Summary**: What the video is about.
  2. **Spoken Content**: Key points discussed.
  3. **Visual Findings**: Names of GitHub repos, tools, links, or commands shown on screen with exact timestamps.

---

## Planning a Similar Video

When the user asks how to make a video like the reference:

1. Analyze the reference video's length, pacing, format, visual style, music, and narration.
2. Break the structure into hooks, sections, and calls to action, with approximate timestamps.
3. Write a ready-to-use script or outline adapted to the user's own topic.
4. List the required scenes, shots, text overlays, sound effects, and music.
5. Suggest a practical production workflow using tools available in this environment.
6. Do not copy the reference video's exact wording, branding, or copyrighted audio; create an original version inspired by its structure.
