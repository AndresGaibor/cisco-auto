/**
 * Runtime Inspect Handlers Template
 * Handles snapshot, inspect, hardware info, and utility commands
 */

export function generateInspectHandlersTemplate(): string {
  return `// ============================================================================
// Inspection & Snapshot Handlers
// ============================================================================

function handleSnapshot() {
  var net = getNet();
  var count = net.getDeviceCount();
  var devices = {};
  var linksMap = {}; // Use endpoint key for O(1) deduplication

  for (var i = 0; i < count; i++) {
    var device = net.getDeviceAt(i);
    if (!device) continue;

    var name = device.getName();
    var portCount = device.getPortCount();
    var ports = [];

    for (var p = 0; p < portCount; p++) {
      try {
        var port = device.getPortAt(p);
        if (!port) continue;

        var portInfo = { name: port.getName(), type: "unknown" };

        try { portInfo.ipAddress = port.getIpAddress(); } catch(e) {}
        try { portInfo.subnetMask = port.getSubnetMask(); } catch(e) {}
        try { portInfo.macAddress = port.getMacAddress(); } catch(e) {}

        ports.push(portInfo);

        // O(n) link processing using UUID instead of O(n²) nested loops
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
                  var pt1 = port.getName();
                  var dev2 = otherDevice.getName();
                  var pt2 = otherPort.getName();

                  if (dev2 < dev1 || (dev2 === dev1 && pt2 < pt1)) {
                    dev1 = otherDevice.getName();
                    pt1 = otherPort.getName();
                    dev2 = name;
                    pt2 = port.getName();
                  }

                  var linkId = dev1 + ":" + pt1 + "--" + dev2 + ":" + pt2;

                  if (!linksMap[linkId]) {
                    var cableType = "auto";
                    try {
                      if (typeof link.getLinkType === "function") {
                        cableType = CABLE_TYPE_NAMES[link.getLinkType()] || "auto";
                      } else if (typeof link.connType === "number") {
                        cableType = CABLE_TYPE_NAMES[link.connType] || "auto";
                      }
                    } catch(e) {}

                    linksMap[linkId] = {
                      id: linkId,
                      device1: dev1,
                      port1: pt1,
                      device2: dev2,
                      port2: pt2,
                      cableType: cableType,
                      connected: true
                    };
                  }

                  break;
                }
              } catch(e) { /* ignore */ }
            }
          }
        }
      } catch(e) {
        ports.push({ name: "port" + p });
      }
    }

    devices[name] = {
      name: name,
      model: device.getModel(),
      type: DEVICE_TYPE_NAMES[device.getType()] || "generic",
      power: device.getPower(),
      ports: ports
    };
  }

  // Return links as Record (consistent with TopologySnapshot schema)
  return {
    ok: true,
    version: "1.0",
    timestamp: Date.now(),
    devices: devices,
    links: linksMap,
    metadata: { deviceCount: count, linkCount: Object.keys(linksMap).length }
  };
}

function handleInspect(payload) {
  var device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };
  
  var portCount = device.getPortCount();
  var ports = [];
  
  for (var i = 0; i < portCount; i++) {
    try {
      var port = device.getPortAt(i);
      if (!port) continue;
      
      var portInfo = { name: port.getName() };
      try { portInfo.ipAddress = port.getIpAddress(); } catch(e) {}
      try { portInfo.subnetMask = port.getSubnetMask(); } catch(e) {}
      try { portInfo.macAddress = port.getMacAddress(); } catch(e) {}
      try { portInfo.defaultGateway = port.getDefaultGateway(); } catch(e) {}
      
      ports.push(portInfo);
    } catch(e) {}
  }
  
  var result = {
    ok: true,
    name: device.getName(),
    model: device.getModel(),
    type: DEVICE_TYPE_NAMES[device.getType()] || "generic",
    power: device.getPower(),
    ports: ports
  };
  
  if (payload.includeXml && device.serializeToXml) {
    try { result.xml = device.serializeToXml(); } catch(e) {}
  }
  
  return result;
}

function handleHardwareInfo() {
  var factory = ipc.hardwareFactory();
  var keys = [];
  for (var key in factory) keys.push(key);
  return { ok: true, keys: keys };
}

function handleHardwareCatalog(payload) {
  var factory = ipc.hardwareFactory();
  var list = factory.devices || [];
  var limit = payload.limit || 50;
  var results = [];
  
  for (var i = 0; i < list.length && results.length < limit; i++) {
    var item = list[i];
    var entry = {};
    try { entry.name = item.name; } catch(e) {}
    try { entry.model = item.model; } catch(e) {}
    try { entry.displayName = item.displayName; } catch(e) {}
    try { entry.deviceType = item.deviceType; } catch(e) {}
    results.push(entry);
  }
  
  return { ok: true, items: results, total: list.length || 0 };
}

function handleCommandLog(payload) {
  var cl = ipc.commandLog();
  cl.setEnabled(true);
  
  var count = cl.getEntryCount();
  var limit = payload.limit || 100;
  var start = Math.max(0, count - limit);
  var entries = [];
  
  for (var i = start; i < count; i++) {
    var entry = cl.getEntryAt(i);
    entries.push({
      index: i,
      time: entry.getTimeToString ? entry.getTimeToString() : "",
      device: entry.getDeviceName ? entry.getDeviceName() : "",
      prompt: entry.getPrompt ? entry.getPrompt() : "",
      command: entry.getCommand ? entry.getCommand() : ""
    });
  }
  
  return { ok: true, entries: entries, count: count };
}
`;
}
