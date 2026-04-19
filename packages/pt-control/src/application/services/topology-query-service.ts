import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type {
  TopologySnapshot,
  DeviceState,
  ConnectionInfo,
  UnresolvedLink,
} from "../../contracts/index.js";
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

import type { LinkStats } from "../../contracts/device-types.js";

interface ListDevicesResultWithLinks {
  devices?: DeviceState[];
  connectionsByDevice?: Record<string, ConnectionInfo[]>;
  unresolvedLinks?: UnresolvedLink[];
  count?: number;
  ptLinkDebug?: LinkStats;
}

export class TopologyQueryService {
  constructor(
    private bridge: FileBridgePort,
    private cache: TopologyCachePort,
    private primitivePort: RuntimePrimitivePort,
    private generateId: () => string,
  ) {}

  async snapshot(): Promise<TopologySnapshot | null> {
    if (this.cache.isMaterialized()) {
      try {
        const result = await this.primitivePort.runPrimitive(
          "topology.snapshot",
          { id: this.generateId() },
          { timeoutMs: 3000 },
        );
        if (result.ok && result.value && typeof result.value === "object" && "devices" in result.value && "links" in result.value) {
          this.cache.applySnapshot(result.value as TopologySnapshot);
          return result.value as TopologySnapshot;
        }
      } catch {
        // PT not responding — use cached data, no blocking
      }
      return this.cache.getSnapshot();
    }

    try {
      const result = await this.primitivePort.runPrimitive(
        "topology.snapshot",
        { id: this.generateId() },
        { timeoutMs: 30000 },
      );
      if (result.ok && result.value && typeof result.value === "object" && "devices" in result.value && "links" in result.value) {
        this.cache.applySnapshot(result.value as TopologySnapshot);
        return result.value as TopologySnapshot;
      }
    } catch {
      // PT no responde; no hay cache
    }

    return null;
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
        const normalizedFilter = String(filter).toLowerCase();
        return devices.filter((device) => {
          return (
            device.name.toLowerCase().includes(normalizedFilter) ||
            device.model.toLowerCase().includes(normalizedFilter) ||
            device.type.toLowerCase().includes(normalizedFilter)
          );
        });
      }

      return devices;
    };

    const cachedDevices = this.cache.getDevices().filter((device) => {
      const model = String(device.model || "").toLowerCase();
      return !PT_NON_CREATABLE_MODELS.some((item: string) => item.toLowerCase() === model);
    });

    if (cachedDevices.length > 0) {
      try {
        const result = await this.primitivePort.runPrimitive(
          "topology.list",
          { filter },
          { timeoutMs: 15000 },
        );

        if (!result.ok) {
          console.error("[DEBUG] PT fast-path failed. Falling back to cache. Error:", result.error);
        } else {
          const value = result.value;
          if (Array.isArray(value)) {
            const devices = filterDevices(
              value.filter((device) => {
                const model = String(device.model || "").toLowerCase();
                return !PT_NON_CREATABLE_MODELS.some((item: string) => item.toLowerCase() === model);
              }),
            );
            return {
              devices,
              connectionsByDevice: {},
              unresolvedLinks: [],
              count: devices.length,
            };
          }
          if (value && typeof value === "object") {
            const devices = Array.isArray(value.devices)
              ? filterDevices(
                  value.devices.filter((device) => {
                    const model = String(device.model || "").toLowerCase();
                    return !PT_NON_CREATABLE_MODELS.some(
                      (item: string) => item.toLowerCase() === model,
                    );
                  }),
                )
              : [];
            console.error(
              "[DEBUG] value.connectionsByDevice:",
              Object.keys(value.connectionsByDevice || {}).length,
              "keys",
            );
            return {
              devices,
              connectionsByDevice: value.connectionsByDevice || {},
              unresolvedLinks: value.unresolvedLinks || [],
              count: value.count || devices.length,
              ptLinkDebug: (value as ListDevicesResultWithLinks).ptLinkDebug,
            };
          }
        }
      } catch (e) {
        console.error("[DEBUG] PT fast-path failed. Falling back to cache. Error:", e);
      }

      const cachedLinks = this.cache.getLinks();
      const connectionsByDevice: Record<string, ConnectionInfo[]> = {};
      const unresolvedLinks: UnresolvedLink[] = [];

      for (const link of cachedLinks) {
        const d1Connections = connectionsByDevice[link.device1] ?? [];
        const d2Connections = connectionsByDevice[link.device2] ?? [];
        d1Connections.push({
          localPort: link.port1,
          remoteDevice: link.device2,
          remotePort: link.port2,
          confidence: "registry",
        });
        d2Connections.push({
          localPort: link.port2,
          remoteDevice: link.device1,
          remotePort: link.port1,
          confidence: "registry",
        });
        connectionsByDevice[link.device1] = d1Connections;
        connectionsByDevice[link.device2] = d2Connections;
      }

      const filteredDevices = filterDevices(cachedDevices);

      return {
        devices: filteredDevices,
        connectionsByDevice,
        unresolvedLinks,
        count: filteredDevices.length,
      };
    }

    try {
      const result = await this.primitivePort.runPrimitive(
        "topology.list",
        { filter },
        { timeoutMs: 60000 },
      );

      if (!result.ok) {
        return { devices: [], connectionsByDevice: {}, unresolvedLinks: [], count: 0 };
      }

      const value = result.value;

      if (Array.isArray(value)) {
        return {
          devices: filterDevices(
            value.filter((device) => {
              const model = String(device.model || "").toLowerCase();
              return !PT_NON_CREATABLE_MODELS.some((item: string) => item.toLowerCase() === model);
            }),
          ),
          connectionsByDevice: {},
          unresolvedLinks: [],
          count: filterDevices(
            value.filter((device) => {
              const model = String(device.model || "").toLowerCase();
              return !PT_NON_CREATABLE_MODELS.some((item: string) => item.toLowerCase() === model);
            }),
          ).length,
        };
      }
      if (value && typeof value === "object") {
        const devices = Array.isArray(value.devices)
          ? filterDevices(
              value.devices.filter((device) => {
                const model = String(device.model || "").toLowerCase();
                return !PT_NON_CREATABLE_MODELS.some((item: string) => item.toLowerCase() === model);
              }),
            )
          : [];
        return {
          devices,
          connectionsByDevice: value.connectionsByDevice || {},
          unresolvedLinks: value.unresolvedLinks || [],
          count: typeof value.count === "number" ? value.count : devices.length,
          ptLinkDebug: (value as ListDevicesResultWithLinks).ptLinkDebug,
        };
      }
    } catch {
      // PT no responde
    }
    return { devices: [], connectionsByDevice: {}, unresolvedLinks: [], count: 0 };
  }

  getCachedSnapshot(): TopologySnapshot | null {
    if (this.cache.isMaterialized()) {
      return this.cache.getSnapshot();
    }
    return null;
  }
}
