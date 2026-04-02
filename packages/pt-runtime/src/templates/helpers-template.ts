/**
 * Runtime Helpers Template - Generates helper functions section
 * Device type resolution, model lookup, etc.
 */

export function generateHelpersTemplate(): string {
  return `// ============================================================================
// Helpers
// ============================================================================

function getLW() {
  return ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
}

function getNet() {
  return ipc.network();
}

function resolveModel(model) {
  if (!model) return "2911";
  var key = model.toLowerCase();
  return MODEL_ALIASES[key] || model;
}

function getDeviceTypeForModel(model) {
  var name = (model || "").toLowerCase();
  if (name.indexOf("2960") === 0 || name.indexOf("3560") === 0 || name.indexOf("switch") >= 0) return DEVICE_TYPES.switch;
  if (name.indexOf("pc") === 0 || name.indexOf("laptop") === 0) return DEVICE_TYPES.pc;
  if (name.indexOf("server") === 0) return DEVICE_TYPES.server;
  if (name.indexOf("accesspoint") >= 0 || name.indexOf("wireless") >= 0) return DEVICE_TYPES.wireless;
  if (name.indexOf("cloud") >= 0) return DEVICE_TYPES.cloud;
  return DEVICE_TYPES.router;
}

function getDeviceTypeCandidates(model) {
  var normalized = (model || "").toLowerCase();
  
  if (normalized.indexOf("2960") === 0 || normalized.indexOf("3560") === 0 || normalized.indexOf("switch") >= 0) {
    return [DEVICE_TYPES.switch, DEVICE_TYPES.router];
  }
  
  if (normalized.indexOf("pc") === 0 || normalized.indexOf("laptop") === 0) {
    var candidates = [DEVICE_TYPES.pc, DEVICE_TYPES.end];
    for (var t = 8; t <= 60; t++) {
      if (candidates.indexOf(t) === -1) candidates.push(t);
    }
    return candidates;
  }
  
  if (normalized.indexOf("server") === 0) {
    var serverCandidates = [DEVICE_TYPES.server, DEVICE_TYPES.end];
    for (var s = 8; s <= 60; s++) {
      if (serverCandidates.indexOf(s) === -1) serverCandidates.push(s);
    }
    return serverCandidates;
  }
  
  return [DEVICE_TYPES.router, DEVICE_TYPES.switch, DEVICE_TYPES.pc];
}

function createDeviceWithFallback(model, x, y, typeList, lw, net) {
  for (var i = 0; i < typeList.length; i++) {
    var typeId = typeList[i];
    var autoName = lw.addDevice(typeId, model, x, y);
    if (!autoName) continue;
    
    var device = net.getDevice(autoName);
    if (!device) {
      lw.removeDevice(autoName);
      continue;
    }
    
    var deviceModel = "";
    try { deviceModel = (device.getModel && device.getModel()) || ""; } catch (e) {}
    
    if (deviceModel && deviceModel.toLowerCase() === model.toLowerCase()) {
      return { autoName: autoName, device: device, typeId: typeId };
    }
    
    lw.removeDevice(autoName);
  }
  return null;
}
`;
}
