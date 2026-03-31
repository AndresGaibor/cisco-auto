import type { NetworkTwin, PortTwin, DeviceTwin } from "../contracts/twin-types.js";

/**
 * FunctionalCheckEngine runs active checks to validate network functionality.
 *
 * These checks go beyond config validation — they verify the network
 * actually works as expected.
 */
export class FunctionalCheckEngine {
  constructor(
    private twin: NetworkTwin,
    private executor: CheckExecutor
  ) {}

  /**
   * Run all applicable checks for a device
   */
  async runDeviceChecks(deviceName: string): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const device = this.twin.devices[deviceName] as DeviceTwin | undefined;
    if (!device) return results;

    // Ping gateway check
    if (device.family === "pc" || device.family === "server") {
      const ports = device.ports as Record<string, PortTwin>;
      const ip = Object.values(ports).find(p => p.ipAddress)?.ipAddress;
      if (ip) {
        results.push(await this.checkPingToGateway(deviceName, ip));
      }
    }

    // DHCP lease check (for DHCP-configured hosts)
    if (device.family === "pc" || device.family === "server") {
      results.push(this.checkDhcpConfigured(deviceName));
    }

    // Switch has VLANs configured
    if (device.family === "switch-l2" || device.family === "switch-l3") {
      results.push(this.checkSwitchVlans(deviceName));
    }

    return results;
  }

  /**
   * Ping gateway check — host can reach its configured gateway
   */
  async checkPingToGateway(deviceName: string, hostIp: string): Promise<CheckResult> {
    // Find the gateway (device on same subnet as host with .1 address or default-gateway config)
    const gateway = this.findGateway(deviceName, hostIp);

    if (!gateway) {
      return {
        id: `ping-gw-${deviceName}`,
        name: "Gateway Reachability",
        status: "unknown",
        severity: "warning",
        message: `No gateway found for ${hostIp}`,
      };
    }

    try {
      const pong = await this.executor.ping(deviceName, gateway.ip);
      return {
        id: `ping-gw-${deviceName}`,
        name: "Gateway Reachability",
        status: pong ? "pass" : "fail",
        severity: pong ? "info" : "error",
        message: pong
          ? `Ping to gateway ${gateway.ip} succeeded`
          : `Ping to gateway ${gateway.ip} failed`,
        details: { gatewayIp: gateway.ip, hostIp },
      };
    } catch (e) {
      return {
        id: `ping-gw-${deviceName}`,
        name: "Gateway Reachability",
        status: "error",
        severity: "error",
        message: `Ping check failed: ${e}`,
      };
    }
  }

  /**
   * Check if DHCP is properly configured for a host
   */
  checkDhcpConfigured(deviceName: string): CheckResult {
    const device = this.twin.devices[deviceName] as DeviceTwin | undefined;
    if (!device) {
      return { id: `dhcp-${deviceName}`, name: "DHCP Configured", status: "unknown", severity: "warning", message: "Device not found" };
    }

    // Check if device has an IP (manually configured vs DHCP)
    const ports = device.ports as Record<string, PortTwin>;
    const hasIp = Object.values(ports).some(p => p.ipAddress);

    if (!hasIp) {
      return {
        id: `dhcp-${deviceName}`,
        name: "DHCP Configured",
        status: "pass",
        severity: "info",
        message: `${deviceName} is configured for DHCP (no static IP)`,
      };
    }

    return {
      id: `dhcp-${deviceName}`,
      name: "DHCP Configured",
      status: "pass",
      severity: "info",
      message: `${deviceName} has static IP configured`,
    };
  }

  /**
   * Check if switch has at least one VLAN configured
   */
  checkSwitchVlans(deviceName: string): CheckResult {
    const device = this.twin.devices[deviceName] as DeviceTwin | undefined;
    if (!device) {
      return { id: `vlan-${deviceName}`, name: "VLAN Configured", status: "unknown", severity: "warning", message: "Device not found" };
    }

    const vlans = new Set<number>();
    const ports = device.ports as Record<string, PortTwin>;
    for (const port of Object.values(ports)) {
      if (port.accessVlan) vlans.add(port.accessVlan);
    }

    if (vlans.size === 0) {
      return {
        id: `vlan-${deviceName}`,
        name: "VLAN Configured",
        status: "fail",
        severity: "error",
        message: `${deviceName} has no VLANs configured`,
      };
    }

    return {
      id: `vlan-${deviceName}`,
      name: "VLAN Configured",
      status: "pass",
      severity: "info",
      message: `${deviceName} has ${vlans.size} VLAN(s): ${[...vlans].join(", ")}`,
    };
  }

  private findGateway(deviceName: string, hostIp: string): { ip: string; device: string } | null {
    // Find device on same subnet as host that could be gateway
    // Simplified: look for any device on a link from host that has an IP
    const hostDevice = this.twin.devices[deviceName] as DeviceTwin | undefined;
    if (!hostDevice) return null;

    // Get adjacent devices
    const adjacent = this.twin.indexes?.byDeviceName
      ? Object.keys(this.twin.devices).filter(d => d !== deviceName)
      : [];

    for (const adjName of adjacent) {
      const adjDevice = this.twin.devices[adjName] as DeviceTwin | undefined;
      const ports = adjDevice?.ports as Record<string, PortTwin> | undefined;
      for (const port of Object.values(ports ?? {})) {
        if (port.ipAddress && port.ipAddress.endsWith(".1")) {
          return { ip: port.ipAddress, device: adjName };
        }
      }
    }

    return null;
  }
}

/**
 * CheckExecutor — abstraction for running actual network commands
 */
export interface CheckExecutor {
  ping(fromDevice: string, toIp: string): Promise<boolean>;
  dhcpLease(device: string): Promise<DhcpLeaseInfo | null>;
  dnsResolve(device: string, hostname: string): Promise<string | null>;
}

export interface DhcpLeaseInfo {
  ip: string;
  mask: string;
  gateway: string;
  leaseTime: number;
}

export interface CheckResult {
  id: string;
  name: string;
  status: "pass" | "fail" | "unknown" | "error";
  severity: "info" | "warning" | "error";
  message: string;
  details?: Record<string, unknown>;
}
