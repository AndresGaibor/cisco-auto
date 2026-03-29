import type { NetworkTwin } from "../contracts/twin-types.js";
import type { DeviceTwin, PortTwin } from "../contracts/twin-types.js";

/**
 * TwinQueryEngine — query the NetworkTwin with structured and semantic queries.
 *
 * Provides a rich query API for the CLI and agent to ask questions
 * about the lab topology, configuration, and state.
 */
export class TwinQueryEngine {
  constructor(private twin: NetworkTwin) {}

  // ==========================================================================
  // Device queries
  // ==========================================================================

  /**
   * Find all devices matching a predicate
   */
  findDevices(predicate: (d: DeviceTwin) => boolean): DeviceTwin[] {
    return Object.values(this.twin.devices).filter(predicate);
  }

  /**
   * Get devices by family
   */
  byFamily(family: DeviceTwin["family"]): DeviceTwin[] {
    return this.findDevices(d => d.family === family);
  }

  /**
   * Get devices by model
   */
  byModel(model: string): DeviceTwin[] {
    return this.findDevices(d => d.model === model);
  }

  /**
   * Get devices that have no IP configured
   */
  devicesWithoutIp(): DeviceTwin[] {
    return this.findDevices(d =>
      !Object.values(d.ports).some(p => p.ipAddress)
    );
  }

  /**
   * Get devices that are powered off
   */
  devicesPoweredOff(): DeviceTwin[] {
    return this.findDevices(d => !d.power);
  }

  // ==========================================================================
  // Port queries
  // ==========================================================================

  /**
   * Find all ports matching a predicate
   */
  findPorts(predicate: (p: PortTwin, deviceName: string) => boolean): Array<{ device: string; port: PortTwin }> {
    const results: Array<{ device: string; port: PortTwin }> = [];
    for (const [deviceName, device] of Object.entries(this.twin.devices)) {
      for (const [portName, port] of Object.entries(device.ports)) {
        if (predicate(port, deviceName)) {
          results.push({ device: deviceName, port });
        }
      }
    }
    return results;
  }

  /**
   * Get all ports that are admin up but oper down (potential issues)
   */
  portsDownExpectedUp(): Array<{ device: string; port: PortTwin }> {
    return this.findPorts((p) =>
      (p.adminStatus === "up" || p.adminStatus === "administratively down") &&
      p.operStatus === "down"
    );
  }

  /**
   * Get ports using fiber media
   */
  fiberPorts(): Array<{ device: string; port: PortTwin }> {
    return this.findPorts((p) => p.media === "fiber");
  }

  /**
   * Get ports configured with a specific VLAN
   */
  portsByVlan(vlanId: number): Array<{ device: string; port: PortTwin }> {
    return this.findPorts((p) => p.accessVlan === vlanId);
  }

  /**
   * Get ports in trunk mode
   */
  trunkPorts(): Array<{ device: string; port: PortTwin }> {
    return this.findPorts((p) => p.vlanMode === "trunk");
  }

  // ==========================================================================
  // IP/Subnet queries
  // ==========================================================================

  /**
   * Find a device by IP address
   */
  findByIp(ip: string): { device: string; port: PortTwin } | undefined {
    for (const [deviceName, device] of Object.entries(this.twin.devices)) {
      for (const [portName, port] of Object.entries(device.ports)) {
        if (port.ipAddress === ip) {
          return { device: deviceName, port };
        }
      }
    }
    return undefined;
  }

  /**
   * Find devices in the same subnet as a given IP
   */
  devicesInSubnet(ip: string, mask: string): string[] {
    const subnet = this.ipToSubnet(ip, mask);
    const results: string[] = [];

    for (const [deviceName, device] of Object.entries(this.twin.devices)) {
      for (const port of Object.values(device.ports)) {
        if (port.ipAddress && port.subnetMask) {
          if (this.ipToSubnet(port.ipAddress, port.subnetMask) === subnet) {
            results.push(deviceName);
          }
        }
      }
    }

    return [...new Set(results)];
  }

  // ==========================================================================
  // Zone queries
  // ==========================================================================

  /**
   * Get all devices in a zone
   */
  devicesInZone(zoneId: string): DeviceTwin[] {
    const zone = this.twin.zones[zoneId];
    if (!zone) return [];

    const { x1, y1, x2, y2 } = zone.geometry;
    return this.findDevices(d => {
      const { centerX, centerY } = d.logicalPosition;
      return centerX >= x1 && centerX <= x2 && centerY >= y1 && centerY <= y2;
    });
  }

  /**
   * Get zones by color
   */
  zonesByColor(color: string): string[] {
    return Object.values(this.twin.zones)
      .filter(z => z.style?.fillColor?.toLowerCase() === color.toLowerCase())
      .map(z => z.id);
  }

  // ==========================================================================
  // Link queries
  // ==========================================================================

  /**
   * Get all links connected to a device
   */
  linksForDevice(deviceName: string): string[] {
    const linkIds: string[] = [];
    for (const [linkId, link] of Object.entries(this.twin.links)) {
      if (link.device1 === deviceName || link.device2 === deviceName) {
        linkIds.push(linkId);
      }
    }
    return linkIds;
  }

  /**
   * Get the device on the other side of a link
   */
  peerDevice(deviceName: string, portName: string): string | null {
    const linkId = `${deviceName}:${portName}`;
    for (const link of Object.values(this.twin.links)) {
      if (link.device1 === deviceName && link.port1 === portName) {
        return link.device2;
      }
      if (link.device2 === deviceName && link.port2 === portName) {
        return link.device1;
      }
    }
    return null;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private ipToSubnet(ip: string, mask: string): string {
    const ipParts = ip.split(".").map(Number);
    const maskParts = mask.split(".").map(Number);
    return ipParts.map((p, i) => p & maskParts[i]!).join(".");
  }
}

export interface QueryResult {
  devices?: string[];
  ports?: Array<{ device: string; port: string }>;
  links?: string[];
  zones?: string[];
  summary: string;
}
