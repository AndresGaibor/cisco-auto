// ============================================================================
// Core Runtime - All logic resides here
// ============================================================================

declare var ipc: any;
declare var dprint: (msg: string) => void;
declare var DEV_DIR: string;

// State
var fm: any = null;
var fw: any = null;
var snapshotInterval: any = null;
var COMMAND_FILE = DEV_DIR + "/command.json";
var EVENTS_FILE = DEV_DIR + "/events.ndjson";
var STATE_FILE = DEV_DIR + "/state.json";

// ============================================================================
// Event Helpers
// ============================================================================

function appendEvent(evt: any) {
  try {
    var line = JSON.stringify(evt) + "\n";
    var prev = fm.fileExists(EVENTS_FILE) ? fm.getFileContents(EVENTS_FILE) : "";
    fm.writePlainTextToFile(EVENTS_FILE, prev + line);
  } catch (e) {
    dprint("[Runtime ERROR] Failed to append event: " + String(e));
  }
}

function writeState(state: any) {
  try {
    fm.writePlainTextToFile(STATE_FILE, JSON.stringify(state));
  } catch (e) {
    dprint("[Runtime ERROR] Failed to write state: " + String(e));
  }
}

// ============================================================================
// Snapshot
// ============================================================================

function generateSnapshot() {
  try {
    var net = ipc.network();
    var count = net.getDeviceCount();
    var devices: any = {};
    
    for (var i = 0; i < count; i++) {
      var device = net.getDeviceAt(i);
      var name = device.getName();
      var portCount = device.getPortCount();
      var ports = [];
      
      for (var p = 0; p < portCount; p++) {
        try {
          var port = device.getPortAt(p);
          var portInfo: any = { name: port.getName() };
          try { portInfo.ipAddress = port.getIpAddress(); } catch(e1) {}
          try { portInfo.subnetMask = port.getSubnetMask(); } catch(e2) {}
          try { portInfo.macAddress = port.getMacAddress(); } catch(e3) {}
          ports.push(portInfo);
        } catch (e) {}
      }
      
      devices[name] = {
        name: name,
        model: device.getModel(),
        type: device.getType(),
        power: device.getPower(),
        ports: ports
      };
    }
    
    return {
      version: "2.0",
      timestamp: Date.now(),
      devices: devices,
      metadata: { deviceCount: count }
    };
  } catch (e) {
    return null;
  }
}

function triggerSnapshot() {
  var snapshot = generateSnapshot();
  if (snapshot) {
    writeState(snapshot);
    appendEvent({ type: "snapshot", ts: Date.now(), count: snapshot.metadata.deviceCount });
  }
}

// ============================================================================
// Command Handlers
// ============================================================================

var HANDLERS: Record<string, (p: any) => any> = {
  "listDevices": function(p) {
    return { ok: true, data: [1, 2, 3] };
  },
  "snapshot": function(p) {
    triggerSnapshot();
    return { ok: true };
  }
  // ... other handlers could be added here
};

function runCommand() {
  try {
    if (!fm.fileExists(COMMAND_FILE)) return;
    var cmd = JSON.parse(fm.getFileContents(COMMAND_FILE));
    if (!cmd || !cmd.payload) return;

    var handler = HANDLERS[cmd.payload.type];
    var result: any;
    
    if (handler) {
      result = handler(cmd.payload);
    } else {
      result = { ok: false, error: "Unknown command: " + cmd.payload.type };
    }

    appendEvent({
      type: "result",
      ts: Date.now(),
      id: cmd.id,
      ok: result.ok !== false,
      value: result
    });
  } catch (e: any) {
    appendEvent({ type: "error", ts: Date.now(), message: String(e) });
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

// Compatibility export for old loaders
export function executeRuntime(payload: any, ipcRef: any, dprintRef: any) {
  var handler = HANDLERS[payload.type];
  var res: any;
  if (handler) {
    res = handler(payload);
  } else {
    res = { ok: false, error: "Unknown command: " + payload.type };
  }
  return JSON.stringify(res);
}

export function start() {
  dprint("[Runtime] Starting...");
  fm = ipc.systemFileManager();
  fw = fm.getFileWatcher();
  
  // Watch for commands
  fw.addPath(COMMAND_FILE);
  fw.registerEvent("fileChanged", null, function(src: any, args: any) {
    if (args.path === COMMAND_FILE) {
      setTimeout(runCommand, 50);
    }
  });
  
  // Initial snapshot
  triggerSnapshot();
  
  // Periodic snapshot
  snapshotInterval = setInterval(triggerSnapshot, 10000);
}

export function stop() {
  dprint("[Runtime] Stopping...");
  if (snapshotInterval) clearInterval(snapshotInterval);
}
