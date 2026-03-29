// ============================================================================
// IosService - IOS device configuration and execution
// ============================================================================

import { FileBridge } from "../../infrastructure/pt/file-bridge.js";
import type {
  ParsedOutput,
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
  DeviceState,
} from "../../contracts/index.js";
import {
  resolveCapabilities,
  type DeviceCapabilities,
} from "../../domain/ios/capabilities/pt-capability-resolver.js";

export class IosService {
  constructor(
    private bridge: FileBridge,
    private generateId: () => string,
    private inspectDevice: (device: string) => Promise<DeviceState>
  ) {}

  /**
   * Configure IOS device with multiple commands
   */
  async configIos(
    device: string,
    commands: string[],
    options?: { save?: boolean }
  ): Promise<void> {
    const { value } = await this.bridge.sendCommandAndWait<{ ok: boolean; error?: string }>({
      type: "configIos",
      id: this.generateId(),
      device,
      commands,
      save: options?.save ?? true,
    });

    if (value && typeof value === "object" && value.ok === false) {
      throw new Error(value.error || "IOS configuration failed");
    }
  }

  /**
   * Execute an IOS command and get the raw output
   */
  async execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000
  ): Promise<{ raw: string; parsed?: T }> {
    const { event } = await this.bridge.sendCommandAndWait<{ raw: string; parsed?: T }>({
      type: "execIos",
      id: this.generateId(),
      device,
      command,
      parse,
      timeout,
    });

    const value = (event as { value?: { raw: string; parsed?: T } }).value;
    return value ?? { raw: "", parsed: undefined };
  }

  /**
   * Execute an IOS command and parse the output
   */
  async show(device: string, command: string): Promise<ParsedOutput> {
    const { parsed } = await this.execIos<ParsedOutput>(device, command, true);
    return parsed ?? { raw: "" };
  }

  /**
   * Execute an IOS command with full session state management
   */
  async execInteractive(
    device: string,
    command: string,
    options?: {
      timeout?: number;
      parse?: boolean;
      ensurePrivileged?: boolean;
    }
  ): Promise<{ raw: string; parsed?: ParsedOutput; session?: { mode: string } }> {
    const { value } = await this.bridge.sendCommandAndWait<{
      raw: string;
      parsed?: ParsedOutput;
      session?: { mode: string; paging?: boolean; awaitingConfirm?: boolean };
    }>({
      type: "execInteractive",
      id: this.generateId(),
      device,
      command,
      options: {
        timeout: options?.timeout ?? 30000,
        parse: options?.parse ?? true,
        ensurePrivileged: options?.ensurePrivileged ?? false,
      },
    });

    return value ?? { raw: "" };
  }

  /**
   * Get IOS device capabilities based on model
   */
  async resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    const deviceState = await this.inspectDevice(device);
    const model = deviceState.model || "unknown";
    return resolveCapabilities(model);
  }

  // Convenience show command methods
  async showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    return this.show(device, "show ip interface brief") as Promise<ShowIpInterfaceBrief>;
  }

  async showVlan(device: string): Promise<ShowVlan> {
    return this.show(device, "show vlan brief") as Promise<ShowVlan>;
  }

  async showIpRoute(device: string): Promise<ShowIpRoute> {
    return this.show(device, "show ip route") as Promise<ShowIpRoute>;
  }

  async showRunningConfig(device: string): Promise<ShowRunningConfig> {
    return this.show(device, "show running-config") as Promise<ShowRunningConfig>;
  }
}
