import type { DeviceState } from "../contracts/index.js";
import type { DeviceService } from "../application/services/device-service.js";

export class DeviceFacade {
  constructor(private readonly deviceService: DeviceService) {}

  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    return this.deviceService.inspect(device, includeXml);
  }

  async addModule(device: string, slot: number, module: string): Promise<void> {
    await this.deviceService.addModule(device, slot, module);
  }

  async removeModule(device: string, slot: number): Promise<void> {
    await this.deviceService.removeModule(device, slot);
  }

  async hardwareInfo(device: string): Promise<unknown> {
    return this.deviceService.hardwareInfo(device);
  }

  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    return this.deviceService.hardwareCatalog(deviceType);
  }

  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    return this.deviceService.commandLog(device, limit);
  }

  async deepInspect(path: string, method?: string, args?: unknown[]): Promise<unknown> {
    return this.deviceService.deepInspect(path, method, args);
  }
}