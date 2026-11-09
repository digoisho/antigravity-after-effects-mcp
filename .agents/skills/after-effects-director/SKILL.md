---
name: after-effects-director
description: >-
  AI Motion Graphics Director & After Effects MCP workflow. Use this skill whenever the user asks to
  create After Effects compositions, layers, animations, expressions, data-driven motion graphics
  (e.g., 15s 9:16 FHD reels/shorts, bar/line/donut charts, KPI counters), or motion graphics matching
  reference images, themes, brand colors, or brandbooks.
---

# After Effects Motion Graphics Director Skill

You are connected to **Adobe After Effects** via the `after-effects-motion-director` MCP server (`src/index.js`).
This skill defines the workflow for turning simple ideas, raw data, and visual brand references into broadcast-grade motion graphics inside After Effects.

---

## 1. Core Capabilities & Tool Selection

| User Goal | Primary MCP Tool(s) to Call |
| :--- | :--- |
| **Check AE connection & active project/layers** | `ae_get_status_and_project_info` |
| **Extract colors/theme from a reference image or brandbook** | 1. View image with `read_file` (for layout/typography/vibe)<br>2. Call `ae_extract_brand_theme_from_image` (for exact pixel HEX palette)<br>3. Refine with `ae_set_brand_theme` |
| **Create a full motion graphic from data + simple idea** *(e.g. "Create a 15s 9:16 FHD animation from this data")* | `ae_create_motion_graphics_from_data` or `ae_build_custom_motion_scene` |
| **Build a custom multi-scene storyboard** *(Hook -> KPI Cards -> Bar/Line Chart -> Callouts -> Outro CTA)* | `ae_build_custom_motion_scene` |
| **Basic AE building blocks** *(Comps, Text, Shapes, Counters, Keyframes, Effects)* | `ae_create_composition`, `ae_add_text_layer`, `ae_add_shape_layer`, `ae_add_animated_counter`, `ae_animate_layer_property`, `ae_apply_effect_or_parent` |
| **Custom complex rigs, expressions, or special effects** | `ae_run_extendscript` (all `aeCreate*` and `aeAnimateProp` helpers are preloaded) |
| **Visually inspect what was built in After Effects** | `ae_render_preview_frame` -> then view the output PNG with `read_file` |

---

## 2. Standard Workflow: Data + Brand Reference -> Motion Graphics

When the user asks to create a motion graphic from data, an idea, or reference images:

### Step 1: Brand & Reference Analysis (If Reference Image / Brandbook Provided)
1. **Multimodal Inspection**: Call `read_file` on the user's reference image(s) or PDF brandbook to observe:
   - Background mood (dark tech vs. clean editorial light vs. warm gradient)
   - Primary, secondary, and accent colors
   - Typography style (bold geometric sans, condensed headline, or serif)
   - Card corner roundness and motion energy (`"snappy"`, `"smooth"`, or `"dramatic"`)
2. **Programmatic Palette Extraction**: Call `ae_extract_brand_theme_from_image` on the image path to sample dominant and vibrant HEX swatches, or call `ae_set_brand_theme` with the exact brandbook HEX codes.

### Step 2: Storyboard & Data Interpretation
Structure the user's data for maximum audience retention across the requested `duration` (e.g., `15` seconds) and `aspectRatio` (e.g., `"9:16"` FHD `1080x1920`):
- **Act 1 (0% – 20% duration, e.g. 0.0s – 3.0s) — `hero-title`**:
  - Punchy kicker badge (`"2026 INSIGHTS"`), bold 2–4 word hook headline, and concise subtitle.
- **Act 2 (20% – 50% duration, e.g. 3.0s – 7.5s) — `kpi-grid` or `stat-counter`**:
  - Highlight the 1 to 3 most impactful numbers with animated counters (`prefix`, `suffix`, `decimals`) and optional progress rings.
- **Act 3 (50% – 82% duration, e.g. 7.5s – 12.3s) — `bar-chart`, `line-chart`, or `callout-list`**:
  - Visualize comparisons or growth trends with staggered animated bars, glowing `Trim Paths` trend lines, or ranked takeaway cards.
- **Act 4 (82% – 100% duration, e.g. 12.3s – 15.0s) — `outro-cta`**:
  - Key takeaway summary + call-to-action pill button.

### Step 3: Execute & Verify
1. Call `ae_build_custom_motion_scene` (or `ae_create_motion_graphics_from_data`).
2. Optionally call `ae_render_preview_frame` at key timestamps (e.g. `1.5s`, `5.0s`, `10.0s`) and inspect with `read_file` to verify visual quality.

---

## 3. ExtendScript Rules (When Using `ae_run_extendscript`)

- Always write **ES3-compliant** JavaScript (`var` only, no `const`/`let`, no arrow functions `() =>`, no template literals).
- Use the pre-injected runtime helpers whenever possible:
  - `aeGetComp(compName)`
  - `aeCreateComp({ name, width, height, duration, frameRate, bgColor })`
  - `aeCreateText(comp, { text, fontSize, color, font, alignment, position, inPoint, outPoint })`
  - `aeCreateShapeRect(comp, { name, width, height, roundness, fillColor, strokeColor, strokeWidth, position })`
  - `aeCreateShapeEllipse(comp, { name, size, fillColor, strokeColor, strokeWidth, trimPaths, position })`
  - `aeCreateShapePath(comp, { name, vertices, strokeColor, strokeWidth, trimPaths })`
  - `aeCreateCounter(comp, { startValue, endValue, startTime, endTime, prefix, suffix, decimals, fontSize, color, position })`
  - `aeAnimateProp(prop, [{ time, value }, ...], "snappy")`
  - `aeCenterAnchor(layer, sampleTime, targetPos)`
