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
  
  var typeStr = 'generic';
  if (created.typeId === 0) typeStr = 'router';
  else if (created.typeId === 1) typeStr = 'switch';
  else if (created.typeId === 8) typeStr = 'pc';
  else if (created.typeId === 9) typeStr = 'server';
  else if (created.typeId === 16) typeStr = 'switch';
  
  return { ok: true, name: name, autoName: autoName, model: model, type: typeStr, typeId: created.typeId };
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
  
  var dhcpEnabled = false;
  var actualIp = "";
  var actualMask = "";
  var actualGateway = "";
  var actualDns = "";
  
  if (payload.dhcp === true) {
    // Intentar setDhcpFlag a nivel dispositivo (Pc/Server)
    if (typeof device.setDhcpFlag === "function") {
      try {
        device.setDhcpFlag(true);
        if (typeof device.getDhcpFlag === "function") {
          dhcpEnabled = !!device.getDhcpFlag();
        }
      } catch(e) {
        dprint("[handleConfigHost] setDhcpFlag failed: " + String(e));
      }
    }
    
    // Intentar setDhcpClientFlag en el puerto (HostPort)
    if (!dhcpEnabled && typeof port.setDhcpClientFlag === "function") {
      try {
        port.setDhcpClientFlag(true);
        if (typeof port.isDhcpClientOn === "function") {
          dhcpEnabled = !!port.isDhcpClientOn();
        }
      } catch(e) {
        dprint("[handleConfigHost] setDhcpClientFlag failed: " + String(e));
      }
    }
    
    // Fallback a setDhcpEnabled (API antigua)
    if (!dhcpEnabled && typeof port.setDhcpEnabled === "function") {
      try {
        port.setDhcpEnabled(true);
        dhcpEnabled = true; // Asumimos éxito sin verificación
      } catch(e) {
        dprint("[handleConfigHost] setDhcpEnabled failed: " + String(e));
      }
    }
    
    // Leer IP adicional asignada por DHCP
    try { actualIp = String(port.getIpAddress()); } catch(e) {}
    try { actualMask = String(port.getSubnetMask()); } catch(e) {}
    try { actualGateway = String(port.getDefaultGateway()); } catch(e) {}
    
    return { 
      ok: true, 
      device: payload.device, 
      dhcp: dhcpEnabled,
      ip: actualIp,
      mask: actualMask,
      gateway: actualGateway
    };
  }
  
  // Configuración estática
  if (payload.ip && payload.mask) {
    try {
      port.setIpSubnetMask(payload.ip, payload.mask);
    } catch(e) {
      return { ok: false, error: "Failed to set IP: " + String(e) };
    }
  }
  if (payload.gateway) {
    try {
      port.setDefaultGateway(payload.gateway);
    } catch(e) {
      return { ok: false, error: "Failed to set gateway: " + String(e) };
    }
  }
  if (payload.dns && typeof port.setDnsServerIp === "function") {
    try {
      port.setDnsServerIp(payload.dns);
    } catch(e) {
      // DNS es opcional, no fallar
    }
  }
  
  // Desactivar DHCP si estaba activo
  if (typeof device.setDhcpFlag === "function") {
    try { device.setDhcpFlag(false); } catch(e) {}
  } else if (typeof port.setDhcpClientFlag === "function") {
    try { port.setDhcpClientFlag(false); } catch(e) {}
  } else if (typeof port.setDhcpEnabled === "function") {
    try { port.setDhcpEnabled(false); } catch(e) {}
  }
  
  // Leer valores actuales
  try { actualIp = String(port.getIpAddress()); } catch(e) {}
  try { actualMask = String(port.getSubnetMask()); } catch(e) {}
  try { actualGateway = String(port.getDefaultGateway()); } catch(e) {}
  try { 
    if (typeof device.getDhcpFlag === "function") {
      dhcpEnabled = !!device.getDhcpFlag();
    } else if (typeof port.isDhcpClientOn === "function") {
      dhcpEnabled = !!port.isDhcpClientOn();
    }
  } catch(e) {}
  
  // Configuración IPv6
  var ipv6Enabled = false;
  var ipv6AutoConfig = false;
  var ipv6Address = "";
  var ipv6Prefix = "";
  var ipv6Gateway = "";
  var ipv6Dns = "";
  
  if (payload.ipv6) {
    var ipv6 = payload.ipv6;
    
    // Habilitar IPv6
    if (ipv6.enabled !== undefined && typeof port.setIpv6Enabled === "function") {
      try {
        port.setIpv6Enabled(ipv6.enabled);
        ipv6Enabled = ipv6.enabled;
        dprint("[handleConfigHost] IPv6 enabled: " + ipv6.enabled);
      } catch(e) {
        dprint("[handleConfigHost] setIpv6Enabled failed: " + String(e));
      }
    }
    
    // Auto-configuración IPv6
    if (ipv6.autoConfig === true && typeof port.setIpv6AddressAutoConfig === "function") {
      try {
        port.setIpv6AddressAutoConfig(true);
        ipv6AutoConfig = true;
        dprint("[handleConfigHost] IPv6 autoConfig enabled");
      } catch(e) {
        dprint("[handleConfigHost] setIpv6AddressAutoConfig failed: " + String(e));
      }
    }
    
    // Gateway IPv6
    if (ipv6.gateway && typeof port.setv6DefaultGateway === "function") {
      try {
        port.setv6DefaultGateway(ipv6.gateway);
        ipv6Gateway = ipv6.gateway;
      } catch(e) {
        dprint("[handleConfigHost] setv6DefaultGateway failed: " + String(e));
      }
    }
    
    // DNS IPv6
    if (ipv6.dns && typeof port.setv6ServerIp === "function") {
      try {
        port.setv6ServerIp(ipv6.dns);
        ipv6Dns = ipv6.dns;
      } catch(e) {
        dprint("[handleConfigHost] setv6ServerIp failed: " + String(e));
      }
    }
    
    // Guardar valores de configuración manual (si existen)
    if (ipv6.address) ipv6Address = ipv6.address;
    if (ipv6.prefix) ipv6Prefix = ipv6.prefix;
  }
  
  // Configuración Firewall
  var firewallIpv4 = "";
  var firewallIpv6 = "";
  
  if (payload.firewall) {
    var fw = payload.firewall;
    
    // Firewall IPv4
    if (fw.ipv4 !== undefined && typeof port.setInboundFirewallService === "function") {
      try {
        var fw4State = fw.ipv4 ? "on" : "off";
        port.setInboundFirewallService(fw4State);
        firewallIpv4 = fw4State;
        dprint("[handleConfigHost] Firewall IPv4: " + fw4State);
      } catch(e) {
        dprint("[handleConfigHost] setInboundFirewallService failed: " + String(e));
      }
    }
    
    // Firewall IPv6
    if (fw.ipv6 !== undefined && typeof port.setInboundIpv6FirewallService === "function") {
      try {
        var fw6State = fw.ipv6 ? "on" : "off";
        port.setInboundIpv6FirewallService(fw6State);
        firewallIpv6 = fw6State;
        dprint("[handleConfigHost] Firewall IPv6: " + fw6State);
      } catch(e) {
        dprint("[handleConfigHost] setInboundIpv6FirewallService failed: " + String(e));
      }
    }
  }
  
  // Configuración MTU
  var mtuGeneral = 0;
  var mtuIpv4 = 0;
  var mtuIpv6 = 0;
  
  if (payload.mtu) {
    var mtu = payload.mtu;
    
    // MTU general
    if (mtu.general !== undefined && typeof port.setMtu === "function") {
      try {
        port.setMtu(mtu.general);
        mtuGeneral = mtu.general;
        dprint("[handleConfigHost] MTU general: " + mtu.general);
      } catch(e) {
        dprint("[handleConfigHost] setMtu failed: " + String(e));
      }
    }
    
    // MTU IPv4
    if (mtu.ipv4 !== undefined && typeof port.setIpMtu === "function") {
      try {
        port.setIpMtu(mtu.ipv4);
        mtuIpv4 = mtu.ipv4;
        dprint("[handleConfigHost] MTU IPv4: " + mtu.ipv4);
      } catch(e) {
        dprint("[handleConfigHost] setIpMtu failed: " + String(e));
      }
    }
    
    // MTU IPv6
    if (mtu.ipv6 !== undefined && typeof port.setIpv6Mtu === "function") {
      try {
        port.setIpv6Mtu(mtu.ipv6);
        mtuIpv6 = mtu.ipv6;
        dprint("[handleConfigHost] MTU IPv6: " + mtu.ipv6);
      } catch(e) {
        dprint("[handleConfigHost] setIpv6Mtu failed: " + String(e));
      }
    }
  }
  
  return { 
    ok: true, 
    device: payload.device,
    dhcp: dhcpEnabled,
    ip: actualIp,
    mask: actualMask,
    gateway: actualGateway,
    dns: payload.dns || "",
    ipv6: {
      enabled: ipv6Enabled,
      autoConfig: ipv6AutoConfig,
      address: ipv6Address,
      prefix: ipv6Prefix,
      gateway: ipv6Gateway,
      dns: ipv6Dns
    },
    firewall: {
      ipv4: firewallIpv4,
      ipv6: firewallIpv6
    },
    mtu: {
      general: mtuGeneral,
      ipv4: mtuIpv4,
      ipv6: mtuIpv6
    }
  };
}

function handleInspectHost(payload) {
  var device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };
  
  var port = device.getPortAt(0);
  if (!port) return { ok: false, error: "No ports on device" };
  
  var result = {
    ok: true,
    device: payload.device,
    link: {
      physicalUp: undefined,
      protocolUp: undefined
    },
    ipv4: {
      address: undefined,
      mask: undefined,
      gateway: undefined,
      dns: undefined,
      dhcp: undefined
    },
    ipv6: {
      enabled: undefined,
      address: undefined,
      gateway: undefined,
      dns: undefined
    },
    firewall: {
      ipv4: undefined,
      ipv6: undefined
    },
    mtu: {
      general: undefined,
      ipv4: undefined,
      ipv6: undefined
    }
  };
  
  // Link status
  try { result.link.physicalUp = !!port.isPortUp(); dprint("[handleInspectHost] isPortUp: " + result.link.physicalUp); } catch(e) { dprint("[handleInspectHost] isPortUp failed: " + String(e)); }
  try { result.link.protocolUp = !!port.isProtocolUp(); dprint("[handleInspectHost] isProtocolUp: " + result.link.protocolUp); } catch(e) { dprint("[handleInspectHost] isProtocolUp failed: " + String(e)); }
  
  // IPv4
  try { result.ipv4.address = String(port.getIpAddress()); dprint("[handleInspectHost] getIpAddress: " + result.ipv4.address); } catch(e) { dprint("[handleInspectHost] getIpAddress failed: " + String(e)); }
  try { result.ipv4.mask = String(port.getSubnetMask()); dprint("[handleInspectHost] getSubnetMask: " + result.ipv4.mask); } catch(e) { dprint("[handleInspectHost] getSubnetMask failed: " + String(e)); }
  try { result.ipv4.gateway = String(port.getDefaultGateway()); dprint("[handleInspectHost] getDefaultGateway: " + result.ipv4.gateway); } catch(e) { dprint("[handleInspectHost] getDefaultGateway failed: " + String(e)); }
  try { result.ipv4.dns = String(port.getDnsServerIp()); dprint("[handleInspectHost] getDnsServerIp: " + result.ipv4.dns); } catch(e) { dprint("[handleInspectHost] getDnsServerIp failed: " + String(e)); }
  
  // DHCP status
  try {
    if (typeof device.getDhcpFlag === "function") {
      result.ipv4.dhcp = !!device.getDhcpFlag();
    } else if (typeof port.isDhcpClientOn === "function") {
      result.ipv4.dhcp = !!port.isDhcpClientOn();
    }
    dprint("[handleInspectHost] dhcp: " + result.ipv4.dhcp);
  } catch(e) { dprint("[handleInspectHost] dhcp check failed: " + String(e)); }
  
  // IPv6
  try {
    if (typeof port.getIpv6Enabled === "function") {
      result.ipv6.enabled = !!port.getIpv6Enabled();
      dprint("[handleInspectHost] getIpv6Enabled: " + result.ipv6.enabled);
    }
  } catch(e) { dprint("[handleInspectHost] getIpv6Enabled failed: " + String(e)); }
  
  try { result.ipv6.address = String(port.getIpv6Address()); dprint("[handleInspectHost] getIpv6Address: " + result.ipv6.address); } catch(e) { dprint("[handleInspectHost] getIpv6Address failed: " + String(e)); }
  
  try {
    if (typeof port.getv6DefaultGateway === "function") {
      result.ipv6.gateway = String(port.getv6DefaultGateway());
      dprint("[handleInspectHost] getv6DefaultGateway: " + result.ipv6.gateway);
    }
  } catch(e) { dprint("[handleInspectHost] getv6DefaultGateway failed: " + String(e)); }
  
  try {
    if (typeof port.getv6ServerIp === "function") {
      result.ipv6.dns = String(port.getv6ServerIp());
      dprint("[handleInspectHost] getv6ServerIp: " + result.ipv6.dns);
    }
  } catch(e) { dprint("[handleInspectHost] getv6ServerIp failed: " + String(e)); }
  
  // Firewall
  try {
    if (typeof port.getInboundFirewallServiceStatus === "function") {
      result.firewall.ipv4 = String(port.getInboundFirewallServiceStatus());
      dprint("[handleInspectHost] getInboundFirewallServiceStatus: " + result.firewall.ipv4);
    } else if (typeof port.getInboundFirewallService === "function") {
      // Fallback para API antigua
      result.firewall.ipv4 = String(port.getInboundFirewallService());
      dprint("[handleInspectHost] getInboundFirewallService: " + result.firewall.ipv4);
    }
  } catch(e) { dprint("[handleInspectHost] firewall ipv4 check failed: " + String(e)); }
  
  try {
    if (typeof port.getInboundIpv6FirewallServiceStatus === "function") {
      result.firewall.ipv6 = String(port.getInboundIpv6FirewallServiceStatus());
      dprint("[handleInspectHost] getInboundIpv6FirewallServiceStatus: " + result.firewall.ipv6);
    } else if (typeof port.getInboundIpv6FirewallService === "function") {
      // Fallback para API antigua
      result.firewall.ipv6 = String(port.getInboundIpv6FirewallService());
      dprint("[handleInspectHost] getInboundIpv6FirewallService: " + result.firewall.ipv6);
    }
  } catch(e) { dprint("[handleInspectHost] firewall ipv6 check failed: " + String(e)); }
  
  // MTU
  try { result.mtu.general = Number(port.getMtu()); dprint("[handleInspectHost] getMtu: " + result.mtu.general); } catch(e) { dprint("[handleInspectHost] getMtu failed: " + String(e)); }
  try { result.mtu.ipv4 = Number(port.getIpMtu()); dprint("[handleInspectHost] getIpMtu: " + result.mtu.ipv4); } catch(e) { dprint("[handleInspectHost] getIpMtu failed: " + String(e)); }
  try { result.mtu.ipv6 = Number(port.getIpv6Mtu()); dprint("[handleInspectHost] getIpv6Mtu: " + result.mtu.ipv6); } catch(e) { dprint("[handleInspectHost] getIpv6Mtu failed: " + String(e)); }
  
  return result;
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
