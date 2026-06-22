import { createErrorResult, createSuccessResult } from "./result-factories";
import type { PtRuntimeApi } from "../pt-api/pt-deps";
import type { PtResult } from "../pt-api/pt-results";

export interface DeviceInfoPayload {
  type: "deviceInfo";
  device: string;
  includeProcesses?: boolean;
  includeModules?: boolean;
  includePosition?: boolean;
}

export function handleDeviceInfo(payload: DeviceInfoPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.device) {
    return createErrorResult("Missing payload.device", "INVALID_PAYLOAD");
  }

  var net = api.ipc.network();
  var dev = net.getDevice(payload.device);
  if (!dev) {
    return createErrorResult("Device not found: " + payload.device, "DEVICE_NOT_FOUND");
  }

  var info: Record<string, unknown> = {
    name: dev.getName(),
    model: typeof dev.getModel === "function" ? dev.getModel() : "unknown",
    type: typeof dev.getType === "function" ? dev.getType() : -1,
  };

  try { info.power = !!dev.getPower(); } catch {}
  try { info.isBooting = !!dev.isBooting(); } catch {}
  try { info.uptimeSecs = typeof dev.getUpTime === "function" ? dev.getUpTime() : null; } catch {}
  try { info.serialNumber = typeof dev.getSerialNumber === "function" ? dev.getSerialNumber() : null; } catch {}
  try { info.dhcpFlag = !!dev.getDhcpFlag(); } catch {}

  if (payload.includePosition !== false) {
    try { info.x = typeof dev.getX === "function" ? dev.getX() : null; } catch {}
    try { info.y = typeof dev.getY === "function" ? dev.getY() : null; } catch {}
  }

  if (payload.includeModules) {
    try {
      var root = dev.getRootModule ? dev.getRootModule() : null;
      if (root) {
        info.slotCount = typeof root.getSlotCount === "function" ? root.getSlotCount() : 0;
        info.moduleCount = typeof root.getModuleCount === "function" ? root.getModuleCount() : 0;
      }
    } catch {}
  }

  if (payload.includeProcesses) {
    var processes: string[] = [];
    var knownProcesses = [
      "DhcpServerProcess", "DhcpServerMainProcess", "VlanManager",
      "RoutingProcess", "StpMainProcess", "DnsServerProcess",
      "HttpServerProcess", "FtpServerProcess", "EmailServerProcess",
      "SyslogServerProcess", "NtpServerProcess", "TftpServerProcess",
      "FirewallProcess", "NatProcess", "AclProcess",
    ];
    for (var i = 0; i < knownProcesses.length; i++) {
      try {
        var proc = dev.getProcess(knownProcesses[i]);
        if (proc !== null && proc !== undefined) {
          processes.push(knownProcesses[i]);
        }
      } catch {}
    }
    info.processes = processes;
  }

  return createSuccessResult(info);
}

export interface DeviceListMethodsPayload {
  type: "deviceListMethods";
  device: string;
}

export function handleDeviceListMethods(payload: DeviceListMethodsPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.device) {
    return createErrorResult("Missing payload.device", "INVALID_PAYLOAD");
  }

  var dev = api.ipc.network().getDevice(payload.device);
  if (!dev) {
    return createErrorResult("Device not found: " + payload.device, "DEVICE_NOT_FOUND");
  }

  var methods: string[] = [];
  var obj: any = dev;
  for (var key in obj) {
    if (typeof obj[key] === "function") {
      methods.push(key);
    }
  }

  return createSuccessResult({
    device: payload.device,
    methods: methods.sort(),
    count: methods.length,
  });
}
