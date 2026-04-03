/**
 * Runtime Device Handlers Template - Device management handlers
 * Handles add, remove, rename, module management
 */

export function generateDeviceHandlersTemplate(): string {
  return `// ============================================================================
// Device Handlers
// ============================================================================

function handleAddDevice(payload) {
  var lw = getLW();
  var net = getNet();
  
  // Validar modelo contra catálogo - THROWS si inválido
  var model;
  try {
    model = resolveModel(payload.model);
  } catch (e) {
    dprint("[handleAddDevice] ERROR: " + String(e));
    return { ok: false, error: String(e), code: "INVALID_INPUT" };
  }
  
  var name = payload.name || model;
  var x = payload.x !== undefined ? payload.x : 100;
  var y = payload.y !== undefined ? payload.y : 100;
  
  dprint("[handleAddDevice] Adding: " + name + " (model: " + model + ") at (" + x + "," + y + ")");
  
  var typeList = payload.deviceType !== undefined 
    ? [payload.deviceType] 
    : getDeviceTypeCandidates(model);
  
  dprint("[handleAddDevice] Trying deviceTypes: [" + typeList.join(",") + "]");
  
  var created = createDeviceWithFallback(model, x, y, typeList, lw, net);
  if (!created) {
    dprint("[handleAddDevice] FAILED to add device: " + model);
    return { ok: false, error: "Failed to add device for model: " + model + ". Try using exact model name from PT catalog (e.g., '2960-24TT' instead of '2960')" };
  }
  
  dprint("[handleAddDevice] SUCCESS: " + name + " created with type=" + created.typeId);
  
  var autoName = created.autoName;
  var device = created.device;
  
  device.setName(name);
  if (device.skipBoot) device.skipBoot();
  
  return { ok: true, name: name, autoName: autoName, model: model, deviceType: created.typeId };
}

function handleRemoveDevice(payload) {
  var lw = getLW();
  var net = getNet();
  var candidates = ["removeDevice", "deleteDevice", "removeObject", "deleteObject"];

  for (var i = 0; i < candidates.length; i++) {
    var method = candidates[i];
    try {
      if (typeof lw[method] === "function") lw[method](payload.name);
    } catch(e) {}
    try {
      if (typeof net[method] === "function") net[method](payload.name);
    } catch(e) {}
  }
  return { ok: true, name: payload.name };
}

function handleListDevices() {
  var net = getNet();
  var count = net.getDeviceCount();
  var devices = [];
  
  for (var i = 0; i < count; i++) {
    var device = net.getDeviceAt(i);
    if (device) {
      devices.push({
        name: device.getName(),
        model: device.getModel(),
        type: device.getType(),
        power: device.getPower()
      });
    }
  }
  
  return { ok: true, devices: devices, count: count };
}

function handleRenameDevice(payload) {
  var device = getNet().getDevice(payload.oldName);
  if (!device) return { ok: false, error: "Device not found: " + payload.oldName };
  device.setName(payload.newName);
  return { ok: true, oldName: payload.oldName, newName: payload.newName };
}

function handleAddModule(payload) {
  var device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };
  
  if (!device.addModule) return { ok: false, error: "Device does not support modular expansion" };
  
  var deviceModel = "";
  try { deviceModel = device.getModel() || ""; } catch (e) {}
  
  if (deviceModel && PT_MODULE_CATALOG) {
    var moduleValidation = validateModuleExists(payload.module);
    if (!moduleValidation.valid) {
      return { ok: false, error: "Validación de módulo falló: " + moduleValidation.error };
    }
    
    var slotValidation = validateModuleSlotCompatible(deviceModel, payload.slot, payload.module);
    if (!slotValidation.valid) {
      return { ok: false, error: "Compatibilidad de slot falló: " + slotValidation.error };
    }
  }
  
  var wasPowered = device.getPower();
  
  if (wasPowered) device.setPower(false);
  
  var result = device.addModule(payload.slot, payload.module);
  
  if (wasPowered) {
    device.setPower(true);
    if (device.skipBoot) device.skipBoot();
  }
  
  if (!result) return { ok: false, error: "Failed to add module to slot " + payload.slot };
  
  return { ok: true, device: payload.device, slot: payload.slot, module: payload.module };
}

function handleRemoveModule(payload) {
  var device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };
  
  if (!device.removeModule) return { ok: false, error: "Device does not support modular expansion" };
  
  var wasPowered = device.getPower();
  
  if (wasPowered) device.setPower(false);
  
  var result = device.removeModule(payload.slot);
  
  if (wasPowered) {
    device.setPower(true);
    if (device.skipBoot) device.skipBoot();
  }
  
  if (!result) return { ok: false, error: "Failed to remove module from slot " + payload.slot };
  
  return { ok: true, device: payload.device, slot: payload.slot };
}

function handleAddLink(payload) {
  var lw = getLW();
  var net = getNet();
  loadLinkRegistry();
  var dev1 = net.getDevice(payload.device1);
  var dev2 = net.getDevice(payload.device2);

  dprint("[handleAddLink] Creating link: " + payload.device1 + ":" + payload.port1 + " <-> " + payload.device2 + ":" + payload.port2);

  if (!dev1) return { ok: false, error: "Device not found: " + payload.device1 };
  if (!dev2) return { ok: false, error: "Device not found: " + payload.device2 };

  var dev1Model = "";
  var dev2Model = "";
  try { dev1Model = dev1.getModel() || ""; } catch (e) {}
  try { dev2Model = dev2.getModel() || ""; } catch (e) {}

  var portValidationEnabled = true;

  if (dev1Model && PT_PORT_MAP[dev1Model.toLowerCase()]) {
    var v1 = validatePortExists(dev1Model, payload.port1);
    if (!v1.valid) {
      return { ok: false, error: "Validación de puerto falló: " + v1.error };
    }
  }
  
  if (dev2Model && PT_PORT_MAP[dev2Model.toLowerCase()]) {
    var v2 = validatePortExists(dev2Model, payload.port2);
    if (!v2.valid) {
      return { ok: false, error: "Validación de puerto falló: " + v2.error };
    }
  }

  var END_DEVICE_TYPE_LIST = [
    DEVICE_TYPES.pc, DEVICE_TYPES.server, DEVICE_TYPES.printer, DEVICE_TYPES.ipPhone,
    DEVICE_TYPES.laptop, DEVICE_TYPES.tablet, DEVICE_TYPES.smartphone,
    DEVICE_TYPES.wirelessEndDevice, DEVICE_TYPES.wiredEndDevice, DEVICE_TYPES.tv,
    DEVICE_TYPES.homeVoip, DEVICE_TYPES.analogPhone, DEVICE_TYPES.iot,
    DEVICE_TYPES.sniffer, DEVICE_TYPES.mcu, DEVICE_TYPES.sbc,
  ];

  function isEndDevice(device) {
    try {
      var t = device.getType();
      for (var i = 0; i < END_DEVICE_TYPE_LIST.length; i++) {
        if (END_DEVICE_TYPE_LIST[i] === t) return true;
      }
    } catch (e) {}
    return false;
  }

  function recommendCableType(device1, device2) {
    var type1 = device1.getType();
    var type2 = device2.getType();
    var isSwitchLike = function(type) {
      return type === DEVICE_TYPES.switch || type === DEVICE_TYPES.multilayerSwitch;
    };
    if (type1 === type2) return "cross";
    if (isSwitchLike(type1) && isSwitchLike(type2)) return "cross";
    return "straight";
  }

  function getDevicePowerSafe(device) {
    try {
      if (device && typeof device.getPower === "function") return !!device.getPower();
    } catch (e) {}
    return null;
  }

  function getDevicePortNamesSafe(device) {
    var names = [];
    try {
      if (!device || typeof device.getPortCount !== "function" || typeof device.getPortAt !== "function") return names;
      for (var i = 0; i < device.getPortCount(); i++) {
        var port = device.getPortAt(i);
        if (port && typeof port.getName === "function") names.push(String(port.getName()));
      }
    } catch (e) {}
    return names;
  }

  function getPortDebugInfo(device, requestedName, resolvedName) {
    var portObj = null;
    try {
      if (resolvedName && typeof device.getPort === "function") portObj = device.getPort(resolvedName);
    } catch (e) {}
    return {
      requestedName: requestedName || null,
      resolvedName: resolvedName || null,
      exists: !!portObj,
      devicePower: getDevicePowerSafe(device),
      availablePorts: getDevicePortNamesSafe(device)
    };
  }

  if (dev1 && dev1.skipBoot) dev1.skipBoot();
  if (dev2 && dev2.skipBoot) dev2.skipBoot();

  var resolvedPort1 = resolveDevicePortName(dev1, payload.port1);
  var resolvedPort2 = resolveDevicePortName(dev2, payload.port2);

  if (!resolvedPort1 || !resolvedPort2) {
    return {
      ok: false,
      error: "Port not found",
      details: {
        device1: payload.device1,
        port1: getPortDebugInfo(dev1, payload.port1, resolvedPort1),
        device2: payload.device2,
        port2: getPortDebugInfo(dev2, payload.port2, resolvedPort2)
      }
    };
  }

  var cableTypeName = payload.linkType === "auto"
    ? recommendCableType(dev1, dev2)
    : (payload.linkType || "auto");
    
  if (payload.linkType && payload.linkType !== "auto") {
    var requestedCableLower = payload.linkType.toLowerCase();
    var validCableTypes = Object.keys(CABLE_TYPES).filter(function(k) { return isNaN(Number(k)); });
    var isValidCable = validCableTypes.some(function(t) { return t.toLowerCase() === requestedCableLower; });
    
    if (!isValidCable) {
      return {
        ok: false,
        error: "Tipo de cable '" + payload.linkType + "' no es válido. Tipos válidos: " + validCableTypes.join(", ") + ". Use 'auto' para selección automática."
      };
    }
    
    cableTypeName = validCableTypes.find(function(t) { return t.toLowerCase() === requestedCableLower; }) || "auto";
  }
  
  var cableType = (CABLE_TYPES[cableTypeName] !== undefined)
    ? CABLE_TYPES[cableTypeName]
    : CABLE_TYPES.auto;

  if (cableTypeName !== 'auto') {
    var conn1 = getPortConnector(dev1Model, resolvedPort1);
    var conn2 = getPortConnector(dev2Model, resolvedPort2);
    
    if (conn1) {
      var compat1 = validateCablePortCompatibility(cableTypeName, conn1);
      if (!compat1.valid) {
        return { ok: false, error: "Compatibilidad cable-puerto: " + compat1.error, details: { device: payload.device1, port: resolvedPort1, connector: conn1, cable: cableTypeName } };
      }
    }
    
    if (conn2) {
      var compat2 = validateCablePortCompatibility(cableTypeName, conn2);
      if (!compat2.valid) {
        return { ok: false, error: "Compatibilidad cable-puerto: " + compat2.error, details: { device: payload.device2, port: resolvedPort2, connector: conn2, cable: cableTypeName } };
      }
    }
  }

  var isEnd1 = isEndDevice(dev1);
  var isEnd2 = isEndDevice(dev2);

  var originalOrder = {
    devName1: payload.device1, p1: resolvedPort1,
    devName2: payload.device2, p2: resolvedPort2
  };
  var swappedOrder = {
    devName1: payload.device2, p1: resolvedPort2,
    devName2: payload.device1, p2: resolvedPort1
  };

  var attempts = (isEnd1 && !isEnd2) ? [swappedOrder, originalOrder] : [originalOrder, swappedOrder];

  var success = false;
  var lastError = null;
  var usedAttempt = null;

  for (var i = 0; i < attempts.length; i++) {
    var attempt = attempts[i];
    dprint("[handleAddLink] Attempt " + (i + 1) + ": createLink(" +
      attempt.devName1 + ":" + attempt.p1 + " <-> " +
      attempt.devName2 + ":" + attempt.p2 + " cable=" + cableTypeName + "(" + cableType + "))");
    try {
      success = !!lw.createLink(attempt.devName1, attempt.p1, attempt.devName2, attempt.p2, cableType);
      if (success) { usedAttempt = attempt; dprint("[handleAddLink] SUCCESS on attempt " + (i + 1)); break; }
      else dprint("[handleAddLink] Attempt " + (i + 1) + " returned false");
    } catch (e) {
      lastError = String(e);
      dprint("[handleAddLink] Attempt " + (i + 1) + " threw: " + lastError);
    }
  }

  if (!success) {
    return {
      ok: false,
      error: "Failed to create link. Packet Tracer rejected the request.",
      details: {
        device1: payload.device1,
        port1: getPortDebugInfo(dev1, payload.port1, resolvedPort1),
        device2: payload.device2,
        port2: getPortDebugInfo(dev2, payload.port2, resolvedPort2),
        cableTypeName: cableTypeName, cableType: cableType,
        isEnd1: isEnd1, isEnd2: isEnd2,
        attemptedOrders: [
          attempts[0].devName1 + ":" + attempts[0].p1 + " -> " + attempts[0].devName2 + ":" + attempts[0].p2,
          attempts[1].devName1 + ":" + attempts[1].p1 + " -> " + attempts[1].devName2 + ":" + attempts[1].p2
        ],
        lastError: lastError
      }
    };
  }

  var wasSwapped = (usedAttempt === swappedOrder);

  dprint("[handleAddLink] Link created" + (wasSwapped ? " (swapped order)" : "") +
    ": " + payload.device1 + ":" + resolvedPort1 + " <-> " + payload.device2 + ":" + resolvedPort2);

  var linkKey = payload.device1 + ":" + payload.port1 + "--" + payload.device2 + ":" + payload.port2;
  LINK_REGISTRY[linkKey] = {
    device1: payload.device1, port1: payload.port1,
    device2: payload.device2, port2: payload.port2,
    linkType: payload.linkType || "auto"
  };
  saveLinkRegistry();

  return {
    ok: true,
    device1: payload.device1,
    port1: resolvedPort1,
    device2: payload.device2,
    port2: resolvedPort2,
    linkType: payload.linkType || "auto",
    swapped: wasSwapped
  };
}

function handleRemoveLink(payload) {
  loadLinkRegistry();
  getLW().deleteLink(payload.device, payload.port);
  for (var linkId in LINK_REGISTRY) {
    if (linkId.indexOf(payload.device + ":" + payload.port) >= 0) {
      delete LINK_REGISTRY[linkId];
    }
  }
  saveLinkRegistry();
  return { ok: true };
}

function handleConfigHost(payload) {
  var device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };
  
  var port = device.getPortAt(0);
  if (!port) return { ok: false, error: "No ports on device" };
  
  if (payload.dhcp === true) {
    try { port.setDhcpEnabled(true); } catch(e) {}
  } else {
    if (payload.ip && payload.mask) {
      port.setIpSubnetMask(payload.ip, payload.mask);
    }
    if (payload.gateway) {
      port.setDefaultGateway(payload.gateway);
    }
    if (payload.dns) {
      port.setDnsServerIp(payload.dns);
    }
  }
  
  return { ok: true, device: payload.device, ip: payload.ip };
}

function handleMoveDevice(payload) {
  var net = getNet();
  var device = net.getDevice(payload.name);
  if (!device) return { ok: false, error: "Device not found: " + payload.name };

  var x = Math.round(payload.x !== undefined ? payload.x : 0);
  var y = Math.round(payload.y !== undefined ? payload.y : 0);
  var moved = false;
  var method = "";

  try {
    if (typeof device.moveToLocation === "function") {
      moved = !!device.moveToLocation(x, y);
      method = "moveToLocation";
    }

    if (!moved && typeof device.moveToLocationCentered === "function") {
      moved = !!device.moveToLocationCentered(x, y);
      method = "moveToLocationCentered";
    }
  } catch (e) {
    return { ok: false, error: "Failed to move device: " + String(e), code: "INTERNAL_ERROR" };
  }

  if (!moved) {
    return { ok: false, error: "Packet Tracer rejected move", code: "INTERNAL_ERROR", details: { name: payload.name, x: x, y: y } };
  }

  return { ok: true, name: payload.name, x: x, y: y, method: method };
}
`;
}
