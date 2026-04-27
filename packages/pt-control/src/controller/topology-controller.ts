/**
 * TopologyController - Controlador especializado para gestión de topología de red.
 *
 * Maneja operaciones de dispositivos, enlaces y posicionamiento en el canvas de PT.
 * Delega a TopologyService y DeviceService del dominio de aplicación.
 *
 * @example
 * ```typescript
 * const topology = new TopologyController(topologyFacade, deviceService);
 * await topology.addDevice("R1", "2911", { x: 100, y: 200 });
 * await topology.addLink("R1", "GigabitEthernet0/0", "Switch1", "FastEthernet0/1");
 * ```
 */

import type {
  DeviceState,
  DeviceListResult,
  LinkState,
  AddLinkPayload,
  DevicesInRectResult,
} from "../contracts/index.js";

export class TopologyController {
  constructor(
    private readonly topologyFacade: {
      addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<DeviceState>;
      removeDevice(name: string): Promise<void>;
      renameDevice(oldName: string, newName: string): Promise<void>;
      moveDevice(name: string, x: number, y: number): Promise<
        { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
      >;
      addLink(
        device1: string,
        port1: string,
        device2: string,
        port3: string,
        cableType?: string,
      ): Promise<LinkState>;
      removeLink(device: string, port: string): Promise<void>;
      clearTopology(): Promise<{
        removedDevices: number;
        removedLinks: number;
        remainingDevices: number;
        remainingLinks: number;
      }>;
      listDevices(filter?: string | number | string[]): Promise<DeviceListResult>;
    },
    private readonly deviceService: {
      inspect(name: string, includeXml?: boolean): Promise<DeviceState>;
      addModule(device: string, slot: number | "auto", module: string): Promise<{ ok: true; value: { device: string; module: string; slot: number; wasPoweredOff: boolean } } | { ok: false; error: string; code: string; advice?: string[] }>;
      removeModule(device: string, slot: number): Promise<{ ok: true; value: { device: string; slot: number; beforePorts: Array<{ name: string; [key: string]: unknown }>; afterPorts: Array<{ name: string; [key: string]: unknown }>; removedPorts: Array<{ name: string; [key: string]: unknown }> } } | { ok: false; error?: string; code?: string }>;
    },
  ) {}

  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceState> {
    return this.topologyFacade.addDevice(name, model, options);
  }

  async removeDevice(name: string): Promise<void> {
    await this.topologyFacade.removeDevice(name);
  }

  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this.topologyFacade.renameDevice(oldName, newName);
  }

  async moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  > {
    return this.topologyFacade.moveDevice(name, x, y);
  }

  async listDevices(filter?: string | number | string[]): Promise<DeviceListResult> {
    return this.topologyFacade.listDevices(filter);
  }

  async inspectDevice(name: string, includeXml = false): Promise<DeviceState> {
    return this.deviceService.inspect(name, includeXml);
  }

  async addModule(device: string, slot: number | "auto", module: string): Promise<{ ok: true; value: { device: string; module: string; slot: number; wasPoweredOff: boolean } } | { ok: false; error: string; code: string; advice?: string[] }> {
    return this.deviceService.addModule(device, slot, module) as any;
  }

  async removeModule(device: string, slot: number): Promise<{ ok: true; value: { device: string; slot: number; beforePorts: Array<{ name: string; [key: string]: unknown }>; afterPorts: Array<{ name: string; [key: string]: unknown }>; removedPorts: Array<{ name: string; [key: string]: unknown }> } } | { ok: false; error?: string; code?: string }> {
    return this.deviceService.removeModule(device, slot) as any;
  }

  async addLink(
    device1: string | {
      endpointA: { device: string; port: string };
      endpointB: { device: string; port: string };
      type?: string;
    },
    port1?: string,
    device2?: string,
    port2?: string,
    linkType: AddLinkPayload["cableType"] = "auto",
  ): Promise<LinkState> {
    if (typeof device1 === "object") {
      return this.topologyFacade.addLink(
        device1.endpointA.device,
        device1.endpointA.port,
        device1.endpointB.device,
        device1.endpointB.port,
        (device1.type as AddLinkPayload["cableType"]) || "auto",
      );
    }
    return this.topologyFacade.addLink(device1, port1!, device2!, port2!, linkType);
  }

  async removeLink(device: string, port: string): Promise<void> {
    await this.topologyFacade.removeLink(device, port);
  }

  async clearTopology(): Promise<{
    removedDevices: number;
    removedLinks: number;
    remainingDevices: number;
    remainingLinks: number;
  }> {
    return this.topologyFacade.clearTopology();
  }
}
