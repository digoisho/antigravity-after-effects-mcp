import { getAfterEffectsStatus, executeInAfterEffects } from "../src/bridge/ae-bridge.js";
import { installScriptUIPanel } from "./install-bridge.js";
import { interpretDataToBlueprint, compileMotionSceneToJsx } from "../src/builders/scene-compiler.js";

async function runDiagnostics() {
  console.log("=== 1. Installing ScriptUI Bridge Panel ===");
  const installed = installScriptUIPanel();
  console.log("Installed Panel Locations:", installed);

  console.log("\n=== 2. Checking After Effects Status ===");
  const status = getAfterEffectsStatus();
  console.log(JSON.stringify(status, null, 2));

  console.log("\n=== 3. Testing Data-to-Blueprint Scene Compiler (Dry Run) ===");
  const blueprint = interpretDataToBlueprint({
    compName: "AI Growth 2026 (9x16 FHD)",
    aspectRatio: "9:16",
    resolution: "FHD",
    duration: 15,
    badge: "2026 AI REPORT",
    title: "AI VIDEO BOOM",
    subtitle: "Creator Economy Adoption",
    chartType: "bar-chart",
    data: [
      { label: "Motion Design", value: 88, suffix: "%" },
      { label: "Short-Form Reels", value: 94, suffix: "%" },
      { label: "Brand Automation", value: 76, suffix: "%" }
    ],
    theme: "cyber-neon"
  });
  const compiledJsx = compileMotionSceneToJsx(blueprint);
  console.log(` Blueprint compiled cleanly! Generated ${compiledJsx.split("\n").length} lines of ES3 ExtendScript.`);

  if (process.argv.includes("--live") && status.isRunning) {
    console.log("\n=== 4. Executing Demo Scene Live in After Effects ===");
    const res = await executeInAfterEffects(compiledJsx, {
      undoName: "Demo 15s 9:16 Motion Graphics"
    });
    console.log("Live Execution Result:", JSON.stringify(res, null, 2));
  }
}

runDiagnostics().catch((e) => {
  console.error("Diagnostic failed:", e);
  process.exit(1);
});
