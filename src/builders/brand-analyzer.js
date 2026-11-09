import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { BRIDGE_DIR } from "../bridge/ae-bridge.js";

const ACTIVE_THEME_FILE = path.join(BRIDGE_DIR, "active_brand_theme.json");

/**
 * Built-in Studio Motion Graphics Theme Presets
 */
export const STUDIO_THEMES = {
  "cyber-neon": {
    name: "Cyber Neon Dark",
    background: "#090D16",
    backgroundSecondary: "#111827",
    surface: "#1E293B",
    surfaceBorder: "#334155",
    primary: "#38BDF8",
    secondary: "#818CF8",
    accent: "#F43F5E",
    success: "#10B981",
    warning: "#F59E0B",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    fontHeading: "Arial-BoldMT",
    fontBody: "ArialMT",
    cornerRadius: 28,
    motionStyle: "snappy",
    backgroundStyle: "grid-glow"
  },
  "fintech-emerald": {
    name: "Fintech Emerald Pro",
    background: "#061411",
    backgroundSecondary: "#0B241E",
    surface: "#12352C",
    surfaceBorder: "#1E5647",
    primary: "#10B981",
    secondary: "#34D399",
    accent: "#FBBF24",
    success: "#22C55E",
    warning: "#F59E0B",
    textPrimary: "#ECFDF5",
    textSecondary: "#A7F3D0",
    fontHeading: "Arial-BoldMT",
    fontBody: "ArialMT",
    cornerRadius: 32,
    motionStyle: "snappy",
    backgroundStyle: "gradient-grid"
  },
  "editorial-light": {
    name: "Clean Editorial Light",
    background: "#F8FAFC",
    backgroundSecondary: "#EEF2F6",
    surface: "#FFFFFF",
    surfaceBorder: "#E2E8F0",
    primary: "#2563EB",
    secondary: "#7C3AED",
    accent: "#EA580C",
    success: "#16A34A",
    warning: "#D97706",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    fontHeading: "Arial-BoldMT",
    fontBody: "ArialMT",
    cornerRadius: 24,
    motionStyle: "smooth",
    backgroundStyle: "minimal-dots"
  },
  "sunset-creator": {
    name: "Creator Warm Sunset",
    background: "#180B16",
    backgroundSecondary: "#2A1225",
    surface: "#3B1B34",
    surfaceBorder: "#59284E",
    primary: "#FF6B6B",
    secondary: "#FFA06B",
    accent: "#FFD93D",
    success: "#6BCB77",
    warning: "#FFD93D",
    textPrimary: "#FFF5F5",
    textSecondary: "#F3C6D3",
    fontHeading: "Arial-BoldMT",
    fontBody: "ArialMT",
    cornerRadius: 36,
    motionStyle: "dramatic",
    backgroundStyle: "ambient-orbs"
  },
  "luxury-gold": {
    name: "Luxury Obsidian & Gold",
    background: "#0A0A0B",
    backgroundSecondary: "#141417",
    surface: "#1E1E24",
    surfaceBorder: "#3A3222",
    primary: "#D4AF37",
    secondary: "#F3E5AB",
    accent: "#E5C158",
    success: "#4ADE80",
    warning: "#FBBF24",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    fontHeading: "Arial-BoldMT",
    fontBody: "ArialMT",
    cornerRadius: 16,
    motionStyle: "smooth",
    backgroundStyle: "minimal-luxury"
  }
};

export function getActiveBrandTheme(overrideTheme) {
  let base = { ...STUDIO_THEMES["cyber-neon"] };

  if (fs.existsSync(ACTIVE_THEME_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(ACTIVE_THEME_FILE, "utf8"));
      base = { ...base, ...saved };
    } catch (e) {}
  }

  if (typeof overrideTheme === "string" && STUDIO_THEMES[overrideTheme]) {
    base = { ...base, ...STUDIO_THEMES[overrideTheme] };
  } else if (overrideTheme && typeof overrideTheme === "object") {
    if (overrideTheme.preset && STUDIO_THEMES[overrideTheme.preset]) {
      base = { ...base, ...STUDIO_THEMES[overrideTheme.preset] };
    }
    base = { ...base, ...overrideTheme };
  }

  return base;
}

export function saveBrandTheme(themeConfig) {
  const merged = getActiveBrandTheme(themeConfig);
  fs.writeFileSync(ACTIVE_THEME_FILE, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

/**
 * Extracts dominant, surface, and vibrant accent HEX colors directly from any reference image
 * (.png, .jpg, .jpeg, .bmp) on Windows using System.Drawing color clustering.
 */
export function extractPaletteFromImage(imagePath) {
  const resolved = path.resolve(imagePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Reference image not found at: ${resolved}`);
  }

  const psScript = `
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("${resolved.replace(/\\/g, "\\\\")}")
$w = $bmp.Width
$h = $bmp.Height
$buckets = @{}
$stepX = [Math]::Max(1, [Math]::Floor($w / 48))
$stepY = [Math]::Max(1, [Math]::Floor($h / 48))

for ($x = 0; $x -lt $w; $x += $stepX) {
  for ($y = 0; $y -lt $h; $y += $stepY) {
    $c = $bmp.GetPixel($x, $y)
    if ($c.A -lt 128) { continue }
    $qr = [Math]::Min(255, [Math]::Round($c.R / 24) * 24)
    $qg = [Math]::Min(255, [Math]::Round($c.G / 24) * 24)
    $qb = [Math]::Min(255, [Math]::Round($c.B / 24) * 24)
    $key = "{0:X2}{1:X2}{2:X2}" -f [int]$qr, [int]$qg, [int]$qb
    if ($buckets.ContainsKey($key)) {
      $buckets[$key].count += 1
    } else {
      $max = [Math]::Max($qr, [Math]::Max($qg, $qb)) / 255.0
      $min = [Math]::Min($qr, [Math]::Min($qg, $qb)) / 255.0
      $lum = 0.2126 * ($qr/255.0) + 0.7152 * ($qg/255.0) + 0.0722 * ($qb/255.0)
      $sat = if ($max -eq 0) { 0 } else { ($max - $min) / $max }
      $buckets[$key] = @{ hex = "#" + $key; count = 1; lum = [Math]::Round($lum, 3); sat = [Math]::Round($sat, 3) }
    }
  }
}
$bmp.Dispose()
$sorted = $buckets.Values | Sort-Object -Property count -Descending | Select-Object -First 20
$sorted | ConvertTo-Json -Compress
`;

  const tmpPs1 = path.join(BRIDGE_DIR, "extract_palette.ps1");
  fs.writeFileSync(tmpPs1, psScript, "utf8");

  let colors = [];
  try {
    const out = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpPs1}"`, {
      encoding: "utf8",
      timeout: 8000
    }).trim();
    const parsed = JSON.parse(out);
    colors = Array.isArray(parsed) ? parsed : [parsed];
  } finally {
    try { fs.unlinkSync(tmpPs1); } catch (e) {}
  }

  if (!colors.length) {
    return getActiveBrandTheme();
  }

  // Classify dominant background, surface, vibrant primary, and secondary accent
  const bgColor = colors[0];
  const isDarkBg = bgColor.lum < 0.45;

  const vibrant = [...colors].sort((a, b) => (b.sat * 1.5 + b.count * 0.002) - (a.sat * 1.5 + a.count * 0.002));
  const primary = vibrant.find((c) => c.hex !== bgColor.hex && c.sat > 0.25) || vibrant[0] || { hex: "#38BDF8" };
  const secondary =
    vibrant.find((c) => c.hex !== bgColor.hex && c.hex !== primary.hex && c.sat > 0.2) ||
    colors[1] ||
    { hex: "#818CF8" };
  const accent =
    vibrant.find((c) => c.hex !== bgColor.hex && c.hex !== primary.hex && c.hex !== secondary.hex) ||
    secondary;

  const surfaceCandidate =
    colors.find((c) => c.hex !== bgColor.hex && Math.abs(c.lum - bgColor.lum) > 0.05 && Math.abs(c.lum - bgColor.lum) < 0.25) ||
    (isDarkBg ? { hex: "#1E293B" } : { hex: "#FFFFFF" });

  const inferredTheme = {
    name: `Extracted from ${path.basename(resolved)}`,
    sourceImage: resolved,
    background: bgColor.hex,
    backgroundSecondary: surfaceCandidate.hex,
    surface: surfaceCandidate.hex,
    surfaceBorder: primary.hex,
    primary: primary.hex,
    secondary: secondary.hex,
    accent: accent.hex,
    textPrimary: isDarkBg ? "#F8FAFC" : "#0F172A",
    textSecondary: isDarkBg ? "#94A3B8" : "#475569",
    isDarkTheme: isDarkBg,
    sampledSwatches: colors.slice(0, 10)
  };

  return saveBrandTheme(inferredTheme);
}
