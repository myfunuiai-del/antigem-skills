# Other tracing hints

- Use this when the subject doesn't clearly fit portrait, landscape, or object — apply general-purpose tracing rather than category-specific framing.
- Default to the object approach as a baseline: split any subject with distinct structural parts into one `class="fill"` region per part (see `object.md`'s limb-splitting rule — do not blob the whole subject into one silhouette fill), tight `stroke-sil` silhouette per part, `stroke-int` for major interior boundaries, minimal background.
- Author every `class="fill"`/`class="stroke-sil"`/`class="stroke-int"` shape as a curved `<path>` (with at least one `Q`/`C` command), `<circle>`, or `<ellipse>` — never a `<polygon>` or `<rect>`, per SKILL.md's **Line rules**, same as every other category.
- If the source contains multiple competing subjects, pick the single most visually dominant one to trace fully rather than splitting SKILL.md's fill-region / line budget across all of them.
- When in doubt about composition, use a plain neutral fill (white or the source's dominant background color) and standard centered framing within the usable zone (x/y ∈ [0.08, 0.92]) — there is no default background to fall back on.
