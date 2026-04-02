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
  var model = resolveModel(payload.model);
  var name = payload.name || model;
  var x = payload.x !== undefined ? payload.x : 100;
  var y = payload.y !== undefined ? payload.y : 100;
  
  var typeList = payload.deviceType !== undefined 
    ? [payload.deviceType] 
    : getDeviceTypeCandidates(model);
  
  var created = createDeviceWithFallback(model, x, y, typeList, lw, net);
  if (!created) {
    return { ok: false, error: "Failed to add device for model: " + model };
  }
  
  var autoName = created.autoName;
  var device = created.device;
  
  device.setName(name);
  if (device.skipBoot) device.skipBoot();
  
  return { ok: true, name: name, autoName: autoName, model: model, deviceType: created.typeId };
}

function handleRemoveDevice(payload) {
  getLW().removeDevice(payload.name);
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
  var cableType = CABLE_TYPES[payload.linkType] || CABLE_TYPES.auto;
  
  var success = lw.createLink(
    payload.device1, payload.port1,
    payload.device2, payload.port2,
    cableType
  );
  
  if (!success) return { ok: false, error: "Failed to create link" };
  
  return {
    ok: true,
    device1: payload.device1,
    port1: payload.port1,
    device2: payload.device2,
    port2: payload.port2,
    linkType: payload.linkType || "auto"
  };
}

function handleRemoveLink(payload) {
  getLW().deleteLink(payload.device, payload.port);
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

  var x = payload.x !== undefined ? payload.x : 0;
  var y = payload.y !== undefined ? payload.y : 0;

  try {
    if (typeof device.setX === "function" && typeof device.setY === "function") {
      device.setX(x);
      device.setY(y);
      return { ok: true, name: payload.name, x: x, y: y };
    }

    var lp = device.logicalPosition;
    if (lp && typeof lp === "object" && "setX" in lp && "setY" in lp) {
      lp.setX(x);
      lp.setY(y);
      return { ok: true, name: payload.name, x: x, y: y };
    }

    var dev = device;
    var moved = false;
    while (dev) {
      if (typeof dev.setX === "function" && typeof dev.setY === "function") {
        dev.setX(x);
        dev.setY(y);
        moved = true;
        break;
      }
      dev = dev.prototype || null;
    }

    if (moved) {
      return { ok: true, name: payload.name, x: x, y: y };
    }

    return { ok: false, error: "setX/setY not available in this PT API version", code: "INTERNAL_ERROR" };
  } catch (e) {
    return { ok: false, error: "Failed to move device: " + String(e), code: "INTERNAL_ERROR" };
  }
}
`;
}
