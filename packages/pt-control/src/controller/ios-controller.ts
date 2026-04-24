/**
 * IosController - Controlador especializado para ejecución de comandos IOS.
 *
 * Maneja la ejecución de comandos show, configuración, y operaciones interactivas
 * en dispositivos IOS de la topología.
 *
 * @example
 * ```typescript
 * const ios = new IosController(controllerIosService, deviceService);
 * await ios.configIos("R1", ["interface GigabitEthernet0/0", "ip address 192.168.1.1 255.255.255.0"]);
 * const brief = await ios.showIpInterfaceBrief("R1");
 * ```
 */

import type { DeviceState } from "../contracts/index.js";
import type { IosExecutionEvidence } from "../contracts/ios-execution-evidence.js";

export class IosController {
  constructor(
    private readonly controllerIosService: {
      configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void>;
      execIos<T = any>(device: string, command: string, parse?: boolean, timeout?: number): Promise<any>;
      execInteractive(device: string, command: string, options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean }): Promise<any>;
      execIosWithEvidence<T = any>(device: string, command: string, parse?: boolean, timeout?: number): Promise<any>;
      configIosWithResult(device: string, commands: string[], options?: { save?: boolean }): Promise<any>;
      show(device: string, command: string): Promise<any>;
      showParsed<T = any>(device: string, command: string, options?: { ensurePrivileged?: boolean; timeout?: number }): Promise<any>;
      showIpInterfaceBrief(device: string): Promise<any>;
      showVlan(device: string): Promise<any>;
      showIpRoute(device: string): Promise<any>;
      showRunningConfig(device: string): Promise<any>;
      showMacAddressTable(device: string): Promise<any>;
      showCdpNeighbors(device: string): Promise<any>;
      getIosConfidence(device: string, evidence: IosExecutionEvidence, verificationCheck?: string): Promise<any>;
      resolveCapabilities(device: string): Promise<any>;
    },
    private readonly deviceService: {
      inspect(name: string, includeXml?: boolean): Promise<DeviceState>;
    },
  ) {}

  async configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void> {
    await this.controllerIosService.configIos(device, commands, options);
  }

  async execIos<T = any>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<any> {
    return this.controllerIosService.execIos<T>(device, command, parse, timeout);
  }

  async execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean },
  ): Promise<any> {
    return this.controllerIosService.execInteractive(device, command, options);
  }

  async execIosWithEvidence<T = any>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<any> {
    return this.controllerIosService.execIosWithEvidence<T>(device, command, parse, timeout);
  }

  async configIosWithResult(
    device: string,
    commands: string[],
    options?: { save?: boolean },
  ): Promise<any> {
    return this.controllerIosService.configIosWithResult(device, commands, options);
  }

  async show(device: string, command: string): Promise<any> {
    return this.controllerIosService.show(device, command);
  }

  async showParsed<T = any>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number },
  ): Promise<any> {
    return this.controllerIosService.showParsed<T>(device, command, options);
  }

  async showIpInterfaceBrief(device: string): Promise<any> {
    return this.controllerIosService.showIpInterfaceBrief(device);
  }

  async showVlan(device: string): Promise<any> {
    return this.controllerIosService.showVlan(device);
  }

  async showIpRoute(device: string): Promise<any> {
    return this.controllerIosService.showIpRoute(device);
  }

  async showRunningConfig(device: string): Promise<any> {
    return this.controllerIosService.showRunningConfig(device);
  }

  async showMacAddressTable(device: string): Promise<any> {
    return this.controllerIosService.showMacAddressTable(device);
  }

  async showCdpNeighbors(device: string): Promise<any> {
    return this.controllerIosService.showCdpNeighbors(device);
  }

  async getConfidence(
    device: string,
    evidence: IosExecutionEvidence,
    verificationCheck?: string,
  ): Promise<any> {
    return this.controllerIosService.getIosConfidence(device, evidence, verificationCheck);
  }

  async resolveCapabilities(device: string): Promise<any> {
    return this.controllerIosService.resolveCapabilities(device);
  }

  async inspectDevice(name: string, includeXml = false): Promise<DeviceState> {
    return this.deviceService.inspect(name, includeXml);
  }
}