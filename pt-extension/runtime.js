/**
 * PT Runtime - Default implementation
 * 
 * Este código se ejecuta dentro del Script Engine de PT
 * y tiene acceso completo a la API IPC.
 * 
 * @param {Object} payload - Command payload
 * @param {Object} ipc - PT IPC object
 * @param {Function} dprint - Debug print function
 */

// Cable type mapping
var CABLE_TYPES = {
  "straight": 8100,
  "cross": 8101,
  "roll": 8102,
  "fiber": 8103,
  "phone": 8104,
  "cable": 8105,
  "serial": 8106,
  "auto": 8107,
  "console": 8108,
  "wireless": 8109,
  "coaxial": 8110,
  "octal": 8111,
  "cellular": 8112,
  "usb": 8113,
  "custom_io": 8114
};

// Device type IDs (based on PT enums)
var DEVICE_TYPE = {
  "router": 0,
  "switch": 1,
  "hub": 2,
  "pc": 3,
  "server": 4,
  "printer": 5,
  "wireless": 6,
  "cloud": 7,
  "end": 8
};

var MODEL_ALIASES = {
  "pc": "PC-PT",
  "pc-pt": "PC-PT",
  "laptop": "Laptop-PT",
  "laptop-pt": "Laptop-PT",
  "server": "Server-PT",
  "server-pt": "Server-PT",
  "cloud": "Cloud-PT",
  "cloud-pt": "Cloud-PT",
  "ap": "AccessPoint-PT",
  "accesspoint": "AccessPoint-PT",
  "accesspoint-pt": "AccessPoint-PT"
};

function resolveModelName(model) {
  if (typeof model !== "string" || model.length === 0) {
    return "2911";
  }
  var key = model.toLowerCase();
  if (MODEL_ALIASES[key]) {
    return MODEL_ALIASES[key];
  }
  return model;
}

function getDeviceTypeForModel(model) {
  if (typeof model !== "string") {
    return DEVICE_TYPE.router;
  }
  var name = model.toLowerCase();

  if (name.indexOf("2960") === 0 || name.indexOf("3560") === 0 || name.indexOf("switch") >= 0) {
    return DEVICE_TYPE.switch;
  }
  if (name.indexOf("pc-pt") === 0 || name.indexOf("pc") === 0 || name.indexOf("laptop") === 0) {
    return DEVICE_TYPE.pc;
  }
  if (name.indexOf("server") === 0) {
    return DEVICE_TYPE.server;
  }
  if (name.indexOf("printer") === 0) {
    return DEVICE_TYPE.printer;
  }
  if (name.indexOf("accesspoint") >= 0 || name.indexOf("ap") === 0 || name.indexOf("wireless") >= 0) {
    return DEVICE_TYPE.wireless;
  }
  if (name.indexOf("cloud") >= 0) {
    return DEVICE_TYPE.cloud;
  }
  return DEVICE_TYPE.router;
}

function getDeviceTypeCandidates(model) {
  var normalized = model.toLowerCase();
  if (normalized.indexOf("2960") === 0 || normalized.indexOf("3560") === 0 || normalized.indexOf("switch") >= 0) {
    return [DEVICE_TYPE.switch, DEVICE_TYPE.router];
  }
  if (normalized.indexOf("pc-pt") === 0 || normalized.indexOf("pc") === 0 || normalized.indexOf("laptop") === 0) {
    var candidates = [DEVICE_TYPE.pc, DEVICE_TYPE.end];
    for (var t = 8; t <= 60; t++) {
      if (candidates.indexOf(t) === -1) {
        candidates.push(t);
      }
    }
    return candidates;
  }
  if (normalized.indexOf("server") === 0) {
    var serverCandidates = [DEVICE_TYPE.server, DEVICE_TYPE.end];
    for (var s = 8; s <= 60; s++) {
      if (serverCandidates.indexOf(s) === -1) {
        serverCandidates.push(s);
      }
    }
    return serverCandidates;
  }
  return [getDeviceTypeForModel(model)];
}

function createDeviceWithFallback(model, x, y, typeList, lw, net) {
  for (var i = 0; i < typeList.length; i++) {
    var typeId = typeList[i];
    var autoName = lw.addDevice(typeId, model, x, y);
    if (!autoName) {
      continue;
    }
    var device = net.getDevice(autoName);
    if (!device) {
      lw.removeDevice(autoName);
      continue;
    }
    var deviceModel = "";
    try {
      deviceModel = (device.getModel && device.getModel()) || "";
    } catch (e) {}
    if (deviceModel && deviceModel.toLowerCase() === model.toLowerCase()) {
      return { autoName: autoName, device: device, typeId: typeId };
    }
    lw.removeDevice(autoName);
  }
  return null;
}

/**
 * Get LogicalWorkspace
 */
function getLW() {
  return ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
}

/**
 * Get Network
 */
function getNetwork() {
  return ipc.network();
}

/**
 * Handle addDevice command
 */
function handleAddDevice(payload) {
  var lw = getLW();
  var net = getNetwork();
  
  var model = resolveModelName(payload.model || "2911");
  var name = payload.name || model;
  var x = typeof payload.x === "number" ? payload.x : 100;
  var y = typeof payload.y === "number" ? payload.y : 100;
  var candidateTypes = typeof payload.deviceType === "number"
    ? [payload.deviceType]
    : getDeviceTypeCandidates(model);
  
  var created = createDeviceWithFallback(model, x, y, candidateTypes, lw, net);
  if (!created) {
    return { ok: false, error: "Failed to add device for model: " + model };
  }
  
  var autoName = created.autoName;
  var device = created.device;
  
  device.setName(name);
  
  if (device.skipBoot) {
    device.skipBoot();
  }
  
  return {
    ok: true,
    name: name,
    autoName: autoName,
    model: model,
    deviceType: created.typeId
  };
}

/**
 * Handle removeDevice command
 */
function handleRemoveDevice(payload) {
  var lw = getLW();
  lw.removeDevice(payload.name);
  
  return { ok: true, name: payload.name };
}

/**
 * Handle listDevices command
 */
function handleListDevices(payload) {
  var net = getNetwork();
  var count = net.getDeviceCount();
  var devices = [];
  
  for (var i = 0; i < count; i++) {
    var device = net.getDeviceAt(i);
    devices.push({
      name: device.getName(),
      model: device.getModel(),
      type: device.getType(),
      power: device.getPower()
    });
  }
  
  return { ok: true, devices: devices, count: count };
}

/**
 * Handle addLink command
 */
function handleAddLink(payload) {
  var lw = getLW();
  
  // Get cable type
  var cableType = CABLE_TYPES[payload.cableType.toLowerCase()] || CABLE_TYPES.auto;
  
  // Create link
  var success = lw.createLink(
    payload.dev1,
    payload.port1,
    payload.dev2,
    payload.port2,
    cableType
  );
  
  if (!success) {
    return {
      ok: false,
      error: "Failed to create link between " + payload.dev1 + " and " + payload.dev2
    };
  }
  
  return {
    ok: true,
    dev1: payload.dev1,
    port1: payload.port1,
    dev2: payload.dev2,
    port2: payload.port2,
    cableType: payload.cableType
  };
}

/**
 * Handle removeLink command
 */
function handleRemoveLink(payload) {
  var lw = getLW();
  lw.deleteLink(payload.device, payload.port);
  
  return { ok: true, device: payload.device, port: payload.port };
}

/**
 * Handle configHost command
 */
function handleConfigHost(payload) {
  var net = getNetwork();
  var device = net.getDevice(payload.device);
  
  if (!device) {
    return { ok: false, error: "Device not found: " + payload.device };
  }
  
  // Get first port (usually FastEthernet0 for PCs)
  var port = device.getPortAt(0);
  
  if (!port) {
    return { ok: false, error: "No ports found on device" };
  }
  
  // Configure IP
  if (payload.ip && payload.mask) {
    port.setIpSubnetMask(payload.ip, payload.mask);
  }
  
  if (payload.gateway) {
    port.setDefaultGateway(payload.gateway);
  }
  
  if (payload.dns) {
    port.setDnsServerIp(payload.dns);
  }
  
  return {
    ok: true,
    device: payload.device,
    ip: payload.ip,
    configured: true
  };
}

/**
 * Handle configIos command
 */
function handleConfigIos(payload) {
  var net = getNetwork();
  var device = net.getDevice(payload.device);
  
  if (!device) {
    return { ok: false, error: "Device not found: " + payload.device };
  }
  
  // Skip boot
  if (device.skipBoot) {
    device.skipBoot();
  }
  
  // Get command line
  var term = device.getCommandLine();
  
  if (!term) {
    return { ok: false, error: "Device does not support CLI" };
  }
  
  // Execute commands
  var results = [];
  for (var i = 0; i < payload.commands.length; i++) {
    var cmd = payload.commands[i];
    var execResult = term.enterCommand(cmd);
    results.push({ command: cmd, result: execResult });
  }
  
  // Persist configuration if not already handled
  var writeResult = term.enterCommand("write memory");
  results.push({ command: "write memory", result: writeResult });
  
  return {
    ok: true,
    device: payload.device,
    commands: payload.commands.length,
    details: results
  };
}

function handleExecIos(payload) {
  var net = getNetwork();
  var device = net.getDevice(payload.device);
  
  if (!device || !device.enterCommand) {
    return { ok: false, error: "Device does not support exec command: " + payload.device };
  }
  
  var commands = [];
  if (typeof payload.command === "string") {
    commands.push(payload.command);
  }
  if (Array.isArray(payload.commands)) {
    for (var i = 0; i < payload.commands.length; i++) {
      commands.push(payload.commands[i]);
    }
  }
  
  if (commands.length === 0) {
    return { ok: false, error: "No commands provided" };
  }
  
  var results = [];
  for (var j = 0; j < commands.length; j++) {
    var cmd = commands[j];
    var response;
    try {
      response = device.enterCommand(cmd);
    } catch (e) {
      results.push({ command: cmd, status: -1, output: "", error: String(e) });
      continue;
    }
    var status = response && response.length > 0 ? response[0] : null;
    var output = response && response.length > 1 ? response[1] : "";
    results.push({ command: cmd, status: status, output: output });
  }
  
  return {
    ok: true,
    device: payload.device,
    results: results
  };
}

/**
 * Handle snapshot command
 */
function handleSnapshot(payload) {
  var net = getNetwork();
  var count = net.getDeviceCount();
  var devices = [];
  
  for (var i = 0; i < count; i++) {
    var device = net.getDeviceAt(i);
    var portCount = device.getPortCount();
    var ports = [];
    
    for (var p = 0; p < portCount; p++) {
      try {
        var port = device.getPortAt(p);
        ports.push(port.getName());
      } catch (e) {
        // Some ports might not be accessible
      }
    }
    
    devices.push({
      name: device.getName(),
      model: device.getModel(),
      type: device.getType(),
      power: device.getPower(),
      ports: ports,
      portCount: portCount
    });
  }
  
  var linkCount = null;
  try {
    linkCount = net.getLinkCount();
  } catch (e) {
    // getLinkCount might not be available
  }
  
  return {
    ok: true,
    snapshot: {
      deviceCount: count,
      linkCount: linkCount,
      devices: devices,
      timestamp: Date.now()
    }
  };
}

/**
 * Handle inspect command
 */
function handleInspect(payload) {
  var net = getNetwork();
  var device = net.getDevice(payload.device);
  
  if (!device) {
    return { ok: false, error: "Device not found: " + payload.device };
  }
  
  var portCount = device.getPortCount();
  var ports = [];
  
  for (var i = 0; i < portCount; i++) {
    try {
      var port = device.getPortAt(i);
      var portInfo = {
        name: port.getName()
      };
      
      // Try to get IP info if it's a host port
      try {
        portInfo.ip = port.getIpAddress();
        portInfo.mask = port.getSubnetMask();
        portInfo.gateway = port.getDefaultGateway();
        portInfo.mac = port.getMacAddress();
      } catch (e) {
        // Not a host port
      }
      
      ports.push(portInfo);
    } catch (e) {
      // Skip inaccessible ports
    }
  }
  
  var result = {
    name: device.getName(),
    model: device.getModel(),
    type: device.getType(),
    power: device.getPower(),
    ports: ports
  };
  
  // Try to get XML serialization
  try {
    if (device.serializeToXml) {
      result.xml = device.serializeToXml();
    }
  } catch (e) {
    // XML not available
  }
  
  return { ok: true, device: result };
}

function handleHardwareInfo() {
  var factory = ipc.hardwareFactory();
  var keys = [];
  try {
    for (var key in factory) {
      keys.push(key);
    }
  } catch (e) {
    return { ok: false, error: "Unable to iterate hardwareFactory: " + String(e) };
  }
  return { ok: true, keys: keys };
}

function handleHardwareCatalog(payload) {
  var factory = ipc.hardwareFactory();
  var list = factory.devices || [];
  var limit = payload.limit || 20;
  var results = [];
  try {
    for (var i = 0; i < list.length && results.length < limit; i++) {
      var item = list[i];
      var entry = {};
      try { entry.name = item.name; } catch (e1) {}
      try { entry.model = item.model; } catch (e2) {}
      try { entry.displayName = item.displayName; } catch (e3) {}
      try { entry.deviceType = item.deviceType; } catch (e4) {}
      results.push(entry);
    }
  } catch (e) {
    return { ok: false, error: "Unable to read hardware catalog: " + String(e) };
  }
  return { ok: true, items: results, total: list.length || 0 };
}

function handleCommandLog(payload) {
  var limit = payload && typeof payload.limit === "number" ? payload.limit : 20;
  try {
    var cl = ipc.commandLog();
    cl.setEnabled(true);
    var count = cl.getEntryCount();
    var start = Math.max(0, count - limit);
    var entries = [];
    for (var i = start; i < count; i++) {
      var entry = cl.getEntryAt(i);
      entries.push({
        index: i,
        time: entry.getTimeToString ? entry.getTimeToString() : "",
        device: entry.getDeviceName ? entry.getDeviceName() : "",
        prompt: entry.getPrompt ? entry.getPrompt() : "",
        command: entry.getCommand ? entry.getCommand() : "",
        resolved: entry.getResolvedCommand ? entry.getResolvedCommand() : ""
      });
    }
    return { ok: true, entries: entries, count: count };
  } catch (e) {
    return { ok: false, error: "Unable to read command log: " + String(e) };
  }
}

/**
 * Main command dispatcher
 */
return (function(payload, ipc, dprint) {
  try {
    var cmdType = payload.type || payload.kind;
    
    var normalizedPayload = Object.assign({}, payload);
    
    if (payload.dev1 !== undefined) {
      normalizedPayload.dev1 = payload.dev1;
    } else if (payload.device1 !== undefined) {
      normalizedPayload.dev1 = payload.device1;
    }
    
    if (payload.dev2 !== undefined) {
      normalizedPayload.dev2 = payload.dev2;
    } else if (payload.device2 !== undefined) {
      normalizedPayload.dev2 = payload.device2;
    }
    
    if (payload.cableType !== undefined) {
      normalizedPayload.cableType = payload.cableType;
    } else if (payload.linkType !== undefined) {
      normalizedPayload.cableType = payload.linkType;
    }
    
    dprint("[Runtime] Processing: " + cmdType);
    
    var result;
    
    switch (cmdType) {
      case "addDevice":
        result = handleAddDevice(normalizedPayload);
        break;
      case "removeDevice":
        result = handleRemoveDevice(normalizedPayload);
        break;
      case "listDevices":
        result = handleListDevices(normalizedPayload);
        break;
      case "addLink":
        result = handleAddLink(normalizedPayload);
        break;
      case "removeLink":
        result = handleRemoveLink(normalizedPayload);
        break;
      case "configHost":
        result = handleConfigHost(normalizedPayload);
        break;
      case "configIos":
        result = handleConfigIos(normalizedPayload);
        break;
      case "execIos":
        result = handleExecIos(normalizedPayload);
        break;
      case "snapshot":
        result = handleSnapshot(normalizedPayload);
        break;
      case "inspect":
        result = handleInspect(normalizedPayload);
        break;
      case "hardwareInfo":
        result = handleHardwareInfo();
        break;
      case "hardwareCatalog":
        result = handleHardwareCatalog(normalizedPayload || {});
        break;
      case "commandLog":
        result = handleCommandLog(normalizedPayload || {});
        break;
      default:
        result = { ok: false, error: "Unknown command: " + cmdType };
    }
    
    return result;
    
  } catch (e) {
    dprint("[Runtime] Error: " + String(e));
    return {
      ok: false,
      error: String(e),
      stack: String(e.stack || "")
    };
  }
})(payload, ipc, dprint);
