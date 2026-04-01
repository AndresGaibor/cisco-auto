import type { NetworkTwin } from "../contracts/twin-types.js";

// ============================================================================
// Discriminated Union Types for Sandbox Mutations
// ============================================================================

interface AssignIpMutation {
  type: "assign-ip";
  device: string;
  port: string;
  ip: string;
  mask: string;
}

interface SetPortUpMutation {
  type: "set-port-up";
  device: string;
  port: string;
}

interface SetPortDownMutation {
  type: "set-port-down";
  device: string;
  port: string;
}

interface AddVlanMutation {
  type: "add-vlan";
  device: string;
  vlanId: number;
}

interface RemoveVlanMutation {
  type: "remove-vlan";
  device: string;
  vlanId: number;
}

export type SandboxMutation =
  | AssignIpMutation
  | SetPortUpMutation
  | SetPortDownMutation
  | AddVlanMutation
  | RemoveVlanMutation;

// ============================================================================
// Type Guards for Sandbox Mutations
// ============================================================================

function isAssignIpMutation(m: SandboxMutation): m is AssignIpMutation {
  return m.type === "assign-ip";
}

function isSetPortUpMutation(m: SandboxMutation): m is SetPortUpMutation {
  return m.type === "set-port-up";
}

function isSetPortDownMutation(m: SandboxMutation): m is SetPortDownMutation {
  return m.type === "set-port-down";
}

function isAddVlanMutation(m: SandboxMutation): m is AddVlanMutation {
  return m.type === "add-vlan";
}

function isRemoveVlanMutation(m: SandboxMutation): m is RemoveVlanMutation {
  return m.type === "remove-vlan";
}

// ============================================================================
// SandboxTwin Class
// ============================================================================

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
    if (isAssignIpMutation(mutation)) {
      this.applyAssignIp(mutation);
    } else if (isSetPortUpMutation(mutation)) {
      this.applySetPortUp(mutation);
    } else if (isSetPortDownMutation(mutation)) {
      this.applySetPortDown(mutation);
    } else if (isAddVlanMutation(mutation)) {
      this.applyAddVlan(mutation);
    } else if (isRemoveVlanMutation(mutation)) {
      this.applyRemoveVlan(mutation);
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

  private applyAssignIp(m: AssignIpMutation): void {
    const device = this.twin.devices[m.device];
    if (device && m.port && device.ports[m.port]) {
      device.ports[m.port]!.ipAddress = m.ip;
      device.ports[m.port]!.subnetMask = m.mask;
    }
  }

  private applySetPortUp(m: SetPortUpMutation): void {
    const device = this.twin.devices[m.device];
    if (device && m.port && device.ports[m.port]) {
      device.ports[m.port]!.adminStatus = "up";
      device.ports[m.port]!.operStatus = "up";
    }
  }

  private applySetPortDown(m: SetPortDownMutation): void {
    const device = this.twin.devices[m.device];
    if (device && m.port && device.ports[m.port]) {
      device.ports[m.port]!.adminStatus = "administratively down";
      device.ports[m.port]!.operStatus = "down";
    }
  }

  private applyAddVlan(m: AddVlanMutation): void {
    // For VLAN simulation, we'd need to track VLAN membership
    // Just mark that something changed
  }

  private applyRemoveVlan(m: RemoveVlanMutation): void {
    // Similar to add
  }
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
