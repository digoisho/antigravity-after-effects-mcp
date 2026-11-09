import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { findAfterEffectsExecutable } from "../src/bridge/ae-bridge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const panelSource = path.resolve(__dirname, "../src/panel/AE-Antigravity-Bridge.jsx");

export function installScriptUIPanel() {
  const installedPaths = [];

  // 1. User AppData Roaming ScriptUI Panels (Never requires Admin elevation)
  const roamAdobe = path.join(os.homedir(), "AppData", "Roaming", "Adobe", "After Effects");
  if (fs.existsSync(roamAdobe)) {
    const versions = fs.readdirSync(roamAdobe).filter((d) => /^\d+\.\d+$/.test(d));
    for (const ver of versions) {
      const targetDir = path.join(roamAdobe, ver, "Scripts", "ScriptUI Panels");
      try {
        fs.mkdirSync(targetDir, { recursive: true });
        const dest = path.join(targetDir, "AE-Antigravity-Bridge.jsx");
        fs.copyFileSync(panelSource, dest);
        installedPaths.push(dest);
      } catch (e) {}
    }
  }

  // 2. Also install to Support Files/Scripts/ScriptUI Panels next to AfterFX.exe
  const exePath = findAfterEffectsExecutable();
  if (exePath) {
    const supportDir = path.dirname(exePath);
    const panelDir = path.join(supportDir, "Scripts", "ScriptUI Panels");
    try {
      fs.mkdirSync(panelDir, { recursive: true });
      const dest = path.join(panelDir, "AE-Antigravity-Bridge.jsx");
      fs.copyFileSync(panelSource, dest);
      installedPaths.push(dest);
    } catch (e) {}
  }

  return installedPaths;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results = installScriptUIPanel();
  console.log("Installed AE-Antigravity-Bridge.jsx to:");
  for (const p of results) {
    console.log("  ->", p);
  }
}
