// ============================================================================
// Omniscience Physical Handlers - L1/L2 Discovery (ES5 Strict)
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";

export function handleSiphonPhysicalTopology(_payload: any, deps: HandlerDeps): HandlerResult {
  var net = deps.ipc.network();
  var dCount = net.getDeviceCount();
  var portMap: Record<string, string[]> = {}; // Key: UUID (string), Value: Array of "Dev:Port"
  var result = [];

  for (var i = 0; i < dCount; i++) {
    var dev = net.getDeviceAt(i) as any;
    if (!dev) continue;
    var devName = String(dev.getName());
    var pCount = dev.getPortCount();

    for (var j = 0; j < pCount; j++) {
      var p = dev.getPortAt(j) as any;
      if (!p) continue;
      var link = typeof p.getLink === "function" ? p.getLink() : null;
      if (link) {
        // FORCE STRING KEY
        var linkId =
          typeof link.getObjectUuid === "function" ? String(link.getObjectUuid()) : "unknown";
        if (!portMap[linkId]) {
          portMap[linkId] = [];
        }
        portMap[linkId].push(devName + ":" + String(p.getName()));
      }
    }
  }

  for (var id in portMap) {
    if (Object.prototype.hasOwnProperty.call(portMap, id)) {
      var endpoints = portMap[id];
      var safeId = String(id);
      if (endpoints.length === 2) {
        result.push(safeId + ":::" + String(endpoints[0]) + " <---> " + String(endpoints[1]));
      } else if (endpoints.length === 1) {
        result.push(safeId + ":::" + String(endpoints[0]) + " <---> [PENDING]");
      }
    }
  }

  return { ok: true, result: result.join("|||") };
}

export function handleGetDeviceHardwareInfo(
  payload: { deviceName: string },
  deps: HandlerDeps,
): HandlerResult {
  var dev = deps.ipc.network().getDevice(payload.deviceName) as any;
  if (!dev) return { ok: false, error: "Device not found: " + payload.deviceName };

  var info = {
    name: String(dev.getName()),
    model: String(dev.getModel()),
    serial: typeof dev.getSerialNumber === "function" ? String(dev.getSerialNumber()) : "N/A",
    bia: typeof dev.getBia === "function" ? String(dev.getBia()) : "N/A",
    x: typeof dev.getGlobalXPhysicalWS === "function" ? dev.getGlobalXPhysicalWS() : -1,
    y: typeof dev.getGlobalYPhysicalWS === "function" ? dev.getGlobalYPhysicalWS() : -1,
    modules: typeof dev.getSupportedModule === "function" ? String(dev.getSupportedModule()) : "",
  };

  return { ok: true, result: info };
}

export function handleGetPortDeepStats(
  payload: { deviceName: string; portName: string },
  deps: HandlerDeps,
): HandlerResult {
  var dev = deps.ipc.network().getDevice(payload.deviceName) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  var port = dev.getPort(payload.portName) as any;
  if (!port) return { ok: false, error: "Port not found" };

  var stats = {
    name: String(port.getName()),
    status: typeof port.getLightStatus === "function" ? port.getLightStatus() : -1,
    up: typeof port.isPortUp === "function" ? port.isPortUp() : false,
    mac: typeof port.getMacAddress === "function" ? String(port.getMacAddress()) : "N/A",
    ip: typeof port.getIpAddress === "function" ? String(port.getIpAddress()) : "0.0.0.0",
    bandwidth: typeof port.getBandwidth === "function" ? port.getBandwidth() : 0,
    duplex: typeof port.isFullDuplex === "function" ? port.isFullDuplex() : true,
    ospfHello: typeof port.getOspfHelloInterval === "function" ? port.getOspfHelloInterval() : -1,
    aclIn: typeof port.getAclInID === "function" ? String(port.getAclInID()) : "",
  };

  return { ok: true, result: stats };
}
