import type { NetworkTwin, DeviceTwin, PortTwin, LinkTwin } from "../contracts/twin-types.js";

/**
 * SuggestionEngine analyzes a NetworkTwin and produces actionable suggestions.
 *
 * Unlike ValidationEngine (which finds problems), SuggestionEngine finds
 * opportunities — best practices that aren't followed, optimizations, expansions.
 */
export class SuggestionEngine {
  constructor(private twin: NetworkTwin) {}

  /**
   * Get all suggestions for the entire lab
   */
  suggestGlobal(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    suggestions.push(...this.suggestPortfast());
    suggestions.push(...this.suggestTrunkLinks());
    suggestions.push(...this.suggestGatewayMissing());
    return suggestions;
  }

  /**
   * Get suggestions for a specific device
   */
  suggestForDevice(deviceName: string): Suggestion[] {
    const device = this.twin.devices[deviceName];
    if (!device) return [];

    const suggestions: Suggestion[] = [];

    // Suggest enabling portfast on access ports that don't have it
    if (device.family === "switch-l2" || device.family === "switch-l3") {
      for (const [portName, port] of Object.entries(device.ports)) {
        // If port is in access mode and has a VLAN assigned, suggest portfast
        if (port.vlanMode === "access" && port.accessVlan) {
          // In a real implementation, we'd check the running config
          // For now, just suggest based on port type
          suggestions.push({
            id: `portfast-${deviceName}-${portName}`,
            type: "best-practice",
            priority: "low",
            title: `Enable PortFast on ${portName}`,
            message: `Access port ${portName} on ${deviceName} would benefit from PortFast for faster convergence`,
            device: deviceName,
            port: portName,
            estimatedImpact: "low",
          });
        }
      }
    }

    // Suggest enabling IP routing on L3 switches that don't have it configured
    if (device.family === "switch-l3") {
      // Check if any port has an IP address (indicating routing might be enabled)
      const hasLayer3Config = Object.values(device.ports).some(p => p.ipAddress);
      if (!hasLayer3Config) {
        suggestions.push({
          id: `ip-routing-${deviceName}`,
          type: "optimization",
          priority: "medium",
          title: `Enable IP routing on ${deviceName}`,
          message: `${deviceName} is an L3 switch but has no IP interfaces configured. Consider enabling IP routing.`,
          device: deviceName,
          estimatedImpact: "medium",
        });
      }
    }

    return suggestions;
  }

  /**
   * Get suggestions for a specific zone
   */
  suggestForZone(zoneId: string): Suggestion[] {
    const zone = this.twin.zones[zoneId];
    if (!zone) return [];

    const suggestions: Suggestion[] = [];
    const devicesInZone = this.twin.indexes?.byZoneId?.[zoneId] ?? [];

    // If zone has a vlanId semantic, suggest that VLAN needs a gateway
    if (zone.semantics?.vlanId && devicesInZone.length > 0) {
      const vlanId = zone.semantics.vlanId;

      // Check if any device in the zone has the gateway IP
      let hasGateway = false;
      for (const deviceName of devicesInZone) {
        const device = this.twin.devices[deviceName];
        if (device) {
          for (const port of Object.values(device.ports)) {
            if (port.ipAddress && port.ipAddress.endsWith(".1")) {
              hasGateway = true;
            }
          }
        }
      }

      if (!hasGateway) {
        suggestions.push({
          id: `gateway-zone-${zoneId}`,
          type: "expansion",
          priority: "high",
          title: `Add gateway for VLAN ${vlanId} in zone ${zone.label ?? zoneId}`,
          message: `Devices in this zone need a default gateway. Configure an SVI with .1 address.`,
          zone: zoneId,
          vlanId,
          estimatedImpact: "high",
        });
      }
    }

    return suggestions;
  }

  // ==========================================================================
  // Private suggestion generators
  // ==========================================================================

  private suggestPortfast(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    for (const [deviceName, device] of Object.entries(this.twin.devices)) {
      if (device.family !== "switch-l2" && device.family !== "switch-l3") continue;

      for (const [portName, port] of Object.entries(device.ports)) {
        // Suggest portfast for access ports with actual host connections
        // (we can't know for sure, so use VLAN != 1 as a heuristic for hosts)
        if (port.accessVlan && port.accessVlan !== 1 && port.adminStatus === "up") {
          suggestions.push({
            id: `portfast-suggest-${deviceName}-${portName}`,
            type: "best-practice",
            priority: "low",
            title: `Enable PortFast on ${deviceName}:${portName}`,
            message: `Port ${portName} appears to be a host access port. Enable PortFast to reduce convergence time.`,
            device: deviceName,
            port: portName,
            estimatedImpact: "low",
          });
        }
      }
    }

    return suggestions;
  }

  private suggestTrunkLinks(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Find links between two switches — those should be trunks
    for (const [linkId, link] of Object.entries(this.twin.links)) {
      const dev1 = this.twin.devices[link.device1];
      const dev2 = this.twin.devices[link.device2];

      if (!dev1 || !dev2) continue;

      const isInterSwitch =
        (dev1.family === "switch-l2" || dev1.family === "switch-l3") &&
        (dev2.family === "switch-l2" || dev2.family === "switch-l3");

      if (isInterSwitch) {
        // Check if ports are already trunk (vlanMode === "trunk")
        const port1 = dev1.ports[link.port1];
        const port2 = dev2.ports[link.port2];

        if (port1?.vlanMode !== "trunk" && port2?.vlanMode !== "trunk") {
          suggestions.push({
            id: `trunk-suggest-${linkId}`,
            type: "optimization",
            priority: "medium",
            title: `Configure trunk on ${link.device1}:${link.port1}`,
            message: `Link between ${link.device1} and ${link.device2} appears to be an uplink. Consider configuring it as a trunk port.`,
            device: link.device1,
            port: link.port1,
            estimatedImpact: "medium",
          });
        }
      }
    }

    return suggestions;
  }

  private suggestGatewayMissing(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    for (const [deviceName, device] of Object.entries(this.twin.devices)) {
      if (device.family === "pc" || device.family === "server") {
        const hasIp = Object.values(device.ports).some(p => p.ipAddress);
        const hasGateway = Object.values(device.ports).some(p =>
          p.ipAddress && p.ipAddress.endsWith(".1")
        );

        if (hasIp && !hasGateway) {
          suggestions.push({
            id: `gateway-missing-${deviceName}`,
            type: "expansion",
            priority: "medium",
            title: `Add default gateway to ${deviceName}`,
            message: `${deviceName} has an IP address but no default gateway configured. Add 'ip default-gateway <gateway>' or configure DHCP.`,
            device: deviceName,
            estimatedImpact: "medium",
          });
        }
      }
    }

    return suggestions;
  }
}

export interface Suggestion {
  id: string;
  type: "optimization" | "best-practice" | "expansion";
  priority: "low" | "medium" | "high";
  title: string;
  message: string;
  device?: string;
  port?: string;
  zone?: string;
  vlanId?: number;
  estimatedImpact: "low" | "medium" | "high";
}
