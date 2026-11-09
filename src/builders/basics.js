/**
 * Builders for Foundational After Effects Operations (Use Case 1).
 * Every builder returns pure ES3 ExtendScript code ready for `executeInAfterEffects()`.
 */

export function resolveDimensions({ aspectRatio, resolution = "FHD", width, height }) {
  if (width && height) {
    return { width: Number(width), height: Number(height) };
  }
  const baseShort = resolution.toUpperCase() === "4K" ? 2160 : resolution.toUpperCase() === "HD" ? 720 : 1080;
  const baseLong = resolution.toUpperCase() === "4K" ? 3840 : resolution.toUpperCase() === "HD" ? 1280 : 1920;

  const ratio = String(aspectRatio || "9:16").trim();
  if (ratio === "9:16" || ratio.toLowerCase() === "vertical" || ratio.toLowerCase() === "reels") {
    return { width: baseShort, height: baseLong };
  }
  if (ratio === "16:9" || ratio.toLowerCase() === "horizontal" || ratio.toLowerCase() === "youtube") {
    return { width: baseLong, height: baseShort };
  }
  if (ratio === "1:1" || ratio.toLowerCase() === "square") {
    return { width: baseShort, height: baseShort };
  }
  if (ratio === "4:5" || ratio.toLowerCase() === "portrait") {
    return { width: baseShort, height: Math.round((baseShort * 5) / 4) };
  }
  return { width: baseShort, height: baseLong };
}

export function buildInspectProjectScript(compName) {
  const cfg = JSON.stringify({ compName: compName || null });
  return `
    var cfg = ${cfg};
    aeEnsureProject();
    var comps = [];
    for (var i = 1; i <= app.project.numItems; i++) {
      var it = app.project.item(i);
      if (it instanceof CompItem) {
        comps.push({
          id: it.id,
          name: it.name,
          width: it.width,
          height: it.height,
          duration: it.duration,
          frameRate: it.frameRate,
          numLayers: it.numLayers
        });
      }
    }

    var activeComp = aeGetComp(cfg.compName);
    var activeCompDetail = null;
    if (activeComp) {
      var layers = [];
      for (var l = 1; l <= activeComp.numLayers; l++) {
        var lyr = activeComp.layer(l);
        var tr = lyr.property("ADBE Transform Group");
        var pos = tr ? tr.property("ADBE Position").value : null;
        var scale = tr ? tr.property("ADBE Scale").value : null;
        var opacity = tr ? tr.property("ADBE Opacity").value : null;
        layers.push({
          index: lyr.index,
          name: lyr.name,
          enabled: lyr.enabled,
          inPoint: lyr.inPoint,
          outPoint: lyr.outPoint,
          threeDLayer: lyr.threeDLayer,
          parentIndex: lyr.parent ? lyr.parent.index : null,
          position: pos,
          scale: scale,
          opacity: opacity
        });
      }
      activeCompDetail = {
        id: activeComp.id,
        name: activeComp.name,
        width: activeComp.width,
        height: activeComp.height,
        duration: activeComp.duration,
        frameRate: activeComp.frameRate,
        layers: layers
      };
    }

    return {
      projectFile: app.project.file ? app.project.file.fsName : "Untitled Project",
      numItems: app.project.numItems,
      compositions: comps,
      activeComp: activeCompDetail
    };
  `;
}

export function buildCreateCompScript(params) {
  const dims = resolveDimensions(params);
  const cfg = JSON.stringify({
    name: params.name || "Motion Graphics Comp",
    width: dims.width,
    height: dims.height,
    duration: Number(params.duration) || 15,
    frameRate: Number(params.frameRate) || 30,
    bgColor: params.bgColor || "#090D16",
    addSolidBackground: params.addSolidBackground !== false,
    gradientBottomColor: params.gradientBottomColor || null
  });

  return `
    var cfg = ${cfg};
    var comp = aeCreateComp(cfg);

    if (cfg.addSolidBackground) {
      var bgSolid = comp.layers.addSolid(aeHexToRgb(cfg.bgColor), "BG_Canvas", comp.width, comp.height, 1.0, comp.duration);
      bgSolid.moveToEnd();
      if (cfg.gradientBottomColor) {
        try {
          var ramp = bgSolid.property("ADBE Effect Parade").addProperty("ADBE Ramp");
          if (ramp) {
            ramp.property("ADBE Ramp-0001").setValue([comp.width / 2, 0]);
            ramp.property("ADBE Ramp-0002").setValue(aeHexToRgb(cfg.bgColor));
            ramp.property("ADBE Ramp-0003").setValue([comp.width / 2, comp.height]);
            ramp.property("ADBE Ramp-0004").setValue(aeHexToRgb(cfg.gradientBottomColor));
          }
        } catch (e) {}
      }
      bgSolid.locked = false;
    }

    return {
      compId: comp.id,
      name: comp.name,
      width: comp.width,
      height: comp.height,
      duration: comp.duration,
      frameRate: comp.frameRate
    };
  `;
}

export function buildAddTextLayerScript(params) {
  const cfg = JSON.stringify(params);
  return `
    var cfg = ${cfg};
    var comp = aeGetComp(cfg.compName);
    if (!comp) throw new Error("No composition found. Create a composition first.");

    var pos = cfg.position || [comp.width / 2, comp.height / 2];
    var inPt = (typeof cfg.inPoint === "number") ? cfg.inPoint : 0;
    var outPt = (typeof cfg.outPoint === "number") ? cfg.outPoint : comp.duration;

    var layer = aeCreateText(comp, {
      name: cfg.name || cfg.text,
      text: cfg.text,
      fontSize: cfg.fontSize || 72,
      color: cfg.color || "#FFFFFF",
      strokeColor: cfg.strokeColor,
      strokeWidth: cfg.strokeWidth,
      font: cfg.font || "Arial-BoldMT",
      tracking: cfg.tracking || 0,
      leading: cfg.leading,
      alignment: cfg.alignment || "CENTER",
      boxSize: cfg.boxSize,
      position: pos,
      inPoint: inPt,
      outPoint: outPt,
      motionBlur: cfg.motionBlur !== false
    });

    // Optional Auto-Sized Background Pill Card behind text
    var bgLayerIndex = null;
    if (cfg.backgroundBox) {
      var rect = layer.sourceRectAtTime(inPt + 0.1, false);
      var padX = Number(cfg.backgroundBox.paddingX || 48);
      var padY = Number(cfg.backgroundBox.paddingY || 28);
      var pill = aeCreateShapeRect(comp, {
        name: layer.name + "_BG",
        width: Math.max(120, rect.width + padX * 2),
        height: Math.max(60, rect.height + padY * 2),
        roundness: (typeof cfg.backgroundBox.roundness === "number") ? cfg.backgroundBox.roundness : 28,
        fillColor: cfg.backgroundBox.color || "#1E293B",
        fillOpacity: cfg.backgroundBox.opacity || 95,
        strokeColor: cfg.backgroundBox.borderColor || null,
        strokeWidth: cfg.backgroundBox.borderWidth || 2,
        position: pos,
        inPoint: inPt,
        outPoint: outPt
      });
      pill.moveAfter(layer);
      pill.parent = layer;
      pill.property("ADBE Transform Group").property("ADBE Position").setValue([rect.left + rect.width / 2, rect.top + rect.height / 2]);
      bgLayerIndex = pill.index;
    }

    // Optional Entrance & Exit Animation Preset
    var anim = String(cfg.entranceAnimation || "none").toLowerCase();
    var animDur = Number(cfg.animationDuration || 0.55);
    var tr = layer.property("ADBE Transform Group");

    if (anim === "pop" || anim === "overshoot") {
      aeAnimateProp(tr.property("ADBE Scale"), [
        { time: inPt, value: [0, 0, 100] },
        { time: inPt + animDur * 0.7, value: [108, 108, 100] },
        { time: inPt + animDur, value: [100, 100, 100] }
      ], "snappy");
      aeAnimateProp(tr.property("ADBE Opacity"), [
        { time: inPt, value: 0 },
        { time: inPt + animDur * 0.4, value: 100 }
      ], "smooth");
      if (anim === "overshoot") {
        tr.property("ADBE Scale").expression = aeGetInertialBounceExpr(0.05, 2.2, 5.5);
      }
    } else if (anim === "slide-up") {
      aeAnimateProp(tr.property("ADBE Position"), [
        { time: inPt, value: [pos[0], pos[1] + 90] },
        { time: inPt + animDur, value: [pos[0], pos[1]] }
      ], "snappy");
      aeAnimateProp(tr.property("ADBE Opacity"), [
        { time: inPt, value: 0 },
        { time: inPt + animDur * 0.65, value: 100 }
      ], "smooth");
    } else if (anim === "slide-down") {
      aeAnimateProp(tr.property("ADBE Position"), [
        { time: inPt, value: [pos[0], pos[1] - 90] },
        { time: inPt + animDur, value: [pos[0], pos[1]] }
      ], "snappy");
      aeAnimateProp(tr.property("ADBE Opacity"), [
        { time: inPt, value: 0 },
        { time: inPt + animDur * 0.65, value: 100 }
      ], "smooth");
    } else if (anim === "fade") {
      aeAnimateProp(tr.property("ADBE Opacity"), [
        { time: inPt, value: 0 },
        { time: inPt + animDur, value: 100 }
      ], "smooth");
    }

    if (cfg.exitFade && outPt < comp.duration) {
      var opProp = tr.property("ADBE Opacity");
      var exitStart = Math.max(inPt + animDur + 0.1, outPt - 0.35);
      var k1 = opProp.addKey(exitStart);
      opProp.setValueAtKey(k1, 100);
      var k2 = opProp.addKey(outPt);
      opProp.setValueAtKey(k2, 0);
    }

    return {
      layerIndex: layer.index,
      layerName: layer.name,
      backgroundLayerIndex: bgLayerIndex
    };
  `;
}

export function buildAddShapeLayerScript(params) {
  const cfg = JSON.stringify(params);
  return `
    var cfg = ${cfg};
    var comp = aeGetComp(cfg.compName);
    if (!comp) throw new Error("No composition found.");

    var shapeType = String(cfg.shapeType || "rect").toLowerCase();
    var inPt = (typeof cfg.inPoint === "number") ? cfg.inPoint : 0;
    var outPt = (typeof cfg.outPoint === "number") ? cfg.outPoint : comp.duration;
    var pos = cfg.position || [comp.width / 2, comp.height / 2];

    var layer;
    if (shapeType === "ellipse" || shapeType === "circle" || shapeType === "ring") {
      layer = aeCreateShapeEllipse(comp, {
        name: cfg.name || "Circle Shape",
        width: cfg.width || cfg.size || 300,
        height: cfg.height || cfg.size || 300,
        fillColor: shapeType === "ring" ? null : (cfg.fillColor || "#38BDF8"),
        fill: shapeType === "ring" ? false : (cfg.fill !== false),
        fillOpacity: cfg.fillOpacity,
        strokeColor: cfg.strokeColor || (shapeType === "ring" ? "#38BDF8" : null),
        strokeWidth: cfg.strokeWidth || (shapeType === "ring" ? 24 : 0),
        trimPaths: cfg.trimPaths,
        position: pos,
        rotation: cfg.rotation,
        opacity: cfg.opacity,
        inPoint: inPt,
        outPoint: outPt,
        motionBlur: cfg.motionBlur !== false
      });
    } else if (shapeType === "path" || shapeType === "line") {
      layer = aeCreateShapePath(comp, {
        name: cfg.name || "Vector Path",
        vertices: cfg.vertices || [[0, 0], [300, 0]],
        inTangents: cfg.inTangents,
        outTangents: cfg.outTangents,
        closed: cfg.closed || false,
        fillColor: cfg.fillColor || null,
        strokeColor: cfg.strokeColor || "#38BDF8",
        strokeWidth: cfg.strokeWidth || 8,
        trimPaths: cfg.trimPaths,
        position: cfg.position || [0, 0],
        anchorPoint: cfg.anchorPoint || [0, 0],
        opacity: cfg.opacity,
        inPoint: inPt,
        outPoint: outPt
      });
    } else {
      layer = aeCreateShapeRect(comp, {
        name: cfg.name || "Rect Card",
        width: cfg.width || 500,
        height: cfg.height || 300,
        roundness: (typeof cfg.roundness === "number") ? cfg.roundness : 28,
        fillColor: cfg.fillColor || "#1E293B",
        fill: cfg.fill !== false,
        fillOpacity: cfg.fillOpacity,
        strokeColor: cfg.strokeColor || null,
        strokeWidth: cfg.strokeWidth || 0,
        position: pos,
        anchorOffset: cfg.anchorOffset,
        rotation: cfg.rotation,
        opacity: cfg.opacity,
        inPoint: inPt,
        outPoint: outPt,
        motionBlur: cfg.motionBlur !== false
      });
    }

    var anim = String(cfg.entranceAnimation || "none").toLowerCase();
    var animDur = Number(cfg.animationDuration || 0.55);
    var tr = layer.property("ADBE Transform Group");

    if (anim === "pop" || anim === "overshoot") {
      aeAnimateProp(tr.property("ADBE Scale"), [
        { time: inPt, value: [0, 0, 100] },
        { time: inPt + animDur * 0.75, value: [105, 105, 100] },
        { time: inPt + animDur, value: [100, 100, 100] }
      ], "snappy");
      if (anim === "overshoot") {
        tr.property("ADBE Scale").expression = aeGetInertialBounceExpr(0.045, 2.0, 5.5);
      }
    } else if (anim === "slide-up") {
      aeAnimateProp(tr.property("ADBE Position"), [
        { time: inPt, value: [pos[0], pos[1] + 100] },
        { time: inPt + animDur, value: [pos[0], pos[1]] }
      ], "snappy");
      aeAnimateProp(tr.property("ADBE Opacity"), [
        { time: inPt, value: 0 },
        { time: inPt + animDur * 0.6, value: 100 }
      ], "smooth");
    } else if (anim === "scale-x") {
      aeAnimateProp(tr.property("ADBE Scale"), [
        { time: inPt, value: [0, 100, 100] },
        { time: inPt + animDur, value: [100, 100, 100] }
      ], "snappy");
    } else if (anim === "scale-y") {
      aeAnimateProp(tr.property("ADBE Scale"), [
        { time: inPt, value: [100, 0, 100] },
        { time: inPt + animDur, value: [100, 100, 100] }
      ], "snappy");
    }

    return {
      layerIndex: layer.index,
      layerName: layer.name
    };
  `;
}

export function buildAnimateLayerScript(params) {
  const cfg = JSON.stringify(params);
  return `
    var cfg = ${cfg};
    var comp = aeGetComp(cfg.compName);
    if (!comp) throw new Error("No composition found.");
    var layer = aeFindLayer(comp, cfg.layerNameOrIndex);
    if (!layer) throw new Error("Layer not found: " + cfg.layerNameOrIndex);

    var tr = layer.property("ADBE Transform Group");
    var propMap = {
      "position": "ADBE Position",
      "scale": "ADBE Scale",
      "rotation": "ADBE Rotate Z",
      "opacity": "ADBE Opacity",
      "anchorPoint": "ADBE Anchor Point"
    };

    var targetProp = null;
    var propKey = String(cfg.property || "position");
    if (propMap[propKey]) {
      targetProp = tr.property(propMap[propKey]);
    } else {
      targetProp = layer.property(propKey) || tr.property(propKey);
    }

    if (!targetProp) throw new Error("Property not found on layer: " + propKey);

    if (cfg.keyframes && cfg.keyframes.length > 0) {
      aeAnimateProp(targetProp, cfg.keyframes, cfg.easingStyle || "snappy");
    }

    if (cfg.overshootBounce) {
      targetProp.expression = aeGetInertialBounceExpr(cfg.bounceAmp || 0.05, cfg.bounceFreq || 2.2, cfg.bounceDecay || 5.5);
    } else if (typeof cfg.expression === "string") {
      targetProp.expression = cfg.expression;
    }

    return {
      layerIndex: layer.index,
      layerName: layer.name,
      property: targetProp.name,
      numKeys: targetProp.numKeys
    };
  `;
}

export function buildApplyEffectOrLayerActionScript(params) {
  const cfg = JSON.stringify(params);
  return `
    var cfg = ${cfg};
    var comp = aeGetComp(cfg.compName);
    if (!comp) throw new Error("No composition found.");
    var layer = aeFindLayer(comp, cfg.layerNameOrIndex);
    if (!layer) throw new Error("Layer not found: " + cfg.layerNameOrIndex);

    var appliedEffects = [];
    if (cfg.effectMatchNameOrName) {
      var fxParade = layer.property("ADBE Effect Parade");
      var fx = fxParade.addProperty(cfg.effectMatchNameOrName);
      if (fx && cfg.effectProperties) {
        for (var propName in cfg.effectProperties) {
          if (cfg.effectProperties.hasOwnProperty(propName)) {
            try {
              var p = fx.property(propName);
              if (p) {
                var val = cfg.effectProperties[propName];
                if (typeof val === "string" && val.charAt(0) === "#") {
                  p.setValue(aeHexToRgb(val));
                } else {
                  p.setValue(val);
                }
              }
            } catch (eProp) {}
          }
        }
      }
      if (fx) appliedEffects.push(fx.name);
    }

    if (cfg.addDropShadow) {
      try {
        var ds = layer.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
        if (ds) {
          ds.property("ADBE Drop Shadow-0001").setValue(aeHexToRgb(cfg.addDropShadow.color || "#000000"));
          ds.property("ADBE Drop Shadow-0002").setValue(Number(cfg.addDropShadow.opacity || 110));
          ds.property("ADBE Drop Shadow-0003").setValue(Number(cfg.addDropShadow.direction || 180));
          ds.property("ADBE Drop Shadow-0004").setValue(Number(cfg.addDropShadow.distance || 18));
          ds.property("ADBE Drop Shadow-0005").setValue(Number(cfg.addDropShadow.softness || 45));
          appliedEffects.push("Drop Shadow");
        }
      } catch (e) {}
    }

    if (cfg.addGlow) {
      try {
        var gl = layer.property("ADBE Effect Parade").addProperty("ADBE Glo2");
        if (gl) {
          gl.property("ADBE Glo2-0002").setValue(Number(cfg.addGlow.threshold || 60));
          gl.property("ADBE Glo2-0003").setValue(Number(cfg.addGlow.radius || 45));
          gl.property("ADBE Glo2-0004").setValue(Number(cfg.addGlow.intensity || 0.8));
          appliedEffects.push("Glow");
        }
      } catch (e) {}
    }

    if (cfg.parentLayerNameOrIndex) {
      var parentLyr = aeFindLayer(comp, cfg.parentLayerNameOrIndex);
      if (parentLyr) layer.parent = parentLyr;
    }

    return {
      layerIndex: layer.index,
      layerName: layer.name,
      appliedEffects: appliedEffects
    };
  `;
}

export function buildRenderCompFrameScript(params) {
  const cfg = JSON.stringify({
    compName: params.compName || null,
    timeSeconds: Number(params.timeSeconds || 1.5),
    outputPath: String(params.outputPath).replace(/\\/g, "/")
  });
  return `
    var cfg = ${cfg};
    var comp = aeGetComp(cfg.compName);
    if (!comp) throw new Error("No composition found to render.");

    var outFile = new File(cfg.outputPath);
    var t = Math.max(0, Math.min(comp.duration - (1 / comp.frameRate), cfg.timeSeconds));
    comp.time = t;
    comp.saveFrameToPng(t, outFile);

    return {
      compName: comp.name,
      timeSeconds: t,
      outputPath: outFile.fsName,
      exists: outFile.exists
    };
  `;
}

