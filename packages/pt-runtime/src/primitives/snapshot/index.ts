// ============================================================================
// Snapshot Primitives - Captura de estado
// ============================================================================

import { registerPrimitive } from "../primitive-registry";
import type { PrimitiveDomain } from "../primitive-registry";

export interface SnapshotPrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}

export interface TopologySnapshotResult {
  devices: Array<{
    name: string;
    model: string;
    type: number;
    power: boolean;
    x: number;
    y: number;
  }>;
  links: Array<{
    device1: string;
    port1: string;
    device2: string;
    port2: string;
  }>;
  timestamp: number;
}

export interface HardwareInfoResult {
  device: string;
  model: string;
  type: number;
  modules: Array<{ slot: number; name: string }>;
  ports: Array<{ name: string; status: string }>;
}

export interface ProcessInfoResult {
  device: string;
  processes: Array<{ name: string; pid?: number }>;
  uptime: number;
}

export function topologySnapshot(net: any): SnapshotPrimitiveResult {
  try {
    const deviceCount = net.getDeviceCount();
    const devices: TopologySnapshotResult["devices"] = [];
    const links: TopologySnapshotResult["links"] = [];

    for (let i = 0; i < deviceCount; i++) {
      const device = net.getDeviceAt(i);
      if (device) {
        devices.push({
          name: device.getName(),
          model: device.getModel(),
          type: device.getType(),
          power: device.getPower(),
          x: device.getX?.() ?? 0,
          y: device.getY?.() ?? 0,
        });
      }
    }

    const linkCount = net.getLinkCount?.() || 0;
    for (let i = 0; i < linkCount; i++) {
      const link = net.getLinkAt?.(i);
      if (link) {
        links.push({
          device1: link.getDevice1Name?.() || "",
          port1: link.getPort1Name?.() || "",
          device2: link.getDevice2Name?.() || "",
          port2: link.getPort2Name?.() || "",
        });
      }
    }

    return {
      ok: true,
      value: { devices, links },
      evidence: { devices, links, timestamp: Date.now() },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "SNAPSHOT_FAILED" };
  }
}

export function hardwareInfo(deviceName: string, net: any): SnapshotPrimitiveResult {
  try {
    const device = net.getDevice(deviceName);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }

    const model = device.getModel();
    const type = device.getType();
    const modules: HardwareInfoResult["modules"] = [];
    const ports: HardwareInfoResult["ports"] = [];

    const rootModule = device.getRootModule?.();
    if (rootModule) {
      const slotCount = rootModule.getSlotCount?.() || 0;
      for (let i = 0; i < slotCount; i++) {
        const moduleName = rootModule.getModuleNameAsString?.(i);
        modules.push({ slot: i, name: moduleName || "unknown" });
      }
    }

    const portCount = device.getPortCount();
    for (let i = 0; i < portCount; i++) {
      const port = device.getPortAt(i);
      if (port) {
        ports.push({
          name: port.getName(),
          status: port.isPortUp?.() ? "up" : "down",
        });
      }
    }

    return {
      ok: true,
      value: { device: deviceName, model, type, modules, ports },
      evidence: { model, type, modules, ports },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "HARDWARE_INFO_FAILED" };
  }
}

export function processInfo(deviceName: string, net: any): SnapshotPrimitiveResult {
  try {
    const device = net.getDevice(deviceName);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }

    const processes: ProcessInfoResult["processes"] = [];
    const knownProcesses = ["DhcpServer", "VlanManager", "RoutingProcess", "StpMain"];

    for (const procName of knownProcesses) {
      const proc = device.getProcess?.(procName);
      if (proc) {
        processes.push({ name: procName });
      }
    }

    const uptime = device.getUpTime?.() || 0;

    return {
      ok: true,
      value: { device: deviceName, processes, uptime },
      evidence: { processes, uptime },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "PROCESS_INFO_FAILED" };
  }
}

registerPrimitive({
  id: "topology.snapshot",
  domain: "snapshot" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => topologySnapshot(ctx.net)) as any,
});

registerPrimitive({
  id: "topology.hardwareInfo",
  domain: "snapshot" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => hardwareInfo(payload.device, ctx.net)) as any,
});

registerPrimitive({
  id: "topology.processInfo",
  domain: "snapshot" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => processInfo(payload.device, ctx.net)) as any,
});