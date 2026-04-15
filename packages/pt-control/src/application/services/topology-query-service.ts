import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { TopologySnapshot, DeviceState } from "../../contracts/index.js";
import { PT_NON_CREATABLE_MODELS } from "@cisco-auto/pt-runtime/value-objects";

function ptDeviceTypeToString(typeId: number): DeviceState["type"] {
  const map: Record<number, DeviceState["type"]> = {
    0: "router",
    1: "switch",
    2: "generic",
    3: "pc",
    4: "server",
    5: "generic",
    6: "access_point",
    7: "cloud",
    8: "generic",
  };
  return map[typeId] ?? "generic";
}

export class TopologyQueryService {
  constructor(
    private bridge: FileBridgePort,
    private cache: TopologyCachePort,
    private generateId: () => string,
  ) {}

  async snapshot(): Promise<TopologySnapshot | null> {
    // Fast path: return cache immediately if already materialized.
    // This avoids a 30s PT round-trip when PT is not connected.
    if (this.cache.isMaterialized()) {
      // Still try a live refresh, but with a very short timeout (3s)
      // so we get fresh data when PT is active without blocking when it's not.
      try {
        const result = await this.bridge.sendCommandAndWait<TopologySnapshot>(
          "snapshot",
          { id: this.generateId() },
          3000, // 3s fast timeout — fall back to cache if PT doesn't respond
        );
        const value = result.value;
        if (value && typeof value === "object" && "devices" in value && "links" in value) {
          this.cache.applySnapshot(value);
          return value;
        }
      } catch {
        // PT not responding — use cached data, no blocking
      }
      return this.cache.getSnapshot();
    }

    // Cold path: no cache yet, try PT with full 30s timeout
    // First check if there's any state written to disk (fast, no PT needed)
    const diskState = this.bridge.readState<TopologySnapshot>();
    if (
      diskState &&
      typeof diskState === "object" &&
      "devices" in diskState &&
      "links" in diskState
    ) {
      this.cache.applySnapshot(diskState);
      return diskState;
    }

    // Only send a command to PT if the bridge has a valid lease (PT is actively running)
    // isReady() = bridge running AND holding a valid lease from PT's kernel
    if (!this.bridge.isReady()) {
      // PT script is not running or lease expired — no point waiting 30s
      return null;
    }

    try {
      const result = await this.bridge.sendCommandAndWait<TopologySnapshot>(
        "snapshot",
        { id: this.generateId() },
        30000,
      );
      const value = result.value;
      if (value && typeof value === "object" && "devices" in value && "links" in value) {
        this.cache.applySnapshot(value);
        return value;
      }
    } catch {
      // PT no responde; no hay cache
    }

    return null;
  }

  async listDevices(filter?: string | number | string[]): Promise<{
    devices: DeviceState[];
    deviceLinks?: Record<string, string[]>;
    count?: number;
  }> {
    const cachedDevices = this.cache.getDevices().filter((device) => {
      const model = String(device.model || "").toLowerCase();
      return !PT_NON_CREATABLE_MODELS.some((item: string) => item.toLowerCase() === model);
    });

    const filterAutoCreated = (devices: DeviceState[]) =>
      devices.filter((device) => {
        const model = String(device.model || "").toLowerCase();
        return !PT_NON_CREATABLE_MODELS.some((item: string) => item.toLowerCase() === model);
      });

    if (cachedDevices.length > 0) {
      if (typeof filter === "undefined") return { devices: cachedDevices };

      if (typeof filter === "number") {
        const targetType = ptDeviceTypeToString(filter);
        return { devices: cachedDevices.filter((device) => device.type === targetType) };
      }

      const normalizedFilter = String(filter).toLowerCase();
      return {
        devices: cachedDevices.filter((device) => {
          return (
            device.name.toLowerCase().includes(normalizedFilter) ||
            device.model.toLowerCase().includes(normalizedFilter) ||
            device.type.toLowerCase().includes(normalizedFilter)
          );
        }),
      };
    }

    const result = await this.bridge.sendCommandAndWait<
      | DeviceState[]
      | {
          devices?: DeviceState[];
          deviceLinks?: Record<string, string[]>;
          count?: number;
          data?: unknown;
        }
    >("listDevices", {
      id: this.generateId(),
      filter,
    });
    const value = result.value;

    if (Array.isArray(value)) {
      return { devices: filterAutoCreated(value), count: value.length };
    }
    if (value && typeof value === "object") {
      const devices = Array.isArray(value.devices) ? filterAutoCreated(value.devices) : [];
      return {
        devices,
        deviceLinks: value.deviceLinks || {},
        count: value.count || devices.length,
      };
    }
    return { devices: [] };
  }

  getCachedSnapshot(): TopologySnapshot | null {
    if (this.cache.isMaterialized()) {
      return this.cache.getSnapshot();
    }
    return null;
  }
}
