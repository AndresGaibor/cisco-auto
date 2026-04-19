// ============================================================================
// TopologyService - Device and topology management
// ============================================================================

import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type {
  TopologySnapshot,
  DeviceState,
  LinkState,
  AddLinkPayload,
  DeviceListResult,
} from "../../contracts/index.js";
import { TopologyQueryService } from "./topology-query-service.js";
import { TopologyMutationService } from "./topology-mutation-service.js";

export class TopologyService {
  private readonly query: TopologyQueryService;
  private readonly mutation: TopologyMutationService;

  constructor(
    primitivePort: RuntimePrimitivePort,
    cache: TopologyCachePort,
    generateId: () => string,
  ) {
    this.query = new TopologyQueryService(cache, primitivePort, generateId);
    this.mutation = new TopologyMutationService(primitivePort, generateId, (deviceName) =>
      this.getDeviceState(deviceName),
    );
  }

  snapshot(): Promise<TopologySnapshot | null> {
    return this.query.snapshot();
  }

  listDevices(filter?: string | number | string[]): Promise<DeviceListResult> {
    return this.query.listDevices(filter);
  }

  addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceState> {
    return this.mutation.addDevice(name, model, options);
  }

  removeDevice(name: string): Promise<void> {
    return this.mutation.removeDevice(name);
  }

  renameDevice(oldName: string, newName: string): Promise<void> {
    return this.mutation.renameDevice(oldName, newName);
  }

  moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  > {
    return this.mutation.moveDevice(name, x, y);
  }

  addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType: AddLinkPayload["linkType"] = "auto",
  ): Promise<LinkState> {
    return this.mutation.addLink(device1, port1, device2, port2, linkType);
  }

  removeLink(device: string, port: string): Promise<void> {
    return this.mutation.removeLink(device, port);
  }

  clearTopology(): Promise<{
    removedDevices: number;
    removedLinks: number;
    remainingDevices: number;
    remainingLinks: number;
  }> {
    return this.mutation.clearTopology();
  }

  getCachedSnapshot(): TopologySnapshot | null {
    return this.query.getCachedSnapshot();
  }

  private getDeviceState(deviceName: string): DeviceState | undefined {
    return this.query.getCachedSnapshot()?.devices?.[deviceName] ?? undefined;
  }
}
