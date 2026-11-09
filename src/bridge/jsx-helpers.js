/**
 * Core ES3 ExtendScript Runtime Helpers injected into every After Effects execution.
 * Strictly follows Adobe ExtendScript (ES3) rules: var only, no arrow functions,
 * safe ADBE matchNames, automatic KeyframeEase dimensionality matching, and sourceRectAtTime centering.
 */

export const JSX_RUNTIME_HELPERS = `
// --- ES3 JSON Serializer Polyfill ---
function aeEscapeStr(str) {
  return String(str)
    .replace(/\\\\/g, "\\\\\\\\")
    .replace(/"/g, '\\\\"')
    .replace(/\\r/g, "\\\\r")
    .replace(/\\n/g, "\\\\n")
    .replace(/\\t/g, "\\\\t");
}

function aeJsonStringify(val) {
  if (val === null || typeof val === "undefined") return "null";
  if (typeof val === "number") return isFinite(val) ? String(val) : "null";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "string") return '"' + aeEscapeStr(val) + '"';
  if (val instanceof Array) {
    var arrParts = [];
    for (var i = 0; i < val.length; i++) {
      arrParts.push(aeJsonStringify(val[i]));
    }
    return "[" + arrParts.join(",") + "]";
  }
  if (typeof val === "object") {
    var objParts = [];
    for (var k in val) {
      if (val.hasOwnProperty(k) && typeof val[k] !== "function" && typeof val[k] !== "undefined") {
        objParts.push('"' + aeEscapeStr(k) + '":' + aeJsonStringify(val[k]));
      }
    }
    return "{" + objParts.join(",") + "}";
  }
  return '""';
}

// --- Color Conversion (Hex / RGB -> AE Normalized [r, g, b] 0..1) ---
function aeHexToRgb(colorInput) {
  if (!colorInput) return [1, 1, 1];
  if (colorInput instanceof Array) {
    if (colorInput.length >= 3) {
      if (colorInput[0] > 1 || colorInput[1] > 1 || colorInput[2] > 1) {
        return [colorInput[0] / 255, colorInput[1] / 255, colorInput[2] / 255];
      }
      return [colorInput[0], colorInput[1], colorInput[2]];
    }
    return [1, 1, 1];
  }
  var hex = String(colorInput).replace(/^#/, "").replace(/[^0-9a-fA-F]/g, "");
  if (hex.length === 3) {
    hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
  }
  if (hex.length !== 6) return [1, 1, 1];
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

// --- Project & Composition Lookup ---
function aeEnsureProject() {
  if (!app.project) {
    app.newProject();
  }
  return app.project;
}

function aeGetComp(compNameOrId) {
  aeEnsureProject();
  if (compNameOrId) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem) {
        if (item.name === compNameOrId || item.id === Number(compNameOrId)) {
          return item;
        }
      }
    }
  }
  if (app.project.activeItem && app.project.activeItem instanceof CompItem) {
    return app.project.activeItem;
  }
  for (var j = 1; j <= app.project.numItems; j++) {
    if (app.project.item(j) instanceof CompItem) {
      return app.project.item(j);
    }
  }
  return null;
}

function aeFindLayer(comp, nameOrIndex) {
  if (!comp) return null;
  if (typeof nameOrIndex === "number") {
    if (nameOrIndex >= 1 && nameOrIndex <= comp.numLayers) {
      return comp.layer(nameOrIndex);
    }
    return null;
  }
  for (var i = 1; i <= comp.numLayers; i++) {
    var lyr = comp.layer(i);
    if (lyr.name === String(nameOrIndex)) return lyr;
  }
  var asNum = parseInt(nameOrIndex, 10);
  if (!isNaN(asNum) && asNum >= 1 && asNum <= comp.numLayers) {
    return comp.layer(asNum);
  }
  return null;
}

// --- Anchor Point Centering using sourceRectAtTime ---
function aeCenterAnchor(layer, sampleTime, targetPos) {
  try {
    var t = (typeof sampleTime === "number") ? sampleTime : (layer.inPoint + 0.05);
    var rect = layer.sourceRectAtTime(t, false);
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      if (targetPos) {
        layer.property("ADBE Transform Group").property("ADBE Position").setValue(targetPos);
      }
      return;
    }
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var tr = layer.property("ADBE Transform Group");
    var apProp = tr.property("ADBE Anchor Point");
    var posProp = tr.property("ADBE Position");
    var curAp = apProp.value;
    var curPos = posProp.value;
    if (apProp.numKeys === 0) {
      apProp.setValue([cx, cy, 0]);
    }
    if (targetPos && posProp.numKeys === 0) {
      posProp.setValue(targetPos);
    } else if (posProp.numKeys === 0) {
      posProp.setValue([curPos[0] + (cx - curAp[0]), curPos[1] + (cy - curAp[1]), curPos[2] || 0]);
    }
  } catch (e) {}
}

// --- Keyframe Easing & Animation Helpers ---
function aeApplyEaseAtKey(prop, keyIndex, influenceIn, influenceOut, speedIn, speedOut) {
  try {
    var infIn = Math.max(0.1, Math.min(100, (typeof influenceIn === "number") ? influenceIn : 75));
    var infOut = Math.max(0.1, Math.min(100, (typeof influenceOut === "number") ? influenceOut : 75));
    var spdIn = (typeof speedIn === "number") ? speedIn : 0;
    var spdOut = (typeof speedOut === "number") ? speedOut : 0;

    prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);

    var easeInObj = new KeyframeEase(spdIn, infIn);
    var easeOutObj = new KeyframeEase(spdOut, infOut);
    var valType = prop.propertyValueType;

    if (valType === PropertyValueType.TwoD) {
      prop.setTemporalEaseAtKey(keyIndex, [easeInObj, easeInObj], [easeOutObj, easeOutObj]);
    } else if (valType === PropertyValueType.ThreeD) {
      prop.setTemporalEaseAtKey(keyIndex, [easeInObj, easeInObj, easeInObj], [easeOutObj, easeOutObj, easeOutObj]);
    } else {
      prop.setTemporalEaseAtKey(keyIndex, [easeInObj], [easeOutObj]);
    }
  } catch (e) {}
}

function aeAnimateProp(prop, keyframes, easingStyle) {
  if (!prop || !keyframes || !keyframes.length) return;
  var defaultInfIn = 75;
  var defaultInfOut = 75;
  if (easingStyle === "snappy") {
    defaultInfIn = 85;
    defaultInfOut = 80;
  } else if (easingStyle === "smooth") {
    defaultInfIn = 60;
    defaultInfOut = 60;
  } else if (easingStyle === "dramatic") {
    defaultInfIn = 92;
    defaultInfOut = 85;
  } else if (easingStyle === "linear") {
    defaultInfIn = 0;
    defaultInfOut = 0;
  }

  var keyIndices = [];
  for (var i = 0; i < keyframes.length; i++) {
    var kf = keyframes[i];
    var kIdx = prop.addKey(kf.time);
    prop.setValueAtKey(kIdx, kf.value);
    keyIndices.push({ index: kIdx, kf: kf });
  }

  for (var j = 0; j < keyIndices.length; j++) {
    var item = keyIndices[j];
    var kIndex = j + 1;
    var kData = item.kf;
    if (kData.hold) {
      prop.setInterpolationTypeAtKey(kIndex, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
    } else if (easingStyle === "linear" && typeof kData.easeIn === "undefined" && typeof kData.easeOut === "undefined") {
      prop.setInterpolationTypeAtKey(kIndex, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    } else {
      var infIn = (typeof kData.easeIn === "number") ? kData.easeIn : defaultInfIn;
      var infOut = (typeof kData.easeOut === "number") ? kData.easeOut : defaultInfOut;
      aeApplyEaseAtKey(prop, kIndex, infIn, infOut, 0, 0);
    }
  }
}

function aeGetInertialBounceExpr(amp, freq, decay) {
  var a = (typeof amp === "number") ? amp : 0.055;
  var f = (typeof freq === "number") ? freq : 2.2;
  var d = (typeof decay === "number") ? decay : 5.5;
  return [
    "var n = 0;",
    "if (numKeys > 0) {",
    "  n = nearestKey(time).index;",
    "  if (key(n).time > time) n--;",
    "}",
    "if (n == 0) { value; } else {",
    "  var t = time - key(n).time;",
    "  if (n > 0 && t < 1.2) {",
    "    var v = velocityAtTime(key(n).time - thisComp.frameDuration/10);",
    "    value + v * " + a + " * Math.sin(" + f + " * t * 2 * Math.PI) / Math.exp(" + d + " * t);",
    "  } else { value; }",
    "}"
  ].join("\\n");
}

// --- High-Level Element Builders ---
function aeCreateComp(opts) {
  aeEnsureProject();
  var name = opts.name || "Main Composition";
  var width = Number(opts.width) || 1080;
  var height = Number(opts.height) || 1920;
  var pixelAspect = Number(opts.pixelAspect) || 1.0;
  var duration = Number(opts.duration) || 15.0;
  var frameRate = Number(opts.frameRate) || 30;
  var comp = app.project.items.addComp(name, width, height, pixelAspect, duration, frameRate);
  if (opts.bgColor) {
    comp.bgColor = aeHexToRgb(opts.bgColor);
  }
  try { comp.openInViewer(); } catch (e) {}
  return comp;
}

function aeSetLayerTiming(layer, opts) {
  if (typeof opts.inPoint === "number") layer.inPoint = opts.inPoint;
  if (typeof opts.outPoint === "number") layer.outPoint = opts.outPoint;
  if (typeof opts.startTime === "number") layer.startTime = opts.startTime;
  if (opts.motionBlur) {
    layer.motionBlur = true;
    if (layer.containingComp) layer.containingComp.motionBlur = true;
  }
  if (opts.threeDLayer) layer.threeDLayer = true;
}

function aeCreateText(comp, opts) {
  var layer;
  if (opts.boxSize && opts.boxSize.length === 2) {
    layer = comp.layers.addBoxText([Number(opts.boxSize[0]), Number(opts.boxSize[1])]);
  } else {
    layer = comp.layers.addText(String(typeof opts.text !== "undefined" ? opts.text : "Text"));
  }
  layer.name = opts.name || String(opts.text || "Text Layer").substring(0, 32);

  var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
  var textDoc = textProp.value;
  textDoc.text = String(typeof opts.text !== "undefined" ? opts.text : "Text");
  textDoc.fontSize = Number(opts.fontSize) || 64;
  textDoc.applyFill = true;
  textDoc.fillColor = aeHexToRgb(opts.color || opts.fillColor || "#FFFFFF");

  if (opts.strokeColor && opts.strokeWidth) {
    textDoc.applyStroke = true;
    textDoc.strokeColor = aeHexToRgb(opts.strokeColor);
    textDoc.strokeWidth = Number(opts.strokeWidth);
  } else {
    textDoc.applyStroke = false;
  }

  if (opts.font) {
    try { textDoc.font = String(opts.font); } catch (e) {}
  }

  if (typeof opts.tracking === "number") {
    textDoc.tracking = opts.tracking;
  }
  if (typeof opts.leading === "number") {
    try {
      textDoc.autoLeading = false;
      textDoc.leading = opts.leading;
    } catch (e) {}
  }

  var align = String(opts.alignment || opts.justification || "CENTER").toUpperCase();
  if (align === "LEFT") {
    textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;
  } else if (align === "RIGHT") {
    textDoc.justification = ParagraphJustification.RIGHT_JUSTIFY;
  } else {
    textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
  }

  textProp.setValue(textDoc);

  var pos = opts.position || [comp.width / 2, comp.height / 2];
  if (opts.centerAnchor !== false) {
    aeCenterAnchor(layer, opts.inPoint || 0, pos);
  } else {
    layer.property("ADBE Transform Group").property("ADBE Position").setValue(pos);
  }

  if (typeof opts.opacity === "number") {
    layer.property("ADBE Transform Group").property("ADBE Opacity").setValue(opts.opacity);
  }
  if (opts.scale) {
    var s = (typeof opts.scale === "number") ? [opts.scale, opts.scale, 100] : opts.scale;
    layer.property("ADBE Transform Group").property("ADBE Scale").setValue(s);
  }
  if (typeof opts.rotation === "number") {
    layer.property("ADBE Transform Group").property("ADBE Rotate Z").setValue(opts.rotation);
  }

  aeSetLayerTiming(layer, opts);
  return layer;
}

function aeCreateShapeRect(comp, opts) {
  var shapeLayer = comp.layers.addShape();
  shapeLayer.name = opts.name || "Rectangle Shape";

  var rootVectors = shapeLayer.property("ADBE Root Vectors Group");
  var grp = rootVectors.addProperty("ADBE Vector Group");
  grp.name = "Rect Group";
  var vectors = grp.property("ADBE Vectors Group");

  var rect = vectors.addProperty("ADBE Vector Shape - Rect");
  var w = Number(opts.width) || 400;
  var h = Number(opts.height) || 200;
  rect.property("ADBE Vector Rect Size").setValue([w, h]);
  if (typeof opts.roundness === "number") {
    rect.property("ADBE Vector Rect Roundness").setValue(opts.roundness);
  }
  if (opts.rectPosition) {
    rect.property("ADBE Vector Rect Position").setValue(opts.rectPosition);
  }

  if (opts.strokeColor && Number(opts.strokeWidth) > 0) {
    var stroke = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(aeHexToRgb(opts.strokeColor));
    stroke.property("ADBE Vector Stroke Width").setValue(Number(opts.strokeWidth));
    if (typeof opts.strokeOpacity === "number") {
      stroke.property("ADBE Vector Stroke Opacity").setValue(opts.strokeOpacity);
    }
    try { stroke.property("ADBE Vector Stroke Line Cap").setValue(2); } catch (e) {}
  }

  if (opts.fillColor !== null && opts.fill !== false) {
    var fill = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(aeHexToRgb(opts.fillColor || "#3B82F6"));
    if (typeof opts.fillOpacity === "number") {
      fill.property("ADBE Vector Fill Opacity").setValue(opts.fillOpacity);
    }
  }

  var pos = opts.position || [comp.width / 2, comp.height / 2];
  var tr = shapeLayer.property("ADBE Transform Group");
  if (opts.anchorOffset) {
    tr.property("ADBE Anchor Point").setValue(opts.anchorOffset);
  }
  tr.property("ADBE Position").setValue(pos);

  if (typeof opts.opacity === "number") {
    tr.property("ADBE Opacity").setValue(opts.opacity);
  }
  if (opts.scale) {
    var s = (typeof opts.scale === "number") ? [opts.scale, opts.scale, 100] : opts.scale;
    tr.property("ADBE Scale").setValue(s);
  }
  if (typeof opts.rotation === "number") {
    tr.property("ADBE Rotate Z").setValue(opts.rotation);
  }

  aeSetLayerTiming(shapeLayer, opts);
  return shapeLayer;
}

function aeCreateShapeEllipse(comp, opts) {
  var shapeLayer = comp.layers.addShape();
  shapeLayer.name = opts.name || "Ellipse Shape";

  var rootVectors = shapeLayer.property("ADBE Root Vectors Group");
  var grp = rootVectors.addProperty("ADBE Vector Group");
  grp.name = "Ellipse Group";
  var vectors = grp.property("ADBE Vectors Group");

  var ellipse = vectors.addProperty("ADBE Vector Shape - Ellipse");
  var w = Number(opts.width || opts.size || 300);
  var h = Number(opts.height || opts.size || 300);
  ellipse.property("ADBE Vector Ellipse Size").setValue([w, h]);

  if (opts.strokeColor && Number(opts.strokeWidth) > 0) {
    var stroke = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(aeHexToRgb(opts.strokeColor));
    stroke.property("ADBE Vector Stroke Width").setValue(Number(opts.strokeWidth));
    try { stroke.property("ADBE Vector Stroke Line Cap").setValue(2); } catch (e) {}
  }

  if (opts.fillColor && opts.fill !== false) {
    var fill = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(aeHexToRgb(opts.fillColor));
    if (typeof opts.fillOpacity === "number") {
      fill.property("ADBE Vector Fill Opacity").setValue(opts.fillOpacity);
    }
  }

  if (opts.trimPaths) {
    var trim = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Filter - Trim");
    if (typeof opts.trimPaths.start === "number") {
      trim.property("ADBE Vector Trim Start").setValue(opts.trimPaths.start);
    }
    if (typeof opts.trimPaths.end === "number") {
      trim.property("ADBE Vector Trim End").setValue(opts.trimPaths.end);
    }
    if (typeof opts.trimPaths.offset === "number") {
      trim.property("ADBE Vector Trim Offset").setValue(opts.trimPaths.offset);
    }
    if (opts.trimPaths.endKeyframes) {
      aeAnimateProp(trim.property("ADBE Vector Trim End"), opts.trimPaths.endKeyframes, opts.easingStyle || "snappy");
    }
  }

  var pos = opts.position || [comp.width / 2, comp.height / 2];
  var tr = shapeLayer.property("ADBE Transform Group");
  tr.property("ADBE Position").setValue(pos);
  if (typeof opts.opacity === "number") tr.property("ADBE Opacity").setValue(opts.opacity);
  if (typeof opts.rotation === "number") tr.property("ADBE Rotate Z").setValue(opts.rotation);

  aeSetLayerTiming(shapeLayer, opts);
  return shapeLayer;
}

function aeCreateShapePath(comp, opts) {
  var shapeLayer = comp.layers.addShape();
  shapeLayer.name = opts.name || "Path Shape";

  var rootVectors = shapeLayer.property("ADBE Root Vectors Group");
  var grp = rootVectors.addProperty("ADBE Vector Group");
  grp.name = "Path Group";
  var vectors = grp.property("ADBE Vectors Group");

  var pathGroup = vectors.addProperty("ADBE Vector Shape - Group");
  var myShape = new Shape();
  myShape.vertices = opts.vertices || [[0, 0], [200, 0]];
  if (opts.inTangents) myShape.inTangents = opts.inTangents;
  if (opts.outTangents) myShape.outTangents = opts.outTangents;
  myShape.closed = Boolean(opts.closed);
  pathGroup.property("ADBE Vector Shape").setValue(myShape);

  if (opts.strokeColor !== null) {
    var stroke = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(aeHexToRgb(opts.strokeColor || "#FFFFFF"));
    stroke.property("ADBE Vector Stroke Width").setValue(Number(opts.strokeWidth || 6));
    try {
      stroke.property("ADBE Vector Stroke Line Cap").setValue(2);
      stroke.property("ADBE Vector Stroke Line Join").setValue(2);
    } catch (e) {}
  }

  if (opts.fillColor) {
    var fill = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(aeHexToRgb(opts.fillColor));
    if (typeof opts.fillOpacity === "number") {
      fill.property("ADBE Vector Fill Opacity").setValue(opts.fillOpacity);
    }
  }

  if (opts.trimPaths) {
    var trim = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Filter - Trim");
    if (typeof opts.trimPaths.start === "number") {
      trim.property("ADBE Vector Trim Start").setValue(opts.trimPaths.start);
    }
    if (typeof opts.trimPaths.end === "number") {
      trim.property("ADBE Vector Trim End").setValue(opts.trimPaths.end);
    }
    if (opts.trimPaths.endKeyframes) {
      aeAnimateProp(trim.property("ADBE Vector Trim End"), opts.trimPaths.endKeyframes, opts.easingStyle || "snappy");
    }
  }

  var tr = shapeLayer.property("ADBE Transform Group");
  tr.property("ADBE Anchor Point").setValue(opts.anchorPoint || [0, 0]);
  tr.property("ADBE Position").setValue(opts.position || [0, 0]);
  if (typeof opts.opacity === "number") tr.property("ADBE Opacity").setValue(opts.opacity);

  aeSetLayerTiming(shapeLayer, opts);
  return shapeLayer;
}

function aeCreateCounter(comp, opts) {
  var startVal = Number(opts.startValue || 0);
  var endVal = Number(opts.endValue || 100);
  var startTime = Number(opts.startTime || 0);
  var endTime = Number(opts.endTime || 2.0);
  var decimals = Number(opts.decimals || 0);
  var prefix = aeEscapeStr(opts.prefix || "");
  var suffix = aeEscapeStr(opts.suffix || "");
  var useCommas = (opts.useCommas !== false);

  var layer = aeCreateText(comp, {
    name: opts.name || ("Counter " + (opts.prefix || "") + endVal + (opts.suffix || "")),
    text: (opts.prefix || "") + String(endVal) + (opts.suffix || ""),
    fontSize: opts.fontSize || 96,
    color: opts.color || "#FFFFFF",
    font: opts.font,
    alignment: opts.alignment || "CENTER",
    position: opts.position || [comp.width / 2, comp.height / 2],
    inPoint: opts.inPoint,
    outPoint: opts.outPoint
  });

  var exprLines = [
    "var t1 = " + startTime + ";",
    "var t2 = " + endTime + ";",
    "var v1 = " + startVal + ";",
    "var v2 = " + endVal + ";",
    "var p = clamp((time - t1) / Math.max(0.001, t2 - t1), 0, 1);",
    "var eased = 1 - Math.pow(1 - p, 3);",
    "var cur = v1 + (v2 - v1) * eased;",
    "var fixed = cur.toFixed(" + decimals + ");",
    "var parts = fixed.split('.');",
    useCommas ? "parts[0] = parts[0].replace(/\\\\B(?=(\\\\d{3})+(?!\\\\d))/g, ',');" : "",
    "var formatted = parts.join('.');",
    "'" + prefix + "' + formatted + '" + suffix + "';"
  ];

  var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
  textProp.expression = exprLines.join("\\n");
  return layer;
}
`;
