// =============================================================================
// AE-Antigravity-Bridge.jsx
// Dockable After Effects ScriptUI Panel for Google Antigravity MCP Integration
// Place in ScriptUI Panels and open via Window > AE-Antigravity-Bridge.jsx
// =============================================================================
#target aftereffects

(function(thisObj) {
  var BRIDGE_FOLDER_PATH = Folder.myDocuments.parent.fsName + "/.ae-antigravity-bridge";
  var bridgeFolder = new Folder(BRIDGE_FOLDER_PATH);

  $.global.__agBridgeRunning = true;
  $.global.__agTaskId = null;
  $.global.__agExecCount = 0;
  $.global.__agLogFn = null;
  $.global.__agStatusFn = null;

  function isFileSecurityEnabled() {
    try {
      return app.preferences.getPrefAsLong("Main Pref Section v2", "Pref_SCRIPTING_FILE_NETWORK_SECURITY") === 1;
    } catch (e) {
      return false;
    }
  }

  $.global.__agBridgePoll = function() {
    if (!$.global.__agBridgeRunning) return;

    try {
      var canWrite = isFileSecurityEnabled();
      if ($.global.__agStatusFn) {
        $.global.__agStatusFn(canWrite);
      }

      if (canWrite) {
        if (!bridgeFolder.exists) {
          try { bridgeFolder.create(); } catch (e) {}
        }
        // 1. Write heartbeat
        var hbFile = new File(BRIDGE_FOLDER_PATH + "/heartbeat.json");
        if (hbFile.open("w")) {
          hbFile.write('{"alive":true,"ts":' + (new Date().getTime()) + '}');
          hbFile.close();
        }
      }

      // 2. Check for queued command file (reading & evalFile works even before write pref is enabled)
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
        if (canWrite) {
          try { cmdFile.remove(); } catch (remErr) {}
        }
      }
    } catch (e) {}

    if ($.global.__agBridgeRunning) {
      $.global.__agTaskId = app.scheduleTask("$.global.__agBridgePoll()", 500, false);
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
    var secTxt = pal.add("statictext", undefined, "Checking Scripting File/Network Preference...");

    var btnGrp = pal.add("group");
    btnGrp.orientation = "row";
    btnGrp.alignChildren = ["fill", "center"];

    var toggleBtn = btnGrp.add("button", undefined, "Pause Bridge");
    var prefsBtn = btnGrp.add("button", undefined, "Scripting Prefs...");
    var clearBtn = btnGrp.add("button", undefined, "Clear Log");

    var logBox = pal.add("edittext", undefined, "Antigravity MCP Bridge Ready.\nBridge Path: " + BRIDGE_FOLDER_PATH, {
      multiline: true,
      readonly: true,
      scrolling: true
    });
    logBox.preferredSize.height = 160;

    $.global.__agLogFn = function(msg) {
      try {
        var now = new Date();
        var timeStr = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
        logBox.text = "[" + timeStr + "] " + msg + "\n" + logBox.text.substring(0, 2000);
      } catch (e) {}
    };

    $.global.__agStatusFn = function(canWrite) {
      try {
        if (canWrite) {
          secTxt.text = "File & Network Access: ENABLED (2-Way Readback Ready)";
        } else {
          secTxt.text = "Tip: Enable 'Allow Scripts to Write Files' in Scripting Prefs";
        }
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

    prefsBtn.onClick = function() {
      try {
        // Command ID 3131 opens Preferences > Scripting & Expressions in After Effects
        app.executeCommand(3131);
      } catch (e) {
        alert("Open Edit > Preferences > Scripting & Expressions and check 'Allow Scripts to Write Files and Access Network'.");
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

    $.global.__agBridgePoll();
    return pal;
  }

  buildUI(thisObj);
})(this);
