// =============================================================================
// AE-Antigravity-Bridge.jsx
// Dockable After Effects ScriptUI Panel for Google Antigravity MCP Integration
// Place in ScriptUI Panels and open via Window > AE-Antigravity-Bridge.jsx
// =============================================================================
#target aftereffects

(function(thisObj) {
  var BRIDGE_FOLDER_PATH = Folder.myDocuments.parent.fsName + "/.ae-antigravity-bridge";
  var bridgeFolder = new Folder(BRIDGE_FOLDER_PATH);
  if (!bridgeFolder.exists) {
    try { bridgeFolder.create(); } catch (e) {}
  }

  $.global.__agBridgeRunning = true;
  $.global.__agTaskId = null;
  $.global.__agExecCount = 0;
  $.global.__agLogFn = null;

  $.global.__agBridgePoll = function() {
    if (!$.global.__agBridgeRunning) return;

    try {
      // 1. Write heartbeat if security allows
      var hbFile = new File(BRIDGE_FOLDER_PATH + "/heartbeat.json");
      if (hbFile.open("w")) {
        hbFile.write('{"alive":true,"ts":' + (new Date().getTime()) + '}');
        hbFile.close();
      }

      // 2. Check for queued command file
      var cmdFile = new File(BRIDGE_FOLDER_PATH + "/next_command.jsx");
      if (cmdFile.exists) {
        $.global.__agExecCount++;
        if ($.global.__agLogFn) {
          $.global.__agLogFn("[#" + $.global.__agExecCount + "] Executing Antigravity MCP command...");
        }
        try {
          $.evalFile(cmdFile);
          if ($.global.__agLogFn) {
            $.global.__agLogFn("[#" + $.global.__agExecCount + "] Command completed.");
          }
        } catch (evalErr) {
          if ($.global.__agLogFn) {
            $.global.__agLogFn("[Error] " + evalErr.toString());
          }
        }
        try { cmdFile.remove(); } catch (remErr) {}
      }
    } catch (e) {}

    if ($.global.__agBridgeRunning) {
      $.global.__agTaskId = app.scheduleTask("$.global.__agBridgePoll()", 450, false);
    }
  };

  function buildUI(thisObj) {
    var pal = (thisObj instanceof Panel)
      ? thisObj
      : new Window("palette", "Antigravity AI MCP Bridge", undefined, { resizeable: true });

    pal.orientation = "column";
    pal.alignChildren = ["fill", "top"];
    pal.spacing = 8;
    pal.margins = 12;

    var headerGrp = pal.add("group");
    headerGrp.orientation = "row";
    headerGrp.alignChildren = ["left", "center"];
    var titleTxt = headerGrp.add("statictext", undefined, "Antigravity <-> After Effects MCP");
    titleTxt.graphics.font = ScriptUI.newFont("Arial", "BOLD", 13);

    var statusTxt = pal.add("statictext", undefined, "Status: Live Bridge Polling Active");

    var btnGrp = pal.add("group");
    btnGrp.orientation = "row";
    btnGrp.alignChildren = ["fill", "center"];

    var toggleBtn = btnGrp.add("button", undefined, "Pause Bridge");
    var clearBtn = btnGrp.add("button", undefined, "Clear Log");

    var logBox = pal.add("edittext", undefined, "Antigravity MCP Bridge Ready.\nBridge Path: " + BRIDGE_FOLDER_PATH, {
      multiline: true,
      readonly: true,
      scrolling: true
    });
    logBox.preferredSize.height = 180;

    $.global.__agLogFn = function(msg) {
      try {
        var now = new Date();
        var timeStr = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
        logBox.text = "[" + timeStr + "] " + msg + "\n" + logBox.text.substring(0, 2000);
      } catch (e) {}
    };

    toggleBtn.onClick = function() {
      $.global.__agBridgeRunning = !$.global.__agBridgeRunning;
      if ($.global.__agBridgeRunning) {
        toggleBtn.text = "Pause Bridge";
        statusTxt.text = "Status: Live Bridge Polling Active";
        $.global.__agBridgePoll();
      } else {
        toggleBtn.text = "Resume Bridge";
        statusTxt.text = "Status: Paused (CLI fallback still works)";
        if ($.global.__agTaskId) {
          try { app.cancelTask($.global.__agTaskId); } catch (e) {}
        }
      }
    };

    clearBtn.onClick = function() {
      logBox.text = "Log cleared.";
    };

    pal.onResizing = pal.onResize = function() {
      this.layout.resize();
    };

    if (pal instanceof Window) {
      pal.center();
      pal.show();
    } else {
      pal.layout.layout(true);
    }

    // Start polling loop
    $.global.__agBridgePoll();
    return pal;
  }

  buildUI(thisObj);
})(this);

