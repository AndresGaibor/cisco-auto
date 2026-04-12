// packages/pt-runtime/src/runtime/pt-version.ts
// PT Version Detection — Probe PT's runtime to determine version

export interface PtVersion {
  major: number;
  minor: number;
  patch: number;
  toString(): string;
}

export interface PtCapability {
  name: string;
  available: boolean;
  sinceVersion: string;
  fallback: string;
}

export interface PtIpc {
  network(): PtNetwork | null;
  systemFileManager(): PtFileManager | null;
  appWindow(): PtAppWindow | null;
}

export interface PtNetwork {
  getDeviceCount(): number;
  getDeviceAt(index: number): PtDevice | null;
}

export interface PtDevice {
  getPortAt(index: number): PtPort | null;
  getPort(name: string): PtPort | null;
  getPortCount(): number;
  moveToLocation(x: number, y: number): void;
  moveToLocationCentered(x: number, y: number): void;
  setDhcpFlag(enabled: boolean): void;
  getDhcpFlag(): boolean;
  skipBoot(): void;
  getProcess(name: string): PtProcess | null;
}

export interface PtPort {
  setDhcpClientFlag(enabled: boolean): void;
  isDhcpClientOn(): boolean;
  setIpv6Enabled(enabled: boolean): void;
  getInboundFirewallServiceStatus(): string;
}

export interface PtProcess {
  getDhcpServerProcessByPortName(portName: string): PtDhcpServerProcess | null;
  getVlanCount(): number;
}

export interface PtDhcpServerProcess {
  // DHCP server specific methods
}

export interface PtFileManager {
  // File manager methods
}

export interface PtAppWindow {
  getActiveWorkspace(): PtWorkspace | null;
}

export interface PtWorkspace {
  getLogicalWorkspace(): PtLogicalWorkspace | null;
}

export interface PtLogicalWorkspace {
  deleteDevice(name: string): void;
  deleteObject(id: string): void;
}

var KNOWN_CAPABILITIES: Record<string, { sinceVersion: string; fallback: string }> = {
  "PTDevice.getPort": { sinceVersion: "8.0", fallback: "Use getPortAt() for name match" },
  "PTDevice.moveToLocation": {
    sinceVersion: "7.3",
    fallback: "Use moveToLocationCentered instead",
  },
  "PTDevice.moveToLocationCentered": {
    sinceVersion: "7.3",
    fallback: "Use moveToLocation instead",
  },
  "PTDevice.setDhcpFlag": { sinceVersion: "7.2", fallback: "Use port.setDhcpClientFlag instead" },
  "PTDevice.skipBoot": { sinceVersion: "8.2", fallback: "No skipBoot support" },
  "PTPort.setDhcpClientFlag": { sinceVersion: "8.0", fallback: "Use PTDevice.setDhcpFlag instead" },
  "PTPort.isDhcpClientOn": { sinceVersion: "8.0", fallback: "Use PTDevice.getDhcpFlag instead" },
  "PTPort.setIpv6Enabled": { sinceVersion: "7.3", fallback: "No IPv6 support" },
  "PTPort.getInboundFirewallServiceStatus": {
    sinceVersion: "8.0",
    fallback: "No firewall status API",
  },
  "PTLogicalWorkspace.deleteDevice": { sinceVersion: "8.0", fallback: "Use removeDevice instead" },
  "PTLogicalWorkspace.deleteObject": { sinceVersion: "7.2", fallback: "Use removeObject instead" },
  "PTProcess.getDhcpServerProcessByPortName": {
    sinceVersion: "7.3",
    fallback: "No DHCP Server API support",
  },
  "PTProcess.getVlanCount": {
    sinceVersion: "7.3",
    fallback: "No VLAN API support — use IOS commands",
  },
};

export function detectPtVersion(ipc: PtIpc): PtVersion {
  var major = 7;
  var minor = 0;
  var patch = 0;

  try {
    var net = ipc.network();
    if (!net) {
      return makeVersion(7, 0, 0);
    }

    var deviceCount = net.getDeviceCount();
    if (deviceCount > 0) {
      var device = net.getDeviceAt(0);
      if (device) {
        if (typeof (device as any).getPort === "function") {
          major = 8;
          minor = 0;
        }

        if (typeof (device as any).skipBoot === "function") {
          try {
            var port = device.getPortAt(0);
            if (port && typeof (port as any).isDhcpClientOn === "function") {
              minor = 2;
            }
          } catch (e) {
            minor = 0;
          }
        }
      }
    }
  } catch (e) {
    major = 7;
    minor = 0;
  }

  return makeVersion(major, minor, patch);
}

function makeVersion(major: number, minor: number, patch: number): PtVersion {
  return {
    major: major,
    minor: minor,
    patch: patch,
    toString: function () {
      return major + "." + minor + "." + patch;
    },
  };
}

export function probeCapabilities(ipc: PtIpc): Record<string, boolean> {
  var results: Record<string, boolean> = {};

  try {
    var net = ipc.network();
    var deviceCount = net ? net.getDeviceCount() : 0;
    var sampleDevice = deviceCount > 0 && net ? net.getDeviceAt(0) : null;

    if (sampleDevice) {
      results["PTDevice.getPort"] = typeof (sampleDevice as any).getPort === "function";
      results["PTDevice.moveToLocation"] = typeof sampleDevice.moveToLocation === "function";
      results["PTDevice.moveToLocationCentered"] =
        typeof sampleDevice.moveToLocationCentered === "function";
      results["PTDevice.setDhcpFlag"] = typeof (sampleDevice as any).setDhcpFlag === "function";
      results["PTDevice.skipBoot"] = typeof (sampleDevice as any).skipBoot === "function";

      var portCount = (sampleDevice as any).getPortCount ? (sampleDevice as any).getPortCount() : 0;
      if (portCount > 0) {
        var port = sampleDevice.getPortAt(0);
        if (port) {
          results["PTPort.setDhcpClientFlag"] =
            typeof (port as any).setDhcpClientFlag === "function";
          results["PTPort.isDhcpClientOn"] = typeof (port as any).isDhcpClientOn === "function";
          results["PTPort.setIpv6Enabled"] = typeof (port as any).setIpv6Enabled === "function";
          results["PTPort.getInboundFirewallServiceStatus"] =
            typeof (port as any).getInboundFirewallServiceStatus === "function";
        }
      }

      results["PTProcess.getDhcpServerProcessByPortName"] = false;
      results["PTProcess.getVlanCount"] = false;
      try {
        var process = (sampleDevice as any).getProcess
          ? (sampleDevice as any).getProcess("dhcpserver")
          : null;
        if (process) {
          results["PTProcess.getDhcpServerProcessByPortName"] =
            typeof (process as any).getDhcpServerProcessByPortName === "function";
        }
      } catch (e) {
        /* DHCP process not available */
      }
      try {
        var vlanProcess = (sampleDevice as any).getProcess
          ? (sampleDevice as any).getProcess("vlan")
          : null;
        if (vlanProcess) {
          results["PTProcess.getVlanCount"] =
            typeof (vlanProcess as any).getVlanCount === "function";
        }
      } catch (e) {
        /* VLAN process not available */
      }
    }

    try {
      var lw = ipc.appWindow()?.getActiveWorkspace()?.getLogicalWorkspace();
      results["PTLogicalWorkspace.deleteDevice"] = lw
        ? typeof (lw as any).deleteDevice === "function"
        : false;
      results["PTLogicalWorkspace.deleteObject"] = lw
        ? typeof (lw as any).deleteObject === "function"
        : false;
    } catch (e) {
      results["PTLogicalWorkspace.deleteDevice"] = false;
      results["PTLogicalWorkspace.deleteObject"] = false;
    }
  } catch (e) {
    // Environment too minimal to probe
  }

  return results;
}

export class PtSafeCall {
  private capabilities: Record<string, boolean>;
  private logger: unknown;

  constructor(capabilities: Record<string, boolean>, logger: unknown) {
    this.capabilities = capabilities;
    this.logger = logger;
  }

  call(obj: any, methodName: string, args: any[], fallback?: () => any): any {
    if (obj && typeof obj[methodName] === "function") {
      return obj[methodName].apply(obj, args);
    }

    if (fallback) {
      (this.logger as any).debug?.("Capability not available, using fallback", {
        method: methodName,
      });
      return fallback();
    }

    (this.logger as any).warn?.("Capability not available and no fallback", { method: methodName });
    return undefined;
  }
}
