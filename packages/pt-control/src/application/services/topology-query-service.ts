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
    try {
      const result = await this.bridge.sendCommandAndWait<TopologySnapshot>("snapshot", { id: this.generateId() }, 30000);
      const value = result.value;
      if (value && typeof value === "object" && "devices" in value && "links" in value) {
        this.cache.applySnapshot(value);
        return value;
      }

      const freshSnapshot = this.bridge.readState<TopologySnapshot>();
      if (freshSnapshot) {
        this.cache.applySnapshot(freshSnapshot);
        return freshSnapshot;
      }
    } catch {
      // PT no responde; usar caché si está materializada
    }

    if (this.cache.isMaterialized()) {
      return this.cache.getSnapshot();
    }

    return null;
  }

  async listDevices(filter?: string | number | string[]): Promise<DeviceState[]> {
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
      if (typeof filter === "undefined") return cachedDevices;

      if (typeof filter === "number") {
        const targetType = ptDeviceTypeToString(filter);
        return cachedDevices.filter((device) => device.type === targetType);
      }

      const normalizedFilter = String(filter).toLowerCase();
      return cachedDevices.filter((device) => {
        return (
          device.name.toLowerCase().includes(normalizedFilter) ||
          device.model.toLowerCase().includes(normalizedFilter) ||
          device.type.toLowerCase().includes(normalizedFilter)
        );
      });
    }

    const result = await this.bridge.sendCommandAndWait<DeviceState[] | { devices?: DeviceState[]; data?: unknown }>("listDevices", {
      id: this.generateId(),
      filter,
    });
    const value = result.value;

    if (Array.isArray(value)) return filterAutoCreated(value);
    if (value && typeof value === "object" && Array.isArray(value.devices)) return filterAutoCreated(value.devices);
    return [];
  }

  getCachedSnapshot(): TopologySnapshot | null {
    if (this.cache.isMaterialized()) {
      return this.cache.getSnapshot();
    }
    return null;
  }
}
