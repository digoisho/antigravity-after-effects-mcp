#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "path";

import {
  getAfterEffectsStatus,
  executeInAfterEffects,
  BRIDGE_DIR
} from "./bridge/ae-bridge.js";
import {
  buildInspectProjectScript,
  buildCreateCompScript,
  buildAddTextLayerScript,
  buildAddShapeLayerScript,
  buildAnimateLayerScript,
  buildApplyEffectOrLayerActionScript,
  buildRenderCompFrameScript
} from "./builders/basics.js";
import {
  STUDIO_THEMES,
  getActiveBrandTheme,
  saveBrandTheme,
  extractPaletteFromImage
} from "./builders/brand-analyzer.js";
import {
  interpretDataToBlueprint,
  compileMotionSceneToJsx
} from "./builders/scene-compiler.js";
import { installScriptUIPanel } from "../scripts/install-bridge.js";

const server = new McpServer({
  name: "after-effects-motion-director",
  version: "1.0.0"
});

// -----------------------------------------------------------------------------
// 1. STATUS & PROJECT INSPECTION
// -----------------------------------------------------------------------------
server.tool(
  "ae_get_status_and_project_info",
  "Check After Effects connection status, install the ScriptUI bridge panel if needed, and inspect active project compositions and layers.",
  {
    compName: z.string().optional().describe("Optional composition name to inspect")
  },
  async ({ compName }) => {
    const installedPanels = installScriptUIPanel();
    const status = getAfterEffectsStatus();
    let projectInfo = null;
    if (status.isRunning) {
      try {
        const script = buildInspectProjectScript(compName);
        const execRes = await executeInAfterEffects(script, { undoName: "Inspect AE Project", timeoutMs: 8000 });
        projectInfo = execRes;
      } catch (err) {
        projectInfo = { error: err.message };
      }
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status,
              installedScriptUIPanels: installedPanels,
              activeBrandTheme: getActiveBrandTheme(),
              projectInfo
            },
            null,
            2
          )
        }
      ]
    };
  }
);

// -----------------------------------------------------------------------------
// 2. CREATE COMPOSITION (BASICS)
// -----------------------------------------------------------------------------
server.tool(
  "ae_create_composition",
  "Create a new After Effects composition with aspect ratio presets (9:16 vertical, 16:9 horizontal, 1:1 square, 4:5 portrait) and resolution (FHD, 4K, HD).",
  {
    name: z.string().default("Motion Graphics Comp").describe("Name of the composition"),
    aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:5"]).default("9:16").describe("Aspect ratio preset"),
    resolution: z.enum(["FHD", "4K", "HD"]).default("FHD").describe("Resolution tier (FHD = 1080x1920 for 9:16)"),
    width: z.number().optional().describe("Optional explicit width in pixels"),
    height: z.number().optional().describe("Optional explicit height in pixels"),
    duration: z.number().default(15).describe("Duration in seconds (e.g., 15)"),
    frameRate: z.number().default(30).describe("Frames per second (e.g., 30 or 60)"),
    bgColor: z.string().default("#090D16").describe("Background HEX color"),
    gradientBottomColor: z.string().optional().describe("Optional second HEX color for a smooth vertical gradient canvas")
  },
  async (params) => {
    const script = buildCreateCompScript(params);
    const res = await executeInAfterEffects(script, { undoName: `Create Comp: ${params.name}` });
    return {
      content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
    };
  }
);

// -----------------------------------------------------------------------------
// 3. ADD TEXT LAYER (BASICS)
// -----------------------------------------------------------------------------
server.tool(
  "ae_add_text_layer",
  "Add a styled Text layer to a composition with optional entrance animation (pop, overshoot, slide-up, slide-down, fade) and optional auto-fitting pill background card.",
  {
    compName: z.string().optional().describe("Target composition name (defaults to active comp)"),
    name: z.string().optional().describe("Layer name"),
    text: z.string().describe("Text content to display"),
    fontSize: z.number().default(72).describe("Font size in px"),
    color: z.string().default("#F8FAFC").describe("Fill HEX color"),
    font: z.string().default("Arial-BoldMT").describe("PostScript font name"),
    tracking: z.number().default(0).describe("Letter tracking"),
    alignment: z.enum(["LEFT", "CENTER", "RIGHT"]).default("CENTER"),
    position: z.array(z.number()).optional().describe("[x, y] position in composition"),
    inPoint: z.number().default(0).describe("Layer start time in seconds"),
    outPoint: z.number().optional().describe("Layer end time in seconds"),
    entranceAnimation: z.enum(["none", "pop", "overshoot", "slide-up", "slide-down", "fade"]).default("overshoot"),
    animationDuration: z.number().default(0.55).describe("Entrance animation duration in seconds"),
    exitFade: z.boolean().default(true).describe("Automatically fade out at outPoint"),
    backgroundBox: z
      .object({
        color: z.string().default("#1E293B"),
        borderColor: z.string().optional(),
        borderWidth: z.number().default(2),
        roundness: z.number().default(28),
        paddingX: z.number().default(48),
        paddingY: z.number().default(28),
        opacity: z.number().default(92)
      })
      .optional()
      .describe("Optional auto-sized rounded rectangle card behind the text")
  },
  async (params) => {
    const script = buildAddTextLayerScript(params);
    const res = await executeInAfterEffects(script, { undoName: `Add Text: ${params.text.substring(0, 20)}` });
    return {
      content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
    };
  }
);

// -----------------------------------------------------------------------------
// 4. ADD SHAPE LAYER (BASICS)
// -----------------------------------------------------------------------------
server.tool(
  "ae_add_shape_layer",
  "Add a Shape layer (rounded rectangle card, circle/ellipse, progress ring, or custom vector line/path with Trim Paths) and animate its entrance.",
  {
    compName: z.string().optional(),
    name: z.string().optional(),
    shapeType: z.enum(["rect", "ellipse", "circle", "ring", "path", "line"]).default("rect"),
    width: z.number().optional().describe("Width in pixels (for rect/ellipse)"),
    height: z.number().optional().describe("Height in pixels (for rect/ellipse)"),
    size: z.number().optional().describe("Diameter in pixels (for circle/ring)"),
    roundness: z.number().default(28).describe("Corner radius for rectangles"),
    fillColor: z.string().optional().describe("Fill HEX color (omit or set fill=false for stroke-only)"),
    fill: z.boolean().default(true),
    fillOpacity: z.number().default(100),
    strokeColor: z.string().optional().describe("Stroke HEX color"),
    strokeWidth: z.number().default(0).describe("Stroke width in pixels"),
    vertices: z.array(z.array(z.number())).optional().describe("Array of [x, y] points when shapeType is path or line"),
    trimPaths: z
      .object({
        start: z.number().default(0),
        end: z.number().default(100),
        endKeyframes: z
          .array(
            z.object({
              time: z.number(),
              value: z.number()
            })
          )
          .optional()
      })
      .optional()
      .describe("Optional Trim Paths animation for drawing lines, borders, or progress rings"),
    position: z.array(z.number()).optional().describe("[x, y] position"),
    inPoint: z.number().default(0),
    outPoint: z.number().optional(),
    entranceAnimation: z.enum(["none", "pop", "overshoot", "slide-up", "scale-x", "scale-y"]).default("pop"),
    animationDuration: z.number().default(0.55)
  },
  async (params) => {
    const script = buildAddShapeLayerScript(params);
    const res = await executeInAfterEffects(script, { undoName: `Add Shape: ${params.name || params.shapeType}` });
    return {
      content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
    };
  }
);

// -----------------------------------------------------------------------------
// 5. ADD ANIMATED NUMBER COUNTER
// -----------------------------------------------------------------------------
server.tool(
  "ae_add_animated_counter",
  "Add a dynamic animated number counter layer that counts from startValue to endValue with prefix, suffix, decimals, and comma separators.",
  {
    compName: z.string().optional(),
    name: z.string().optional(),
    startValue: z.number().default(0),
    endValue: z.number().describe("Target number to count up/down to"),
    startTime: z.number().default(0).describe("Time in seconds when counting begins"),
    endTime: z.number().default(2.0).describe("Time in seconds when counting finishes"),
    decimals: z.number().default(0),
    prefix: z.string().default("").describe("Prefix such as '$' or '+'"),
    suffix: z.string().default("").describe("Suffix such as '%', 'M', 'K', 'x'"),
    fontSize: z.number().default(100),
    color: z.string().default("#38BDF8"),
    position: z.array(z.number()).optional(),
    inPoint: z.number().default(0),
    outPoint: z.number().optional()
  },
  async (params) => {
    const cfg = JSON.stringify(params);
    const script = `
      var cfg = ${cfg};
      var comp = aeGetComp(cfg.compName);
      if (!comp) throw new Error("No composition found.");
      var lyr = aeCreateCounter(comp, cfg);
      return { layerIndex: lyr.index, layerName: lyr.name };
    `;
    const res = await executeInAfterEffects(script, { undoName: "Add Animated Counter" });
    return {
      content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
    };
  }
);

// -----------------------------------------------------------------------------
// 6. ANIMATE LAYER PROPERTY & APPLY EFFECTS
// -----------------------------------------------------------------------------
server.tool(
  "ae_animate_layer_property",
  "Animate Position, Scale, Rotation, Opacity, or custom property on any layer with automatic KeyframeEase and optional inertial overshoot bounce.",
  {
    compName: z.string().optional(),
    layerNameOrIndex: z.union([z.string(), z.number()]).describe("Layer name or 1-based index"),
    property: z.enum(["position", "scale", "rotation", "opacity", "anchorPoint"]).default("position"),
    keyframes: z
      .array(
        z.object({
          time: z.number().describe("Time in seconds"),
          value: z.union([z.number(), z.array(z.number())]).describe("Number for opacity/rotation, [x,y] for position/scale")
        })
      )
      .describe("List of keyframes to apply"),
    easingStyle: z.enum(["snappy", "smooth", "dramatic", "linear"]).default("snappy"),
    overshootBounce: z.boolean().default(false).describe("Add inertial spring bounce expression after keyframes"),
    expression: z.string().optional().describe("Optional custom ExtendScript expression string")
  },
  async (params) => {
    const script = buildAnimateLayerScript(params);
    const res = await executeInAfterEffects(script, { undoName: `Animate ${params.property}` });
    return {
      content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
    };
  }
);

server.tool(
  "ae_apply_effect_or_parent",
  "Apply Glow, Drop Shadow, or any After Effects effect (by matchName/name) to a layer, or parent a layer to another layer.",
  {
    compName: z.string().optional(),
    layerNameOrIndex: z.union([z.string(), z.number()]),
    effectMatchNameOrName: z.string().optional().describe("Effect matchName (e.g. 'ADBE Gaussian Blur 2', 'ADBE Fill') or display name"),
    effectProperties: z.record(z.any()).optional().describe("Key-value map of effect property names to values"),
    addDropShadow: z
      .object({
        color: z.string().default("#000000"),
        opacity: z.number().default(110),
        direction: z.number().default(180),
        distance: z.number().default(18),
        softness: z.number().default(45)
      })
      .optional(),
    addGlow: z
      .object({
        threshold: z.number().default(60),
        radius: z.number().default(45),
        intensity: z.number().default(0.8)
      })
      .optional(),
    parentLayerNameOrIndex: z.union([z.string(), z.number()]).optional()
  },
  async (params) => {
    const script = buildApplyEffectOrLayerActionScript(params);
    const res = await executeInAfterEffects(script, { undoName: "Apply Effect / Parent Layer" });
    return {
      content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
    };
  }
);

// -----------------------------------------------------------------------------
// 7. BRAND THEME & REFERENCE IMAGE EXTRACTOR (USE CASE 3)
// -----------------------------------------------------------------------------
server.tool(
  "ae_extract_brand_theme_from_image",
  "Extract dominant background, surface, primary, secondary, and accent HEX colors from a reference image (style frame, brandbook screenshot, moodboard) and save as the active Brand Theme.",
  {
    imagePath: z.string().describe("Absolute path to the reference image (.png, .jpg, .jpeg, .bmp)"),
    fontHeading: z.string().optional().describe("Optional heading font override"),
    fontBody: z.string().optional().describe("Optional body font override"),
    motionStyle: z.enum(["snappy", "smooth", "dramatic"]).optional().describe("Optional motion feel override")
  },
  async ({ imagePath, fontHeading, fontBody, motionStyle }) => {
    const extracted = extractPaletteFromImage(imagePath);
    const updated = saveBrandTheme({
      ...extracted,
      ...(fontHeading ? { fontHeading } : {}),
      ...(fontBody ? { fontBody } : {}),
      ...(motionStyle ? { motionStyle } : {})
    });
    return {
      content: [{ type: "text", text: JSON.stringify(updated, null, 2) }]
    };
  }
);

server.tool(
  "ae_set_brand_theme",
  "Set or customize the active Brand Theme for motion graphics using a studio preset (cyber-neon, fintech-emerald, editorial-light, sunset-creator, luxury-gold) or custom brandbook colors.",
  {
    preset: z
      .enum(["cyber-neon", "fintech-emerald", "editorial-light", "sunset-creator", "luxury-gold"])
      .optional()
      .describe("Base studio preset"),
    name: z.string().optional(),
    background: z.string().optional().describe("Primary background HEX color"),
    backgroundSecondary: z.string().optional().describe("Secondary gradient background HEX color"),
    surface: z.string().optional().describe("Card / container surface HEX color"),
    surfaceBorder: z.string().optional().describe("Card border HEX color"),
    primary: z.string().optional().describe("Primary brand accent HEX color"),
    secondary: z.string().optional().describe("Secondary brand accent HEX color"),
    accent: z.string().optional().describe("Highlight / callout HEX color"),
    textPrimary: z.string().optional().describe("Main heading text HEX color"),
    textSecondary: z.string().optional().describe("Subtitle / muted text HEX color"),
    fontHeading: z.string().optional().describe("PostScript heading font (e.g. Arial-BoldMT, Montserrat-Bold)"),
    fontBody: z.string().optional().describe("PostScript body font"),
    cornerRadius: z.number().optional().describe("Card corner roundness in px"),
    motionStyle: z.enum(["snappy", "smooth", "dramatic"]).optional()
  },
  async (themeParams) => {
    const saved = saveBrandTheme(themeParams);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              message: "Active Brand Theme updated.",
              activeTheme: saved,
              availablePresets: Object.keys(STUDIO_THEMES)
            },
            null,
            2
          )
        }
      ]
    };
  }
);

// -----------------------------------------------------------------------------
// 8. DATA & IDEA TO FULL MOTION GRAPHICS COMPILER (USE CASES 2 & 3)
// -----------------------------------------------------------------------------
server.tool(
  "ae_create_motion_graphics_from_data",
  "Turn a simple idea + raw data into a complete, multi-scene animated Motion Graphics composition in After Effects (Hook Title -> KPI Cards / Stat Counter -> Bar or Line Chart -> Outro CTA).",
  {
    compName: z.string().optional().describe("Name of the composition to create"),
    aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:5"]).default("9:16").describe("Aspect ratio (e.g. 9:16 for Reels/Shorts)"),
    resolution: z.enum(["FHD", "4K", "HD"]).default("FHD").describe("Resolution (FHD = 1080x1920 for 9:16)"),
    duration: z.number().default(15).describe("Total animation duration in seconds (e.g. 15)"),
    frameRate: z.number().default(30),
    badge: z.string().default("DATA INSIGHTS").describe("Top kicker pill text on intro hook"),
    title: z.string().describe("Main hook headline for the motion graphic"),
    subtitle: z.string().optional().describe("Supporting subtitle for the hook"),
    kpiTitle: z.string().default("KEY HIGHLIGHTS").describe("Header for Act 2 KPI metrics"),
    chartType: z.enum(["bar-chart", "line-chart"]).default("bar-chart").describe("Visual chart type for Act 3"),
    chartTitle: z.string().default("PERFORMANCE BREAKDOWN").describe("Header for Act 3 chart"),
    outroTitle: z.string().default("KEY TAKEAWAY").describe("Closing headline for Act 4"),
    outroSubtitle: z.string().optional().describe("Summary takeaway statement in Act 4"),
    ctaText: z.string().default("FOLLOW FOR MORE").describe("Call-to-action pill button text in Act 4"),
    data: z
      .array(
        z.object({
          label: z.string().describe("Metric or category name (e.g. 'Q1 Revenue', 'AI Adoption')"),
          value: z.number().describe("Numeric value (e.g. 84, 1250)"),
          prefix: z.string().optional().describe("Optional prefix like '$' or '+'"),
          suffix: z.string().optional().describe("Optional suffix like '%', 'M', 'B', 'x'"),
          decimals: z.number().optional().describe("Decimal places (default 0)")
        })
      )
      .describe("Array of data points to visualize across KPI cards and charts"),
    theme: z
      .any()
      .optional()
      .describe("Optional theme preset name ('cyber-neon', 'fintech-emerald', 'editorial-light', 'sunset-creator', 'luxury-gold') or custom theme object")
  },
  async (params) => {
    const blueprint = interpretDataToBlueprint(params);
    const jsx = compileMotionSceneToJsx(blueprint);
    const execRes = await executeInAfterEffects(jsx, {
      undoName: `Build Motion Graphics: ${blueprint.compName}`,
      timeoutMs: 20000
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              blueprintGenerated: blueprint,
              executionResult: execRes
            },
            null,
            2
          )
        }
      ]
    };
  }
);

// -----------------------------------------------------------------------------
// 9. MULTI-SCENE STORYBOARD COMPILER (ADVANCED SCENE BUILDER)
// -----------------------------------------------------------------------------
server.tool(
  "ae_build_custom_motion_scene",
  "Build a custom multi-beat motion graphics storyboard in After Effects with full control over scene types (hero-title, stat-counter, kpi-grid, bar-chart, line-chart, callout-list, outro-cta), timings, and brand theme.",
  {
    compName: z.string().default("Custom Motion Storyboard"),
    aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:5"]).default("9:16"),
    resolution: z.enum(["FHD", "4K", "HD"]).default("FHD"),
    duration: z.number().default(15),
    frameRate: z.number().default(30),
    theme: z.any().optional().describe("Theme preset name or custom brand theme object"),
    scenes: z
      .array(
        z.object({
          type: z.enum([
            "hero-title",
            "stat-counter",
            "kpi-grid",
            "bar-chart",
            "line-chart",
            "callout-list",
            "outro-cta"
          ]),
          startTime: z.number().describe("Beat start time in seconds"),
          endTime: z.number().describe("Beat end time in seconds"),
          badge: z.string().optional(),
          title: z.string().optional(),
          subtitle: z.string().optional(),
          label: z.string().optional(),
          sublabel: z.string().optional(),
          value: z.number().optional(),
          prefix: z.string().optional(),
          suffix: z.string().optional(),
          decimals: z.number().optional(),
          showProgressRing: z.boolean().optional(),
          ringPercent: z.number().optional(),
          ctaText: z.string().optional(),
          items: z.array(z.any()).optional().describe("Array of items/bars/points/callouts for this scene beat")
        })
      )
      .describe("Ordered list of timed scene beats")
  },
  async (blueprint) => {
    const jsx = compileMotionSceneToJsx(blueprint);
    const execRes = await executeInAfterEffects(jsx, {
      undoName: `Build Storyboard: ${blueprint.compName}`,
      timeoutMs: 20000
    });
    return {
      content: [{ type: "text", text: JSON.stringify(execRes, null, 2) }]
    };
  }
);

// -----------------------------------------------------------------------------
// 10. RENDER PREVIEW FRAME (VISUAL FEEDBACK LOOP)
// -----------------------------------------------------------------------------
server.tool(
  "ae_render_preview_frame",
  "Render a PNG snapshot of the active After Effects composition at a specific timestamp so you can visually inspect the layout, colors, and typography.",
  {
    compName: z.string().optional(),
    timeSeconds: z.number().default(1.5).describe("Timestamp in seconds to capture"),
    outputPath: z.string().optional().describe("Optional output PNG file path")
  },
  async ({ compName, timeSeconds, outputPath }) => {
    const targetOut =
      outputPath || path.join(BRIDGE_DIR, `preview_${Date.now()}_${Math.round(timeSeconds * 10)}s.png`);
    const script = buildRenderCompFrameScript({
      compName,
      timeSeconds,
      outputPath: targetOut
    });
    const res = await executeInAfterEffects(script, { undoName: "Render Preview Frame" });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ...res, targetOutputPath: targetOut }, null, 2)
        }
      ]
    };
  }
);

// -----------------------------------------------------------------------------
// 11. RAW EXTENDSCRIPT EXECUTION (FULL DOM ACCESS)
// -----------------------------------------------------------------------------
server.tool(
  "ae_run_extendscript",
  "Execute custom Adobe After Effects ExtendScript (ES3 .jsx) code directly inside After Effects. All runtime helpers (aeCreateComp, aeCreateText, aeCreateShapeRect, aeCreateShapeEllipse, aeCreateShapePath, aeCreateCounter, aeAnimateProp, aeCenterAnchor, aeHexToRgb) are preloaded.",
  {
    script: z.string().describe("Body of ES3 ExtendScript code to execute. Use `return { ... }` to return data."),
    undoName: z.string().default("Custom Antigravity Script").describe("Undo group name shown in After Effects Edit menu")
  },
  async ({ script, undoName }) => {
    const res = await executeInAfterEffects(script, { undoName });
    return {
      content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
    };
  }
);

async function main() {
  try {
    installScriptUIPanel();
  } catch (e) {}
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error in After Effects MCP server:", err);
  process.exit(1);
});
