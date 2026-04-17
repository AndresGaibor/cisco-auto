import type { DeviceState, DeviceListResult, LinkState } from "../contracts/index.js";
import type { TopologyService } from "../application/services/topology-service.js";
import type { DeviceService } from "../application/services/device-service.js";

export class TopologyFacade {
  constructor(
    private readonly topologyService: TopologyService,
    private readonly deviceService: DeviceService,
  ) {}

  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceState> {
    return this.topologyService.addDevice(name, model, options);
  }

  async removeDevice(name: string): Promise<void> {
    await this.topologyService.removeDevice(name);
  }

  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this.topologyService.renameDevice(oldName, newName);
  }

  async moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  > {
    return this.topologyService.moveDevice(name, x, y);
  }

  async listDevices(filter?: string | number | string[]): Promise<DeviceListResult> {
    return this.topologyService.listDevices(filter);
  }

  async addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType:
      | "auto"
      | "straight"
      | "cross"
      | "roll"
      | "fiber"
      | "phone"
      | "cable"
      | "serial"
      | "console"
      | "wireless"
      | "coaxial"
      | "octal"
      | "cellular"
      | "usb"
      | "custom_io" = "auto",
  ): Promise<LinkState> {
    return this.topologyService.addLink(device1, port1, device2, port2, linkType);
  }

  async removeLink(device: string, port: string): Promise<void> {
    await this.topologyService.removeLink(device, port);
  }

  async clearTopology(): Promise<{
    removedDevices: number;
    removedLinks: number;
    remainingDevices: number;
    remainingLinks: number;
  }> {
    return this.topologyService.clearTopology();
  }

  async configHost(
    device: string,
    options: { ip?: string; mask?: string; gateway?: string; dns?: string; dhcp?: boolean },
  ): Promise<void> {
    await this.deviceService.configHost(device, options);
  }

  async inspectHost(device: string): Promise<DeviceState> {
    const deviceState = await this.deviceService.inspect(device);
    if (deviceState.type !== "pc" && deviceState.type !== "server") {
      throw new Error(
        `Dispositivo '${device}' no es un host (PC/Server-PT). Tipo: ${deviceState.type}`,
      );
    }
    return deviceState;
  }
}
