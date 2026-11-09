# Antigravity <-> After Effects MCP (`after-effects-motion-director`)

An **AE-GPT style Model Context Protocol (MCP) Server & AI Motion Graphics Director** built for **Google Antigravity** and **Adobe After Effects**.

---

## Part 1: Decoding `ae-gpt.com` — How It Works Under the Hood

**AE-GPT (`ae-gpt.com`)** is an AI assistant panel for Adobe After Effects. Its internal architecture consists of four layers:

1. **CEP / ScriptUI Extension Host**: Runs a panel inside After Effects that communicates with AE's internal ExtendScript DOM via `CSInterface.evalScript()`.
2. **Project Context Harvester**: Before sending a prompt to an LLM, it runs an ExtendScript inspector that serializes active compositions, layer hierarchies, transform properties, applied effects, and expressions into JSON.
3. **Domain-Specific System Prompt & ES3 Compiler**: Because After Effects' scripting engine uses legacy **ES3 ExtendScript** (1-based layer indexing, `ADBE` matchNames, strict `KeyframeEase` array dimensions), AE-GPT wraps prompts with strict ExtendScript generation rules.
4. **Agent Mode & Multimodal Reference Input**: Accepts reference images/moodboards and translates natural language requests into sequential `.jsx` DOM executions wrapped in `app.beginUndoGroup()`.

### Why Antigravity + `after-effects-motion-director` MCP Goes Further
- **Zero Subscription / Native Agent Brain**: Antigravity acts directly as the multimodal planner, reading your local CSV/JSON data, PDF brandbooks, and reference images natively.
- **Hybrid Dual-Transport Bridge**:
  - **Live ScriptUI Panel (`AE-Antigravity-Bridge.jsx`)**: Dockable inside After Effects (`Window > AE-Antigravity-Bridge.jsx`) for instant sub-second polling.
  - **Zero-Panel CLI Injection (`AfterFX.exe -r`)**: Even if the ScriptUI panel is closed, the MCP server automatically injects scripts directly into the running `AfterFX.exe` process.
- **Declarative Motion Graphics Scene Compiler**: Eliminates raw ExtendScript hallucinations by compiling high-level Storyboard Blueprints (`hero-title`, `stat-counter`, `kpi-grid`, `bar-chart`, `line-chart`, `callout-list`, `outro-cta`) into battle-tested ES3 code.

---

## Part 2: MCP Tools Included

| Tool Name | Use Case | Description |
| :--- | :--- | :--- |
| `ae_get_status_and_project_info` | Inspection & Setup | Checks AE status, auto-installs the ScriptUI panel, and returns all compositions & layers. |
| `ae_create_composition` | 1. AE Basics | Creates compositions with presets (`9:16`, `16:9`, `1:1`, `4:5` in `FHD`, `4K`, `HD`) and gradient canvases. |
| `ae_add_text_layer` | 1. AE Basics | Creates styled Text layers with auto-centered anchors, entrance animations (`overshoot`, `pop`, `slide-up`), and auto-fitting pill boxes. |
| `ae_add_shape_layer` | 1. AE Basics | Creates rounded rectangles, circles, progress rings, and custom Bezier paths with `Trim Paths`. |
| `ae_add_animated_counter` | 1 & 2. Data Basics | Creates smooth counting numbers (`0 -> target`) with prefixes (`$`, `+`), suffixes (`%`, `M`), and commas. |
| `ae_animate_layer_property` | 1. AE Basics | Keyframes `position`, `scale`, `rotation`, or `opacity` with automatic `KeyframeEase` and inertial bounce. |
| `ae_apply_effect_or_parent` | 1. AE Basics | Applies Glow, Drop Shadow, or any AE effect (`matchName`), and sets layer parenting. |
| `ae_extract_brand_theme_from_image` | 3. Brand Reference | Extracts dominant background, surface, primary, and accent HEX colors directly from any reference image. |
| `ae_set_brand_theme` | 3. Brand Reference | Configures the active Brand Theme using studio presets or custom brandbook colors & fonts. |
| `ae_create_motion_graphics_from_data` | 2 & 3. Data -> Video | Automatically interprets raw data + duration (e.g. `15s`) + ratio (`9:16 FHD`) into a 4-act animated video. |
| `ae_build_custom_motion_scene` | 2 & 3. Storyboard | Compiles a multi-scene storyboard (`hero-title`, `stat-counter`, `kpi-grid`, `bar-chart`, `line-chart`, `callout-list`, `outro-cta`). |
| `ae_render_preview_frame` | Visual Feedback | Exports a PNG frame at `timeSeconds` so Antigravity can visually inspect the composition. |
| `ae_run_extendscript` | Full DOM Access | Executes custom ES3 ExtendScript with all `JSX_RUNTIME_HELPERS` preloaded. |

---

## Part 3: Setup & Quick Start

1. **Install dependencies & ScriptUI Bridge Panel**:
   ```bash
   npm install
   npm run install-bridge
   ```
2. **Enable Scripting File Write in After Effects** *(for live JSON readback & frame previews)*:
   - In After Effects, open **Edit > Preferences > Scripting & Expressions**
   - Check **"Allow Scripts to Write Files and Access Network"**
3. **Optional Dockable Panel**:
   - In After Effects, open **Window > AE-Antigravity-Bridge.jsx**
4. **Prompt Antigravity**:
   > *"Create a motion graphics from this data: Q1 $1.2M, Q2 $2.4M, Q3 $3.9M, Q4 $5.8M — a 15 sec animation in 9:16 ratio FHD using the fintech-emerald theme."*
