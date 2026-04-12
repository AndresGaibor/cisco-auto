// packages/pt-runtime/src/runtime/feature-flags.ts
// Feature flags based on PT version and capabilities

import type { PtVersion } from "./pt-version";

export interface FeatureFlag {
  name: string;
  minVersion: string;
  enabled: boolean;
  reason?: string;
}

var flags: Record<string, FeatureFlag> = {};

export function initializeFeatureFlags(
  version: PtVersion,
  capabilities: Record<string, boolean>
): void {
  flags = {};

  flags["ipv6"] = {
    name: "ipv6",
    minVersion: "7.3",
    enabled: capabilities["PTPort.setIpv6Enabled"] || false,
    reason: capabilities["PTPort.setIpv6Enabled"] ? undefined : "PTPort.setIpv6Enabled not available",
  };

  flags["dhcp-native-api"] = {
    name: "dhcp-native-api",
    minVersion: "7.3",
    enabled: capabilities["PTProcess.getDhcpServerProcessByPortName"] || false,
    reason: capabilities["PTProcess.getDhcpServerProcessByPortName"] ? undefined : "PTProcess.getDhcpServerProcessByPortName not available",
  };

  flags["vlan-native-api"] = {
    name: "vlan-native-api",
    minVersion: "7.3",
    enabled: capabilities["PTProcess.getVlanCount"] || false,
    reason: capabilities["PTProcess.getVlanCount"] ? undefined : "PTProcess.getVlanCount not available",
  };

  flags["firewall-config"] = {
    name: "firewall-config",
    minVersion: "8.0",
    enabled: capabilities["PTPort.getInboundFirewallServiceStatus"] || false,
    reason: capabilities["PTPort.getInboundFirewallServiceStatus"] ? undefined : "PTPort.getInboundFirewallServiceStatus not available",
  };

  flags["device-relocate"] = {
    name: "device-relocate",
    minVersion: "7.3",
    enabled: (capabilities["PTDevice.moveToLocation"] || capabilities["PTDevice.moveToLocationCentered"]) || false,
    reason: (capabilities["PTDevice.moveToLocation"] || capabilities["PTDevice.moveToLocationCentered"])
      ? undefined : "No moveToLocation/moveToLocationCentered available",
  };

  flags["dhcp-device-flag"] = {
    name: "dhcp-device-flag",
    minVersion: "7.2",
    enabled: capabilities["PTDevice.setDhcpFlag"] || false,
    reason: capabilities["PTDevice.setDhcpFlag"] ? undefined : "PTDevice.setDhcpFlag not available",
  };
}

export function isFeatureEnabled(name: string): boolean {
  var flag = flags[name];
  if (!flag) {
    return false;
  }
  return flag.enabled;
}

export function getAllFeatureFlags(): FeatureFlag[] {
  var result: FeatureFlag[] = [];
  for (var key in flags) {
    result.push(flags[key]);
  }
  return result;
}

export function withFeature<T>(
  featureName: string,
  fn: () => T,
  fallback?: () => T
): T | undefined {
  if (isFeatureEnabled(featureName)) {
    return fn();
  }
  if (fallback) {
    return fallback();
  }
  return undefined;
}
