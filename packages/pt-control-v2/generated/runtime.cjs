var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// packages/pt-control-v2/src/pt-scripts/runtime.ts
var exports_runtime = {};
__export(exports_runtime, {
  executeRuntime: () => executeRuntime
});
module.exports = __toCommonJS(exports_runtime);
function executeRuntime(payload, ipcRef, dprintRef) {
  const ipc = ipcRef;
  const dprint = dprintRef;
  var CABLE_TYPES = {
    straight: 8100,
    cross: 8101,
    roll: 8102,
    fiber: 8103,
    phone: 8104,
    cable: 8105,
    serial: 8106,
    auto: 8107,
    console: 8108,
    wireless: 8109,
    coaxial: 8110,
    octal: 8111,
    cellular: 8112,
    usb: 8113,
    custom_io: 8114
  };
  var DEVICE_TYPES = {
    router: 0,
    switch: 1,
    hub: 2,
    pc: 3,
    server: 4,
    printer: 5,
    wireless: 6,
    cloud: 7,
    end: 8
  };
  var MODEL_ALIASES = {
    pc: "PC-PT",
    laptop: "Laptop-PT",
    server: "Server-PT",
    cloud: "Cloud-PT",
    ap: "AccessPoint-PT",
    accesspoint: "AccessPoint-PT"
  };
  function getLW() {
    return ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
  }
  function getNet() {
    return ipc.network();
  }
  function resolveModel(model) {
    if (!model)
      return "2911";
    var key = model.toLowerCase();
    return MODEL_ALIASES[key] || model;
  }
  function getDeviceTypeCandidates(model) {
    var normalized = (model || "").toLowerCase();
    if (normalized.indexOf("2960") === 0 || normalized.indexOf("3560") === 0 || normalized.indexOf("switch") >= 0) {
      return [DEVICE_TYPES.switch, DEVICE_TYPES.router];
    }
    if (normalized.indexOf("pc") === 0 || normalized.indexOf("laptop") === 0) {
      var candidates = [DEVICE_TYPES.pc, DEVICE_TYPES.end];
      for (var t = 8;t <= 60; t++) {
        if (candidates.indexOf(t) === -1)
          candidates.push(t);
      }
      return candidates;
    }
    if (normalized.indexOf("server") === 0) {
      var serverCandidates = [DEVICE_TYPES.server, DEVICE_TYPES.end];
      for (var s = 8;s <= 60; s++) {
        if (serverCandidates.indexOf(s) === -1)
          serverCandidates.push(s);
      }
      return serverCandidates;
    }
    return [DEVICE_TYPES.router, DEVICE_TYPES.switch, DEVICE_TYPES.pc];
  }
  function createDeviceWithFallback(model, x, y, typeList, lw, net) {
    for (var i = 0;i < typeList.length; i++) {
      var typeId = typeList[i];
      var autoName = lw.addDevice(typeId, model, x, y);
      if (!autoName)
        continue;
      var device = net.getDevice(autoName);
      if (!device) {
        lw.removeDevice(autoName);
        continue;
      }
      var deviceModel = "";
      try {
        deviceModel = device.getModel && device.getModel() || "";
      } catch (e) {}
      if (deviceModel && deviceModel.toLowerCase() === model.toLowerCase()) {
        return { autoName, device, typeId };
      }
      lw.removeDevice(autoName);
    }
    return null;
  }
  var IOS_PARSERS = {
    "show ip interface brief": function(output) {
      var lines = output.split(`
`);
      var interfaces = [];
      for (var i = 0;i < lines.length; i++) {
        var line = lines[i].trim();
        var match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/);
        if (match) {
          interfaces.push({
            interface: match[1],
            ipAddress: match[2],
            ok: match[3],
            method: match[4],
            status: match[5],
            protocol: match[6]
          });
        }
      }
      return { raw: output, interfaces };
    },
    "show vlan brief": function(output) {
      var lines = output.split(`
`);
      var vlans = [];
      for (var i = 0;i < lines.length; i++) {
        var line = lines[i].trim();
        var match = line.match(/^(\d+)\s+(\S+)\s+(\S+)\s*(.*?)$/);
        if (match) {
          var ports = match[4] ? match[4].split(",").map(function(p) {
            return p.trim();
          }) : [];
          vlans.push({
            id: parseInt(match[1]),
            name: match[2],
            status: match[3],
            ports: ports.filter(function(p) {
              return p.length > 0;
            })
          });
        }
      }
      return { raw: output, vlans };
    },
    "show vlan": function(output) {
      return IOS_PARSERS["show vlan brief"](output);
    },
    "show ip route": function(output) {
      var lines = output.split(`
`);
      var routes = [];
      var gatewayOfLastResort = null;
      for (var i = 0;i < lines.length; i++) {
        var line = lines[i].trim();
        var gwMatch = line.match(/Gateway of last resort is (.+)/i);
        if (gwMatch) {
          gatewayOfLastResort = gwMatch[1];
          continue;
        }
        var routeMatch = line.match(/^([CLSORDBEIUM\*])\s+(\S+)\s+(?:is\s+)?(.+)$/);
        if (routeMatch) {
          var typeCode = routeMatch[1];
          var network = routeMatch[2];
          var rest = routeMatch[3];
          var route = {
            type: typeCode,
            network,
            nextHop: null,
            interface: null
          };
          if (rest.indexOf("directly connected") >= 0) {
            var ifaceMatch = rest.match(/connected,?\s*(\S+)/);
            if (ifaceMatch)
              route.interface = ifaceMatch[1];
          } else if (rest.indexOf("via") >= 0) {
            var viaMatch = rest.match(/via\s+(\S+)/);
            if (viaMatch)
              route.nextHop = viaMatch[1].replace(",", "");
          }
          routes.push(route);
        }
      }
      return { raw: output, routes, gatewayOfLastResort };
    },
    "show running-config": function(output) {
      var sections = {};
      var currentSection = null;
      var currentContent = [];
      var hostname = null;
      var interfaces = {};
      var lines = output.split(`
`);
      for (var i = 0;i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf("hostname ") === 0) {
          hostname = line.substring(9).trim();
        }
        if (line.indexOf("!") === 0) {
          if (currentSection) {
            sections[currentSection] = currentContent.join(`
`);
          }
          currentSection = null;
          currentContent = [];
        } else if (line.indexOf("interface ") === 0) {
          currentSection = line.trim();
          currentContent = [line];
          interfaces[line.substring(10).trim()] = "";
        } else if (line.indexOf("vlan ") === 0 || line.indexOf("router ") === 0) {
          currentSection = line.trim();
          currentContent = [line];
        } else if (currentSection) {
          currentContent.push(line);
        }
      }
      return {
        raw: output,
        hostname,
        sections,
        interfaces
      };
    },
    "show interfaces": function(output) {
      var interfaces = [];
      var current = null;
      var lines = output.split(`
`);
      for (var i = 0;i < lines.length; i++) {
        var line = lines[i];
        var ifaceMatch = line.match(/^(\S+)\s+is\s+(\S+),\s+line protocol is (\S+)/);
        if (ifaceMatch) {
          if (current)
            interfaces.push(current);
          current = {
            name: ifaceMatch[1],
            status: ifaceMatch[2],
            protocol: ifaceMatch[3]
          };
        }
        if (current && line.indexOf("  Hardware is ") === 0) {
          current.hardware = line.substring(14).trim();
        }
        if (current && line.indexOf("  Description: ") === 0) {
          current.description = line.substring(15).trim();
        }
        if (current && line.indexOf("  Internet address is ") === 0) {
          var ipMatch = line.match(/Internet address is (\S+)/);
          if (ipMatch) {
            var parts = ipMatch[1].split("/");
            current.ipAddress = parts[0];
            if (parts[1]) {
              var cidr = parseInt(parts[1]);
              var mask = [];
              for (var j = 0;j < 4; j++) {
                var n = Math.min(8, Math.max(0, cidr - j * 8));
                mask.push(256 - Math.pow(2, 8 - n));
              }
              current.subnetMask = mask.join(".");
            }
          }
        }
      }
      if (current)
        interfaces.push(current);
      return { raw: output, interfaces };
    },
    "show ip arp": function(output) {
      var entries = [];
      var lines = output.split(`
`);
      for (var i = 0;i < lines.length; i++) {
        var line = lines[i].trim();
        var match = line.match(/^(Internet)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/i);
        if (match) {
          entries.push({
            protocol: match[1],
            address: match[2],
            age: match[3],
            mac: match[4],
            type: match[5],
            interface: match[6]
          });
        }
      }
      return { raw: output, entries };
    },
    "show mac address-table": function(output) {
      var entries = [];
      var lines = output.split(`
`);
      for (var i = 0;i < lines.length; i++) {
        var line = lines[i].trim();
        var match = line.match(/^(\S+)\s+([0-9a-fA-F.]+)\s+(\S+)\s+(\S+)$/);
        if (match) {
          entries.push({
            vlan: match[1],
            macAddress: match[2],
            type: match[3].toLowerCase(),
            ports: [match[4]]
          });
        }
      }
      return { raw: output, entries };
    },
    "show spanning-tree": function(output) {
      var vlans = [];
      var current = null;
      var lines = output.split(`
`);
      for (var i = 0;i < lines.length; i++) {
        var line = lines[i];
        var vlanMatch = line.match(/^VLAN(\d+)/);
        if (vlanMatch) {
          if (current)
            vlans.push(current);
          current = { vlan: parseInt(vlanMatch[1]), interfaces: [] };
        }
        if (current) {
          if (line.indexOf("  Root ID") === 0) {
            current.rootBridgeId = line.substring(10).trim();
            current.rootBridge = false;
          }
          if (line.indexOf("  Bridge ID") === 0) {
            current.bridgeId = line.substring(12).trim();
            if (!current.rootBridgeId || current.rootBridgeId === current.bridgeId) {
              current.rootBridge = true;
            }
          }
          var ifaceMatch = line.match(/^\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\S+)/);
          if (ifaceMatch) {
            current.interfaces.push({
              port: ifaceMatch[1],
              role: ifaceMatch[2].toLowerCase(),
              state: ifaceMatch[3].toLowerCase(),
              cost: parseInt(ifaceMatch[4])
            });
          }
        }
      }
      if (current)
        vlans.push(current);
      return { raw: output, vlans };
    },
    "show version": function(output) {
      var result = { raw: output };
      var lines = output.split(`
`);
      for (var i = 0;i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf("Version ") >= 0) {
          var vMatch = line.match(/Version (\S+)/);
          if (vMatch)
            result.version = vMatch[1];
        }
        if (line.indexOf(" uptime is ") >= 0) {
          result.uptime = line.substring(line.indexOf(" uptime is ") + 11);
        }
        if (line.match(/^\S+\s+uptime is /)) {
          result.hostname = line.split(" ")[0];
        }
      }
      return result;
    },
    "show cdp neighbors": function(output) {
      var neighbors = [];
      var lines = output.split(`
`);
      var started = false;
      for (var i = 0;i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf("Device ID") >= 0) {
          started = true;
          continue;
        }
        if (!started || !line)
          continue;
        var parts = line.split(/\s+/);
        if (parts.length >= 6) {
          neighbors.push({
            deviceId: parts[0],
            localInterface: parts[1],
            holdtime: parseInt(parts[2]),
            capability: parts[3],
            platform: parts[4],
            portId: parts[5]
          });
        }
      }
      return { raw: output, neighbors };
    }
  };
  function getParser(command) {
    var cmd = command.toLowerCase().trim();
    if (IOS_PARSERS[cmd])
      return IOS_PARSERS[cmd];
    for (var key in IOS_PARSERS) {
      if (cmd.indexOf(key.toLowerCase()) === 0) {
        return IOS_PARSERS[key];
      }
    }
    return null;
  }
  function handleAddDevice(p) {
    var lw = getLW();
    var net = getNet();
    var model = resolveModel(p.model);
    var name = p.name || model;
    var x = p.x || 100;
    var y = p.y || 100;
    var typeList = p.deviceType !== undefined ? [p.deviceType] : getDeviceTypeCandidates(model);
    var created = createDeviceWithFallback(model, x, y, typeList, lw, net);
    if (!created)
      return { ok: false, error: "Failed to add device for model: " + model };
    var autoName = created.autoName;
    var device = created.device;
    device.setName(name);
    if (device.skipBoot)
      device.skipBoot();
    return { ok: true, name, autoName, model, deviceType: created.typeId };
  }
  function handleRemoveDevice(p) {
    getLW().removeDevice(p.name);
    return { ok: true, name: p.name };
  }
  function handleListDevices(p) {
    var net = getNet();
    var count = net.getDeviceCount();
    var devices = [];
    for (var i = 0;i < count; i++) {
      var device = net.getDeviceAt(i);
      devices.push({
        name: device.getName(),
        model: device.getModel(),
        type: device.getType(),
        power: device.getPower()
      });
    }
    return { ok: true, devices, count };
  }
  function handleRenameDevice(p) {
    var device = getNet().getDevice(p.oldName);
    if (!device)
      return { ok: false, error: "Device not found: " + p.oldName };
    device.setName(p.newName);
    return { ok: true, oldName: p.oldName, newName: p.newName };
  }
  function handleAddLink(p) {
    var lw = getLW();
    var cableType = CABLE_TYPES[p.linkType] || CABLE_TYPES.auto;
    var success = lw.createLink(p.device1, p.port1, p.device2, p.port2, cableType);
    if (!success)
      return { ok: false, error: "Failed to create link" };
    return { ok: true, device1: p.device1, port1: p.port1, device2: p.device2, port2: p.port2, linkType: p.linkType };
  }
  function handleRemoveLink(p) {
    getLW().deleteLink(p.device, p.port);
    return { ok: true };
  }
  function handleConfigHost(p) {
    var device = getNet().getDevice(p.device);
    if (!device)
      return { ok: false, error: "Device not found: " + p.device };
    var port = device.getPortAt(0);
    if (!port)
      return { ok: false, error: "No ports on device" };
    if (p.dhcp === true) {
      try {
        port.setDhcpEnabled(true);
      } catch (e) {}
    } else {
      if (p.ip && p.mask)
        port.setIpSubnetMask(p.ip, p.mask);
      if (p.gateway)
        port.setDefaultGateway(p.gateway);
      if (p.dns)
        port.setDnsServerIp(p.dns);
    }
    return { ok: true, device: p.device, ip: p.ip };
  }
  function handleConfigIos(p) {
    var device = getNet().getDevice(p.device);
    if (!device)
      return { ok: false, error: "Device not found: " + p.device };
    if (device.skipBoot)
      device.skipBoot();
    var term = device.getCommandLine();
    if (!term)
      return { ok: false, error: "Device does not support CLI" };
    var results = [];
    for (var i = 0;i < p.commands.length; i++) {
      var result = term.enterCommand(p.commands[i], "");
      results.push({ command: p.commands[i], result });
    }
    if (p.save !== false) {
      term.enterCommand("write memory", "");
    }
    return { ok: true, device: p.device, executed: results.length };
  }
  function handleExecIos(p) {
    var device = getNet().getDevice(p.device);
    if (!device)
      return { ok: false, error: "Device not found: " + p.device };
    if (!device.enterCommand)
      return { ok: false, error: "Device does not support enterCommand" };
    var response = device.enterCommand(p.command, "");
    var status = response && response[0];
    var output = response && response[1] || "";
    var result = { ok: status === 0, raw: output, status };
    if (p.parse !== false) {
      var parser = getParser(p.command);
      if (parser) {
        try {
          result.parsed = parser(output);
        } catch (e) {
          result.parseError = String(e);
        }
      }
    }
    return result;
  }
  function handleSnapshot() {
    var net = getNet();
    var count = net.getDeviceCount();
    var devices = {};
    for (var i = 0;i < count; i++) {
      var device = net.getDeviceAt(i);
      var name = device.getName();
      var portCount = device.getPortCount();
      var ports = [];
      for (var p = 0;p < portCount; p++) {
        try {
          var port = device.getPortAt(p);
          var portInfo = { name: port.getName() };
          try {
            portInfo.ipAddress = port.getIpAddress();
          } catch (e) {}
          try {
            portInfo.subnetMask = port.getSubnetMask();
          } catch (e) {}
          try {
            portInfo.macAddress = port.getMacAddress();
          } catch (e) {}
          ports.push(portInfo);
        } catch (e) {}
      }
      devices[name] = {
        name,
        model: device.getModel(),
        type: device.getType(),
        power: device.getPower(),
        ports
      };
    }
    return {
      ok: true,
      version: "1.0",
      timestamp: Date.now(),
      devices,
      links: {},
      metadata: { deviceCount: count }
    };
  }
  function handleInspect(p) {
    var device = getNet().getDevice(p.device);
    if (!device)
      return { ok: false, error: "Device not found: " + p.device };
    var portCount = device.getPortCount();
    var ports = [];
    for (var i = 0;i < portCount; i++) {
      try {
        var port = device.getPortAt(i);
        var portInfo = { name: port.getName() };
        try {
          portInfo.ipAddress = port.getIpAddress();
        } catch (e) {}
        try {
          portInfo.subnetMask = port.getSubnetMask();
        } catch (e) {}
        try {
          portInfo.macAddress = port.getMacAddress();
        } catch (e) {}
        try {
          portInfo.defaultGateway = port.getDefaultGateway();
        } catch (e) {}
        ports.push(portInfo);
      } catch (e) {}
    }
    var result = {
      ok: true,
      name: device.getName(),
      model: device.getModel(),
      type: device.getType(),
      power: device.getPower(),
      ports
    };
    if (p.includeXml && device.serializeToXml) {
      try {
        result.xml = device.serializeToXml();
      } catch (e) {}
    }
    return result;
  }
  function handleHardwareInfo() {
    var factory = ipc.hardwareFactory();
    var keys = [];
    for (var key in factory)
      keys.push(key);
    return { ok: true, keys };
  }
  function handleHardwareCatalog(p) {
    var factory = ipc.hardwareFactory();
    var list = factory.devices || [];
    var limit = p.limit || 50;
    var results = [];
    for (var i = 0;i < list.length && results.length < limit; i++) {
      var item = list[i];
      var entry = {};
      try {
        entry.name = item.name;
      } catch (e) {}
      try {
        entry.model = item.model;
      } catch (e) {}
      try {
        entry.displayName = item.displayName;
      } catch (e) {}
      try {
        entry.deviceType = item.deviceType;
      } catch (e) {}
      results.push(entry);
    }
    return { ok: true, items: results, total: list.length };
  }
  function handleCommandLog(p) {
    var cl = ipc.commandLog();
    cl.setEnabled(true);
    var count = cl.getEntryCount();
    var limit = p.limit || 100;
    var start = Math.max(0, count - limit);
    var entries = [];
    for (var i = start;i < count; i++) {
      var entry = cl.getEntryAt(i);
      entries.push({
        index: i,
        time: entry.getTimeToString ? entry.getTimeToString() : "",
        device: entry.getDeviceName ? entry.getDeviceName() : "",
        prompt: entry.getPrompt ? entry.getPrompt() : "",
        command: entry.getCommand ? entry.getCommand() : ""
      });
    }
    return { ok: true, entries, count };
  }
  try {
    dprint("[Runtime] Processing: " + payload.type);
    switch (payload.type) {
      case "addDevice":
        return handleAddDevice(payload);
      case "removeDevice":
        return handleRemoveDevice(payload);
      case "listDevices":
        return handleListDevices(payload);
      case "renameDevice":
        return handleRenameDevice(payload);
      case "addModule":
        return { ok: false, error: "addModule not yet implemented" };
      case "removeModule":
        return { ok: false, error: "removeModule not yet implemented" };
      case "addLink":
        return handleAddLink(payload);
      case "removeLink":
        return handleRemoveLink(payload);
      case "configHost":
        return handleConfigHost(payload);
      case "configIos":
        return handleConfigIos(payload);
      case "execIos":
        return handleExecIos(payload);
      case "snapshot":
        return handleSnapshot();
      case "inspect":
        return handleInspect(payload);
      case "hardwareInfo":
        return handleHardwareInfo();
      case "hardwareCatalog":
        return handleHardwareCatalog(payload);
      case "commandLog":
        return handleCommandLog(payload);
      default:
        return { ok: false, error: "Unknown command: " + payload.type };
    }
  } catch (e) {
    dprint("[Runtime] Error: " + String(e));
    return { ok: false, error: String(e), stack: String(e.stack || "") };
  }
}
