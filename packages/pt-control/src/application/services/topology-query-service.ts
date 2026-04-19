import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type {
  TopologySnapshot,
  DeviceState,
  ConnectionInfo,
  UnresolvedLink,
} from "../../contracts/index.js";
import type { LinkStats } from "../../contracts/device-types.js";
import { PT_NON_CREATABLE_MODELS } from "@cisco-auto/pt-runtime";

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

interface ListDevicesResultWithLinks {
  devices?: DeviceState[];
  connectionsByDevice?: Record<string, ConnectionInfo[]>;
  unresolvedLinks?: UnresolvedLink[];
  count?: number;
  ptLinkDebug?: LinkStats;
}

export class TopologyQueryService {
  constructor(
    private readonly cache: TopologyCachePort,
    private readonly primitivePort: RuntimePrimitivePort,
    private readonly generateId: () => string,
  ) {}

  async snapshot(): Promise<TopologySnapshot | null> {
    const timeoutMs = this.cache.isMaterialized() ? 3000 : 30000;

    try {
      const result = await this.primitivePort.runPrimitive(
        "topology.snapshot",
        { id: this.generateId() },
        { timeoutMs },
      );

      const value = result.value;
      if (
        result.ok &&
        value &&
        typeof value === "object" &&
        "devices" in value &&
        "links" in value
      ) {
        this.cache.applySnapshot(value as TopologySnapshot);
        return value as TopologySnapshot;
      }
    } catch {
      // no-op
    }

    return this.cache.isMaterialized() ? this.cache.getSnapshot() : null;
  }

  async listDevices(filter?: string | number | string[]): Promise<{
    devices: DeviceState[];
    connectionsByDevice: Record<string, ConnectionInfo[]>;
    unresolvedLinks: UnresolvedLink[];
    count: number;
    ptLinkDebug?: LinkStats;
  }> {
    const filterDevices = (devices: DeviceState[]) => {
      if (typeof filter === "number") {
        const targetType = ptDeviceTypeToString(filter);
        return devices.filter((device) => device.type === targetType);
      }

      if (typeof filter === "string") {
        const normalized = filter.toLowerCase();
        return devices.filter((device) => {
          return (
            device.name.toLowerCase().includes(normalized) ||
            device.model.toLowerCase().includes(normalized) ||
            device.type.toLowerCase().includes(normalized)
          );
        });
      }

      return devices;
    };

    const removeNonCreatable = (devices: DeviceState[]) =>
      devices.filter((device) => {
        const model = String(device.model || "").toLowerCase();
        return !PT_NON_CREATABLE_MODELS.some((item: string) => item.toLowerCase() === model);
      });

    const cachedDevices = removeNonCreatable(this.cache.getDevices());

    try {
      const result = await this.primitivePort.runPrimitive(
        "topology.list",
        { filter, id: this.generateId() },
        { timeoutMs: cachedDevices.length > 0 ? 15000 : 60000 },
      );

      if (result.ok) {
        const value = result.value;

        if (Array.isArray(value)) {
          const devices = filterDevices(removeNonCreatable(value as DeviceState[]));
          return {
            devices,
            connectionsByDevice: {},
            unresolvedLinks: [],
            count: devices.length,
          };
        }

        if (value && typeof value === "object") {
          const typed = value as ListDevicesResultWithLinks;
          const devices = Array.isArray(typed.devices)
            ? filterDevices(removeNonCreatable(typed.devices))
            : [];

          return {
            devices,
            connectionsByDevice: typed.connectionsByDevice ?? {},
            unresolvedLinks: typed.unresolvedLinks ?? [],
            count: typeof typed.count === "number" ? typed.count : devices.length,
            ptLinkDebug: typed.ptLinkDebug,
          };
        }
      }
    } catch {
      // no-op
    }

    if (cachedDevices.length > 0) {
      const cachedLinks = this.cache.getLinks();
      const connectionsByDevice: Record<string, ConnectionInfo[]> = {};

      for (const link of cachedLinks) {
        const d1 = connectionsByDevice[link.device1] ?? [];
        const d2 = connectionsByDevice[link.device2] ?? [];

        d1.push({
          localPort: link.port1,
          remoteDevice: link.device2,
          remotePort: link.port2,
          confidence: "registry",
        });

        d2.push({
          localPort: link.port2,
          remoteDevice: link.device1,
          remotePort: link.port1,
          confidence: "registry",
        });

        connectionsByDevice[link.device1] = d1;
        connectionsByDevice[link.device2] = d2;
      }

      const devices = filterDevices(cachedDevices);
      return {
        devices,
        connectionsByDevice,
        unresolvedLinks: [],
        count: devices.length,
      };
    }

    return {
      devices: [],
      connectionsByDevice: {},
      unresolvedLinks: [],
      count: 0,
    };
  }

  getCachedSnapshot(): TopologySnapshot | null {
    return this.cache.isMaterialized() ? this.cache.getSnapshot() : null;
  }
}
