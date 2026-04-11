import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { LinkState, DeviceState, TopologySnapshot, AddLinkPayload } from "../../contracts/index.js";
import { validatePTModel } from "../../shared/utils/helpers.js";
import { validatePortExists } from "@cisco-auto/pt-runtime/value-objects";

export class TopologyMutationService {
  constructor(
    private bridge: FileBridgePort,
    private cache: TopologyCachePort,
    private generateId: () => string,
    private getDeviceState: (deviceName: string) => DeviceState | undefined,
  ) {}

  async addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<DeviceState> {
    const validatedModel = validatePTModel(model);
    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      name: string;
      model: string;
      type: string;
      power: boolean;
      x: number;
      y: number;
      ports: unknown[];
    }>("addDevice", { id: this.generateId(), name, model: validatedModel, x: options?.x ?? 100, y: options?.y ?? 100 });

    const value = result.value;
    if (!value) throw new Error(`Failed to add device '${name}'`);

    return {
      name: value.name,
      model: value.model,
      type: value.type as DeviceState["type"],
      power: value.power,
      x: value.x,
      y: value.y,
      ports: value.ports as DeviceState["ports"],
    };
  }

  async removeDevice(name: string): Promise<void> {
    await this.bridge.sendCommandAndWait("removeDevice", { id: this.generateId(), name });
  }

  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this.bridge.sendCommandAndWait("renameDevice", { id: this.generateId(), oldName, newName });
  }

  async moveDevice(name: string, x: number, y: number): Promise<{ ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }> {
    const result = await this.bridge.sendCommandAndWait<{ ok: boolean; name?: string; x?: number; y?: number; error?: string; code?: string }>("moveDevice", { id: this.generateId(), name, x, y });
    const value = result.value;
    if (value?.ok) return { ok: true, name: value.name!, x: value.x!, y: value.y! };
    return { ok: false, error: value?.error ?? "Unknown error", code: value?.code ?? "UNKNOWN" };
  }

  async addLink(device1: string, port1: string, device2: string, port2: string, linkType: AddLinkPayload["linkType"] = "auto"): Promise<LinkState> {
    const device1State = this.getDeviceState(device1);
    const device2State = this.getDeviceState(device2);

    if (device1State?.model) {
      const validation = validatePortExists(device1State.model, port1);
      if (!validation.valid) throw new Error(validation.error ?? `Puerto inválido: ${device1State.model}:${port1}`);
    }

    if (device2State?.model) {
      const validation = validatePortExists(device2State.model, port2);
      if (!validation.valid) throw new Error(validation.error ?? `Puerto inválido: ${device2State.model}:${port2}`);
    }

    const result = await this.bridge.sendCommandAndWait<{ ok: boolean; id: string; device1: string; port1: string; device2: string; port2: string; cableType: string }>("addLink", { id: this.generateId(), device1, port1, device2, port2, linkType });
    const value = result.value;
    if (!value) throw new Error(`Failed to add link between ${device1}:${port1} and ${device2}:${port2}`);

    return { id: value.id, device1: value.device1, port1: value.port1, device2: value.device2, port2: value.port2, cableType: value.cableType as LinkState["cableType"] };
  }

  async removeLink(device: string, port: string): Promise<void> {
    await this.bridge.sendCommandAndWait("removeLink", { id: this.generateId(), device, port });
  }

  async clearTopology(): Promise<{ removedDevices: number; removedLinks: number; remainingDevices: number; remainingLinks: number }> {
    let removedDevices = 0;
    let removedLinks = 0;

    for (let pass = 0; pass < 5; pass++) {
      const snapshot = await this.bridge.readState<TopologySnapshot>();
      const devices = this.cache.getDevices();
      const linkEntries = Object.values(snapshot?.links ?? {});
      const deviceNames = Array.from(new Set(devices.map((device) => device.name).filter(Boolean)));

      if (linkEntries.length === 0 && deviceNames.length === 0) {
        return { removedDevices, removedLinks, remainingDevices: 0, remainingLinks: 0 };
      }

      for (const link of linkEntries) {
        try { await this.removeLink(link.device1, link.port1); removedLinks += 1; } catch {
          try { await this.removeLink(link.device2, link.port2); removedLinks += 1; } catch {}
        }
      }

      for (const name of deviceNames) {
        try { await this.removeDevice(name); removedDevices += 1; } catch {}
      }

      await new Promise((resolve) => setTimeout(resolve, 250));

      const afterSnapshot = await this.bridge.readState<TopologySnapshot>();
      const afterDevices = this.cache.getDevices();
      const remainingDevices = Array.from(new Set(afterDevices.map((device) => device.name).filter(Boolean))).length;
      const remainingLinks = Object.keys(afterSnapshot?.links ?? {}).length;

      if (remainingDevices === 0 && remainingLinks === 0) {
        return { removedDevices, removedLinks, remainingDevices, remainingLinks };
      }
    }

    const finalSnapshot = await this.bridge.readState<TopologySnapshot>();
    const finalDevices = this.cache.getDevices();
    const uniqueDeviceNames = Array.from(new Set(finalDevices.map((device) => device.name).filter(Boolean)));
    const remainingDevices = Object.keys(finalSnapshot?.devices ?? {}).length;
    const remainingLinks = Object.keys(finalSnapshot?.links ?? {}).length;

    return {
      removedDevices,
      removedLinks,
      remainingDevices: Math.max(remainingDevices, uniqueDeviceNames.length),
      remainingLinks,
    };
  }
}
