// ============================================================================
// Core Runtime - All logic resides here
// ============================================================================

// Type definitions are in pt-runtime.d.ts
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./pt-runtime.d.ts" />

// State
var fm: PTFileManager | null = null;
var fw: PTFileWatcher | null = null;
var snapshotInterval: number | null = null;
var COMMAND_FILE = DEV_DIR + "/command.json";
var EVENTS_FILE = DEV_DIR + "/events.ndjson";
var STATE_FILE = DEV_DIR + "/state.json";

// ============================================================================
// Event Helpers
// ============================================================================

function appendEvent(evt: PTEvent) {
  try {
    var line = JSON.stringify(evt) + "\n";
    var prev = fm!.fileExists(EVENTS_FILE) ? fm!.getFileContents(EVENTS_FILE) : "";
    fm!.writePlainTextToFile(EVENTS_FILE, prev + line);
  } catch (e) {
    dprint("[Runtime ERROR] Failed to append event: " + String(e));
  }
}

function writeState(state: PTTopologySnapshot) {
  try {
    fm!.writePlainTextToFile(STATE_FILE, JSON.stringify(state));
  } catch (e) {
    dprint("[Runtime ERROR] Failed to write state: " + String(e));
  }
}

// ============================================================================
// Snapshot
// ============================================================================

interface PTPortInfo {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  macAddress?: string;
}

interface PTDeviceSnapshot {
  name: string;
  model: string;
  type: string;
  power: boolean;
  ports: PTPortInfo[];
}

interface PTLinkSnapshot {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType: string;
  connected: boolean;
}

interface PTTopologySnapshot {
  version: string;
  timestamp: number;
  devices: Record<string, PTDeviceSnapshot>;
  links: Record<string, PTLinkSnapshot>;
  metadata: {
    deviceCount: number;
    linkCount: number;
  };
}

function getCableTypeNameFromConnType(connType?: number): string {
  switch (connType) {
    case 0: return "straight";
    case 1: return "cross";
    case 2: return "fiber";
    case 3:
    case 4: return "serial";
    case 5: return "console";
    default: return "auto";
  }
}

function generateSnapshot(): PTTopologySnapshot | null {
  try {
    var net = ipc.network();
    var count = net.getDeviceCount();
    var devices: Record<string, PTDeviceSnapshot> = {};
    var links: Record<string, PTLinkSnapshot> = {};

    for (var i = 0; i < count; i++) {
      var device = net.getDeviceAt(i);
      var name = device.getName();
      var portCount = device.getPortCount();
      var ports: PTPortInfo[] = [];

      for (var p = 0; p < portCount; p++) {
        try {
          var port = device.getPortAt(p);
          var portInfo: PTPortInfo = { name: port.getName() };
          try { portInfo.ipAddress = port.getIpAddress(); } catch(e1) {}
          try { portInfo.subnetMask = port.getSubnetMask(); } catch(e2) {}
          try { portInfo.macAddress = port.getMacAddress(); } catch(e3) {}
          ports.push(portInfo);

          try {
            var link = port.getLink();
            if (link) {
              for (var j = 0; j < count; j++) {
                var otherDevice = net.getDeviceAt(j);
                if (!otherDevice || otherDevice.getName() === name) continue;

                var otherPortCount = otherDevice.getPortCount();
                for (var op = 0; op < otherPortCount; op++) {
                  try {
                    var otherPort = otherDevice.getPortAt(op);
                    if (!otherPort) continue;

                    var otherLink = otherPort.getLink();
                    if (otherLink && otherLink === link) {
                      var dev1 = name;
                      var pt1 = portInfo.name;
                      var dev2 = otherDevice.getName();
                      var pt2 = otherPort.getName();

                      if (dev2 < dev1 || (dev2 === dev1 && pt2 < pt1)) {
                        dev1 = otherDevice.getName();
                        pt1 = otherPort.getName();
                        dev2 = name;
                        pt2 = portInfo.name;
                      }

                      var linkId = dev1 + ":" + pt1 + "--" + dev2 + ":" + pt2;
                      if (!links[linkId]) {
                        var connType: number | undefined = undefined;
                        try {
                          var linkAny = link as any;
                          if (typeof linkAny.connType === "number") connType = linkAny.connType;
                        } catch (e4) {}

                        links[linkId] = {
                          id: linkId,
                          device1: dev1,
                          port1: pt1,
                          device2: dev2,
                          port2: pt2,
                          cableType: getCableTypeNameFromConnType(connType),
                          connected: true,
                        };
                      }
                      break;
                    }
                  } catch (e5) {}
                }
              }
            }
          } catch (e6) {}
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
      links: links,
      metadata: { deviceCount: count, linkCount: Object.keys(links).length }
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

var HANDLERS: PTCommandHandlers = {
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
    if (!fm!.fileExists(COMMAND_FILE)) return;
    var cmd: PTCommand = JSON.parse(fm!.getFileContents(COMMAND_FILE));
    if (!cmd || !cmd.payload) return;

    var handler = HANDLERS[cmd.payload.type];
    var result: Record<string, unknown>;

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
  } catch (e) {
    appendEvent({ type: "error", ts: Date.now(), message: String(e) });
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

// Compatibility export for old loaders
export function executeRuntime(payload: Record<string, unknown>, ipcRef: unknown, dprintRef: unknown): string {
  var handler = HANDLERS[payload.type as string];
  var res: Record<string, unknown>;
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
  // @ts-ignore - getFileWatcher no existe en PTFileManager type definitions
  fw = fm.getFileWatcher();

  if (!fw) return;
  // Watch for commands
  fw.addPath(COMMAND_FILE);
  fw.registerEvent("fileChanged", null, function(src: string, args: { path: string; type: string }) {
    if (args.path === COMMAND_FILE) {
      setTimeout(runCommand, 50);
    }
  });

  // Initial snapshot
  triggerSnapshot();

  // Periodic snapshot
  snapshotInterval = setInterval(triggerSnapshot, 10000) as unknown as number;
}

export function stop() {
  dprint("[Runtime] Stopping...");
  if (snapshotInterval) clearInterval(snapshotInterval);
}
