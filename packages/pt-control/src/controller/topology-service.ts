import type { DeviceService } from "../application/services/device-service.js";
import type { TopologyService } from "../application/services/topology-service.js";
import type { DeviceState, LinkState } from "../contracts/index.js";

export class ControllerTopologyService {
  constructor(
    private readonly topologyService: TopologyService,
    private readonly deviceService: DeviceService,
  ) {}

  addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<DeviceState> {
    return this.topologyService.addDevice(name, model, options);
  }

  removeDevice(name: string): Promise<void> {
    return this.topologyService.removeDevice(name);
  }

  renameDevice(oldName: string, newName: string): Promise<void> {
    return this.topologyService.renameDevice(oldName, newName);
  }

  moveDevice(name: string, x: number, y: number): Promise<{ ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }> {
    return this.topologyService.moveDevice(name, x, y);
  }

  listDevices(filter?: string | number | string[]): Promise<DeviceState[]> {
    return this.topologyService.listDevices(filter);
  }

  addLink(device1: string, port1: string, device2: string, port2: string, linkType: "auto" | "straight" | "cross" | "roll" | "fiber" | "phone" | "cable" | "serial" | "console" | "wireless" | "coaxial" | "octal" | "cellular" | "usb" | "custom_io" = "auto"): Promise<LinkState> {
    return this.topologyService.addLink(device1, port1, device2, port2, linkType);
  }

  removeLink(device: string, port: string): Promise<void> {
    return this.topologyService.removeLink(device, port);
  }

  clearTopology(): Promise<{ removedDevices: number; removedLinks: number; remainingDevices: number; remainingLinks: number }> {
    return this.topologyService.clearTopology();
  }

  configHost(device: string, options: { ip?: string; mask?: string; gateway?: string; dns?: string; dhcp?: boolean }): Promise<void> {
    return this.deviceService.configHost(device, options);
  }
}
