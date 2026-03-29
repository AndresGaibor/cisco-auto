import type { NetworkTwin } from "../contracts/twin-types.js";

export class SandboxTwin {
  private twin: NetworkTwin;
  private readonly original: NetworkTwin;

  constructor(twin: NetworkTwin) {
    // Deep clone the twin so mutations don't affect the original
    this.original = this.deepClone(twin);
    this.twin = this.deepClone(twin);
  }

  /**
   * Apply a mutation to the sandbox twin.
   * This is a simplified simulation — real mutations would require
   * actually running IOS commands, but we can simulate config changes.
   */
  applyMutation(mutation: SandboxMutation): void {
    switch (mutation.type) {
      case "assign-ip":
        this.applyAssignIp(mutation as SandboxMutation & { type: "assign-ip" });
        break;
      case "set-port-up":
        this.applySetPortUp(mutation as SandboxMutation & { type: "set-port-up" });
        break;
      case "set-port-down":
        this.applySetPortDown(mutation as SandboxMutation & { type: "set-port-down" });
        break;
      case "add-vlan":
        this.applyAddVlan(mutation as SandboxMutation & { type: "add-vlan" });
        break;
      case "remove-vlan":
        this.applyRemoveVlan(mutation as SandboxMutation & { type: "remove-vlan" });
        break;
    }
    this.twin.metadata.updatedAt = Date.now();
  }

  revert(): void {
    this.twin = this.deepClone(this.original);
  }

  getTwin(): NetworkTwin {
    return this.twin;
  }

  getDiff(): TwinDiff {
    // Compare this.twin vs this.original and return what changed
    return computeTwinDiff(this.original, this.twin);
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private applyAssignIp(m: SandboxMutation & { type: "assign-ip" }): void {
    const device = this.twin.devices[m.device];
    if (device && m.port && device.ports[m.port]) {
      device.ports[m.port]!.ipAddress = m.ip;
      device.ports[m.port]!.subnetMask = m.mask;
    }
  }

  private applySetPortUp(m: SandboxMutation & { type: "set-port-up" }): void {
    const device = this.twin.devices[m.device];
    if (device && m.port && device.ports[m.port]) {
      device.ports[m.port]!.adminStatus = "up";
      device.ports[m.port]!.operStatus = "up";
    }
  }

  private applySetPortDown(m: SandboxMutation & { type: "set-port-down" }): void {
    const device = this.twin.devices[m.device];
    if (device && m.port && device.ports[m.port]) {
      device.ports[m.port]!.adminStatus = "administratively down";
      device.ports[m.port]!.operStatus = "down";
    }
  }

  private applyAddVlan(m: SandboxMutation & { type: "add-vlan" }): void {
    // For VLAN simulation, we'd need to track VLAN membership
    // Just mark that something changed
  }

  private applyRemoveVlan(m: SandboxMutation & { type: "remove-vlan" }): void {
    // Similar to add
  }
}

export interface SandboxMutation {
  type: "assign-ip" | "set-port-up" | "set-port-down" | "add-vlan" | "remove-vlan";
  device: string;
  port?: string;
  ip?: string;
  mask?: string;
  vlanId?: number;
}

export interface TwinDiff {
  changedDevices: string[];
  changedLinks: string[];
  changedZones: string[];
  before: NetworkTwin;
  after: NetworkTwin;
}

function computeTwinDiff(before: NetworkTwin, after: NetworkTwin): TwinDiff {
  const changedDevices: string[] = [];
  const changedLinks: string[] = [];
  const changedZones: string[] = [];

  for (const [name, device] of Object.entries(after.devices)) {
    const beforeDevice = before.devices[name];
    if (!beforeDevice || JSON.stringify(beforeDevice) !== JSON.stringify(device)) {
      changedDevices.push(name);
    }
  }

  for (const [id, link] of Object.entries(after.links)) {
    const beforeLink = before.links[id];
    if (!beforeLink || JSON.stringify(beforeLink) !== JSON.stringify(link)) {
      changedLinks.push(id);
    }
  }

  return { changedDevices, changedLinks, changedZones, before, after };
}
