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
  loadLinkRegistry();
  var netKeys = [];
  var netProtoMethods = [];
  try {
    for (var nk in net) netKeys.push(nk);
    var netProto = Object.getPrototypeOf(net);
    if (netProto) {
      for (var np in netProto) {
        if (typeof netProto[np] === "function") netProtoMethods.push(np);
      }
    }
  } catch(e) {}
  var count = net.getDeviceCount();
  var devices = {};
  var linksMap = {};

  // PASO 1: Recolectar información de dispositivos
  var deviceNames = {};
  for (var i = 0; i < count; i++) {
    var device = net.getDeviceAt(i);
    if (!device) continue;
    var name = device.getName();
    deviceNames[name] = true;
    
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

  // PASO 2: Obtener links desde net.getLinkAt() (API directa de PT)
  var linkCount = 0;
  try {
    linkCount = net.getLinkCount ? net.getLinkCount() : 0;
    dprint("[handleSnapshot] net.getLinkCount() = " + linkCount);
  } catch(e) {
    dprint("[handleSnapshot] net.getLinkCount error: " + e);
  }
  
if (linkCount > 0) {
    for (var li = 0; li < linkCount; li++) {
      try {
        var linkObj = net.getLinkAt(li);
        if (!linkObj) continue;
        
        var dev1 = null, dev2 = null, pt1 = null, pt2 = null, cableType = "auto";
        
        // Obtener puertos y dispositivos desde el link object
        try {
          var port1Obj = linkObj.getPort1 ? linkObj.getPort1() : null;
          var port2Obj = linkObj.getPort2 ? linkObj.getPort2() : null;
          
          if (port1Obj && typeof port1Obj.getName === "function") {
            pt1 = port1Obj.getName();
            var d1Obj = port1Obj.getOwnerDevice ? port1Obj.getOwnerDevice() : null;
            if (d1Obj && typeof d1Obj.getName === "function") {
              dev1 = d1Obj.getName();
            }
          }
          
          if (port2Obj && typeof port2Obj.getName === "function") {
            pt2 = port2Obj.getName();
            var d2Obj = port2Obj.getOwnerDevice ? port2Obj.getOwnerDevice() : null;
            if (d2Obj && typeof d2Obj.getName === "function") {
              dev2 = d2Obj.getName();
            }
          }
          
          // Cable type
          if (typeof linkObj.getConnectionType === "function") {
            try {
              var ct = linkObj.getConnectionType();
              cableType = CABLE_TYPE_NAMES[ct] || "auto";
            } catch(e) {}
          }
        } catch(e) {}
        
        // Validar que tenemos ambos dispositivos y puertos
        if (!dev1 || !dev2 || !pt1 || !pt2) {
          continue;
        }
        
        // Verificar que los dispositivos existen
        if (!deviceNames[dev1] || !deviceNames[dev2]) {
          continue;
        }
        
        // Normalizar ID del link (orden alfabético)
        var linkId;
        if (dev2 < dev1 || (dev2 === dev1 && pt2 < pt1)) {
          linkId = dev2 + ":" + pt2 + "--" + dev1 + ":" + pt1;
          var tmp = dev1; dev1 = dev2; dev2 = tmp;
          var tmpPort = pt1; pt1 = pt2; pt2 = tmpPort;
        } else {
          linkId = dev1 + ":" + pt1 + "--" + dev2 + ":" + pt2;
        }
        
        if (!linksMap[linkId]) {
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
      } catch(e) {}
    }
  } else {
    // Fallback: escanear puertos si net.getLinkCount() no funciona
    for (var i = 0; i < count; i++) {
      var device = net.getDeviceAt(i);
      if (!device) continue;
      var name = device.getName();
      var portCount = device.getPortCount();

      for (var p = 0; p < portCount; p++) {
        try {
          var port = device.getPortAt(p);
          if (!port) continue;

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
        } catch(e) { /* ignore */ }
      }
    }
  }

  // Mezclar enlaces registrados explícitamente por el runtime
  try {
    for (var linkId in LINK_REGISTRY) {
      if (!linksMap[linkId]) {
        linksMap[linkId] = LINK_REGISTRY[linkId];
      }
    }
  } catch(e) {}

  return {
    ok: true,
    version: "1.0",
    timestamp: Date.now(),
    devices: devices,
    links: linksMap,
    metadata: { deviceCount: count, linkCount: Object.keys(linksMap).length },
    runtimeInfo: {
      netKeys: netKeys,
      netProtoMethods: netProtoMethods,
    }
  };
}

function handleInspect(payload) {
  var device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };
  
  var portCount = device.getPortCount();
  var ports = [];
  var dhcp = false;
  
  // Intentar leer DHCP flag a nivel dispositivo
  if (typeof device.getDhcpFlag === "function") {
    try { dhcp = !!device.getDhcpFlag(); } catch(e) {}
  }
  
  for (var i = 0; i < portCount; i++) {
    try {
      var port = device.getPortAt(i);
      if (!port) continue;
      
      var portInfo = { name: port.getName() };
      try { portInfo.ipAddress = String(port.getIpAddress()); } catch(e) {}
      try { portInfo.subnetMask = String(port.getSubnetMask()); } catch(e) {}
      try { portInfo.macAddress = String(port.getMacAddress()); } catch(e) {}
      try { portInfo.defaultGateway = String(port.getDefaultGateway()); } catch(e) {}
      
      // Leer DHCP status del puerto si no está a nivel dispositivo
      if (!dhcp && typeof port.isDhcpClientOn === "function") {
        try { 
          if (port.isDhcpClientOn()) {
            portInfo.dhcp = true;
            dhcp = true;
          }
        } catch(e) {}
      }
      
      ports.push(portInfo);
    } catch(e) {}
  }
  
  var result = {
    ok: true,
    name: device.getName(),
    model: device.getModel(),
    type: DEVICE_TYPE_NAMES[device.getType()] || "generic",
    power: device.getPower(),
    ports: ports,
    dhcp: dhcp
  };
  
  // Poblar campos de IP a nivel dispositivo si están disponibles
  if (ports.length > 0) {
    try { result.ip = ports[0].ipAddress; } catch(e) {}
    try { result.mask = ports[0].subnetMask; } catch(e) {}
    try { result.gateway = ports[0].defaultGateway; } catch(e) {}
  }
  
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

function handleResolveCapabilities(payload) {
  // Stub: capabilities resolution requiere acceso a device capabilities
  // Por ahora retornamos una respuesta básica
  var deviceName = payload.device;
  var device = getNet().getDevice(deviceName);
  
  if (!device) {
    return { ok: false, error: "Device not found: " + deviceName };
  }
  
  // Basic capabilities based on device type
  var capabilities = {
    device: deviceName,
    hasCli: true,
    hasModules: false,
    supportsVlan: true,
    supportsRouting: false,
    supportsDhcp: true,
    supportsAcl: true
  };
  
  return { ok: true, capabilities: capabilities };
}
`;
}
