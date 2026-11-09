import { resolveDimensions } from "./basics.js";
import { getActiveBrandTheme } from "./brand-analyzer.js";

/**
 * Automatically interprets raw data + idea into a structured multi-act Motion Graphics Blueprint
 * tailored for the target duration (e.g., 15s) and aspect ratio (e.g., 9:16 FHD).
 */
export function interpretDataToBlueprint(input) {
  const duration = Number(input.duration) || 15;
  const aspectRatio = input.aspectRatio || "9:16";
  const resolution = input.resolution || "FHD";
  const theme = getActiveBrandTheme(input.theme);

  const title = input.title || "DATA INSIGHTS";
  const subtitle = input.subtitle || "Key Performance Breakdown";
  const badge = input.badge || "INSIGHT REPORT";
  const ctaText = input.ctaText || "SAVE & SHARE";
  const outroTitle = input.outroTitle || "KEY TAKEAWAY";
  const outroSubtitle = input.outroSubtitle || subtitle;

  // Normalize raw data array if passed
  const rawMetrics = Array.isArray(input.data) ? input.data : [];

  // Calculate proportional 4-act timeline beats across `duration`
  const t0 = 0;
  const t1 = Number((duration * 0.20).toFixed(2)); // 0.0s - 3.0s (20%): Hook Title
  const t2 = Number((duration * 0.50).toFixed(2)); // 3.0s - 7.5s (30%): Primary Data / KPI Cards
  const t3 = Number((duration * 0.82).toFixed(2)); // 7.5s - 12.3s (32%): Chart Comparison (Bar / Line / Donut)
  const t4 = duration;                             // 12.3s - 15.0s (18%): Outro / CTA

  const scenes = input.scenes && input.scenes.length > 0 ? input.scenes : [];

  if (scenes.length === 0) {
    // Act 1: Hook Title
    scenes.push({
      type: "hero-title",
      startTime: t0,
      endTime: t1,
      badge,
      title,
      subtitle
    });

    // Act 2: Hero Stat or KPI Grid
    if (rawMetrics.length >= 2) {
      scenes.push({
        type: "kpi-grid",
        startTime: t1,
        endTime: t2,
        title: input.kpiTitle || "KEY METRICS",
        subtitle: input.kpiSubtitle || "Core Highlights",
        items: rawMetrics.slice(0, 3).map((m, idx) => ({
          label: String(m.label || m.name || `Metric ${idx + 1}`),
          value: Number(m.value ?? 100),
          prefix: m.prefix || "",
          suffix: m.suffix || "",
          decimals: Number(m.decimals || 0),
          badge: m.badge || m.change || ""
        }))
      });
    } else if (rawMetrics.length === 1) {
      const m = rawMetrics[0];
      scenes.push({
        type: "stat-counter",
        startTime: t1,
        endTime: t2,
        badge: m.badge || "PRIMARY METRIC",
        label: String(m.label || m.name || "Growth Rate"),
        sublabel: String(m.sublabel || subtitle),
        value: Number(m.value ?? 85),
        prefix: m.prefix || "",
        suffix: m.suffix || "%",
        decimals: Number(m.decimals || 0),
        showProgressRing: true,
        ringPercent: Math.min(100, Math.max(10, Number(m.value) || 85))
      });
    }

    // Act 3: Visual Chart Comparison (Bar Chart or Line Chart)
    if (rawMetrics.length > 0) {
      const chartType = input.chartType || "bar-chart";
      scenes.push({
        type: chartType,
        startTime: t2,
        endTime: t3,
        title: input.chartTitle || "PERFORMANCE BREAKDOWN",
        subtitle: input.chartSubtitle || "Comparative Analysis",
        items: rawMetrics.slice(0, 5).map((m, idx) => ({
          label: String(m.label || m.name || `Item ${idx + 1}`),
          value: Number(m.value ?? (idx + 1) * 20),
          prefix: m.prefix || "",
          suffix: m.suffix || "",
          decimals: Number(m.decimals || 0)
        }))
      });
    }

    // Act 4: Outro Summary & CTA
    scenes.push({
      type: "outro-cta",
      startTime: t3,
      endTime: t4,
      badge: badge,
      title: outroTitle,
      subtitle: outroSubtitle,
      ctaText: ctaText
    });
  }

  return {
    compName: input.compName || `${title.substring(0, 24)} (${aspectRatio})`,
    aspectRatio,
    resolution,
    width: input.width,
    height: input.height,
    duration,
    frameRate: Number(input.frameRate) || 30,
    theme,
    scenes
  };
}

/**
 * Compiles a structured Motion Graphics Blueprint into a complete, self-contained ES3 ExtendScript
 * that builds the composition, background canvas, grid, ambient lights, and all animated scene beats.
 */
export function compileMotionSceneToJsx(blueprintInput) {
  const bp = blueprintInput.scenes ? {
    ...blueprintInput,
    theme: getActiveBrandTheme(blueprintInput.theme)
  } : interpretDataToBlueprint(blueprintInput);

  const dims = resolveDimensions({
    aspectRatio: bp.aspectRatio,
    resolution: bp.resolution,
    width: bp.width,
    height: bp.height
  });

  const payload = {
    compName: bp.compName || "Motion_Graphics_15s",
    width: dims.width,
    height: dims.height,
    duration: Number(bp.duration) || 15,
    frameRate: Number(bp.frameRate) || 30,
    theme: bp.theme,
    scenes: bp.scenes || []
  };

  const serialized = JSON.stringify(payload);

  return `
    var bp = ${serialized};
    var W = bp.width;
    var H = bp.height;
    var DUR = bp.duration;
    var FPS = bp.frameRate;
    var T = bp.theme;
    var isVertical = (H >= W);
    var scaleFactor = Math.min(W, H) / 1080.0;
    var easing = T.motionStyle || "snappy";

    var comp = aeCreateComp({
      name: bp.compName,
      width: W,
      height: H,
      duration: DUR,
      frameRate: FPS,
      bgColor: T.background || "#090D16"
    });
    comp.motionBlur = true;

    // =========================================================================
    // 1. ANIMATED BACKGROUND CANVAS + TECH GRID + AMBIENT BRAND GLOW ORBS
    // =========================================================================
    var bgSolid = comp.layers.addSolid(aeHexToRgb(T.background || "#090D16"), "BG_Canvas", W, H, 1.0, DUR);
    try {
      var ramp = bgSolid.property("ADBE Effect Parade").addProperty("ADBE Ramp");
      if (ramp) {
        ramp.property("ADBE Ramp-0001").setValue([W * 0.5, 0]);
        ramp.property("ADBE Ramp-0002").setValue(aeHexToRgb(T.background || "#090D16"));
        ramp.property("ADBE Ramp-0003").setValue([W * 0.5, H]);
        ramp.property("ADBE Ramp-0004").setValue(aeHexToRgb(T.backgroundSecondary || T.surface || "#111827"));
      }
    } catch (e) {}

    // Subtle Grid Lines
    var gridSpacing = Math.round(135 * scaleFactor);
    var gridLayer = comp.layers.addShape();
    gridLayer.name = "BG_Tech_Grid";
    var gridRoot = gridLayer.property("ADBE Root Vectors Group");
    var gridGrp = gridRoot.addProperty("ADBE Vector Group");
    gridGrp.name = "Grid Lines";
    var gridVecs = gridGrp.property("ADBE Vectors Group");

    for (var gx = -W / 2; gx <= W / 2; gx += gridSpacing) {
      var vPathGrp = gridVecs.addProperty("ADBE Vector Shape - Group");
      var vShape = new Shape();
      vShape.vertices = [[gx, -H / 2], [gx, H / 2]];
      vShape.closed = false;
      vPathGrp.property("ADBE Vector Shape").setValue(vShape);
    }
    for (var gy = -H / 2; gy <= H / 2; gy += gridSpacing) {
      var hPathGrp = gridVecs.addProperty("ADBE Vector Shape - Group");
      var hShape = new Shape();
      hShape.vertices = [[-W / 2, gy], [W / 2, gy]];
      hShape.closed = false;
      hPathGrp.property("ADBE Vector Shape").setValue(hShape);
    }
    var gridStroke = gridGrp.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
    gridStroke.property("ADBE Vector Stroke Color").setValue(aeHexToRgb(T.surfaceBorder || T.primary || "#334155"));
    gridStroke.property("ADBE Vector Stroke Width").setValue(Math.max(1, Math.round(1.5 * scaleFactor)));
    gridLayer.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H / 2]);
    gridLayer.property("ADBE Transform Group").property("ADBE Opacity").setValue(12);

    // Ambient Floating Brand Glow Orbs
    var orb1 = aeCreateShapeEllipse(comp, {
      name: "BG_Glow_Primary",
      size: Math.round(620 * scaleFactor),
      fillColor: T.primary || "#38BDF8",
      fillOpacity: 16,
      position: [W * 0.2, H * 0.22]
    });
    try {
      var blur1 = orb1.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
      if (blur1) blur1.property("ADBE Gaussian Blur 2-0001").setValue(180 * scaleFactor);
    } catch (e) {}
    aeAnimateProp(orb1.property("ADBE Transform Group").property("ADBE Position"), [
      { time: 0, value: [W * 0.2, H * 0.22] },
      { time: DUR * 0.5, value: [W * 0.78, H * 0.35] },
      { time: DUR, value: [W * 0.25, H * 0.20] }
    ], "smooth");

    var orb2 = aeCreateShapeEllipse(comp, {
      name: "BG_Glow_Secondary",
      size: Math.round(560 * scaleFactor),
      fillColor: T.secondary || "#818CF8",
      fillOpacity: 14,
      position: [W * 0.82, H * 0.78]
    });
    try {
      var blur2 = orb2.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
      if (blur2) blur2.property("ADBE Gaussian Blur 2-0001").setValue(180 * scaleFactor);
    } catch (e) {}
    aeAnimateProp(orb2.property("ADBE Transform Group").property("ADBE Position"), [
      { time: 0, value: [W * 0.82, H * 0.78] },
      { time: DUR * 0.5, value: [W * 0.25, H * 0.68] },
      { time: DUR, value: [W * 0.80, H * 0.78] }
    ], "smooth");

    // Top Progress Bar across full duration
    var progLine = aeCreateShapePath(comp, {
      name: "UI_Timeline_Progress",
      vertices: [[60 * scaleFactor, 54 * scaleFactor], [W - 60 * scaleFactor, 54 * scaleFactor]],
      strokeColor: T.primary || "#38BDF8",
      strokeWidth: Math.round(8 * scaleFactor),
      trimPaths: {
        start: 0,
        end: 0,
        endKeyframes: [
          { time: 0, value: 0 },
          { time: DUR, value: 100 }
        ]
      },
      easingStyle: "linear"
    });

    // Helper to apply smooth entrance & exit to any layer within a scene beat
    function animateBeatLayer(layer, tIn, tOut, targetPos, mode, delay) {
      var d = (typeof delay === "number") ? delay : 0;
      var sIn = Math.min(tOut - 0.1, tIn + d);
      var enterDur = Math.min(0.55, (tOut - sIn) * 0.35);
      var exitDur = Math.min(0.35, (tOut - sIn) * 0.22);
      layer.inPoint = tIn;
      layer.outPoint = tOut;
      layer.motionBlur = true;

      var tr = layer.property("ADBE Transform Group");
      var op = tr.property("ADBE Opacity");
      var sc = tr.property("ADBE Scale");
      var pos = tr.property("ADBE Position");

      if (mode === "pop") {
        aeAnimateProp(sc, [
          { time: sIn, value: [0, 0, 100] },
          { time: sIn + enterDur * 0.72, value: [106, 106, 100] },
          { time: sIn + enterDur, value: [100, 100, 100] }
        ], easing);
        aeAnimateProp(op, [
          { time: sIn, value: 0 },
          { time: sIn + enterDur * 0.45, value: 100 },
          { time: tOut - exitDur, value: 100 },
          { time: tOut, value: 0 }
        ], "smooth");
      } else if (mode === "slide-up") {
        aeAnimateProp(pos, [
          { time: sIn, value: [targetPos[0], targetPos[1] + 85 * scaleFactor] },
          { time: sIn + enterDur, value: [targetPos[0], targetPos[1]] },
          { time: tOut - exitDur, value: [targetPos[0], targetPos[1]] },
          { time: tOut, value: [targetPos[0], targetPos[1] - 45 * scaleFactor] }
        ], easing);
        aeAnimateProp(op, [
          { time: sIn, value: 0 },
          { time: sIn + enterDur * 0.55, value: 100 },
          { time: tOut - exitDur, value: 100 },
          { time: tOut, value: 0 }
        ], "smooth");
      } else {
        aeAnimateProp(op, [
          { time: sIn, value: 0 },
          { time: sIn + enterDur * 0.6, value: 100 },
          { time: tOut - exitDur, value: 100 },
          { time: tOut, value: 0 }
        ], "smooth");
      }
    }

    // Helper to build a Kicker Badge Pill + Header at top of a scene beat
    function buildSceneHeader(sceneIdx, tIn, tOut, badgeText, titleText, subtitleText, headerY) {
      var curY = headerY;
      if (badgeText) {
        var pillW = Math.max(260 * scaleFactor, (String(badgeText).length * 22 + 80) * scaleFactor);
        var pillH = Math.round(58 * scaleFactor);
        var badgeBg = aeCreateShapeRect(comp, {
          name: "S" + sceneIdx + "_Badge_BG",
          width: pillW,
          height: pillH,
          roundness: pillH / 2,
          fillColor: T.surface || "#1E293B",
          strokeColor: T.primary || "#38BDF8",
          strokeWidth: Math.round(2.5 * scaleFactor),
          position: [W / 2, curY]
        });
        animateBeatLayer(badgeBg, tIn, tOut, [W / 2, curY], "pop", 0.02);

        var badgeTxt = aeCreateText(comp, {
          name: "S" + sceneIdx + "_Badge_Text",
          text: String(badgeText).toUpperCase(),
          fontSize: Math.round(24 * scaleFactor),
          color: T.primary || "#38BDF8",
          font: T.fontHeading || "Arial-BoldMT",
          tracking: 120,
          alignment: "CENTER",
          position: [W / 2, curY]
        });
        animateBeatLayer(badgeTxt, tIn, tOut, [W / 2, curY], "pop", 0.05);
        curY += Math.round(92 * scaleFactor);
      }

      if (titleText) {
        var hdrTxt = aeCreateText(comp, {
          name: "S" + sceneIdx + "_Header",
          text: String(titleText),
          fontSize: Math.round(64 * scaleFactor),
          color: T.textPrimary || "#F8FAFC",
          font: T.fontHeading || "Arial-BoldMT",
          alignment: "CENTER",
          position: [W / 2, curY]
        });
        animateBeatLayer(hdrTxt, tIn, tOut, [W / 2, curY], "slide-up", 0.08);
        curY += Math.round(74 * scaleFactor);
      }

      if (subtitleText) {
        var subTxt = aeCreateText(comp, {
          name: "S" + sceneIdx + "_Subheader",
          text: String(subtitleText),
          fontSize: Math.round(32 * scaleFactor),
          color: T.textSecondary || "#94A3B8",
          font: T.fontBody || "ArialMT",
          alignment: "CENTER",
          position: [W / 2, curY]
        });
        animateBeatLayer(subTxt, tIn, tOut, [W / 2, curY], "slide-up", 0.14);
        curY += Math.round(64 * scaleFactor);
      }
      return curY;
    }

    // =========================================================================
    // 2. COMPILE EACH SCENE BEAT IN THE STORYBOARD
    // =========================================================================
    var createdSceneCount = 0;

    for (var s = 0; s < bp.scenes.length; s++) {
      var sc = bp.scenes[s];
      var sIdx = s + 1;
      var tIn = Number(sc.startTime || 0);
      var tOut = Number(sc.endTime || DUR);
      var sType = String(sc.type || "hero-title").toLowerCase();
      createdSceneCount++;

      // -----------------------------------------------------------------------
      // SCENE TYPE A: HERO TITLE / HOOK BEAT
      // -----------------------------------------------------------------------
      if (sType === "hero-title") {
        var centerY = H * 0.46;

        // Hero Background Accent Card
        var heroCardW = W * 0.86;
        var heroCardH = isVertical ? H * 0.36 : H * 0.56;
        var heroCard = aeCreateShapeRect(comp, {
          name: "S" + sIdx + "_Hero_Card",
          width: heroCardW,
          height: heroCardH,
          roundness: Number(T.cornerRadius || 32) * scaleFactor,
          fillColor: T.surface || "#1E293B",
          fillOpacity: 88,
          strokeColor: T.surfaceBorder || T.primary || "#38BDF8",
          strokeWidth: Math.round(3 * scaleFactor),
          position: [W / 2, centerY]
        });
        animateBeatLayer(heroCard, tIn, tOut, [W / 2, centerY], "pop", 0.0);

        if (sc.badge) {
          var bY = centerY - heroCardH * 0.30;
          var bPillW = Math.max(280 * scaleFactor, (String(sc.badge).length * 24 + 90) * scaleFactor);
          var bPill = aeCreateShapeRect(comp, {
            name: "S" + sIdx + "_Kicker_Pill",
            width: bPillW,
            height: Math.round(58 * scaleFactor),
            roundness: Math.round(29 * scaleFactor),
            fillColor: T.primary || "#38BDF8",
            fillOpacity: 22,
            strokeColor: T.primary || "#38BDF8",
            strokeWidth: 2,
            position: [W / 2, bY]
          });
          animateBeatLayer(bPill, tIn, tOut, [W / 2, bY], "pop", 0.08);

          var bTxt = aeCreateText(comp, {
            name: "S" + sIdx + "_Kicker_Text",
            text: String(sc.badge).toUpperCase(),
            fontSize: Math.round(25 * scaleFactor),
            color: T.primary || "#38BDF8",
            font: T.fontHeading || "Arial-BoldMT",
            tracking: 140,
            alignment: "CENTER",
            position: [W / 2, bY]
          });
          animateBeatLayer(bTxt, tIn, tOut, [W / 2, bY], "pop", 0.10);
        }

        var mainTitle = aeCreateText(comp, {
          name: "S" + sIdx + "_Hero_Title",
          text: String(sc.title || "MOTION REPORT"),
          fontSize: Math.round(82 * scaleFactor),
          color: T.textPrimary || "#F8FAFC",
          font: T.fontHeading || "Arial-BoldMT",
          alignment: "CENTER",
          position: [W / 2, centerY - 12 * scaleFactor]
        });
        animateBeatLayer(mainTitle, tIn, tOut, [W / 2, centerY - 12 * scaleFactor], "slide-up", 0.14);

        // Animated Accent Divider Line
        var divY = centerY + 76 * scaleFactor;
        var divLine = aeCreateShapePath(comp, {
          name: "S" + sIdx + "_Hero_Divider",
          vertices: [[W * 0.32, divY], [W * 0.68, divY]],
          strokeColor: T.accent || T.primary || "#38BDF8",
          strokeWidth: Math.round(6 * scaleFactor),
          trimPaths: {
            start: 0,
            end: 0,
            endKeyframes: [
              { time: tIn + 0.18, value: 0 },
              { time: tIn + 0.72, value: 100 }
            ]
          },
          inPoint: tIn,
          outPoint: tOut
        });
        animateBeatLayer(divLine, tIn, tOut, [0, 0], "fade", 0.18);

        if (sc.subtitle) {
          var subY = centerY + 135 * scaleFactor;
          var subLayer = aeCreateText(comp, {
            name: "S" + sIdx + "_Hero_Subtitle",
            text: String(sc.subtitle),
            fontSize: Math.round(36 * scaleFactor),
            color: T.textSecondary || "#94A3B8",
            font: T.fontBody || "ArialMT",
            alignment: "CENTER",
            position: [W / 2, subY]
          });
          animateBeatLayer(subLayer, tIn, tOut, [W / 2, subY], "slide-up", 0.22);
        }
      }

      // -----------------------------------------------------------------------
      // SCENE TYPE B: STAT COUNTER + OPTIONAL PROGRESS RING BEAT
      // -----------------------------------------------------------------------
      else if (sType === "stat-counter") {
        var topY = isVertical ? H * 0.20 : H * 0.18;
        buildSceneHeader(sIdx, tIn, tOut, sc.badge || "KEY METRIC", sc.label || "GROWTH", sc.sublabel || "", topY);

        var ringCenterY = isVertical ? H * 0.54 : H * 0.58;
        var ringSize = Math.round((isVertical ? 520 : 420) * scaleFactor);

        var statCard = aeCreateShapeRect(comp, {
          name: "S" + sIdx + "_Stat_Card",
          width: W * 0.84,
          height: isVertical ? H * 0.44 : H * 0.54,
          roundness: Number(T.cornerRadius || 32) * scaleFactor,
          fillColor: T.surface || "#1E293B",
          fillOpacity: 88,
          strokeColor: T.surfaceBorder || "#334155",
          strokeWidth: 2,
          position: [W / 2, ringCenterY]
        });
        animateBeatLayer(statCard, tIn, tOut, [W / 2, ringCenterY], "pop", 0.08);

        if (sc.showProgressRing !== false) {
          var trackRing = aeCreateShapeEllipse(comp, {
            name: "S" + sIdx + "_Ring_Track",
            size: ringSize,
            fill: false,
            strokeColor: T.surfaceBorder || "#334155",
            strokeWidth: Math.round(30 * scaleFactor),
            position: [W / 2, ringCenterY]
          });
          animateBeatLayer(trackRing, tIn, tOut, [W / 2, ringCenterY], "pop", 0.12);

          var pct = Math.min(100, Math.max(5, Number(sc.ringPercent || sc.value || 80)));
          var activeRing = aeCreateShapeEllipse(comp, {
            name: "S" + sIdx + "_Ring_Progress",
            size: ringSize,
            fill: false,
            strokeColor: T.primary || "#38BDF8",
            strokeWidth: Math.round(32 * scaleFactor),
            rotation: -90,
            trimPaths: {
              start: 0,
              end: 0,
              endKeyframes: [
                { time: tIn + 0.2, value: 0 },
                { time: Math.min(tOut - 0.3, tIn + 1.6), value: pct }
              ]
            },
            position: [W / 2, ringCenterY]
          });
          animateBeatLayer(activeRing, tIn, tOut, [W / 2, ringCenterY], "fade", 0.15);
        }

        var counterLayer = aeCreateCounter(comp, {
          name: "S" + sIdx + "_Big_Counter",
          startValue: 0,
          endValue: Number(sc.value || 100),
          startTime: tIn + 0.15,
          endTime: Math.min(tOut - 0.3, tIn + 1.6),
          decimals: Number(sc.decimals || 0),
          prefix: sc.prefix || "",
          suffix: sc.suffix || "",
          fontSize: Math.round(112 * scaleFactor),
          color: T.textPrimary || "#F8FAFC",
          font: T.fontHeading || "Arial-BoldMT",
          position: [W / 2, ringCenterY],
          inPoint: tIn,
          outPoint: tOut
        });
        animateBeatLayer(counterLayer, tIn, tOut, [W / 2, ringCenterY], "pop", 0.15);
      }

      // -----------------------------------------------------------------------
      // SCENE TYPE C: KPI GRID (2 TO 4 STAGGERED METRIC CARDS)
      // -----------------------------------------------------------------------
      else if (sType === "kpi-grid") {
        var kpiTop = isVertical ? H * 0.16 : H * 0.15;
        var afterHdrY = buildSceneHeader(sIdx, tIn, tOut, sc.badge || "HIGHLIGHTS", sc.title || "KEY METRICS", sc.subtitle || "", kpiTop);

        var items = sc.items || [];
        var count = Math.min(4, items.length);
        var cardColors = [T.primary || "#38BDF8", T.secondary || "#818CF8", T.accent || "#F43F5E", T.success || "#10B981"];

        var cardW = W * 0.84;
        var availH = H - afterHdrY - (120 * scaleFactor);
        var gapY = Math.round(32 * scaleFactor);
        var cardH = Math.min(Math.round(310 * scaleFactor), Math.floor((availH - gapY * (count - 1)) / Math.max(1, count)));

        for (var k = 0; k < count; k++) {
          var item = items[k];
          var stagger = 0.12 + k * 0.14;
          var cy = afterHdrY + cardH / 2 + k * (cardH + gapY);
          var cColor = item.color || cardColors[k % cardColors.length];

          var cardLayer = aeCreateShapeRect(comp, {
            name: "S" + sIdx + "_KPI_Card_" + (k + 1),
            width: cardW,
            height: cardH,
            roundness: Number(T.cornerRadius || 28) * scaleFactor,
            fillColor: T.surface || "#1E293B",
            fillOpacity: 92,
            strokeColor: cColor,
            strokeWidth: Math.round(3 * scaleFactor),
            position: [W / 2, cy]
          });
          animateBeatLayer(cardLayer, tIn, tOut, [W / 2, cy], "slide-up", stagger);

          // Left Accent Bar inside KPI Card
          var accentStripX = (W - cardW) / 2 + 26 * scaleFactor;
          var stripLayer = aeCreateShapeRect(comp, {
            name: "S" + sIdx + "_KPI_Accent_" + (k + 1),
            width: Math.round(12 * scaleFactor),
            height: cardH * 0.62,
            roundness: Math.round(6 * scaleFactor),
            fillColor: cColor,
            position: [accentStripX, cy]
          });
          animateBeatLayer(stripLayer, tIn, tOut, [accentStripX, cy], "pop", stagger + 0.05);

          // Animated Counter Value
          var numY = cy - cardH * 0.12;
          var kpiCounter = aeCreateCounter(comp, {
            name: "S" + sIdx + "_KPI_Val_" + (k + 1),
            startValue: 0,
            endValue: Number(item.value || 0),
            startTime: tIn + stagger + 0.05,
            endTime: Math.min(tOut - 0.3, tIn + stagger + 1.35),
            decimals: Number(item.decimals || 0),
            prefix: item.prefix || "",
            suffix: item.suffix || "",
            fontSize: Math.round(78 * scaleFactor),
            color: cColor,
            font: T.fontHeading || "Arial-BoldMT",
            alignment: "CENTER",
            position: [W / 2, numY],
            inPoint: tIn,
            outPoint: tOut
          });
          animateBeatLayer(kpiCounter, tIn, tOut, [W / 2, numY], "pop", stagger + 0.06);

          // Metric Label
          var lblY = cy + cardH * 0.25;
          var kpiLbl = aeCreateText(comp, {
            name: "S" + sIdx + "_KPI_Label_" + (k + 1),
            text: String(item.label || ("Metric " + (k + 1))).toUpperCase(),
            fontSize: Math.round(28 * scaleFactor),
            color: T.textSecondary || "#94A3B8",
            font: T.fontHeading || "Arial-BoldMT",
            tracking: 80,
            alignment: "CENTER",
            position: [W / 2, lblY]
          });
          animateBeatLayer(kpiLbl, tIn, tOut, [W / 2, lblY], "slide-up", stagger + 0.10);
        }
      }

      // -----------------------------------------------------------------------
      // SCENE TYPE D: ANIMATED BAR CHART BEAT
      // -----------------------------------------------------------------------
      else if (sType === "bar-chart") {
        var bTop = isVertical ? H * 0.15 : H * 0.14;
        var chartStartY = buildSceneHeader(sIdx, tIn, tOut, sc.badge || "COMPARISON", sc.title || "DATA BREAKDOWN", sc.subtitle || "", bTop);

        var bars = sc.items || [];
        var numBars = Math.min(6, bars.length);
        var maxVal = 1;
        for (var m = 0; m < numBars; m++) {
          if (Number(bars[m].value) > maxVal) maxVal = Number(bars[m].value);
        }

        var chartCardW = W * 0.86;
        var chartCardH = H - chartStartY - (110 * scaleFactor);
        var chartCenterY = chartStartY + chartCardH / 2;

        var chartContainer = aeCreateShapeRect(comp, {
          name: "S" + sIdx + "_BarChart_Container",
          width: chartCardW,
          height: chartCardH,
          roundness: Number(T.cornerRadius || 28) * scaleFactor,
          fillColor: T.surface || "#1E293B",
          fillOpacity: 88,
          strokeColor: T.surfaceBorder || "#334155",
          strokeWidth: 2,
          position: [W / 2, chartCenterY]
        });
        animateBeatLayer(chartContainer, tIn, tOut, [W / 2, chartCenterY], "pop", 0.05);

        var padInnerX = 56 * scaleFactor;
        var barAreaLeft = (W - chartCardW) / 2 + padInnerX;
        var barMaxW = chartCardW - padInnerX * 2;
        var rowHeight = (chartCardH - 80 * scaleFactor) / Math.max(1, numBars);
        var barThickness = Math.min(Math.round(52 * scaleFactor), Math.round(rowHeight * 0.38));
        var palette = [T.primary || "#38BDF8", T.secondary || "#818CF8", T.accent || "#F43F5E", T.success || "#10B981", T.warning || "#F59E0B"];

        for (var b = 0; b < numBars; b++) {
          var bItem = bars[b];
          var bDelay = 0.14 + b * 0.12;
          var rowY = (chartStartY + 55 * scaleFactor) + b * rowHeight + rowHeight * 0.45;
          var bColor = bItem.color || palette[b % palette.length];
          var ratio = Math.max(0.06, Math.min(1.0, Number(bItem.value || 0) / maxVal));

          // Category Label (Top-Left above bar)
          var lblPos = [barAreaLeft, rowY - barThickness * 0.95];
          var barLabel = aeCreateText(comp, {
            name: "S" + sIdx + "_Bar_Label_" + (b + 1),
            text: String(bItem.label || ("Category " + (b + 1))),
            fontSize: Math.round(30 * scaleFactor),
            color: T.textPrimary || "#F8FAFC",
            font: T.fontHeading || "Arial-BoldMT",
            alignment: "LEFT",
            centerAnchor: false,
            position: lblPos
          });
          animateBeatLayer(barLabel, tIn, tOut, lblPos, "slide-up", bDelay);

          // Value Counter (Top-Right above bar)
          var valPos = [barAreaLeft + barMaxW, rowY - barThickness * 0.95];
          var barCounter = aeCreateCounter(comp, {
            name: "S" + sIdx + "_Bar_Value_" + (b + 1),
            startValue: 0,
            endValue: Number(bItem.value || 0),
            startTime: tIn + bDelay + 0.05,
            endTime: Math.min(tOut - 0.3, tIn + bDelay + 1.25),
            decimals: Number(bItem.decimals || 0),
            prefix: bItem.prefix || "",
            suffix: bItem.suffix || "",
            fontSize: Math.round(32 * scaleFactor),
            color: bColor,
            font: T.fontHeading || "Arial-BoldMT",
            alignment: "RIGHT",
            position: [valPos[0] - 40 * scaleFactor, valPos[1] - 12 * scaleFactor],
            inPoint: tIn,
            outPoint: tOut
          });
          animateBeatLayer(barCounter, tIn, tOut, [valPos[0] - 40 * scaleFactor, valPos[1] - 12 * scaleFactor], "fade", bDelay);

          // Track Line
          var trackBar = aeCreateShapePath(comp, {
            name: "S" + sIdx + "_Bar_Track_" + (b + 1),
            vertices: [[barAreaLeft, rowY + 12 * scaleFactor], [barAreaLeft + barMaxW, rowY + 12 * scaleFactor]],
            strokeColor: T.background || "#090D16",
            strokeWidth: barThickness
          });
          animateBeatLayer(trackBar, tIn, tOut, [0, 0], "fade", bDelay);

          // Animated Fill Bar via Trim Paths
          var fillBar = aeCreateShapePath(comp, {
            name: "S" + sIdx + "_Bar_Fill_" + (b + 1),
            vertices: [[barAreaLeft, rowY + 12 * scaleFactor], [barAreaLeft + barMaxW, rowY + 12 * scaleFactor]],
            strokeColor: bColor,
            strokeWidth: barThickness,
            trimPaths: {
              start: 0,
              end: 0,
              endKeyframes: [
                { time: tIn + bDelay + 0.05, value: 0 },
                { time: Math.min(tOut - 0.25, tIn + bDelay + 1.25), value: Math.round(ratio * 100) }
              ]
            }
          });
          animateBeatLayer(fillBar, tIn, tOut, [0, 0], "fade", bDelay);
        }
      }

      // -----------------------------------------------------------------------
      // SCENE TYPE E: ANIMATED LINE / TREND CHART BEAT
      // -----------------------------------------------------------------------
      else if (sType === "line-chart") {
        var lTop = isVertical ? H * 0.15 : H * 0.14;
        var lChartTopY = buildSceneHeader(sIdx, tIn, tOut, sc.badge || "TREND", sc.title || "GROWTH TRAJECTORY", sc.subtitle || "", lTop);

        var pts = sc.items || sc.points || [];
        var nPts = pts.length;
        var lCardW = W * 0.86;
        var lCardH = H - lChartTopY - (120 * scaleFactor);
        var lCardCY = lChartTopY + lCardH / 2;

        var lCard = aeCreateShapeRect(comp, {
          name: "S" + sIdx + "_LineChart_Card",
          width: lCardW,
          height: lCardH,
          roundness: Number(T.cornerRadius || 28) * scaleFactor,
          fillColor: T.surface || "#1E293B",
          fillOpacity: 88,
          strokeColor: T.surfaceBorder || "#334155",
          strokeWidth: 2,
          position: [W / 2, lCardCY]
        });
        animateBeatLayer(lCard, tIn, tOut, [W / 2, lCardCY], "pop", 0.05);

        if (nPts >= 2) {
          var minV = Number(pts[0].value || 0);
          var maxV = Number(pts[0].value || 100);
          for (var pIdx = 1; pIdx < nPts; pIdx++) {
            var v = Number(pts[pIdx].value || 0);
            if (v < minV) minV = v;
            if (v > maxV) maxV = v;
          }
          if (maxV === minV) maxV = minV + 10;

          var plotLeft = (W - lCardW) / 2 + 80 * scaleFactor;
          var plotRight = (W + lCardW) / 2 - 80 * scaleFactor;
          var plotTop = lChartTopY + 110 * scaleFactor;
          var plotBottom = lChartTopY + lCardH - 110 * scaleFactor;

          var vertices = [];
          for (var p = 0; p < nPts; p++) {
            var px = plotLeft + (p / (nPts - 1)) * (plotRight - plotLeft);
            var normY = (Number(pts[p].value || 0) - minV) / (maxV - minV);
            var py = plotBottom - normY * (plotBottom - plotTop);
            vertices.push([px, py]);
          }

          var trendLine = aeCreateShapePath(comp, {
            name: "S" + sIdx + "_Trend_Line",
            vertices: vertices,
            strokeColor: T.primary || "#38BDF8",
            strokeWidth: Math.round(12 * scaleFactor),
            trimPaths: {
              start: 0,
              end: 0,
              endKeyframes: [
                { time: tIn + 0.2, value: 0 },
                { time: Math.min(tOut - 0.35, tIn + 1.5), value: 100 }
              ]
            }
          });
          animateBeatLayer(trendLine, tIn, tOut, [0, 0], "fade", 0.15);

          for (var d = 0; d < nPts; d++) {
            var vtx = vertices[d];
            var dotDelay = 0.2 + (d / Math.max(1, nPts - 1)) * 1.1;
            var dot = aeCreateShapeEllipse(comp, {
              name: "S" + sIdx + "_Node_" + (d + 1),
              size: Math.round(28 * scaleFactor),
              fillColor: T.accent || "#F43F5E",
              strokeColor: T.textPrimary || "#FFFFFF",
              strokeWidth: Math.round(5 * scaleFactor),
              position: vtx
            });
            animateBeatLayer(dot, tIn, tOut, vtx, "pop", dotDelay);

            var ptValTxt = aeCreateText(comp, {
              name: "S" + sIdx + "_Node_Val_" + (d + 1),
              text: (pts[d].prefix || "") + String(pts[d].value) + (pts[d].suffix || ""),
              fontSize: Math.round(28 * scaleFactor),
              color: T.textPrimary || "#F8FAFC",
              font: T.fontHeading || "Arial-BoldMT",
              position: [vtx[0], vtx[1] - 42 * scaleFactor]
            });
            animateBeatLayer(ptValTxt, tIn, tOut, [vtx[0], vtx[1] - 42 * scaleFactor], "pop", dotDelay + 0.05);

            var ptLblTxt = aeCreateText(comp, {
              name: "S" + sIdx + "_Node_Lbl_" + (d + 1),
              text: String(pts[d].label || ("P" + (d + 1))),
              fontSize: Math.round(24 * scaleFactor),
              color: T.textSecondary || "#94A3B8",
              font: T.fontBody || "ArialMT",
              position: [vtx[0], plotBottom + 52 * scaleFactor]
            });
            animateBeatLayer(ptLblTxt, tIn, tOut, [vtx[0], plotBottom + 52 * scaleFactor], "fade", dotDelay);
          }
        }
      }

      // -----------------------------------------------------------------------
      // SCENE TYPE F: CALLOUT LIST / KEY TAKEAWAYS BEAT
      // -----------------------------------------------------------------------
      else if (sType === "callout-list") {
        var cTop = isVertical ? H * 0.16 : H * 0.15;
        var listStartY = buildSceneHeader(sIdx, tIn, tOut, sc.badge || "TAKEAWAYS", sc.title || "KEY INSIGHTS", sc.subtitle || "", cTop);

        var cItems = sc.items || [];
        var cCount = Math.min(5, cItems.length);
        var cCardW = W * 0.84;
        var cAvailH = H - listStartY - 110 * scaleFactor;
        var cGap = 26 * scaleFactor;
        var cCardH = Math.min(Math.round(220 * scaleFactor), Math.floor((cAvailH - cGap * (cCount - 1)) / Math.max(1, cCount)));

        for (var ci = 0; ci < cCount; ci++) {
          var cItem = cItems[ci];
          var cDelay = 0.12 + ci * 0.14;
          var cY = listStartY + cCardH / 2 + ci * (cCardH + cGap);

          var cCard = aeCreateShapeRect(comp, {
            name: "S" + sIdx + "_Callout_Card_" + (ci + 1),
            width: cCardW,
            height: cCardH,
            roundness: Number(T.cornerRadius || 24) * scaleFactor,
            fillColor: T.surface || "#1E293B",
            fillOpacity: 92,
            strokeColor: T.surfaceBorder || "#334155",
            strokeWidth: 2,
            position: [W / 2, cY]
          });
          animateBeatLayer(cCard, tIn, tOut, [W / 2, cY], "slide-up", cDelay);

          var cTitle = aeCreateText(comp, {
            name: "S" + sIdx + "_Callout_Title_" + (ci + 1),
            text: String(cItem.title || cItem.label || ("Point " + (ci + 1))),
            fontSize: Math.round(38 * scaleFactor),
            color: T.textPrimary || "#F8FAFC",
            font: T.fontHeading || "Arial-BoldMT",
            alignment: "CENTER",
            position: [W / 2, cItem.subtitle ? (cY - 22 * scaleFactor) : cY]
          });
          animateBeatLayer(cTitle, tIn, tOut, [W / 2, cItem.subtitle ? (cY - 22 * scaleFactor) : cY], "slide-up", cDelay + 0.05);

          if (cItem.subtitle) {
            var cSub = aeCreateText(comp, {
              name: "S" + sIdx + "_Callout_Sub_" + (ci + 1),
              text: String(cItem.subtitle),
              fontSize: Math.round(26 * scaleFactor),
              color: T.textSecondary || "#94A3B8",
              font: T.fontBody || "ArialMT",
              alignment: "CENTER",
              position: [W / 2, cY + 30 * scaleFactor]
            });
            animateBeatLayer(cSub, tIn, tOut, [W / 2, cY + 30 * scaleFactor], "slide-up", cDelay + 0.08);
          }
        }
      }

      // -----------------------------------------------------------------------
      // SCENE TYPE G: OUTRO / CTA LOCKUP BEAT
      // -----------------------------------------------------------------------
      else if (sType === "outro-cta") {
        var oCenterY = H * 0.46;
        var oCardW = W * 0.84;
        var oCardH = isVertical ? H * 0.36 : H * 0.54;

        var oCard = aeCreateShapeRect(comp, {
          name: "S" + sIdx + "_Outro_Card",
          width: oCardW,
          height: oCardH,
          roundness: Number(T.cornerRadius || 32) * scaleFactor,
          fillColor: T.surface || "#1E293B",
          fillOpacity: 92,
          strokeColor: T.primary || "#38BDF8",
          strokeWidth: Math.round(3 * scaleFactor),
          position: [W / 2, oCenterY]
        });
        animateBeatLayer(oCard, tIn, tOut, [W / 2, oCenterY], "pop", 0.0);

        var oTitle = aeCreateText(comp, {
          name: "S" + sIdx + "_Outro_Title",
          text: String(sc.title || "THANK YOU"),
          fontSize: Math.round(70 * scaleFactor),
          color: T.textPrimary || "#F8FAFC",
          font: T.fontHeading || "Arial-BoldMT",
          alignment: "CENTER",
          position: [W / 2, oCenterY - 90 * scaleFactor]
        });
        animateBeatLayer(oTitle, tIn, tOut, [W / 2, oCenterY - 90 * scaleFactor], "slide-up", 0.08);

        if (sc.subtitle) {
          var oSub = aeCreateText(comp, {
            name: "S" + sIdx + "_Outro_Subtitle",
            text: String(sc.subtitle),
            fontSize: Math.round(34 * scaleFactor),
            color: T.textSecondary || "#94A3B8",
            font: T.fontBody || "ArialMT",
            alignment: "CENTER",
            position: [W / 2, oCenterY - 10 * scaleFactor]
          });
          animateBeatLayer(oSub, tIn, tOut, [W / 2, oCenterY - 10 * scaleFactor], "slide-up", 0.14);
        }

        var ctaY = oCenterY + 115 * scaleFactor;
        var ctaW = Math.max(380 * scaleFactor, (String(sc.ctaText || "LEARN MORE").length * 26 + 110) * scaleFactor);
        var ctaH = Math.round(88 * scaleFactor);

        var ctaBtn = aeCreateShapeRect(comp, {
          name: "S" + sIdx + "_CTA_Button",
          width: ctaW,
          height: ctaH,
          roundness: ctaH / 2,
          fillColor: T.primary || "#38BDF8",
          position: [W / 2, ctaY]
        });
        animateBeatLayer(ctaBtn, tIn, tOut, [W / 2, ctaY], "pop", 0.20);

        var ctaLbl = aeCreateText(comp, {
          name: "S" + sIdx + "_CTA_Text",
          text: String(sc.ctaText || "FOLLOW FOR MORE").toUpperCase(),
          fontSize: Math.round(30 * scaleFactor),
          color: "#090D16",
          font: T.fontHeading || "Arial-BoldMT",
          tracking: 90,
          alignment: "CENTER",
          position: [W / 2, ctaY]
        });
        animateBeatLayer(ctaLbl, tIn, tOut, [W / 2, ctaY], "pop", 0.24);
      }
    }

    return {
      compId: comp.id,
      compName: comp.name,
      width: comp.width,
      height: comp.height,
      duration: comp.duration,
      frameRate: comp.frameRate,
      themeUsed: T.name,
      scenesBuilt: createdSceneCount,
      totalLayers: comp.numLayers
    };
  `;
}
